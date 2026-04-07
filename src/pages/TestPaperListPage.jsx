import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, BookMarked, Clock3, Layers3, Search } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import EmptyState from "../components/EmptyState";
import Loader from "../components/Loader";
import PaperList from "../components/PaperList";
import PaperTabs from "../components/PaperTabs";
import {
  TEST_PAPER_MODES,
  TEST_PAPER_MODULE,
  TEST_PAPER_TYPE_META,
  TEST_PAPER_TYPE_OPTIONS,
  TEST_PAPER_TYPES,
} from "../constants/paperTypes";
import { routeBuilders } from "../routes/routePaths";
import { testPaperService } from "../services/testPaperService";
import "./testPapers.css";

const BOOKMARK_STORAGE_KEY = "zebdoo:test-paper-bookmarks:v1";

const readStoredBookmarkIds = () => {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(BOOKMARK_STORAGE_KEY);
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
};

const TestPaperListPage = () => {
  const navigate = useNavigate();
  const { subjectId, mode, chapterId } = useParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [subject, setSubject] = useState(null);
  const [papers, setPapers] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [activeType, setActiveType] = useState(TEST_PAPER_TYPES.PYC);
  const [searchTerm, setSearchTerm] = useState("");
  const [yearFilter, setYearFilter] = useState("all");
  const [bookmarkedPaperIds, setBookmarkedPaperIds] = useState(() => readStoredBookmarkIds());

  const effectiveMode = useMemo(() => {
    if (mode === TEST_PAPER_MODES.FULL_SYLLABUS) return TEST_PAPER_MODES.FULL_SYLLABUS;
    if (mode === TEST_PAPER_MODES.CHAPTER_WISE) return TEST_PAPER_MODES.CHAPTER_WISE;
    return null;
  }, [mode]);

  const effectiveChapterId = useMemo(() => {
    if (effectiveMode !== TEST_PAPER_MODES.CHAPTER_WISE) return null;
    return chapterId || "all";
  }, [chapterId, effectiveMode]);

  useEffect(() => {
    setActiveType(TEST_PAPER_TYPES.PYC);
    setSearchTerm("");
    setYearFilter("all");
  }, [effectiveChapterId, effectiveMode, subjectId]);

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

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(BOOKMARK_STORAGE_KEY, JSON.stringify(bookmarkedPaperIds));
  }, [bookmarkedPaperIds]);

  const bookmarkedPaperIdSet = useMemo(() => new Set(bookmarkedPaperIds), [bookmarkedPaperIds]);

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

  const countByType = useMemo(() => {
    return papers.reduce(
      (acc, paper) => {
        const normalizedType = TEST_PAPER_TYPE_META[paper.type] ? paper.type : TEST_PAPER_TYPES.OTHER;
        acc[normalizedType] += 1;
        return acc;
      },
      {
        [TEST_PAPER_TYPES.PYC]: 0,
        [TEST_PAPER_TYPES.MTP]: 0,
        [TEST_PAPER_TYPES.RTP]: 0,
        [TEST_PAPER_TYPES.OTHER]: 0,
      }
    );
  }, [papers]);

  const availablePycYears = useMemo(() => {
    const years = papers
      .filter((paper) => paper.type === TEST_PAPER_TYPES.PYC)
      .map((paper) => String(paper.year))
      .filter(Boolean);

    return Array.from(new Set(years)).sort((left, right) => Number(right) - Number(left));
  }, [papers]);

  const filteredPapers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return papers
      .filter((paper) => paper.type === activeType)
      .filter((paper) => {
        if (activeType !== TEST_PAPER_TYPES.PYC || yearFilter === "all") return true;
        return String(paper.year) === yearFilter;
      })
      .filter((paper) => {
        if (!query) return true;
        const haystack = [
          paper.title,
          paper.chapterName,
          paper.subjectName,
          paper.typeLabel,
          paper.year,
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(query);
      });
  }, [activeType, papers, searchTerm, yearFilter]);

  const recentPapers = useMemo(
    () =>
      [...papers]
        .sort((left, right) => {
          const rightTime = new Date(right.updatedAt || right.createdAt || 0).getTime();
          const leftTime = new Date(left.updatedAt || left.createdAt || 0).getTime();
          if (rightTime !== leftTime) return rightTime - leftTime;
          return Number(right.year || 0) - Number(left.year || 0);
        })
        .slice(0, 4),
    [papers]
  );

  const savedPapers = useMemo(
    () => papers.filter((paper) => bookmarkedPaperIdSet.has(paper.id)).slice(0, 4),
    [bookmarkedPaperIdSet, papers]
  );

  const openPaper = (paper) => {
    if (typeof window === "undefined") return;
    window.open(paper.pdfUrl, "_blank", "noopener,noreferrer");
  };

  const toggleBookmark = useCallback((paper) => {
    if (!paper?.id) return;

    setBookmarkedPaperIds((prev) => {
      if (prev.includes(paper.id)) {
        return prev.filter((id) => id !== paper.id);
      }
      return [paper.id, ...prev];
    });
  }, []);

  return (
    <section className="exam-vault-shell">
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

          <div className="exam-vault-breadcrumbs" aria-label="Breadcrumb">
            <span>{TEST_PAPER_MODULE.name}</span>
            <span>/</span>
            <span>{subject?.name || "Subject"}</span>
            <span>/</span>
            <strong>{chapterLabel}</strong>
          </div>

          <p className="exam-vault-hero__kicker">{TEST_PAPER_MODULE.name}</p>
          <h1>{subject?.name || "Subject"} Papers</h1>
          <p>Use smart filters to quickly locate the right paper for your next attempt.</p>
        </header>

        <section className="exam-vault-subjects-shell">
          <div className="exam-vault-list-toolbar">
            <div className="exam-vault-list-toolbar__meta">
              <span>{filteredPapers.length} papers visible</span>
              <small>
                {papers.length} total in {effectiveMode === TEST_PAPER_MODES.FULL_SYLLABUS ? "full syllabus" : "chapter wise"} mode
              </small>
            </div>

            <label className="exam-vault-search-input exam-vault-search-input--toolbar" htmlFor="paper-search">
              <Search size={16} aria-hidden="true" />
              <input
                id="paper-search"
                type="search"
                placeholder="Search subject, chapter, or paper"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </label>

            {activeType === TEST_PAPER_TYPES.PYC ? (
              <label className="exam-vault-year-filter" htmlFor="paper-year-filter">
                <span>Year</span>
                <select
                  id="paper-year-filter"
                  value={yearFilter}
                  onChange={(event) => setYearFilter(event.target.value)}
                >
                  <option value="all">All</option>
                  {availablePycYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>

          <PaperTabs
            options={TEST_PAPER_TYPE_OPTIONS}
            activeType={activeType}
            countByType={countByType}
            onChange={setActiveType}
          />

          {loading ? <Loader count={8} className="exam-vault-paper-grid" /> : null}

          {!loading && error ? <p className="exam-vault-error-text">{error}</p> : null}

          {!loading && !error && papers.length === 0 ? (
            <EmptyState
              icon={Layers3}
              title="No papers found for this selection"
              description="Try switching to another chapter or full syllabus mode."
            />
          ) : null}

          {!loading && !error && savedPapers.length > 0 ? (
            <section className="exam-vault-insight-block">
              <header className="exam-vault-insight-block__head">
                <h3>
                  <BookMarked size={16} />
                  Saved Papers
                </h3>
                <span>{savedPapers.length}</span>
              </header>
              <PaperList
                papers={savedPapers}
                bookmarkedPaperIds={bookmarkedPaperIdSet}
                onOpenPaper={openPaper}
                onToggleBookmark={toggleBookmark}
              />
            </section>
          ) : null}

          {!loading && !error && recentPapers.length > 0 ? (
            <section className="exam-vault-insight-block">
              <header className="exam-vault-insight-block__head">
                <h3>
                  <Clock3 size={16} />
                  Recent Papers
                </h3>
                <span>{recentPapers.length}</span>
              </header>
              <PaperList
                papers={recentPapers}
                bookmarkedPaperIds={bookmarkedPaperIdSet}
                onOpenPaper={openPaper}
                onToggleBookmark={toggleBookmark}
              />
            </section>
          ) : null}

          {!loading && !error ? (
            <section className="exam-vault-insight-block">
              <header className="exam-vault-insight-block__head">
                <h3>{TEST_PAPER_TYPE_META[activeType]?.label || "Papers"}</h3>
                <span>{filteredPapers.length}</span>
              </header>

              {filteredPapers.length === 0 ? (
                <EmptyState
                  icon={Layers3}
                  title="No papers available"
                  description="Adjust filters to discover more papers."
                />
              ) : (
                <div className="exam-vault-fade-in">
                  <PaperList
                    papers={filteredPapers}
                    bookmarkedPaperIds={bookmarkedPaperIdSet}
                    onOpenPaper={openPaper}
                    onToggleBookmark={toggleBookmark}
                  />
                </div>
              )}
            </section>
          ) : null}
        </section>
      </section>
    </section>
  );
};

export default TestPaperListPage;
