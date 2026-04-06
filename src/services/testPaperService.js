import {
  selectChaptersBySubjectId,
  selectSubjects,
} from "../store/catalogSelectors";
import { loadFromStorage, saveToStorage } from "../utils/helpers";
import { testPapersSeedData } from "../mock/testPapersData";
import {
  TEST_PAPER_MODES,
  TEST_PAPER_SCOPE_OPTIONS,
  TEST_PAPER_SCOPES,
  TEST_PAPER_TYPES,
  TEST_PAPER_TYPE_META,
  TEST_PAPER_TYPE_OPTIONS,
  normalizePaperType,
} from "../constants/paperTypes";

const STORAGE_KEY = "zebdoo:test-papers:v1";
const STORAGE_SYNC_KEY = "zebdoo:test-papers:sync:v1";
const CHANGE_EVENT_NAME = "zebdoo:test-papers:changed";
const LATENCY_MIN_MS = 180;
const LATENCY_MAX_MS = 460;

const randomLatency = () =>
  LATENCY_MIN_MS + Math.floor(Math.random() * (LATENCY_MAX_MS - LATENCY_MIN_MS + 1));

const delay = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

const withNetwork = async (resolver) => {
  await delay(randomLatency());
  return JSON.parse(JSON.stringify(resolver()));
};

const normalizeText = (value) => String(value || "").trim();

const normalizeScope = (value) => {
  const normalized = normalizeText(value).toUpperCase();
  return Object.prototype.hasOwnProperty.call(TEST_PAPER_SCOPES, normalized)
    ? TEST_PAPER_SCOPES[normalized]
    : TEST_PAPER_SCOPES.CHAPTER_WISE;
};

const normalizeMode = (value) => {
  const normalized = normalizeText(value).toLowerCase();
  if (normalized === TEST_PAPER_MODES.FULL_SYLLABUS) return TEST_PAPER_MODES.FULL_SYLLABUS;
  return TEST_PAPER_MODES.CHAPTER_WISE;
};

const normalizeUrl = (value) => normalizeText(value);

const isValidHttpUrl = (value) => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

const normalizeYear = (value) => {
  const year = Number(value);
  if (!Number.isFinite(year)) return NaN;
  return Math.trunc(year);
};

const getYearRange = () => {
  const currentYear = new Date().getFullYear();
  return {
    min: 1990,
    max: currentYear + 1,
  };
};

const getSubjectRecords = () =>
  (selectSubjects({ activeOnly: true }) || []).map((subject) => ({
    id: normalizeText(subject.id),
    name: normalizeText(subject.name),
    code: normalizeText(subject.code),
    description: normalizeText(subject.description),
  }));

const getChapterRecordsBySubject = (subjectId) =>
  (selectChaptersBySubjectId(subjectId, {
    activeOnly: true,
    requireActiveSubject: true,
  }) || []).map((chapter) => ({
    id: normalizeText(chapter.id),
    title: normalizeText(chapter.title || chapter.name),
    subjectId: normalizeText(chapter.subjectId),
  }));

const getSubjectMap = () => {
  const map = {};
  getSubjectRecords().forEach((subject) => {
    map[subject.id] = subject;
  });
  return map;
};

const getChapterMapBySubject = (subjectId) => {
  const map = {};
  getChapterRecordsBySubject(subjectId).forEach((chapter) => {
    map[chapter.id] = chapter;
  });
  return map;
};

const buildDraftId = () => `tp-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

const ensureSeed = () => {
  const stored = loadFromStorage(STORAGE_KEY, null);
  if (Array.isArray(stored)) {
    return;
  }
  saveToStorage(STORAGE_KEY, testPapersSeedData);
};

const readDb = () => {
  ensureSeed();
  const data = loadFromStorage(STORAGE_KEY, []);
  return Array.isArray(data) ? data : [];
};

const writeDb = (items) => {
  saveToStorage(STORAGE_KEY, items);
  saveToStorage(STORAGE_SYNC_KEY, { timestamp: Date.now() });

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT_NAME));
  }
};

const mapScopeFromMode = (mode) =>
  normalizeMode(mode) === TEST_PAPER_MODES.FULL_SYLLABUS
    ? TEST_PAPER_SCOPES.FULL_SYLLABUS
    : TEST_PAPER_SCOPES.CHAPTER_WISE;

const comparePapers = (left, right) => {
  const yearDelta = Number(right.year || 0) - Number(left.year || 0);
  if (yearDelta !== 0) return yearDelta;

  return String(left.title || "").localeCompare(String(right.title || ""));
};

const enrichPaper = (paper, subjectMap, chapterMapBySubject) => {
  const subject = subjectMap[paper.subjectId] || null;
  const chapterMap = chapterMapBySubject[paper.subjectId] || {};
  const chapter = paper.chapterId ? chapterMap[paper.chapterId] || null : null;

  return {
    ...paper,
    subjectName: subject?.name || "Unknown Subject",
    subjectCode: subject?.code || "SUB",
    chapterName: chapter?.title || "Full Syllabus",
    typeLabel: TEST_PAPER_TYPE_META[normalizePaperType(paper.type)]?.shortLabel || "OTHERS",
  };
};

const validateAndNormalizePayload = (payload, { allowPartial = false } = {}) => {
  const subjectId = normalizeText(payload?.subjectId);
  const scope = normalizeScope(payload?.scope);
  const chapterId = normalizeText(payload?.chapterId);
  const title = normalizeText(payload?.title);
  const pdfUrl = normalizeUrl(payload?.pdfUrl);
  const type = normalizePaperType(payload?.type);
  const year = normalizeYear(payload?.year);
  const { min, max } = getYearRange();

  if (!allowPartial || Object.prototype.hasOwnProperty.call(payload || {}, "subjectId")) {
    if (!subjectId) {
      throw new Error("Subject is required.");
    }
  }

  if (scope === TEST_PAPER_SCOPES.CHAPTER_WISE) {
    if (!chapterId) {
      throw new Error("Chapter is required for chapter wise papers.");
    }
  }

  if (!allowPartial || Object.prototype.hasOwnProperty.call(payload || {}, "title")) {
    if (title.length < 5) {
      throw new Error("Paper title should have at least 5 characters.");
    }
  }

  if (!allowPartial || Object.prototype.hasOwnProperty.call(payload || {}, "year")) {
    if (!Number.isFinite(year) || year < min || year > max) {
      throw new Error(`Year should be between ${min} and ${max}.`);
    }
  }

  if (!allowPartial || Object.prototype.hasOwnProperty.call(payload || {}, "pdfUrl")) {
    if (!isValidHttpUrl(pdfUrl)) {
      throw new Error("Enter a valid PDF URL starting with http:// or https://.");
    }
  }

  return {
    subjectId,
    chapterId: scope === TEST_PAPER_SCOPES.CHAPTER_WISE ? chapterId : null,
    scope,
    type,
    year,
    title,
    pdfUrl,
  };
};

export const testPaperService = {
  getModeOptions: async () => withNetwork(() => TEST_PAPER_SCOPE_OPTIONS),

  getTypeOptions: async () => withNetwork(() => TEST_PAPER_TYPE_OPTIONS),

  getSubjectsForStudent: async () =>
    withNetwork(() => {
      const papers = readDb();
      const subjects = getSubjectRecords();

      return subjects
        .map((subject) => {
          const chapterCount = getChapterRecordsBySubject(subject.id).length;
          const paperCount = papers.filter((paper) => paper.subjectId === subject.id).length;
          return {
            ...subject,
            chapterCount,
            paperCount,
          };
        })
        .sort((left, right) => left.name.localeCompare(right.name));
    }),

  getSubjectContext: async (subjectId) =>
    withNetwork(() => {
      const normalizedSubjectId = normalizeText(subjectId);
      const subjectMap = getSubjectMap();
      const subject = subjectMap[normalizedSubjectId];

      if (!subject) {
        throw new Error("Selected subject is not available.");
      }

      const chapters = getChapterRecordsBySubject(normalizedSubjectId);
      return {
        subject,
        chapters,
      };
    }),

  getPapersForStudent: async ({ subjectId, mode, chapterId } = {}) =>
    withNetwork(() => {
      const normalizedSubjectId = normalizeText(subjectId);
      const normalizedMode = normalizeMode(mode);
      const subjectMap = getSubjectMap();
      const subject = subjectMap[normalizedSubjectId];

      if (!subject) {
        throw new Error("Selected subject is not available.");
      }

      const chapterRecords = getChapterRecordsBySubject(normalizedSubjectId);
      const chapterMap = chapterRecords.reduce((acc, chapter) => {
        acc[chapter.id] = chapter;
        return acc;
      }, {});

      const normalizedChapterId = normalizeText(chapterId);
      const targetScope = mapScopeFromMode(normalizedMode);

      const papers = readDb()
        .filter((paper) => paper.subjectId === normalizedSubjectId)
        .filter((paper) => paper.scope === targetScope)
        .filter((paper) => {
          if (targetScope !== TEST_PAPER_SCOPES.CHAPTER_WISE) return true;
          if (!normalizedChapterId || normalizedChapterId === "all") return true;
          return paper.chapterId === normalizedChapterId;
        })
        .map((paper) =>
          enrichPaper(paper, subjectMap, {
            [normalizedSubjectId]: chapterMap,
          })
        )
        .sort(comparePapers);

      return {
        subject,
        chapters: chapterRecords,
        mode: normalizedMode,
        papers,
      };
    }),

  getFormOptions: async () =>
    withNetwork(() => {
      const subjects = getSubjectRecords().map((subject) => ({
        value: subject.id,
        label: subject.name,
      }));

      const chaptersBySubject = subjects.reduce((acc, subject) => {
        acc[subject.value] = getChapterRecordsBySubject(subject.value).map((chapter) => ({
          value: chapter.id,
          label: chapter.title,
        }));
        return acc;
      }, {});

      return {
        subjects,
        chaptersBySubject,
        types: TEST_PAPER_TYPE_OPTIONS,
        scopes: TEST_PAPER_SCOPE_OPTIONS,
      };
    }),

  getPaperByIdForAdmin: async (paperId) =>
    withNetwork(() => {
      const item = readDb().find((paper) => paper.id === String(paperId));
      if (!item) {
        throw new Error("Paper not found.");
      }
      return item;
    }),

  listPapersForAdmin: async (filters = {}) =>
    withNetwork(() => {
      const search = normalizeText(filters.search).toLowerCase();
      const subjectId = normalizeText(filters.subjectId);
      const scope = normalizeText(filters.scope).toUpperCase();
      const type = normalizeText(filters.type).toUpperCase();
      const year = normalizeText(filters.year);

      const subjectMap = getSubjectMap();
      const chapterMapBySubject = Object.keys(subjectMap).reduce((acc, id) => {
        acc[id] = getChapterMapBySubject(id);
        return acc;
      }, {});

      const papers = readDb()
        .map((paper) => enrichPaper(paper, subjectMap, chapterMapBySubject))
        .filter((paper) => {
          if (subjectId && paper.subjectId !== subjectId) return false;
          if (scope && paper.scope !== scope) return false;
          if (type && paper.type !== type) return false;
          if (year && String(paper.year) !== year) return false;

          if (search) {
            const haystack = [
              paper.title,
              paper.subjectName,
              paper.chapterName,
              paper.type,
              paper.year,
            ]
              .join(" ")
              .toLowerCase();
            return haystack.includes(search);
          }

          return true;
        })
        .sort(comparePapers);

      return {
        items: papers,
        total: papers.length,
      };
    }),

  createPaper: async (payload) =>
    withNetwork(() => {
      const normalized = validateAndNormalizePayload(payload);

      const subjectMap = getSubjectMap();
      if (!subjectMap[normalized.subjectId]) {
        throw new Error("Selected subject does not exist.");
      }

      if (normalized.scope === TEST_PAPER_SCOPES.CHAPTER_WISE) {
        const chapterMap = getChapterMapBySubject(normalized.subjectId);
        if (!chapterMap[normalized.chapterId]) {
          throw new Error("Selected chapter does not exist for this subject.");
        }
      }

      const now = new Date().toISOString();
      const next = {
        id: buildDraftId(),
        ...normalized,
        createdAt: now,
        updatedAt: now,
      };

      const db = readDb();
      db.unshift(next);
      writeDb(db);

      return next;
    }),

  updatePaper: async (paperId, payload) =>
    withNetwork(() => {
      const id = String(paperId);
      const db = readDb();
      const index = db.findIndex((paper) => paper.id === id);

      if (index < 0) {
        throw new Error("Paper not found.");
      }

      const normalized = validateAndNormalizePayload(payload, { allowPartial: false });

      const subjectMap = getSubjectMap();
      if (!subjectMap[normalized.subjectId]) {
        throw new Error("Selected subject does not exist.");
      }

      if (normalized.scope === TEST_PAPER_SCOPES.CHAPTER_WISE) {
        const chapterMap = getChapterMapBySubject(normalized.subjectId);
        if (!chapterMap[normalized.chapterId]) {
          throw new Error("Selected chapter does not exist for this subject.");
        }
      }

      db[index] = {
        ...db[index],
        ...normalized,
        updatedAt: new Date().toISOString(),
      };

      writeDb(db);
      return db[index];
    }),

  deletePaper: async (paperId) =>
    withNetwork(() => {
      const id = String(paperId);
      const db = readDb();
      const next = db.filter((paper) => paper.id !== id);

      if (next.length === db.length) {
        throw new Error("Paper not found.");
      }

      writeDb(next);
      return {
        success: true,
      };
    }),

  subscribeToChanges: (callback) => {
    if (typeof callback !== "function" || typeof window === "undefined") {
      return () => {};
    }

    const handleCustomEvent = () => callback();
    const handleStorageEvent = (event) => {
      if (event.key === STORAGE_SYNC_KEY) {
        callback();
      }
    };

    window.addEventListener(CHANGE_EVENT_NAME, handleCustomEvent);
    window.addEventListener("storage", handleStorageEvent);

    return () => {
      window.removeEventListener(CHANGE_EVENT_NAME, handleCustomEvent);
      window.removeEventListener("storage", handleStorageEvent);
    };
  },
};
