export const ATTEMPT_STATUS = Object.freeze({
  IDLE: "idle",
  IN_PROGRESS: "in-progress",
  SUBMITTED: "submitted",
});

const normalizeId = (value) => String(value || "").trim();

export const normalizeAttemptStatus = (status) => {
  const normalized = String(status || "").trim().toLowerCase();

  if (normalized === ATTEMPT_STATUS.IN_PROGRESS) {
    return ATTEMPT_STATUS.IN_PROGRESS;
  }

  if (normalized === ATTEMPT_STATUS.SUBMITTED) {
    return ATTEMPT_STATUS.SUBMITTED;
  }

  return ATTEMPT_STATUS.IDLE;
};

export const buildAttemptTestId = ({ subjectId, chapterId, difficultyId }) => {
  const normalizedSubjectId = normalizeId(subjectId);
  const normalizedChapterId = normalizeId(chapterId);
  const normalizedDifficultyId = normalizeId(difficultyId);

  if (!normalizedSubjectId || !normalizedChapterId || !normalizedDifficultyId) {
    return "";
  }

  return `${normalizedSubjectId}::${normalizedChapterId}::${normalizedDifficultyId}`;
};

export const buildAttemptSnapshot = ({
  id,
  testId,
  status,
  endsAt,
  hasQuestions,
  expectedId,
}) => ({
  id: normalizeId(id),
  testId: normalizeId(testId),
  status: normalizeAttemptStatus(status),
  endsAt: Number(endsAt || 0),
  hasQuestions: Boolean(hasQuestions),
  expectedId: normalizeId(expectedId),
});

export const isValidAttempt = (attempt) => {
  if (!attempt) return false;
  if (!attempt.id || !attempt.testId) return false;
  if (attempt.status !== ATTEMPT_STATUS.IN_PROGRESS) return false;

  if (attempt.expectedId && attempt.id !== attempt.expectedId) {
    return false;
  }

  if (!attempt.hasQuestions) {
    return false;
  }

  if (!Number.isFinite(attempt.endsAt) || attempt.endsAt <= Date.now()) {
    return false;
  }

  return true;
};

export const isSubmittedAttempt = (attempt) => {
  if (!attempt) return false;
  return (
    Boolean(attempt.testId) &&
    attempt.status === ATTEMPT_STATUS.SUBMITTED
  );
};