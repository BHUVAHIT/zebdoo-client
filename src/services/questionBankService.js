import {
  getQuestionBankQuestions,
  getQuestionBankVersion,
  QUESTION_DIFFICULTY_OPTIONS,
} from "../store/questionBankStore";
import { TEST_STORAGE_KEYS } from "../utils/constants";
import { loadFromStorage, saveToStorage } from "../utils/helpers";

const normalize = (value) => String(value || "").trim().toLowerCase();

const normalizeId = (value) => String(value || "").trim();

const normalizeDifficulty = (value) => String(value || "").trim().toLowerCase();

const BASE_DIFFICULTIES = QUESTION_DIFFICULTY_OPTIONS.map((item) => ({
  id: normalizeDifficulty(item.value),
  label: item.label,
}));

const DIFFICULTY_LABEL_MAP = BASE_DIFFICULTIES.reduce((acc, item) => {
  acc[item.id] = item.label;
  return acc;
}, {});

const readJournal = () => {
  const raw = loadFromStorage(TEST_STORAGE_KEYS.QUESTION_JOURNAL, {});
  if (!raw || typeof raw !== "object") return {};
  return raw;
};

const writeJournal = (journal) => {
  saveToStorage(TEST_STORAGE_KEYS.QUESTION_JOURNAL, journal);
};

const extractOptionLabel = (options, optionId) => {
  const option = (options || []).find((item) => item.id === normalizeId(optionId).toUpperCase());
  return option?.text || "";
};

const buildSearchableText = (row) =>
  [
    row.question,
    row.subjectName,
    row.chapterName,
    row.difficultyLabel,
    row.correctAnswerText,
    row.explanation,
    ...(row.options || []).map((option) => option.text),
  ]
    .join(" ")
    .toLowerCase();

const dedupeRowsById = (rows = []) => {
  const seen = new Set();

  return rows.filter((row) => {
    const key = normalizeId(row?.id);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const toOptionList = (question = {}) => {
  const source = Array.isArray(question.options) ? question.options : [];

  return ["A", "B", "C", "D"].map((optionId, index) => ({
    id: optionId,
    text:
      typeof source[index] === "string"
        ? String(source[index] || "").trim()
        : String(source[index]?.text || "").trim(),
  }));
};

const createFallbackId = (prefix, value, index) => {
  const cleaned = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (cleaned) {
    return `${prefix}-${cleaned}`;
  }

  return `${prefix}-${index + 1}`;
};

const buildQuestionBankFromStore = () => {
  const questions = getQuestionBankQuestions();
  const subjectsById = {};
  const chaptersBySubject = {};

  const rows = questions.map((question, index) => {
    const subjectId = normalizeId(
      question.subjectId || createFallbackId("subject", question.subjectName || question.subject, index)
    );
    const subjectName =
      String(question.subjectName || question.subject || "General").trim() || "General";
    const chapterId = normalizeId(
      question.chapterId || createFallbackId("chapter", question.chapterName || question.chapter, index)
    );
    const chapterName =
      String(question.chapterName || question.chapter || "General").trim() || "General";

    subjectsById[subjectId] = {
      id: subjectId,
      name: subjectName,
    };

    chaptersBySubject[subjectId] = chaptersBySubject[subjectId] || {};
    chaptersBySubject[subjectId][chapterId] = {
      id: chapterId,
      name: chapterName,
      summary: `Question bank coverage for ${chapterName}.`,
    };

    const options = toOptionList(question);
    const correctAnswer = normalizeId(question.correctAnswer).toUpperCase();
    const difficultyId = normalizeDifficulty(question.difficulty);

    return {
      id: normalizeId(question.id),
      question: String(question.question || "").trim(),
      options,
      correctAnswer,
      explanation: "",
      subjectId,
      chapterId,
      difficultyId,
      subjectName,
      chapterName,
      difficultyLabel: DIFFICULTY_LABEL_MAP[difficultyId] || "Medium",
      correctAnswerText: extractOptionLabel(options, correctAnswer),
    };
  }).filter((row) => Boolean(row.question));

  const subjects = Object.values(subjectsById)
    .map((subject) => ({
      ...subject,
      chapterCount: Object.keys(chaptersBySubject[subject.id] || {}).length,
    }))
    .sort((left, right) => left.name.localeCompare(right.name));

  const normalizedChaptersBySubject = Object.entries(chaptersBySubject).reduce(
    (acc, [subjectId, chapters]) => {
      acc[subjectId] = Object.values(chapters).sort((left, right) =>
        left.name.localeCompare(right.name)
      );
      return acc;
    },
    {}
  );

  return buildQuestionBankPayload({
    subjects,
    difficulties: BASE_DIFFICULTIES,
    chaptersBySubject: normalizedChaptersBySubject,
    rows,
  });
};

const buildQuestionBankPayload = ({ subjects, difficulties, chaptersBySubject, rows }) => {
  const withSearch = rows.map((row) => ({
    ...row,
    searchableText: buildSearchableText(row),
  }));

  const indexes = {
    bySubjectId: {},
    byChapterId: {},
    byDifficultyId: {},
  };

  withSearch.forEach((row) => {
    const subjectId = normalizeId(row.subjectId);
    const chapterId = normalizeId(row.chapterId);
    const difficultyId = normalizeDifficulty(row.difficultyId);

    if (subjectId) {
      indexes.bySubjectId[subjectId] = indexes.bySubjectId[subjectId] || [];
      indexes.bySubjectId[subjectId].push(row);
    }

    if (chapterId) {
      indexes.byChapterId[chapterId] = indexes.byChapterId[chapterId] || [];
      indexes.byChapterId[chapterId].push(row);
    }

    if (difficultyId) {
      indexes.byDifficultyId[difficultyId] = indexes.byDifficultyId[difficultyId] || [];
      indexes.byDifficultyId[difficultyId].push(row);
    }
  });

  return {
    subjects,
    difficulties,
    chaptersBySubject,
    rows: withSearch,
    indexes,
  };
};

let questionBankCache = {
  version: -1,
  payload: null,
};

const getQuestionBankSource = () => {
  const version = Number(getQuestionBankVersion() || 0);

  if (questionBankCache.payload && questionBankCache.version === version) {
    return questionBankCache.payload;
  }

  const payload = buildQuestionBankFromStore();

  questionBankCache = {
    version,
    payload,
  };

  return payload;
};

const EMPTY_ENTRY = Object.freeze({
  isBookmarked: false,
  isLearned: false,
  note: "",
});

export const getQuestionBankFilters = () => ({
  subjects: getQuestionBankSource().subjects,
  difficulties: getQuestionBankSource().difficulties,
  chaptersBySubject: getQuestionBankSource().chaptersBySubject,
});

export const getQuestionBankRows = () => getQuestionBankSource().rows;

export const getQuestionBankJournal = () => readJournal();

const getCandidateRows = ({
  source,
  subjectId,
  chapterId,
  chapterIds,
  difficultyId,
}) => {
  const candidates = [];

  if (subjectId) {
    candidates.push(source.indexes.bySubjectId[subjectId] || []);
  }

  if (chapterId) {
    candidates.push(source.indexes.byChapterId[chapterId] || []);
  }

  if (difficultyId) {
    candidates.push(source.indexes.byDifficultyId[difficultyId] || []);
  }

  const chapterSet = new Set((Array.isArray(chapterIds) ? chapterIds : []).filter(Boolean));
  if (chapterSet.size > 0) {
    const chapterRows = dedupeRowsById(
      [...chapterSet].flatMap((nextChapterId) => source.indexes.byChapterId[nextChapterId] || [])
    );
    candidates.push(chapterRows);
  }

  if (!candidates.length) {
    return source.rows;
  }

  const nonEmptyCandidates = candidates.filter((rows) => rows.length > 0);
  if (!nonEmptyCandidates.length) {
    return [];
  }

  return nonEmptyCandidates.reduce((smallest, current) =>
    current.length < smallest.length ? current : smallest
  );
};

export const getQuestionBankItems = ({
  subjectId,
  chapterId,
  chapterIds,
  difficultyId,
  onlyBookmarked,
  onlyLearned,
  searchQuery,
  journal,
}) => {
  const activeJournal = journal && typeof journal === "object" ? journal : readJournal();
  const chapterFilterSet = new Set(
    (Array.isArray(chapterIds) ? chapterIds : []).filter(Boolean)
  );
  const normalizedSearch = normalize(searchQuery);
  const source = getQuestionBankSource();
  const questionRows = getCandidateRows({
    source,
    subjectId,
    chapterId,
    chapterIds,
    difficultyId,
  });

  return questionRows
    .filter((question) => {
      if (subjectId && question.subjectId !== subjectId) return false;

      if (chapterFilterSet.size > 0 && !chapterFilterSet.has(question.chapterId)) {
        return false;
      }

      if (chapterId && question.chapterId !== chapterId) return false;
      if (difficultyId && question.difficultyId !== difficultyId) return false;

      const entry = activeJournal[question.id] || EMPTY_ENTRY;
      if (onlyBookmarked && !entry.isBookmarked) return false;
      if (onlyLearned && !entry.isLearned) return false;

      if (normalizedSearch) {
        if (!String(question.searchableText || "").includes(normalizedSearch)) return false;
      }

      return true;
    })
    .map((question) => {
      const entry = activeJournal[question.id] || EMPTY_ENTRY;

      return {
        ...question,
        isBookmarked: Boolean(entry.isBookmarked),
        isLearned: Boolean(entry.isLearned),
        note: entry.note || "",
      };
    });
};

export const updateQuestionBankEntry = ({
  questionId,
  subjectId,
  chapterId,
  patch,
}) => {
  const key = String(questionId);
  const journal = readJournal();

  const current = journal[key] || {
    questionId: key,
    subjectId: normalize(subjectId),
    chapterId: normalize(chapterId),
    totalAttempts: 0,
    correctAttempts: 0,
    wrongAttempts: 0,
    averageTimeSeconds: 0,
    isBookmarked: false,
    isLearned: false,
    note: "",
    lastAttemptedAt: null,
  };

  journal[key] = {
    ...current,
    ...patch,
    note: String(patch?.note ?? current.note ?? "").trim(),
    updatedAt: new Date().toISOString(),
  };

  writeJournal(journal);
  return journal[key];
};
