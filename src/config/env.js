const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const APP_ENV = Object.freeze({
  mode: import.meta.env.MODE || "development",
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || "/api",
  mockLatencyMinMs: toNumber(import.meta.env.VITE_MOCK_LATENCY_MIN_MS, 240),
  mockLatencyMaxMs: toNumber(import.meta.env.VITE_MOCK_LATENCY_MAX_MS, 620),
  defaultPageSize: toNumber(import.meta.env.VITE_DEFAULT_PAGE_SIZE, 10),
});
