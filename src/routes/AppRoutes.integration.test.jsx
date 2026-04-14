import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AUTH_STORAGE_KEYS, useAuthStore } from "../store/authStore";
import { ROLES, ROUTES } from "./routePaths";

vi.mock("../components/RouteLoadingScreen", () => ({
  default: ({ label }) => <div>{`loading-route:${label || ""}`}</div>,
}));

vi.mock("../pages/public/Home", () => ({
  default: () => <div>home-page</div>,
}));

vi.mock("../pages/public/NotFoundPage", () => ({
  default: () => <div>not-found-page</div>,
}));

vi.mock("../modules/student/layouts/StudentPortalLayout", () => ({
  default: ({ children }) => <div>{children}</div>,
}));

vi.mock("../modules/student/dashboard/pages/StudentDashboardPage", () => ({
  default: () => <div>student-dashboard-page</div>,
}));

vi.mock("../modules/student/profile/pages/StudentProfilePage", () => ({
  default: () => <div>student-profile-page</div>,
}));

vi.mock("../modules/community/pages/StudentCommunityPage", () => ({
  default: () => <div>student-community-page</div>,
}));

vi.mock("../modules/auth/pages/LoginPage", () => ({
  default: () => <div>login-page</div>,
}));

vi.mock("../modules/auth/pages/RegisterPage", () => ({
  default: () => <div>register-page</div>,
}));

vi.mock("../modules/assessment/pages/AssessmentSessionPage", () => ({
  default: () => <div>assessment-session-page</div>,
}));

vi.mock("../modules/assessment/pages/AssessmentResultPage", () => ({
  default: () => <div>assessment-result-page</div>,
}));

vi.mock("../modules/superAdmin/pages/SuperAdminApp", () => ({
  default: () => <div>super-admin-app-page</div>,
}));

vi.mock("../pages/TestPaperSubjectsPage", () => ({
  default: () => <div>test-paper-subjects-page</div>,
}));

vi.mock("../pages/TestPaperChaptersPage", () => ({
  default: () => <div>test-paper-chapters-page</div>,
}));

vi.mock("../pages/TestPaperListPage", () => ({
  default: () => <div>test-paper-list-page</div>,
}));

vi.mock("../store/sessionStore", () => {
  const state = {
    hydrateRole: vi.fn(),
    setActiveRoute: vi.fn(),
  };

  return {
    useSessionStore: (selector) => selector(state),
  };
});

import AppRoutes from "./AppRoutes";

const clearSession = () => {
  window.localStorage.removeItem(AUTH_STORAGE_KEYS.accessToken);
  window.localStorage.removeItem(AUTH_STORAGE_KEYS.refreshToken);
  window.localStorage.removeItem(AUTH_STORAGE_KEYS.user);
  window.localStorage.removeItem(AUTH_STORAGE_KEYS.sessionExpiry);

  useAuthStore.setState({
    user: null,
    token: null,
    refreshToken: null,
    sessionExpiresAt: null,
  });
};

const seedSession = (role) => {
  const token = `${String(role || "student").toLowerCase()}-token`;
  const refreshToken = `${String(role || "student").toLowerCase()}-refresh-token`;
  const user = {
    id: `user-${String(role || "student").toLowerCase()}`,
    role,
    name: role === ROLES.SUPER_ADMIN ? "Super Admin" : "Student",
  };
  const sessionExpiresAt = Date.now() + 10 * 60 * 1000;

  window.localStorage.setItem(AUTH_STORAGE_KEYS.accessToken, token);
  window.localStorage.setItem(AUTH_STORAGE_KEYS.refreshToken, refreshToken);
  window.localStorage.setItem(AUTH_STORAGE_KEYS.user, JSON.stringify(user));
  window.localStorage.setItem(AUTH_STORAGE_KEYS.sessionExpiry, String(sessionExpiresAt));

  useAuthStore.setState({
    user,
    token,
    refreshToken,
    sessionExpiresAt,
  });
};

const renderAtPath = async (path, expectedText) => {
  cleanup();

  render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>
  );

  if (expectedText) {
    await screen.findByText(expectedText);
  }

  return document.body.textContent || "";
};

describe("AppRoutes route-by-route integration", () => {
  beforeEach(() => {
    clearSession();
  });

  afterEach(() => {
    cleanup();
    clearSession();
  });

  it("renders all public routes for unauthenticated users", async () => {
    const home = await renderAtPath(ROUTES.home, "home-page");
    const login = await renderAtPath(ROUTES.auth.login, "login-page");
    const register = await renderAtPath(ROUTES.auth.register, "register-page");

    expect(home).toContain("home-page");
    expect(login).toContain("login-page");
    expect(register).toContain("register-page");
  });

  it("redirects unauthenticated protected routes to login", async () => {
    const studentRoute = await renderAtPath(ROUTES.student.dashboard, "login-page");
    const adminRoute = await renderAtPath(ROUTES.admin.dashboard, "login-page");

    expect(studentRoute).toContain("login-page");
    expect(adminRoute).toContain("login-page");
  });

  it("renders full student route matrix for authenticated student", async () => {
    seedSession(ROLES.STUDENT);

    const expectations = [
      { path: ROUTES.student.dashboard, marker: "student-dashboard-page" },
      { path: ROUTES.student.profile, marker: "student-profile-page" },
      { path: ROUTES.student.community, marker: "student-community-page" },
      { path: ROUTES.student.testPapersRoot, marker: "test-paper-subjects-page" },
      {
        path: `${ROUTES.student.testPapersRoot}/subject-1`,
        marker: "test-paper-chapters-page",
      },
      {
        path: `${ROUTES.student.testPapersRoot}/subject-1/chapter-wise`,
        marker: "test-paper-list-page",
      },
      {
        path: `${ROUTES.student.testPapersRoot}/subject-1/chapter-wise/chapter-2`,
        marker: "test-paper-list-page",
      },
      { path: ROUTES.assessment.root, marker: "assessment-session-page" },
      {
        path: `${ROUTES.assessment.sessionRoot}/subject-1/chapter-2/medium/attempt`,
        marker: "assessment-session-page",
      },
      { path: ROUTES.assessment.result, marker: "assessment-result-page" },
    ];

    for (const routeCase of expectations) {
      const output = await renderAtPath(routeCase.path, routeCase.marker);
      expect(output).toContain(routeCase.marker);
    }
  });

  it("renders super admin workspace for all admin routes", async () => {
    seedSession(ROLES.SUPER_ADMIN);

    const adminPaths = [
      ROUTES.admin.root,
      ROUTES.admin.dashboard,
      ROUTES.admin.students,
      ROUTES.admin.subjects,
      ROUTES.admin.communityAnnouncements,
    ];

    for (const path of adminPaths) {
      const output = await renderAtPath(path, "super-admin-app-page");
      expect(output).toContain("super-admin-app-page");
    }
  });

  it("redirects role mismatches to role home routes", async () => {
    seedSession(ROLES.STUDENT);
    const studentTryingAdmin = await renderAtPath(
      ROUTES.admin.dashboard,
      "student-dashboard-page"
    );

    clearSession();
    seedSession(ROLES.SUPER_ADMIN);
    const adminTryingStudent = await renderAtPath(
      ROUTES.student.profile,
      "super-admin-app-page"
    );

    expect(studentTryingAdmin).toContain("student-dashboard-page");
    expect(adminTryingStudent).toContain("super-admin-app-page");
  });

  it("redirects authenticated users away from login/register", async () => {
    seedSession(ROLES.STUDENT);
    const studentOnLogin = await renderAtPath(ROUTES.auth.login, "student-dashboard-page");

    clearSession();
    seedSession(ROLES.SUPER_ADMIN);
    const adminOnRegister = await renderAtPath(ROUTES.auth.register, "super-admin-app-page");

    expect(studentOnLogin).toContain("student-dashboard-page");
    expect(adminOnRegister).toContain("super-admin-app-page");
  });

  it("resolves legacy routes to their modern targets", async () => {
    seedSession(ROLES.SUPER_ADMIN);
    const legacyAdmin = await renderAtPath(
      `${ROUTES.legacy.superAdminRoot}/dashboard`,
      "super-admin-app-page"
    );

    clearSession();
    seedSession(ROLES.STUDENT);
    const legacyTest = await renderAtPath(
      `${ROUTES.legacy.testRoot}/subject-1/chapter-1/attempt`,
      "assessment-session-page"
    );
    const legacyResult = await renderAtPath(ROUTES.legacy.result, "assessment-result-page");

    expect(legacyAdmin).toContain("super-admin-app-page");
    expect(legacyTest).toContain("assessment-session-page");
    expect(legacyResult).toContain("assessment-result-page");
  });

  it("renders not found page for unknown route", async () => {
    const output = await renderAtPath("/unknown/route", "not-found-page");
    expect(output).toContain("not-found-page");
  });
});
