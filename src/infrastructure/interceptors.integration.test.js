import { beforeEach, describe, expect, it } from "vitest";
import { AUTH_STORAGE_KEYS, useAuthStore } from "../store/authStore";
import {
  attachRequestInterceptors,
  attachResponseInterceptors,
} from "./interceptors";

const createMockClient = () => {
  const handlers = {
    request: null,
    responseReject: null,
  };

  return {
    handlers,
    interceptors: {
      request: {
        use: (requestHandler) => {
          handlers.request = requestHandler;
        },
      },
      response: {
        use: (_resolve, reject) => {
          handlers.responseReject = reject;
        },
      },
    },
  };
};

describe("infrastructure interceptors", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    useAuthStore.setState({
      user: null,
      token: null,
      refreshToken: null,
      sessionExpiresAt: null,
    });
  });

  it("attaches auth header for valid sessions", async () => {
    const client = createMockClient();

    window.localStorage.setItem(AUTH_STORAGE_KEYS.accessToken, "token-123");
    window.localStorage.setItem(
      AUTH_STORAGE_KEYS.sessionExpiry,
      String(Date.now() + 5 * 60 * 1000)
    );

    attachRequestInterceptors(client);
    const config = await client.handlers.request({ headers: {} });

    expect(config.headers.Authorization).toBe("Bearer token-123");
    expect(config.headers["X-Requested-With"]).toBe("XMLHttpRequest");
  });

  it("clears stale sessions before sending request headers", async () => {
    const client = createMockClient();

    window.localStorage.setItem(AUTH_STORAGE_KEYS.accessToken, "expired-token");
    window.localStorage.setItem(
      AUTH_STORAGE_KEYS.sessionExpiry,
      String(Date.now() - 60 * 1000)
    );

    useAuthStore.setState({
      user: { id: "s-1", role: "STUDENT" },
      token: "expired-token",
      refreshToken: null,
      sessionExpiresAt: Date.now() - 60 * 1000,
    });

    attachRequestInterceptors(client);
    const config = await client.handlers.request({ headers: {} });

    expect(config.headers.Authorization).toBeUndefined();
    expect(window.localStorage.getItem(AUTH_STORAGE_KEYS.accessToken)).toBeNull();
    expect(useAuthStore.getState().token).toBeNull();
  });

  it("logs out on 401 responses when a token exists", async () => {
    const client = createMockClient();

    useAuthStore.setState({
      user: { id: "s-1", role: "STUDENT" },
      token: "token-123",
      refreshToken: null,
      sessionExpiresAt: Date.now() + 60 * 1000,
    });

    attachResponseInterceptors(client);

    await expect(
      client.handlers.responseReject({ response: { status: 401 } })
    ).rejects.toEqual({ response: { status: 401 } });

    expect(useAuthStore.getState().token).toBeNull();
  });
});
