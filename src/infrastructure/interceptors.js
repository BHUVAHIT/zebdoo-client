import { AUTH_STORAGE_KEYS } from "../store/authStore";

export const attachRequestInterceptors = (client) => {
  client.interceptors.request.use((config) => {
    const token = window.localStorage.getItem(AUTH_STORAGE_KEYS.accessToken);

    if (token) {
      config.headers = {
        ...(config.headers || {}),
        Authorization: `Bearer ${token}`,
      };
    }

    return config;
  });
};

export const attachResponseInterceptors = (client) => {
  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error?.response?.status === 401) {
        window.localStorage.removeItem(AUTH_STORAGE_KEYS.accessToken);
      }

      return Promise.reject(error);
    }
  );
};
