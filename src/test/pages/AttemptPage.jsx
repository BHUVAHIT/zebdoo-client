import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useShallow } from "zustand/react/shallow";
import AttemptQuestionCard from "../components/AttemptQuestionCard";
import { LiveAttemptTimer } from "../components/AttemptTimer";
import EmptyState from "../components/EmptyState";
import LoadingState from "../components/LoadingState";
import PaginationControls from "../components/PaginationControls";
import QuestionPalette from "../components/QuestionPalette";
import SubmitConfirmationModal from "../components/SubmitConfirmationModal";
import TestStepHeader from "../components/TestStepHeader";
import { useAttemptTimer } from "../hooks/useAttemptTimer";
import { useSubmitAttempt } from "../hooks/useSubmitAttempt";
import { ButtonBusyLabel } from "../../components/loading/LoadingPrimitives";
import { useAppToast } from "../../components/notifications/useAppToast";
import {
  getChapterById,
  getDifficultyLevels,
  getMcqQuestions,
  getSubjectById,
} from "../services/testService";
import {
  getAttemptKey,
  selectAttemptStats,
  useTestFlowStore,
} from "../store/testFlowStore";
import {
  buildAttemptSnapshot,
  buildAttemptTestId,
  isValidAttempt,
} from "../utils/attemptResume";
import { routeBuilders } from "../../routes/routePaths";
import {
  getAdaptiveDifficultyRecommendation,
} from "../../services/learningAnalyticsService";
import {
  getSmartGoalProfile,
  SMART_TEST_GOALS,
} from "../config/smartTestEngine";
import { TEST_MODES } from "../../utils/constants";
import { useCatalogStore } from "../../store/catalogStore";
import { useAuthStore } from "../../store/authStore";
import { TEST_STORAGE_KEYS } from "../../utils/constants";
import { formatSeconds } from "../../utils/helpers";
import {
  loadScopedFromStorage,
  resolveStorageScopeId,
} from "../../utils/storageScope";
import { buildPreTestBriefing } from "../utils/performanceInsights";

const AttemptPage = () => {
  const { subjectId, chapterId, difficultyLevel } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const normalizedDifficultyLevel = String(difficultyLevel || "").trim().toLowerCase();
  const currentGoal = String(searchParams.get("goal") || "").trim().toLowerCase();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [validationError, setValidationError] = useState("");
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [tabWarning, setTabWarning] = useState("");
  const catalogVersion = useCatalogStore((state) => state.version);
  const catalogVersionRef = useRef(catalogVersion);
  const { pushToast } = useAppToast();
  const currentUser = useAuthStore((state) => state.user);
  const scopeId = resolveStorageScopeId(currentUser);

  const scopedHistory = useMemo(
    () =>
      loadScopedFromStorage(TEST_STORAGE_KEYS.RESULT_HISTORY, [], {
        scopeId,
        migrateLegacy: false,
      }),
    [scopeId]
  );

  const {
    subject,
    chapter,
    difficulty,
    engineProfile,
    questions,
    answers,
    visited,
    markedForReview,
    bookmarkedQuestions,
    questionNotes,
    questionTimeSpent,
    currentPage,
    pageSize,
    activeQuestionId,
    tabSwitchCount,
    setSubject,
    setChapter,
    setDifficulty,
    setAttemptMode,
    setSmartGoal,
    initializeAttempt,
    setCurrentPage,
    setPageSize,
    jumpToQuestion,
    selectAnswer,
    clearAnswer,
    toggleMarkForReview,
    toggleBookmark,
    setQuestionNote,
    setActiveQuestionId,
    incrementTabSwitchCount,
    resetFlow,
  } = useTestFlowStore(
    useShallow((state) => ({
      subject: state.subject,
      chapter: state.chapter,
      difficulty: state.difficulty,
      engineProfile: state.engineProfile,
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
      tabSwitchCount: state.tabSwitchCount,
      setSubject: state.setSubject,
      setChapter: state.setChapter,
      setDifficulty: state.setDifficulty,
      setAttemptMode: state.setAttemptMode,
      setSmartGoal: state.setSmartGoal,
      initializeAttempt: state.initializeAttempt,
      setCurrentPage: state.setCurrentPage,
      setPageSize: state.setPageSize,
      jumpToQuestion: state.jumpToQuestion,
      selectAnswer: state.selectAnswer,
      clearAnswer: state.clearAnswer,
      toggleMarkForReview: state.toggleMarkForReview,
      toggleBookmark: state.toggleBookmark,
      setQuestionNote: state.setQuestionNote,
      setActiveQuestionId: state.setActiveQuestionId,
      incrementTabSwitchCount: state.incrementTabSwitchCount,
      resetFlow: state.resetFlow,
    }))
  );

  const adaptiveDifficulty = useMemo(
    () =>
      getAdaptiveDifficultyRecommendation({ subjectId, chapterId }) || {
        difficultyId: "medium",
        reason: "Starting with medium is ideal for baseline calibration.",
      },
    [chapterId, subjectId]
  );

  const effectiveSmartGoal = SMART_TEST_GOALS.EXAM_SIMULATION;

  const goalProfile = useMemo(
    () => getSmartGoalProfile(effectiveSmartGoal),
    [effectiveSmartGoal]
  );

  const effectiveProfile =
    engineProfile?.id === SMART_TEST_GOALS.EXAM_SIMULATION ? engineProfile : goalProfile;
  const effectiveAttemptMode = TEST_MODES.EXAM;
  const activeGoalLabel = effectiveProfile.label;
  const recommendedGoalLabel = goalProfile.label;

  const preTestBriefing = useMemo(
    () =>
      buildPreTestBriefing({
        history: scopedHistory,
        subject,
        chapter,
        difficulty,
        plannedDurationSeconds: Math.round(
          Number(difficulty?.durationSeconds || 0) *
            Number(effectiveProfile?.timerMultiplier || 1)
        ),
      }),
    [chapter, difficulty, effectiveProfile?.timerMultiplier, scopedHistory, subject]
  );

  const stats = useTestFlowStore(useShallow(selectAttemptStats));
  const { submitAttempt, submitting, submitError, clearSubmitError } = useSubmitAttempt();

  const routeAttemptKey = getAttemptKey({
    subjectId,
    chapterId,
    difficultyLevel: normalizedDifficultyLevel,
    smartGoal: effectiveSmartGoal,
    attemptMode: effectiveAttemptMode,
  });

  const totalPages = useMemo(
    () => Math.max(Math.ceil(questions.length / pageSize), 1),
    [pageSize, questions.length]
  );

  const visibleQuestions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return questions.slice(start, start + pageSize);
  }, [currentPage, pageSize, questions]);

  const reloadAttempt = useCallback(async () => {
    if (!subjectId || !chapterId || !normalizedDifficultyLevel) {
      navigate(routeBuilders.assessmentSession.root, { replace: true });
      return;
    }

    const snapshot = useTestFlowStore.getState();
    const expectedAttemptTestId = buildAttemptTestId({
      subjectId,
      chapterId,
      difficultyId: normalizedDifficultyLevel,
    });
    const attemptSnapshot = buildAttemptSnapshot({
      id: snapshot.attemptKey,
      expectedId: routeAttemptKey,
      testId: snapshot.attemptTestId,
      status: snapshot.attemptStatus,
      endsAt: snapshot.timer?.endsAt,
      hasQuestions: Array.isArray(snapshot.questions) && snapshot.questions.length > 0,
    });
    const hasReusableTime =
      effectiveProfile.autoSubmitOnTimeout
        ? Number(snapshot.timer.endsAt || 0) > Date.now()
        : true;

    const canReuseAttempt =
      Boolean(expectedAttemptTestId) &&
      snapshot.attemptTestId === expectedAttemptTestId &&
      isValidAttempt(attemptSnapshot) &&
      hasReusableTime;

    if (canReuseAttempt) {
      useTestFlowStore.getState().syncTimer();
      setLoadError("");
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError("");

    try {
      const [resolvedSubject, resolvedChapter, levels] = await Promise.all([
        getSubjectById(subjectId),
        getChapterById(subjectId, chapterId),
        getDifficultyLevels({ subjectId, chapterId }),
      ]);

      const resolvedDifficulty = levels.find(
        (item) => String(item.id || "").toLowerCase() === normalizedDifficultyLevel
      );
      if (!resolvedDifficulty) {
        throw new Error("Selected difficulty does not exist.");
      }

      if (snapshot.subject?.id !== resolvedSubject.id) {
        setSubject(resolvedSubject);
      }
      if (snapshot.chapter?.id !== resolvedChapter.id) {
        setChapter(resolvedChapter);
      }
      if (snapshot.difficulty?.id !== resolvedDifficulty.id) {
        setDifficulty(resolvedDifficulty);
      }

      const payload = await getMcqQuestions({
        subjectId: resolvedSubject.id,
        chapterId: resolvedChapter.id,
        difficultyLevel: resolvedDifficulty.id,
        smartGoal: effectiveSmartGoal,
        attemptMode: effectiveAttemptMode,
      });

      if (!Array.isArray(payload?.questions) || payload.questions.length === 0) {
        throw new Error("Question set unavailable for selected configuration.");
      }

      setAttemptMode(payload.attemptMode || effectiveAttemptMode);
      setSmartGoal(payload.smartGoal || effectiveSmartGoal);

      initializeAttempt({
        attemptKey: routeAttemptKey,
        questions: payload.questions,
        durationSeconds: payload.durationSeconds,
        attemptMode: payload.attemptMode || effectiveAttemptMode,
        smartGoal: payload.smartGoal || effectiveSmartGoal,
        engineProfile: payload.goalProfile || effectiveProfile,
      });
    } catch (requestError) {
      setLoadError(requestError.message || "Unable to load test attempt.");
    } finally {
      setLoading(false);
    }
  }, [
    chapterId,
    effectiveAttemptMode,
    effectiveProfile,
    effectiveSmartGoal,
    initializeAttempt,
    navigate,
    normalizedDifficultyLevel,
    routeAttemptKey,
    setAttemptMode,
    setChapter,
    setDifficulty,
    setSmartGoal,
    setSubject,
    subjectId,
  ]);

  useEffect(() => {
    reloadAttempt();
  }, [reloadAttempt]);

  useEffect(() => {
    if (!subjectId || !chapterId || !normalizedDifficultyLevel) return;
    if (currentGoal === SMART_TEST_GOALS.EXAM_SIMULATION) return;

    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("goal", SMART_TEST_GOALS.EXAM_SIMULATION);

    navigate(
      `${routeBuilders.assessmentSession.attempt(
        subjectId,
        chapterId,
        normalizedDifficultyLevel
      )}?${nextParams.toString()}`,
      { replace: true }
    );
  }, [chapterId, currentGoal, navigate, normalizedDifficultyLevel, searchParams, subjectId]);

  useEffect(() => {
    if (loading || submitting || !questions.length) return undefined;

    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [loading, questions.length, submitting]);

  useEffect(() => {
    const questionNumber = Number(searchParams.get("q"));
    if (!Number.isFinite(questionNumber)) return;
    const targetIndex = questionNumber - 1;
    if (targetIndex < 0 || targetIndex >= questions.length) return;
    jumpToQuestion(targetIndex);
  }, [jumpToQuestion, questions.length, searchParams]);

  useEffect(() => {
    if (!questions.length) return undefined;

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "hidden") return;

      incrementTabSwitchCount();
      setTabWarning("Tab switch detected. Keep focus to avoid missing timer updates.");
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [incrementTabSwitchCount, questions.length]);

  useEffect(() => {
    if (!tabWarning) return undefined;
    const timeoutId = window.setTimeout(() => setTabWarning(""), 3600);
    return () => window.clearTimeout(timeoutId);
  }, [tabWarning]);

  useEffect(() => {
    if (!questions.length) {
      catalogVersionRef.current = catalogVersion;
      return;
    }

    if (!catalogVersionRef.current) {
      catalogVersionRef.current = catalogVersion;
      return;
    }

    if (catalogVersionRef.current === catalogVersion) {
      return;
    }

    catalogVersionRef.current = catalogVersion;
    const hasAttemptProgress = stats.attempted > 0 || stats.visitedCount > 1;

    if (!hasAttemptProgress && !submitting) {
      resetFlow();
      pushToast({
        title: "Exam updated",
        message: "Super Admin updated this exam. The latest configuration has been loaded.",
        tone: "info",
      });
      void reloadAttempt();
      return;
    }

    pushToast({
      title: "Exam settings changed",
      message:
        "Your current attempt is preserved, and latest settings apply from your next attempt.",
      tone: "warning",
    });
  }, [
    catalogVersion,
    pushToast,
    questions.length,
    reloadAttempt,
    resetFlow,
    stats.attempted,
    stats.visitedCount,
    submitting,
  ]);

  const runSubmit = useCallback(
    async (autoSubmitted) => {
      clearSubmitError();
      setValidationError("");

      if (!autoSubmitted && stats.attempted === 0) {
        const message = "Please answer at least one question before submitting.";
        setValidationError(message);
        pushToast({
          title: "Cannot submit yet",
          message: "Select an option for any question, then submit again.",
          tone: "warning",
        });
        return;
      }

      try {
        await submitAttempt({ autoSubmitted });
      } catch {
        setShowSubmitConfirm(false);
      }
    },
    [
      clearSubmitError,
      pushToast,
      setShowSubmitConfirm,
      setValidationError,
      stats.attempted,
      submitAttempt,
    ]
  );

  const handleAutoSubmit = useCallback(() => {
    runSubmit(true);
  }, [runSubmit]);

  useAttemptTimer({
    enabled: !loading && questions.length > 0 && effectiveProfile.autoSubmitOnTimeout,
    onTimeout: handleAutoSubmit,
  });

  const handleQuestionJump = useCallback(
    (index) => {
      jumpToQuestion(index);
      window.setTimeout(() => {
        const node = document.getElementById(`question-${index + 1}`);
        node?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 60);
    },
    [jumpToQuestion]
  );

  if (loading) {
    return <LoadingState label="Preparing your test attempt..." />;
  }

  if (loadError) {
    return (
      <EmptyState
        title="Unable to start test"
        description={loadError}
        actionLabel="Retry"
        onAction={reloadAttempt}
        isError
      />
    );
  }

  if (!questions.length) {
    return (
      <EmptyState
        title="Question set unavailable"
        description="No questions were generated for this combination."
        actionLabel="Back to Difficulty"
        onAction={() =>
          navigate(routeBuilders.assessmentSession.difficulty(subjectId, chapterId))
        }
      />
    );
  }

  return (
    <section className="mcq-attempt-page">
      <TestStepHeader
        title="Step 4: Attempt MCQ Test"
        description={`${subject?.name || "Subject"} > ${chapter?.name || "Chapter"} > ${
          difficulty?.label || "Difficulty"
        }`}
        breadcrumbs={[
          { label: subject?.name || "Subject", to: routeBuilders.assessmentSession.root },
          {
            label: chapter?.name || "Chapter",
            to: routeBuilders.assessmentSession.chapters(subjectId),
          },
          {
            label: difficulty?.label || "Difficulty",
            to: routeBuilders.assessmentSession.difficulty(subjectId, chapterId),
          },
          { label: "Attempt" },
        ]}
        rightSlot={
          <div className="mcq-attempt-page__header-actions">
            <LiveAttemptTimer />
            <button
              type="button"
              className="btn-secondary"
              disabled={submitting}
              onClick={() =>
                navigate(
                  `${routeBuilders.assessmentSession.preview(
                    subjectId,
                    chapterId,
                    normalizedDifficultyLevel
                  )}?goal=${effectiveSmartGoal}`
                )
              }
            >
              Preview
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                setValidationError("");
                if (stats.attempted === 0) {
                  setValidationError("Please answer at least one question before submitting.");
                  pushToast({
                    title: "Cannot submit yet",
                    message: "Select an option for any question, then submit again.",
                    tone: "warning",
                  });
                  return;
                }
                setShowSubmitConfirm(true);
              }}
              disabled={submitting}
            >
              <ButtonBusyLabel
                busy={submitting}
                busyLabel="Submitting..."
                idleLabel="Submit"
              />
            </button>
          </div>
        }
      />

      <p className="mcq-inline-muted">
        Mode: {recommendedGoalLabel}. Current goal: {activeGoalLabel}.
      </p>

      <section className="mcq-insight-shell" aria-label="Pre-test intelligence">
        <div className="mcq-insight-card mcq-insight-card--pretest">
          <header className="mcq-insight-card__head">
            <div>
              <h3>Before You Start</h3>
              <p>
                {subject?.name || "Subject"} / {chapter?.name || "Chapter"}
              </p>
            </div>
            <span className={`mcq-status-chip is-${preTestBriefing.chapterStrength.id}`}>
              {preTestBriefing.chapterStrength.label}
            </span>
          </header>

          <div className="mcq-insight-card__stats">
            <div>
              <span>Chapter Strength</span>
              <strong>{preTestBriefing.chapterScore}%</strong>
            </div>
            <div>
              <span>Expected Difficulty</span>
              <strong>{preTestBriefing.expectedDifficulty}</strong>
            </div>
            <div>
              <span>Suggested Time</span>
              <strong>{formatSeconds(preTestBriefing.suggestedDurationSeconds)}</strong>
            </div>
            <div>
              <span>Avg Time / Q</span>
              <strong>{preTestBriefing.avgTimePerQuestion || 0}s</strong>
            </div>
          </div>

          <p className="mcq-insight-card__recommendation">{preTestBriefing.guidance}</p>
        </div>
      </section>

      {adaptiveDifficulty.difficultyId !== normalizedDifficultyLevel ? (
        <p className="mcq-inline-warning">
          Adaptive hint: {adaptiveDifficulty.reason} Recommended difficulty: {adaptiveDifficulty.difficultyId.toUpperCase()}.
        </p>
      ) : null}
      {!effectiveProfile.autoSubmitOnTimeout ? (
        <p className="mcq-inline-muted">
          This goal keeps timer visible but disables forced auto-submit on timeout.
        </p>
      ) : null}

      <div className="mcq-progress-row">
        <div className="mcq-progress-row__track" aria-hidden="true">
          <span style={{ width: `${stats.progress}%` }} />
        </div>
        <p>
          Attempted {stats.attempted}/{stats.totalQuestions} | Not answered {stats.notAnswered} |
          Marked {stats.reviewMarked} | Seen {stats.visitedCount}
        </p>
      </div>

      {tabWarning ? <p className="mcq-inline-warning">{tabWarning}</p> : null}
      {tabSwitchCount > 0 ? (
        <p className="mcq-inline-muted">Tab switched {tabSwitchCount} time(s) in this attempt.</p>
      ) : null}

      <div className="mcq-feedback-stack" aria-live="polite">
        {validationError ? (
          <section className="mcq-feedback-card is-warning" role="alert">
            <h4>Submission needs one answer</h4>
            <p>{validationError}</p>
            <small>Select any question option and submit again.</small>
          </section>
        ) : null}

        {submitError ? (
          <section className="mcq-feedback-card is-error" role="alert">
            <h4>Submission failed</h4>
            <p>{submitError}</p>
            <small>Please retry in a few seconds.</small>
          </section>
        ) : null}
      </div>

      <div className="mcq-attempt-grid">
        <div className="mcq-attempt-grid__main">
          {visibleQuestions.map((question, index) => {
            const absoluteIndex = (currentPage - 1) * pageSize + index;
            const selectedOption = answers[question.id] ?? null;

            return (
              <AttemptQuestionCard
                key={question.id}
                question={question}
                index={absoluteIndex}
                selectedOption={selectedOption}
                isMarkedForReview={Boolean(markedForReview[question.id])}
                isBookmarked={Boolean(bookmarkedQuestions[question.id])}
                note={questionNotes[question.id] || ""}
                timeSpentSeconds={Number(questionTimeSpent[question.id] || 0)}
                isActive={activeQuestionId === question.id}
                showHint={effectiveProfile.showConceptHints}
                onSelect={selectAnswer}
                onClear={clearAnswer}
                onToggleMark={toggleMarkForReview}
                onToggleBookmark={toggleBookmark}
                onSaveNote={setQuestionNote}
                onFocusQuestion={setActiveQuestionId}
              />
            );
          })}
        </div>

        <div className="mcq-attempt-grid__aside">
          <QuestionPalette
            questions={questions}
            answers={answers}
            visited={visited}
            markedForReview={markedForReview}
            activeQuestionId={activeQuestionId}
            onQuestionPick={handleQuestionJump}
          />
        </div>
      </div>

      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        totalQuestions={questions.length}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
        onJumpToQuestion={handleQuestionJump}
      />

      {submitting ? (
        <div className="mcq-submit-overlay" role="status" aria-live="polite">
          <div className="mcq-submit-overlay__content">
            <span className="mcq-submit-overlay__spinner" aria-hidden="true" />
            <p>Submitting your attempt and generating result analytics...</p>
          </div>
        </div>
      ) : null}

      <SubmitConfirmationModal
        open={showSubmitConfirm}
        stats={stats}
        submitting={submitting}
        onCancel={() => setShowSubmitConfirm(false)}
        onConfirm={() => runSubmit(false)}
        modeLabel={`Attempt (${activeGoalLabel})`}
      />
    </section>
  );
};

export default AttemptPage;
