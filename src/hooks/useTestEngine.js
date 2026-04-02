import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import { TEST_STORAGE_KEYS } from "../utils/constants";
import {
  toQuestionId,
} from "../utils/helpers";
import {
  loadScopedFromStorage,
  removeScopedFromStorage,
  resolveStorageScopeId,
  saveScopedToStorage,
} from "../utils/storageScope";
import { useAuthStore } from "../store/authStore";

const initialState = {
  subject: null,
  questions: [],
  currentIndex: 0,
  answers: {},
  visited: {},
  markedForReview: {},
  timer: {
    duration: 0,
    timeLeft: 0,
    endsAt: null,
  },
  isSubmitting: false,
};

const testReducer = (state, action) => {
  switch (action.type) {
    case "START_TEST": {
      const firstQuestion = action.payload.questions[0];
      const firstQuestionId = firstQuestion ? toQuestionId(firstQuestion.id) : null;

      return {
        ...state,
        subject: action.payload.subject,
        questions: action.payload.questions,
        currentIndex: 0,
        answers: {},
        visited: firstQuestionId ? { [firstQuestionId]: true } : {},
        markedForReview: {},
        timer: {
          duration: action.payload.duration,
          timeLeft: action.payload.duration,
          endsAt: Date.now() + action.payload.duration * 1000,
        },
        isSubmitting: false,
      };
    }

    case "RESTORE_SESSION": {
      return {
        ...state,
        ...action.payload,
        isSubmitting: false,
      };
    }

    case "GO_TO_QUESTION": {
      const targetQuestion = state.questions[action.payload];
      const targetQuestionId = targetQuestion ? toQuestionId(targetQuestion.id) : null;

      return {
        ...state,
        currentIndex: action.payload,
        visited: targetQuestionId
          ? {
              ...state.visited,
              [targetQuestionId]: true,
            }
          : state.visited,
      };
    }

    case "SET_ANSWER": {
      const { questionId, optionId } = action.payload;
      return {
        ...state,
        answers: {
          ...state.answers,
          [toQuestionId(questionId)]: optionId,
        },
      };
    }

    case "CLEAR_ANSWER": {
      const nextAnswers = { ...state.answers };
      delete nextAnswers[toQuestionId(action.payload)];

      return {
        ...state,
        answers: nextAnswers,
      };
    }

    case "TOGGLE_MARK_FOR_REVIEW": {
      const key = toQuestionId(action.payload);
      const next = { ...state.markedForReview };

      if (next[key]) {
        delete next[key];
      } else {
        next[key] = true;
      }

      return {
        ...state,
        markedForReview: next,
      };
    }

    case "SET_TIMER": {
      return {
        ...state,
        timer: {
          ...state.timer,
          timeLeft: action.payload,
        },
      };
    }

    case "SET_SUBMITTING":
      return {
        ...state,
        isSubmitting: action.payload,
      };

    case "RESET_TEST":
      return initialState;

    default:
      return state;
  }
};

export const useTestEngine = ({ onTimeout } = {}) => {
  const [state, dispatch] = useReducer(testReducer, initialState);
  const timeoutTriggeredRef = useRef(false);

  const currentQuestion = useMemo(
    () => state.questions[state.currentIndex] ?? null,
    [state.currentIndex, state.questions]
  );

  const {
    subject,
    questions,
    currentIndex,
    answers,
    visited,
    markedForReview,
    timer,
  } = state;

  const hasQuestions = state.questions.length > 0;

  useEffect(() => {
    if (!hasQuestions || !state.timer.endsAt) return;

    const syncTimer = () => {
      const nextTime = Math.max(
        Math.ceil((state.timer.endsAt - Date.now()) / 1000),
        0
      );
      dispatch({ type: "SET_TIMER", payload: nextTime });
    };

    syncTimer();
    const timerId = window.setInterval(syncTimer, 1000);

    return () => window.clearInterval(timerId);
  }, [hasQuestions, state.timer.endsAt]);

  useEffect(() => {
    if (!hasQuestions || state.timer.timeLeft !== 0 || timeoutTriggeredRef.current) return;

    timeoutTriggeredRef.current = true;
    onTimeout?.();
  }, [hasQuestions, onTimeout, state.timer.timeLeft]);

  useEffect(() => {
    if (!hasQuestions) return;

    const scopeId = resolveStorageScopeId(useAuthStore.getState().user);

    saveScopedToStorage(TEST_STORAGE_KEYS.SESSION, {
      subject,
      questions,
      currentIndex,
      answers,
      visited,
      markedForReview,
      timer,
      savedAt: new Date().toISOString(),
    }, scopeId);
  }, [
    answers,
    currentIndex,
    hasQuestions,
    markedForReview,
    questions,
    subject,
    timer,
    visited,
  ]);

  const loadSession = useCallback(() => {
    const scopeId = resolveStorageScopeId(useAuthStore.getState().user);
    const session = loadScopedFromStorage(TEST_STORAGE_KEYS.SESSION, null, {
      scopeId,
      migrateLegacy: false,
    });
    if (!session?.questions?.length) return null;

    const remaining = Math.max(
      Math.ceil((Number(session.timer?.endsAt) - Date.now()) / 1000),
      0
    );

    if (remaining <= 0) {
      removeScopedFromStorage(TEST_STORAGE_KEYS.SESSION, scopeId);
      return null;
    }

    return {
      ...session,
      timer: {
        ...session.timer,
        timeLeft: remaining,
      },
    };
  }, []);

  const restoreSession = useCallback((session) => {
    timeoutTriggeredRef.current = false;
    dispatch({ type: "RESTORE_SESSION", payload: session });
  }, []);

  const startTest = useCallback(({ subject, questions, duration }) => {
    timeoutTriggeredRef.current = false;
    dispatch({
      type: "START_TEST",
      payload: {
        subject,
        questions,
        duration,
      },
    });
  }, []);

  const goToQuestion = useCallback(
    (index) => {
      if (index < 0 || index >= state.questions.length) return;
      dispatch({ type: "GO_TO_QUESTION", payload: index });
    },
    [state.questions.length]
  );

  const goNext = useCallback(() => {
    goToQuestion(Math.min(state.currentIndex + 1, state.questions.length - 1));
  }, [goToQuestion, state.currentIndex, state.questions.length]);

  const goPrevious = useCallback(() => {
    goToQuestion(Math.max(state.currentIndex - 1, 0));
  }, [goToQuestion, state.currentIndex]);

  const setAnswer = useCallback((questionId, optionId) => {
    dispatch({
      type: "SET_ANSWER",
      payload: {
        questionId,
        optionId,
      },
    });
  }, []);

  const clearAnswer = useCallback((questionId) => {
    dispatch({ type: "CLEAR_ANSWER", payload: questionId });
  }, []);

  const toggleMarkForReview = useCallback((questionId) => {
    dispatch({ type: "TOGGLE_MARK_FOR_REVIEW", payload: questionId });
  }, []);

  const setSubmitting = useCallback((value) => {
    dispatch({ type: "SET_SUBMITTING", payload: value });
  }, []);

  const resetTest = useCallback(() => {
    const scopeId = resolveStorageScopeId(useAuthStore.getState().user);
    removeScopedFromStorage(TEST_STORAGE_KEYS.SESSION, scopeId);
    dispatch({ type: "RESET_TEST" });
  }, []);

  const clearSavedSession = useCallback(() => {
    const scopeId = resolveStorageScopeId(useAuthStore.getState().user);
    removeScopedFromStorage(TEST_STORAGE_KEYS.SESSION, scopeId);
  }, []);

  return {
    state,
    currentQuestion,
    hasQuestions,
    startTest,
    loadSession,
    restoreSession,
    goNext,
    goPrevious,
    goToQuestion,
    setAnswer,
    clearAnswer,
    toggleMarkForReview,
    setSubmitting,
    resetTest,
    clearSavedSession,
  };
};
