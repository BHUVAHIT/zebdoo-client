import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import LoadingState from "../components/LoadingState";
import EmptyState from "../components/EmptyState";
import SelectionCard from "../components/SelectionCard";
import TestStepHeader from "../components/TestStepHeader";
import { getChaptersBySubject, getSubjectById } from "../services/testService";
import { useTestFlowStore } from "../store/testFlowStore";
import { useShallow } from "zustand/react/shallow";
import { routeBuilders } from "../../routes/routePaths";
import { useCatalogStore } from "../../store/catalogStore";

const ChapterSelectionPage = () => {
  const { subjectId } = useParams();
  const navigate = useNavigate();
  const catalogVersion = useCatalogStore((state) => state.version);

  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const { subject, chapter, setSubject, setChapter } = useTestFlowStore(
    useShallow((state) => ({
      subject: state.subject,
      chapter: state.chapter,
      setSubject: state.setSubject,
      setChapter: state.setChapter,
    }))
  );

  const resolvedSubjectName = useMemo(() => {
    if (subject?.id === subjectId) return subject.name;
    return "Selected Subject";
  }, [subject?.id, subject?.name, subjectId]);

  const loadChapters = useCallback(async () => {
    if (!subjectId) {
      navigate(routeBuilders.assessmentSession.root, { replace: true });
      return;
    }

    setLoading(true);
    setError("");

    try {
      const snapshot = useTestFlowStore.getState();
      const resolvedSubject =
        snapshot.subject?.id === subjectId
          ? snapshot.subject
          : await getSubjectById(subjectId);
      const subjectChapters = await getChaptersBySubject(subjectId);

      if (snapshot.subject?.id !== resolvedSubject.id) {
        setSubject(resolvedSubject);
      }
      setChapters(subjectChapters);
    } catch (requestError) {
      setError(requestError.message || "Unable to load chapters.");
    } finally {
      setLoading(false);
    }
  }, [navigate, setSubject, subjectId]);

  useEffect(() => {
    loadChapters();
  }, [catalogVersion, loadChapters]);

  return (
    <section className="mcq-step-page">
      <TestStepHeader
        title="Step 2: Choose Chapter"
        description="Pick a chapter to customize your MCQ set and continue to difficulty selection."
        breadcrumbs={[
          { label: subject?.name || "Subject", to: routeBuilders.assessmentSession.root },
          { label: "Chapter" },
        ]}
        rightSlot={
          <button
            type="button"
            className="btn-secondary"
            onClick={() => navigate(routeBuilders.assessmentSession.root)}
          >
            Change Subject
          </button>
        }
      />

      {loading ? <LoadingState label="Loading chapters..." /> : null}

      {!loading && error ? (
        <EmptyState
          title="Could not load chapters"
          description={error}
          actionLabel="Retry"
          onAction={loadChapters}
          isError
        />
      ) : null}

      {!loading && !error && chapters.length === 0 ? (
        <EmptyState
          title="No chapters available"
          description={`No chapters are currently mapped to ${resolvedSubjectName}.`}
        />
      ) : null}

      {!loading && !error && chapters.length > 0 ? (
        <div className="mcq-selection-grid">
          {chapters.map((item) => (
            <SelectionCard
              key={item.id}
              title={item.name}
              subtitle={item.summary}
              metaLeft={`${item.difficultyCount} difficulty levels`}
              selected={chapter?.id === item.id}
              onClick={() => {
                setChapter(item);
                navigate(routeBuilders.assessmentSession.difficulty(subjectId, item.id));
              }}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
};

export default ChapterSelectionPage;
