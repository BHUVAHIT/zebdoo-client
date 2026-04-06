import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Layers3 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import ChapterCard from "../components/ChapterCard";
import {
  TEST_PAPER_MODES,
  TEST_PAPER_MODULE,
  TEST_PAPER_MODE_OPTIONS,
} from "../constants/paperTypes";
import { routeBuilders } from "../routes/routePaths";
import { testPaperService } from "../services/testPaperService";
import "./testPapers.css";

const TestPaperChaptersPage = () => {
  const navigate = useNavigate();
  const { subjectId } = useParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [subject, setSubject] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [mode, setMode] = useState(TEST_PAPER_MODES.CHAPTER_WISE);

  const loadContext = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await testPaperService.getSubjectContext(subjectId);
      setSubject(response.subject);
      setChapters(response.chapters);
    } catch (loadError) {
      setError(loadError.message || "Unable to load chapters.");
    } finally {
      setLoading(false);
    }
  }, [subjectId]);

  useEffect(() => {
    loadContext();

    const unsubscribe = testPaperService.subscribeToChanges(() => {
      loadContext();
    });

    return () => {
      unsubscribe?.();
    };
  }, [loadContext]);

  const modeLabel = useMemo(
    () =>
      TEST_PAPER_MODE_OPTIONS.find((option) => option.value === mode)?.label ||
      "Chapter Wise",
    [mode]
  );

  const openChapterPapers = (chapter) => {
    const nextChapterId = chapter?.id || "all";
    navigate(routeBuilders.testPapers.chapter(subjectId, TEST_PAPER_MODES.CHAPTER_WISE, nextChapterId));
  };

  const openFullSyllabus = () => {
    navigate(routeBuilders.testPapers.mode(subjectId, TEST_PAPER_MODES.FULL_SYLLABUS));
  };

  return (
    <section className="exam-vault-page">
      <header className="exam-vault-hero">
        <button
          type="button"
          className="exam-vault-back-btn"
          onClick={() => navigate(routeBuilders.testPapers.root)}
        >
          <ArrowLeft size={16} />
          <span>Back to subjects</span>
        </button>

        <p className="exam-vault-hero__kicker">{TEST_PAPER_MODULE.name}</p>
        <h1>{subject?.name || "Subject"}</h1>
        <p>Select your preparation style and access papers faster.</p>
      </header>

      <section className="exam-vault-subjects-shell">
        <div className="exam-vault-mode-toggle" role="tablist" aria-label="Paper mode">
          {TEST_PAPER_MODE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={mode === option.value}
              className={`exam-vault-mode-toggle__btn ${mode === option.value ? "is-active" : ""}`}
              onClick={() => setMode(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="exam-vault-subject-grid">
            {Array.from({ length: 6 }, (_, index) => (
              <article key={`chapter-skeleton-${index}`} className="exam-vault-skeleton-card" />
            ))}
          </div>
        ) : null}

        {!loading && error ? <p className="exam-vault-error-text">{error}</p> : null}

        {!loading && !error && mode === TEST_PAPER_MODES.FULL_SYLLABUS ? (
          <article className="exam-vault-full-syllabus-card">
            <div>
              <p>{modeLabel}</p>
              <h3>Skip chapter selection and open complete subject papers.</h3>
            </div>
            <button type="button" onClick={openFullSyllabus}>
              Open Full Syllabus Papers
            </button>
          </article>
        ) : null}

        {!loading && !error && mode === TEST_PAPER_MODES.CHAPTER_WISE ? (
          <div className="exam-vault-chapter-grid">
            <ChapterCard
              chapter={{
                id: "all",
                title: "All Chapters",
                summary: "Browse chapter-wise papers across the full subject.",
              }}
              selected={false}
              onSelect={openChapterPapers}
            />

            {chapters.map((chapter) => (
              <ChapterCard
                key={chapter.id}
                chapter={chapter}
                selected={false}
                onSelect={openChapterPapers}
              />
            ))}
          </div>
        ) : null}

        {!loading && !error && mode === TEST_PAPER_MODES.CHAPTER_WISE && chapters.length === 0 ? (
          <article className="exam-vault-empty-state">
            <Layers3 size={18} />
            <h3>No chapters available for this subject</h3>
            <p>Ask super admin to publish chapters before mapping test papers.</p>
          </article>
        ) : null}
      </section>
    </section>
  );
};

export default TestPaperChaptersPage;
