import { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { submitMcqAttempt } from "../services/testService";
import { useTestFlowStore } from "../store/testFlowStore";
import { TEST_STORAGE_KEYS } from "../../utils/constants";
import { loadFromStorage, saveToStorage } from "../../utils/helpers";
import {
  loadScopedFromStorage,
  resolveStorageScopeId,
  saveScopedToStorage,
} from "../../utils/storageScope";
import { ROUTES } from "../../routes/routePaths";
import { useAppToast } from "../../components/notifications/useAppToast";
import { syncLearningArtifactsFromAttempt } from "../../services/learningAnalyticsService";
import { useAuthStore } from "../../store/authStore";
import { ATTEMPT_STATUS } from "../utils/attemptResume";

export const useSubmitAttempt = () => {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const submitInFlightRef = useRef(false);
  const { pushToast } = useAppToast();

  const resetAttemptOnly = useTestFlowStore((state) => state.resetAttemptOnly);
  const finalizeQuestionTiming = useTestFlowStore((state) => state.finalizeQuestionTiming);

  const submitAttempt = useCallback(
    async ({ autoSubmitted = false }) => {
      if (submitInFlightRef.current) {
        return;
      }

      const attemptSnapshot = useTestFlowStore.getState();
      if (attemptSnapshot.attemptStatus !== ATTEMPT_STATUS.IN_PROGRESS) {
        return;
      }

      submitInFlightRef.current = true;
      finalizeQuestionTiming();
      try {
        const {
          subject,
          chapter,
          difficulty,
          questions,
          answers,
          timer,
          attemptMode,
          smartGoal,
          questionTimeSpent,
          bookmarkedQuestions,
          questionNotes,
        } = useTestFlowStore.getState();
        const currentUser = useAuthStore.getState().user;
        const userScopeId = resolveStorageScopeId(currentUser);

        if (!subject || !chapter || !difficulty || !questions.length) {
          throw new Error("Attempt context is incomplete. Please restart the test.");
        }

        setSubmitting(true);
        setSubmitError("");

        const duration = Number(timer.durationSeconds) || 0;
        const timeLeft = Number(timer.timeLeft) || 0;
        const timeTakenSeconds = Math.max(duration - timeLeft, 0);

        const result = await submitMcqAttempt({
          subjectId: subject.id,
          chapterId: chapter.id,
          difficultyLevel: difficulty.id,
          userId: userScopeId,
          attemptMode,
          smartGoal,
          answers,
          questions,
          totalDurationSeconds: duration,
          timeTakenSeconds,
          questionTimeSpent,
        });

        const scopedResult = {
          ...result,
          userId: userScopeId,
        };

        saveScopedToStorage(TEST_STORAGE_KEYS.LAST_RESULT, scopedResult, userScopeId);

        const previousScopedHistory = loadScopedFromStorage(
          TEST_STORAGE_KEYS.RESULT_HISTORY,
          [],
          {
            scopeId: userScopeId,
            migrateLegacy: false,
          }
        );
        const normalizedScopedHistory = Array.isArray(previousScopedHistory)
          ? previousScopedHistory
          : [];
        const nextScopedHistory = [scopedResult, ...normalizedScopedHistory].slice(0, 50);
        saveScopedToStorage(TEST_STORAGE_KEYS.RESULT_HISTORY, nextScopedHistory, userScopeId);

        const previousGlobalHistory = loadFromStorage(TEST_STORAGE_KEYS.RESULT_HISTORY, []);
        const normalizedGlobalHistory = Array.isArray(previousGlobalHistory)
          ? previousGlobalHistory
          : [];
        const nextGlobalHistory = [scopedResult, ...normalizedGlobalHistory].slice(0, 500);
        saveToStorage(TEST_STORAGE_KEYS.RESULT_HISTORY, nextGlobalHistory);

        syncLearningArtifactsFromAttempt({
          result: scopedResult,
          questionTimeSpent,
          bookmarkedQuestions,
          questionNotes,
          attemptMode,
        });

        resetAttemptOnly();

        pushToast({
          title: "Assessment submitted",
          message: `Score: ${scopedResult.metrics?.scorePercent ?? 0}% (${String(
            smartGoal || attemptMode || "exam"
          )
            .replace(/-/g, " ")
            .toUpperCase()} goal)`,
          tone: "success",
        });

        navigate(ROUTES.assessment.result, {
          state: {
            result: scopedResult,
            autoSubmitted,
          },
          replace: true,
        });
      } catch (error) {
        const message = error?.message || "Unable to submit attempt. Please retry.";
        setSubmitError(message);
        pushToast({
          title: "Submission failed",
          message,
          tone: "error",
        });
        throw error;
      } finally {
        submitInFlightRef.current = false;
        setSubmitting(false);
      }
    },
    [finalizeQuestionTiming, navigate, pushToast, resetAttemptOnly]
  );

  return {
    submitAttempt,
    submitting,
    submitError,
    clearSubmitError: () => setSubmitError(""),
  };
};
