import { superAdminService } from "../modules/superAdmin/services/superAdminService";
import { normalizeRole, ROLES } from "../routes/routePaths";
import { infrastructureApiClient } from "../infrastructure/apiClient";

const SESSION_TTL_MS = 1000 * 60 * 60 * 12;
const AUTH_PROVIDER = String(import.meta.env.VITE_AUTH_PROVIDER || "mock")
  .trim()
  .toLowerCase();
const LOGIN_ENDPOINT = String(import.meta.env.VITE_AUTH_LOGIN_PATH || "/auth/login").trim();
const REGISTER_ENDPOINT = String(import.meta.env.VITE_AUTH_REGISTER_PATH || "/auth/register").trim();

const AUTH_MODES = Object.freeze({
  mock: "mock",
  backend: "backend",
});

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const decodeBase64Url = (value) => {
  const normalized = String(value || "")
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const padding = normalized.length % 4;
  const padded = padding ? normalized.padEnd(normalized.length + (4 - padding), "=") : normalized;

  if (typeof globalThis.atob === "function") {
    return globalThis.atob(padded);
  }

  throw new Error("Base64 decoding is unavailable in the current runtime.");
};

const parseJwtPayload = (token) => {
  const parts = String(token || "").split(".");
  if (parts.length < 2) return null;

  try {
    const decoded = decodeBase64Url(parts[1]);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
};

const deriveExpiresAt = ({ token, expiresAt, expiresInSeconds }) => {
  const explicitExpiry = Number(expiresAt);
  if (Number.isFinite(explicitExpiry) && explicitExpiry > Date.now()) {
    return explicitExpiry;
  }

  const ttlSeconds = Number(expiresInSeconds);
  if (Number.isFinite(ttlSeconds) && ttlSeconds > 0) {
    return Date.now() + ttlSeconds * 1000;
  }

  const payload = parseJwtPayload(token);
  const tokenExpiryMs = Number(payload?.exp) * 1000;
  if (Number.isFinite(tokenExpiryMs) && tokenExpiryMs > Date.now()) {
    return tokenExpiryMs;
  }

  return Date.now() + SESSION_TTL_MS;
};

const buildSession = (user, forcePasswordChange = false) => {
  const normalizedRole = normalizeRole(user?.role);
  const sessionRole = normalizedRole || ROLES.STUDENT;
  const normalizedUser = {
    ...(user || {}),
    role: sessionRole,
  };

  return {
    user: normalizedUser,
    token: `fake-jwt-token-${sessionRole.toLowerCase()}-${Date.now()}`,
    refreshToken: `fake-refresh-token-${sessionRole.toLowerCase()}-${Date.now()}`,
    expiresAt: Date.now() + SESSION_TTL_MS,
    forcePasswordChange,
  };
};

const normalizeBackendSession = (payload = {}) => {
  const token = String(payload?.token || payload?.accessToken || "").trim();
  if (!token) {
    throw new Error("Authentication token missing in backend response.");
  }

  const rawUser = payload?.user || payload?.profile;
  if (!rawUser || typeof rawUser !== "object") {
    throw new Error("User profile missing in backend response.");
  }

  const role = normalizeRole(rawUser?.role) || ROLES.STUDENT;
  const user = {
    ...rawUser,
    role,
  };

  return {
    user,
    token,
    refreshToken: String(payload?.refreshToken || "").trim() || null,
    expiresAt: deriveExpiresAt({
      token,
      expiresAt: payload?.expiresAt,
      expiresInSeconds: payload?.expiresIn || payload?.expiresInSeconds,
    }),
    forcePasswordChange: Boolean(payload?.forcePasswordChange || user?.forcePasswordChange),
  };
};

const toAuthError = (error) => {
  const message =
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    "Authentication request failed.";

  return new Error(message);
};

const loginWithBackend = async (email, password) => {
  try {
    const response = await infrastructureApiClient.post(LOGIN_ENDPOINT, { email, password });
    return normalizeBackendSession(response?.data || {});
  } catch (error) {
    throw toAuthError(error);
  }
};

const registerWithBackend = async (values) => {
  try {
    const response = await infrastructureApiClient.post(REGISTER_ENDPOINT, values || {});
    return normalizeBackendSession(response?.data || {});
  } catch (error) {
    throw toAuthError(error);
  }
};

export const getActiveAuthMode = () =>
  AUTH_PROVIDER === AUTH_MODES.backend ? AUTH_MODES.backend : AUTH_MODES.mock;

export const loginUser = async (email, password) => {
  if (getActiveAuthMode() === AUTH_MODES.backend) {
    return loginWithBackend(email, password);
  }

  await delay(220);

  const result = await superAdminService.authenticateUser({ email, password });
  return buildSession(result.user, result.forcePasswordChange);
};

export const registerUser = async (values) => {
  if (getActiveAuthMode() === AUTH_MODES.backend) {
    return registerWithBackend(values);
  }

  await delay(220);

  const result = await superAdminService.registerStudent(values);
  return buildSession(result.user, result.forcePasswordChange);
};
