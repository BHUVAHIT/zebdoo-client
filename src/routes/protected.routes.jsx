import PrivateRoute from "../components/PrivateRoute";
import StudentPortalLayout from "../modules/student/layouts/StudentPortalLayout";
import { STUDENT_ROLES, SUPER_ADMIN_ROLES } from "./routePaths";

export const StudentProtectedFrame = ({ children }) => (
  <PrivateRoute allowedRoles={STUDENT_ROLES}>
    <StudentPortalLayout>{children}</StudentPortalLayout>
  </PrivateRoute>
);

export const SuperAdminProtectedFrame = ({ children }) => (
  <PrivateRoute allowedRoles={SUPER_ADMIN_ROLES}>{children}</PrivateRoute>
);
