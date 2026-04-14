import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const toBase64Url = (value) =>
  globalThis
    .btoa(JSON.stringify(value))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

const createJwtWithExp = (expSeconds) => {
  const header = toBase64Url({ alg: "HS256", typ: "JWT" });
  const payload = toBase64Url({ exp: expSeconds });
  return `${header}.${payload}.signature`;
};

describe("auth api provider bridge", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("uses mock provider by default and preserves current contract", async () => {
    const authenticateUser = vi.fn().mockResolvedValue({
      user: {
        id: "stu-1",
        name: "Student",
        role: "STUDENT",
      },
      forcePasswordChange: false,
    });

    vi.doMock("../modules/superAdmin/services/superAdminService", () => ({
      superAdminService: {
        authenticateUser,
        registerStudent: vi.fn(),
      },
    }));

    vi.doMock("../infrastructure/apiClient", () => ({
      infrastructureApiClient: {
        post: vi.fn(),
      },
    }));

    const { getActiveAuthMode, loginUser } = await import("./auth");
    const session = await loginUser("student@demo.com", "Student@123");

    expect(getActiveAuthMode()).toBe("mock");
    expect(authenticateUser).toHaveBeenCalledWith({
      email: "student@demo.com",
      password: "Student@123",
    });
    expect(session.user.role).toBe("STUDENT");
    expect(session.token).toContain("fake-jwt-token-student");
    expect(session.expiresAt).toBeGreaterThan(Date.now());
  });

  it("uses backend provider and derives expiry from JWT exp claim", async () => {
    vi.stubEnv("VITE_AUTH_PROVIDER", "backend");

    const authenticateUser = vi.fn();
    const expSeconds = Math.floor(Date.now() / 1000) + 300;
    const accessToken = createJwtWithExp(expSeconds);
    const post = vi.fn().mockResolvedValue({
      data: {
        user: {
          id: "sa-1",
          name: "Super Admin",
          role: "SUPER_ADMIN",
        },
        accessToken,
        refreshToken: "refresh-sa-1",
      },
    });

    vi.doMock("../modules/superAdmin/services/superAdminService", () => ({
      superAdminService: {
        authenticateUser,
        registerStudent: vi.fn(),
      },
    }));

    vi.doMock("../infrastructure/apiClient", () => ({
      infrastructureApiClient: {
        post,
      },
    }));

    const { getActiveAuthMode, loginUser } = await import("./auth");
    const session = await loginUser("superadmin@zebdoo.com", "SuperAdmin@123");

    expect(getActiveAuthMode()).toBe("backend");
    expect(authenticateUser).not.toHaveBeenCalled();
    expect(post).toHaveBeenCalledWith("/auth/login", {
      email: "superadmin@zebdoo.com",
      password: "SuperAdmin@123",
    });
    expect(session.user.role).toBe("SUPER_ADMIN");
    expect(session.token).toBe(accessToken);
    expect(session.expiresAt).toBe(expSeconds * 1000);
  });
});
