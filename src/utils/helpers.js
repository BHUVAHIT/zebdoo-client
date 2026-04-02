import { QUESTION_STATE } from "./constants";

export const safeJsonParse = (value, fallback = null) => {
  if (!value) return fallback;

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

export const getAttemptedCount = (answers = {}) =>
  Object.values(answers).filter((value) => value !== null && value !== undefined).length;

export const getUnattemptedCount = (total, attempted) => Math.max(total - attempted, 0);

export const getProgressPercent = (total, attempted) => {
  if (!total) return 0;
  return Math.round((attempted / total) * 100);
};

export const formatSeconds = (seconds) => {
  const total = Math.max(Number.isFinite(seconds) ? seconds : 0, 0);
  const mins = Math.floor(total / 60);
  const secs = total % 60;

  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
};

export const toQuestionId = (id) => String(id);

export const getQuestionStatus = ({
  question,
  currentIndex,
  index,
  answers,
  visited,
  markedForReview,
}) => {
  const id = toQuestionId(question.id);
  const isCurrent = currentIndex === index;
  const isMarked = Boolean(markedForReview[id]);
  const isVisited = Boolean(visited[id]);
  const hasAnswer = answers[id] !== null && answers[id] !== undefined;

  if (isCurrent) return QUESTION_STATE.CURRENT;
  if (isMarked) return QUESTION_STATE.MARKED;
  if (hasAnswer) return QUESTION_STATE.ANSWERED;
  if (isVisited) return QUESTION_STATE.NOT_ANSWERED;
  return QUESTION_STATE.NOT_VISITED;
};

export const evaluateAnswers = (questions, answers) => {
  const evaluated = questions.map((question) => {
    const id = toQuestionId(question.id);
    const selectedOptionId = answers[id] ?? null;
    const isCorrect = selectedOptionId === question.correctAnswer;

    return {
      ...question,
      selectedOptionId,
      isCorrect,
    };
  });

  const correct = evaluated.filter((item) => item.isCorrect).length;
  const attempted = evaluated.filter((item) => item.selectedOptionId !== null).length;
  const wrong = attempted - correct;
  const total = evaluated.length;
  const notAttempted = Math.max(total - attempted, 0);
  const scorePercent = total ? Number(((correct / total) * 100).toFixed(2)) : 0;

  return {
    evaluated,
    summary: {
      total,
      attempted,
      notAttempted,
      correct,
      wrong,
      scorePercent,
    },
  };
};

export const loadFromStorage = (key, fallback = null) => {
  if (typeof window === "undefined") return fallback;
  return safeJsonParse(window.localStorage.getItem(key), fallback);
};

export const saveToStorage = (key, value) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
};

export const removeFromStorage = (key) => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(key);
};

export const getDisplayDateTime = (isoDate) => {
  if (!isoDate) return "-";
  const date = new Date(isoDate);

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};
