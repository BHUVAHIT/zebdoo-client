import { superAdminService } from "../modules/superAdmin/services/superAdminService";
import { normalizeRole, ROLES } from "../routes/routePaths";

const SESSION_TTL_MS = 1000 * 60 * 60 * 12;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

export const loginUser = async (email, password) => {
  await delay(220);

  const result = await superAdminService.authenticateUser({ email, password });
  return buildSession(result.user, result.forcePasswordChange);
};

export const registerUser = async (values) => {
  await delay(220);

  const result = await superAdminService.registerStudent(values);
  return buildSession(result.user, result.forcePasswordChange);
};
