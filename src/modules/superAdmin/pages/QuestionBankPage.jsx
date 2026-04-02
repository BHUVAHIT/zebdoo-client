import { useMemo, useState } from "react";
import ConfirmDialog from "../components/ConfirmDialog";
import QuestionForm from "../questionBank/components/QuestionForm";
import QuestionTable from "../questionBank/components/QuestionTable";
import { useEntityOptions } from "../hooks/useEntityOptions";
import { useCatalogStore } from "../../../store/catalogStore";
import { useQuestionBankStore } from "../../../store/questionBankStore";
import { useAppToast } from "../../../components/notifications/useAppToast";

const DIFFICULTY_ORDER = {
  Easy: 1,
  Medium: 2,
  Hard: 3,
};

const EMPTY_FORM = Object.freeze({
  subjectId: "",
  chapterId: "",
  difficulty: "Medium",
  question: "",
  optionA: "",
  optionB: "",
  optionC: "",
  optionD: "",
  correctAnswer: "A",
});

const normalizeSearch = (value) => String(value || "").trim().toLowerCase();

const QuestionBankPage = () => {
  const questions = useQuestionBankStore((state) => state.questions);
  const addQuestion = useQuestionBankStore((state) => state.addQuestion);
  const updateQuestion = useQuestionBankStore((state) => state.updateQuestion);
  const deleteQuestion = useQuestionBankStore((state) => state.deleteQuestion);
  const catalogDb = useCatalogStore((state) => state.db);
  const { options, getChapterOptions } = useEntityOptions();
  const { pushToast } = useAppToast();

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("question");
  const [sortDir, setSortDir] = useState("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [subjectFilter, setSubjectFilter] = useState("");
  const [chapterFilter, setChapterFilter] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [deleteRecord, setDeleteRecord] = useState(null);
  const [editingRecord, setEditingRecord] = useState(null);
  const [formValues, setFormValues] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const chapterOptions = useMemo(
    () => getChapterOptions(formValues.subjectId),
    [formValues.subjectId, getChapterOptions]
  );

  const filterChapterOptions = useMemo(
    () => getChapterOptions(subjectFilter),
    [getChapterOptions, subjectFilter]
  );

  const subjectNameById = (Array.isArray(catalogDb?.subjects) ? catalogDb.subjects : []).reduce(
    (acc, item) => {
      const id = String(item.id || "").trim();
      if (!id) return acc;
      acc[id] = String(item.name || "Subject").trim() || "Subject";
      return acc;
    },
    {}
  );

  const subjectIdByName = Object.entries(subjectNameById).reduce((acc, [id, name]) => {
    acc[String(name || "").trim().toLowerCase()] = id;
    return acc;
  }, {});

  const chapterMetaById = (Array.isArray(catalogDb?.chapters) ? catalogDb.chapters : []).reduce(
    (acc, item) => {
      const id = String(item.id || "").trim();
      if (!id) return acc;
      acc[id] = {
        id,
        subjectId: String(item.subjectId || "").trim(),
        name: String(item.title || item.name || "Chapter").trim() || "Chapter",
      };
      return acc;
    },
    {}
  );

  const filteredRows = useMemo(() => {
    const query = normalizeSearch(search);

    return questions.filter((item) => {
      if (subjectFilter && String(item.subjectId) !== String(subjectFilter)) {
        return false;
      }

      if (chapterFilter && String(item.chapterId) !== String(chapterFilter)) {
        return false;
      }

      if (difficultyFilter && String(item.difficulty) !== String(difficultyFilter)) {
        return false;
      }

      if (!query) return true;

      const content = [item.subjectName, item.chapterName, item.difficulty, item.question]
        .join(" ")
        .toLowerCase();

      return content.includes(query);
    });
  }, [chapterFilter, difficultyFilter, questions, search, subjectFilter]);

  const sortedRows = useMemo(() => {
    const rows = [...filteredRows];

    rows.sort((left, right) => {
      const direction = sortDir === "desc" ? -1 : 1;

      if (sortBy === "difficulty") {
        const leftWeight = DIFFICULTY_ORDER[left.difficulty] || 99;
        const rightWeight = DIFFICULTY_ORDER[right.difficulty] || 99;
        return (leftWeight - rightWeight) * direction;
      }

      const leftValue = String(left[sortBy] || "").toLowerCase();
      const rightValue = String(right[sortBy] || "").toLowerCase();
      return leftValue.localeCompare(rightValue) * direction;
    });

    return rows;
  }, [filteredRows, sortBy, sortDir]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(sortedRows.length / pageSize)),
    [pageSize, sortedRows.length]
  );

  const safePage = Math.min(page, totalPages);

  const pageRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [pageSize, safePage, sortedRows]);

  const openCreateDrawer = () => {
    setEditingRecord(null);
    setFormValues(EMPTY_FORM);
    setDrawerOpen(true);
  };

  const openEditDrawer = (record) => {
    const fallbackSubjectId =
      record.subjectId ||
      subjectIdByName[String(record.subjectName || "").trim().toLowerCase()] ||
      "";

    const chapterOptionsForSubject = getChapterOptions(fallbackSubjectId);
    const fallbackChapterId =
      record.chapterId ||
      chapterOptionsForSubject.find((item) =>
        String(item.label || "").toLowerCase() === String(record.chapterName || "").toLowerCase()
      )?.value ||
      "";

    setEditingRecord(record);
    setFormValues({
      subjectId: fallbackSubjectId,
      chapterId: fallbackChapterId,
      difficulty: record.difficulty,
      question: record.question,
      optionA: record.options?.[0] || "",
      optionB: record.options?.[1] || "",
      optionC: record.options?.[2] || "",
      optionD: record.options?.[3] || "",
      correctAnswer: record.correctAnswer,
    });
    setDrawerOpen(true);
  };

  const handleSave = async () => {
    if (submitting) {
      return;
    }

    const subjectId = String(formValues.subjectId || "").trim();
    const chapterId = String(formValues.chapterId || "").trim();

    if (!subjectId || !chapterId) {
      pushToast({
        title: "Validation error",
        message: "Please select subject and chapter.",
        tone: "error",
      });
      return;
    }

    const subjectName =
      subjectNameById[subjectId] ||
      options.subjects.find((item) => String(item.value) === subjectId)?.label ||
      "Subject";

    const chapterMeta = chapterMetaById[chapterId];
    const chapterName =
      chapterMeta?.name ||
      chapterOptions.find((item) => String(item.value) === chapterId)?.label ||
      "Chapter";

    const payload = {
      subjectId,
      subjectName,
      chapterId,
      chapterName,
      difficulty: formValues.difficulty,
      question: formValues.question.trim(),
      options: [
        formValues.optionA.trim(),
        formValues.optionB.trim(),
        formValues.optionC.trim(),
        formValues.optionD.trim(),
      ],
      correctAnswer: formValues.correctAnswer,
    };

    setSubmitting(true);

    try {
      if (editingRecord) {
        const updated = updateQuestion(editingRecord.id, payload);
        if (!updated) {
          throw new Error("Unable to update question.");
        }

        pushToast({
          title: "Question updated successfully",
          message: "Changes are now available in student question bank.",
          tone: "success",
        });
      } else {
        const created = addQuestion(payload);
        if (!created) {
          throw new Error("Unable to add question.");
        }

        pushToast({
          title: "Question added successfully",
          message: "New question is now available in student question bank.",
          tone: "success",
        });
      }

      setDrawerOpen(false);
      setEditingRecord(null);
      setFormValues(EMPTY_FORM);
    } catch (error) {
      pushToast({
        title: "Unable to save question",
        message: error?.message || "Please try again.",
        tone: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (deleting) {
      return;
    }

    if (!deleteRecord?.id) return;

    setDeleting(true);

    try {
      const removed = deleteQuestion(deleteRecord.id);
      if (!removed) {
        throw new Error("Unable to delete question.");
      }

      pushToast({
        title: "Question deleted successfully",
        message: "Question has been removed from admin and student views.",
        tone: "success",
      });

      setDeleteRecord(null);
      setPage(1);
    } catch (error) {
      pushToast({
        title: "Unable to delete question",
        message: error?.message || "Please try again.",
        tone: "error",
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <QuestionTable
        rows={pageRows}
        search={search}
        onSearch={(nextValue) => {
          setSearch(nextValue);
          setPage(1);
        }}
        subjectFilter={subjectFilter}
        chapterFilter={chapterFilter}
        difficultyFilter={difficultyFilter}
        subjectOptions={options.subjects}
        chapterOptions={filterChapterOptions}
        onSubjectFilterChange={(nextSubjectId) => {
          setSubjectFilter(nextSubjectId);
          setChapterFilter("");
          setPage(1);
        }}
        onChapterFilterChange={(nextChapterId) => {
          setChapterFilter(nextChapterId);
          setPage(1);
        }}
        onDifficultyFilterChange={(nextDifficulty) => {
          setDifficultyFilter(nextDifficulty);
          setPage(1);
        }}
        onClearFilters={() => {
          setSubjectFilter("");
          setChapterFilter("");
          setDifficultyFilter("");
          setPage(1);
        }}
        onAdd={openCreateDrawer}
        sortBy={sortBy}
        sortDir={sortDir}
        onSort={({ sortBy: nextSortBy, sortDir: nextSortDir }) => {
          setSortBy(nextSortBy);
          setSortDir(nextSortDir);
        }}
        page={safePage}
        totalPages={totalPages}
        total={sortedRows.length}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(nextSize) => {
          setPageSize(nextSize);
          setPage(1);
        }}
        onEdit={openEditDrawer}
        onDelete={setDeleteRecord}
      />

      <QuestionForm
        open={drawerOpen}
        isEditing={Boolean(editingRecord)}
        values={formValues}
        subjectOptions={options.subjects}
        chapterOptions={chapterOptions}
        chapterDisabled={!formValues.subjectId}
        onChange={(field, value) => {
          setFormValues((current) => ({
            ...current,
            [field]: value,
            ...(field === "subjectId" ? { chapterId: "" } : {}),
          }));
        }}
        onSubmit={handleSave}
        onCancel={() => {
          if (submitting) return;
          setDrawerOpen(false);
          setEditingRecord(null);
          setFormValues(EMPTY_FORM);
        }}
        submitting={submitting}
      />

      <ConfirmDialog
        open={Boolean(deleteRecord)}
        title="Delete Question"
        message="This question will be removed from both admin and student question bank views."
        confirmLabel="Delete"
        onCancel={() => {
          if (deleting) return;
          setDeleteRecord(null);
        }}
        onConfirm={handleDelete}
        busy={deleting}
      />
    </>
  );
};

export default QuestionBankPage;
