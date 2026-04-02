import { create } from 'zustand';
import { normalizeRole as normalizeAppRole } from '../routes/routePaths';

const ACCESS_TOKEN_KEY = 'token';
const REFRESH_TOKEN_KEY = 'refreshToken';
const USER_KEY = 'user';
const SESSION_EXPIRY_KEY = 'sessionExpiry';
const DEFAULT_SESSION_TTL_MS = 1000 * 60 * 60 * 12;

const normalizeUserRole = (user) => {
  if (!user || typeof user !== 'object') {
    return user ?? null;
  }

  return {
    ...user,
    role: normalizeAppRole(user.role),
  };
};

export const AUTH_STORAGE_KEYS = Object.freeze({
  accessToken: ACCESS_TOKEN_KEY,
  refreshToken: REFRESH_TOKEN_KEY,
  user: USER_KEY,
  sessionExpiry: SESSION_EXPIRY_KEY,
});

const clearSessionStorage = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(SESSION_EXPIRY_KEY);

  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(SESSION_EXPIRY_KEY);
};

export const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  refreshToken: null,
  sessionExpiresAt: null,

  login: (user, token, expiresAt, refreshToken) => {
    if (!token) {
      throw new Error('A valid access token is required.');
    }

    const sessionExpiresAt =
      Number(expiresAt) || Date.now() + DEFAULT_SESSION_TTL_MS;
    const normalizedUser = normalizeUserRole(user);

    localStorage.setItem(ACCESS_TOKEN_KEY, token);
    if (refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    } else {
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
    localStorage.setItem(USER_KEY, JSON.stringify(normalizedUser));
    localStorage.setItem(SESSION_EXPIRY_KEY, String(sessionExpiresAt));

    set({ user: normalizedUser, token, refreshToken: refreshToken || null, sessionExpiresAt });
  },

  logout: () => {
    clearSessionStorage();
    set({ user: null, token: null, refreshToken: null, sessionExpiresAt: null });
  },

  updateUserProfile: (updates = {}) => {
    set((state) => {
      if (!state.user) return state;

      const nextUser = normalizeUserRole({
        ...state.user,
        ...updates,
      });

      localStorage.setItem(USER_KEY, JSON.stringify(nextUser));

      return {
        ...state,
        user: nextUser,
      };
    });
  },

  loadUser: () => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    const user = localStorage.getItem(USER_KEY);
    const sessionExpiryRaw = localStorage.getItem(SESSION_EXPIRY_KEY);
    const sessionExpiresAt = Number(sessionExpiryRaw || 0);

    if (!token || !user || !sessionExpiresAt) {
      clearSessionStorage();
      set({ user: null, token: null, refreshToken: null, sessionExpiresAt: null });
      return;
    }

    if (Date.now() >= sessionExpiresAt) {
      clearSessionStorage();
      set({ user: null, token: null, refreshToken: null, sessionExpiresAt: null });
      return;
    }

    try {
      const parsedUser = normalizeUserRole(JSON.parse(user));

      if (!parsedUser) {
        clearSessionStorage();
        set({ user: null, token: null, refreshToken: null, sessionExpiresAt: null });
        return;
      }

      set({ token, refreshToken, user: parsedUser, sessionExpiresAt });
    } catch {
      clearSessionStorage();
      set({ user: null, token: null, refreshToken: null, sessionExpiresAt: null });
    }
  },

  isAuthenticated: () => {
    const { token, sessionExpiresAt } = get();
    if (!token || !sessionExpiresAt) return false;

    const isValid = Date.now() < sessionExpiresAt;
    if (!isValid) {
      clearSessionStorage();
      set({ user: null, token: null, refreshToken: null, sessionExpiresAt: null });
    }

    return isValid;
  },

  hasRole: (allowedRoles = []) => {
    if (!Array.isArray(allowedRoles) || allowedRoles.length === 0) {
      return true;
    }

    const role = normalizeAppRole(get().user?.role);
    return Boolean(
      role && allowedRoles.some((allowedRole) => normalizeAppRole(allowedRole) === role)
    );
  },
}));
