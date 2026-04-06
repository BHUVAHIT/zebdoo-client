import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import CategorySection from "../components/CategorySection";
import {
  TEST_PAPER_MODES,
  TEST_PAPER_MODULE,
  TEST_PAPER_TYPE_META,
  TEST_PAPER_TYPE_ORDER,
} from "../constants/paperTypes";
import { routeBuilders } from "../routes/routePaths";
import { testPaperService } from "../services/testPaperService";
import "./testPapers.css";

const VIEW_MODES = Object.freeze({
  TABLE: "table",
  CARD: "card",
});

const TestPaperListPage = () => {
  const navigate = useNavigate();
  const { subjectId, mode, chapterId } = useParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState(VIEW_MODES.TABLE);
  const [subject, setSubject] = useState(null);
  const [papers, setPapers] = useState([]);
  const [chapters, setChapters] = useState([]);

  const effectiveMode = useMemo(() => {
    if (mode === TEST_PAPER_MODES.FULL_SYLLABUS) return TEST_PAPER_MODES.FULL_SYLLABUS;
    if (mode === TEST_PAPER_MODES.CHAPTER_WISE) return TEST_PAPER_MODES.CHAPTER_WISE;
    return null;
  }, [mode]);

  const effectiveChapterId = useMemo(() => {
    if (effectiveMode !== TEST_PAPER_MODES.CHAPTER_WISE) return null;
    return chapterId || "all";
  }, [chapterId, effectiveMode]);

  const loadPapers = useCallback(async () => {
    if (!effectiveMode) {
      navigate(routeBuilders.testPapers.subject(subjectId), { replace: true });
      return;
    }

    if (effectiveMode === TEST_PAPER_MODES.CHAPTER_WISE && !effectiveChapterId) {
      navigate(routeBuilders.testPapers.subject(subjectId), { replace: true });
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await testPaperService.getPapersForStudent({
        subjectId,
        mode: effectiveMode,
        chapterId: effectiveChapterId,
      });

      setSubject(response.subject);
      setPapers(response.papers);
      setChapters(response.chapters);
    } catch (loadError) {
      setError(loadError.message || "Unable to load papers.");
    } finally {
      setLoading(false);
    }
  }, [effectiveChapterId, effectiveMode, navigate, subjectId]);

  useEffect(() => {
    loadPapers();

    const unsubscribe = testPaperService.subscribeToChanges(() => {
      loadPapers();
    });

    return () => {
      unsubscribe?.();
    };
  }, [loadPapers]);

  const chapterLabel = useMemo(() => {
    if (effectiveMode === TEST_PAPER_MODES.FULL_SYLLABUS) {
      return "Full Syllabus";
    }

    if (effectiveChapterId === "all") {
      return "All Chapters";
    }

    return (
      chapters.find((chapter) => chapter.id === effectiveChapterId)?.title || "Selected Chapter"
    );
  }, [chapters, effectiveChapterId, effectiveMode]);

  const groupedCategories = useMemo(
    () =>
      TEST_PAPER_TYPE_ORDER.map((type) => ({
        ...TEST_PAPER_TYPE_META[type],
        papers: papers.filter((paper) => paper.type === type),
      })),
    [papers]
  );

  const openPaper = (paper) => {
    if (typeof window === "undefined") return;
    window.open(paper.pdfUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <section className="exam-vault-page exam-vault-page--list">
      <header className="exam-vault-hero">
        <button
          type="button"
          className="exam-vault-back-btn"
          onClick={() => navigate(routeBuilders.testPapers.subject(subjectId))}
        >
          <ArrowLeft size={16} />
          <span>Back to chapter mode</span>
        </button>

        <p className="exam-vault-hero__kicker">{TEST_PAPER_MODULE.name}</p>
        <h1>{subject?.name || "Subject"} Papers</h1>
        <p>
          Browse by category and open verified PDFs instantly. Mode: <strong>{chapterLabel}</strong>
        </p>
      </header>

      <section className="exam-vault-subjects-shell">
        <div className="exam-vault-list-toolbar">
          <div className="exam-vault-list-toolbar__meta">
            <span>{papers.length} papers available</span>
            <small>{effectiveMode === TEST_PAPER_MODES.FULL_SYLLABUS ? "Syllabus mode" : "Chapter mode"}</small>
          </div>

          <div className="exam-vault-view-switcher" role="group" aria-label="View mode">
            <button
              type="button"
              className={viewMode === VIEW_MODES.TABLE ? "is-active" : ""}
              onClick={() => setViewMode(VIEW_MODES.TABLE)}
            >
              Table View
            </button>
            <button
              type="button"
              className={viewMode === VIEW_MODES.CARD ? "is-active" : ""}
              onClick={() => setViewMode(VIEW_MODES.CARD)}
            >
              Card View
            </button>
          </div>
        </div>

        {loading ? (
          <div className="exam-vault-subject-grid">
            {Array.from({ length: 8 }, (_, index) => (
              <article key={`paper-skeleton-${index}`} className="exam-vault-skeleton-card" />
            ))}
          </div>
        ) : null}

        {!loading && error ? <p className="exam-vault-error-text">{error}</p> : null}

        {!loading && !error && papers.length === 0 ? (
          <article className="exam-vault-empty-state">
            <ExternalLink size={18} />
            <h3>No papers found for this selection</h3>
            <p>Try switching to another chapter or full syllabus mode.</p>
          </article>
        ) : null}

        {!loading && !error && papers.length > 0
          ? groupedCategories.map((category) => (
              <CategorySection
                key={category.value}
                category={category}
                papers={category.papers}
                viewMode={viewMode}
                onOpenPaper={openPaper}
              />
            ))
          : null}
      </section>
    </section>
  );
};

export default TestPaperListPage;
