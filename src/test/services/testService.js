import {
  getQuestionJournalSnapshot,
  getRevisionQuestionPool,
} from "../../services/learningAnalyticsService";
import {
  selectCatalogSnapshot,
  selectChaptersBySubjectId,
  selectQuestionsByTestId,
  selectSubjects,
  selectTestsByChapterId,
} from "../../store/catalogSelectors";
import { TEST_MODES } from "../../utils/constants";
import {
  DEFAULT_SMART_TEST_GOAL,
  getLegacyModeFromGoal,
  getSmartGoalProfile,
  normalizeSmartGoal,
  SMART_TEST_GOALS,
} from "../config/smartTestEngine";

const delay = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));
const randomDelay = () => 250 + Math.floor(Math.random() * 550);
const clone = (value) => JSON.parse(JSON.stringify(value));
const DIFFICULTY_IDS = ["easy", "medium", "hard"];
const OPTION_IDS = ["A", "B", "C", "D"];

const DIFFICULTY_CATALOG = Object.freeze([
  {
    id: "easy",
    label: "Easy",
    colorToken: "easy",
    questionCount: 25,
    durationSeconds: 18 * 60,
    detail: "Core conceptual questions with direct application.",
  },
  {
    id: "medium",
    label: "Medium",
    colorToken: "medium",
    questionCount: 30,
    durationSeconds: 24 * 60,
    detail: "Scenario-based and mixed conceptual-computation set.",
  },
  {
    id: "hard",
    label: "Hard",
    colorToken: "hard",
    questionCount: 35,
    durationSeconds: 30 * 60,
    detail: "Exam-level integrated problems and edge case treatment.",
  },
]);

const DIFFICULTY_META_MAP = DIFFICULTY_CATALOG.reduce((acc, item) => {
  acc[String(item.id || "").toLowerCase()] = item;
  return acc;
}, {});

let adminCatalogCache = {
  version: -1,
  value: null,
};

const withNetwork = async (resolver) => {
  await delay(randomDelay());
  return clone(resolver());
};

const chapterDifficultyKey = (subjectId, chapterId, difficultyId) =>
  `${String(subjectId)}::${String(chapterId)}::${String(difficultyId).toLowerCase()}`;

const normalizeDifficultyId = (value) => String(value || "").trim().toLowerCase();

const normalizeQuestionOptions = (options = []) => {
  const optionMap = options.reduce((acc, option) => {
    const id = String(option?.id || "").trim().toUpperCase();
    if (id) {
      acc[id] = String(option?.text || "").trim();
    }
    return acc;
  }, {});

  return OPTION_IDS.map((id) => ({
    id,
    text: optionMap[id] || "",
  }));
};

const getDifficultyMeta = (difficultyId) =>
  DIFFICULTY_META_MAP[String(difficultyId || "").toLowerCase()] || null;

const toShortCode = (name = "") => {
  const compact = String(name)
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!compact.length) return "SUB";

  if (compact.length === 1) {
    return compact[0].slice(0, 3).toUpperCase();
  }

  return compact
    .slice(0, 3)
    .map((token) => token[0])
    .join("")
    .toUpperCase();
};

const buildAdminCatalogSnapshot = (catalogSnapshot = selectCatalogSnapshot()) => {
  const activeSubjects = selectSubjects({
    activeOnly: true,
    snapshot: catalogSnapshot,
  });

  const subjects = activeSubjects.map((subject) => ({
    id: String(subject.id),
    name: String(subject.name || "Subject"),
    shortCode: toShortCode(subject.name),
    description:
      String(subject.description || "").trim() ||
      `Assessment stream for ${String(subject.name || "subject")}.`,
    chapterCount: 0,
  }));

  const subjectMap = subjects.reduce((acc, subject) => {
    acc[subject.id] = subject;
    return acc;
  }, {});

  const chaptersBySubject = {};
  const testsByChapterDifficulty = {};
  const testsById = {};
  const questionsByTest = {};

  activeSubjects.forEach((subject) => {
    const subjectId = String(subject.id);
    const chapters = selectChaptersBySubjectId(subjectId, {
      activeOnly: true,
      requireActiveSubject: true,
      snapshot: catalogSnapshot,
    });

    chaptersBySubject[subjectId] = chapters.map((chapter) => ({
      id: String(chapter.id),
      name: String(chapter.title || "Chapter"),
      summary: `Generated from published test sets in ${String(chapter.title || "this chapter")}.`,
      difficultyCount: 0,
    }));

    if (subjectMap[subjectId]) {
      subjectMap[subjectId].chapterCount = chaptersBySubject[subjectId].length;
    }

    const chapterMap = chaptersBySubject[subjectId].reduce((acc, chapter) => {
      acc[chapter.id] = chapter;
      return acc;
    }, {});

    chapters.forEach((chapter) => {
      const chapterId = String(chapter.id);
      const tests = selectTestsByChapterId(chapterId, {
        activeOnly: true,
        publishedOnly: true,
        requireActiveChapter: true,
        requireActiveSubject: true,
        snapshot: catalogSnapshot,
      });

      const chapterDifficultySet = new Set();

      tests.forEach((test) => {
        const difficultyId = normalizeDifficultyId(test.difficulty);
        if (!DIFFICULTY_IDS.includes(difficultyId)) {
          return;
        }

        const testId = String(test.id);
        testsById[testId] = {
          id: testId,
          title: String(test.title || "Test"),
          subjectId,
          chapterId,
          difficultyId,
        };
        const difficultyMeta = getDifficultyMeta(difficultyId);
        const fallbackQuestionCount = Number(difficultyMeta?.questionCount || 20);
        const fallbackDurationSeconds = Number(difficultyMeta?.durationSeconds || 20 * 60);

        chapterDifficultySet.add(difficultyId);

        const normalizedQuestions = selectQuestionsByTestId(test.id, {
          activeOnly: true,
          publishedOnly: true,
          requireActiveTest: true,
          snapshot: catalogSnapshot,
        })
          .map((item) => ({
            id: String(item.id),
            question: String(item.stem || ""),
            options: normalizeQuestionOptions(item.options),
            correctAnswer: String(item.correctOptionId || "A").trim().toUpperCase(),
            explanation: String(item.solution || "").trim(),
          }))
          .filter((item) => item.question);

        if (normalizedQuestions.length) {
          questionsByTest[testId] = normalizedQuestions;
        }

        const key = chapterDifficultyKey(subjectId, chapterId, difficultyId);
        const candidateQuestionCount = normalizedQuestions.length || fallbackQuestionCount;
        const candidateDuration =
          Math.max(Number(test.durationMinutes || 0), 0) * 60 || fallbackDurationSeconds;
        const current = testsByChapterDifficulty[key];

        const candidate = {
          testId,
          questionCount: candidateQuestionCount,
          durationSeconds: candidateDuration,
          actualQuestionCount: normalizedQuestions.length,
        };

        if (!current) {
          testsByChapterDifficulty[key] = candidate;
          return;
        }

        const currentHasAuthoredQuestions = Number(current.actualQuestionCount || 0) > 0;
        const candidateHasAuthoredQuestions = normalizedQuestions.length > 0;

        if (candidateHasAuthoredQuestions && !currentHasAuthoredQuestions) {
          testsByChapterDifficulty[key] = candidate;
          return;
        }

        if (
          candidateHasAuthoredQuestions === currentHasAuthoredQuestions &&
          candidateQuestionCount > Number(current.questionCount || 0)
        ) {
          testsByChapterDifficulty[key] = candidate;
        }
      });

      if (chapterMap[chapterId]) {
        chapterMap[chapterId].difficultyCount = chapterDifficultySet.size;
      }
    });
  });

  return {
    source: "admin",
    subjects,
    chaptersBySubject,
    difficulties: clone(DIFFICULTY_CATALOG),
    testsByChapterDifficulty,
    testsById,
    questionsByTest,
  };
};

const getCatalogSnapshot = async () => {
  // STATIC NOW → API LATER
  const catalogSnapshot = selectCatalogSnapshot();
  const version = Number(catalogSnapshot?.version || 0);

  if (adminCatalogCache.value && adminCatalogCache.version === version) {
    return adminCatalogCache.value;
  }

  const adminSnapshot = buildAdminCatalogSnapshot(catalogSnapshot);
  adminCatalogCache = {
    value: adminSnapshot,
    version,
  };

  return adminSnapshot;
};

const findSubject = (catalog, subjectId) =>
  (catalog.subjects || []).find((item) => item.id === String(subjectId));

const findChapter = (catalog, subjectId, chapterId) =>
  (catalog.chaptersBySubject[String(subjectId)] || []).find(
    (item) => item.id === String(chapterId)
  ) || null;

const findDifficulty = (catalog, difficultyId) =>
  (catalog.difficulties || []).find((item) => item.id === String(difficultyId));

const resolveDifficultyLevels = (catalog, { subjectId, chapterId } = {}) =>
  (catalog.difficulties || []).map((level) => {
    const bucket =
      subjectId && chapterId
        ? catalog.testsByChapterDifficulty[
            chapterDifficultyKey(subjectId, chapterId, level.id)
          ]
        : null;

    const isAvailable =
      !subjectId || !chapterId
        ? true
        : Number(bucket?.questionCount || 0) > 0 || catalog.source !== "admin";

    return {
      ...level,
      questionCount: Number(bucket?.questionCount || level.questionCount),
      durationSeconds: Number(bucket?.durationSeconds || level.durationSeconds),
      isAvailable,
    };
  });

const mapQuestionInsights = (questions, { subjectId, chapterId }) => {
  const journal = getQuestionJournalSnapshot();

  return questions.map((question) => {
    const insight = journal[question.id];
    if (!insight) {
      return {
        ...question,
        isBookmarked: false,
        note: "",
      };
    }

    if (insight.subjectId !== subjectId || insight.chapterId !== chapterId) {
      return {
        ...question,
        isBookmarked: false,
        note: "",
      };
    }

    return {
      ...question,
      isBookmarked: Boolean(insight.isBookmarked),
      note: insight.note || "",
    };
  });
};

const buildModeAwareQuestionSet = ({
  sourceQuestionSet,
  subjectId,
  chapterId,
  goalProfile,
  questionCount,
}) => {
  const fullSet = Array.isArray(sourceQuestionSet) ? sourceQuestionSet : [];

  const constrained = Number.isFinite(Number(questionCount))
    ? fullSet.slice(0, Math.max(Number(questionCount), 1))
    : fullSet;

  if (!goalProfile?.prioritizeWeakQuestions) {
    return constrained;
  }

  const revisionPoolIds = new Set(
    getRevisionQuestionPool({
      subjectId,
      chapterId,
      limit: constrained.length,
    })
  );

  const prioritized = constrained.filter((item) => revisionPoolIds.has(item.id));
  if (prioritized.length >= constrained.length) {
    return prioritized.slice(0, constrained.length);
  }

  const fallback = constrained.filter((item) => !revisionPoolIds.has(item.id));
  return [...prioritized, ...fallback].slice(0, constrained.length);
};

const getQuestionSourceSet = ({
  catalog,
  subjectId,
  chapterId,
  difficultyLevel,
  questionCount,
}) => {
  const bucket = catalog.testsByChapterDifficulty[
    chapterDifficultyKey(subjectId, chapterId, difficultyLevel)
  ];

  if (bucket?.testId && catalog.questionsByTest[bucket.testId]?.length) {
    const maxQuestions = Number(questionCount || bucket.questionCount || 0);
    const source = catalog.questionsByTest[bucket.testId];
    return maxQuestions > 0 ? source.slice(0, maxQuestions) : source;
  }

  const chapterDifficultyPool = Object.values(catalog.testsById || {})
    .filter(
      (test) =>
        String(test.subjectId) === String(subjectId) &&
        String(test.chapterId) === String(chapterId) &&
        normalizeDifficultyId(test.difficultyId) === normalizeDifficultyId(difficultyLevel)
    )
    .flatMap((test) => catalog.questionsByTest[test.id] || []);

  if (chapterDifficultyPool.length) {
    const maxQuestions = Number(questionCount || bucket?.questionCount || 0);
    return maxQuestions > 0
      ? chapterDifficultyPool.slice(0, maxQuestions)
      : chapterDifficultyPool;
  }

  if (catalog.source === "admin") {
    return [];
  }

  return [];
};

const evaluateQuestions = (questions, answers = {}) => {
  const evaluated = questions.map((question) => {
    const selectedOptionId = answers[question.id] ?? null;
    const isCorrect = selectedOptionId === question.correctAnswer;

    return {
      ...question,
      selectedOptionId,
      isCorrect,
    };
  });

  const attempted = evaluated.filter((item) => item.selectedOptionId !== null).length;
  const correct = evaluated.filter((item) => item.isCorrect).length;
  const wrong = attempted - correct;
  const totalQuestions = evaluated.length;
  const scorePercent = totalQuestions
    ? Number(((correct / totalQuestions) * 100).toFixed(2))
    : 0;
  const accuracy = attempted ? Number(((correct / attempted) * 100).toFixed(2)) : 0;

  return {
    evaluated,
    metrics: {
      totalQuestions,
      attempted,
      correct,
      wrong,
      notAnswered: Math.max(totalQuestions - attempted, 0),
      scorePercent,
      accuracy,
    },
  };
};

export const getSubjects = async () => {
  const catalog = await getCatalogSnapshot();
  return withNetwork(() => catalog.subjects || []);
};

export const getSubjectById = async (subjectId) => {
  const catalog = await getCatalogSnapshot();
  const subject = findSubject(catalog, subjectId);

  if (!subject) {
    throw new Error("Subject not found.");
  }

  return withNetwork(() => subject);
};

export const getChaptersBySubject = async (subjectId) => {
  const catalog = await getCatalogSnapshot();
  const subject = findSubject(catalog, subjectId);
  if (!subject) {
    throw new Error("Invalid subject selection.");
  }

  return withNetwork(() =>
    (catalog.chaptersBySubject[subject.id] || []).map((chapter) => ({
      ...chapter,
      difficultyCount: Number(chapter.difficultyCount) || catalog.difficulties.length,
    }))
  );
};

export const getChapterById = async (subjectId, chapterId) => {
  const catalog = await getCatalogSnapshot();
  const chapter = findChapter(catalog, subjectId, chapterId);
  if (!chapter) {
    throw new Error("Chapter not found for selected subject.");
  }

  return withNetwork(() => chapter);
};

export const getDifficultyLevels = async ({ subjectId, chapterId } = {}) => {
  const catalog = await getCatalogSnapshot();

  return withNetwork(() => resolveDifficultyLevels(catalog, { subjectId, chapterId }));
};

export const getMcqQuestions = async ({
  subjectId,
  chapterId,
  difficultyLevel,
  attemptMode,
  smartGoal,
}) => {
  const catalog = await getCatalogSnapshot();
  const subject = findSubject(catalog, subjectId);
  const chapter = findChapter(catalog, subjectId, chapterId);
  const availableDifficulties = resolveDifficultyLevels(catalog, { subjectId, chapterId });
  const difficulty = availableDifficulties.find((item) => item.id === String(difficultyLevel));

  const resolvedGoal = normalizeSmartGoal(
    smartGoal,
    attemptMode ? null : DEFAULT_SMART_TEST_GOAL
  );
  const resolvedAttemptMode = attemptMode || getLegacyModeFromGoal(resolvedGoal, TEST_MODES.EXAM);
  const resolvedGoalFromMode = normalizeSmartGoal(
    smartGoal,
    resolvedAttemptMode === TEST_MODES.PRACTICE
      ? SMART_TEST_GOALS.PRACTICE_FOCUS
      : resolvedAttemptMode === TEST_MODES.REVISION
      ? SMART_TEST_GOALS.REVISION_REINFORCEMENT
      : SMART_TEST_GOALS.EXAM_SIMULATION
  );
  const goalProfile = getSmartGoalProfile(resolvedGoalFromMode);

  if (!subject || !chapter || !difficulty) {
    throw new Error("Unable to prepare test. Please reselect test filters.");
  }

  if (!difficulty.isAvailable) {
    throw new Error(
      "No published questions are available for the selected difficulty yet. Please choose another level."
    );
  }

  const sourceQuestionSet = getQuestionSourceSet({
    catalog,
    subjectId: subject.id,
    chapterId: chapter.id,
    difficultyLevel,
    questionCount: difficulty.questionCount,
  });

  if (!Array.isArray(sourceQuestionSet) || sourceQuestionSet.length === 0) {
    throw new Error("Question set unavailable for selected configuration.");
  }

  return withNetwork(() => ({
    subject,
    chapter,
    difficulty,
    attemptMode: resolvedAttemptMode,
    smartGoal: goalProfile.id,
    goalProfile,
    durationSeconds: Math.round(difficulty.durationSeconds * goalProfile.timerMultiplier),
    questions: mapQuestionInsights(
      buildModeAwareQuestionSet({
        sourceQuestionSet,
        subjectId: subject.id,
        chapterId: chapter.id,
        goalProfile,
        questionCount: difficulty.questionCount,
      }),
      {
        subjectId: subject.id,
        chapterId: chapter.id,
      }
    ),
  }));
};

export const submitMcqAttempt = async ({
  subjectId,
  chapterId,
  difficultyLevel,
  userId,
  attemptMode = TEST_MODES.EXAM,
  smartGoal,
  answers,
  questions,
  totalDurationSeconds,
  timeTakenSeconds,
  questionTimeSpent = {},
}) => {
  const catalog = await getCatalogSnapshot();
  const subject = findSubject(catalog, subjectId);
  const chapter = findChapter(catalog, subjectId, chapterId);
  const difficulty = findDifficulty(catalog, difficultyLevel);

  if (!subject || !chapter || !difficulty) {
    throw new Error("Invalid submission context.");
  }

  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error("No questions available for submission.");
  }

  const { evaluated, metrics } = evaluateQuestions(questions, answers);

  return withNetwork(() => ({
    attemptId: `mcq-attempt-${Date.now()}`,
    userId: userId || null,
    submittedAt: new Date().toISOString(),
    attemptMode,
    smartGoal: normalizeSmartGoal(smartGoal, null),
    subject,
    chapter,
    difficulty,
    durationSeconds: totalDurationSeconds,
    timeTakenSeconds,
    questionTimeSpent,
    metrics,
    questions: evaluated,
  }));
};
