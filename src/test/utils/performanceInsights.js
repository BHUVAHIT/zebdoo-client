const DIFFICULTY_ORDER = ["easy", "medium", "hard"];

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const round2 = (value) => Number(Number(value || 0).toFixed(2));

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toArray = (value) => (Array.isArray(value) ? value : []);

const normalizeDifficultyId = (value) => String(value || "").trim().toLowerCase();

const normalizeRecord = (item) => ({
  ...item,
  metrics: item?.metrics || {},
  subject: item?.subject || {},
  chapter: item?.chapter || {},
  difficulty: item?.difficulty || {},
});

const sortBySubmittedAtDesc = (items) =>
  [...items].sort((left, right) => {
    const leftTime = new Date(left?.submittedAt || 0).getTime();
    const rightTime = new Date(right?.submittedAt || 0).getTime();
    return rightTime - leftTime;
  });

const sum = (items, selector) =>
  items.reduce((acc, item) => acc + toNumber(selector(item)), 0);

const average = (items, selector) => {
  if (!items.length) return 0;
  return round2(sum(items, selector) / items.length);
};

export const getPerformanceStatus = (scorePercent) => {
  const score = toNumber(scorePercent);

  if (score >= 75) {
    return {
      id: "strong",
      label: "Strong",
      tone: "good",
      color: "green",
    };
  }

  if (score >= 55) {
    return {
      id: "average",
      label: "Average",
      tone: "mid",
      color: "yellow",
    };
  }

  return {
    id: "weak",
    label: "Weak",
    tone: "risk",
    color: "red",
  };
};

export const getTrendMeta = (records) => {
  const ordered = sortBySubmittedAtDesc(toArray(records));
  const recent = ordered.slice(0, 3);
  const previous = ordered.slice(3, 6);
  const recentAvg = average(recent, (item) => item.metrics?.scorePercent);
  const previousAvg = average(previous, (item) => item.metrics?.scorePercent);
  const delta = round2(recentAvg - previousAvg);

  if (!recent.length || !previous.length) {
    return {
      direction: "steady",
      icon: "->",
      label: "No trend yet",
      delta,
    };
  }

  if (delta >= 3) {
    return {
      direction: "up",
      icon: "↑",
      label: `Improving +${delta}%`,
      delta,
    };
  }

  if (delta <= -3) {
    return {
      direction: "down",
      icon: "↓",
      label: `Dropping ${delta}%`,
      delta,
    };
  }

  return {
    direction: "steady",
    icon: "->",
    label: "Stable performance",
    delta,
  };
};

const buildSubjectInsightCopy = ({ status, subjectName, pendingTests, testsAttempted }) => {
  if (!testsAttempted) {
    return `No attempts in ${subjectName} yet. Start your first test for a baseline.`;
  }

  if (status.id === "strong") {
    if (pendingTests > 0) {
      return `You are strong in ${subjectName}. Try the remaining ${pendingTests} chapter tests next.`;
    }
    return `You are strong in ${subjectName}. Maintain momentum with mixed revision.`;
  }

  if (status.id === "average") {
    return `You are building consistency in ${subjectName}. One focused practice session can boost your score.`;
  }

  return `Focus more on ${subjectName}. Revise fundamentals and attempt easier sets first.`;
};

export const buildSubjectDashboard = ({ subjects = [], history = [] }) => {
  const normalizedHistory = sortBySubmittedAtDesc(toArray(history).map(normalizeRecord));

  const subjectCards = toArray(subjects).map((subject) => {
    const subjectId = String(subject?.id || "");
    const subjectHistory = normalizedHistory.filter(
      (item) => String(item.subject?.id || "") === subjectId
    );

    const testsAttempted = subjectHistory.length;
    const attemptedChapterCount = new Set(
      subjectHistory.map((item) => String(item.chapter?.id || "")).filter(Boolean)
    ).size;
    const totalChapterCount = toNumber(subject?.chapterCount);
    const pendingTests = Math.max(totalChapterCount - attemptedChapterCount, 0);
    const averageScore = average(subjectHistory, (item) => item.metrics?.scorePercent);
    const averageAccuracy = average(subjectHistory, (item) => item.metrics?.accuracy);
    const totalTimeSeconds = sum(subjectHistory, (item) => item.timeTakenSeconds);
    const status = getPerformanceStatus(averageScore);
    const trend = getTrendMeta(subjectHistory);

    return {
      id: subjectId,
      name: String(subject?.name || "Subject"),
      testsAttempted,
      pendingTests,
      attemptedChapterCount,
      totalChapterCount,
      averageScore,
      averageAccuracy,
      progressPercent: clamp(Math.round(averageScore), 0, 100),
      totalTimeSeconds,
      status,
      trend,
      insight: buildSubjectInsightCopy({
        status,
        subjectName: String(subject?.name || "this subject"),
        pendingTests,
        testsAttempted,
      }),
    };
  });

  const attemptedSubjects = subjectCards.filter((item) => item.testsAttempted > 0).length;
  const totalSubjects = subjectCards.length;
  const pendingSubjects = Math.max(totalSubjects - attemptedSubjects, 0);
  const overallPerformance = average(normalizedHistory, (item) => item.metrics?.scorePercent);

  const strongestSubject =
    [...subjectCards]
      .filter((item) => item.testsAttempted > 0)
      .sort((left, right) => right.averageScore - left.averageScore)[0] || null;

  const weakestSubject =
    [...subjectCards]
      .filter((item) => item.testsAttempted > 0)
      .sort((left, right) => left.averageScore - right.averageScore)[0] || null;

  const insightLines = [];
  if (strongestSubject) {
    insightLines.push(
      `Top performer: ${strongestSubject.name} at ${strongestSubject.averageScore}%.`
    );
  }
  if (weakestSubject && weakestSubject.id !== strongestSubject?.id) {
    insightLines.push(
      `Needs focus: ${weakestSubject.name} at ${weakestSubject.averageScore}%.`
    );
  }
  if (!insightLines.length) {
    insightLines.push("Start your first attempt to unlock personalized subject insights.");
  }

  return {
    summary: {
      totalSubjects,
      attemptedSubjects,
      pendingSubjects,
      overallPerformance,
    },
    cards: subjectCards,
    insights: insightLines,
  };
};

const buildChapterRecommendation = (chapterName, attempts, status, avgTimePerQuestion) => {
  if (!attempts) {
    return `Start with one baseline attempt in ${chapterName}.`;
  }

  if (status.id === "weak") {
    return `Revise ${chapterName} with concept notes, then retry easy difficulty.`;
  }

  if (avgTimePerQuestion > 85) {
    return `Speed is low in ${chapterName}. Practice timed question sets.`;
  }

  if (status.id === "strong") {
    return `${chapterName} is stable. Move to medium/hard mixed sets.`;
  }

  return `Practice two focused sets in ${chapterName} to push accuracy above 75%.`;
};

export const buildChapterDashboard = ({ chapters = [], history = [], subjectId }) => {
  const filteredHistory = sortBySubmittedAtDesc(
    toArray(history)
      .map(normalizeRecord)
      .filter((item) => String(item.subject?.id || "") === String(subjectId || ""))
  );

  const chapterCards = toArray(chapters).map((chapter) => {
    const chapterId = String(chapter?.id || "");
    const chapterHistory = filteredHistory.filter(
      (item) => String(item.chapter?.id || "") === chapterId
    );

    const attempts = chapterHistory.length;
    const attemptedQuestions = sum(chapterHistory, (item) => item.metrics?.attempted);
    const correct = sum(chapterHistory, (item) => item.metrics?.correct);
    const totalTimeSeconds = sum(chapterHistory, (item) => item.timeTakenSeconds);
    const avgScore = average(chapterHistory, (item) => item.metrics?.scorePercent);
    const accuracy = attemptedQuestions ? round2((correct / attemptedQuestions) * 100) : 0;
    const avgTimePerQuestion = attemptedQuestions
      ? round2(totalTimeSeconds / attemptedQuestions)
      : 0;
    const status = getPerformanceStatus(avgScore);
    const speedScore = clamp(Math.round(100 - avgTimePerQuestion), 0, 100);

    return {
      id: chapterId,
      name: String(chapter?.name || chapter?.title || "Chapter"),
      attempts,
      avgScore,
      accuracy,
      totalTimeSeconds,
      avgTimePerQuestion,
      status,
      scoreBarPercent: clamp(Math.round(avgScore), 0, 100),
      timeBarPercent: speedScore,
      recommendation: buildChapterRecommendation(
        String(chapter?.name || chapter?.title || "this chapter"),
        attempts,
        status,
        avgTimePerQuestion
      ),
    };
  });

  const highRiskChapters = chapterCards
    .filter((item) => item.attempts > 0)
    .sort((left, right) => {
      const leftRisk = (100 - left.accuracy) * 0.7 + left.avgTimePerQuestion * 0.3;
      const rightRisk = (100 - right.accuracy) * 0.7 + right.avgTimePerQuestion * 0.3;
      return rightRisk - leftRisk;
    })
    .slice(0, 3);

  return {
    cards: chapterCards,
    recommendations: highRiskChapters.map((item) => `Revise ${item.name} first.`),
  };
};

const buildDifficultyHint = (difficultyId, attempts, accuracy, avgTimePerQuestion) => {
  const label = difficultyId[0].toUpperCase() + difficultyId.slice(1);

  if (!attempts) {
    return `No ${label} attempts yet. Try this level once for calibration.`;
  }

  if (accuracy < 55) {
    return `${label} needs concept reinforcement. Start with solved examples.`;
  }

  if (avgTimePerQuestion > 85) {
    return `${label} accuracy is okay, but speed needs improvement.`;
  }

  return `${label} is on track. Maintain consistency with timed practice.`;
};

export const buildDifficultyDashboard = ({ history = [], subjectId, chapterId }) => {
  const filteredHistory = sortBySubmittedAtDesc(
    toArray(history)
      .map(normalizeRecord)
      .filter(
        (item) =>
          (!subjectId || String(item.subject?.id || "") === String(subjectId)) &&
          (!chapterId || String(item.chapter?.id || "") === String(chapterId))
      )
  );

  const entries = DIFFICULTY_ORDER.map((difficultyId) => {
    const bucket = filteredHistory.filter(
      (item) => normalizeDifficultyId(item.difficulty?.id) === difficultyId
    );

    const attempts = bucket.length;
    const attemptedQuestions = sum(bucket, (item) => item.metrics?.attempted);
    const correct = sum(bucket, (item) => item.metrics?.correct);
    const totalTimeSeconds = sum(bucket, (item) => item.timeTakenSeconds);
    const avgScore = average(bucket, (item) => item.metrics?.scorePercent);
    const accuracy = attemptedQuestions ? round2((correct / attemptedQuestions) * 100) : 0;
    const avgTimePerQuestion = attemptedQuestions
      ? round2(totalTimeSeconds / attemptedQuestions)
      : 0;

    return {
      id: difficultyId,
      label: difficultyId[0].toUpperCase() + difficultyId.slice(1),
      attempts,
      accuracy,
      averageScore: avgScore,
      avgTimePerQuestion,
      status: getPerformanceStatus(avgScore),
      fillPercent: clamp(Math.round(accuracy), 0, 100),
      hint: buildDifficultyHint(difficultyId, attempts, accuracy, avgTimePerQuestion),
    };
  });

  const best = [...entries].sort((left, right) => right.averageScore - left.averageScore)[0];
  const weakest = [...entries].sort((left, right) => left.averageScore - right.averageScore)[0];

  const insight =
    best?.attempts && weakest?.attempts
      ? `You perform best in ${best.label}, while ${weakest.label} needs more attention.`
      : "Complete attempts across difficulty levels to unlock comparison insights.";

  const improvementPath =
    weakest?.attempts && weakest.status.id === "weak"
      ? `Path: ${weakest.label} -> Medium -> Hard with one timed drill per level.`
      : "Path: Maintain Medium consistency, then increase Hard exposure gradually.";

  return {
    entries,
    insight,
    improvementPath,
  };
};

export const buildPreTestBriefing = ({
  history = [],
  subject,
  chapter,
  difficulty,
  plannedDurationSeconds,
}) => {
  const filteredHistory = toArray(history)
    .map(normalizeRecord)
    .filter(
      (item) =>
        String(item.subject?.id || "") === String(subject?.id || "") &&
        String(item.chapter?.id || "") === String(chapter?.id || "")
    );

  const averageScore = average(filteredHistory, (item) => item.metrics?.scorePercent);
  const status = getPerformanceStatus(averageScore);
  const attemptedQuestions = sum(filteredHistory, (item) => item.metrics?.attempted);
  const avgTimePerQuestion = attemptedQuestions
    ? round2(sum(filteredHistory, (item) => item.timeTakenSeconds) / attemptedQuestions)
    : 0;

  const inferredDuration = toNumber(plannedDurationSeconds) || toNumber(difficulty?.durationSeconds);
  const suggestedDuration =
    avgTimePerQuestion && toNumber(difficulty?.questionCount)
      ? Math.round(avgTimePerQuestion * toNumber(difficulty.questionCount))
      : inferredDuration;

  return {
    chapterStrength: status,
    chapterScore: averageScore,
    expectedDifficulty: String(difficulty?.label || "Selected"),
    suggestedDurationSeconds: Math.max(suggestedDuration, 5 * 60),
    avgTimePerQuestion,
    guidance:
      status.id === "strong"
        ? "You are in a strong zone. Prioritize accuracy over speed spikes."
        : status.id === "average"
        ? "Steady progress detected. Aim for clean question selection first."
        : "Take a calm start, solve familiar patterns first, then attempt harder items.",
  };
};

export const buildPostTestInsights = ({ result, history = [] }) => {
  const metrics = result?.metrics || {};
  const questions = toArray(result?.questions);
  const normalizedHistory = sortBySubmittedAtDesc(toArray(history).map(normalizeRecord));

  const currentSubmittedAt = String(result?.submittedAt || "");
  const previousAttempts = normalizedHistory.filter(
    (item) => String(item.submittedAt || "") !== currentSubmittedAt
  );

  const previousAverage = average(previousAttempts.slice(0, 5), (item) => item.metrics?.scorePercent);
  const currentScore = toNumber(metrics.scorePercent);
  const delta = round2(currentScore - previousAverage);

  const wrongQuestions = questions
    .map((question, index) => ({
      id: question?.id,
      index,
      isCorrect: Boolean(question?.isCorrect),
      prompt: String(question?.question || "").trim(),
      explanation: String(question?.explanation || "").trim(),
      timeSpentSeconds: toNumber(result?.questionTimeSpent?.[question?.id]),
    }))
    .filter((item) => !item.isCorrect);

  const weakAreas = wrongQuestions.slice(0, 3).map((item) => ({
    id: item.id || `q-${item.index + 1}`,
    label: `Q${item.index + 1}: ${item.prompt.slice(0, 68) || "Concept revision"}`,
    recommendation: item.explanation
      ? `Review solution logic: ${item.explanation.slice(0, 120)}`
      : "Revisit this concept and practice two related questions.",
  }));

  const improvementTips = [];

  if (toNumber(metrics.accuracy) < 65) {
    improvementTips.push("Focus on concept clarity before increasing speed.");
  }
  if (toNumber(metrics.notAnswered) > 0) {
    improvementTips.push("Use the first pass to secure easy marks and reduce unattempted items.");
  }
  if (toNumber(metrics.correct) >= 0 && toNumber(metrics.wrong) > toNumber(metrics.correct)) {
    improvementTips.push("Slow down on close options and eliminate distractors systematically.");
  }
  if (!improvementTips.length) {
    improvementTips.push("Maintain this momentum with one follow-up chapter test today.");
  }

  const progressLine =
    previousAttempts.length > 0
      ? delta >= 0
        ? `Great work. You improved by +${delta}% versus your recent baseline.`
        : `Current score is ${Math.abs(delta)}% below your recent baseline. A focused retry can recover it.`
      : "This is your baseline attempt. Future tests will unlock progress trends.";

  return {
    progressLine,
    weakAreas,
    improvementTips,
  };
};
