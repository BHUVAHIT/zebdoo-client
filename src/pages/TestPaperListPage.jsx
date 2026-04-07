import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, Layers3, Search } from "lucide-react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import EmptyState from "../components/EmptyState";
import Loader from "../components/Loader";
import PaperList from "../components/PaperList";
import PaperTabs from "../components/PaperTabs";
import { InlineLoadingNotice } from "../components/loading/LoadingPrimitives";
import {
  TEST_PAPER_MODES,
  TEST_PAPER_MODULE,
  TEST_PAPER_TYPE_META,
  TEST_PAPER_TYPE_OPTIONS,
  TEST_PAPER_TYPES,
} from "../constants/paperTypes";
import { routeBuilders, ROUTES } from "../routes/routePaths";
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

const normalizePaperTypeForUi = (paperType) =>
  TEST_PAPER_TYPE_META[paperType] ? paperType : TEST_PAPER_TYPES.OTHER;

const TestPaperListPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { subjectId, mode, chapterId } = useParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [subject, setSubject] = useState(null);
  const [papers, setPapers] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [activeType, setActiveType] = useState(TEST_PAPER_TYPES.PYC);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
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

  const canonicalPath = useMemo(() => {
    if (!subjectId) return routeBuilders.testPapers.root;

    if (!effectiveMode) {
      return routeBuilders.testPapers.subject(subjectId);
    }

    if (effectiveMode === TEST_PAPER_MODES.FULL_SYLLABUS) {
      return routeBuilders.testPapers.mode(subjectId, TEST_PAPER_MODES.FULL_SYLLABUS);
    }

    const normalizedChapterId = String(chapterId || "all").trim() || "all";
    return routeBuilders.testPapers.chapter(
      subjectId,
      TEST_PAPER_MODES.CHAPTER_WISE,
      normalizedChapterId
    );
  }, [chapterId, effectiveMode, subjectId]);

  useEffect(() => {
    if (!canonicalPath) return;
    if (location.pathname === canonicalPath) return;

    navigate(canonicalPath, { replace: true });
  }, [canonicalPath, location.pathname, navigate]);

  useEffect(() => {
    setActiveType(TEST_PAPER_TYPES.PYC);
    setSearchInput("");
    setDebouncedSearchTerm("");
    setYearFilter("all");
  }, [effectiveChapterId, effectiveMode, subjectId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchTerm(searchInput.trim());
    }, 260);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [searchInput]);

  const loadPapers = useCallback(async () => {
    if (!subjectId) {
      navigate(routeBuilders.testPapers.root, { replace: true });
      return;
    }

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

      const requestedChapterId =
        effectiveMode === TEST_PAPER_MODES.CHAPTER_WISE ? String(chapterId || "all") : null;
      const hasRequestedChapter =
        requestedChapterId &&
        requestedChapterId !== "all" &&
        response.chapters.some((chapter) => chapter.id === requestedChapterId);

      if (
        effectiveMode === TEST_PAPER_MODES.CHAPTER_WISE &&
        requestedChapterId &&
        requestedChapterId !== "all" &&
        !hasRequestedChapter
      ) {
        navigate(
          routeBuilders.testPapers.chapter(subjectId, TEST_PAPER_MODES.CHAPTER_WISE, "all"),
          {
            replace: true,
          }
        );
        return;
      }

      setSubject(response.subject);
      setPapers(response.papers);
      setChapters(response.chapters);
    } catch (loadError) {
      const errorMessage = loadError?.message || "Unable to load papers.";

      if (/subject/i.test(errorMessage) && /not available/i.test(errorMessage)) {
        navigate(routeBuilders.testPapers.root, { replace: true });
        return;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [chapterId, effectiveChapterId, effectiveMode, navigate, subjectId]);

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
        const normalizedType = normalizePaperTypeForUi(paper.type);
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

  useEffect(() => {
    if (!papers.length) {
      if (activeType !== TEST_PAPER_TYPES.PYC) {
        setActiveType(TEST_PAPER_TYPES.PYC);
      }
      return;
    }

    const hasCurrentType = papers.some(
      (paper) => normalizePaperTypeForUi(paper.type) === activeType
    );

    if (hasCurrentType) {
      return;
    }

    const firstAvailableType = TEST_PAPER_TYPE_OPTIONS.find(
      (option) => countByType[option.value] > 0
    )?.value;

    setActiveType(firstAvailableType || TEST_PAPER_TYPES.PYC);
  }, [activeType, countByType, papers]);

  const availablePycYears = useMemo(() => {
    const activeTypePapers = papers.filter(
      (paper) => normalizePaperTypeForUi(paper.type) === activeType
    );

    const source = activeTypePapers.length > 0 ? activeTypePapers : papers;

    const years = source
      .map((paper) => String(paper.year))
      .filter(Boolean);

    return Array.from(new Set(years)).sort((left, right) => Number(right) - Number(left));
  }, [activeType, papers]);

  useEffect(() => {
    if (yearFilter === "all") return;
    if (availablePycYears.includes(yearFilter)) return;
    setYearFilter("all");
  }, [availablePycYears, yearFilter]);

  const filteredPapers = useMemo(() => {
    const query = debouncedSearchTerm.toLowerCase();

    return papers
      .filter((paper) => normalizePaperTypeForUi(paper.type) === activeType)
      .filter((paper) => {
        if (yearFilter === "all") return true;
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
  }, [activeType, debouncedSearchTerm, papers, yearFilter]);

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

  const chapterFilterValue = useMemo(() => {
    if (effectiveMode !== TEST_PAPER_MODES.CHAPTER_WISE) return "";
    return effectiveChapterId || "all";
  }, [effectiveChapterId, effectiveMode]);

  const isChapterSpecificView = useMemo(
    () =>
      effectiveMode === TEST_PAPER_MODES.CHAPTER_WISE &&
      Boolean(chapterFilterValue) &&
      chapterFilterValue !== "all",
    [chapterFilterValue, effectiveMode]
  );

  const backButtonLabel = useMemo(() => {
    if (effectiveMode === TEST_PAPER_MODES.FULL_SYLLABUS) {
      return "Back to subject";
    }

    if (isChapterSpecificView) {
      return "Back to chapters";
    }

    return "Back to subject";
  }, [effectiveMode, isChapterSpecificView]);

  const modeOptions = useMemo(
    () => [
      { value: TEST_PAPER_MODES.CHAPTER_WISE, label: "Chapter Wise" },
      { value: TEST_PAPER_MODES.FULL_SYLLABUS, label: "Full Syllabus" },
    ],
    []
  );

  const handleModeSwitch = useCallback(
    (nextMode) => {
      if (!subjectId || nextMode === effectiveMode) return;

      if (nextMode === TEST_PAPER_MODES.FULL_SYLLABUS) {
        navigate(routeBuilders.testPapers.mode(subjectId, TEST_PAPER_MODES.FULL_SYLLABUS));
        return;
      }

      navigate(routeBuilders.testPapers.chapter(subjectId, TEST_PAPER_MODES.CHAPTER_WISE, "all"));
    },
    [effectiveMode, navigate, subjectId]
  );

  const activeFilterChips = useMemo(() => {
    const chips = [];
    if (debouncedSearchTerm) chips.push(`Search: ${debouncedSearchTerm}`);
    if (yearFilter !== "all") chips.push(`Year: ${yearFilter}`);
    if (effectiveMode === TEST_PAPER_MODES.CHAPTER_WISE) chips.push(`Chapter: ${chapterLabel}`);
    chips.push(`Type: ${TEST_PAPER_TYPE_META[activeType]?.shortLabel || "OTHER"}`);
    return chips;
  }, [activeType, chapterLabel, debouncedSearchTerm, effectiveMode, yearFilter]);

  const clearFilters = useCallback(() => {
    setSearchInput("");
    setDebouncedSearchTerm("");
    setYearFilter("all");
    setActiveType(TEST_PAPER_TYPES.PYC);
  }, []);

  return (
    <section className="exam-vault-shell">
      <section className="exam-vault-page exam-vault-page--list">
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
              <Link
                to={routeBuilders.testPapers.subject(subjectId)}
                className="exam-vault-breadcrumb-link"
              >
                {subject?.name || "Subject"}
              </Link>
              <span>/</span>
              <strong className="exam-vault-breadcrumb-current">{chapterLabel}</strong>
            </div>
            <span className="exam-vault-info-chip">Student view only</span>
          </div>

          <button
            type="button"
            className="exam-vault-back-btn"
            onClick={() => navigate(routeBuilders.testPapers.subject(subjectId))}
          >
            <ArrowLeft size={16} />
            <span>{backButtonLabel}</span>
          </button>

          <p className="exam-vault-hero__kicker">{TEST_PAPER_MODULE.name}</p>
          <h1>{subject?.name || "Subject"} Papers</h1>
          <p>Use smart filters to quickly locate the right paper for your next attempt.</p>
        </header>

        <section className="exam-vault-subjects-shell">
          {isChapterSpecificView ? (
            <p className="exam-vault-context-note">
              Chapter-focused view: mode switching is locked to preserve chapter context.
            </p>
          ) : (
            <div
              className="exam-vault-mode-toggle exam-vault-mode-toggle--list"
              role="tablist"
              aria-label="Paper mode"
            >
              {modeOptions.map((option) => {
                const isActive = option.value === effectiveMode;

                return (
                  <button
                    key={option.value}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    className={`exam-vault-mode-toggle__btn ${isActive ? "is-active" : ""}`}
                    onClick={() => handleModeSwitch(option.value)}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          )}

          <div className="exam-vault-list-toolbar">
            <div className="exam-vault-list-toolbar__meta">
              <span>{filteredPapers.length} papers visible</span>
              <small>
                {papers.length} total in {effectiveMode === TEST_PAPER_MODES.FULL_SYLLABUS ? "full syllabus" : "chapter wise"} mode
              </small>
            </div>

            <div className="exam-vault-list-toolbar__controls">
              <div className="exam-vault-list-toolbar__selects">
                {effectiveMode === TEST_PAPER_MODES.CHAPTER_WISE ? (
                  <label className="exam-vault-chapter-filter" htmlFor="paper-chapter-filter">
                    <span>Chapter</span>
                    <select
                      id="paper-chapter-filter"
                      value={chapterFilterValue}
                      onChange={(event) =>
                        navigate(
                          routeBuilders.testPapers.chapter(
                            subjectId,
                            TEST_PAPER_MODES.CHAPTER_WISE,
                            event.target.value || "all"
                          )
                        )
                      }
                    >
                      <option value="all">All chapters</option>
                      {chapters.map((chapter) => (
                        <option key={chapter.id} value={chapter.id}>
                          {chapter.title}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}

                <label className="exam-vault-year-filter" htmlFor="paper-year-filter">
                  <span>Year</span>
                  <select
                    id="paper-year-filter"
                    value={yearFilter}
                    disabled={availablePycYears.length === 0}
                    onChange={(event) => setYearFilter(event.target.value)}
                  >
                    <option value="all">All years</option>
                    {availablePycYears.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="exam-vault-search-input exam-vault-search-input--toolbar" htmlFor="paper-search">
                <Search size={16} aria-hidden="true" />
                <input
                  id="paper-search"
                  type="search"
                  placeholder="Search subject, chapter, or paper"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                />
              </label>
            </div>
          </div>

          <div className="exam-vault-active-filters" aria-live="polite">
            {activeFilterChips.map((chip) => (
              <span key={chip} className="exam-vault-active-filter-chip">
                {chip}
              </span>
            ))}
            <button type="button" className="exam-vault-active-filters__clear" onClick={clearFilters}>
              Reset filters
            </button>
          </div>

          <PaperTabs
            options={TEST_PAPER_TYPE_OPTIONS}
            activeType={activeType}
            countByType={countByType}
            onChange={setActiveType}
          />

          {loading ? (
            <>
              <InlineLoadingNotice label="Loading papers for selected chapter, type, and year..." />
              <Loader count={7} className="exam-vault-table-skeleton" />
            </>
          ) : null}

          {!loading && error ? (
            <EmptyState
              icon={AlertTriangle}
              title="Unable to load papers"
              description={error}
              actionLabel="Retry"
              onAction={loadPapers}
            />
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
