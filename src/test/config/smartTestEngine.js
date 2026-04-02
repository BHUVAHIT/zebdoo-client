import { TEST_MODES } from "../../utils/constants";

export const SMART_TEST_GOALS = Object.freeze({
  PRACTICE_FOCUS: "practice-focus",
  EXAM_SIMULATION: "exam-simulation",
  REVISION_REINFORCEMENT: "revision-reinforcement",
});

export const DEFAULT_SMART_TEST_GOAL = SMART_TEST_GOALS.EXAM_SIMULATION;

const LEGACY_MODE_TO_GOAL = Object.freeze({
  [TEST_MODES.PRACTICE]: SMART_TEST_GOALS.PRACTICE_FOCUS,
  [TEST_MODES.EXAM]: SMART_TEST_GOALS.EXAM_SIMULATION,
  [TEST_MODES.REVISION]: SMART_TEST_GOALS.REVISION_REINFORCEMENT,
});

const SMART_GOAL_TO_LEGACY_MODE = Object.freeze({
  [SMART_TEST_GOALS.PRACTICE_FOCUS]: TEST_MODES.PRACTICE,
  [SMART_TEST_GOALS.EXAM_SIMULATION]: TEST_MODES.EXAM,
  [SMART_TEST_GOALS.REVISION_REINFORCEMENT]: TEST_MODES.REVISION,
});

export const SMART_TEST_GOAL_PROFILES = Object.freeze({
  [SMART_TEST_GOALS.PRACTICE_FOCUS]: {
    id: SMART_TEST_GOALS.PRACTICE_FOCUS,
    label: "Practice Focus",
    summary: "Relaxed timer with guidance to build concept confidence.",
    legacyMode: TEST_MODES.PRACTICE,
    timerMultiplier: 1.35,
    autoSubmitOnTimeout: false,
    showConceptHints: true,
    prioritizeWeakQuestions: false,
    maxQuestionCountBoost: 0,
  },
  [SMART_TEST_GOALS.EXAM_SIMULATION]: {
    id: SMART_TEST_GOALS.EXAM_SIMULATION,
    label: "Exam Simulation",
    summary: "Strict timed run that mirrors final exam pressure.",
    legacyMode: TEST_MODES.EXAM,
    timerMultiplier: 1,
    autoSubmitOnTimeout: true,
    showConceptHints: false,
    prioritizeWeakQuestions: false,
    maxQuestionCountBoost: 0,
  },
  [SMART_TEST_GOALS.REVISION_REINFORCEMENT]: {
    id: SMART_TEST_GOALS.REVISION_REINFORCEMENT,
    label: "Revision Reinforcement",
    summary: "Targets weak and previously incorrect concepts first.",
    legacyMode: TEST_MODES.REVISION,
    timerMultiplier: 1.1,
    autoSubmitOnTimeout: true,
    showConceptHints: true,
    prioritizeWeakQuestions: true,
    maxQuestionCountBoost: 0,
  },
});

export const SMART_TEST_GOAL_OPTIONS = Object.values(SMART_TEST_GOAL_PROFILES).map(
  (profile) => ({
    id: profile.id,
    label: profile.label,
    summary: profile.summary,
  })
);

export const normalizeSmartGoal = (value, fallback = DEFAULT_SMART_TEST_GOAL) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return fallback;

  if (SMART_TEST_GOAL_PROFILES[normalized]) {
    return normalized;
  }

  return fallback;
};

export const getGoalFromLegacyMode = (mode, fallback = DEFAULT_SMART_TEST_GOAL) => {
  const normalizedMode = String(mode || "").trim().toLowerCase();
  return LEGACY_MODE_TO_GOAL[normalizedMode] || fallback;
};

export const getLegacyModeFromGoal = (goal, fallback = TEST_MODES.EXAM) => {
  const normalizedGoal = normalizeSmartGoal(goal, DEFAULT_SMART_TEST_GOAL);
  return SMART_GOAL_TO_LEGACY_MODE[normalizedGoal] || fallback;
};

export const getSmartGoalProfile = (goal) => {
  const normalizedGoal = normalizeSmartGoal(goal, DEFAULT_SMART_TEST_GOAL);
  return SMART_TEST_GOAL_PROFILES[normalizedGoal] || SMART_TEST_GOAL_PROFILES[DEFAULT_SMART_TEST_GOAL];
};

export const resolveSmartGoalContext = ({ goalValue, modeValue, fallbackMode }) => {
  const requestedGoal = normalizeSmartGoal(goalValue, null);
  if (requestedGoal) {
    return {
      smartGoal: requestedGoal,
      attemptMode: getLegacyModeFromGoal(requestedGoal),
      profile: getSmartGoalProfile(requestedGoal),
    };
  }

  const modeGoal = getGoalFromLegacyMode(modeValue || fallbackMode, DEFAULT_SMART_TEST_GOAL);

  return {
    smartGoal: modeGoal,
    attemptMode: getLegacyModeFromGoal(modeGoal),
    profile: getSmartGoalProfile(modeGoal),
  };
};
