import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import TestStepHeader from "../components/TestStepHeader";
import LoadingState from "../components/LoadingState";
import EmptyState from "../components/EmptyState";
import { getSubjects } from "../services/testService";
import { getAttemptKey, useTestFlowStore } from "../store/testFlowStore";
import { useShallow } from "zustand/react/shallow";
import { ROUTES, routeBuilders } from "../../routes/routePaths";
import { useAppToast } from "../../components/notifications/useAppToast";
import { useCatalogStore } from "../../store/catalogStore";
import { useAuthStore } from "../../store/authStore";
import { TEST_STORAGE_KEYS } from "../../utils/constants";
import { formatSeconds } from "../../utils/helpers";
import {
  loadScopedFromStorage,
  resolveStorageScopeId,
} from "../../utils/storageScope";
import {
  buildAttemptSnapshot,
  isSubmittedAttempt,
  isValidAttempt,
} from "../utils/attemptResume";
import { buildSubjectDashboard } from "../utils/performanceInsights";

const SubjectSelectionPage = () => {
  const navigate = useNavigate();
  const { pushToast } = useAppToast();
  const catalogVersion = useCatalogStore((state) => state.version);
  const currentUser = useAuthStore((state) => state.user);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const scopeId = resolveStorageScopeId(currentUser);

  const scopedHistory = useMemo(
    () =>
      loadScopedFromStorage(TEST_STORAGE_KEYS.RESULT_HISTORY, [], {
        scopeId,
        migrateLegacy: false,
      }),
    [scopeId]
  );

  const subjectDashboard = useMemo(
    () =>
      buildSubjectDashboard({
        subjects,
        history: scopedHistory,
      }),
    [scopedHistory, subjects]
  );

  const {
    subject,
    chapter,
    difficulty,
    attemptStatus,
    attemptTestId,
    attemptMode,
    smartGoal,
    attemptKey,
    questions,
    timer,
    setSubject,
    resetFlow,
  } = useTestFlowStore(
    useShallow((state) => ({
      subject: state.subject,
      chapter: state.chapter,
      difficulty: state.difficulty,
      attemptStatus: state.attemptStatus,
      attemptTestId: state.attemptTestId,
      attemptMode: state.attemptMode,
      smartGoal: state.smartGoal,
      attemptKey: state.attemptKey,
      questions: state.questions,
      timer: state.timer,
      setSubject: state.setSubject,
      resetFlow: state.resetFlow,
    }))
  );

  const attemptSnapshot = useMemo(() => {
    const expectedAttemptId =
      subject?.id && chapter?.id && difficulty?.id
        ? getAttemptKey({
            subjectId: subject.id,
            chapterId: chapter.id,
            difficultyLevel: difficulty.id,
            attemptMode,
            smartGoal,
          })
        : "";

    return buildAttemptSnapshot({
      id: attemptKey,
      expectedId: expectedAttemptId,
      testId: attemptTestId,
      status: attemptStatus,
      endsAt: timer?.endsAt,
      hasQuestions: Array.isArray(questions) && questions.length > 0,
    });
  }, [
    attemptKey,
    attemptMode,
    attemptStatus,
    attemptTestId,
    chapter?.id,
    difficulty?.id,
    questions,
    smartGoal,
    subject?.id,
    timer?.endsAt,
  ]);

  const hasActiveAttempt = isValidAttempt(attemptSnapshot);
  const hasSubmittedAttempt = isSubmittedAttempt(attemptSnapshot);
  const canResumeAction = hasActiveAttempt || hasSubmittedAttempt;
  const hasStaleAttemptReference = Boolean(attemptKey) && !hasActiveAttempt;

  useEffect(() => {
    if (!hasStaleAttemptReference || hasSubmittedAttempt) return;
    resetFlow();
  }, [hasStaleAttemptReference, hasSubmittedAttempt, resetFlow]);

  const handleResume = useCallback(() => {
    if (hasActiveAttempt) {
      if (!subject?.id || !chapter?.id || !difficulty?.id) {
        pushToast({
          title: "Attempt reset",
          message: "Saved attempt data was incomplete, so a new session is required.",
          tone: "warning",
        });
        resetFlow();
        return;
      }

      navigate(
        routeBuilders.assessmentSession.attempt(
          subject.id,
          chapter.id,
          difficulty.id
        )
      );
      return;
    }

    if (hasSubmittedAttempt) {
      navigate(ROUTES.assessment.result);
      return;
    }

    pushToast({
      title: "No active attempt",
      message: hasStaleAttemptReference
        ? "Saved attempt data is invalid or expired. Start a new attempt."
        : "No active attempt found.",
      tone: hasStaleAttemptReference ? "warning" : "info",
    });
  }, [
    chapter?.id,
    difficulty?.id,
    hasActiveAttempt,
    hasStaleAttemptReference,
    hasSubmittedAttempt,
    navigate,
    pushToast,
    resetFlow,
    subject?.id,
  ]);

  const resumeLabel = hasSubmittedAttempt ? "View Last Result" : "Resume Attempt";

  const loadSubjects = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await getSubjects();
      setSubjects(response);
    } catch (requestError) {
      setError(requestError.message || "Unable to fetch subjects.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSubjects();
  }, [catalogVersion, loadSubjects]);


  return (
    <section className="mcq-step-page">
      <TestStepHeader
        title="Step 1: Choose Subject"
        description="Start with a CA subject and continue through chapter, difficulty, and full timed MCQ attempt."
        breadcrumbs={[{ label: "Subject" }]}
        rightSlot={
          <button
            type="button"
            className="btn-secondary"
            onClick={handleResume}
            disabled={!canResumeAction}
            title={canResumeAction ? undefined : "No active attempt"}
          >
            {resumeLabel}
          </button>
        }
      />

      {loading ? <LoadingState label="Loading subjects..." /> : null}

      {!loading && error ? (
        <EmptyState
          title="Subject list unavailable"
          description={error}
          actionLabel="Retry"
          onAction={loadSubjects}
          isError
        />
      ) : null}

      {!loading && !error && subjects.length === 0 ? (
        <EmptyState
          title="No subjects configured"
          description="Please check later. Subjects are currently unavailable."
        />
      ) : null}

      {!loading && !error && subjects.length > 0 ? (
        <section className="mcq-insight-shell" aria-label="Subject performance dashboard">
          <div className="mcq-insight-summary-strip">
            <article>
              <span>Total Subjects</span>
              <strong>{subjectDashboard.summary.totalSubjects}</strong>
            </article>
            <article>
              <span>Attempted Subjects</span>
              <strong>{subjectDashboard.summary.attemptedSubjects}</strong>
            </article>
            <article>
              <span>Pending Subjects</span>
              <strong>{subjectDashboard.summary.pendingSubjects}</strong>
            </article>
            <article>
              <span>Overall Performance</span>
              <strong>{subjectDashboard.summary.overallPerformance}%</strong>
            </article>
          </div>

          <div className="mcq-inline-muted mcq-inline-muted--stacked" role="status">
            {subjectDashboard.insights.map((insight) => (
              <p key={insight}>{insight}</p>
            ))}
          </div>

          <div className="mcq-insight-grid">
            {subjectDashboard.cards.map((item) => (
              <article
                key={item.id}
                className={`mcq-insight-card mcq-insight-card--subject is-${item.status.id} ${
                  subject?.id === item.id ? "is-selected" : ""
                }`}
              >
                <header className="mcq-insight-card__head">
                  <div>
                    <h3>{item.name}</h3>
                    <p>{item.testsAttempted} tests attempted</p>
                  </div>
                  <div className="mcq-insight-card__head-chips">
                    <span className={`mcq-status-chip is-${item.status.id}`}>
                      {item.status.label}
                    </span>
                    <span className={`mcq-trend-chip is-${item.trend.direction}`}>
                      {item.trend.icon} {item.trend.label}
                    </span>
                  </div>
                </header>

                <div className="mcq-insight-card__stats">
                  <div>
                    <span>Pending Tests</span>
                    <strong>{item.pendingTests}</strong>
                  </div>
                  <div>
                    <span>Average Score</span>
                    <strong>{item.averageScore}%</strong>
                  </div>
                  <div>
                    <span>Accuracy</span>
                    <strong>{item.averageAccuracy}%</strong>
                  </div>
                  <div>
                    <span>Total Time</span>
                    <strong>{formatSeconds(item.totalTimeSeconds)}</strong>
                  </div>
                </div>

                <div className="mcq-insight-progress">
                  <div className="mcq-insight-progress__row">
                    <span>Performance</span>
                    <strong>{item.progressPercent}%</strong>
                  </div>
                  <div className="mcq-insight-progress__track" aria-hidden="true">
                    <span style={{ width: `${item.progressPercent}%` }} />
                  </div>
                </div>

                <p className="mcq-insight-card__recommendation">{item.insight}</p>

                <footer className="mcq-insight-card__footer">
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => {
                      setSubject(subjects.find((entry) => entry.id === item.id) || null);
                      navigate(routeBuilders.assessmentSession.chapters(item.id));
                    }}
                  >
                    Continue in {item.name}
                  </button>
                </footer>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </section>
  );
};

export default SubjectSelectionPage;
