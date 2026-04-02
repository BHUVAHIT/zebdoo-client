import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getSubjects } from "../../../../test/services/testService";
import { routeBuilders, ROUTES } from "../../../../routes/routePaths";
import { useCatalogStore } from "../../../../store/catalogStore";
import { useAuthStore } from "../../../../store/authStore";
import { TEST_STORAGE_KEYS } from "../../../../utils/constants";
import { getDisplayDateTime } from "../../../../utils/helpers";
import {
  loadScopedFromStorage,
  resolveStorageScopeId,
} from "../../../../utils/storageScope";
import {
  computeLearningProfile,
  getLearningProfile,
} from "../../../../services/learningAnalyticsService";
import { SMART_TEST_GOALS } from "../../../../test/config/smartTestEngine";
import "../studentDashboard.css";

const StudentDashboardPage = () => {
  const catalogVersion = useCatalogStore((state) => state.version);
  const currentUser = useAuthStore((state) => state.user);
  const [subjects, setSubjects] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [subjectError, setSubjectError] = useState("");

  const [history, setHistory] = useState([]);
  const [learningProfile, setLearningProfile] = useState(() => getLearningProfile());

  const loadDashboardData = useCallback(async () => {
    setLoadingSubjects(true);
    setSubjectError("");

    try {
      const [subjectList] = await Promise.all([getSubjects()]);
      setSubjects(subjectList);
    } catch (error) {
      setSubjectError(error.message || "Unable to load dashboard subjects.");
    } finally {
      setLoadingSubjects(false);
    }

    const rawHistory = loadScopedFromStorage(TEST_STORAGE_KEYS.RESULT_HISTORY, [], {
      scopeId: resolveStorageScopeId(currentUser),
      migrateLegacy: false,
    });
    const normalizedHistory = Array.isArray(rawHistory) ? rawHistory : [];
    const orderedHistory = [...normalizedHistory].sort(
      (left, right) => new Date(right.submittedAt || 0) - new Date(left.submittedAt || 0)
    );

    setHistory(orderedHistory);
    setLearningProfile(computeLearningProfile(orderedHistory));
  }, [currentUser]);

  useEffect(() => {
    loadDashboardData();
  }, [catalogVersion, loadDashboardData]);

  const analytics = useMemo(() => {
    if (!history.length) {
      return {
        totalAttempts: 0,
        averageScore: 0,
        bestScore: 0,
        averageAccuracy: 0,
      };
    }

    const aggregate = history.reduce(
      (acc, item) => {
        const metrics = item.metrics || item.summary || {};
        const score = Number(metrics.scorePercent || 0);
        const accuracy = Number(metrics.accuracy || 0);

        return {
          scoreTotal: acc.scoreTotal + score,
          accuracyTotal: acc.accuracyTotal + accuracy,
          bestScore: Math.max(acc.bestScore, score),
        };
      },
      { scoreTotal: 0, accuracyTotal: 0, bestScore: 0 }
    );

    return {
      totalAttempts: history.length,
      averageScore: Number((aggregate.scoreTotal / history.length).toFixed(2)),
      bestScore: Number(aggregate.bestScore.toFixed(2)),
      averageAccuracy: Number((aggregate.accuracyTotal / history.length).toFixed(2)),
    };
  }, [history]);

  const recentAttempts = history.slice(0, 5);
  const suggestedTest = learningProfile?.suggestedTests?.[0] || null;
  const suggestedTestRoute = suggestedTest
    ? `${routeBuilders.assessmentSession.attempt(
        suggestedTest.subjectId,
        suggestedTest.chapterId,
        suggestedTest.recommendedDifficulty || "medium"
      )}?goal=${SMART_TEST_GOALS.EXAM_SIMULATION}`
    : routeBuilders.assessmentSession.root;

  return (
    <section className="student-dashboard-page">
      <header className="student-dashboard-hero">
        <div>
          <p className="student-dashboard-hero__kicker">Performance Command Center</p>
          <h1>Student Dashboard</h1>
          <p>
            Track your latest assessments, monitor trends, and begin a new session with
            one click.
          </p>
        </div>

        <div className="student-dashboard-hero__actions">
          <Link className="btn-primary" to={routeBuilders.assessmentSession.root}>
            Start Assessment
          </Link>
          <Link className="btn-secondary" to={suggestedTestRoute}>
            Start Suggested Test
          </Link>
          <Link className="btn-secondary" to={ROUTES.assessment.result}>
            Open Latest Result
          </Link>
        </div>
      </header>

      <section className="student-dashboard-metrics" aria-label="Performance overview">
        <article>
          <span>Available Subjects</span>
          <strong>{subjects.length}</strong>
        </article>
        <article>
          <span>Total Attempts</span>
          <strong>{analytics.totalAttempts}</strong>
        </article>
        <article>
          <span>Average Score</span>
          <strong>{analytics.averageScore}%</strong>
        </article>
        <article>
          <span>Best Score</span>
          <strong>{analytics.bestScore}%</strong>
        </article>
        <article>
          <span>Average Accuracy</span>
          <strong>{analytics.averageAccuracy}%</strong>
        </article>
        <article>
          <span>Current Streak</span>
          <strong>{learningProfile.streakDays || 0} days</strong>
        </article>
        <article>
          <span>Learning XP</span>
          <strong>{learningProfile.xp?.totalXp || 0}</strong>
        </article>
      </section>

      <section className="student-dashboard-quick-grid">
        <article className="student-dashboard-card">
          <header>
            <h2>Daily Goal</h2>
            <span>{learningProfile.dailyGoal?.progressPercent || 0}% completed</span>
          </header>
          <div className="student-dashboard-goal-track" aria-hidden="true">
            <span style={{ width: `${learningProfile.dailyGoal?.progressPercent || 0}%` }} />
          </div>
          <p className="student-dashboard-goal-copy">
            {learningProfile.dailyGoal?.questionsAttemptedToday || 0}/
            {learningProfile.dailyGoal?.targetQuestions || 50} questions attempted today.
          </p>
        </article>

        <article className="student-dashboard-card">
          <header>
            <h2>Rank Estimation</h2>
            <span>{learningProfile.rankEstimate?.confidence || "low"} confidence</span>
          </header>
          <p className="student-dashboard-rank-number">
            AIR ~ {learningProfile.rankEstimate?.estimatedRank || "-"}
          </p>
          <p className="student-dashboard-rank-meta">
            Percentile: {learningProfile.rankEstimate?.percentile || "-"}%
          </p>
        </article>

        <article className="student-dashboard-card">
          <header>
            <h2>Badges</h2>
            <span>{learningProfile.badges?.length || 0} unlocked</span>
          </header>
          {learningProfile.badges?.length ? (
            <div className="student-dashboard-badge-list">
              {learningProfile.badges.map((badge) => (
                <span key={badge.id}>{badge.label}</span>
              ))}
            </div>
          ) : (
            <p className="student-dashboard-empty">Complete attempts to unlock badges.</p>
          )}
        </article>
      </section>

      <section className="student-dashboard-grid">
        <article className="student-dashboard-card">
          <header>
            <h2>Subjects and Chapters</h2>
            <Link to={routeBuilders.assessmentSession.root}>Explore all</Link>
          </header>

          {loadingSubjects ? (
            <div className="student-dashboard-skeleton-list">
              {["a", "b", "c", "d"].map((item) => (
                <span key={item} className="student-dashboard-skeleton" />
              ))}
            </div>
          ) : null}

          {!loadingSubjects && subjectError ? (
            <p className="student-dashboard-inline-error">{subjectError}</p>
          ) : null}

          {!loadingSubjects && !subjectError && subjects.length === 0 ? (
            <p className="student-dashboard-empty">No active subjects are currently available.</p>
          ) : null}

          {!loadingSubjects && !subjectError && subjects.length > 0 ? (
            <ul className="student-dashboard-subject-list">
              {subjects.map((subject) => (
                <li key={subject.id}>
                  <div>
                    <strong>{subject.name}</strong>
                    <p>{subject.description}</p>
                  </div>
                  <span>{subject.chapterCount} chapters</span>
                </li>
              ))}
            </ul>
          ) : null}
        </article>

        <article className="student-dashboard-card">
          <header>
            <h2>Recent Activity</h2>
            <span>Last 5 attempts</span>
          </header>

          {recentAttempts.length === 0 ? (
            <p className="student-dashboard-empty">
              No attempts yet. Start your first assessment session.
            </p>
          ) : (
            <ul className="student-dashboard-activity-list">
              {recentAttempts.map((item) => {
                const metrics = item.metrics || item.summary || {};

                return (
                  <li key={item.attemptId || item.submittedAt}>
                    <div>
                      <strong>{item.subject?.name || "Subject"}</strong>
                      <p>
                        {item.chapter?.name || "Chapter"} | {item.difficulty?.label || "Difficulty"}
                      </p>
                      <small>{getDisplayDateTime(item.submittedAt)}</small>
                    </div>
                    <span>{Number(metrics.scorePercent || 0).toFixed(2)}%</span>
                  </li>
                );
              })}
            </ul>
          )}
        </article>

        <article className="student-dashboard-card">
          <header>
            <h2>Weak Topics Radar</h2>
            <span>Adaptive focus list</span>
          </header>

          {!learningProfile.weakTopics?.length ? (
            <p className="student-dashboard-empty">
              Attempt a few tests to generate weak-topic mapping.
            </p>
          ) : (
            <ul className="student-dashboard-weak-list">
              {learningProfile.weakTopics.slice(0, 5).map((topic) => (
                <li key={topic.key}>
                  <div>
                    <strong>{topic.subjectName}</strong>
                    <p>{topic.chapterName}</p>
                  </div>
                  <span>{topic.accuracy}% accuracy</span>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="student-dashboard-card">
          <header>
            <h2>Suggested Next Tests</h2>
            <span>AI-like static guidance</span>
          </header>

          {!learningProfile.suggestedTests?.length ? (
            <p className="student-dashboard-empty">No suggestions yet. Start an assessment.</p>
          ) : (
            <ul className="student-dashboard-suggestion-list">
              {learningProfile.suggestedTests.map((item) => (
                <li key={item.id}>
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.reason}</p>
                  </div>
                  <Link
                    to={`${routeBuilders.assessmentSession.attempt(
                      item.subjectId,
                      item.chapterId,
                      item.recommendedDifficulty
                      )}?goal=${SMART_TEST_GOALS.EXAM_SIMULATION}`}
                  >
                    Start
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>
    </section>
  );
};

export default StudentDashboardPage;
