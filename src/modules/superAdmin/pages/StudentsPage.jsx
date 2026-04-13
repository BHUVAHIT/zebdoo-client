import { useCallback, useMemo, useState } from "react";
import { validatePasswordStrength } from "../../../utils/security";
import { useAppToast } from "../../../components/notifications/useAppToast";
import { studentService } from "../../shared/services/student.service";
import {
  CA_LEVEL_OPTIONS,
  STANDARD_OPTIONS,
  STREAM_OPTIONS,
  buildStudentPayload,
  resolveStudentStream,
  splitStudentName,
  validateFirstName,
  validateLastName,
  validateMobile,
  validatePassword,
  validateSrNo,
} from "../../shared/student/studentFormContract";
import ConfirmDialog from "../components/ConfirmDialog";
import DataTable from "../components/DataTable";
import FormBuilder from "../components/FormBuilder";
import ModalDrawer from "../components/ModalDrawer";
import RowActions from "../components/RowActions";
import StatusBadge from "../components/StatusBadge";
import { useCrudResource } from "../hooks/useCrudResource";
import { STATUS_OPTIONS } from "../types/entities";
import { cleanPayload, formatDate } from "../types/uiHelpers";

const EMPTY_FORM = {
  firstName: "",
  lastName: "",
  email: "",
  stream: "CA",
  mobile: "",
  srNo: "",
  caLevel: "Foundation",
  standard: "",
  status: "ACTIVE",
  password: "",
};

const EMPTY_RESET_FORM = {
  password: "",
  confirmPassword: "",
};

const StudentsPage = ({ onDataChange }) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [deleteRecord, setDeleteRecord] = useState(null);
  const [formValues, setFormValues] = useState(EMPTY_FORM);
  const [resetRecord, setResetRecord] = useState(null);
  const [resetFormValues, setResetFormValues] = useState(EMPTY_RESET_FORM);
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

  const resetForm = useCallback(() => {
    setEditingRecord(null);
    setFormValues(EMPTY_FORM);
  }, []);

  const handleFormChange = useCallback((field, value) => {
    setFormValues((prev) => {
      const nextState = {
        ...prev,
        [field]: value,
      };

      // Clear stream-specific inputs when stream switches so payload never carries stale values.
      if (field === "stream") {
        if (value === "CA") {
          nextState.standard = "";
          if (!nextState.caLevel) {
            nextState.caLevel = "Foundation";
          }
        } else {
          nextState.srNo = "";
          nextState.caLevel = "";
        }
      }

      return nextState;
    });
  }, []);

  const columns = useMemo(
    () => [
      { key: "name", label: "Student", sortable: true, width: "180px", maxWidth: "180px" },
      { key: "email", label: "Email", sortable: true, width: "220px", maxWidth: "220px" },
      { key: "stream", label: "Stream", sortable: true, width: "110px", maxWidth: "110px" },
      {
        key: "academic",
        label: "Academic",
        width: "210px",
        maxWidth: "210px",
        render: (row) => {
          if (row.stream === "CA") {
            const levelLabel = row.caLevel || row.level || "-";
            return `${levelLabel} | SR: ${row.srNo || "-"}`;
          }

          return `Std ${row.standard || "-"}`;
        },
      },
      {
        key: "mobile",
        label: "Mobile",
        sortable: true,
        width: "128px",
        maxWidth: "128px",
        render: (row) => (row.mobile ? `+91 ${row.mobile}` : "-"),
      },
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
              const nameParts = splitStudentName(row.name);
              setEditingRecord(row);
              setFormValues({
                firstName: row.firstName || nameParts.firstName,
                lastName: row.lastName || nameParts.lastName,
                email: row.email,
                stream: resolveStudentStream(row),
                mobile: row.mobile || "",
                srNo: row.srNo,
                caLevel: row.caLevel || row.level || "Foundation",
                standard: row.standard || "",
                status: row.status,
                password: "",
              });
              setDrawerOpen(true);
            }}
            onResetPassword={() => {
              setResetRecord(row);
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
      {
        type: "section",
        name: "identity-section",
        title: "Identity & Contact",
        description: "Capture student profile details exactly as used in the manual student onboarding flow.",
      },
      {
        name: "firstName",
        label: "First Name",
        required: true,
        placeholder: "Enter first name",
        validate: validateFirstName,
      },
      {
        name: "lastName",
        label: "Last Name",
        required: true,
        placeholder: "Enter last name",
        validate: validateLastName,
      },
      {
        name: "email",
        label: "Email",
        type: "email",
        required: true,
        placeholder: "name@example.com",
      },
      {
        name: "mobile",
        label: "Mobile Number",
        required: true,
        prefix: "+91",
        inputMode: "numeric",
        pattern: "[0-9]*",
        maxLength: 10,
        placeholder: "10-digit mobile number",
        helperText: "India numbers only. Enter 10 digits.",
        normalize: (value) => String(value || "").replace(/\D/g, "").slice(0, 10),
        validate: validateMobile,
      },
      {
        name: "stream",
        label: "Stream/Category",
        type: "select",
        required: true,
        options: STREAM_OPTIONS,
      },
      ...(formValues.stream === "CA"
        ? [
            {
              name: "srNo",
              label: "ICAI SR No",
              required: true,
              placeholder: "SR000123",
              validate: validateSrNo,
            },
            {
              name: "caLevel",
              label: "CA Level",
              type: "select",
              required: true,
              options: CA_LEVEL_OPTIONS,
            },
          ]
        : [
            {
              name: "standard",
              label: "Standard",
              type: "select",
              required: true,
              options: STANDARD_OPTIONS,
            },
          ]),
      {
        type: "section",
        name: "account-section",
        title: "Account Access",
        description: editingRecord
          ? "Status and identity details stay aligned with the create flow."
          : "Set the initial account status and one secure password.",
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
              allowReveal: false,
              placeholder: "Use a strong password",
              helperText: "At least 8 chars with uppercase, lowercase, digit, and symbol.",
              validate: validatePassword,
              fullWidth: true,
            },
          ]
        : []),
    ],
    [editingRecord, formValues.stream]
  );

  const handleSubmit = async () => {
    const payload = cleanPayload(
      buildStudentPayload(formValues, {
        includeStatus: true,
        includePassword: !editingRecord,
      })
    );

    if (editingRecord) {
      const {
        password: _password,
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
        : "Student account created with secure credentials.",
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

    setResetBusy(true);
    try {
      await studentService.resetPassword(resetRecord.id, {
        generateTemporary: false,
        password: resetFormValues.password,
        forcePasswordChange: false,
      });

      await refresh();
      await onDataChange?.();

      setResetRecord(null);
      setResetFormValues(EMPTY_RESET_FORM);
      pushToast({
        title: "Password reset completed",
        message: "Student password was updated successfully.",
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
        description="Manage learner records with consistent identity fields, secure credentials, and fast workflows."
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
        width="760px"
      >
        <FormBuilder
          className="sa-student-form"
          fields={fields}
          values={formValues}
          onChange={handleFormChange}
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
        }}
      >
        <form className="sa-form" onSubmit={handlePasswordReset}>
          <label className="sa-field sa-field--full">
            <span>New Password</span>
            <div className="sa-field__control is-password">
              <input
                type="password"
                value={resetFormValues.password}
                onChange={(event) =>
                  setResetFormValues((prev) => ({ ...prev, password: event.target.value }))
                }
                autoComplete="new-password"
                placeholder="Enter a strong password"
              />
            </div>
          </label>

          <label className="sa-field sa-field--full">
            <span>Confirm Password</span>
            <div className="sa-field__control is-password">
              <input
                type="password"
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
            </div>
          </label>

          <div className="sa-form__actions">
            <button
              type="button"
              className="sa-btn"
              onClick={() => {
                setResetRecord(null);
                setResetFormValues(EMPTY_RESET_FORM);
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
