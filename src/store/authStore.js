import { create } from 'zustand';
import { isKnownRole, normalizeRole as normalizeAppRole } from '../routes/routePaths';

const ACCESS_TOKEN_KEY = 'token';
const REFRESH_TOKEN_KEY = 'refreshToken';
const USER_KEY = 'user';
const SESSION_EXPIRY_KEY = 'sessionExpiry';
const DEFAULT_SESSION_TTL_MS = 1000 * 60 * 60 * 12;

const canUseWebStorage = () => typeof window !== 'undefined';

const readLocalStorage = (key) => {
  if (!canUseWebStorage()) return null;

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeLocalStorage = (key, value) => {
  if (!canUseWebStorage()) return;

  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore persistence errors and keep in-memory state active.
  }
};

const removeLocalStorage = (key) => {
  if (!canUseWebStorage()) return;

  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage removal failures.
  }
};

const removeSessionStorage = (key) => {
  if (!canUseWebStorage()) return;

  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // Ignore storage removal failures.
  }
};

const normalizeUserRole = (user) => {
  if (!user || typeof user !== 'object') {
    return user ?? null;
  }

  const normalizedRole = normalizeAppRole(user.role);
  if (!isKnownRole(normalizedRole)) {
    return null;
  }

  return {
    ...user,
    role: normalizedRole,
  };
};

export const AUTH_STORAGE_KEYS = Object.freeze({
  accessToken: ACCESS_TOKEN_KEY,
  refreshToken: REFRESH_TOKEN_KEY,
  user: USER_KEY,
  sessionExpiry: SESSION_EXPIRY_KEY,
});

const clearSessionStorage = () => {
  removeLocalStorage(ACCESS_TOKEN_KEY);
  removeLocalStorage(REFRESH_TOKEN_KEY);
  removeLocalStorage(USER_KEY);
  removeLocalStorage(SESSION_EXPIRY_KEY);

  removeSessionStorage(ACCESS_TOKEN_KEY);
  removeSessionStorage(REFRESH_TOKEN_KEY);
  removeSessionStorage(USER_KEY);
  removeSessionStorage(SESSION_EXPIRY_KEY);
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
    if (!normalizedUser) {
      throw new Error('Unable to start session for an unknown role.');
    }

    writeLocalStorage(ACCESS_TOKEN_KEY, token);
    if (refreshToken) {
      writeLocalStorage(REFRESH_TOKEN_KEY, refreshToken);
    } else {
      removeLocalStorage(REFRESH_TOKEN_KEY);
    }
    writeLocalStorage(USER_KEY, JSON.stringify(normalizedUser));
    writeLocalStorage(SESSION_EXPIRY_KEY, String(sessionExpiresAt));

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

      writeLocalStorage(USER_KEY, JSON.stringify(nextUser));

      return {
        ...state,
        user: nextUser,
      };
    });
  },

  loadUser: () => {
    const clearAuthStateIfNeeded = () => {
      set((state) => {
        if (
          state.user === null &&
          state.token === null &&
          state.refreshToken === null &&
          state.sessionExpiresAt === null
        ) {
          return state;
        }

        return { user: null, token: null, refreshToken: null, sessionExpiresAt: null };
      });
    };

    const token = readLocalStorage(ACCESS_TOKEN_KEY);
    const refreshToken = readLocalStorage(REFRESH_TOKEN_KEY);
    const user = readLocalStorage(USER_KEY);
    const sessionExpiryRaw = readLocalStorage(SESSION_EXPIRY_KEY);
    const sessionExpiresAt = Number(sessionExpiryRaw || 0);

    if (!token || !user || !sessionExpiresAt) {
      clearSessionStorage();
      clearAuthStateIfNeeded();
      return;
    }

    if (Date.now() >= sessionExpiresAt) {
      clearSessionStorage();
      clearAuthStateIfNeeded();
      return;
    }

    try {
      const parsedUser = normalizeUserRole(JSON.parse(user));

      if (!parsedUser) {
        clearSessionStorage();
        clearAuthStateIfNeeded();
        return;
      }

      const current = get();
      const hasSameSnapshot =
        current.token === token &&
        current.refreshToken === (refreshToken || null) &&
        current.sessionExpiresAt === sessionExpiresAt &&
        JSON.stringify(current.user) === JSON.stringify(parsedUser);

      if (hasSameSnapshot) {
        return;
      }

      set({ token, refreshToken, user: parsedUser, sessionExpiresAt });
    } catch {
      clearSessionStorage();
      clearAuthStateIfNeeded();
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
