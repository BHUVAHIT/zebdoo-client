import { APP_ENV } from "../config/env";

const createAbortError = () => {
  const error = new Error("Request aborted.");
  error.name = "AbortError";
  return error;
};

const delay = (ms, signal) =>
  new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(createAbortError());
      return;
    }

    const timeoutId = window.setTimeout(() => {
      cleanup();
      resolve();
    }, ms);

    const onAbort = () => {
      cleanup();
      reject(createAbortError());
    };

    const cleanup = () => {
      window.clearTimeout(timeoutId);
      signal?.removeEventListener("abort", onAbort);
    };

    signal?.addEventListener("abort", onAbort, { once: true });
  });

const clone = (value) => JSON.parse(JSON.stringify(value));

const randomMs = (min, max) => {
  if (max <= min) return min;
  return min + Math.floor(Math.random() * (max - min + 1));
};

export class ApiError extends Error {
  constructor(message, status = 500, code = "API_ERROR") {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export const toApiError = (error, fallbackMessage = "Something went wrong.") => {
  if (error instanceof ApiError) {
    return error;
  }

  const message = error?.message || fallbackMessage;
  return new ApiError(message, error?.status || 500);
};

export const isAbortError = (error) =>
  error?.name === "AbortError" || error?.code === "ABORT_ERR";

export const createPagedResult = ({ items, total, page, pageSize }) => ({
  items,
  page,
  pageSize,
  total,
  totalPages: Math.max(Math.ceil(total / pageSize), 1),
});

export const withMockLatency = async (resolver, options = {}) => {
  const min = options.minMs ?? APP_ENV.mockLatencyMinMs;
  const max = options.maxMs ?? APP_ENV.mockLatencyMaxMs;
  const signal = options.signal;

  if (signal?.aborted) {
    throw createAbortError();
  }

  await delay(randomMs(min, max), signal);

  if (signal?.aborted) {
    throw createAbortError();
  }

  return clone(resolver());
};
