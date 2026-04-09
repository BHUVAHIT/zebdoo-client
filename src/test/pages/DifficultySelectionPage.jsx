import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import TestStepHeader from "../components/TestStepHeader";
import EmptyState from "../components/EmptyState";
import LoadingState from "../components/LoadingState";
import {
  getChapterById,
  getDifficultyLevels,
  getSubjectById,
} from "../services/testService";
import { useTestFlowStore } from "../store/testFlowStore";
import { useShallow } from "zustand/react/shallow";
import { routeBuilders } from "../../routes/routePaths";
import { useCatalogStore } from "../../store/catalogStore";
import {
  getAdaptiveDifficultyRecommendation,
  saveAttemptPreferences,
} from "../../services/learningAnalyticsService";
import {
  getSmartGoalProfile,
  SMART_TEST_GOALS,
} from "../config/smartTestEngine";
import { TEST_MODES, TEST_STORAGE_KEYS } from "../../utils/constants";
import { useAuthStore } from "../../store/authStore";
import {
  loadScopedFromStorage,
  resolveStorageScopeId,
} from "../../utils/storageScope";
import { buildDifficultyDashboard } from "../utils/performanceInsights";

const DifficultySelectionPage = () => {
  const { subjectId, chapterId } = useParams();
  const navigate = useNavigate();
  const catalogVersion = useCatalogStore((state) => state.version);
  const currentUser = useAuthStore((state) => state.user);
  const scopeId = resolveStorageScopeId(currentUser);

  const [difficulties, setDifficulties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const scopedHistory = useMemo(
    () =>
      loadScopedFromStorage(TEST_STORAGE_KEYS.RESULT_HISTORY, [], {
        scopeId,
        migrateLegacy: false,
      }),
    [scopeId]
  );

  const difficultyDashboard = useMemo(
    () =>
      buildDifficultyDashboard({
        history: scopedHistory,
        subjectId,
        chapterId,
      }),
    [chapterId, scopedHistory, subjectId]
  );

  const difficultyStatsMap = useMemo(
    () =>
      difficultyDashboard.entries.reduce((acc, item) => {
        acc[item.id] = item;
        return acc;
      }, {}),
    [difficultyDashboard.entries]
  );

  const { subject, chapter, difficulty, setSubject, setChapter, setDifficulty } =
    useTestFlowStore(
      useShallow((state) => ({
        subject: state.subject,
        chapter: state.chapter,
        difficulty: state.difficulty,
        setSubject: state.setSubject,
        setChapter: state.setChapter,
        setDifficulty: state.setDifficulty,
      }))
    );

  const stepDescription = useMemo(() => {
    const subjectName = subject?.name || "Selected subject";
    const chapterName = chapter?.name || "selected chapter";

    return `${subjectName} > ${chapterName}. Choose the target difficulty for the test.`;
  }, [chapter?.name, subject?.name]);

  const adaptiveDifficulty = useMemo(
    () => getAdaptiveDifficultyRecommendation({ subjectId, chapterId }),
    [chapterId, subjectId]
  );

  const recommendedGoal = SMART_TEST_GOALS.EXAM_SIMULATION;
  const recommendedGoalLabel = useMemo(
    () => getSmartGoalProfile(recommendedGoal).label,
    [recommendedGoal]
  );

  const loadDifficultyData = useCallback(async () => {
    if (!subjectId || !chapterId) {
      navigate(routeBuilders.assessmentSession.root, { replace: true });
      return;
    }

    setLoading(true);
    setError("");

    try {
      const snapshot = useTestFlowStore.getState();
      const [resolvedSubject, resolvedChapter, levels] = await Promise.all([
        snapshot.subject?.id === subjectId
          ? Promise.resolve(snapshot.subject)
          : getSubjectById(subjectId),
        snapshot.chapter?.id === chapterId
          ? Promise.resolve(snapshot.chapter)
          : getChapterById(subjectId, chapterId),
        getDifficultyLevels({ subjectId, chapterId }),
      ]);

      if (snapshot.subject?.id !== resolvedSubject.id) {
        setSubject(resolvedSubject);
      }
      if (snapshot.chapter?.id !== resolvedChapter.id) {
        setChapter(resolvedChapter);
      }
      setDifficulties(levels);
    } catch (requestError) {
      setError(requestError.message || "Unable to load difficulty levels.");
    } finally {
      setLoading(false);
    }
  }, [chapterId, navigate, setChapter, setSubject, subjectId]);

  useEffect(() => {
    loadDifficultyData();
  }, [catalogVersion, loadDifficultyData]);

  return (
    <section className="mcq-step-page">
      <TestStepHeader
        title="Step 3: Select Difficulty"
        description={stepDescription}
        breadcrumbs={[
          { label: subject?.name || "Subject", to: routeBuilders.assessmentSession.root },
          {
            label: chapter?.name || "Chapter",
            to: routeBuilders.assessmentSession.chapters(subjectId),
          },
          { label: "Difficulty" },
        ]}
        rightSlot={
          <button
            type="button"
            className="btn-secondary"
            onClick={() => navigate(routeBuilders.assessmentSession.chapters(subjectId))}
          >
            Change Chapter
          </button>
        }
      />

      <p className="mcq-inline-muted">
        Adaptive suggestion: <strong>{adaptiveDifficulty.difficultyId.toUpperCase()}</strong>.{" "}
        {adaptiveDifficulty.reason}
      </p>
      <p className="mcq-inline-muted">
        Suggested goal for this chapter: <strong>{recommendedGoalLabel}</strong>. Student
        flow now runs in a single exam mode for consistency.
      </p>
      <p className="mcq-inline-muted">{difficultyDashboard.insight}</p>
      <p className="mcq-inline-warning">{difficultyDashboard.improvementPath}</p>

      {loading ? <LoadingState label="Loading difficulty levels..." /> : null}

      {!loading && error ? (
        <EmptyState
          title="Could not load difficulty levels"
          description={error}
          actionLabel="Retry"
          onAction={loadDifficultyData}
          isError
        />
      ) : null}

      {!loading && !error && difficulties.length === 0 ? (
        <EmptyState
          title="Difficulty levels unavailable"
          description="No difficulty levels are available right now for this chapter."
        />
      ) : null}

      {!loading && !error && difficulties.length > 0 ? (
        <section className="mcq-insight-shell" aria-label="Difficulty performance breakdown">
          <div className="mcq-insight-grid mcq-insight-grid--difficulty">
            {difficulties.map((level) => {
              const levelId = String(level.id || "").toLowerCase();
              const stat = difficultyStatsMap[levelId] || {
                attempts: 0,
                accuracy: 0,
                avgTimePerQuestion: 0,
                fillPercent: 0,
                hint: "Attempt this level once to unlock insights.",
                status: { id: "average", label: "Average" },
                label: level.label,
              };
              const isRecommended = adaptiveDifficulty.difficultyId === levelId;
              const isDisabled = !level.isAvailable;

              return (
                <article
                  key={level.id}
                  className={`mcq-insight-card mcq-insight-card--difficulty is-${stat.status.id} ${
                    difficulty?.id === level.id ? "is-selected" : ""
                  } ${isDisabled ? "is-disabled" : ""}`}
                >
                  <header className="mcq-insight-card__head">
                    <div>
                      <h3>
                        {level.label}
                        {isRecommended ? " (Recommended)" : ""}
                      </h3>
                      <p>{level.questionCount} questions</p>
                    </div>
                    <span className={`mcq-status-chip is-${stat.status.id}`}>
                      {stat.status.label}
                    </span>
                  </header>

                  <div className="mcq-insight-card__stats">
                    <div>
                      <span>Attempted</span>
                      <strong>{stat.attempts}</strong>
                    </div>
                    <div>
                      <span>Accuracy</span>
                      <strong>{stat.accuracy}%</strong>
                    </div>
                    <div>
                      <span>Avg Time / Q</span>
                      <strong>{stat.avgTimePerQuestion || 0}s</strong>
                    </div>
                    <div>
                      <span>Suggested Time</span>
                      <strong>{Math.floor(Number(level.durationSeconds || 0) / 60)} mins</strong>
                    </div>
                  </div>

                  <div className="mcq-insight-progress">
                    <div className="mcq-insight-progress__row">
                      <span>Accuracy Trend</span>
                      <strong>{stat.fillPercent}%</strong>
                    </div>
                    <div className="mcq-insight-progress__track" aria-hidden="true">
                      <span style={{ width: `${stat.fillPercent}%` }} />
                    </div>
                  </div>

                  <p className="mcq-insight-card__recommendation">{stat.hint}</p>

                  <footer className="mcq-insight-card__footer">
                    <button
                      type="button"
                      className="btn-primary"
                      disabled={isDisabled}
                      onClick={() => {
                        if (isDisabled) return;
                        setDifficulty(level);
                        saveAttemptPreferences({
                          preferredMode: TEST_MODES.EXAM,
                          preferredDifficulty: level.id,
                        });
                        navigate(
                          `${routeBuilders.assessmentSession.attempt(
                            subjectId,
                            chapterId,
                            level.id
                          )}?goal=${recommendedGoal}`
                        );
                      }}
                    >
                      Start {level.label}
                    </button>
                  </footer>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}
    </section>
  );
};

export default DifficultySelectionPage;
