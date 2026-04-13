import { validatePasswordStrength } from "../../../utils/security";

const NAME_PATTERN = /^[A-Za-z ]+$/;
const SR_NO_PATTERN = /^[A-Za-z0-9]{6,20}$/;

export const STREAM_OPTIONS = Object.freeze([
  { label: "CA", value: "CA" },
  { label: "Science", value: "Science" },
  { label: "Commerce", value: "Commerce" },
]);

export const STREAM_VALUES = Object.freeze(STREAM_OPTIONS.map((option) => option.value));

export const CA_LEVEL_OPTIONS = Object.freeze([
  { label: "Foundation", value: "Foundation" },
  { label: "Intermediate", value: "Intermediate" },
  { label: "Final", value: "Final" },
]);

export const CA_LEVEL_VALUES = Object.freeze(CA_LEVEL_OPTIONS.map((option) => option.value));

export const STANDARD_OPTIONS = Object.freeze([
  { label: "11", value: "11" },
  { label: "12", value: "12" },
]);

export const STANDARD_VALUES = Object.freeze(STANDARD_OPTIONS.map((option) => option.value));

export const normalizeStudentName = (value) => String(value || "").replace(/\s+/g, " ").trim();

export const normalizeStudentMobile = (value) => String(value || "").replace(/\D/g, "").slice(0, 10);

export const splitStudentName = (name = "") => {
  const normalized = normalizeStudentName(name);
  if (!normalized) {
    return {
      firstName: "",
      lastName: "",
    };
  }

  const [firstName, ...rest] = normalized.split(" ");
  return {
    firstName: firstName || "",
    lastName: rest.join(" "),
  };
};

export const resolveStudentStream = (student = {}) => {
  const stream = String(student.stream || "").trim();
  if (STREAM_VALUES.includes(stream)) {
    return stream;
  }

  return student.srNo || student.caLevel || student.level ? "CA" : "Science";
};

export const buildStudentPayload = (
  values,
  {
    includePassword = false,
    includeStatus = false,
  } = {}
) => {
  const firstName = normalizeStudentName(values.firstName);
  const lastName = normalizeStudentName(values.lastName);
  const stream = String(values.stream || "").trim();
  const mobile = normalizeStudentMobile(values.mobile);
  const name = [firstName, lastName].filter(Boolean).join(" ");

  const payload = {
    name,
    firstName,
    lastName,
    email: String(values.email || "").trim(),
    stream,
    mobile,
  };

  if (includeStatus) {
    payload.status = values.status;
  }

  if (includePassword) {
    payload.password = String(values.password || "");
  }

  if (stream === "CA") {
    const srNo = String(values.srNo ?? values.srno ?? "").trim();
    const caLevel = String(values.caLevel ?? values.level ?? "").trim();

    return {
      ...payload,
      srNo,
      srno: srNo,
      caLevel,
      level: caLevel,
      standard: "",
    };
  }

  return {
    ...payload,
    standard: String(values.standard || "").trim(),
    srNo: "",
    srno: "",
    caLevel: "",
    level: "",
  };
};

export const validateFirstName = (value) => {
  const normalized = normalizeStudentName(value);
  if (!normalized) return "First Name is required.";
  if (normalized.length < 2) return "First Name must be at least 2 characters.";
  if (normalized.length > 50) return "First Name must be at most 50 characters.";
  if (!NAME_PATTERN.test(normalized)) return "Use only alphabets and spaces for First Name.";
  return "";
};

export const validateLastName = (value) => {
  const normalized = normalizeStudentName(value);
  if (!normalized) return "Last Name is required.";
  if (normalized.length > 50) return "Last Name must be at most 50 characters.";
  if (!NAME_PATTERN.test(normalized)) return "Use only alphabets and spaces for Last Name.";
  return "";
};

export const validateMobile = (value) => {
  const mobile = normalizeStudentMobile(value);
  return /^\d{10}$/.test(mobile) ? "" : "Mobile Number must be exactly 10 digits.";
};

export const validateSrNo = (value) => {
  const normalized = String(value || "").trim();
  if (!normalized) return "ICAI SR No is required for CA stream.";
  if (!SR_NO_PATTERN.test(normalized)) {
    return "Use 6-20 letters or numbers for ICAI SR No.";
  }
  return "";
};

export const validatePassword = (value) => {
  const result = validatePasswordStrength(value);
  return result.isValid ? "" : result.errors[0];
};