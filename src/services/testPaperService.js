import {
  selectChaptersBySubjectId,
  selectSubjects,
} from "../store/catalogSelectors";
import { catalogStore } from "../store/catalogStore";
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
import { infrastructureApiClient } from "../infrastructure/apiClient";

const STORAGE_KEY = "zebdoo:test-papers:v1";
const STORAGE_SYNC_KEY = "zebdoo:test-papers:sync:v1";
const CHANGE_EVENT_NAME = "zebdoo:test-papers:changed";
const LATENCY_MIN_MS = 180;
const LATENCY_MAX_MS = 460;
const UPLOAD_ENDPOINT = String(import.meta.env.VITE_TEST_PAPER_UPLOAD_ENDPOINT || "").trim();
const MOCK_UPLOAD_FALLBACK_URL =
  "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf";
const DEFAULT_MAX_UPLOAD_MB = 15;
const configuredMaxUploadMb = Number(import.meta.env.VITE_TEST_PAPER_MAX_UPLOAD_MB);
const MAX_UPLOAD_MB =
  Number.isFinite(configuredMaxUploadMb) && configuredMaxUploadMb > 0
    ? configuredMaxUploadMb
    : DEFAULT_MAX_UPLOAD_MB;
const MAX_UPLOAD_BYTES = Math.trunc(MAX_UPLOAD_MB * 1024 * 1024);
const PDF_MIME_TYPES = new Set([
  "application/pdf",
  "application/x-pdf",
  "applications/vnd.pdf",
  "text/pdf",
  "text/x-pdf",
]);

const randomLatency = () =>
  LATENCY_MIN_MS + Math.floor(Math.random() * (LATENCY_MAX_MS - LATENCY_MIN_MS + 1));

const delay = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

const withNetwork = async (resolver) => {
  await delay(randomLatency());
  return JSON.parse(JSON.stringify(resolver()));
};

const clone = (value) => JSON.parse(JSON.stringify(value));

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

const normalizePaperTypeValue = (paper) =>
  normalizePaperType(paper?.paperType || paper?.type);

const isPdfFile = (file) => {
  const normalizedType = String(file?.type || "").toLowerCase();
  const normalizedName = String(file?.name || "").toLowerCase();

  return PDF_MIME_TYPES.has(normalizedType) || normalizedName.endsWith(".pdf");
};

const validateUploadFile = (file) => {
  if (typeof File !== "undefined" && !(file instanceof File)) {
    throw new Error("Please select a valid PDF file.");
  }

  if (!isPdfFile(file)) {
    throw new Error("Only PDF files are supported.");
  }

  if (Number(file.size || 0) > MAX_UPLOAD_BYTES) {
    throw new Error(`PDF size must be ${MAX_UPLOAD_MB} MB or less.`);
  }
};

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

const normalizePersistedPaper = (paper = {}) => {
  const id = normalizeText(paper.id);
  if (!id) {
    return null;
  }

  const normalizedType = normalizePaperTypeValue(paper);
  const normalizedScope = normalizeScope(paper.scope || paper.mode);
  const normalizedYear = normalizeYear(paper.year);

  return {
    ...paper,
    id,
    subjectId: normalizeText(paper.subjectId),
    chapterId:
      normalizedScope === TEST_PAPER_SCOPES.CHAPTER_WISE
        ? normalizeText(paper.chapterId)
        : null,
    scope: normalizedScope,
    type: normalizedType,
    paperType: normalizedType,
    year: Number.isFinite(normalizedYear) ? normalizedYear : new Date().getFullYear(),
    title: normalizeText(paper.title),
    pdfUrl: normalizeUrl(paper.pdfUrl),
    pdfFileName: normalizeText(paper.pdfFileName) || null,
    pdfFileSize: Number.isFinite(Number(paper.pdfFileSize))
      ? Math.max(Math.trunc(Number(paper.pdfFileSize)), 0)
      : 0,
    pdfMimeType: normalizeText(paper.pdfMimeType) || "application/pdf",
    createdAt: normalizeText(paper.createdAt) || new Date().toISOString(),
    updatedAt: normalizeText(paper.updatedAt) || normalizeText(paper.createdAt) || new Date().toISOString(),
  };
};

const dedupeByPaperId = (papers = []) => {
  const byId = new Map();

  papers.forEach((paper) => {
    if (!paper?.id) return;

    const previous = byId.get(paper.id);
    if (!previous) {
      byId.set(paper.id, paper);
      return;
    }

    const previousUpdatedAt = Number(new Date(previous.updatedAt || previous.createdAt || 0));
    const nextUpdatedAt = Number(new Date(paper.updatedAt || paper.createdAt || 0));

    if (nextUpdatedAt >= previousUpdatedAt) {
      byId.set(paper.id, paper);
    }
  });

  return Array.from(byId.values());
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

const hasArrayChanged = (left = [], right = []) => {
  if (left.length !== right.length) {
    return true;
  }

  return JSON.stringify(left) !== JSON.stringify(right);
};

const reconcilePapersWithCatalog = (papers = []) => {
  const subjectMap = getSubjectMap();
  const chapterMapBySubject = Object.keys(subjectMap).reduce((acc, subjectId) => {
    acc[subjectId] = getChapterMapBySubject(subjectId);
    return acc;
  }, {});

  return papers
    .filter((paper) => Boolean(subjectMap[paper.subjectId]))
    .filter((paper) => {
      if (paper.scope !== TEST_PAPER_SCOPES.CHAPTER_WISE) {
        return true;
      }

      if (!paper.chapterId) {
        return false;
      }

      return Boolean(chapterMapBySubject[paper.subjectId]?.[paper.chapterId]);
    })
    .map((paper) => {
      if (paper.scope === TEST_PAPER_SCOPES.FULL_SYLLABUS && paper.chapterId) {
        return {
          ...paper,
          chapterId: null,
        };
      }

      return paper;
    });
};

const sanitizePaperDb = (rawItems = []) => {
  const normalized = (Array.isArray(rawItems) ? rawItems : [])
    .map(normalizePersistedPaper)
    .filter(Boolean);

  const deduped = dedupeByPaperId(normalized);
  return reconcilePapersWithCatalog(deduped);
};

const ensureSeed = () => {
  const stored = loadFromStorage(STORAGE_KEY, null);

  if (Array.isArray(stored)) {
    const sanitized = sanitizePaperDb(stored);
    if (hasArrayChanged(stored, sanitized)) {
      writeDb(sanitized, { notify: false });
    }
    return sanitized;
  }

  const seeded = sanitizePaperDb(clone(testPapersSeedData));
  writeDb(seeded, { notify: false });
  return seeded;
};

const readDb = () => {
  const seeded = ensureSeed();
  if (Array.isArray(seeded)) {
    return seeded;
  }

  const data = loadFromStorage(STORAGE_KEY, []);
  const sanitized = sanitizePaperDb(data);

  if (hasArrayChanged(Array.isArray(data) ? data : [], sanitized)) {
    writeDb(sanitized, { notify: false });
  }

  return sanitized;
};

const writeDb = (items, { notify = true } = {}) => {
  saveToStorage(STORAGE_KEY, items);

  if (notify) {
    saveToStorage(STORAGE_SYNC_KEY, { timestamp: Date.now() });

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(CHANGE_EVENT_NAME));
    }
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

const getPaperDifficulty = (paper) => {
  const year = Number(paper?.year || new Date().getFullYear());
  const currentYear = new Date().getFullYear();
  const yearGap = Math.max(0, currentYear - year);

  if (paper?.type === TEST_PAPER_TYPES.MTP) return "Hard";
  if (paper?.type === TEST_PAPER_TYPES.RTP) return "Medium";
  if (paper?.type === TEST_PAPER_TYPES.OTHER || paper?.type === TEST_PAPER_TYPES.OTHERS) {
    return "Easy";
  }

  if (yearGap <= 2) return "Hard";
  if (yearGap <= 5) return "Medium";
  return "Easy";
};

const enrichPaper = (paper, subjectMap, chapterMapBySubject) => {
  const subject = subjectMap[paper.subjectId] || null;
  const chapterMap = chapterMapBySubject[paper.subjectId] || {};
  const chapter = paper.chapterId ? chapterMap[paper.chapterId] || null : null;
  const normalizedType = normalizePaperTypeValue(paper);

  return {
    ...paper,
    type: normalizedType,
    paperType: normalizedType,
    subjectName: subject?.name || "Unknown Subject",
    subjectCode: subject?.code || "SUB",
    chapterName: chapter?.title || "Full Syllabus",
    typeLabel: TEST_PAPER_TYPE_META[normalizedType]?.shortLabel || "OTHER",
    difficulty: getPaperDifficulty(paper),
  };
};

const validateAndNormalizePayload = (payload, { allowPartial = false } = {}) => {
  const subjectId = normalizeText(payload?.subjectId);
  const scope = normalizeScope(payload?.scope);
  const chapterId = normalizeText(payload?.chapterId);
  const title = normalizeText(payload?.title);
  const pdfUrl = normalizeUrl(payload?.pdfUrl);
  const type = normalizePaperType(payload?.paperType || payload?.type);
  const year = normalizeYear(payload?.year);
  const pdfFileName = normalizeText(payload?.pdfFileName);
  const pdfFileSize = Number(payload?.pdfFileSize);
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

  if (type === TEST_PAPER_TYPES.PYC || (!allowPartial && !Object.prototype.hasOwnProperty.call(payload || {}, "year"))) {
    if (!Number.isFinite(year) || year < min || year > max) {
      throw new Error(`Year should be between ${min} and ${max}.`);
    }
  } else if (
    Object.prototype.hasOwnProperty.call(payload || {}, "year") &&
    Number.isFinite(year) &&
    (year < min || year > max)
  ) {
    throw new Error(`Year should be between ${min} and ${max}.`);
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
    paperType: type,
    year: Number.isFinite(year) ? year : new Date().getFullYear(),
    title,
    pdfUrl,
    pdfFileName: pdfFileName || null,
    pdfFileSize: Number.isFinite(pdfFileSize) ? Math.max(Math.trunc(pdfFileSize), 0) : 0,
  };
};

export const testPaperService = {
  getAll: async (filters = {}) => {
    const response = await testPaperService.listPapersForAdmin(filters);
    return response.items || [];
  },

  getById: async (paperId) => testPaperService.getPaperByIdForAdmin(paperId),

  create: async (payload) => testPaperService.createPaper(payload),

  update: async (paperId, payload) => testPaperService.updatePaper(paperId, payload),

  delete: async (paperId) => testPaperService.deletePaper(paperId),

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
      const paperType = normalizeText(filters.paperType).toUpperCase();
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
          const normalizedType = normalizePaperTypeValue(paper);
          if (type && normalizedType !== normalizePaperType(type)) return false;
          if (paperType && normalizedType !== normalizePaperType(paperType)) return false;
          if (year && String(paper.year) !== year) return false;

          if (search) {
            const haystack = [
              paper.title,
              paper.subjectName,
              paper.chapterName,
              paper.type,
              paper.paperType,
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
        type: normalized.type,
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
        type: normalized.type,
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

  uploadPaperFile: async (file, options = {}) => {
    validateUploadFile(file);

    const onProgress = typeof options.onProgress === "function" ? options.onProgress : null;

    if (UPLOAD_ENDPOINT) {
      const formData = new FormData();
      formData.append("file", file);

      try {
        const response = await infrastructureApiClient.post(UPLOAD_ENDPOINT, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          onUploadProgress: (event) => {
            if (!onProgress || !event.total) return;
            const progress = Math.min(Math.round((event.loaded * 100) / event.total), 100);
            onProgress(progress);
          },
        });

        const uploadedUrl = normalizeUrl(
          response?.data?.url ||
            response?.data?.fileUrl ||
            response?.data?.secureUrl ||
            response?.data?.location
        );

        if (!isValidHttpUrl(uploadedUrl)) {
          throw new Error("Upload endpoint did not return a valid file URL.");
        }

        onProgress?.(100);

        return {
          url: uploadedUrl,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type || "application/pdf",
          provider: "backend",
        };
      } catch (uploadError) {
        throw new Error(uploadError?.message || "PDF upload failed. Please try again.");
      }
    }

    const checkpoints = [14, 32, 48, 67, 82, 96, 100];
    for (const checkpoint of checkpoints) {
      await delay(90);
      onProgress?.(checkpoint);
    }

    const encodedFileName = encodeURIComponent(file.name.toLowerCase().replace(/\s+/g, "-"));
    const mockUrl = `${MOCK_UPLOAD_FALLBACK_URL}?file=${encodedFileName}&size=${file.size}`;

    return {
      url: mockUrl,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type || "application/pdf",
      provider: "mock-storage",
    };
  },

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

    const unsubscribeCatalog = catalogStore.subscribe((state, previousState) => {
      if (state.version === previousState.version) {
        return;
      }

      callback();
    });

    window.addEventListener(CHANGE_EVENT_NAME, handleCustomEvent);
    window.addEventListener("storage", handleStorageEvent);

    return () => {
      window.removeEventListener(CHANGE_EVENT_NAME, handleCustomEvent);
      window.removeEventListener("storage", handleStorageEvent);
      unsubscribeCatalog?.();
    };
  },
};
