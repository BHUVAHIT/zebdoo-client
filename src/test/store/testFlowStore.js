import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { TEST_MODES } from "../../utils/constants";
import {
  DEFAULT_SMART_TEST_GOAL,
  getGoalFromLegacyMode,
  normalizeSmartGoal,
} from "../config/smartTestEngine";
import {
  ATTEMPT_STATUS,
  buildAttemptTestId,
  normalizeAttemptStatus,
} from "../utils/attemptResume";
import { resolveStorageScopeId } from "../../utils/storageScope";

const STORAGE_KEY = "mcq:test:flow:v2";

const DEFAULT_PAGE_SIZE = 5;

const DEFAULT_ATTEMPT_MODE = TEST_MODES.EXAM;
const getActiveScopeId = () => resolveStorageScopeId();

const getDefaultTimer = () => ({
  durationSeconds: 0,
  startedAt: null,
  endsAt: null,
  timeLeft: 0,
});

const safePersistStorage = createJSONStorage(() => ({
  getItem: (key) => {
    if (typeof window === "undefined") return null;

    const stored = window.localStorage.getItem(key);
    if (!stored) return null;

    try {
      JSON.parse(stored);
      return stored;
    } catch {
      window.localStorage.removeItem(key);
      return null;
    }
  },
  setItem: (key, value) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, value);
  },
  removeItem: (key) => {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(key);
  },
}));

const normalizeId = (value) => String(value || "").trim();

const containsUnsafePathToken = (value) => /[/?#]/.test(normalizeId(value));

const composeAttemptKey = ({
  subjectId,
  chapterId,
  difficultyLevel,
  attemptMode,
  smartGoal,
}) =>
  `${subjectId}::${chapterId}::${difficultyLevel}::${smartGoal || "default-goal"}::${
    attemptMode || DEFAULT_ATTEMPT_MODE
  }`;

const clearAttemptArtifacts = (state, nextStatus = ATTEMPT_STATUS.IDLE) => ({
  ...state,
  attemptStatus: nextStatus,
  attemptKey: null,
  questions: [],
  answers: {},
  visited: {},
  markedForReview: {},
  bookmarkedQuestions: {},
  questionNotes: {},
  questionTimeSpent: {},
  currentPage: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  activeQuestionId: null,
  activeQuestionStartedAt: null,
  timer: getDefaultTimer(),
  tabSwitchCount: 0,
});

const getAttemptScope = (state) => ({
  subjectId: state.subject?.id,
  chapterId: state.chapter?.id,
  difficultyId: state.difficulty?.id,
});

const getExpectedAttemptKey = (state) => {
  const { subjectId, chapterId, difficultyId } = getAttemptScope(state);

  if (!subjectId || !chapterId || !difficultyId) {
    return "";
  }

  return composeAttemptKey({
    subjectId,
    chapterId,
    difficultyLevel: difficultyId,
    smartGoal: state.smartGoal,
    attemptMode: state.attemptMode,
  });
};

const hasValidPersistedInProgressAttempt = (state) => {
  const { subjectId, chapterId, difficultyId } = getAttemptScope(state);
  const normalizedAttemptKey = normalizeId(state.attemptKey);
  const normalizedAttemptTestId = normalizeId(state.attemptTestId);
  const expectedAttemptKey = getExpectedAttemptKey(state);
  const inferredTestId = buildAttemptTestId({
    subjectId,
    chapterId,
    difficultyId,
  });
  const endsAt = Number(state.timer?.endsAt || 0);

  if (!subjectId || !chapterId || !difficultyId) {
    return false;
  }

  if (normalizeAttemptStatus(state.attemptStatus) !== ATTEMPT_STATUS.IN_PROGRESS) {
    return false;
  }

  if (
    containsUnsafePathToken(subjectId) ||
    containsUnsafePathToken(chapterId) ||
    containsUnsafePathToken(difficultyId)
  ) {
    return false;
  }

  if (!normalizedAttemptKey || !expectedAttemptKey || normalizedAttemptKey !== expectedAttemptKey) {
    return false;
  }

  if (!inferredTestId) {
    return false;
  }

  if (!normalizedAttemptTestId || normalizedAttemptTestId !== inferredTestId) {
    return false;
  }

  if (!Array.isArray(state.questions) || state.questions.length === 0) {
    return false;
  }

  if (!Number.isFinite(endsAt) || endsAt <= Date.now()) {
    return false;
  }

  return true;
};

const sanitizeHydratedFlowState = (state) => {
  const activeScopeId = getActiveScopeId();
  if (normalizeId(state.ownerScopeId) !== normalizeId(activeScopeId)) {
    return {
      ...clearAttemptArtifacts(
        {
          ...state,
          ownerScopeId: activeScopeId,
        },
        ATTEMPT_STATUS.IDLE
      ),
      ownerScopeId: activeScopeId,
      attemptTestId: "",
    };
  }

  const nextAttemptMode = state.attemptMode || DEFAULT_ATTEMPT_MODE;
  const nextSmartGoal = normalizeSmartGoal(
    state.smartGoal,
    getGoalFromLegacyMode(nextAttemptMode, DEFAULT_SMART_TEST_GOAL)
  );
  const nextAttemptTestId = normalizeId(state.attemptTestId);
  const normalizedStatus = normalizeAttemptStatus(state.attemptStatus);

  const normalizedState = {
    ...state,
    attemptMode: nextAttemptMode,
    smartGoal: nextSmartGoal,
    attemptTestId: nextAttemptTestId,
    attemptStatus: normalizedStatus,
  };

  if (hasValidPersistedInProgressAttempt(normalizedState)) {
    return {
      ...normalizedState,
      attemptStatus: ATTEMPT_STATUS.IN_PROGRESS,
    };
  }

  if (normalizedStatus === ATTEMPT_STATUS.SUBMITTED && nextAttemptTestId) {
    return clearAttemptArtifacts(normalizedState, ATTEMPT_STATUS.SUBMITTED);
  }

  return {
    ...clearAttemptArtifacts(normalizedState, ATTEMPT_STATUS.IDLE),
    attemptTestId: "",
  };
};

const initialState = {
  ownerScopeId: getActiveScopeId(),
  subject: null,
  chapter: null,
  difficulty: null,
  attemptStatus: ATTEMPT_STATUS.IDLE,
  attemptTestId: "",
  attemptMode: DEFAULT_ATTEMPT_MODE,
  smartGoal: getGoalFromLegacyMode(DEFAULT_ATTEMPT_MODE, DEFAULT_SMART_TEST_GOAL),
  engineProfile: null,
  attemptKey: null,
  questions: [],
  answers: {},
  visited: {},
  markedForReview: {},
  bookmarkedQuestions: {},
  questionNotes: {},
  questionTimeSpent: {},
  currentPage: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  activeQuestionId: null,
  activeQuestionStartedAt: null,
  timer: getDefaultTimer(),
  tabSwitchCount: 0,
};

const getMaxPage = (totalQuestions, pageSize) => {
  if (!totalQuestions || !pageSize) return 1;
  return Math.max(Math.ceil(totalQuestions / pageSize), 1);
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const hasAnswerValue = (value) => value !== null && value !== undefined;

const commitActiveQuestionTiming = (state, now = Date.now()) => {
  const activeQuestionId = state.activeQuestionId;
  const startedAt = Number(state.activeQuestionStartedAt || 0);

  if (!activeQuestionId || !startedAt || now <= startedAt) {
    return state.questionTimeSpent;
  }

  const elapsedSeconds = Math.max(Math.round((now - startedAt) / 1000), 0);
  if (elapsedSeconds <= 0) {
    return state.questionTimeSpent;
  }

  return {
    ...state.questionTimeSpent,
    [activeQuestionId]: Number(state.questionTimeSpent[activeQuestionId] || 0) + elapsedSeconds,
  };
};

export const useTestFlowStore = create(
  persist(
    (set, get) => ({
      ...initialState,

      setAttemptMode: (attemptMode) =>
        set((state) => ({
          attemptMode: attemptMode || state.attemptMode || DEFAULT_ATTEMPT_MODE,
          smartGoal: getGoalFromLegacyMode(
            attemptMode || state.attemptMode || DEFAULT_ATTEMPT_MODE,
            state.smartGoal || DEFAULT_SMART_TEST_GOAL
          ),
        })),

      setSmartGoal: (smartGoal) =>
        set((state) => ({
          smartGoal: normalizeSmartGoal(
            smartGoal,
            state.smartGoal || DEFAULT_SMART_TEST_GOAL
          ),
        })),

      setSubject: (subject) =>
        set((state) => {
          if (state.subject?.id === subject?.id) {
            return state;
          }

          return {
            subject,
            chapter: null,
            difficulty: null,
            attemptStatus: ATTEMPT_STATUS.IDLE,
            attemptTestId: "",
            attemptMode: state.attemptMode || DEFAULT_ATTEMPT_MODE,
            smartGoal:
              state.smartGoal || getGoalFromLegacyMode(state.attemptMode, DEFAULT_SMART_TEST_GOAL),
            engineProfile: null,
            attemptKey: null,
            questions: [],
            answers: {},
            visited: {},
            markedForReview: {},
            bookmarkedQuestions: {},
            questionNotes: {},
            questionTimeSpent: {},
            currentPage: 1,
            activeQuestionId: null,
            activeQuestionStartedAt: null,
            timer: getDefaultTimer(),
            tabSwitchCount: 0,
          };
        }),

      setChapter: (chapter) =>
        set((state) => {
          if (state.chapter?.id === chapter?.id) {
            return state;
          }

          return {
            chapter,
            difficulty: null,
            attemptStatus: ATTEMPT_STATUS.IDLE,
            attemptTestId: "",
            attemptMode: state.attemptMode || DEFAULT_ATTEMPT_MODE,
            smartGoal:
              state.smartGoal || getGoalFromLegacyMode(state.attemptMode, DEFAULT_SMART_TEST_GOAL),
            engineProfile: null,
            attemptKey: null,
            questions: [],
            answers: {},
            visited: {},
            markedForReview: {},
            bookmarkedQuestions: {},
            questionNotes: {},
            questionTimeSpent: {},
            currentPage: 1,
            activeQuestionId: null,
            activeQuestionStartedAt: null,
            timer: getDefaultTimer(),
            tabSwitchCount: 0,
          };
        }),

      setDifficulty: (difficulty) =>
        set((state) => {
          if (state.difficulty?.id === difficulty?.id) {
            return state;
          }

          return {
            difficulty,
            attemptStatus: ATTEMPT_STATUS.IDLE,
            attemptTestId: "",
            attemptMode: state.attemptMode || DEFAULT_ATTEMPT_MODE,
            smartGoal:
              state.smartGoal || getGoalFromLegacyMode(state.attemptMode, DEFAULT_SMART_TEST_GOAL),
            engineProfile: null,
            attemptKey: null,
            questions: [],
            answers: {},
            visited: {},
            markedForReview: {},
            bookmarkedQuestions: {},
            questionNotes: {},
            questionTimeSpent: {},
            currentPage: 1,
            activeQuestionId: null,
            activeQuestionStartedAt: null,
            timer: getDefaultTimer(),
            tabSwitchCount: 0,
          };
        }),

      initializeAttempt: ({
        attemptKey,
        questions,
        durationSeconds,
        attemptMode,
        smartGoal,
        engineProfile,
      }) =>
        set((state) => {
          const now = Date.now();
          const firstQuestionId = questions[0]?.id ?? null;
          const attemptTestId = buildAttemptTestId({
            subjectId: state.subject?.id,
            chapterId: state.chapter?.id,
            difficultyId: state.difficulty?.id,
          });
          const seededBookmarks = questions.reduce((acc, question) => {
            if (question.isBookmarked) {
              acc[question.id] = true;
            }
            return acc;
          }, {});
          const seededNotes = questions.reduce((acc, question) => {
            if (question.note) {
              acc[question.id] = question.note;
            }
            return acc;
          }, {});

          return {
            attemptStatus: ATTEMPT_STATUS.IN_PROGRESS,
            attemptTestId,
            attemptKey,
            attemptMode: attemptMode || DEFAULT_ATTEMPT_MODE,
            smartGoal: normalizeSmartGoal(
              smartGoal,
              getGoalFromLegacyMode(attemptMode || DEFAULT_ATTEMPT_MODE, DEFAULT_SMART_TEST_GOAL)
            ),
            engineProfile: engineProfile || null,
            questions,
            answers: {},
            visited: firstQuestionId ? { [firstQuestionId]: true } : {},
            markedForReview: {},
            bookmarkedQuestions: seededBookmarks,
            questionNotes: seededNotes,
            questionTimeSpent: {},
            currentPage: 1,
            pageSize: DEFAULT_PAGE_SIZE,
            activeQuestionId: firstQuestionId,
            activeQuestionStartedAt: firstQuestionId ? now : null,
            timer: {
              durationSeconds,
              startedAt: now,
              endsAt: now + durationSeconds * 1000,
              timeLeft: durationSeconds,
            },
            tabSwitchCount: 0,
          };
        }),

      resetAttemptOnly: () =>
        set((state) => {
          const attemptTestId = normalizeId(state.attemptTestId);

          return {
            ...clearAttemptArtifacts(state, ATTEMPT_STATUS.SUBMITTED),
            attemptTestId,
            engineProfile: null,
          };
        }),

      resetFlow: () => set(() => ({ ...initialState })),

      setPageSize: (size) =>
        set((state) => {
          const parsedSize = Number(size);
          const nextSize = Number.isFinite(parsedSize) && parsedSize > 0 ? parsedSize : DEFAULT_PAGE_SIZE;
          const currentQuestionIndex = state.activeQuestionId
            ? state.questions.findIndex((item) => item.id === state.activeQuestionId)
            : 0;
          const baseIndex = currentQuestionIndex >= 0 ? currentQuestionIndex : 0;
          const nextPage = Math.floor(baseIndex / nextSize) + 1;

          if (state.pageSize === nextSize && state.currentPage === nextPage) {
            return state;
          }

          return {
            pageSize: nextSize,
            currentPage: nextPage,
          };
        }),

      setCurrentPage: (page) =>
        set((state) => {
          const now = Date.now();
          const maxPage = getMaxPage(state.questions.length, state.pageSize);
          const nextPage = clamp(Number(page) || 1, 1, maxPage);

          if (state.currentPage === nextPage) {
            return state;
          }

          const pageStartIndex = (nextPage - 1) * state.pageSize;
          const pageEndIndex = pageStartIndex + state.pageSize;
          const activeQuestionIndex = state.activeQuestionId
            ? state.questions.findIndex((item) => item.id === state.activeQuestionId)
            : -1;
          const isActiveInsideTargetPage =
            activeQuestionIndex >= pageStartIndex && activeQuestionIndex < pageEndIndex;

          if (isActiveInsideTargetPage) {
            return {
              currentPage: nextPage,
            };
          }

          const nextTimeSpent = commitActiveQuestionTiming(state, now);
          const pageAnchorQuestion = state.questions[pageStartIndex] || null;

          if (!pageAnchorQuestion) {
            return {
              currentPage: nextPage,
              questionTimeSpent: nextTimeSpent,
              activeQuestionId: null,
              activeQuestionStartedAt: null,
            };
          }

          return {
            currentPage: nextPage,
            questionTimeSpent: nextTimeSpent,
            activeQuestionId: pageAnchorQuestion.id,
            activeQuestionStartedAt: now,
            visited: {
              ...state.visited,
              [pageAnchorQuestion.id]: true,
            },
          };
        }),

      jumpToQuestion: (questionIndex) =>
        set((state) => {
          const now = Date.now();
          const nextTimeSpent = commitActiveQuestionTiming(state, now);
          const normalizedIndex = clamp(
            Number(questionIndex) || 0,
            0,
            Math.max(state.questions.length - 1, 0)
          );
          const targetQuestion = state.questions[normalizedIndex];
          if (!targetQuestion) return state;

          const nextPage = Math.floor(normalizedIndex / state.pageSize) + 1;
          const alreadyVisited = Boolean(state.visited[targetQuestion.id]);

          if (
            state.activeQuestionId === targetQuestion.id &&
            state.currentPage === nextPage &&
            alreadyVisited
          ) {
            return state;
          }

          return {
            activeQuestionId: targetQuestion.id,
            activeQuestionStartedAt: now,
            questionTimeSpent: nextTimeSpent,
            currentPage: nextPage,
            visited: {
              ...state.visited,
              [targetQuestion.id]: true,
            },
          };
        }),

      selectAnswer: (questionId, optionId) =>
        set((state) => {
          const now = Date.now();
          const nextTimeSpent =
            state.activeQuestionId !== questionId
              ? commitActiveQuestionTiming(state, now)
              : state.questionTimeSpent;

          return {
            answers: {
              ...state.answers,
              [questionId]: optionId,
            },
            visited: {
              ...state.visited,
              [questionId]: true,
            },
            activeQuestionId: questionId,
            activeQuestionStartedAt: now,
            questionTimeSpent: nextTimeSpent,
          };
        }),

      clearAnswer: (questionId) =>
        set((state) => {
          const now = Date.now();
          const nextTimeSpent =
            state.activeQuestionId !== questionId
              ? commitActiveQuestionTiming(state, now)
              : state.questionTimeSpent;
          const nextAnswers = { ...state.answers };
          delete nextAnswers[questionId];

          return {
            answers: nextAnswers,
            activeQuestionId: questionId,
            activeQuestionStartedAt: now,
            questionTimeSpent: nextTimeSpent,
          };
        }),

      toggleMarkForReview: (questionId) =>
        set((state) => {
          const now = Date.now();
          const nextTimeSpent =
            state.activeQuestionId !== questionId
              ? commitActiveQuestionTiming(state, now)
              : state.questionTimeSpent;
          const next = { ...state.markedForReview };
          if (next[questionId]) {
            delete next[questionId];
          } else {
            next[questionId] = true;
          }

          return {
            markedForReview: next,
            activeQuestionId: questionId,
            activeQuestionStartedAt: now,
            questionTimeSpent: nextTimeSpent,
          };
        }),

      toggleBookmark: (questionId) =>
        set((state) => {
          const next = { ...state.bookmarkedQuestions };
          if (next[questionId]) {
            delete next[questionId];
          } else {
            next[questionId] = true;
          }

          return {
            bookmarkedQuestions: next,
          };
        }),

      setQuestionNote: (questionId, note) =>
        set((state) => {
          const normalized = String(note || "").trim();
          const next = { ...state.questionNotes };

          if (!normalized) {
            delete next[questionId];
          } else {
            next[questionId] = normalized;
          }

          return {
            questionNotes: next,
          };
        }),

      setActiveQuestionId: (questionId) =>
        set((state) => {
          const now = Date.now();
          const nextTimeSpent =
            state.activeQuestionId !== questionId
              ? commitActiveQuestionTiming(state, now)
              : state.questionTimeSpent;
          const alreadyVisited = Boolean(state.visited[questionId]);

          if (state.activeQuestionId === questionId && alreadyVisited) {
            return state;
          }

          return {
            activeQuestionId: questionId,
            activeQuestionStartedAt: now,
            questionTimeSpent: nextTimeSpent,
            visited: {
              ...state.visited,
              [questionId]: true,
            },
          };
        }),

      finalizeQuestionTiming: () =>
        set((state) => {
          const now = Date.now();

          return {
            questionTimeSpent: commitActiveQuestionTiming(state, now),
            activeQuestionStartedAt: state.activeQuestionId ? now : null,
          };
        }),

      syncTimer: () => {
        const endsAt = get().timer.endsAt;
        if (!endsAt) return 0;

        const nextTimeLeft = Math.max(Math.ceil((endsAt - Date.now()) / 1000), 0);
        set((state) => {
          if (state.timer.timeLeft === nextTimeLeft) {
            return state;
          }

          return {
            timer: {
              ...state.timer,
              timeLeft: nextTimeLeft,
            },
          };
        });

        return nextTimeLeft;
      },

      incrementTabSwitchCount: () =>
        set((state) => ({
          tabSwitchCount: state.tabSwitchCount + 1,
        })),
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({
        ownerScopeId: state.ownerScopeId,
        subject: state.subject,
        chapter: state.chapter,
        difficulty: state.difficulty,
        attemptStatus: state.attemptStatus,
        attemptTestId: state.attemptTestId,
        attemptMode: state.attemptMode,
        smartGoal: state.smartGoal,
        engineProfile: state.engineProfile,
        attemptKey: state.attemptKey,
        questions: state.questions,
        answers: state.answers,
        visited: state.visited,
        markedForReview: state.markedForReview,
        bookmarkedQuestions: state.bookmarkedQuestions,
        questionNotes: state.questionNotes,
        questionTimeSpent: state.questionTimeSpent,
        currentPage: state.currentPage,
        pageSize: state.pageSize,
        activeQuestionId: state.activeQuestionId,
        activeQuestionStartedAt: state.activeQuestionStartedAt,
        timer: state.timer,
        tabSwitchCount: state.tabSwitchCount,
      }),
      version: 6,
      storage: safePersistStorage,
      merge: (persistedState, currentState) =>
        sanitizeHydratedFlowState({
          ...currentState,
          ...(persistedState || {}),
        }),
    }
  )
);

export const selectAttemptStats = (state) => {
  const attempted = Object.values(state.answers).filter(hasAnswerValue).length;
  const totalQuestions = state.questions.length;
  const notAnswered = Math.max(totalQuestions - attempted, 0);
  const reviewMarked = state.questions.reduce(
    (acc, question) => acc + (state.markedForReview[question.id] ? 1 : 0),
    0
  );
  const visitedCount = state.questions.reduce(
    (acc, question) => acc + (state.visited[question.id] ? 1 : 0),
    0
  );
  const progress = totalQuestions ? Math.round((attempted / totalQuestions) * 100) : 0;

  return {
    totalQuestions,
    attempted,
    notAnswered,
    reviewMarked,
    visitedCount,
    progress,
  };
};

export const getAttemptKey = ({
  subjectId,
  chapterId,
  difficultyLevel,
  attemptMode,
  smartGoal,
}) =>
  composeAttemptKey({
    subjectId,
    chapterId,
    difficultyLevel,
    attemptMode,
    smartGoal,
  });
