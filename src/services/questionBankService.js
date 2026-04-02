import { mockCatalog, getQuestionSet } from "../test/services/mockData";
import {
  selectCatalogSnapshot,
  selectChaptersBySubjectId,
  selectQuestionsByTestId,
  selectSubjects,
  selectTestsByChapterId,
} from "../store/catalogSelectors";
import { TEST_STORAGE_KEYS } from "../utils/constants";
import { loadFromStorage, saveToStorage } from "../utils/helpers";

const normalize = (value) => String(value || "").trim().toLowerCase();

const normalizeId = (value) => String(value || "").trim();

const normalizeDifficulty = (value) => String(value || "").trim().toLowerCase();

const BASE_DIFFICULTIES = mockCatalog.difficulties.map((item) => ({
  ...item,
  id: normalizeDifficulty(item.id),
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

const extractOptionLabel = (question, optionId) => {
  const option = (question.options || []).find(
    (item) => normalizeId(item.id).toUpperCase() === normalizeId(optionId).toUpperCase()
  );
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

const buildFallbackQuestionBank = () => {
  const rows = [];

  mockCatalog.subjects.forEach((subject) => {
    const chapters = mockCatalog.chaptersBySubject[subject.id] || [];

    chapters.forEach((chapter) => {
      mockCatalog.difficulties.forEach((difficulty) => {
        const set = getQuestionSet({
          subjectId: subject.id,
          chapterId: chapter.id,
          difficultyLevel: difficulty.id,
        });

        set.forEach((question) => {
          const normalizedQuestion = {
            ...question,
            options: (question.options || []).map((option) => ({
              ...option,
              id: normalizeId(option.id).toUpperCase(),
            })),
            correctAnswer: normalizeId(question.correctAnswer).toUpperCase(),
          };

          rows.push({
            ...normalizedQuestion,
            subjectId: subject.id,
            chapterId: chapter.id,
            difficultyId: normalizeDifficulty(difficulty.id),
            subjectName: subject.name,
            chapterName: chapter.name,
            difficultyLabel: difficulty.label,
            correctAnswerText: extractOptionLabel(
              normalizedQuestion,
              normalizedQuestion.correctAnswer
            ),
          });
        });
      });
    });
  });

  return rows;
};

const FALLBACK_QUESTION_BANK = buildQuestionBankPayload({
  subjects: mockCatalog.subjects,
  difficulties: BASE_DIFFICULTIES,
  chaptersBySubject: mockCatalog.chaptersBySubject,
  rows: buildFallbackQuestionBank().sort((left, right) =>
    left.question.localeCompare(right.question)
  ),
});

let questionBankCache = {
  version: -1,
  payload: null,
};

const buildAdminQuestionBank = (catalogSnapshot = selectCatalogSnapshot()) => {
  const entities = catalogSnapshot.entities || {};

  const activeSubjects = selectSubjects({
    activeOnly: true,
    snapshot: catalogSnapshot,
  });

  const rows = [];
  const chapterIdsBySubject = {};

  activeSubjects.forEach((subject) => {
    const subjectId = normalizeId(subject.id);
    chapterIdsBySubject[subjectId] = new Set();

    const chapters = selectChaptersBySubjectId(subjectId, {
      activeOnly: true,
      requireActiveSubject: true,
      snapshot: catalogSnapshot,
    });

    chapters.forEach((chapter) => {
      const chapterId = normalizeId(chapter.id);
      chapterIdsBySubject[subjectId].add(chapterId);

      const tests = selectTestsByChapterId(chapterId, {
        activeOnly: true,
        publishedOnly: true,
        requireActiveChapter: true,
        requireActiveSubject: true,
        snapshot: catalogSnapshot,
      });

      tests.forEach((test) => {
        const difficultyId = normalizeDifficulty(test.difficulty);
        const testQuestions = selectQuestionsByTestId(test.id, {
          activeOnly: true,
          publishedOnly: true,
          requireActiveTest: true,
          snapshot: catalogSnapshot,
        });
        if (!testQuestions.length) return;

        testQuestions.forEach((question) => {
          const normalizedOptions = (question.options || []).map((option) => ({
            ...option,
            id: normalizeId(option.id).toUpperCase(),
          }));
          const correctAnswer = normalizeId(question.correctOptionId || "A").toUpperCase();
          const normalizedQuestion = {
            id: normalizeId(question.id),
            question: String(question.stem || ""),
            options: normalizedOptions,
            correctAnswer,
            explanation: String(question.solution || "").trim(),
          };

          if (!normalizedQuestion.question) {
            return;
          }

          rows.push({
            ...normalizedQuestion,
            subjectId,
            chapterId,
            difficultyId,
            subjectName: String(subject.name || "Subject"),
            chapterName: String(chapter.title || "Chapter"),
            difficultyLabel:
              DIFFICULTY_LABEL_MAP[difficultyId] ||
              String(test.difficulty || "MEDIUM").toUpperCase(),
            correctAnswerText: extractOptionLabel(normalizedQuestion, correctAnswer),
          });
        });
      });
    });
  });

  const subjects = activeSubjects
    .filter((subject) => chapterIdsBySubject[normalizeId(subject.id)])
    .map((subject) => ({
      ...subject,
      chapterCount: chapterIdsBySubject[normalizeId(subject.id)]?.size || 0,
    }));

  const chaptersBySubject = Object.entries(chapterIdsBySubject).reduce(
    (acc, [subjectId, chapterIds]) => {
      acc[subjectId] = [...chapterIds]
        .map((chapterId) => entities.chaptersById?.[chapterId])
        .filter(Boolean)
        .map((chapter) => ({
          id: normalizeId(chapter.id),
          name: String(chapter.title || "Chapter"),
          summary: `Question bank coverage for ${String(chapter.title || "this chapter")}.`,
        }));
      return acc;
    },
    {}
  );

  return buildQuestionBankPayload({
    subjects,
    difficulties: BASE_DIFFICULTIES,
    chaptersBySubject,
    rows: rows.sort((left, right) => left.question.localeCompare(right.question)),
  });
};

const getQuestionBankSource = () => {
  const catalogSnapshot = selectCatalogSnapshot();
  const version = Number(catalogSnapshot?.version || 0);

  if (questionBankCache.payload && questionBankCache.version === version) {
    return questionBankCache.payload;
  }

  const hasCatalogData =
    catalogSnapshot.db.subjects.length > 0 ||
    catalogSnapshot.db.chapters.length > 0 ||
    catalogSnapshot.db.tests.length > 0 ||
    catalogSnapshot.db.questions.length > 0;

  const adminQuestionBank = buildAdminQuestionBank(catalogSnapshot);
  const payload = hasCatalogData ? adminQuestionBank : FALLBACK_QUESTION_BANK;

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
