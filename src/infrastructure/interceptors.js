import { AUTH_STORAGE_KEYS, useAuthStore } from "../store/authStore";

const getStoredSessionExpiry = () => {
  if (typeof window === "undefined") return 0;

  const rawExpiry = window.localStorage.getItem(AUTH_STORAGE_KEYS.sessionExpiry);
  const expiry = Number(rawExpiry || 0);
  return Number.isFinite(expiry) ? expiry : 0;
};

const isStoredSessionExpired = () => {
  const expiry = getStoredSessionExpiry();
  return !expiry || Date.now() >= expiry;
};

export const attachRequestInterceptors = (client) => {
  client.interceptors.request.use((config) => {
    if (typeof window === "undefined") {
      return config;
    }

    if (isStoredSessionExpired()) {
      useAuthStore.getState().logout();
      return config;
    }

    const token = window.localStorage.getItem(AUTH_STORAGE_KEYS.accessToken);

    if (token) {
      config.headers = {
        ...(config.headers || {}),
        Authorization: `Bearer ${token}`,
        "X-Requested-With": "XMLHttpRequest",
      };
    }

    return config;
  });
};

export const attachResponseInterceptors = (client) => {
  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error?.response?.status === 401 && useAuthStore.getState().token) {
        useAuthStore.getState().logout();
      }

      return Promise.reject(error);
    }
  );
};
