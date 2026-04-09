import { Suspense, lazy, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { TEST_STORAGE_KEYS } from "../utils/constants";
import {
  formatSeconds,
  getDisplayDateTime,
} from "../utils/helpers";
import { useAuthStore } from "../store/authStore";
import {
  loadScopedFromStorage,
  removeScopedFromStorage,
  resolveStorageScopeId,
} from "../utils/storageScope";
import { routeBuilders } from "../routes/routePaths";
import { SMART_TEST_GOALS } from "../test/config/smartTestEngine";
import { CardGridSkeleton } from "../components/loading/LoadingPrimitives";
import { buildPostTestInsights } from "../test/utils/performanceInsights";

const ResultCard = lazy(() => import("../components/ResultCard"));

const ResultPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const currentUser = useAuthStore((state) => state.user);
  const scopeId = resolveStorageScopeId(currentUser);

  const routeResult = location.state?.result || null;
  const persistedResult = loadScopedFromStorage(TEST_STORAGE_KEYS.LAST_RESULT, null, {
    scopeId,
    migrateLegacy: false,
  });
  const result = routeResult || persistedResult;
  const autoSubmitted = Boolean(location.state?.autoSubmitted);
  const questionResults = Array.isArray(result?.questions) ? result.questions : [];
  const scopedHistory = useMemo(
    () =>
      loadScopedFromStorage(TEST_STORAGE_KEYS.RESULT_HISTORY, [], {
        scopeId,
        migrateLegacy: false,
      }),
    [scopeId]
  );

  const metrics = useMemo(() => {
    if (!result) {
      return {
        totalQuestions: 0,
        attempted: 0,
        notAnswered: 0,
        correct: 0,
        wrong: 0,
        scorePercent: 0,
        accuracy: 0,
      };
    }

    if (result.metrics) {
      return {
        totalQuestions: Number(result.metrics.totalQuestions || 0),
        attempted: Number(result.metrics.attempted || 0),
        notAnswered: Number(result.metrics.notAnswered || 0),
        correct: Number(result.metrics.correct || 0),
        wrong: Number(result.metrics.wrong || 0),
        scorePercent: Number(result.metrics.scorePercent || 0),
        accuracy: Number(result.metrics.accuracy || 0),
      };
    }

    if (result.summary) {
      const attempted = result.summary.attempted ?? 0;
      const correct = result.summary.correct ?? 0;

      return {
        totalQuestions: result.summary.total ?? 0,
        attempted,
        notAnswered: result.summary.notAttempted ?? 0,
        correct,
        wrong: result.summary.wrong ?? 0,
        scorePercent: result.summary.scorePercent ?? 0,
        accuracy: attempted ? Number(((correct / attempted) * 100).toFixed(2)) : 0,
      };
    }

    return {
      totalQuestions: 0,
      attempted: 0,
      notAnswered: 0,
      correct: 0,
      wrong: 0,
      scorePercent: 0,
      accuracy: 0,
    };
  }, [result]);

  const summaryTiles = useMemo(() => {
    return [
      { label: "Total Questions", value: metrics.totalQuestions },
      { label: "Attempted", value: metrics.attempted },
      { label: "Not Attempted", value: metrics.notAnswered },
      { label: "Correct", value: metrics.correct },
      { label: "Wrong", value: metrics.wrong },
      { label: "Score", value: `${metrics.scorePercent}%` },
      { label: "Accuracy", value: `${metrics.accuracy}%` },
      {
        label: "Time Taken",
        value: formatSeconds(Number(result?.timeTakenSeconds) || 0),
      },
    ];
  }, [metrics, result?.timeTakenSeconds]);

  const visualSummary = useMemo(() => {
    const attemptedRate = metrics.totalQuestions
      ? Number(((metrics.attempted / metrics.totalQuestions) * 100).toFixed(2))
      : 0;
    const completionRate = metrics.totalQuestions
      ? Number((((metrics.totalQuestions - metrics.notAnswered) / metrics.totalQuestions) * 100).toFixed(2))
      : 0;

    return [
      {
        id: "score",
        label: "Score",
        value: `${metrics.scorePercent}%`,
        percent: Math.max(Math.min(metrics.scorePercent, 100), 0),
      },
      {
        id: "accuracy",
        label: "Accuracy",
        value: `${metrics.accuracy}%`,
        percent: Math.max(Math.min(metrics.accuracy, 100), 0),
      },
      {
        id: "attempt-rate",
        label: "Attempt Rate",
        value: `${attemptedRate}%`,
        percent: Math.max(Math.min(attemptedRate, 100), 0),
      },
      {
        id: "completion",
        label: "Completion",
        value: `${completionRate}%`,
        percent: Math.max(Math.min(completionRate, 100), 0),
      },
    ];
  }, [metrics.accuracy, metrics.attempted, metrics.notAnswered, metrics.scorePercent, metrics.totalQuestions]);

  const postTestInsights = useMemo(
    () => buildPostTestInsights({ result, history: scopedHistory }),
    [result, scopedHistory]
  );

  const recommendedDifficulty = useMemo(() => {
    if (metrics.accuracy < 55) return "easy";
    if (metrics.accuracy < 75) return "medium";
    return result?.difficulty?.id || "medium";
  }, [metrics.accuracy, result?.difficulty?.id]);

  const retakeTest = () => {
    removeScopedFromStorage(TEST_STORAGE_KEYS.LAST_RESULT, scopeId);
    navigate(routeBuilders.assessmentSession.root);
  };

  const canRetryChapterTest = Boolean(
    result?.subject?.id && result?.chapter?.id && (result?.difficulty?.id || "")
  );

  if (!result) {
    return (
      <main className="result-page-shell">
        <section className="feedback-card">
          <h2>No result found</h2>
          <p>
            Start a test to generate a result report. Once submitted, your latest result
            will appear here.
          </p>
          <button
            type="button"
            className="btn-primary"
            onClick={() => navigate(routeBuilders.assessmentSession.root)}
          >
            Go to Assessment
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="result-page-shell">
      <section className="result-summary-banner">
        <div>
          <h1>{result.subject?.name || "Mock Test"} Result</h1>
          <p>Submitted at {getDisplayDateTime(result.submittedAt)}</p>
          {autoSubmitted && (
            <p className="result-summary-banner__note">
              Auto submitted because the timer reached zero.
            </p>
          )}
        </div>

        <div className="result-summary-banner__actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => navigate(routeBuilders.assessmentSession.root)}
          >
            Take Another Subject
          </button>
          <button type="button" className="btn-primary" onClick={retakeTest}>
            Retake Test
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() =>
              navigate(
                `${routeBuilders.assessmentSession.attempt(
                  result.subject?.id,
                  result.chapter?.id,
                  result.difficulty?.id || "medium"
                )}?goal=${SMART_TEST_GOALS.EXAM_SIMULATION}`
              )
            }
            disabled={!canRetryChapterTest}
          >
            Retry Chapter Test
          </button>
        </div>
      </section>

      <section className="result-analytics-table-wrap">
        <table className="result-analytics-table">
          <thead>
            <tr>
              <th>Subject</th>
              <th>Chapter</th>
              <th>Difficulty</th>
              <th>Mode</th>
              <th>Total Questions</th>
              <th>Attempted</th>
              <th>Correct</th>
              <th>Wrong</th>
              <th>Score %</th>
              <th>Time Taken</th>
              <th>Accuracy</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{result.subject?.name || "-"}</td>
              <td>{result.chapter?.name || "-"}</td>
              <td>{result.difficulty?.label || "-"}</td>
              <td>{String(result.attemptMode || "exam").toUpperCase()}</td>
              <td>{metrics?.totalQuestions ?? 0}</td>
              <td>{metrics?.attempted ?? 0}</td>
              <td>{metrics?.correct ?? 0}</td>
              <td>{metrics?.wrong ?? 0}</td>
              <td>{metrics?.scorePercent ?? 0}%</td>
              <td>{formatSeconds(Number(result.timeTakenSeconds) || 0)}</td>
              <td>{metrics?.accuracy ?? 0}%</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="result-summary-grid">
        {summaryTiles.map((tile) => (
          <article key={tile.label} className="result-summary-tile">
            <span>{tile.label}</span>
            <strong>{tile.value}</strong>
          </article>
        ))}
      </section>

      <section className="mcq-insight-shell" aria-label="Post test intelligence">
        <div className="mcq-result-visual-grid">
          {visualSummary.map((item) => (
            <article key={item.id} className="mcq-result-visual-card">
              <div className="mcq-result-visual-card__head">
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
              <div className="mcq-insight-progress__track" aria-hidden="true">
                <span style={{ width: `${item.percent}%` }} />
              </div>
            </article>
          ))}
        </div>

        <article className="mcq-insight-card mcq-insight-card--posttest">
          <header className="mcq-insight-card__head">
            <div>
              <h3>Actionable Feedback</h3>
              <p>{postTestInsights.progressLine}</p>
            </div>
          </header>

          {postTestInsights.weakAreas.length > 0 ? (
            <div className="mcq-insight-list" role="list">
              {postTestInsights.weakAreas.map((item) => (
                <article key={item.id} className="mcq-insight-list__item" role="listitem">
                  <strong>{item.label}</strong>
                  <p>{item.recommendation}</p>
                </article>
              ))}
            </div>
          ) : (
            <p className="mcq-insight-card__recommendation">
              Excellent work. No critical weak spots detected in this attempt.
            </p>
          )}

          <div className="mcq-inline-muted mcq-inline-muted--stacked">
            {postTestInsights.improvementTips.map((tip) => (
              <p key={tip}>{tip}</p>
            ))}
          </div>

          <footer className="mcq-insight-card__footer">
            <button
              type="button"
              className="btn-secondary"
              onClick={() =>
                navigate(
                  routeBuilders.assessmentSession.difficulty(
                    result.subject?.id,
                    result.chapter?.id
                  )
                )
              }
              disabled={!result.subject?.id || !result.chapter?.id}
            >
              Improve This Chapter
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={() =>
                navigate(
                  `${routeBuilders.assessmentSession.attempt(
                    result.subject?.id,
                    result.chapter?.id,
                    recommendedDifficulty
                  )}?goal=${SMART_TEST_GOALS.EXAM_SIMULATION}`
                )
              }
              disabled={!result.subject?.id || !result.chapter?.id}
            >
              Practice Now
            </button>
          </footer>
        </article>
      </section>

      <section className="result-list">
        <header className="result-list__head">
          <h2>Question-wise Analysis</h2>
          <p>
            Green indicates correct selection. Red indicates wrong selection. Correct
            option and complete explanation are shown for each question.
          </p>
        </header>

        <Suspense
          fallback={
            <CardGridSkeleton
              count={3}
              className="result-loading-grid"
              cardClassName="result-loading-card"
              ariaLabel="Loading question-wise analysis"
            />
          }
        >
          {questionResults.map((question, index) => (
            <ResultCard key={question.id} question={question} index={index} />
          ))}
        </Suspense>
      </section>
    </main>
  );
};

export default ResultPage;