import {
	getDefaultAppRoute,
	isStudentRole,
	isSuperAdminRole,
} from "./routePaths";

export { isStudentRole, isSuperAdminRole };

export const resolveRoleHomeRoute = (role) => getDefaultAppRoute(role);
