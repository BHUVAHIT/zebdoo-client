import { useMemo, useState } from "react";
import ConfirmDialog from "../components/ConfirmDialog";
import DataTable from "../components/DataTable";
import FormBuilder from "../components/FormBuilder";
import ModalDrawer from "../components/ModalDrawer";
import RowActions from "../components/RowActions";
import StatusBadge from "../components/StatusBadge";
import StyledSelect from "../components/StyledSelect";
import "./QuestionsPage.css";
import { useCrudResource } from "../hooks/useCrudResource";
import { useEntityOptions } from "../hooks/useEntityOptions";
import { questionService } from "../../shared/services/question.service";
import { STATUS_OPTIONS } from "../types/entities";
import { cleanPayload, formatDate } from "../types/uiHelpers";
import { useAppToast } from "../../../components/notifications/useAppToast";

const WORKFLOW_OPTIONS = [
  { label: "Draft", value: "DRAFT" },
  { label: "Review", value: "REVIEW" },
  { label: "Published", value: "PUBLISHED" },
];

const DIFFICULTY_TAG_OPTIONS = [
  { label: "Easy", value: "EASY" },
  { label: "Medium", value: "MEDIUM" },
  { label: "Hard", value: "HARD" },
];

const EXAM_RELEVANCE_OPTIONS = [
  { label: "Low", value: "LOW" },
  { label: "Medium", value: "MEDIUM" },
  { label: "High", value: "HIGH" },
];

const EMPTY_FORM = {
  subjectId: "",
  chapterId: "",
  testId: "",
  stem: "",
  optionA: "",
  optionB: "",
  optionC: "",
  optionD: "",
  correctOptionId: "A",
  solution: "",
  tags: "",
  difficultyTag: "MEDIUM",
  examRelevance: "MEDIUM",
  workflowStatus: "PUBLISHED",
  status: "ACTIVE",
};

const EMPTY_BULK_IMPORT = {
  subjectId: "",
  chapterId: "",
  testId: "",
  csvText: "",
};

const QuestionsPage = ({ onDataChange }) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [deleteRecord, setDeleteRecord] = useState(null);
  const [subjectFilter, setSubjectFilter] = useState("");
  const [chapterFilter, setChapterFilter] = useState("");
  const [testFilter, setTestFilter] = useState("");
  const [formValues, setFormValues] = useState(EMPTY_FORM);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [bulkImportValues, setBulkImportValues] = useState(EMPTY_BULK_IMPORT);
  const { pushToast } = useAppToast();

  const {
    loading: optionsLoading,
    options,
    refresh: refreshOptions,
    getChapterOptions,
    getTestOptions,
  } = useEntityOptions();

  const validSubjectIds = useMemo(
    () => new Set((options.subjects || []).map((item) => String(item.value))),
    [options.subjects]
  );
  const effectiveSubjectFilter =
    subjectFilter && validSubjectIds.has(String(subjectFilter)) ? subjectFilter : "";

  const filteredChapters = useMemo(
    () => getChapterOptions(effectiveSubjectFilter),
    [effectiveSubjectFilter, getChapterOptions]
  );

  const validFilteredChapterIds = useMemo(
    () => new Set(filteredChapters.map((item) => String(item.value))),
    [filteredChapters]
  );
  const effectiveChapterFilter =
    chapterFilter && validFilteredChapterIds.has(String(chapterFilter))
      ? chapterFilter
      : "";

  const filteredTests = useMemo(
    () =>
      getTestOptions({
        subjectId: effectiveSubjectFilter,
        chapterId: effectiveChapterFilter,
      }),
    [effectiveChapterFilter, effectiveSubjectFilter, getTestOptions]
  );

  const validFilteredTestIds = useMemo(
    () => new Set(filteredTests.map((item) => String(item.value))),
    [filteredTests]
  );
  const effectiveTestFilter =
    testFilter && validFilteredTestIds.has(String(testFilter)) ? testFilter : "";

  const {
    query,
    updateQuery,
    items,
    total,
    totalPages,
    loading,
    isFetching,
    submitting,
    error,
    refresh,
    createItem,
    updateItem,
    deleteItem,
  } = useCrudResource({
    list: questionService.list,
    create: questionService.create,
    update: questionService.update,
    remove: questionService.remove,
    resourceKey: "questions",
    initialQuery: {
      sortBy: "createdAt",
      sortDir: "desc",
    },
    externalFilters: {
      subjectId: effectiveSubjectFilter || undefined,
      chapterId: effectiveChapterFilter || undefined,
      testId: effectiveTestFilter || undefined,
    },
  });

  const columns = useMemo(
    () => [
      {
        key: "stem",
        label: "Question",
        sortable: true,
        width: "300px",
        maxWidth: "300px",
      },
      { key: "subjectName", label: "Subject", sortable: true, width: "150px", maxWidth: "150px" },
      { key: "chapterTitle", label: "Chapter", sortable: true, width: "160px", maxWidth: "160px" },
      {
        key: "testTitle",
        label: "Test",
        sortable: true,
        width: "180px",
        maxWidth: "180px",
      },
      {
        key: "tags",
        label: "Tags",
        width: "180px",
        maxWidth: "180px",
        render: (row) => (row.tags || []).slice(0, 2).join(", ") || "-",
      },
      { key: "workflowStatus", label: "Workflow", sortable: true, width: "120px", maxWidth: "120px" },
      {
        key: "correctAnswerLabel",
        label: "Correct",
        sortable: true,
        width: "210px",
        maxWidth: "210px",
        render: (row) => `${row.correctAnswerLabel}: ${row.correctAnswerText}`,
      },
      {
        key: "status",
        label: "Status",
        sortable: true,
        width: "120px",
        maxWidth: "120px",
        render: (row) => <StatusBadge status={row.status} />,
      },
      {
        key: "createdAt",
        label: "Created",
        sortable: true,
        width: "130px",
        maxWidth: "130px",
        render: (row) => formatDate(row.createdAt),
      },
      {
        key: "actions",
        label: "Actions",
        width: "132px",
        maxWidth: "132px",
        render: (row) => {
          const optionMap = row.options.reduce((acc, option) => {
            acc[option.id] = option.text;
            return acc;
          }, {});

          return (
            <RowActions
              onEdit={() => {
                setEditingRecord(row);
                setFormValues({
                  subjectId: row.subjectId,
                  chapterId: row.chapterId,
                  testId: row.testId,
                  stem: row.stem,
                  optionA: optionMap.A || "",
                  optionB: optionMap.B || "",
                  optionC: optionMap.C || "",
                  optionD: optionMap.D || "",
                  correctOptionId: row.correctOptionId,
                  solution: row.solution,
                  tags: (row.tags || []).join(", "),
                  difficultyTag: row.difficultyTag || "MEDIUM",
                  examRelevance: row.examRelevance || "MEDIUM",
                  workflowStatus: row.workflowStatus || "PUBLISHED",
                  status: row.status,
                });
                setDrawerOpen(true);
              }}
              onDelete={() => setDeleteRecord(row)}
            />
          );
        },
      },
    ],
    []
  );

  const effectiveFormSubjectId =
    formValues.subjectId && validSubjectIds.has(String(formValues.subjectId))
      ? formValues.subjectId
      : "";

  const formChapterOptions = useMemo(
    () => getChapterOptions(effectiveFormSubjectId),
    [effectiveFormSubjectId, getChapterOptions]
  );

  const validFormChapterIds = useMemo(
    () => new Set(formChapterOptions.map((item) => String(item.value))),
    [formChapterOptions]
  );
  const effectiveFormChapterId =
    formValues.chapterId && validFormChapterIds.has(String(formValues.chapterId))
      ? formValues.chapterId
      : "";

  const formTestOptions = useMemo(
    () =>
      getTestOptions({
        subjectId: effectiveFormSubjectId,
        chapterId: effectiveFormChapterId,
      }),
    [effectiveFormChapterId, effectiveFormSubjectId, getTestOptions]
  );

  const validFormTestIds = useMemo(
    () => new Set(formTestOptions.map((item) => String(item.value))),
    [formTestOptions]
  );
  const effectiveFormTestId =
    formValues.testId && validFormTestIds.has(String(formValues.testId))
      ? formValues.testId
      : "";

  const effectiveFormValues = useMemo(
    () => ({
      ...formValues,
      subjectId: effectiveFormSubjectId,
      chapterId: effectiveFormChapterId,
      testId: effectiveFormTestId,
    }),
    [effectiveFormChapterId, effectiveFormSubjectId, effectiveFormTestId, formValues]
  );

  const fields = useMemo(
    () => [
      {
        name: "subjectId",
        label: "Subject",
        type: "select",
        required: true,
        options: options.subjects,
      },
      {
        name: "chapterId",
        label: "Chapter",
        type: "select",
        required: true,
        options: formChapterOptions,
      },
      {
        name: "testId",
        label: "Test",
        type: "select",
        required: true,
        options: formTestOptions,
      },
      {
        name: "stem",
        label: "Question Stem",
        type: "textarea",
        required: true,
        rows: 3,
        placeholder: "Enter question statement",
      },
      {
        name: "optionA",
        label: "Option A",
        type: "textarea",
        required: true,
        rows: 2,
        autoResize: true,
        fullWidth: false,
      },
      {
        name: "optionB",
        label: "Option B",
        type: "textarea",
        required: true,
        rows: 2,
        autoResize: true,
        fullWidth: false,
      },
      {
        name: "optionC",
        label: "Option C",
        type: "textarea",
        required: true,
        rows: 2,
        autoResize: true,
        fullWidth: false,
      },
      {
        name: "optionD",
        label: "Option D",
        type: "textarea",
        required: true,
        rows: 2,
        autoResize: true,
        fullWidth: false,
      },
      {
        name: "correctOptionId",
        label: "Correct Option",
        type: "select",
        required: true,
        options: [
          { label: "A", value: "A" },
          { label: "B", value: "B" },
          { label: "C", value: "C" },
          { label: "D", value: "D" },
        ],
      },
      {
        name: "solution",
        label: "Solution / Explanation",
        type: "textarea",
        required: true,
        rows: 5,
        placeholder: "Enter explanation steps",
      },
      {
        name: "tags",
        label: "Tags (comma separated)",
        placeholder: "AS-15, PYQ, Depreciation",
      },
      {
        name: "difficultyTag",
        label: "Difficulty Tag",
        type: "select",
        required: true,
        options: DIFFICULTY_TAG_OPTIONS,
      },
      {
        name: "examRelevance",
        label: "Exam Relevance",
        type: "select",
        required: true,
        options: EXAM_RELEVANCE_OPTIONS,
      },
      {
        name: "workflowStatus",
        label: "Workflow Status",
        type: "select",
        required: true,
        options: WORKFLOW_OPTIONS,
      },
      {
        name: "status",
        label: "Status",
        type: "select",
        required: true,
        options: STATUS_OPTIONS,
      },
    ],
    [formChapterOptions, formTestOptions, options.subjects]
  );

  const resetForm = () => {
    setEditingRecord(null);
    setFormValues({
      ...EMPTY_FORM,
      subjectId: effectiveSubjectFilter || "",
      chapterId: effectiveChapterFilter || "",
      testId: effectiveTestFilter || "",
    });
  };

  const handleSubmit = async () => {
    const payload = cleanPayload({
      testId: effectiveFormValues.testId,
      stem: effectiveFormValues.stem,
      correctOptionId: effectiveFormValues.correctOptionId,
      solution: effectiveFormValues.solution,
      tags: String(effectiveFormValues.tags || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      difficultyTag: effectiveFormValues.difficultyTag,
      examRelevance: effectiveFormValues.examRelevance,
      workflowStatus: effectiveFormValues.workflowStatus,
      status: effectiveFormValues.status,
      options: {
        A: effectiveFormValues.optionA,
        B: effectiveFormValues.optionB,
        C: effectiveFormValues.optionC,
        D: effectiveFormValues.optionD,
      },
    });

    if (editingRecord) {
      await updateItem(editingRecord.id, payload);
    } else {
      await createItem(payload);
    }

    await refreshOptions();
    await onDataChange?.();
    setDrawerOpen(false);
    resetForm();
  };

  const handleDelete = async () => {
    if (!deleteRecord) return;

    await deleteItem(deleteRecord.id);
    await onDataChange?.();
    setDeleteRecord(null);
  };

  const handleBulkImport = async () => {
    const payload = cleanPayload(bulkImportValues);
    await questionService.bulkImport(payload);
    await refresh();
    await refreshOptions();
    await onDataChange?.();

    pushToast({
      title: "Bulk import complete",
      message: "Questions were imported successfully.",
      tone: "success",
    });

    setBulkImportOpen(false);
    setBulkImportValues(EMPTY_BULK_IMPORT);
  };

  const toolbarSlot = (
    <>
      <StyledSelect
        label="Subject"
        value={effectiveSubjectFilter}
        onChange={(nextSubject) => {
          setSubjectFilter(nextSubject);
          setChapterFilter("");
          setTestFilter("");
          updateQuery({ page: 1 });
        }}
        disabled={optionsLoading}
        options={[
          { label: "All Subjects", value: "" },
          ...options.subjects.map((subject) => ({
            label: subject.label,
            value: subject.value,
          })),
        ]}
        className="w-full sm:w-[220px]"
      />

      <StyledSelect
        label="Chapter"
        value={effectiveChapterFilter}
        onChange={(nextChapter) => {
          setChapterFilter(nextChapter);
          setTestFilter("");
          updateQuery({ page: 1 });
        }}
        disabled={!effectiveSubjectFilter}
        options={[
          { label: "All Chapters", value: "" },
          ...filteredChapters.map((chapter) => ({
            label: chapter.label,
            value: chapter.value,
          })),
        ]}
        className="w-full sm:w-[220px]"
      />

      <StyledSelect
        label="Test"
        value={effectiveTestFilter}
        onChange={(nextTest) => {
          setTestFilter(nextTest);
          updateQuery({ page: 1 });
        }}
        disabled={!effectiveChapterFilter}
        options={[
          { label: "All Tests", value: "" },
          ...filteredTests.map((test) => ({
            label: test.label,
            value: test.value,
          })),
        ]}
        className="w-full sm:w-[220px]"
      />
    </>
  );

  const headerActions = (
    <button
      type="button"
      className="sa-btn"
      onClick={() => {
        setBulkImportValues({
          ...EMPTY_BULK_IMPORT,
          subjectId: effectiveSubjectFilter || "",
          chapterId: effectiveChapterFilter || "",
          testId: effectiveTestFilter || "",
        });
        setBulkImportOpen(true);
      }}
      title="Import questions from CSV"
    >
      Bulk Import
    </button>
  );

  return (
    <>
      <DataTable
        title="Question Management"
        description="Create MCQ statements, options, and solutions with rich formatting."
        columns={columns}
        rows={items}
        loading={loading}
        isFetching={isFetching}
        error={error}
        onRetry={refresh}
        emptyMessage="No questions found for current filters."
        search={query.search}
        onSearch={(value) => updateQuery({ search: value })}
        sortBy={query.sortBy}
        sortDir={query.sortDir}
        onSort={({ sortBy, sortDir }) => updateQuery({ sortBy, sortDir })}
        page={query.page}
        totalPages={totalPages}
        total={total}
        pageSize={query.pageSize}
        onPageChange={(nextPage) => updateQuery({ page: nextPage })}
        onPageSizeChange={(nextSize) => updateQuery({ pageSize: nextSize })}
        rowKey="id"
        onAdd={() => {
          resetForm();
          setDrawerOpen(true);
        }}
        addLabel="Add Question"
        toolbarSlot={toolbarSlot}
        headerActions={headerActions}
      />

      <ModalDrawer
        open={drawerOpen}
        title={editingRecord ? "Edit Question" : "Create Question"}
        width="760px"
        onClose={() => {
          setDrawerOpen(false);
          resetForm();
        }}
      >
        <div className="sa-questions-form-modal">
          <FormBuilder
            fields={fields}
            values={effectiveFormValues}
            onChange={(field, value) => {
              if (field === "subjectId") {
                setFormValues((prev) => ({
                  ...prev,
                  subjectId: value,
                  chapterId: "",
                  testId: "",
                }));
                return;
              }

              if (field === "chapterId") {
                setFormValues((prev) => ({
                  ...prev,
                  chapterId: value,
                  testId: "",
                }));
                return;
              }

              setFormValues((prev) => ({ ...prev, [field]: value }));
            }}
            onSubmit={handleSubmit}
            onCancel={() => {
              setDrawerOpen(false);
              resetForm();
            }}
            submitting={submitting}
            submitLabel={editingRecord ? "Update Question" : "Create Question"}
          />
        </div>
      </ModalDrawer>

      <ConfirmDialog
        open={Boolean(deleteRecord)}
        title="Delete question"
        message="Delete this MCQ and its options/answer mapping?"
        confirmLabel="Delete Question"
        onCancel={() => setDeleteRecord(null)}
        onConfirm={handleDelete}
        busy={submitting}
      />

      <ModalDrawer
        open={bulkImportOpen}
        title="Bulk Import Questions"
        onClose={() => {
          setBulkImportOpen(false);
          setBulkImportValues(EMPTY_BULK_IMPORT);
        }}
      >
        <FormBuilder
          fields={[
            {
              name: "subjectId",
              label: "Subject",
              type: "select",
              required: true,
              options: options.subjects,
            },
            {
              name: "chapterId",
              label: "Chapter",
              type: "select",
              required: true,
              options: getChapterOptions(bulkImportValues.subjectId),
            },
            {
              name: "testId",
              label: "Test",
              type: "select",
              required: true,
              options: getTestOptions({
                subjectId: bulkImportValues.subjectId,
                chapterId: bulkImportValues.chapterId,
              }),
            },
            {
              name: "csvText",
              label: "Rows (pipe separated)",
              type: "textarea",
              required: true,
              rows: 8,
              placeholder:
                "stem|optA|optB|optC|optD|correct|solution|tags|difficulty|relevance|workflow",
            },
          ]}
          values={bulkImportValues}
          onChange={(field, value) => {
            if (field === "subjectId") {
              setBulkImportValues((prev) => ({
                ...prev,
                subjectId: value,
                chapterId: "",
                testId: "",
              }));
              return;
            }

            if (field === "chapterId") {
              setBulkImportValues((prev) => ({
                ...prev,
                chapterId: value,
                testId: "",
              }));
              return;
            }

            setBulkImportValues((prev) => ({ ...prev, [field]: value }));
          }}
          onSubmit={handleBulkImport}
          onCancel={() => {
            setBulkImportOpen(false);
            setBulkImportValues(EMPTY_BULK_IMPORT);
          }}
          submitting={submitting}
          submitLabel="Import Questions"
        />
      </ModalDrawer>
    </>
  );
};

export default QuestionsPage;
