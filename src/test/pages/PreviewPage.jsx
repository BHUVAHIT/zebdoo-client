import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useShallow } from "zustand/react/shallow";
import { LiveAttemptTimer } from "../components/AttemptTimer";
import EmptyState from "../components/EmptyState";
import PaginationControls from "../components/PaginationControls";
import QuestionPalette from "../components/QuestionPalette";
import SubmitConfirmationModal from "../components/SubmitConfirmationModal";
import TestStepHeader from "../components/TestStepHeader";
import { useAttemptTimer } from "../hooks/useAttemptTimer";
import { useSubmitAttempt } from "../hooks/useSubmitAttempt";
import {
  getAttemptKey,
  selectAttemptStats,
  useTestFlowStore,
} from "../store/testFlowStore";
import { routeBuilders } from "../../routes/routePaths";
import {
  getSmartGoalProfile,
  SMART_TEST_GOALS,
} from "../config/smartTestEngine";
import { TEST_MODES } from "../../utils/constants";

const PreviewPage = () => {
  const { subjectId, chapterId, difficultyLevel } = useParams();
  const navigate = useNavigate();

  const [validationError, setValidationError] = useState("");
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  const {
    subject,
    chapter,
    difficulty,
    engineProfile,
    attemptKey,
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
    setCurrentPage,
    setPageSize,
    jumpToQuestion,
  } = useTestFlowStore(
    useShallow((state) => ({
      subject: state.subject,
      chapter: state.chapter,
      difficulty: state.difficulty,
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
      setCurrentPage: state.setCurrentPage,
      setPageSize: state.setPageSize,
      jumpToQuestion: state.jumpToQuestion,
    }))
  );

  const stats = useTestFlowStore(useShallow(selectAttemptStats));
  const { submitAttempt, submitting, submitError, clearSubmitError } = useSubmitAttempt();

  const effectiveSmartGoal = SMART_TEST_GOALS.EXAM_SIMULATION;
  const effectiveProfile =
    engineProfile?.id === SMART_TEST_GOALS.EXAM_SIMULATION
      ? engineProfile
      : getSmartGoalProfile(effectiveSmartGoal);

  const routeAttemptKey = getAttemptKey({
    subjectId,
    chapterId,
    difficultyLevel,
    smartGoal: effectiveSmartGoal,
    attemptMode: TEST_MODES.EXAM,
  });

  const totalPages = useMemo(
    () => Math.max(Math.ceil(questions.length / pageSize), 1),
    [pageSize, questions.length]
  );

  const visibleQuestions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return questions.slice(start, start + pageSize);
  }, [currentPage, pageSize, questions]);

  const runSubmit = useCallback(
    async (autoSubmitted) => {
      clearSubmitError();
      setValidationError("");

      if (!autoSubmitted && stats.attempted === 0) {
        setValidationError("At least one answer is required to submit.");
        return;
      }

      try {
        await submitAttempt({ autoSubmitted });
      } catch {
        setShowSubmitConfirm(false);
      }
    },
    [clearSubmitError, stats.attempted, submitAttempt]
  );

  const handleAutoSubmit = useCallback(() => {
    runSubmit(true);
  }, [runSubmit]);

  useAttemptTimer({
    enabled: questions.length > 0 && effectiveProfile.autoSubmitOnTimeout,
    onTimeout: handleAutoSubmit,
  });

  useEffect(() => {
    if (attemptKey !== routeAttemptKey || !questions.length) {
      navigate(routeBuilders.assessmentSession.attempt(subjectId, chapterId, difficultyLevel), {
        replace: true,
      });
    }
  }, [
    attemptKey,
    chapterId,
    difficultyLevel,
    navigate,
    questions.length,
    routeAttemptKey,
    subjectId,
  ]);

  if (!questions.length) {
    return (
      <EmptyState
        title="Preview unavailable"
        description="Please start your attempt before opening preview mode."
        actionLabel="Go to Attempt"
        onAction={() =>
          navigate(
            `${routeBuilders.assessmentSession.attempt(
              subjectId,
              chapterId,
              difficultyLevel
            )}?goal=${effectiveSmartGoal}`
          )
        }
      />
    );
  }

  return (
    <section className="mcq-preview-page">
      <TestStepHeader
        title="Step 5: Preview Before Submit"
        description="Review answered and unanswered items, then submit confidently."
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
          {
            label: "Attempt",
            to: routeBuilders.assessmentSession.attempt(
              subjectId,
              chapterId,
              difficultyLevel
            ),
          },
          { label: "Preview" },
        ]}
        rightSlot={
          <div className="mcq-attempt-page__header-actions">
            <LiveAttemptTimer />
            <button
              type="button"
              className="btn-secondary"
              onClick={() =>
                navigate(
                  `${routeBuilders.assessmentSession.attempt(
                    subjectId,
                    chapterId,
                    difficultyLevel
                  )}?goal=${effectiveSmartGoal}`
                )
              }
            >
              Back to Attempt
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                setValidationError("");
                setShowSubmitConfirm(true);
              }}
              disabled={submitting}
            >
              Final Submit
            </button>
          </div>
        }
      />

      <div className="mcq-preview-summary">
        <article>
          <span>Total Questions</span>
          <strong>{stats.totalQuestions}</strong>
        </article>
        <article>
          <span>Answered</span>
          <strong>{stats.attempted}</strong>
        </article>
        <article>
          <span>Not Answered</span>
          <strong>{stats.notAnswered}</strong>
        </article>
        <article>
          <span>Marked</span>
          <strong>{stats.reviewMarked}</strong>
        </article>
      </div>

      {validationError ? <p className="mcq-inline-error">{validationError}</p> : null}
      {submitError ? <p className="mcq-inline-error">{submitError}</p> : null}

      <div className="mcq-attempt-grid">
        <div className="mcq-attempt-grid__main">
          {visibleQuestions.map((question, index) => {
            const absoluteIndex = (currentPage - 1) * pageSize + index;
            const selectedOption = question.options.find(
              (option) => option.id === answers[question.id]
            );
            const isMarked = Boolean(markedForReview[question.id]);
            const isBookmarked = Boolean(bookmarkedQuestions[question.id]);
            const noteText = questionNotes[question.id] || "";
            const spentSeconds = Number(questionTimeSpent[question.id] || 0);

            return (
              <article key={question.id} className="mcq-preview-card">
                <header>
                  <h3>
                    Question {absoluteIndex + 1}: {question.question}
                  </h3>
                  <div className="mcq-preview-card__badges">
                    <span
                      className={`mcq-preview-badge ${selectedOption ? "is-answered" : "is-missing"}`}
                    >
                      {selectedOption ? "Answered" : "Not Answered"}
                    </span>
                    {isMarked ? <span className="mcq-preview-badge is-marked">Marked</span> : null}
                    {isBookmarked ? (
                      <span className="mcq-preview-badge is-bookmarked">Bookmarked</span>
                    ) : null}
                  </div>
                </header>

                <p>
                  <strong>Your answer:</strong> {selectedOption ? selectedOption.text : "-"}
                </p>
                {noteText ? (
                  <p>
                    <strong>Note:</strong> {noteText}
                  </p>
                ) : null}
                <p>
                  <strong>Time spent:</strong> {spentSeconds}s
                </p>

                <footer>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      jumpToQuestion(absoluteIndex);
                      navigate(
                        `${routeBuilders.assessmentSession.attempt(
                          subjectId,
                          chapterId,
                          difficultyLevel
                        )}?goal=${effectiveSmartGoal}&q=${absoluteIndex + 1}`
                      );
                    }}
                  >
                    Edit Question
                  </button>
                </footer>
              </article>
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
            onQuestionPick={(index) => {
              jumpToQuestion(index);
              const targetPage = Math.floor(index / pageSize) + 1;
              setCurrentPage(targetPage);
            }}
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
        onJumpToQuestion={(index) => {
          jumpToQuestion(index);
          const targetPage = Math.floor(index / pageSize) + 1;
          setCurrentPage(targetPage);
        }}
      />

      <SubmitConfirmationModal
        open={showSubmitConfirm}
        stats={stats}
        submitting={submitting}
        onCancel={() => setShowSubmitConfirm(false)}
        onConfirm={() => runSubmit(false)}
        modeLabel="Preview"
      />
    </section>
  );
};

export default PreviewPage;
