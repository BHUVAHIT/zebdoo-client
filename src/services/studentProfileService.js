import { TEST_STORAGE_KEYS } from "../utils/constants";
import { loadFromStorage, saveToStorage } from "../utils/helpers";

const DEFAULT_AVATARS = Object.freeze([
  "https://api.dicebear.com/9.x/thumbs/svg?seed=ca-student-1",
  "https://api.dicebear.com/9.x/thumbs/svg?seed=ca-student-2",
  "https://api.dicebear.com/9.x/thumbs/svg?seed=ca-student-3",
]);

const normalizeText = (value) => String(value || "").trim();

const getProfileKey = (user) => {
  if (!user) return "guest";
  return String(user.id || user.email || "guest").toLowerCase();
};

const readProfileStore = () => {
  const raw = loadFromStorage(TEST_STORAGE_KEYS.STUDENT_PROFILE, {});
  if (!raw || typeof raw !== "object") return {};
  return raw;
};

const writeProfileStore = (store) => {
  saveToStorage(TEST_STORAGE_KEYS.STUDENT_PROFILE, store);
};

const getDefaultAvatar = (key) => {
  let sum = 0;
  for (let index = 0; index < key.length; index += 1) {
    sum += key.charCodeAt(index);
  }
  return DEFAULT_AVATARS[sum % DEFAULT_AVATARS.length];
};

export const getStudentProfile = (user) => {
  const key = getProfileKey(user);
  const store = readProfileStore();
  const stored = store[key] || {};

  const name = normalizeText(stored.name || user?.name || "Student");
  const email = normalizeText(stored.email || user?.email || "");

  return {
    id: key,
    name,
    email,
    avatarUrl: normalizeText(stored.avatarUrl) || getDefaultAvatar(key),
    emailLocked: stored.emailLocked !== false,
    updatedAt: stored.updatedAt || null,
  };
};

export const saveStudentProfile = ({ user, updates }) => {
  const key = getProfileKey(user);
  const current = getStudentProfile(user);

  const merged = {
    ...current,
    ...updates,
    name: normalizeText(updates?.name ?? current.name) || current.name,
    email: normalizeText(updates?.email ?? current.email) || current.email,
    avatarUrl:
      normalizeText(updates?.avatarUrl ?? current.avatarUrl) || getDefaultAvatar(key),
    emailLocked: updates?.emailLocked ?? current.emailLocked,
    updatedAt: new Date().toISOString(),
  };

  const store = readProfileStore();
  store[key] = merged;
  writeProfileStore(store);

  return merged;
};

export const getInitials = (name) => {
  const normalized = normalizeText(name);
  if (!normalized) return "ST";

  const parts = normalized.split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.map((part) => part.charAt(0).toUpperCase()).join("") || "ST";
};
