import { useMemo, useState } from "react";
import ConfirmDialog from "../components/ConfirmDialog";
import DataTable from "../components/DataTable";
import FormBuilder from "../components/FormBuilder";
import ModalDrawer from "../components/ModalDrawer";
import RowActions from "../components/RowActions";
import StatusBadge from "../components/StatusBadge";
import StyledSelect from "../components/StyledSelect";
import { useCrudResource } from "../hooks/useCrudResource";
import { studentService } from "../../shared/services/student.service";
import { STATUS_OPTIONS } from "../types/entities";
import { cleanPayload, formatDate } from "../types/uiHelpers";
import { useAppToast } from "../../../components/notifications/useAppToast";
import { validatePasswordStrength } from "../../../utils/security";

const EMPTY_FORM = {
  name: "",
  email: "",
  srNo: "",
  level: "Foundation",
  status: "ACTIVE",
  password: "",
  confirmPassword: "",
  forcePasswordChange: true,
};

const EMPTY_RESET_FORM = {
  mode: "AUTO",
  password: "",
  confirmPassword: "",
  forcePasswordChange: true,
};

const StudentsPage = ({ onDataChange }) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [deleteRecord, setDeleteRecord] = useState(null);
  const [formValues, setFormValues] = useState(EMPTY_FORM);
  const [resetRecord, setResetRecord] = useState(null);
  const [resetFormValues, setResetFormValues] = useState(EMPTY_RESET_FORM);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showResetConfirmPassword, setShowResetConfirmPassword] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [resetBusy, setResetBusy] = useState(false);
  const { pushToast } = useAppToast();

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
    list: studentService.list,
    create: studentService.create,
    update: studentService.update,
    remove: studentService.remove,
    resourceKey: "students",
    initialQuery: {
      sortBy: "enrolledAt",
      sortDir: "desc",
    },
  });

  const columns = useMemo(
    () => [
      { key: "name", label: "Student", sortable: true, width: "180px", maxWidth: "180px" },
      { key: "email", label: "Email", sortable: true, width: "220px", maxWidth: "220px" },
      { key: "srNo", label: "SR No", sortable: true, width: "120px", maxWidth: "120px" },
      { key: "level", label: "Level", sortable: true, width: "110px", maxWidth: "110px" },
      {
        key: "credentialState",
        label: "Credential State",
        width: "170px",
        maxWidth: "170px",
        render: (row) =>
          row.forcePasswordChange ? "Reset Required" : row.hasPassword ? "Configured" : "Not Set",
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
        key: "enrolledAt",
        label: "Enrolled",
        sortable: true,
        width: "140px",
        maxWidth: "140px",
        render: (row) => formatDate(row.enrolledAt),
      },
      {
        key: "actions",
        label: "Actions",
        width: "132px",
        maxWidth: "132px",
        render: (row) => (
          <RowActions
            onEdit={() => {
              setEditingRecord(row);
              setFormValues({
                name: row.name,
                email: row.email,
                srNo: row.srNo,
                level: row.level,
                status: row.status,
                password: "",
                confirmPassword: "",
                forcePasswordChange: row.forcePasswordChange ?? true,
              });
              setDrawerOpen(true);
            }}
            onResetPassword={() => {
              setResetRecord(row);
              setGeneratedPassword("");
              setShowResetPassword(false);
              setShowResetConfirmPassword(false);
              setResetFormValues(EMPTY_RESET_FORM);
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
      { name: "name", label: "Student Name", required: true, placeholder: "Enter full name" },
      { name: "email", label: "Email", type: "email", required: true, placeholder: "name@example.com" },
      { name: "srNo", label: "ICAI SR No", required: true, placeholder: "SR000123" },
      {
        name: "level",
        label: "Level",
        type: "select",
        required: true,
        options: [
          { label: "Foundation", value: "Foundation" },
          { label: "Inter", value: "Inter" },
          { label: "Final", value: "Final" },
        ],
      },
      {
        name: "status",
        label: "Status",
        type: "select",
        required: true,
        options: STATUS_OPTIONS,
      },
      ...(!editingRecord
        ? [
            {
              name: "password",
              label: "Initial Password",
              type: "password",
              required: true,
              placeholder: "Use a strong password",
              validate: (value) => {
                const result = validatePasswordStrength(value);
                return result.isValid ? "" : result.errors[0];
              },
            },
            {
              name: "confirmPassword",
              label: "Confirm Password",
              type: "password",
              required: true,
              validate: (value, values) =>
                String(value || "") === String(values.password || "")
                  ? ""
                  : "Confirm Password must match Initial Password.",
            },
            {
              name: "forcePasswordChange",
              label: "Require password change on first login",
              type: "select",
              required: true,
              options: [
                { label: "Yes", value: true },
                { label: "No", value: false },
              ],
            },
          ]
        : []),
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
      const {
        password: _password,
        confirmPassword: _confirmPassword,
        forcePasswordChange: _forcePasswordChange,
        ...safePayload
      } = payload;
      await updateItem(editingRecord.id, safePayload);
    } else {
      await createItem(payload);
    }

    await onDataChange?.();
    setDrawerOpen(false);
    resetForm();
    pushToast({
      title: editingRecord ? "Student updated" : "Student created",
      message: editingRecord
        ? "Student profile details were updated successfully."
        : "Student account created with secure credential setup.",
      tone: "success",
    });
  };

  const handleDelete = async () => {
    if (!deleteRecord) return;

    await deleteItem(deleteRecord.id);
    await onDataChange?.();
    setDeleteRecord(null);
    pushToast({
      title: "Student deleted",
      message: "Student record has been removed.",
      tone: "warning",
    });
  };

  const handlePasswordReset = async (event) => {
    event.preventDefault();
    if (!resetRecord || resetBusy) return;

    if (resetFormValues.mode === "MANUAL") {
      const policy = validatePasswordStrength(resetFormValues.password);
      if (!policy.isValid) {
        pushToast({
          title: "Invalid password",
          message: policy.errors[0],
          tone: "error",
        });
        return;
      }

      if (resetFormValues.password !== resetFormValues.confirmPassword) {
        pushToast({
          title: "Password mismatch",
          message: "Confirm Password must match New Password.",
          tone: "error",
        });
        return;
      }
    }

    setResetBusy(true);
    try {
      const response = await studentService.resetPassword(resetRecord.id, {
        generateTemporary: resetFormValues.mode === "AUTO",
        password:
          resetFormValues.mode === "MANUAL"
            ? resetFormValues.password
            : undefined,
        forcePasswordChange: resetFormValues.forcePasswordChange,
      });

      await refresh();
      await onDataChange?.();

      setGeneratedPassword(response.temporaryPassword || "");
      pushToast({
        title: "Password reset completed",
        message: response.temporaryPassword
          ? "Temporary password generated. Share it securely; it is shown once."
          : "Password updated successfully.",
        tone: "success",
      });
    } catch (requestError) {
      pushToast({
        title: "Password reset failed",
        message: requestError?.message || "Unable to reset password.",
        tone: "error",
      });
    } finally {
      setResetBusy(false);
    }
  };

  return (
    <>
      <DataTable
        title="Student Management"
        description="Manage learner records with enrollment metadata, lifecycle status, and secure password controls."
        columns={columns}
        rows={items}
        loading={loading}
        isFetching={isFetching}
        error={error}
        onRetry={refresh}
        emptyMessage="No students found for your current query."
        search={query.search}
        onSearch={(value) => updateQuery({ search: value })}
        onAdd={() => {
          resetForm();
          setDrawerOpen(true);
        }}
        addLabel="Add Student"
        sortBy={query.sortBy}
        sortDir={query.sortDir}
        onSort={({ sortBy, sortDir }) => updateQuery({ sortBy, sortDir })}
        page={query.page}
        totalPages={totalPages}
        total={total}
        pageSize={query.pageSize}
        onPageChange={(nextPage) => updateQuery({ page: nextPage })}
        onPageSizeChange={(nextSize) => updateQuery({ pageSize: nextSize })}
      />

      <ModalDrawer
        open={drawerOpen}
        title={editingRecord ? "Edit Student" : "Create Student"}
        onClose={() => {
          setDrawerOpen(false);
          resetForm();
        }}
      >
        <FormBuilder
          fields={fields}
          values={formValues}
          onChange={(field, value) =>
            setFormValues((prev) => ({
              ...prev,
              [field]: field === "forcePasswordChange" ? value === true || value === "true" : value,
            }))
          }
          onSubmit={handleSubmit}
          onCancel={() => {
            setDrawerOpen(false);
            resetForm();
          }}
          submitting={submitting}
          submitLabel={editingRecord ? "Update Student" : "Create Student"}
        />
      </ModalDrawer>

      <ConfirmDialog
        open={Boolean(deleteRecord)}
        title="Delete student"
        message={`Delete ${deleteRecord?.name || "this student"}? This action cannot be undone.`}
        confirmLabel="Delete Student"
        onCancel={() => setDeleteRecord(null)}
        onConfirm={handleDelete}
        busy={submitting}
      />

      <ModalDrawer
        open={Boolean(resetRecord)}
        title={`Reset Password${resetRecord ? `: ${resetRecord.name}` : ""}`}
        onClose={() => {
          setResetRecord(null);
          setResetFormValues(EMPTY_RESET_FORM);
          setShowResetPassword(false);
          setShowResetConfirmPassword(false);
          setGeneratedPassword("");
        }}
      >
        <form className="sa-form" onSubmit={handlePasswordReset}>
          <label className="sa-field">
            <span>Reset Method</span>
            <StyledSelect
              value={resetFormValues.mode}
              onChange={(nextMode) => {
                setShowResetPassword(false);
                setShowResetConfirmPassword(false);
                setResetFormValues((prev) => ({
                  ...prev,
                  mode: nextMode,
                  password: "",
                  confirmPassword: "",
                }));
              }}
              options={[
                { label: "Generate temporary password", value: "AUTO" },
                { label: "Set password manually", value: "MANUAL" },
              ]}
            />
          </label>

          {resetFormValues.mode === "MANUAL" ? (
            <>
              <label className="sa-field">
                <span>New Password</span>
                <div className="sa-field__control is-password">
                  <input
                    type={showResetPassword ? "text" : "password"}
                    value={resetFormValues.password}
                    onChange={(event) =>
                      setResetFormValues((prev) => ({ ...prev, password: event.target.value }))
                    }
                    autoComplete="new-password"
                    placeholder="Enter a strong password"
                  />
                  <button
                    type="button"
                    className="sa-field__toggle"
                    onClick={() => setShowResetPassword((prev) => !prev)}
                    aria-label={showResetPassword ? "Hide password" : "Show password"}
                  >
                    {showResetPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </label>
              <label className="sa-field">
                <span>Confirm Password</span>
                <div className="sa-field__control is-password">
                  <input
                    type={showResetConfirmPassword ? "text" : "password"}
                    value={resetFormValues.confirmPassword}
                    onChange={(event) =>
                      setResetFormValues((prev) => ({
                        ...prev,
                        confirmPassword: event.target.value,
                      }))
                    }
                    autoComplete="new-password"
                    placeholder="Re-enter password"
                  />
                  <button
                    type="button"
                    className="sa-field__toggle"
                    onClick={() => setShowResetConfirmPassword((prev) => !prev)}
                    aria-label={showResetConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showResetConfirmPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </label>
            </>
          ) : null}

          <label className="sa-field">
            <span>Force password change at next login</span>
            <StyledSelect
              value={resetFormValues.forcePasswordChange ? "yes" : "no"}
              onChange={(nextValue) =>
                setResetFormValues((prev) => ({
                  ...prev,
                  forcePasswordChange: nextValue === "yes",
                }))
              }
              options={[
                { label: "Yes", value: "yes" },
                { label: "No", value: "no" },
              ]}
            />
          </label>

          {generatedPassword ? (
            <p className="sa-status">
              Temporary Password: <strong>{generatedPassword}</strong>
            </p>
          ) : null}

          <div className="sa-form__actions">
            <button
              type="button"
              className="sa-btn"
              onClick={() => {
                setResetRecord(null);
                setResetFormValues(EMPTY_RESET_FORM);
                setShowResetPassword(false);
                setShowResetConfirmPassword(false);
                setGeneratedPassword("");
              }}
              disabled={resetBusy}
            >
              Cancel
            </button>
            <button type="submit" className="sa-btn sa-btn--primary" disabled={resetBusy}>
              {resetBusy ? "Resetting..." : "Reset Password"}
            </button>
          </div>
        </form>
      </ModalDrawer>
    </>
  );
};

export default StudentsPage;
