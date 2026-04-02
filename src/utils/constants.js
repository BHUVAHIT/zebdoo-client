export const TEST_STORAGE_KEYS = {
  SESSION: "mcq:test:session:v1",
  LAST_RESULT: "mcq:test:last-result:v1",
  RESULT_HISTORY: "mcq:test:result-history:v1",
  LEARNING_PROFILE: "mcq:test:learning-profile:v1",
  QUESTION_JOURNAL: "mcq:test:question-journal:v1",
  ATTEMPT_PREFERENCES: "mcq:test:attempt-preferences:v1",
  STUDENT_PROFILE: "mcq:student:profile:v1",
  QUESTION_BANK_STATE: "mcq:question-bank:state:v1",
};

export const TEST_MODES = Object.freeze({
  PRACTICE: "practice",
  EXAM: "exam",
  REVISION: "revision",
});

export const SMART_TEST_IDENTITY = Object.freeze({
  ENGINE_NAME: "Smart Test Engine",
  ENGINE_VERSION: "v1",
});

export const QUESTION_STATE = {
  NOT_VISITED: "not-visited",
  ANSWERED: "answered",
  NOT_ANSWERED: "not-answered",
  MARKED: "marked",
  CURRENT: "current",
};

export const FETCH_STATE = {
  IDLE: "idle",
  LOADING: "loading",
  SUCCESS: "success",
  ERROR: "error",
};

export const TRANSITION_MS = 220;

export const DEFAULT_TEST_DURATION_SECONDS = 30 * 60;
