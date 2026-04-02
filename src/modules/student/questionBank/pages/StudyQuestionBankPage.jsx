import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import PaginationBar from "../../../../components/PaginationBar";
import {
  getQuestionBankFilters,
  getQuestionBankItems,
  getQuestionBankJournal,
  getQuestionBankRows,
  updateQuestionBankEntry,
} from "../../../../services/questionBankService";
import { useCatalogStore } from "../../../../store/catalogStore";
import { TEST_STORAGE_KEYS } from "../../../../utils/constants";
import { loadFromStorage, saveToStorage } from "../../../../utils/helpers";
import FilterSingleSelect from "../components/FilterSingleSelect";
import FilterMultiSelect from "../components/FilterMultiSelect";
import QuestionBankCard from "../components/QuestionBankCard";
import ProgressTracker from "../../../../shared/components/design/ProgressTracker";
import "../studyQuestionBank.css";

const DEFAULT_FILTER_STATE = Object.freeze({
  subjectId: "",
  chapterIds: [],
  difficultyId: "",
  onlyBookmarked: false,
  onlyLearned: false,
  searchQuery: "",
});

const DEFAULT_PAGE_SIZE = 20;

const normalizeFilterState = ({ filters, rawState }) => {
  const next = {
    ...DEFAULT_FILTER_STATE,
    ...(rawState && typeof rawState === "object" ? rawState : {}),
  };

  const subjectIds = new Set(filters.subjects.map((subject) => subject.id));
  const difficultyIds = new Set(filters.difficulties.map((difficulty) => difficulty.id));
  const safeSubjectId = subjectIds.has(next.subjectId) ? next.subjectId : "";

  const chapterIdsForSubject = new Set(
    (filters.chaptersBySubject[safeSubjectId] || []).map((chapter) => chapter.id)
  );

  const safeChapterIds = Array.isArray(next.chapterIds)
    ? Array.from(
        new Set(next.chapterIds.filter((chapterId) => chapterIdsForSubject.has(chapterId)))
      )
    : [];

  return {
    subjectId: safeSubjectId,
    chapterIds: safeChapterIds,
    difficultyId: difficultyIds.has(next.difficultyId) ? next.difficultyId : "",
    onlyBookmarked: Boolean(next.onlyBookmarked),
    onlyLearned: Boolean(next.onlyLearned),
    searchQuery: String(next.searchQuery || ""),
  };
};

const hasAnyActiveFilter = (state) =>
  Boolean(
    state.subjectId ||
      state.chapterIds.length ||
      state.difficultyId ||
      state.onlyBookmarked ||
      state.onlyLearned ||
      String(state.searchQuery || "").trim()
  );

const StudyQuestionBankPage = () => {
  useCatalogStore((state) => state.version);
  const filters = getQuestionBankFilters();
  const totalQuestionCount = getQuestionBankRows().length;
  const persistedFilterState = useMemo(
    () => loadFromStorage(TEST_STORAGE_KEYS.QUESTION_BANK_STATE, DEFAULT_FILTER_STATE),
    []
  );

  const [filterState, setFilterState] = useState(() =>
    normalizeFilterState({
      filters,
      rawState: persistedFilterState,
    })
  );
  const [journal, setJournal] = useState(() => getQuestionBankJournal());
  const [noteDrafts, setNoteDrafts] = useState(() => {
    const seeded = {};
    const initialJournal = getQuestionBankJournal();

    Object.keys(initialJournal).forEach((key) => {
      const note = String(initialJournal[key]?.note || "");
      if (!note) return;
      seeded[key] = note;
    });

    return seeded;
  });
  const [openDropdownKey, setOpenDropdownKey] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const effectiveFilterState = useMemo(
    () =>
      normalizeFilterState({
        filters,
        rawState: filterState,
      }),
    [filterState, filters]
  );

  const deferredSearchQuery = useDeferredValue(effectiveFilterState.searchQuery);

  const subjectOptions = useMemo(
    () =>
      filters.subjects.map((subject) => ({
        id: subject.id,
        label: subject.name,
      })),
    [filters.subjects]
  );

  const chapterOptions = useMemo(
    () =>
      (filters.chaptersBySubject[effectiveFilterState.subjectId] || []).map((chapter) => ({
        id: chapter.id,
        label: chapter.name,
      })),
    [effectiveFilterState.subjectId, filters.chaptersBySubject]
  );

  const difficultyOptions = useMemo(
    () =>
      filters.difficulties.map((difficulty) => ({
        id: difficulty.id,
        label: difficulty.label,
      })),
    [filters.difficulties]
  );

  const questions = useMemo(
    () =>
      getQuestionBankItems({
        subjectId: effectiveFilterState.subjectId,
        chapterIds: effectiveFilterState.chapterIds,
        difficultyId: effectiveFilterState.difficultyId,
        onlyBookmarked: effectiveFilterState.onlyBookmarked,
        onlyLearned: effectiveFilterState.onlyLearned,
        searchQuery: deferredSearchQuery,
        journal,
      }),
    [
      deferredSearchQuery,
      effectiveFilterState.chapterIds,
      effectiveFilterState.difficultyId,
      effectiveFilterState.onlyBookmarked,
      effectiveFilterState.onlyLearned,
      effectiveFilterState.subjectId,
      journal,
    ]
  );

  const totalPages = useMemo(
    () => Math.max(Math.ceil(questions.length / pageSize), 1),
    [pageSize, questions.length]
  );

  const safeCurrentPage = Math.min(currentPage, totalPages);

  const visibleQuestions = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return questions.slice(start, start + pageSize);
  }, [pageSize, questions, safeCurrentPage]);

  const progressMetrics = useMemo(() => {
    const learnedCount = questions.reduce(
      (acc, question) => acc + (question.isLearned ? 1 : 0),
      0
    );
    const bookmarkedCount = questions.reduce(
      (acc, question) => acc + (question.isBookmarked ? 1 : 0),
      0
    );

    return {
      learnedCount,
      bookmarkedCount,
      viewedCount: Math.min(questions.length, safeCurrentPage * pageSize),
    };
  }, [pageSize, questions, safeCurrentPage]);

  const hasActiveFilters = hasAnyActiveFilter(effectiveFilterState);

  useEffect(() => {
    saveToStorage(TEST_STORAGE_KEYS.QUESTION_BANK_STATE, effectiveFilterState);
  }, [effectiveFilterState]);

  const resetVisibleWindow = useCallback(() => {
    setCurrentPage(1);
  }, []);

  const patchJournalEntry = useCallback((item, patch) => {
    const updated = updateQuestionBankEntry({
      questionId: item.id,
      subjectId: item.subjectId,
      chapterId: item.chapterId,
      patch,
    });

    setJournal((current) => ({
      ...current,
      [item.id]: updated,
    }));

    if (Object.prototype.hasOwnProperty.call(patch, "note")) {
      setNoteDrafts((current) => {
        const nextNote = String(updated.note || "");
        if (current[item.id] === nextNote) return current;

        return {
          ...current,
          [item.id]: nextNote,
        };
      });
    }
  }, []);

  const updateFilterState = useCallback(
    (updater) => {
      setFilterState((current) => {
        const normalizedCurrent = normalizeFilterState({
          filters,
          rawState: current,
        });
        const nextRaw =
          typeof updater === "function" ? updater(normalizedCurrent) : updater;
        return normalizeFilterState({
          filters,
          rawState: nextRaw,
        });
      });
    },
    [filters]
  );

  const handleSubjectChange = useCallback(
    (subjectId) => {
      resetVisibleWindow();
      updateFilterState((current) => ({
        ...current,
        subjectId,
        chapterIds: [],
      }));
    },
    [resetVisibleWindow, updateFilterState]
  );

  const handleChapterChange = useCallback(
    (chapterIds) => {
      resetVisibleWindow();
      updateFilterState((current) => ({
        ...current,
        chapterIds,
      }));
    },
    [resetVisibleWindow, updateFilterState]
  );

  const handleDifficultyChange = useCallback(
    (difficultyId) => {
      resetVisibleWindow();
      updateFilterState((current) => ({
        ...current,
        difficultyId,
      }));
    },
    [resetVisibleWindow, updateFilterState]
  );

  const handleSearchChange = useCallback(
    (searchQuery) => {
      resetVisibleWindow();
      updateFilterState((current) => ({
        ...current,
        searchQuery,
      }));
    },
    [resetVisibleWindow, updateFilterState]
  );

  const handleToggleBookmarkOnly = useCallback(() => {
    resetVisibleWindow();
    updateFilterState((current) => ({
      ...current,
      onlyBookmarked: !current.onlyBookmarked,
    }));
  }, [resetVisibleWindow, updateFilterState]);

  const handleToggleLearnedOnly = useCallback(() => {
    resetVisibleWindow();
    updateFilterState((current) => ({
      ...current,
      onlyLearned: !current.onlyLearned,
    }));
  }, [resetVisibleWindow, updateFilterState]);

  const clearAllFilters = useCallback(() => {
    setFilterState(DEFAULT_FILTER_STATE);
    setOpenDropdownKey("");
    resetVisibleWindow();
  }, [resetVisibleWindow]);

  const toggleBookmark = useCallback(
    (item) => {
      patchJournalEntry(item, {
        isBookmarked: !item.isBookmarked,
      });
    },
    [patchJournalEntry]
  );

  const toggleLearned = useCallback(
    (item) => {
      patchJournalEntry(item, {
        isLearned: !item.isLearned,
      });
    },
    [patchJournalEntry]
  );

  const handleNoteChange = useCallback((questionId, nextValue) => {
    setNoteDrafts((current) => {
      if (current[questionId] === nextValue) return current;

      return {
        ...current,
        [questionId]: nextValue,
      };
    });
  }, []);

  const saveNote = useCallback(
    (item) => {
      const nextNote = String(noteDrafts[item.id] ?? item.note ?? "").trim();
      const currentNote = String(item.note ?? "").trim();
      if (nextNote === currentNote) return;

      patchJournalEntry(item, {
        note: nextNote,
      });
    },
    [noteDrafts, patchJournalEntry]
  );

  return (
    <section className="sqb-page">
      <header className="sqb-hero">
        <div>
          <p className="sqb-hero__kicker">Study Mode</p>
          <h1>Question Bank</h1>
          <p>
            Read questions without timer pressure, inspect the right answer, and keep your
            preparation focused with stable filters, bookmarks, and notes.
          </p>
        </div>

        <div className="sqb-hero__stats">
          <span>
            Showing {questions.length} of {totalQuestionCount}
          </span>
          {hasActiveFilters ? <em>Filters active</em> : <em>All questions</em>}
        </div>
      </header>

      <section className="sqb-progress-grid" aria-label="Learning progress insights">
        <ProgressTracker
          label="Practice Coverage"
          current={questions.length}
          total={totalQuestionCount}
          tone="focus"
          helper="Questions available in current scope"
        />
        <ProgressTracker
          label="Learned Confidence"
          current={progressMetrics.learnedCount}
          total={Math.max(questions.length, 1)}
          tone="success"
          helper="Questions marked as learned"
        />
        <ProgressTracker
          label="Bookmark Momentum"
          current={progressMetrics.bookmarkedCount}
          total={Math.max(questions.length, 1)}
          tone="premium"
          helper={`Reviewed ${progressMetrics.viewedCount} questions in current session`}
        />
      </section>

      <section className="sqb-filters" aria-label="Question bank filters">
        <div className="sqb-filters__search">
          <label htmlFor="sqb-search-input">Search questions</label>
          <div>
            <input
              id="sqb-search-input"
              type="search"
              value={effectiveFilterState.searchQuery}
              onChange={(event) => handleSearchChange(event.target.value)}
              placeholder="Search by question, chapter, answer, or keyword"
            />
            {effectiveFilterState.searchQuery ? (
              <button
                type="button"
                className="sqb-filters__search-clear"
                onClick={() => handleSearchChange("")}
              >
                Clear
              </button>
            ) : null}
          </div>
        </div>

        <div className="sqb-filters__controls">
          <FilterSingleSelect
            id="sqb-subject-filter"
            label="Subject"
            value={effectiveFilterState.subjectId}
            options={subjectOptions}
            placeholder="All subjects"
            disabled={false}
            isOpen={openDropdownKey === "subject"}
            onOpen={() => setOpenDropdownKey("subject")}
            onClose={() => setOpenDropdownKey("")}
            onChange={handleSubjectChange}
          />

          <FilterMultiSelect
            id="sqb-chapter-filter"
            label="Chapters"
            options={chapterOptions}
            value={effectiveFilterState.chapterIds}
            placeholder={effectiveFilterState.subjectId ? "All chapters" : "Select a subject first"}
            disabled={!effectiveFilterState.subjectId}
            isOpen={openDropdownKey === "chapter"}
            onOpen={() => setOpenDropdownKey("chapter")}
            onClose={() => setOpenDropdownKey("")}
            onChange={handleChapterChange}
          />

          <FilterSingleSelect
            id="sqb-difficulty-filter"
            label="Difficulty"
            value={effectiveFilterState.difficultyId}
            options={difficultyOptions}
            placeholder="All levels"
            disabled={false}
            isOpen={openDropdownKey === "difficulty"}
            onOpen={() => setOpenDropdownKey("difficulty")}
            onClose={() => setOpenDropdownKey("")}
            onChange={handleDifficultyChange}
          />

          <div className="sqb-toggle-group" role="group" aria-label="Quick toggles">
            <button
              type="button"
              className={`sqb-toggle ${effectiveFilterState.onlyBookmarked ? "is-active" : ""}`}
              onClick={handleToggleBookmarkOnly}
              aria-pressed={effectiveFilterState.onlyBookmarked}
            >
              Only bookmarked
            </button>

            <button
              type="button"
              className={`sqb-toggle ${effectiveFilterState.onlyLearned ? "is-active" : ""}`}
              onClick={handleToggleLearnedOnly}
              aria-pressed={effectiveFilterState.onlyLearned}
            >
              Only learned
            </button>

            <button
              type="button"
              className="sqb-clear-btn"
              onClick={clearAllFilters}
              disabled={!hasActiveFilters}
            >
              Clear all filters
            </button>
          </div>
        </div>
      </section>

      <section className="sqb-list" aria-live="polite">
        {questions.length === 0 ? (
          <article className="sqb-empty">
            <h2>No questions found</h2>
            <p>Try removing one or more filters, or broaden your search terms.</p>
          </article>
        ) : null}

        {visibleQuestions.map((question, index) => (
          <QuestionBankCard
            key={question.id}
            question={question}
            index={(safeCurrentPage - 1) * pageSize + index}
            noteValue={noteDrafts[question.id] ?? question.note ?? ""}
            onToggleBookmark={toggleBookmark}
            onToggleLearned={toggleLearned}
            onNoteChange={handleNoteChange}
            onSaveNote={saveNote}
          />
        ))}

        {questions.length > 0 ? (
          <PaginationBar
            currentPage={safeCurrentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={questions.length}
            pageSizeOptions={[10, 20, 40, 80]}
            onPageChange={(nextPage) =>
              setCurrentPage(Math.min(Math.max(nextPage, 1), totalPages))
            }
            onPageSizeChange={(nextSize) => {
              setPageSize(nextSize);
              setCurrentPage(1);
            }}
            onJump={setCurrentPage}
            jumpMax={totalPages}
          />
        ) : null}
      </section>
    </section>
  );
};

export default StudyQuestionBankPage;
