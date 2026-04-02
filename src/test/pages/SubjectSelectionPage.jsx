import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import SelectionCard from "../components/SelectionCard";
import TestStepHeader from "../components/TestStepHeader";
import LoadingState from "../components/LoadingState";
import EmptyState from "../components/EmptyState";
import { getSubjects } from "../services/testService";
import { getAttemptKey, useTestFlowStore } from "../store/testFlowStore";
import { useShallow } from "zustand/react/shallow";
import { ROUTES, routeBuilders } from "../../routes/routePaths";
import { useAppToast } from "../../components/notifications/useAppToast";
import { useCatalogStore } from "../../store/catalogStore";
import {
  buildAttemptSnapshot,
  isSubmittedAttempt,
  isValidAttempt,
} from "../utils/attemptResume";

const SubjectSelectionPage = () => {
  const navigate = useNavigate();
  const { pushToast } = useAppToast();
  const catalogVersion = useCatalogStore((state) => state.version);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
        <div className="mcq-selection-grid">
          {subjects.map((item) => (
            <SelectionCard
              key={item.id}
              title={item.name}
              subtitle={item.description}
              metaLeft={`${item.chapterCount} chapters`}
              metaRight={item.shortCode}
              selected={subject?.id === item.id}
              onClick={() => {
                setSubject(item);
                navigate(routeBuilders.assessmentSession.chapters(item.id));
              }}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
};

export default SubjectSelectionPage;
