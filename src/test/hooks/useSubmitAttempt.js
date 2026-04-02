import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { submitMcqAttempt } from "../services/testService";
import { useTestFlowStore } from "../store/testFlowStore";
import { TEST_STORAGE_KEYS } from "../../utils/constants";
import { loadFromStorage, saveToStorage } from "../../utils/helpers";
import { ROUTES } from "../../routes/routePaths";
import { useAppToast } from "../../components/notifications/useAppToast";
import { syncLearningArtifactsFromAttempt } from "../../services/learningAnalyticsService";
import { useAuthStore } from "../../store/authStore";

export const useSubmitAttempt = () => {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const { pushToast } = useAppToast();

  const resetAttemptOnly = useTestFlowStore((state) => state.resetAttemptOnly);
  const finalizeQuestionTiming = useTestFlowStore((state) => state.finalizeQuestionTiming);

  const submitAttempt = useCallback(
    async ({ autoSubmitted = false }) => {
      finalizeQuestionTiming();

      const { subject, chapter, difficulty, questions, answers, timer } =
        useTestFlowStore.getState();
      const {
        attemptMode,
        smartGoal,
        questionTimeSpent,
        bookmarkedQuestions,
        questionNotes,
      } = useTestFlowStore.getState();
      const currentUser = useAuthStore.getState().user;

      if (!subject || !chapter || !difficulty || !questions.length) {
        throw new Error("Attempt context is incomplete. Please restart the test.");
      }

      setSubmitting(true);
      setSubmitError("");

      try {
        const duration = Number(timer.durationSeconds) || 0;
        const timeLeft = Number(timer.timeLeft) || 0;
        const timeTakenSeconds = Math.max(duration - timeLeft, 0);

        const result = await submitMcqAttempt({
          subjectId: subject.id,
          chapterId: chapter.id,
          difficultyLevel: difficulty.id,
          userId: currentUser?.id,
          attemptMode,
          smartGoal,
          answers,
          questions,
          totalDurationSeconds: duration,
          timeTakenSeconds,
          questionTimeSpent,
        });

        saveToStorage(TEST_STORAGE_KEYS.LAST_RESULT, result);

        const previousHistory = loadFromStorage(TEST_STORAGE_KEYS.RESULT_HISTORY, []);
        const normalizedHistory = Array.isArray(previousHistory) ? previousHistory : [];
        const nextHistory = [result, ...normalizedHistory].slice(0, 50);
        saveToStorage(TEST_STORAGE_KEYS.RESULT_HISTORY, nextHistory);

        syncLearningArtifactsFromAttempt({
          result,
          questionTimeSpent,
          bookmarkedQuestions,
          questionNotes,
          attemptMode,
        });

        resetAttemptOnly();

        pushToast({
          title: "Assessment submitted",
          message: `Score: ${result.metrics?.scorePercent ?? 0}% (${String(
            smartGoal || attemptMode || "exam"
          )
            .replace(/-/g, " ")
            .toUpperCase()} goal)`,
          tone: "success",
        });

        navigate(ROUTES.assessment.result, {
          state: {
            result,
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
