import { Suspense, lazy, useEffect } from "react";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import Home from "../pages/public/Home";
import RouteLoadingScreen from "../components/RouteLoadingScreen";
import NotFoundPage from "../pages/public/NotFoundPage";
import {
  getDefaultAppRoute,
  PUBLIC_ROUTES,
  ROUTES,
  routeBuilders,
} from "./routePaths";
import {
  StudentProtectedFrame,
  SuperAdminProtectedFrame,
} from "./protected.routes";
import { AUTH_STORAGE_KEYS, useAuthStore } from "../store/authStore";
import { useSessionStore } from "../store/sessionStore";

const StudentDashboardPage = lazy(() =>
  import("../modules/student/dashboard/pages/StudentDashboardPage")
);
const StudentProfilePage = lazy(() =>
  import("../modules/student/profile/pages/StudentProfilePage")
);
const LoginPage = lazy(() => import("../modules/auth/pages/LoginPage"));
const RegisterPage = lazy(() => import("../modules/auth/pages/RegisterPage"));
const AssessmentSessionPage = lazy(() =>
  import("../modules/assessment/pages/AssessmentSessionPage")
);
const AssessmentResultPage = lazy(() =>
  import("../modules/assessment/pages/AssessmentResultPage")
);
const SuperAdminApp = lazy(() => import("../modules/superAdmin/pages/SuperAdminApp"));

const LegacyPrefixRedirect = ({ legacyPrefix, targetPrefix }) => {
  const location = useLocation();
  const suffix = location.pathname.startsWith(legacyPrefix)
    ? location.pathname.slice(legacyPrefix.length)
    : "";
  const target = `${targetPrefix}${suffix}${location.search}${location.hash}`;

  return <Navigate to={target} replace />;
};

const AppRoutes = () => {
  const loadUser = useAuthStore((state) => state.loadUser);
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const hydrateRole = useSessionStore((state) => state.hydrateRole);
  const setActiveRoute = useSessionStore((state) => state.setActiveRoute);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    const relevantKeys = new Set(Object.values(AUTH_STORAGE_KEYS));

    const handleStorageSync = (event) => {
      if (event.storageArea !== window.localStorage) return;
      if (!event.key || relevantKeys.has(event.key)) {
        loadUser();
      }
    };

    window.addEventListener("storage", handleStorageSync);
    return () => {
      window.removeEventListener("storage", handleStorageSync);
    };
  }, [loadUser]);

  useEffect(() => {
    if (!token) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      loadUser();
    }, 60 * 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [loadUser, token]);

  useEffect(() => {
    if (!token) return;
    if (!PUBLIC_ROUTES.includes(location.pathname)) return;
    if (!user?.role) return;

    navigate(getDefaultAppRoute(user?.role), { replace: true });
  }, [location.pathname, navigate, token, user?.role]);

  useEffect(() => {
    hydrateRole(user?.role);
  }, [hydrateRole, user?.role]);

  useEffect(() => {
    setActiveRoute(`${location.pathname}${location.search}${location.hash}`);
  }, [location.hash, location.pathname, location.search, setActiveRoute]);

  return (
    <Routes>
      <Route path={ROUTES.home} element={<Home />} />
      <Route
        path={ROUTES.auth.login}
        element={
          <Suspense fallback={<RouteLoadingScreen label="Loading sign-in..." />}>
            <LoginPage />
          </Suspense>
        }
      />
      <Route
        path={ROUTES.auth.register}
        element={
          <Suspense fallback={<RouteLoadingScreen label="Loading sign-up..." />}>
            <RegisterPage />
          </Suspense>
        }
      />

      <Route
        path={ROUTES.student.dashboard}
        element={
          <StudentProtectedFrame>
            <Suspense fallback={<RouteLoadingScreen label="Loading student dashboard..." />}>
              <StudentDashboardPage />
            </Suspense>
          </StudentProtectedFrame>
        }
      />

      <Route
        path={ROUTES.student.profile}
        element={
          <StudentProtectedFrame>
            <Suspense fallback={<RouteLoadingScreen label="Loading student profile..." />}>
              <StudentProfilePage />
            </Suspense>
          </StudentProtectedFrame>
        }
      />

      <Route
        path={ROUTES.assessment.root}
        element={<Navigate to={routeBuilders.assessmentSession.root} replace />}
      />

      <Route
        path={`${routeBuilders.assessmentSession.root}/*`}
        element={
          <StudentProtectedFrame>
            <Suspense fallback={<RouteLoadingScreen label="Loading assessment session..." />}>
              <AssessmentSessionPage />
            </Suspense>
          </StudentProtectedFrame>
        }
      />

      <Route
        path={ROUTES.assessment.result}
        element={
          <StudentProtectedFrame>
            <Suspense fallback={<RouteLoadingScreen label="Loading assessment result..." />}>
              <AssessmentResultPage />
            </Suspense>
          </StudentProtectedFrame>
        }
      />

      <Route
        path={`${ROUTES.admin.root}/*`}
        element={
          <SuperAdminProtectedFrame>
            <Suspense fallback={<RouteLoadingScreen label="Loading admin workspace..." />}>
              <SuperAdminApp />
            </Suspense>
          </SuperAdminProtectedFrame>
        }
      />

      <Route
        path={`${ROUTES.legacy.testRoot}/*`}
        element={
          <LegacyPrefixRedirect
            legacyPrefix={ROUTES.legacy.testRoot}
            targetPrefix={routeBuilders.assessmentSession.root}
          />
        }
      />
      <Route
        path={ROUTES.legacy.result}
        element={<Navigate to={ROUTES.assessment.result} replace />}
      />
      <Route
        path={`${ROUTES.legacy.superAdminRoot}/*`}
        element={
          <LegacyPrefixRedirect
            legacyPrefix={ROUTES.legacy.superAdminRoot}
            targetPrefix={ROUTES.admin.root}
          />
        }
      />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

export default AppRoutes;
