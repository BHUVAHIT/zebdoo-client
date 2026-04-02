import { TEST_MODES, TEST_STORAGE_KEYS } from "../utils/constants";
import {
  loadScopedFromStorage,
  saveScopedToStorage,
} from "../utils/storageScope";

const DIFFICULTY_ORDER = ["easy", "medium", "hard"];
const MILLIS_PER_DAY = 24 * 60 * 60 * 1000;

const BADGE_RULES = [
  {
    id: "first-attempt",
    label: "First Step",
    evaluator: ({ totalAttempts }) => totalAttempts >= 1,
  },
  {
    id: "five-attempts",
    label: "Consistency Starter",
    evaluator: ({ totalAttempts }) => totalAttempts >= 5,
  },
  {
    id: "accuracy-70",
    label: "Accuracy 70+",
    evaluator: ({ averageAccuracy }) => averageAccuracy >= 70,
  },
  {
    id: "accuracy-85",
    label: "Precision Pro",
    evaluator: ({ averageAccuracy }) => averageAccuracy >= 85,
  },
  {
    id: "streak-3",
    label: "3 Day Streak",
    evaluator: ({ streakDays }) => streakDays >= 3,
  },
  {
    id: "streak-7",
    label: "Weekly Warrior",
    evaluator: ({ streakDays }) => streakDays >= 7,
  },
];

const round2 = (value) => Number(Number(value || 0).toFixed(2));

const toDayStamp = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
};

const dateDiffDays = (leftStamp, rightStamp) =>
  Math.round((leftStamp - rightStamp) / MILLIS_PER_DAY);

const createTopicKey = (subjectId, chapterId) => `${subjectId || "unknown"}::${chapterId || "unknown"}`;

const normalizeDifficulty = (difficultyId) => String(difficultyId || "").trim().toLowerCase();

const readHistory = () => {
  const raw = loadScopedFromStorage(TEST_STORAGE_KEYS.RESULT_HISTORY, [], {
    migrateLegacy: false,
  });
  if (!Array.isArray(raw)) return [];

  return raw
    .filter((item) => item && item.submittedAt)
    .map((item) => ({
      ...item,
      metrics: item.metrics || {},
      subject: item.subject || {},
      chapter: item.chapter || {},
      difficulty: item.difficulty || {},
      attemptMode: item.attemptMode || TEST_MODES.EXAM,
    }));
};

const readQuestionJournal = () => {
  const raw = loadScopedFromStorage(TEST_STORAGE_KEYS.QUESTION_JOURNAL, {}, {
    migrateLegacy: false,
  });
  if (!raw || typeof raw !== "object") return {};
  return raw;
};

const writeQuestionJournal = (journal) => {
  saveScopedToStorage(TEST_STORAGE_KEYS.QUESTION_JOURNAL, journal);
};

const collectStreak = (history) => {
  if (!history.length) return 0;

  const uniqueDayStamps = [...new Set(history.map((item) => toDayStamp(item.submittedAt)).filter(Boolean))]
    .sort((left, right) => right - left);

  if (!uniqueDayStamps.length) return 0;

  let streak = 1;
  for (let index = 1; index < uniqueDayStamps.length; index += 1) {
    const previousDay = uniqueDayStamps[index - 1];
    const currentDay = uniqueDayStamps[index];
    const deltaDays = dateDiffDays(previousDay, currentDay);

    if (deltaDays === 1) {
      streak += 1;
      continue;
    }

    break;
  }

  return streak;
};

const buildTopicStats = (history) => {
  const map = {};

  history.forEach((attempt) => {
    const subjectId = attempt.subject?.id || "unknown";
    const subjectName = attempt.subject?.name || "Unknown Subject";
    const chapterId = attempt.chapter?.id || "unknown";
    const chapterName = attempt.chapter?.name || "Unknown Chapter";
    const key = createTopicKey(subjectId, chapterId);

    if (!map[key]) {
      map[key] = {
        key,
        subjectId,
        chapterId,
        subjectName,
        chapterName,
        attempts: 0,
        attemptedQuestions: 0,
        correct: 0,
        wrong: 0,
        totalTimeSeconds: 0,
        averageScorePercent: 0,
        scoreTotal: 0,
      };
    }

    const metrics = attempt.metrics || {};
    const attemptedQuestions = Number(metrics.attempted || 0);
    const correct = Number(metrics.correct || 0);
    const wrong = Number(metrics.wrong || 0);
    const scorePercent = Number(metrics.scorePercent || 0);
    const timeTakenSeconds = Number(attempt.timeTakenSeconds || 0);

    map[key].attempts += 1;
    map[key].attemptedQuestions += attemptedQuestions;
    map[key].correct += correct;
    map[key].wrong += wrong;
    map[key].totalTimeSeconds += timeTakenSeconds;
    map[key].scoreTotal += scorePercent;
  });

  return Object.values(map).map((item) => {
    const accuracy = item.attemptedQuestions
      ? round2((item.correct / item.attemptedQuestions) * 100)
      : 0;
    const avgTimePerQuestion = item.attemptedQuestions
      ? round2(item.totalTimeSeconds / item.attemptedQuestions)
      : 0;

    return {
      ...item,
      accuracy,
      avgTimePerQuestion,
      averageScorePercent: item.attempts ? round2(item.scoreTotal / item.attempts) : 0,
    };
  });
};

const buildDifficultyStats = (history) => {
  const map = {
    easy: { difficulty: "easy", attempts: 0, averageScore: 0, scoreTotal: 0 },
    medium: { difficulty: "medium", attempts: 0, averageScore: 0, scoreTotal: 0 },
    hard: { difficulty: "hard", attempts: 0, averageScore: 0, scoreTotal: 0 },
  };

  history.forEach((attempt) => {
    const key = normalizeDifficulty(attempt.difficulty?.id);
    if (!map[key]) return;

    const score = Number(attempt.metrics?.scorePercent || 0);
    map[key].attempts += 1;
    map[key].scoreTotal += score;
  });

  return DIFFICULTY_ORDER.map((difficulty) => {
    const item = map[difficulty];
    return {
      difficulty,
      attempts: item.attempts,
      averageScore: item.attempts ? round2(item.scoreTotal / item.attempts) : 0,
    };
  });
};

const buildDailyGoal = (history) => {
  const now = new Date();
  const todayStamp = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  const todayAttempts = history.filter((item) => toDayStamp(item.submittedAt) === todayStamp);
  const questionsAttemptedToday = todayAttempts.reduce(
    (acc, item) => acc + Number(item.metrics?.attempted || 0),
    0
  );

  const targetQuestions = 50;
  const progressPercent = targetQuestions
    ? Math.min(Math.round((questionsAttemptedToday / targetQuestions) * 100), 100)
    : 0;

  return {
    targetQuestions,
    questionsAttemptedToday,
    remainingQuestions: Math.max(targetQuestions - questionsAttemptedToday, 0),
    progressPercent,
  };
};

const buildRankEstimate = (history) => {
  if (!history.length) {
    return {
      estimatedRank: null,
      percentile: null,
      confidence: "low",
    };
  }

  const latestAttempts = history.slice(0, 12);
  const avgScore =
    latestAttempts.reduce((acc, item) => acc + Number(item.metrics?.scorePercent || 0), 0) /
    latestAttempts.length;

  const estimatedRank = Math.max(Math.round(6000 - avgScore * 45 - history.length * 3), 145);
  const percentile = Math.min(Math.max(round2((1 - estimatedRank / 7000) * 100), 1), 99.9);

  return {
    estimatedRank,
    percentile,
    confidence: latestAttempts.length >= 8 ? "high" : "medium",
  };
};

const buildXp = (history) => {
  const totalXp = history.reduce((acc, attempt) => {
    const score = Number(attempt.metrics?.scorePercent || 0);
    const accuracy = Number(attempt.metrics?.accuracy || 0);
    const attemptMode = attempt.attemptMode || TEST_MODES.EXAM;

    const modeMultiplier =
      attemptMode === TEST_MODES.EXAM ? 1.2 : attemptMode === TEST_MODES.REVISION ? 1.1 : 1;

    return acc + Math.round((30 + score * 2 + accuracy) * modeMultiplier);
  }, 0);

  const level = Math.max(1, Math.floor(totalXp / 800) + 1);
  const currentLevelFloor = (level - 1) * 800;
  const currentLevelProgress = totalXp - currentLevelFloor;

  return {
    totalXp,
    level,
    currentLevelProgress,
    nextLevelXp: 800,
  };
};

const buildWeakTopics = (topicStats) =>
  [...topicStats]
    .sort((left, right) => {
      const leftRisk = (100 - left.accuracy) * 0.7 + left.avgTimePerQuestion * 0.3;
      const rightRisk = (100 - right.accuracy) * 0.7 + right.avgTimePerQuestion * 0.3;
      return rightRisk - leftRisk;
    })
    .slice(0, 5)
    .map((item) => ({
      ...item,
      suggestedMode:
        item.accuracy < 55 ? TEST_MODES.REVISION : item.accuracy < 72 ? TEST_MODES.PRACTICE : TEST_MODES.EXAM,
      suggestedDifficulty:
        item.accuracy >= 78 ? "hard" : item.accuracy >= 55 ? "medium" : "easy",
    }));

const buildSuggestedTests = (weakTopics) =>
  weakTopics.slice(0, 3).map((topic, index) => ({
    id: `suggestion-${topic.subjectId}-${topic.chapterId}-${index}`,
    subjectId: topic.subjectId,
    chapterId: topic.chapterId,
    title: `${topic.subjectName} - ${topic.chapterName}`,
    reason:
      topic.accuracy < 55
        ? "Low accuracy detected. Revise core concepts first."
        : "Speed/accuracy imbalance found. Practice mixed scenarios.",
    recommendedMode: topic.suggestedMode,
    recommendedDifficulty: topic.suggestedDifficulty,
  }));

export const computeLearningProfile = (history = readHistory()) => {
  const totalAttempts = history.length;
  const averageScore =
    totalAttempts > 0
      ? round2(
          history.reduce((acc, item) => acc + Number(item.metrics?.scorePercent || 0), 0) /
            totalAttempts
        )
      : 0;
  const averageAccuracy =
    totalAttempts > 0
      ? round2(
          history.reduce((acc, item) => acc + Number(item.metrics?.accuracy || 0), 0) /
            totalAttempts
        )
      : 0;

  const totalQuestionTime = history.reduce(
    (acc, item) => acc + Number(item.timeTakenSeconds || 0),
    0
  );
  const totalAttemptedQuestions = history.reduce(
    (acc, item) => acc + Number(item.metrics?.attempted || 0),
    0
  );

  const topicStats = buildTopicStats(history);
  const weakTopics = buildWeakTopics(topicStats);
  const streakDays = collectStreak(history);
  const dailyGoal = buildDailyGoal(history);
  const rankEstimate = buildRankEstimate(history);
  const xp = buildXp(history);

  const profile = {
    generatedAt: new Date().toISOString(),
    totals: {
      totalAttempts,
      averageScore,
      averageAccuracy,
      averageTimePerQuestion: totalAttemptedQuestions
        ? round2(totalQuestionTime / totalAttemptedQuestions)
        : 0,
    },
    streakDays,
    xp,
    badges: BADGE_RULES.filter((item) =>
      item.evaluator({
        totalAttempts,
        averageAccuracy,
        streakDays,
      })
    ).map((item) => ({ id: item.id, label: item.label })),
    dailyGoal,
    rankEstimate,
    difficultyStats: buildDifficultyStats(history),
    weakTopics,
    suggestedTests: buildSuggestedTests(weakTopics),
  };

  saveScopedToStorage(TEST_STORAGE_KEYS.LEARNING_PROFILE, profile);
  return profile;
};

export const getLearningProfile = () => {
  const stored = loadScopedFromStorage(TEST_STORAGE_KEYS.LEARNING_PROFILE, null, {
    migrateLegacy: false,
  });
  if (stored && stored.generatedAt) {
    return stored;
  }

  return computeLearningProfile();
};

export const getAdaptiveDifficultyRecommendation = ({
  subjectId,
  chapterId,
  history = readHistory(),
}) => {
  const filtered = history
    .filter(
      (item) =>
        (!subjectId || item.subject?.id === subjectId) &&
        (!chapterId || item.chapter?.id === chapterId)
    )
    .slice(0, 5);

  if (!filtered.length) {
    return {
      difficultyId: "medium",
      reason: "Starting with medium is ideal for baseline calibration.",
      confidence: "low",
    };
  }

  const avgAccuracy =
    filtered.reduce((acc, item) => acc + Number(item.metrics?.accuracy || 0), 0) /
    filtered.length;
  const avgTimePerQuestion =
    filtered.reduce((acc, item) => {
      const attempted = Number(item.metrics?.attempted || 0);
      const timeTaken = Number(item.timeTakenSeconds || 0);
      return acc + (attempted ? timeTaken / attempted : 0);
    }, 0) / filtered.length;

  if (avgAccuracy >= 78 && avgTimePerQuestion <= 55) {
    return {
      difficultyId: "hard",
      reason: "High accuracy with fast pace detected. Move to hard for better growth.",
      confidence: filtered.length >= 3 ? "high" : "medium",
    };
  }

  if (avgAccuracy < 55 || avgTimePerQuestion > 80) {
    return {
      difficultyId: "easy",
      reason: "Concept reinforcement needed. Easy mode improves confidence and speed.",
      confidence: filtered.length >= 3 ? "high" : "medium",
    };
  }

  return {
    difficultyId: "medium",
    reason: "Balanced profile. Medium keeps challenge and retention aligned.",
    confidence: filtered.length >= 3 ? "high" : "medium",
  };
};

export const getRecommendedAttemptMode = ({
  subjectId,
  chapterId,
  history = readHistory(),
}) => {
  const filtered = history
    .filter(
      (item) =>
        (!subjectId || item.subject?.id === subjectId) &&
        (!chapterId || item.chapter?.id === chapterId)
    )
    .slice(0, 4);

  if (!filtered.length) {
    return {
      mode: TEST_MODES.PRACTICE,
      reason: "Start in practice mode to warm up without pressure.",
    };
  }

  const avgScore =
    filtered.reduce((acc, item) => acc + Number(item.metrics?.scorePercent || 0), 0) /
    filtered.length;

  if (avgScore >= 75) {
    return {
      mode: TEST_MODES.EXAM,
      reason: "You are ready for exam simulation under strict timing.",
    };
  }

  if (avgScore < 50) {
    return {
      mode: TEST_MODES.REVISION,
      reason: "Revision mode will target your weak and incorrect question patterns.",
    };
  }

  return {
    mode: TEST_MODES.PRACTICE,
    reason: "Practice mode can stabilize accuracy before exam simulation.",
  };
};

export const getRevisionQuestionPool = ({ subjectId, chapterId, limit = 35 }) => {
  const journal = readQuestionJournal();
  const pool = Object.values(journal)
    .filter(
      (entry) =>
        (!subjectId || entry.subjectId === subjectId) &&
        (!chapterId || entry.chapterId === chapterId)
    )
    .filter((entry) => {
      const attempts = Number(entry.totalAttempts || 0);
      const wrong = Number(entry.wrongAttempts || 0);
      const wrongRate = attempts ? wrong / attempts : 0;
      return wrongRate >= 0.4 || entry.isBookmarked || Boolean(entry.note);
    })
    .sort((left, right) => {
      const leftRisk = Number(left.wrongAttempts || 0) * 2 + (left.isBookmarked ? 2 : 0);
      const rightRisk = Number(right.wrongAttempts || 0) * 2 + (right.isBookmarked ? 2 : 0);
      return rightRisk - leftRisk;
    })
    .slice(0, limit)
    .map((entry) => entry.questionId);

  return pool;
};

export const getQuestionJournalSnapshot = () => readQuestionJournal();

export const syncLearningArtifactsFromAttempt = ({
  result,
  questionTimeSpent = {},
  bookmarkedQuestions = {},
  questionNotes = {},
  attemptMode = TEST_MODES.EXAM,
}) => {
  if (!result || !Array.isArray(result.questions)) {
    return null;
  }

  const journal = {
    ...readQuestionJournal(),
  };

  result.questions.forEach((question) => {
    const key = String(question.id);
    const current = journal[key] || {
      questionId: key,
      subjectId: result.subject?.id || "",
      chapterId: result.chapter?.id || "",
      totalAttempts: 0,
      correctAttempts: 0,
      wrongAttempts: 0,
      totalTimeSeconds: 0,
      averageTimeSeconds: 0,
      isBookmarked: false,
      note: "",
      lastAttemptedAt: null,
    };

    const nextTotalAttempts = Number(current.totalAttempts || 0) + 1;
    const timeSpent = Number(questionTimeSpent[key] || 0);
    const nextTotalTime = Number(current.totalTimeSeconds || 0) + Math.max(timeSpent, 0);

    journal[key] = {
      ...current,
      subjectId: result.subject?.id || current.subjectId,
      chapterId: result.chapter?.id || current.chapterId,
      totalAttempts: nextTotalAttempts,
      correctAttempts: Number(current.correctAttempts || 0) + (question.isCorrect ? 1 : 0),
      wrongAttempts: Number(current.wrongAttempts || 0) + (question.isCorrect ? 0 : 1),
      totalTimeSeconds: nextTotalTime,
      averageTimeSeconds: round2(nextTotalTime / nextTotalAttempts),
      isBookmarked: Boolean(bookmarkedQuestions[key]),
      note: String(questionNotes[key] || current.note || "").trim(),
      lastAttemptedAt: result.submittedAt,
      lastAttemptMode: attemptMode,
    };
  });

  writeQuestionJournal(journal);
  return computeLearningProfile();
};

export const getAttemptPreferences = () => {
  const raw = loadScopedFromStorage(TEST_STORAGE_KEYS.ATTEMPT_PREFERENCES, {}, {
    migrateLegacy: false,
  });
  if (!raw || typeof raw !== "object") {
    return {
      preferredMode: TEST_MODES.PRACTICE,
      preferredDifficulty: "medium",
    };
  }

  return {
    preferredMode: raw.preferredMode || TEST_MODES.PRACTICE,
    preferredDifficulty: raw.preferredDifficulty || "medium",
  };
};

export const saveAttemptPreferences = ({ preferredMode, preferredDifficulty }) => {
  saveScopedToStorage(TEST_STORAGE_KEYS.ATTEMPT_PREFERENCES, {
    preferredMode,
    preferredDifficulty,
    updatedAt: new Date().toISOString(),
  });
};
