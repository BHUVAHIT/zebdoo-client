import { create } from "zustand";
import { catalogStore, readCatalogDb, updateCatalogDb } from "./catalogStore";

const LEGACY_QUESTION_BANK_STORAGE_KEY = "zebdoo:question-bank:v1";

const QUESTION_BANK_TEST_PREFIX = "qb-test";

export const QUESTION_DIFFICULTY_OPTIONS = Object.freeze([
  { label: "Easy", value: "Easy" },
  { label: "Medium", value: "Medium" },
  { label: "Hard", value: "Hard" },
]);

const DIFFICULTY_LOOKUP = QUESTION_DIFFICULTY_OPTIONS.reduce((acc, item) => {
  acc[String(item.value || "").trim().toLowerCase()] = item.value;
  return acc;
}, {});

const normalizeText = (value, fallback = "") => {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
};

const normalizeLookupKey = (value) => String(value || "").trim().toLowerCase();

const normalizeDifficulty = (value) => {
  const key = String(value || "").trim().toLowerCase();
  return DIFFICULTY_LOOKUP[key] || "Medium";
};

const normalizeDifficultyTag = (value) => normalizeDifficulty(value).toUpperCase();

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

const createQuestionBankTestId = () => {
  const stamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 7);
  return `${QUESTION_BANK_TEST_PREFIX}-${stamp}-${random}`;
};

const toOptionMap = (value) => {
  const source = Array.isArray(value) ? value : [];

  return source.reduce((acc, item) => {
    const id = normalizeText(item?.id).toUpperCase();
    if (!id) return acc;

    acc[id] = normalizeText(item?.text);
    return acc;
  }, {});
};

const isActive = (status) => String(status || "ACTIVE").toUpperCase() !== "INACTIVE";

const isPublished = (workflowStatus) =>
  String(workflowStatus || "PUBLISHED").toUpperCase() === "PUBLISHED";

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

const buildCatalogQuestions = () => {
  const db = readCatalogDb();
  const subjects = Array.isArray(db?.subjects) ? db.subjects : [];
  const chapters = Array.isArray(db?.chapters) ? db.chapters : [];
  const tests = Array.isArray(db?.tests) ? db.tests : [];
  const questions = Array.isArray(db?.questions) ? db.questions : [];

  const activeSubjectsById = subjects.reduce((acc, item) => {
    const id = normalizeText(item.id);
    if (!id || !isActive(item.status)) return acc;

    acc[id] = {
      id,
      name: normalizeText(item.name, "Subject"),
      code: normalizeText(item.code),
    };

    return acc;
  }, {});

  const activeChaptersById = chapters.reduce((acc, item) => {
    const id = normalizeText(item.id);
    const subjectId = normalizeText(item.subjectId);

    if (!id || !subjectId || !isActive(item.status) || !activeSubjectsById[subjectId]) {
      return acc;
    }

    acc[id] = {
      id,
      subjectId,
      name: normalizeText(item.title || item.name, "Chapter"),
    };

    return acc;
  }, {});

  const visibleTestsById = tests.reduce((acc, item) => {
    const id = normalizeText(item.id);
    const subjectId = normalizeText(item.subjectId);
    const chapterId = normalizeText(item.chapterId);

    if (
      !id ||
      !subjectId ||
      !chapterId ||
      !isActive(item.status) ||
      !isPublished(item.workflowStatus) ||
      !activeSubjectsById[subjectId] ||
      !activeChaptersById[chapterId]
    ) {
      return acc;
    }

    acc[id] = {
      id,
      subjectId,
      chapterId,
      difficulty: normalizeDifficulty(item.difficulty),
      title: normalizeText(item.title, "Test"),
    };

    return acc;
  }, {});

  return questions
    .map((item) => {
      const id = normalizeText(item.id);
      const testId = normalizeText(item.testId);
      const test = visibleTestsById[testId];

      if (!id || !test || !isActive(item.status) || !isPublished(item.workflowStatus)) {
        return null;
      }

      const subject = activeSubjectsById[test.subjectId];
      const chapter = activeChaptersById[test.chapterId];
      if (!subject || !chapter) {
        return null;
      }

      const optionMap = toOptionMap(item.options);

      return {
        id,
        subjectId: subject.id,
        subjectName: subject.name,
        subjectCode: subject.code || "",
        chapterId: chapter.id,
        chapterName: chapter.name,
        testTitle: test.title,
        difficulty: test.difficulty,
        question: normalizeText(item.stem || item.question),
        options: [
          optionMap.A || "",
          optionMap.B || "",
          optionMap.C || "",
          optionMap.D || "",
        ],
        correctAnswer: normalizeAnswer(item.correctOptionId || item.correctAnswer),
        tags: Array.isArray(item.tags)
          ? item.tags.map((tag) => normalizeText(tag)).filter(Boolean)
          : [],
        createdAt: normalizeText(item.createdAt, new Date().toISOString()),
        updatedAt: normalizeText(item.updatedAt || item.createdAt, new Date().toISOString()),
      };
    })
    .filter((item) => item && item.question);
};

const parseLegacyStoredState = (rawValue) => {
  if (!rawValue) return [];

  try {
    const lookup = buildCatalogLookup();
    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => normalizeQuestion(item, lookup))
      .filter((item) => item.question && item.options.every((option) => option));
  } catch {
    return [];
  }
};

const readLegacyCustomQuestions = () => {
  if (typeof window === "undefined") {
    return [];
  }

  return parseLegacyStoredState(window.localStorage.getItem(LEGACY_QUESTION_BANK_STORAGE_KEY));
};

const clearLegacyCustomQuestions = () => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LEGACY_QUESTION_BANK_STORAGE_KEY);
};

const resolveQuestionBankTest = ({ db, subjectId, chapterId, difficulty }) => {
  const safeSubjectId = normalizeText(subjectId);
  const safeChapterId = normalizeText(chapterId);
  const safeDifficulty = normalizeDifficulty(difficulty);

  const existingTest = (Array.isArray(db.tests) ? db.tests : []).find(
    (item) =>
      normalizeText(item.subjectId) === safeSubjectId &&
      normalizeText(item.chapterId) === safeChapterId &&
      normalizeDifficulty(item.difficulty) === safeDifficulty &&
      isActive(item.status) &&
      isPublished(item.workflowStatus)
  );

  if (existingTest) {
    return normalizeText(existingTest.id);
  }

  const subject = (Array.isArray(db.subjects) ? db.subjects : []).find(
    (item) => normalizeText(item.id) === safeSubjectId
  );
  const chapter = (Array.isArray(db.chapters) ? db.chapters : []).find(
    (item) => normalizeText(item.id) === safeChapterId
  );

  const createdTestId = createQuestionBankTestId();
  const nowIso = new Date().toISOString();
  const durationMinutesMap = {
    Easy: 30,
    Medium: 40,
    Hard: 55,
  };

  db.tests = [
    {
      id: createdTestId,
      subjectId: safeSubjectId,
      chapterId: safeChapterId,
      title: `${normalizeText(subject?.name, "Subject")} ${normalizeText(chapter?.title || chapter?.name, "Chapter")} ${safeDifficulty} Question Bank`,
      difficulty: normalizeDifficultyTag(safeDifficulty),
      durationMinutes: durationMinutesMap[safeDifficulty] || 40,
      status: "ACTIVE",
      workflowStatus: "PUBLISHED",
      mixStrategy: "MANUAL",
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    ...(Array.isArray(db.tests) ? db.tests : []),
  ];

  return createdTestId;
};

const toCatalogQuestionEntity = ({ id, testId, question }) => {
  const nowIso = new Date().toISOString();

  return {
    id: normalizeText(id, createQuestionId()),
    testId: normalizeText(testId),
    stem: normalizeText(question.question),
    options: ["A", "B", "C", "D"].map((label, index) => ({
      id: label,
      text: String(question.options[index] || "").trim(),
    })),
    correctOptionId: normalizeAnswer(question.correctAnswer),
    solution: "",
    tags: Array.isArray(question.tags) ? question.tags : [],
    difficultyTag: normalizeDifficultyTag(question.difficulty),
    examRelevance: "MEDIUM",
    workflowStatus: "PUBLISHED",
    status: "ACTIVE",
    createdAt: normalizeText(question.createdAt, nowIso),
    updatedAt: nowIso,
  };
};

const findQuestionById = (questions, questionId) => {
  const safeId = normalizeText(questionId);
  return (Array.isArray(questions) ? questions : []).find(
    (item) => normalizeText(item.id) === safeId
  );
};

const migrateLegacyCustomQuestionsToCatalog = () => {
  const legacyQuestions = readLegacyCustomQuestions();
  if (!legacyQuestions.length) {
    return false;
  }

  updateCatalogDb((rawDb) => {
    const nextDb = {
      ...rawDb,
      tests: Array.isArray(rawDb.tests) ? [...rawDb.tests] : [],
      questions: Array.isArray(rawDb.questions) ? [...rawDb.questions] : [],
    };

    legacyQuestions.forEach((legacyQuestion) => {
      const safeQuestion = normalizeQuestion(legacyQuestion);

      const subjectExists = nextDb.subjects?.some(
        (item) => normalizeText(item.id) === safeQuestion.subjectId
      );
      const chapterExists = nextDb.chapters?.some(
        (item) => normalizeText(item.id) === safeQuestion.chapterId
      );

      if (!subjectExists || !chapterExists) {
        return;
      }

      const testId = resolveQuestionBankTest({
        db: nextDb,
        subjectId: safeQuestion.subjectId,
        chapterId: safeQuestion.chapterId,
        difficulty: safeQuestion.difficulty,
      });

      const existing = findQuestionById(nextDb.questions, safeQuestion.id);
      const nextEntity = toCatalogQuestionEntity({
        id: existing?.id || safeQuestion.id,
        testId,
        question: {
          ...safeQuestion,
          createdAt: existing?.createdAt || safeQuestion.createdAt,
        },
      });

      nextDb.questions = [
        ...nextDb.questions.filter(
          (item) => normalizeText(item.id) !== normalizeText(nextEntity.id)
        ),
        nextEntity,
      ];
    });

    return nextDb;
  });

  clearLegacyCustomQuestions();
  return true;
};

let hasStorageSyncBinding = false;
let hasCatalogSyncBinding = false;
let hasLegacyMigrationCheck = false;

const ensureLegacyMigration = () => {
  if (hasLegacyMigrationCheck) return false;
  hasLegacyMigrationCheck = true;
  return migrateLegacyCustomQuestionsToCatalog();
};

let lastVersionIssued = 0;

const nextVersion = () => {
  const next = Date.now();
  lastVersionIssued = next > lastVersionIssued ? next : lastVersionIssued + 1;
  return lastVersionIssued;
};

const syncQuestionsFromCatalog = () => buildCatalogQuestions();

export const questionBankStore = create((set) => ({
  questions: syncQuestionsFromCatalog(),
  version: nextVersion(),

  addQuestion: (payload) => {
    const safeQuestion = normalizeQuestion(payload);
    let createdQuestionId = "";

    updateCatalogDb((rawDb) => {
      const nextDb = {
        ...rawDb,
        tests: Array.isArray(rawDb.tests) ? [...rawDb.tests] : [],
        questions: Array.isArray(rawDb.questions) ? [...rawDb.questions] : [],
      };

      const testId = resolveQuestionBankTest({
        db: nextDb,
        subjectId: safeQuestion.subjectId,
        chapterId: safeQuestion.chapterId,
        difficulty: safeQuestion.difficulty,
      });

      const entity = toCatalogQuestionEntity({
        id: createQuestionId(),
        testId,
        question: safeQuestion,
      });

      createdQuestionId = entity.id;
      nextDb.questions = [entity, ...nextDb.questions];

      return nextDb;
    });

    const nextQuestions = syncQuestionsFromCatalog();
    const createdQuestion = nextQuestions.find((item) => item.id === createdQuestionId) || null;

    set({
      questions: nextQuestions,
      version: nextVersion(),
    });

    return createdQuestion;
  },

  updateQuestion: (questionId, patch) => {
    const targetId = normalizeText(questionId);
    if (!targetId) return null;

    const currentQuestion = syncQuestionsFromCatalog().find((item) => item.id === targetId);
    if (!currentQuestion) return null;

    const nextQuestion = normalizeQuestion({
      ...currentQuestion,
      ...patch,
      id: currentQuestion.id,
      createdAt: currentQuestion.createdAt,
      updatedAt: new Date().toISOString(),
    });

    updateCatalogDb((rawDb) => {
      const nextDb = {
        ...rawDb,
        tests: Array.isArray(rawDb.tests) ? [...rawDb.tests] : [],
        questions: Array.isArray(rawDb.questions) ? [...rawDb.questions] : [],
      };

      const existingEntity = findQuestionById(nextDb.questions, targetId);
      if (!existingEntity) {
        return nextDb;
      }

      const testId = resolveQuestionBankTest({
        db: nextDb,
        subjectId: nextQuestion.subjectId,
        chapterId: nextQuestion.chapterId,
        difficulty: nextQuestion.difficulty,
      });

      const updatedEntity = toCatalogQuestionEntity({
        id: existingEntity.id,
        testId,
        question: {
          ...nextQuestion,
          createdAt: existingEntity.createdAt || nextQuestion.createdAt,
        },
      });

      nextDb.questions = nextDb.questions.map((item) =>
        normalizeText(item.id) === targetId ? updatedEntity : item
      );

      return nextDb;
    });

    const refreshedQuestions = syncQuestionsFromCatalog();
    const updatedQuestion = refreshedQuestions.find((item) => item.id === targetId) || null;

    set({
      questions: refreshedQuestions,
      version: nextVersion(),
    });

    return updatedQuestion;
  },

  deleteQuestion: (questionId) => {
    const targetId = normalizeText(questionId);
    if (!targetId) return false;

    let removed = false;

    updateCatalogDb((rawDb) => {
      const nextQuestions = (Array.isArray(rawDb.questions) ? rawDb.questions : []).filter(
        (item) => normalizeText(item.id) !== targetId
      );

      removed = nextQuestions.length !== (Array.isArray(rawDb.questions) ? rawDb.questions.length : 0);

      if (!removed) {
        return rawDb;
      }

      return {
        ...rawDb,
        questions: nextQuestions,
      };
    });

    if (!removed) {
      return false;
    }

    set({
      questions: syncQuestionsFromCatalog(),
      version: nextVersion(),
    });

    return true;
  },

  syncFromStorage: () => {
    ensureLegacyMigration();

    set({ questions: syncQuestionsFromCatalog(), version: nextVersion() });
  },

  syncFromCatalog: () => {
    set({ questions: syncQuestionsFromCatalog(), version: nextVersion() });
  },
}));

const ensureStorageSyncBinding = () => {
  if (hasStorageSyncBinding || typeof window === "undefined") return;

  const migrated = ensureLegacyMigration();
  if (migrated) {
    questionBankStore.getState().syncFromCatalog();
  }

  const onStorage = (event) => {
    if (event.storageArea !== window.localStorage) return;

    if (event.key === LEGACY_QUESTION_BANK_STORAGE_KEY) {
      questionBankStore.getState().syncFromStorage();
    }
  };

  window.addEventListener("storage", onStorage);
  hasStorageSyncBinding = true;
};

const ensureCatalogSyncBinding = () => {
  if (hasCatalogSyncBinding || typeof window === "undefined") return;

  catalogStore.subscribe((state, previousState) => {
    if (state.version === previousState.version) return;
    questionBankStore.getState().syncFromCatalog();
  });

  hasCatalogSyncBinding = true;
};

export const useQuestionBankStore = (selector) => {
  ensureStorageSyncBinding();
  ensureCatalogSyncBinding();
  return questionBankStore(selector);
};

export const getQuestionBankQuestions = () => {
  ensureStorageSyncBinding();
  ensureCatalogSyncBinding();
  const migrated = ensureLegacyMigration();

  if (migrated) {
    const refreshed = syncQuestionsFromCatalog();
    questionBankStore.setState({
      questions: refreshed,
      version: nextVersion(),
    });
    return refreshed;
  }

  const stateQuestions = questionBankStore.getState().questions;
  if (Array.isArray(stateQuestions) && stateQuestions.length > 0) {
    return stateQuestions;
  }

  return syncQuestionsFromCatalog();
};

export const getQuestionBankVersion = () => {
  ensureStorageSyncBinding();
  ensureCatalogSyncBinding();
  const migrated = ensureLegacyMigration();
  if (migrated) {
    questionBankStore.setState({
      questions: syncQuestionsFromCatalog(),
      version: nextVersion(),
    });
  }
  return questionBankStore.getState().version;
};
