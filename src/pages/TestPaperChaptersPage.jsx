import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Layers3, Search } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import ChapterCard from "../components/ChapterCard";
import EmptyState from "../components/EmptyState";
import Loader from "../components/Loader";
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
  const [searchTerm, setSearchTerm] = useState("");

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

  const filteredChapters = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return chapters;

    return chapters.filter((chapter) => {
      const haystack = [chapter.title, chapter.summary, chapter.name].join(" ").toLowerCase();
      return haystack.includes(query);
    });
  }, [chapters, searchTerm]);

  const openChapterPapers = (chapter) => {
    if (!chapter?.id) return;
    navigate(routeBuilders.testPapers.chapter(subjectId, TEST_PAPER_MODES.CHAPTER_WISE, chapter.id));
  };

  const openFullSyllabus = () => {
    navigate(routeBuilders.testPapers.mode(subjectId, TEST_PAPER_MODES.FULL_SYLLABUS));
  };

  return (
    <section className="exam-vault-shell">
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

          <div className="exam-vault-breadcrumbs" aria-label="Breadcrumb">
            <span>{TEST_PAPER_MODULE.name}</span>
            <span>/</span>
            <span>{subject?.name || "Subject"}</span>
            <span>/</span>
            <strong>{modeLabel}</strong>
          </div>
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

          {mode === TEST_PAPER_MODES.CHAPTER_WISE ? (
            <label className="exam-vault-search-input" htmlFor="chapter-search">
              <Search size={16} aria-hidden="true" />
              <input
                id="chapter-search"
                type="search"
                placeholder="Search chapter by title or topic"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </label>
          ) : null}

          {loading ? <Loader count={6} className="exam-vault-chapter-grid" /> : null}

          {!loading && error ? <p className="exam-vault-error-text">{error}</p> : null}

          {!loading && !error && mode === TEST_PAPER_MODES.FULL_SYLLABUS ? (
            <article className="exam-vault-full-syllabus-card">
              <div>
                <p>{modeLabel}</p>
                <h3>Skip chapter selection and practice the complete subject in one flow.</h3>
              </div>
              <button type="button" onClick={openFullSyllabus}>
                Open Full Syllabus Papers
              </button>
            </article>
          ) : null}

          {!loading && !error && mode === TEST_PAPER_MODES.CHAPTER_WISE && chapters.length === 0 ? (
            <EmptyState
              icon={Layers3}
              title="No chapters available for this subject"
              description="Ask super admin to publish chapters before mapping test papers."
            />
          ) : null}

          {!loading &&
          !error &&
          mode === TEST_PAPER_MODES.CHAPTER_WISE &&
          chapters.length > 0 &&
          filteredChapters.length === 0 ? (
            <EmptyState
              icon={Layers3}
              title="No chapter matched your search"
              description="Try a different keyword to find the right chapter."
            />
          ) : null}

          {!loading && !error && mode === TEST_PAPER_MODES.CHAPTER_WISE && filteredChapters.length > 0 ? (
            <div className="exam-vault-chapter-grid">
              {filteredChapters.map((chapter) => (
                <ChapterCard
                  key={chapter.id}
                  chapter={chapter}
                  selected={false}
                  onSelect={openChapterPapers}
                />
              ))}
            </div>
          ) : null}
        </section>
      </section>
    </section>
  );
};

export default TestPaperChaptersPage;
