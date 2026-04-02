import { getDefaultAppRoute, normalizeRole, ROLES } from "./routePaths";

export const isStudentRole = (role) => normalizeRole(role) === ROLES.STUDENT;

export const isSuperAdminRole = (role) => normalizeRole(role) === ROLES.SUPER_ADMIN;

export const resolveRoleHomeRoute = (role) => getDefaultAppRoute(role);
