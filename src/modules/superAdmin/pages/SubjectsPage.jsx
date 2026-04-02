import { useMemo, useState } from "react";
import ConfirmDialog from "../components/ConfirmDialog";
import DataTable from "../components/DataTable";
import FormBuilder from "../components/FormBuilder";
import ModalDrawer from "../components/ModalDrawer";
import RowActions from "../components/RowActions";
import StatusBadge from "../components/StatusBadge";
import { useCrudResource } from "../hooks/useCrudResource";
import { subjectService } from "../../shared/services/subject.service";
import { STATUS_OPTIONS } from "../types/entities";
import { cleanPayload, formatDate } from "../types/uiHelpers";

const EMPTY_FORM = {
  code: "",
  name: "",
  description: "",
  status: "ACTIVE",
};

const SubjectsPage = ({ onDataChange }) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [deleteRecord, setDeleteRecord] = useState(null);
  const [formValues, setFormValues] = useState(EMPTY_FORM);

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
    list: subjectService.list,
    create: subjectService.create,
    update: subjectService.update,
    remove: subjectService.remove,
    resourceKey: "subjects",
    initialQuery: {
      sortBy: "createdAt",
      sortDir: "desc",
    },
  });

  const columns = useMemo(
    () => [
      { key: "code", label: "Code", sortable: true, width: "120px", maxWidth: "120px" },
      { key: "name", label: "Subject", sortable: true, width: "200px", maxWidth: "200px" },
      {
        key: "description",
        label: "Description",
        width: "280px",
        maxWidth: "280px",
      },
      { key: "chapterCount", label: "Chapters", sortable: true, width: "110px", maxWidth: "110px" },
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
        width: "140px",
        maxWidth: "140px",
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
                code: row.code,
                name: row.name,
                description: row.description,
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
        name: "code",
        label: "Subject Code",
        required: Boolean(editingRecord),
        readOnly: !editingRecord,
        placeholder: editingRecord ? "SUB-001" : "Auto-generated on save",
      },
      { name: "name", label: "Subject Name", required: true, placeholder: "Accounting" },
      {
        name: "description",
        label: "Description",
        type: "textarea",
        required: true,
        rows: 4,
        placeholder: "Brief summary of syllabus and coverage",
      },
      {
        name: "status",
        label: "Status",
        type: "select",
        required: true,
        options: STATUS_OPTIONS,
      },
    ],
    [editingRecord]
  );

  const resetForm = () => {
    setEditingRecord(null);
    setFormValues(EMPTY_FORM);
  };

  const handleSubmit = async () => {
    const payload = cleanPayload(formValues);

    if (editingRecord) {
      await updateItem(editingRecord.id, payload);
    } else {
      await createItem(payload);
    }

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

  return (
    <>
      <DataTable
        title="Subject Management"
        description="Primary curriculum entities for organizing chapters, tests, and questions."
        columns={columns}
        rows={items}
        loading={loading}
        isFetching={isFetching}
        error={error}
        onRetry={refresh}
        emptyMessage="No subjects available."
        search={query.search}
        onSearch={(value) => updateQuery({ search: value })}
        onAdd={() => {
          resetForm();
          setDrawerOpen(true);
        }}
        addLabel="Add Subject"
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
      />

      <ModalDrawer
        open={drawerOpen}
        title={editingRecord ? "Edit Subject" : "Create Subject"}
        onClose={() => {
          setDrawerOpen(false);
          resetForm();
        }}
      >
        <FormBuilder
          fields={fields}
          values={formValues}
          onChange={(field, value) => setFormValues((prev) => ({ ...prev, [field]: value }))}
          onSubmit={handleSubmit}
          onCancel={() => {
            setDrawerOpen(false);
            resetForm();
          }}
          submitting={submitting}
          submitLabel={editingRecord ? "Update Subject" : "Create Subject"}
        />
      </ModalDrawer>

      <ConfirmDialog
        open={Boolean(deleteRecord)}
        title="Delete subject"
        message={`Delete ${deleteRecord?.name || "this subject"}? Chapters, tests, and questions under this subject will also be removed.`}
        confirmLabel="Delete Subject"
        onCancel={() => setDeleteRecord(null)}
        onConfirm={handleDelete}
        busy={submitting}
      />
    </>
  );
};

export default SubjectsPage;
