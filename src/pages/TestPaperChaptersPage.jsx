import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ArrowLeft, Layers3, Search } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import ChapterCard from "../components/ChapterCard";
import EmptyState from "../components/EmptyState";
import Loader from "../components/Loader";
import { InlineLoadingNotice } from "../components/loading/LoadingPrimitives";
import {
  TEST_PAPER_MODES,
  TEST_PAPER_MODULE,
} from "../constants/paperTypes";
import { routeBuilders, ROUTES } from "../routes/routePaths";
import { testPaperService } from "../services/testPaperService";
import "./testPapers.css";

const TestPaperChaptersPage = () => {
  const navigate = useNavigate();
  const { subjectId } = useParams();
  const isMountedRef = useRef(true);
  const requestIdRef = useRef(0);
  const activeRequestRef = useRef(null);
  const syncReloadTimeoutRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [subject, setSubject] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  const loadContext = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    activeRequestRef.current?.abort();
    const controller = new AbortController();
    activeRequestRef.current = controller;

    if (!subjectId) {
      navigate(routeBuilders.testPapers.root, { replace: true });
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await testPaperService.getSubjectContext(subjectId, {
        signal: controller.signal,
      });

      if (!isMountedRef.current || requestIdRef.current !== requestId) {
        return;
      }

      setSubject(response.subject);
      setChapters(response.chapters);
    } catch (loadError) {
      if (loadError?.name === "AbortError") {
        return;
      }

      if (!isMountedRef.current || requestIdRef.current !== requestId) {
        return;
      }

      const errorMessage = loadError?.message || "Unable to load chapters.";

      if (/subject/i.test(errorMessage) && /not available/i.test(errorMessage)) {
        navigate(routeBuilders.testPapers.root, { replace: true });
        return;
      }

      setError(errorMessage);
    } finally {
      if (isMountedRef.current && requestIdRef.current === requestId) {
        setLoading(false);
      }

      if (activeRequestRef.current === controller) {
        activeRequestRef.current = null;
      }
    }
  }, [navigate, subjectId]);

  useEffect(() => {
    isMountedRef.current = true;
    loadContext();

    const unsubscribe = testPaperService.subscribeToChanges(() => {
      if (syncReloadTimeoutRef.current) {
        window.clearTimeout(syncReloadTimeoutRef.current);
      }

      syncReloadTimeoutRef.current = window.setTimeout(() => {
        syncReloadTimeoutRef.current = null;
        loadContext();
      }, 60);
    });

    return () => {
      isMountedRef.current = false;
      requestIdRef.current += 1;
      activeRequestRef.current?.abort();
      activeRequestRef.current = null;
      unsubscribe?.();
      if (syncReloadTimeoutRef.current) {
        window.clearTimeout(syncReloadTimeoutRef.current);
        syncReloadTimeoutRef.current = null;
      }
    };
  }, [loadContext]);

  const filteredChapters = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return chapters;

    return chapters.filter((chapter) => {
      const haystack = [chapter.title, chapter.summary, chapter.name].join(" ").toLowerCase();
      return haystack.includes(query);
    });
  }, [chapters, searchTerm]);

  const chapterSummaryLabel = useMemo(() => {
    if (loading) return "Loading chapters...";
    if (!searchTerm.trim()) return `${chapters.length} chapters available`;
    return `${filteredChapters.length} of ${chapters.length} chapters matched`;
  }, [chapters.length, filteredChapters.length, loading, searchTerm]);

  const openChapterPapers = (chapter) => {
    if (!chapter?.id) return;
    navigate(routeBuilders.testPapers.chapter(subjectId, TEST_PAPER_MODES.CHAPTER_WISE, chapter.id));
  };

  const openFullSyllabus = () => {
    navigate(routeBuilders.testPapers.mode(subjectId, TEST_PAPER_MODES.FULL_SYLLABUS));
  };

  const modeOptions = useMemo(
    () => [
      { value: TEST_PAPER_MODES.CHAPTER_WISE, label: "Chapter Wise" },
      { value: TEST_PAPER_MODES.FULL_SYLLABUS, label: "Full Syllabus" },
    ],
    []
  );

  return (
    <section className="exam-vault-shell">
      <section className="exam-vault-page">
        <header className="exam-vault-hero">
          <div className="exam-vault-hero__top-row">
            <div className="exam-vault-breadcrumbs" aria-label="Breadcrumb">
              <Link to={ROUTES.student.dashboard} className="exam-vault-breadcrumb-link">
                Dashboard
              </Link>
              <span>/</span>
              <Link to={routeBuilders.testPapers.root} className="exam-vault-breadcrumb-link">
                {TEST_PAPER_MODULE.name}
              </Link>
              <span>/</span>
              <strong className="exam-vault-breadcrumb-current">{subject?.name || "Subject"}</strong>
            </div>
            <span className="exam-vault-info-chip">{chapterSummaryLabel}</span>
          </div>

          <div className="exam-vault-hero__actions">
            <button
              type="button"
              className="exam-vault-back-btn"
              onClick={() => navigate(routeBuilders.testPapers.root)}
            >
              <ArrowLeft size={16} />
              <span>Back to subjects</span>
            </button>
          </div>

          <p className="exam-vault-hero__kicker">{TEST_PAPER_MODULE.name}</p>
          <h1>{subject?.name || "Subject"}</h1>
          <p>Select a chapter to continue or switch to full syllabus directly.</p>
        </header>

        <section className="exam-vault-subjects-shell">
          <div
            className="exam-vault-mode-toggle exam-vault-mode-toggle--subject"
            role="tablist"
            aria-label="Practice mode"
          >
            {modeOptions.map((option) => {
              const isActive = option.value === TEST_PAPER_MODES.CHAPTER_WISE;

              return (
                <button
                  key={option.value}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={`exam-vault-mode-toggle__btn ${isActive ? "is-active" : ""}`}
                  onClick={() => {
                    if (option.value === TEST_PAPER_MODES.FULL_SYLLABUS) {
                      openFullSyllabus();
                    }
                  }}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          <p className="exam-vault-filter-hint">{chapterSummaryLabel}</p>

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

          {loading ? (
            <>
              <InlineLoadingNotice label="Loading chapter mapping and paper availability..." />
              <Loader count={6} className="exam-vault-chapter-grid" />
            </>
          ) : null}

          {!loading && error ? (
            <EmptyState
              icon={AlertTriangle}
              title="Unable to load chapter context"
              description={error}
              actionLabel="Retry"
              onAction={loadContext}
            />
          ) : null}

          {!loading && !error && chapters.length === 0 ? (
            <EmptyState
              icon={Layers3}
              title="No chapters available for this subject"
              description="Ask super admin to publish chapters before mapping test papers."
            />
          ) : null}

          {!loading &&
          !error &&
          chapters.length > 0 &&
          filteredChapters.length === 0 ? (
            <EmptyState
              icon={Layers3}
              title="No chapter matched your search"
              description="Try a different keyword to find the right chapter."
            />
          ) : null}

          {!loading && !error && filteredChapters.length > 0 ? (
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
