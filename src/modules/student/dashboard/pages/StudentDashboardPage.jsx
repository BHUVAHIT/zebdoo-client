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
  toScopedStorageKey,
} from "../../../../utils/storageScope";
import {
  computeLearningProfile,
  getLearningProfile,
} from "../../../../services/learningAnalyticsService";
import { SMART_TEST_GOALS } from "../../../../test/config/smartTestEngine";
import "../studentDashboard.css";

const toTitleCase = (value = "") => {
  const input = String(value || "").trim();
  if (!input) return "-";
  return input.charAt(0).toUpperCase() + input.slice(1).toLowerCase();
};

const StudentDashboardPage = () => {
  const catalogVersion = useCatalogStore((state) => state.version);
  const currentUser = useAuthStore((state) => state.user);
  const userScopeId = useMemo(() => resolveStorageScopeId(currentUser), [currentUser]);

  const [subjects, setSubjects] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [subjectError, setSubjectError] = useState("");

  const [history, setHistory] = useState([]);
  const [learningProfile, setLearningProfile] = useState(() => getLearningProfile());

  // STATIC NOW -> API LATER: async contracts read centralized static stores today.
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
      scopeId: userScopeId,
      migrateLegacy: false,
    });
    const normalizedHistory = Array.isArray(rawHistory) ? rawHistory : [];
    const orderedHistory = [...normalizedHistory].sort(
      (left, right) => new Date(right.submittedAt || 0) - new Date(left.submittedAt || 0)
    );

    setHistory(orderedHistory);
    setLearningProfile(computeLearningProfile(orderedHistory));
  }, [userScopeId]);

  useEffect(() => {
    loadDashboardData();
  }, [catalogVersion, loadDashboardData]);

  useEffect(() => {
    const watchedKeys = new Set([
      toScopedStorageKey(TEST_STORAGE_KEYS.RESULT_HISTORY, userScopeId),
      toScopedStorageKey(TEST_STORAGE_KEYS.LEARNING_PROFILE, userScopeId),
      toScopedStorageKey(TEST_STORAGE_KEYS.LAST_RESULT, userScopeId),
    ]);

    const handleStorage = (event) => {
      if (!event.key || !watchedKeys.has(event.key)) {
        return;
      }

      loadDashboardData();
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        loadDashboardData();
      }
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", loadDashboardData);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", loadDashboardData);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [loadDashboardData, userScopeId]);

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

  const totalChapterCount = useMemo(
    () => subjects.reduce((acc, subject) => acc + Number(subject.chapterCount || 0), 0),
    [subjects]
  );

  const scoreTrend = useMemo(() => {
    const recent = [...history].slice(0, 8).reverse();
    return recent.map((item, index) => {
      const metrics = item.metrics || item.summary || {};
      return {
        id: item.attemptId || `${item.submittedAt}-${index}`,
        score: Number(metrics.scorePercent || 0),
        date: getDisplayDateTime(item.submittedAt),
      };
    });
  }, [history]);

  const trendPolyline = useMemo(() => {
    if (scoreTrend.length < 2) {
      return "";
    }

    const width = 280;
    const height = 86;
    const stepX = width / (scoreTrend.length - 1);

    return scoreTrend
      .map((point, index) => {
        const x = Math.round(index * stepX);
        const y = Math.round(height - (Math.min(Math.max(point.score, 0), 100) / 100) * height);
        return `${x},${y}`;
      })
      .join(" ");
  }, [scoreTrend]);

  const summaryCards = useMemo(
    () => [
      {
        id: "subjects",
        label: "Active Subjects",
        value: subjects.length,
        detail: `${totalChapterCount} chapters ready for practice`,
      },
      {
        id: "attempts",
        label: "Total Attempts",
        value: analytics.totalAttempts,
        detail: history[0]?.submittedAt
          ? `Last session: ${getDisplayDateTime(history[0].submittedAt)}`
          : "Begin your first scored session",
      },
      {
        id: "average",
        label: "Average Score",
        value: `${analytics.averageScore}%`,
        detail: `${analytics.averageAccuracy}% answer accuracy`,
      },
      {
        id: "best",
        label: "Best Score",
        value: `${analytics.bestScore}%`,
        detail: `${learningProfile.streakDays || 0}-day consistency streak`,
      },
      {
        id: "xp",
        label: "Learning XP",
        value: learningProfile.xp?.totalXp || 0,
        detail: `Current level: ${learningProfile.xp?.level || 1}`,
      },
      {
        id: "suggestions",
        label: "Recommended Tests",
        value: learningProfile.suggestedTests?.length || 0,
        detail: `${learningProfile.weakTopics?.length || 0} focus areas detected`,
      },
    ],
    [analytics, history, learningProfile, subjects.length, totalChapterCount]
  );

  const recentAttempts = history.slice(0, 5);
  const suggestedTest = learningProfile?.suggestedTests?.[0] || null;
  const suggestedTestRoute = suggestedTest
    ? `${routeBuilders.assessmentSession.attempt(
        suggestedTest.subjectId,
        suggestedTest.chapterId,
        suggestedTest.recommendedDifficulty || "medium"
      )}?goal=${SMART_TEST_GOALS.EXAM_SIMULATION}`
    : routeBuilders.assessmentSession.root;
  const hasSuggestedTest = Boolean(suggestedTest);
  const assessmentCtaClass = hasSuggestedTest ? "btn-secondary" : "btn-primary";
  const suggestedCtaClass = hasSuggestedTest ? "btn-primary" : "btn-secondary";
  const suggestedCtaLabel = hasSuggestedTest ? "Take Recommended Test" : "Start Suggested Test";

  const displayName = currentUser?.name?.trim() || "Student";
  const dailyGoalProgress = Math.min(
    Math.max(Number(learningProfile.dailyGoal?.progressPercent || 0), 0),
    100
  );
  const xpProgress = useMemo(() => {
    const current = Number(learningProfile.xp?.currentLevelProgress || 0);
    const next = Number(learningProfile.xp?.nextLevelXp || 0);
    if (!next) {
      return 0;
    }

    return Math.min(Math.round((current / next) * 100), 100);
  }, [learningProfile.xp?.currentLevelProgress, learningProfile.xp?.nextLevelXp]);

  return (
    <section className="student-dashboard-page">
      <header className="student-dashboard-hero">
        <div className="student-dashboard-hero__content">
          <p className="student-dashboard-hero__kicker">Your Learning Command Deck</p>
          <h1>Welcome back, {displayName}</h1>
          <p>
            Keep your momentum high with clear progress signals, daily focus targets,
            and guided next sessions tailored from your latest outcomes.
          </p>

          <div className="student-dashboard-hero__meta" aria-label="Dashboard status">
            <span>{subjects.length} subjects available</span>
            <span>{learningProfile.weakTopics?.length || 0} priority topics mapped</span>
            <span>
              Updated: {getDisplayDateTime(learningProfile.generatedAt || history[0]?.submittedAt)}
            </span>
          </div>
        </div>

        <aside className="student-dashboard-hero__xp" aria-label="Experience progress">
          <span className="student-dashboard-eyebrow">XP Progress</span>
          <strong>{learningProfile.xp?.totalXp || 0} XP</strong>
          <p>Level {learningProfile.xp?.level || 1}</p>
          <div className="student-dashboard-progress" aria-hidden="true">
            <span style={{ width: `${xpProgress}%` }} />
          </div>
          <small>
            {learningProfile.xp?.currentLevelProgress || 0}/
            {learningProfile.xp?.nextLevelXp || 800} to next level
          </small>
        </aside>

        <div className="student-dashboard-hero__actions">
          <Link className={assessmentCtaClass} to={routeBuilders.assessmentSession.root}>
            Start Full Assessment
          </Link>
          <Link className={suggestedCtaClass} to={suggestedTestRoute}>
            {suggestedCtaLabel}
          </Link>
          <Link className="btn-secondary" to={ROUTES.assessment.result}>
            Review Latest Result
          </Link>
          <p className="student-dashboard-hero__actions-copy">
            {hasSuggestedTest
              ? "Recommended now: take your targeted test first for faster score recovery."
              : "Take one more full assessment to unlock a precise recommended test."}
          </p>
        </div>
      </header>

      <section className="student-dashboard-metrics" aria-label="Performance overview">
        {summaryCards.map((card) => (
          <article key={card.id}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            <p>{card.detail}</p>
          </article>
        ))}
      </section>

      <section className="student-dashboard-quick-grid">
        <article className="student-dashboard-card">
          <header>
            <h2>Today&apos;s Momentum</h2>
            <span>{dailyGoalProgress}% completed</span>
          </header>
          <div className="student-dashboard-goal-track" aria-hidden="true">
            <span style={{ width: `${dailyGoalProgress}%` }} />
          </div>
          <p className="student-dashboard-goal-copy">
            {learningProfile.dailyGoal?.questionsAttemptedToday || 0}/
            {learningProfile.dailyGoal?.targetQuestions || 50} questions attempted today.
          </p>
          <small className="student-dashboard-note">
            Remaining: {learningProfile.dailyGoal?.remainingQuestions || 0} questions
          </small>
        </article>

        <article className="student-dashboard-card">
          <header>
            <h2>Competitive Outlook</h2>
            <span>{learningProfile.rankEstimate?.confidence || "low"} confidence</span>
          </header>
          <p className="student-dashboard-rank-number">
            AIR ~ {learningProfile.rankEstimate?.estimatedRank || "-"}
          </p>
          <p className="student-dashboard-rank-meta">
            Percentile: {learningProfile.rankEstimate?.percentile || "-"}%
          </p>
          <small className="student-dashboard-note">
            Estimated from recent performance consistency and scoring trend.
          </small>
        </article>

        <article className="student-dashboard-card">
          <header>
            <h2>Achievement Milestones</h2>
            <span>{learningProfile.badges?.length || 0} unlocked</span>
          </header>
          {learningProfile.badges?.length ? (
            <div className="student-dashboard-badge-list">
              {learningProfile.badges.map((badge) => (
                <span key={badge.id}>{badge.label}</span>
              ))}
            </div>
          ) : (
            <p className="student-dashboard-empty">
              Keep attempting tests to unlock your first milestone badge.
            </p>
          )}
        </article>
      </section>

      <section className="student-dashboard-analytics-grid">
        <article className="student-dashboard-card">
          <header>
            <h2>Performance Trajectory</h2>
            <span>Last {scoreTrend.length || 0} attempts</span>
          </header>

          {scoreTrend.length < 2 ? (
            <p className="student-dashboard-empty">
              Complete at least two attempts to unlock your trajectory view.
            </p>
          ) : (
            <>
              <div className="student-dashboard-trend-chart" aria-hidden="true">
                <svg viewBox="0 0 280 86" role="presentation">
                  <polyline points={trendPolyline} />
                </svg>
              </div>
              <div className="student-dashboard-trend-meta">
                <span>{scoreTrend[0]?.date}</span>
                <span>{scoreTrend[scoreTrend.length - 1]?.date}</span>
              </div>
            </>
          )}
        </article>

        <article className="student-dashboard-card">
          <header>
            <h2>Difficulty Mastery</h2>
            <span>Balanced progression view</span>
          </header>

          {!learningProfile.difficultyStats?.length ? (
            <p className="student-dashboard-empty">Difficulty mastery will appear after attempts.</p>
          ) : (
            <ul className="student-dashboard-difficulty-list">
              {learningProfile.difficultyStats.map((difficultyStat) => (
                <li key={difficultyStat.difficulty}>
                  <div>
                    <strong>{toTitleCase(difficultyStat.difficulty)}</strong>
                    <p>{difficultyStat.attempts} attempts</p>
                  </div>

                  <div className="student-dashboard-difficulty-meter" aria-hidden="true">
                    <span
                      style={{
                        width: `${Math.min(
                          Math.max(Number(difficultyStat.averageScore || 0), 0),
                          100
                        )}%`,
                      }}
                    />
                  </div>

                  <em>{Number(difficultyStat.averageScore || 0).toFixed(2)}%</em>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>

      <section className="student-dashboard-grid">
        <article className="student-dashboard-card">
          <header>
            <h2>Active Learning Catalog</h2>
            <Link to={routeBuilders.assessmentSession.root}>Explore catalog</Link>
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
            <p className="student-dashboard-empty">
              No subjects are visible right now. They will appear once published.
            </p>
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
            <h2>Recent Attempts</h2>
            <span>Last 5 attempts</span>
          </header>

          {recentAttempts.length === 0 ? (
            <p className="student-dashboard-empty">
              You are one session away from unlocking richer progress analytics.
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
            <h2>Focus Recovery Zones</h2>
            <span>Priority reinforcement list</span>
          </header>

          {!learningProfile.weakTopics?.length ? (
            <p className="student-dashboard-empty">
              Complete a few attempts to generate your priority focus zones.
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
            <h2>Next Best Tests</h2>
            <span>Guided practice sequence</span>
          </header>

          {!learningProfile.suggestedTests?.length ? (
            <p className="student-dashboard-empty">
              Finish another full assessment to receive your next-best test plan.
            </p>
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
                    Begin Session
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