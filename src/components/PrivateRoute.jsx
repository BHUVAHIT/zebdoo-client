import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { getRoleHomeRoute, ROUTES } from "../routes/routePaths";

const PrivateRoute = ({
  children,
  allowedRoles = [],
  redirectTo = ROUTES.auth.login,
  unauthorizedRedirectTo,
}) => {
  const location = useLocation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());
  const hasRole = useAuthStore((state) => state.hasRole);
  const user = useAuthStore((state) => state.user);

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }

  if (allowedRoles.length > 0 && !hasRole(allowedRoles)) {
    return (
      <Navigate
        to={unauthorizedRedirectTo || getRoleHomeRoute(user?.role)}
        replace
        state={{ unauthorized: true }}
      />
    );
  }

  return children;
};

export default PrivateRoute;
