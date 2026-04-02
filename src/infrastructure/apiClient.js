import axios from "axios";
import { APP_ENV } from "../config/env";
import { attachRequestInterceptors, attachResponseInterceptors } from "./interceptors";

export const infrastructureApiClient = axios.create({
  baseURL: APP_ENV.apiBaseUrl,
  timeout: Number(APP_ENV.requestTimeoutMs) || 15_000,
});

attachRequestInterceptors(infrastructureApiClient);
attachResponseInterceptors(infrastructureApiClient);
