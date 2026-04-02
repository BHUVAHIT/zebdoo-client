import { useAuthStore } from "../store/authStore";
import { loadFromStorage, removeFromStorage, saveToStorage } from "./helpers";

const normalizeScope = (value) => String(value || "").trim().toLowerCase();

export const resolveStorageScopeId = (user) => {
  if (user && typeof user === "object") {
    const scoped = normalizeScope(user.id || user.email);
    if (scoped) {
      return scoped;
    }
  }

  const activeUser = useAuthStore.getState().user;
  const activeScoped = normalizeScope(activeUser?.id || activeUser?.email);
  return activeScoped || "guest";
};

export const toScopedStorageKey = (baseKey, scopeId) =>
  `${String(baseKey || "")}::${normalizeScope(scopeId) || resolveStorageScopeId()}`;

export const loadScopedFromStorage = (
  baseKey,
  fallback = null,
  { scopeId, migrateLegacy = true } = {}
) => {
  const scopedKey = toScopedStorageKey(baseKey, scopeId);
  const scopedValue = loadFromStorage(scopedKey, undefined);

  if (scopedValue !== undefined) {
    return scopedValue;
  }

  if (!migrateLegacy) {
    return fallback;
  }

  const legacyValue = loadFromStorage(baseKey, undefined);
  if (legacyValue === undefined) {
    return fallback;
  }

  saveToStorage(scopedKey, legacyValue);
  return legacyValue;
};

export const saveScopedToStorage = (baseKey, value, scopeId) => {
  saveToStorage(toScopedStorageKey(baseKey, scopeId), value);
};

export const removeScopedFromStorage = (baseKey, scopeId) => {
  removeFromStorage(toScopedStorageKey(baseKey, scopeId));
};
