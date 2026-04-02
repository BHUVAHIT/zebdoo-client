import { createStore } from "zustand/vanilla";
import { useStore } from "zustand";
import { buildInitialAdminDb } from "../modules/superAdmin/services/mockData";
import { SYNC_EVENT } from "../shared/constants/syncEvents";
import { publishSyncEvent } from "../shared/utils/syncChannel";

const DB_STORAGE_KEY = "super-admin:db:v1";

const normalizeId = (value) => String(value ?? "").trim();

const safeArray = (value) => (Array.isArray(value) ? value : []);

const RESOURCE_STATUS_TEMPLATE = Object.freeze({
  isLoading: false,
  isFetching: false,
  error: "",
});

const createInitialResourceStatus = () => ({
  students: { ...RESOURCE_STATUS_TEMPLATE },
  subjects: { ...RESOURCE_STATUS_TEMPLATE },
  chapters: { ...RESOURCE_STATUS_TEMPLATE },
  tests: { ...RESOURCE_STATUS_TEMPLATE },
  questions: { ...RESOURCE_STATUS_TEMPLATE },
  users: { ...RESOURCE_STATUS_TEMPLATE },
});

const normalizeDb = (rawDb = {}) => ({
  students: safeArray(rawDb.students).map((item) => ({
    ...item,
    id: normalizeId(item.id),
  })),
  subjects: safeArray(rawDb.subjects).map((item) => ({
    ...item,
    id: normalizeId(item.id),
  })),
  chapters: safeArray(rawDb.chapters).map((item) => ({
    ...item,
    id: normalizeId(item.id),
    subjectId: normalizeId(item.subjectId),
  })),
  tests: safeArray(rawDb.tests).map((item) => ({
    ...item,
    id: normalizeId(item.id),
    subjectId: normalizeId(item.subjectId),
    chapterId: normalizeId(item.chapterId),
  })),
  questions: safeArray(rawDb.questions).map((item) => ({
    ...item,
    id: normalizeId(item.id),
    testId: normalizeId(item.testId),
  })),
});

const parseStoredDb = (value) => {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value);
    return normalizeDb(parsed);
  } catch {
    return null;
  }
};

const persistDb = (db) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(db));
};

const readDbFromStorage = () => {
  if (typeof window === "undefined") {
    return normalizeDb(buildInitialAdminDb());
  }

  const parsed = parseStoredDb(window.localStorage.getItem(DB_STORAGE_KEY));

  if (parsed) {
    return parsed;
  }

  const seeded = normalizeDb(buildInitialAdminDb());
  persistDb(seeded);
  return seeded;
};

let lastVersionIssued = 0;

const nowVersion = () => {
  const next = Date.now();
  lastVersionIssued = next > lastVersionIssued ? next : lastVersionIssued + 1;
  return lastVersionIssued;
};

const emitCatalogSync = (version, action) => {
  publishSyncEvent({
    type: SYNC_EVENT.CATALOG_UPDATED,
    payload: {
      version,
      action,
    },
  });
};

export const catalogStore = createStore((set, get) => ({
  db: null,
  version: 0,
  resourceStatus: createInitialResourceStatus(),

  hydrate: () => {
    const current = get().db;
    if (current) return current;

    const seeded = readDbFromStorage();
    set({ db: seeded, version: nowVersion() });
    return seeded;
  },

  replaceDb: (nextDb) => {
    const normalized = normalizeDb(nextDb);
    const version = nowVersion();
    persistDb(normalized);
    set({ db: normalized, version });
    emitCatalogSync(version, "replace");
    return normalized;
  },

  updateDb: (mutator) => {
    const base = get().hydrate();
    const nextRaw = mutator(normalizeDb(base));
    const normalized = normalizeDb(nextRaw);
    const version = nowVersion();
    persistDb(normalized);
    set({ db: normalized, version });
    emitCatalogSync(version, "update");
    return normalized;
  },

  syncFromStorage: () => {
    const fromStorage = readDbFromStorage();
    set({ db: fromStorage, version: nowVersion() });
    return fromStorage;
  },

  setResourceStatus: (resourceKey, patch) => {
    if (!resourceKey) return;

    set((state) => {
      const current = state.resourceStatus?.[resourceKey] || RESOURCE_STATUS_TEMPLATE;

      return {
        resourceStatus: {
          ...state.resourceStatus,
          [resourceKey]: {
            ...current,
            ...patch,
          },
        },
      };
    });
  },

  resetResourceStatuses: () => {
    set({ resourceStatus: createInitialResourceStatus() });
  },
}));

let hasStorageSyncBinding = false;

const ensureStorageSyncBinding = () => {
  if (hasStorageSyncBinding || typeof window === "undefined") return;

  const onStorage = (event) => {
    if (event.storageArea !== window.localStorage) return;
    if (event.key !== DB_STORAGE_KEY) return;
    catalogStore.getState().syncFromStorage();
  };

  window.addEventListener("storage", onStorage);
  hasStorageSyncBinding = true;
};

export const useCatalogStore = (selector) => {
  ensureStorageSyncBinding();
  return useStore(catalogStore, selector);
};

export const readCatalogDb = () => {
  ensureStorageSyncBinding();
  return catalogStore.getState().hydrate();
};

export const replaceCatalogDb = (nextDb) => {
  ensureStorageSyncBinding();
  return catalogStore.getState().replaceDb(nextDb);
};

export const updateCatalogDb = (mutator) => {
  ensureStorageSyncBinding();
  return catalogStore.getState().updateDb(mutator);
};

export const getCatalogVersion = () => {
  ensureStorageSyncBinding();
  const { version, hydrate } = catalogStore.getState();
  if (!version) {
    hydrate();
    return catalogStore.getState().version;
  }
  return version;
};

export const setCatalogResourceStatus = (resourceKey, patch) => {
  ensureStorageSyncBinding();
  catalogStore.getState().setResourceStatus(resourceKey, patch);
};

export const useCatalogResourceStatus = (resourceKey) =>
  useCatalogStore((state) => state.resourceStatus?.[resourceKey] || RESOURCE_STATUS_TEMPLATE);

let normalizedCache = {
  version: -1,
  snapshot: null,
};

export const getNormalizedCatalogSnapshot = () => {
  const version = getCatalogVersion();
  if (normalizedCache.snapshot && normalizedCache.version === version) {
    return normalizedCache.snapshot;
  }

  const db = readCatalogDb();

  const subjectsById = {};
  const chaptersById = {};
  const testsById = {};
  const questionsById = {};

  const chapterIdsBySubjectId = {};
  const testIdsByChapterId = {};
  const questionIdsByTestId = {};

  db.subjects.forEach((subject) => {
    subjectsById[subject.id] = subject;
    chapterIdsBySubjectId[subject.id] = chapterIdsBySubjectId[subject.id] || [];
  });

  db.chapters.forEach((chapter) => {
    chaptersById[chapter.id] = chapter;
    chapterIdsBySubjectId[chapter.subjectId] = chapterIdsBySubjectId[chapter.subjectId] || [];
    chapterIdsBySubjectId[chapter.subjectId].push(chapter.id);
    testIdsByChapterId[chapter.id] = testIdsByChapterId[chapter.id] || [];
  });

  db.tests.forEach((test) => {
    testsById[test.id] = test;
    testIdsByChapterId[test.chapterId] = testIdsByChapterId[test.chapterId] || [];
    testIdsByChapterId[test.chapterId].push(test.id);
    questionIdsByTestId[test.id] = questionIdsByTestId[test.id] || [];
  });

  db.questions.forEach((question) => {
    questionsById[question.id] = question;
    questionIdsByTestId[question.testId] = questionIdsByTestId[question.testId] || [];
    questionIdsByTestId[question.testId].push(question.id);
  });

  const snapshot = {
    version,
    db,
    entities: {
      subjectsById,
      chaptersById,
      testsById,
      questionsById,
    },
    indexes: {
      chapterIdsBySubjectId,
      testIdsByChapterId,
      questionIdsByTestId,
    },
  };

  normalizedCache = {
    version,
    snapshot,
  };

  return snapshot;
};
