import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import SelectionCard from "../components/SelectionCard";
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
import { TEST_MODES } from "../../utils/constants";

const DifficultySelectionPage = () => {
  const { subjectId, chapterId } = useParams();
  const navigate = useNavigate();
  const catalogVersion = useCatalogStore((state) => state.version);

  const [difficulties, setDifficulties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
        Adaptive suggestion: <strong>{adaptiveDifficulty.difficultyId.toUpperCase()}</strong>.
        {" "}
        {adaptiveDifficulty.reason}
      </p>
      <p className="mcq-inline-muted">
        Suggested goal for this chapter: <strong>{recommendedGoalLabel}</strong>.
        {" "}
        Student flow now runs in a single exam mode for consistency.
      </p>

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
        <div className="mcq-selection-grid">
          {difficulties.map((item) => (
            <SelectionCard
              key={item.id}
              title={item.label}
              subtitle={`${item.detail}${
                adaptiveDifficulty.difficultyId === item.id
                  ? " (Recommended)"
                  : ""
              }`}
              metaLeft={`${item.questionCount} questions`}
              metaRight={`${Math.floor(item.durationSeconds / 60)} mins`}
              selected={difficulty?.id === item.id}
              tone={item.colorToken}
              disabled={!item.isAvailable}
              onClick={() => {
                if (!item.isAvailable) return;
                setDifficulty(item);
                saveAttemptPreferences({
                  preferredMode: TEST_MODES.EXAM,
                  preferredDifficulty: item.id,
                });
                navigate(
                  `${routeBuilders.assessmentSession.attempt(
                    subjectId,
                    chapterId,
                    item.id
                  )}?goal=${recommendedGoal}`
                );
              }}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
};

export default DifficultySelectionPage;
