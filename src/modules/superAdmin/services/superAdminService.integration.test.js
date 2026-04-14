import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../services/apiClient", async () => {
  const actual = await vi.importActual("../../../services/apiClient");
  return {
    ...actual,
    withMockLatency: async (resolver) => JSON.parse(JSON.stringify(resolver())),
  };
});

import { useAuthStore } from "../../../store/authStore";
import { superAdminService } from "./superAdminService";

const DB_STORAGE_KEY = "super-admin:db:v1";

describe("superAdminService authorization guardrails", () => {
  beforeEach(() => {
    window.localStorage.removeItem(DB_STORAGE_KEY);
    useAuthStore.setState({
      user: null,
      token: null,
      refreshToken: null,
      sessionExpiresAt: null,
    });
  });

  it("blocks privileged mutations when super-admin session is absent", async () => {
    await expect(
      superAdminService.createSubject({
        code: "SUB999",
        name: "Unauthorized Subject",
        description: "Should be forbidden",
        status: "ACTIVE",
      })
    ).rejects.toMatchObject({
      status: 403,
      code: "FORBIDDEN",
    });
  });

  it("keeps authenticateUser accessible without super-admin session", async () => {
    const payload = await superAdminService.authenticateUser({
      email: "superadmin@zebdoo.com",
      password: "SuperAdmin@123",
    });

    expect(payload.user.role).toBe("SUPER_ADMIN");
  });

  it("allows privileged mutations with super-admin session", async () => {
    useAuthStore.setState({
      user: {
        id: "user-super-admin-1",
        role: "SUPER_ADMIN",
      },
      token: "token-sa",
      refreshToken: null,
      sessionExpiresAt: Date.now() + 10 * 60 * 1000,
    });

    const stamp = Date.now();
    const subjectName = `Guarded Subject ${stamp}`;

    await superAdminService.createSubject({
      code: `SUB${String(stamp).slice(-3)}`,
      name: subjectName,
      description: "Created by guarded flow",
      status: "ACTIVE",
    });

    const listed = await superAdminService.listSubjects({
      page: 1,
      pageSize: 200,
      search: subjectName,
      sortBy: "createdAt",
      sortDir: "desc",
    });

    expect(listed.items.some((item) => item.name === subjectName)).toBe(true);
  });
});
