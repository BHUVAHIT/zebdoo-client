import { create } from "zustand";
import { readCatalogDb } from "./catalogStore";

const QUESTION_BANK_STORAGE_KEY = "zebdoo:question-bank:v1";

export const QUESTION_DIFFICULTY_OPTIONS = Object.freeze([
  { label: "Easy", value: "Easy" },
  { label: "Medium", value: "Medium" },
  { label: "Hard", value: "Hard" },
]);

const DIFFICULTY_LOOKUP = QUESTION_DIFFICULTY_OPTIONS.reduce((acc, item) => {
  acc[String(item.value || "").trim().toLowerCase()] = item.value;
  return acc;
}, {});

const DEFAULT_QUESTION_BANK_DATA = Object.freeze([
  {
    id: "qb-1",
    subjectId: "sub-1",
    subjectName: "Accounting",
    chapterId: "chap-1-1",
    chapterName: "Fundamentals Accounting",
    difficulty: "Easy",
    question: "Which accounting principle requires recording revenues when earned, not when cash is received?",
    options: [
      "Cash basis principle",
      "Accrual principle",
      "Conservatism principle",
      "Matching exception",
    ],
    correctAnswer: "B",
  },
  {
    id: "qb-2",
    subjectId: "sub-1",
    subjectName: "Accounting",
    chapterId: "chap-1-2",
    chapterName: "Advanced Concepts Accounting",
    difficulty: "Medium",
    question: "Under straight-line depreciation, which factor remains fixed across years?",
    options: [
      "Depreciation expense",
      "Asset carrying value",
      "Residual value estimate",
      "Tax liability",
    ],
    correctAnswer: "A",
  },
  {
    id: "qb-3",
    subjectId: "sub-2",
    subjectName: "Auditing",
    chapterId: "chap-2-1",
    chapterName: "Fundamentals Auditing",
    difficulty: "Hard",
    question: "Which audit evidence is generally considered most reliable?",
    options: [
      "Internally generated unaudited report",
      "Oral representation by management",
      "Evidence obtained directly by the auditor",
      "Photocopy without confirmation",
    ],
    correctAnswer: "C",
  },
  {
    id: "qb-4",
    subjectId: "sub-3",
    subjectName: "Taxation",
    chapterId: "chap-3-1",
    chapterName: "Fundamentals Taxation",
    difficulty: "Easy",
    question: "What does a tax rebate primarily do for an eligible taxpayer?",
    options: [
      "Increases gross income",
      "Reduces tax liability",
      "Defers filing obligation",
      "Removes all deductions",
    ],
    correctAnswer: "B",
  },
  {
    id: "qb-5",
    subjectId: "sub-4",
    subjectName: "Corporate Law",
    chapterId: "chap-4-1",
    chapterName: "Fundamentals Corporate Law",
    difficulty: "Medium",
    question: "Which document states the scope and object of a company?",
    options: [
      "Articles of Association",
      "Prospectus",
      "Memorandum of Association",
      "Board Resolution",
    ],
    correctAnswer: "C",
  },
  {
    id: "qb-6",
    subjectId: "sub-5",
    subjectName: "Financial Management",
    chapterId: "chap-5-1",
    chapterName: "Fundamentals Financial Management",
    difficulty: "Hard",
    question: "Which method explicitly considers time value of money and cash flow timing?",
    options: [
      "Payback period",
      "Accounting rate of return",
      "Net present value",
      "Simple profitability ratio",
    ],
    correctAnswer: "C",
  },
]);

const normalizeText = (value, fallback = "") => {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
};

const normalizeLookupKey = (value) => String(value || "").trim().toLowerCase();

const buildCatalogLookup = () => {
  const db = readCatalogDb();
  const subjects = Array.isArray(db?.subjects) ? db.subjects : [];
  const chapters = Array.isArray(db?.chapters) ? db.chapters : [];

  const activeSubjects = subjects.filter(
    (item) => String(item.status || "ACTIVE").toUpperCase() !== "INACTIVE"
  );

  const subjectById = activeSubjects.reduce((acc, item) => {
    const id = normalizeText(item.id);
    if (!id) return acc;

    acc[id] = {
      id,
      name: normalizeText(item.name, "Subject"),
    };

    return acc;
  }, {});

  const subjectIdByName = Object.values(subjectById).reduce((acc, item) => {
    acc[normalizeLookupKey(item.name)] = item.id;
    return acc;
  }, {});

  const chapterById = {};
  const chapterIdBySubjectAndName = {};
  const chapterIdByName = {};

  chapters
    .filter((item) => String(item.status || "ACTIVE").toUpperCase() !== "INACTIVE")
    .forEach((item) => {
      const id = normalizeText(item.id);
      const subjectId = normalizeText(item.subjectId);
      const name = normalizeText(item.title || item.name, "Chapter");

      if (!id || !subjectId || !subjectById[subjectId]) {
        return;
      }

      chapterById[id] = {
        id,
        subjectId,
        name,
      };

      chapterIdBySubjectAndName[`${subjectId}::${normalizeLookupKey(name)}`] = id;
      if (!chapterIdByName[normalizeLookupKey(name)]) {
        chapterIdByName[normalizeLookupKey(name)] = id;
      }
    });

  return {
    subjectById,
    subjectIdByName,
    chapterById,
    chapterIdBySubjectAndName,
    chapterIdByName,
  };
};

const normalizeDifficulty = (value) => {
  const key = String(value || "").trim().toLowerCase();
  return DIFFICULTY_LOOKUP[key] || "Medium";
};

const normalizeAnswer = (value) => {
  const candidate = String(value || "A").trim().toUpperCase();
  return ["A", "B", "C", "D"].includes(candidate) ? candidate : "A";
};

const normalizeOptions = (value) => {
  const incoming = Array.isArray(value) ? value : [];
  const next = ["", "", "", ""];

  for (let index = 0; index < 4; index += 1) {
    const current = incoming[index];
    if (typeof current === "string") {
      next[index] = current.trim();
      continue;
    }

    if (current && typeof current === "object") {
      next[index] = String(current.text || "").trim();
    }
  }

  return next;
};

const createFallbackId = (prefix, value) => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized ? `${prefix}-${normalized}` : `${prefix}-${Date.now().toString(36)}`;
};

const createQuestionId = () => {
  const stamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `qb-${stamp}-${random}`;
};

const normalizeQuestion = (item = {}, lookup = buildCatalogLookup()) => {
  const fallbackSubjectName = normalizeText(item.subjectName || item.subject, "General");
  let subjectId = normalizeText(item.subjectId);
  if (!subjectId) {
    subjectId = lookup.subjectIdByName[normalizeLookupKey(fallbackSubjectName)] || "";
  }

  const subjectName =
    lookup.subjectById[subjectId]?.name || fallbackSubjectName || "General";

  const fallbackChapterName = normalizeText(item.chapterName || item.chapter, "General");
  let chapterId = normalizeText(item.chapterId);
  if (!chapterId && subjectId) {
    chapterId =
      lookup.chapterIdBySubjectAndName[
        `${subjectId}::${normalizeLookupKey(fallbackChapterName)}`
      ] || "";
  }
  if (!chapterId) {
    chapterId = lookup.chapterIdByName[normalizeLookupKey(fallbackChapterName)] || "";
  }

  const chapterEntity = lookup.chapterById[chapterId];
  const safeSubjectId = chapterEntity?.subjectId || subjectId;
  const safeSubjectName =
    lookup.subjectById[safeSubjectId]?.name || subjectName || "General";
  const safeChapterName = chapterEntity?.name || fallbackChapterName || "General";

  return {
    id: normalizeText(item.id, createQuestionId()),
    subjectId: normalizeText(safeSubjectId, createFallbackId("subject", safeSubjectName)),
    subjectName: safeSubjectName,
    chapterId: normalizeText(
      chapterId,
      createFallbackId(
        "chapter",
        `${normalizeText(safeSubjectId)}-${normalizeText(safeChapterName)}`
      )
    ),
    chapterName: safeChapterName,
    difficulty: normalizeDifficulty(item.difficulty),
    question: normalizeText(item.question),
    options: normalizeOptions(item.options),
    correctAnswer: normalizeAnswer(item.correctAnswer),
    createdAt: normalizeText(item.createdAt, new Date().toISOString()),
    updatedAt: normalizeText(item.updatedAt, new Date().toISOString()),
  };
};

const parseStoredState = (rawValue) => {
  if (!rawValue) return null;

  try {
    const lookup = buildCatalogLookup();
    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) return null;

    return parsed
      .map((item) => normalizeQuestion(item, lookup))
      .filter((item) => item.question && item.options.every((option) => option));
  } catch {
    return null;
  }
};

const persistState = (questions) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(QUESTION_BANK_STORAGE_KEY, JSON.stringify(questions));
};

const readInitialState = () => {
  const lookup = buildCatalogLookup();
  const fallback = DEFAULT_QUESTION_BANK_DATA.map((item) => normalizeQuestion(item, lookup));

  if (typeof window === "undefined") {
    return fallback;
  }

  const stored = parseStoredState(window.localStorage.getItem(QUESTION_BANK_STORAGE_KEY));
  if (stored && stored.length > 0) {
    return stored;
  }

  persistState(fallback);
  return fallback;
};

let hasStorageSyncBinding = false;

let lastVersionIssued = 0;

const nextVersion = () => {
  const next = Date.now();
  lastVersionIssued = next > lastVersionIssued ? next : lastVersionIssued + 1;
  return lastVersionIssued;
};

export const questionBankStore = create((set, get) => ({
  questions: readInitialState(),
  version: nextVersion(),

  addQuestion: (payload) => {
    const lookup = buildCatalogLookup();
    const nextQuestion = normalizeQuestion({
      ...payload,
      id: createQuestionId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }, lookup);

    const nextQuestions = [nextQuestion, ...get().questions];
    persistState(nextQuestions);
    set({ questions: nextQuestions, version: nextVersion() });
    return nextQuestion;
  },

  updateQuestion: (questionId, patch) => {
    const targetId = normalizeText(questionId);
    if (!targetId) return null;
    const lookup = buildCatalogLookup();

    let updatedQuestion = null;

    const nextQuestions = get().questions.map((question) => {
      if (question.id !== targetId) return question;

      updatedQuestion = normalizeQuestion({
        ...question,
        ...patch,
        id: question.id,
        createdAt: question.createdAt,
        updatedAt: new Date().toISOString(),
      }, lookup);

      return updatedQuestion;
    });

    if (!updatedQuestion) return null;

    persistState(nextQuestions);
    set({ questions: nextQuestions, version: nextVersion() });
    return updatedQuestion;
  },

  deleteQuestion: (questionId) => {
    const targetId = normalizeText(questionId);
    if (!targetId) return false;

    const current = get().questions;
    const nextQuestions = current.filter((item) => item.id !== targetId);

    if (nextQuestions.length === current.length) {
      return false;
    }

    persistState(nextQuestions);
    set({ questions: nextQuestions, version: nextVersion() });
    return true;
  },

  syncFromStorage: () => {
    const next = readInitialState();
    set({ questions: next, version: nextVersion() });
  },
}));

const ensureStorageSyncBinding = () => {
  if (hasStorageSyncBinding || typeof window === "undefined") return;

  const onStorage = (event) => {
    if (event.storageArea !== window.localStorage) return;
    if (event.key !== QUESTION_BANK_STORAGE_KEY) return;
    questionBankStore.getState().syncFromStorage();
  };

  window.addEventListener("storage", onStorage);
  hasStorageSyncBinding = true;
};

export const useQuestionBankStore = (selector) => {
  ensureStorageSyncBinding();
  return questionBankStore(selector);
};

export const getQuestionBankQuestions = () => {
  ensureStorageSyncBinding();
  return questionBankStore.getState().questions;
};

export const getQuestionBankVersion = () => {
  ensureStorageSyncBinding();
  return questionBankStore.getState().version;
};
