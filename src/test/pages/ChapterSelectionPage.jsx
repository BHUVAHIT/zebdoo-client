import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import LoadingState from "../components/LoadingState";
import EmptyState from "../components/EmptyState";
import TestStepHeader from "../components/TestStepHeader";
import { getChaptersBySubject, getSubjectById } from "../services/testService";
import { useTestFlowStore } from "../store/testFlowStore";
import { useShallow } from "zustand/react/shallow";
import { routeBuilders } from "../../routes/routePaths";
import { useCatalogStore } from "../../store/catalogStore";
import { useAuthStore } from "../../store/authStore";
import { TEST_STORAGE_KEYS } from "../../utils/constants";
import { formatSeconds } from "../../utils/helpers";
import {
  loadScopedFromStorage,
  resolveStorageScopeId,
} from "../../utils/storageScope";
import { buildChapterDashboard } from "../utils/performanceInsights";

const ChapterSelectionPage = () => {
  const { subjectId } = useParams();
  const navigate = useNavigate();
  const catalogVersion = useCatalogStore((state) => state.version);
  const currentUser = useAuthStore((state) => state.user);

  const [chapters, setChapters] = useState([]);
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

  const chapterDashboard = useMemo(
    () =>
      buildChapterDashboard({
        chapters,
        history: scopedHistory,
        subjectId,
      }),
    [chapters, scopedHistory, subjectId]
  );

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
        <section className="mcq-insight-shell" aria-label="Chapter performance dashboard">
          {chapterDashboard.recommendations.length > 0 ? (
            <div className="mcq-inline-muted mcq-inline-muted--stacked" role="status">
              {chapterDashboard.recommendations.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          ) : null}

          <div className="mcq-insight-grid">
            {chapterDashboard.cards.map((item) => (
              <article
                key={item.id}
                className={`mcq-insight-card mcq-insight-card--chapter is-${item.status.id} ${
                  chapter?.id === item.id ? "is-selected" : ""
                }`}
              >
                <header className="mcq-insight-card__head">
                  <div>
                    <h3>{item.name}</h3>
                    <p>{item.attempts} tests attempted</p>
                  </div>
                  <span className={`mcq-status-chip is-${item.status.id}`}>{item.status.label}</span>
                </header>

                <div className="mcq-insight-card__stats">
                  <div>
                    <span>Accuracy</span>
                    <strong>{item.accuracy}%</strong>
                  </div>
                  <div>
                    <span>Average Score</span>
                    <strong>{item.avgScore}%</strong>
                  </div>
                  <div>
                    <span>Time Spent</span>
                    <strong>{formatSeconds(item.totalTimeSeconds)}</strong>
                  </div>
                  <div>
                    <span>Avg Time / Q</span>
                    <strong>{item.avgTimePerQuestion || 0}s</strong>
                  </div>
                </div>

                <div className="mcq-insight-dual-bars" aria-label="Time versus score">
                  <div>
                    <div className="mcq-insight-progress__row">
                      <span>Score</span>
                      <strong>{item.scoreBarPercent}%</strong>
                    </div>
                    <div className="mcq-insight-progress__track" aria-hidden="true">
                      <span style={{ width: `${item.scoreBarPercent}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="mcq-insight-progress__row">
                      <span>Speed</span>
                      <strong>{item.timeBarPercent}%</strong>
                    </div>
                    <div className="mcq-insight-progress__track is-speed" aria-hidden="true">
                      <span style={{ width: `${item.timeBarPercent}%` }} />
                    </div>
                  </div>
                </div>

                <p className="mcq-insight-card__recommendation">{item.recommendation}</p>

                <footer className="mcq-insight-card__footer">
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => {
                      setChapter(chapters.find((entry) => entry.id === item.id) || null);
                      navigate(routeBuilders.assessmentSession.difficulty(subjectId, item.id));
                    }}
                  >
                    Open {item.name}
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

export default ChapterSelectionPage;
