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
import { chapterService } from "../../shared/services/chapter.service";
import { STATUS_OPTIONS } from "../types/entities";
import { cleanPayload, formatDate } from "../types/uiHelpers";

const EMPTY_FORM = {
  subjectId: "",
  title: "",
  orderNo: 1,
  status: "ACTIVE",
};

const ChaptersPage = ({ onDataChange }) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [deleteRecord, setDeleteRecord] = useState(null);
  const [subjectFilter, setSubjectFilter] = useState("");
  const [formValues, setFormValues] = useState(EMPTY_FORM);

  const {
    loading: optionsLoading,
    options,
    refresh: refreshOptions,
  } = useEntityOptions();

  const validSubjectIds = useMemo(
    () => new Set((options.subjects || []).map((item) => String(item.value))),
    [options.subjects]
  );

  const effectiveSubjectFilter =
    subjectFilter && validSubjectIds.has(String(subjectFilter)) ? subjectFilter : "";

  const effectiveFormValues = useMemo(
    () => ({
      ...formValues,
      subjectId:
        formValues.subjectId && validSubjectIds.has(String(formValues.subjectId))
          ? formValues.subjectId
          : "",
    }),
    [formValues, validSubjectIds]
  );

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
    list: chapterService.list,
    create: chapterService.create,
    update: chapterService.update,
    remove: chapterService.remove,
    resourceKey: "chapters",
    initialQuery: {
      sortBy: "createdAt",
      sortDir: "desc",
    },
    externalFilters: {
      subjectId: effectiveSubjectFilter || undefined,
    },
  });

  const columns = useMemo(
    () => [
      { key: "title", label: "Chapter", sortable: true, width: "230px", maxWidth: "230px" },
      { key: "subjectName", label: "Subject", sortable: true, width: "180px", maxWidth: "180px" },
      { key: "orderNo", label: "Order", sortable: true, width: "90px", maxWidth: "90px" },
      { key: "testCount", label: "Tests", sortable: true, width: "90px", maxWidth: "90px" },
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
                title: row.title,
                orderNo: row.orderNo,
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

  const fields = useMemo(
    () => [
      {
        name: "subjectId",
        label: "Subject",
        type: "select",
        required: true,
        options: options.subjects,
      },
      { name: "title", label: "Chapter Title", required: true, placeholder: "Chapter title" },
      { name: "orderNo", label: "Order No", type: "number", required: true, min: 1 },
      {
        name: "status",
        label: "Status",
        type: "select",
        required: true,
        options: STATUS_OPTIONS,
      },
    ],
    [options.subjects]
  );

  const resetForm = () => {
    setEditingRecord(null);
    setFormValues({ ...EMPTY_FORM, subjectId: effectiveSubjectFilter || "" });
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
    <StyledSelect
      label="Subject"
      value={effectiveSubjectFilter}
      onChange={(nextSubject) => {
        setSubjectFilter(nextSubject);
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
  );

  return (
    <>
      <DataTable
        title="Chapter Management"
        description="Organize chapters under each subject with consistent ordering and status."
        columns={columns}
        rows={items}
        loading={loading}
        isFetching={isFetching}
        error={error}
        onRetry={refresh}
        emptyMessage="No chapters found for current filters."
        search={query.search}
        onSearch={(value) => updateQuery({ search: value })}
        onAdd={() => {
          resetForm();
          setDrawerOpen(true);
        }}
        addLabel="Add Chapter"
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
        toolbarSlot={toolbarSlot}
      />

      <ModalDrawer
        open={drawerOpen}
        title={editingRecord ? "Edit Chapter" : "Create Chapter"}
        onClose={() => {
          setDrawerOpen(false);
          resetForm();
        }}
      >
        <FormBuilder
          fields={fields}
          values={effectiveFormValues}
          onChange={(field, value) => setFormValues((prev) => ({ ...prev, [field]: value }))}
          onSubmit={handleSubmit}
          onCancel={() => {
            setDrawerOpen(false);
            resetForm();
          }}
          submitting={submitting}
          submitLabel={editingRecord ? "Update Chapter" : "Create Chapter"}
        />
      </ModalDrawer>

      <ConfirmDialog
        open={Boolean(deleteRecord)}
        title="Delete chapter"
        message={`Delete ${deleteRecord?.title || "this chapter"}? Associated tests and questions will be removed.`}
        confirmLabel="Delete Chapter"
        onCancel={() => setDeleteRecord(null)}
        onConfirm={handleDelete}
        busy={submitting}
      />
    </>
  );
};

export default ChaptersPage;
