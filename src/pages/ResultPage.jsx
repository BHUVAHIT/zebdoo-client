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

      <section className="result-list">
        <header className="result-list__head">
          <h2>Question-wise Analysis</h2>
          <p>
            Green indicates correct selection. Red indicates wrong selection. Correct
            option and complete explanation are shown for each question.
          </p>
        </header>

        <Suspense fallback={<p className="result-loading">Loading results...</p>}>
          {questionResults.map((question, index) => (
            <ResultCard key={question.id} question={question} index={index} />
          ))}
        </Suspense>
      </section>
    </main>
  );
};

export default ResultPage;