import { useMemo, useState } from "react";
import ConfirmDialog from "../components/ConfirmDialog";
import DataTable from "../components/DataTable";
import FormBuilder from "../components/FormBuilder";
import ModalDrawer from "../components/ModalDrawer";
import RowActions from "../components/RowActions";
import StatusBadge from "../components/StatusBadge";
import StyledSelect from "../components/StyledSelect";
import { useCrudResource } from "../hooks/useCrudResource";
import { useEntityOptions } from "../hooks/useEntityOptions";
import { testService } from "../../shared/services/test.service";
import { STATUS_OPTIONS, TEST_DIFFICULTY_OPTIONS } from "../types/entities";
import { cleanPayload, formatDate } from "../types/uiHelpers";
import { useAppToast } from "../../../components/notifications/useAppToast";

const WORKFLOW_OPTIONS = [
  { label: "Draft", value: "DRAFT" },
  { label: "Review", value: "REVIEW" },
  { label: "Published", value: "PUBLISHED" },
];

const MIX_STRATEGY_OPTIONS = [
  { label: "Manual", value: "MANUAL" },
  { label: "PYQ + Concept", value: "PYQ+CONCEPT" },
  { label: "Concept Heavy", value: "CONCEPT_HEAVY" },
  { label: "PYQ Heavy", value: "PYQ_HEAVY" },
];

const EMPTY_FORM = {
  subjectId: "",
  chapterId: "",
  title: "",
  difficulty: "MEDIUM",
  durationMinutes: 45,
  workflowStatus: "PUBLISHED",
  mixStrategy: "MANUAL",
  status: "ACTIVE",
};

const EMPTY_AUTO_FORM = {
  subjectId: "",
  chapterId: "",
  baseTitle: "",
  testCount: 3,
  mixStrategy: "PYQ+CONCEPT",
};

const TestsPage = ({ onDataChange }) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [deleteRecord, setDeleteRecord] = useState(null);
  const [subjectFilter, setSubjectFilter] = useState("");
  const [chapterFilter, setChapterFilter] = useState("");
  const [formValues, setFormValues] = useState(EMPTY_FORM);
  const [autoGenerateOpen, setAutoGenerateOpen] = useState(false);
  const [autoGenerateValues, setAutoGenerateValues] = useState(EMPTY_AUTO_FORM);
  const { pushToast } = useAppToast();

  const {
    loading: optionsLoading,
    options,
    refresh: refreshOptions,
    getChapterOptions,
  } = useEntityOptions();

  const validSubjectIds = useMemo(
    () => new Set((options.subjects || []).map((item) => String(item.value))),
    [options.subjects]
  );
  const effectiveSubjectFilter =
    subjectFilter && validSubjectIds.has(String(subjectFilter)) ? subjectFilter : "";

  const filteredChapterOptions = useMemo(
    () => getChapterOptions(effectiveSubjectFilter),
    [effectiveSubjectFilter, getChapterOptions]
  );

  const validFilteredChapterIds = useMemo(
    () => new Set(filteredChapterOptions.map((item) => String(item.value))),
    [filteredChapterOptions]
  );
  const effectiveChapterFilter =
    chapterFilter && validFilteredChapterIds.has(String(chapterFilter))
      ? chapterFilter
      : "";

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
    list: testService.list,
    create: testService.create,
    update: testService.update,
    remove: testService.remove,
    resourceKey: "tests",
    initialQuery: {
      sortBy: "createdAt",
      sortDir: "desc",
    },
    externalFilters: {
      subjectId: effectiveSubjectFilter || undefined,
      chapterId: effectiveChapterFilter || undefined,
    },
  });

  const columns = useMemo(
    () => [
      { key: "title", label: "Test", sortable: true, width: "240px", maxWidth: "240px" },
      { key: "subjectName", label: "Subject", sortable: true, width: "160px", maxWidth: "160px" },
      { key: "chapterTitle", label: "Chapter", sortable: true, width: "180px", maxWidth: "180px" },
      { key: "difficulty", label: "Difficulty", sortable: true, width: "110px", maxWidth: "110px" },
      {
        key: "durationMinutes",
        label: "Duration",
        sortable: true,
        width: "110px",
        maxWidth: "110px",
        render: (row) => `${row.durationMinutes} mins`,
      },
      { key: "workflowStatus", label: "Workflow", sortable: true, width: "130px", maxWidth: "130px" },
      { key: "mixStrategy", label: "Mix", sortable: true, width: "130px", maxWidth: "130px" },
      { key: "questionCount", label: "Questions", sortable: true, width: "110px", maxWidth: "110px" },
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
        width: "120px",
        maxWidth: "120px",
        render: (row) => (
          <RowActions
            onEdit={() => {
              setEditingRecord(row);
              setFormValues({
                subjectId: row.subjectId,
                chapterId: row.chapterId,
                title: row.title,
                difficulty: row.difficulty,
                durationMinutes: row.durationMinutes,
                workflowStatus: row.workflowStatus || "PUBLISHED",
                mixStrategy: row.mixStrategy || "MANUAL",
                status: row.status,
              });
              setDrawerOpen(true);
            }}
            onDelete={() => setDeleteRecord(row)}
          />
        ),
      },
    ],
    []
  );

  const effectiveFormSubjectId =
    formValues.subjectId && validSubjectIds.has(String(formValues.subjectId))
      ? formValues.subjectId
      : "";

  const chapterOptions = useMemo(
    () => getChapterOptions(effectiveFormSubjectId),
    [effectiveFormSubjectId, getChapterOptions]
  );

  const validChapterOptionIds = useMemo(
    () => new Set(chapterOptions.map((item) => String(item.value))),
    [chapterOptions]
  );
  const effectiveFormChapterId =
    formValues.chapterId && validChapterOptionIds.has(String(formValues.chapterId))
      ? formValues.chapterId
      : "";

  const effectiveFormValues = useMemo(
    () => ({
      ...formValues,
      subjectId: effectiveFormSubjectId,
      chapterId: effectiveFormChapterId,
    }),
    [effectiveFormChapterId, effectiveFormSubjectId, formValues]
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
        options: chapterOptions,
      },
      {
        name: "title",
        label: "Test Title",
        required: true,
        placeholder: "Enter test title",
      },
      {
        name: "difficulty",
        label: "Difficulty",
        type: "select",
        required: true,
        options: TEST_DIFFICULTY_OPTIONS,
      },
      {
        name: "durationMinutes",
        label: "Duration (minutes)",
        type: "number",
        required: true,
        min: 5,
      },
      {
        name: "workflowStatus",
        label: "Workflow Status",
        type: "select",
        required: true,
        options: WORKFLOW_OPTIONS,
      },
      {
        name: "mixStrategy",
        label: "Question Mix",
        type: "select",
        required: true,
        options: MIX_STRATEGY_OPTIONS,
      },
      {
        name: "status",
        label: "Status",
        type: "select",
        required: true,
        options: STATUS_OPTIONS,
      },
    ],
    [chapterOptions, options.subjects]
  );

  const resetForm = () => {
    setEditingRecord(null);
    setFormValues({
      ...EMPTY_FORM,
      subjectId: effectiveSubjectFilter || "",
      chapterId: effectiveChapterFilter || "",
      workflowStatus: "PUBLISHED",
      mixStrategy: "MANUAL",
    });
  };

  const handleAutoGenerate = async () => {
    const payload = cleanPayload(autoGenerateValues);

    await testService.autoGenerate(payload);
    await refresh();
    await refreshOptions();
    await onDataChange?.();

    pushToast({
      title: "Auto-generated tests",
      message: "Rules-based test papers were generated successfully.",
      tone: "success",
    });

    setAutoGenerateOpen(false);
    setAutoGenerateValues(EMPTY_AUTO_FORM);
  };

  const handleSubmit = async () => {
    const payload = cleanPayload(effectiveFormValues);

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
    await refreshOptions();
    await onDataChange?.();
    setDeleteRecord(null);
  };

  const toolbarSlot = (
    <>
      <StyledSelect
        label="Subject"
        value={effectiveSubjectFilter}
        onChange={(nextSubject) => {
          setSubjectFilter(nextSubject);
          setChapterFilter("");
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
          updateQuery({ page: 1 });
        }}
        disabled={!effectiveSubjectFilter}
        options={[
          { label: "All Chapters", value: "" },
          ...filteredChapterOptions.map((chapter) => ({
            label: chapter.label,
            value: chapter.value,
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
        setAutoGenerateValues({
          ...EMPTY_AUTO_FORM,
          subjectId: effectiveSubjectFilter || "",
          chapterId: effectiveChapterFilter || "",
        });
        setAutoGenerateOpen(true);
      }}
      title="Generate tests using AI rules"
    >
      Auto Generate
    </button>
  );

  return (
    <>
      <DataTable
        title="Test Management"
        description="Create and manage MCQ test papers with workflow and difficulty controls."
        columns={columns}
        rows={items}
        loading={loading}
        isFetching={isFetching}
        error={error}
        onRetry={refresh}
        emptyMessage="No tests found for current filters."
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
        addLabel="Add Test"
        toolbarSlot={toolbarSlot}
        headerActions={headerActions}
      />

      <ModalDrawer
        open={drawerOpen}
        title={editingRecord ? "Edit Test" : "Create Test"}
        onClose={() => {
          setDrawerOpen(false);
          resetForm();
        }}
      >
        <FormBuilder
          fields={fields}
          values={effectiveFormValues}
          onChange={(field, value) => {
            if (field === "subjectId") {
              setFormValues((prev) => ({
                ...prev,
                subjectId: value,
                chapterId: "",
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
          submitLabel={editingRecord ? "Update Test" : "Create Test"}
        />
      </ModalDrawer>

      <ConfirmDialog
        open={Boolean(deleteRecord)}
        title="Delete test"
        message={`Delete ${deleteRecord?.title || "this test"}? All linked questions will be removed.`}
        confirmLabel="Delete Test"
        onCancel={() => setDeleteRecord(null)}
        onConfirm={handleDelete}
        busy={submitting}
      />

      <ModalDrawer
        open={autoGenerateOpen}
        title="Auto Generate Tests"
        onClose={() => {
          setAutoGenerateOpen(false);
          setAutoGenerateValues(EMPTY_AUTO_FORM);
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
              options: getChapterOptions(autoGenerateValues.subjectId),
            },
            {
              name: "baseTitle",
              label: "Base Test Title",
              required: true,
              placeholder: "Taxation Rapid Drill",
            },
            {
              name: "testCount",
              label: "How many tests",
              type: "number",
              required: true,
              min: 1,
            },
            {
              name: "mixStrategy",
              label: "Mix Strategy",
              type: "select",
              required: true,
              options: MIX_STRATEGY_OPTIONS,
            },
          ]}
          values={autoGenerateValues}
          onChange={(field, value) => {
            if (field === "subjectId") {
              setAutoGenerateValues((prev) => ({
                ...prev,
                subjectId: value,
                chapterId: "",
              }));
              return;
            }

            setAutoGenerateValues((prev) => ({ ...prev, [field]: value }));
          }}
          onSubmit={handleAutoGenerate}
          onCancel={() => {
            setAutoGenerateOpen(false);
            setAutoGenerateValues(EMPTY_AUTO_FORM);
          }}
          submitting={submitting}
          submitLabel="Generate Tests"
        />
      </ModalDrawer>
    </>
  );
};

export default TestsPage;
