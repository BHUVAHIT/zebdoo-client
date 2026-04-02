import { describe, expect, it } from "vitest";
import { generateUniqueSubjectCode } from "../modules/superAdmin/services/subjectCodeGenerator";

describe("subject code generation", () => {
  it("starts from SUB-001 when there are no subjects", () => {
    const code = generateUniqueSubjectCode([]);
    expect(code).toBe("SUB-001");
  });

  it("increments from the highest existing sequence", () => {
    const subjects = [
      { id: "sub-1", code: "SUB-001" },
      { id: "sub-2", code: "SUB-006" },
      { id: "sub-3", code: "SUB-010" },
    ];

    const code = generateUniqueSubjectCode(subjects);
    expect(code).toBe("SUB-011");
  });

  it("does not reuse deleted gaps and remains monotonic", () => {
    const subjects = [
      { id: "sub-1", code: "SUB-001" },
      { id: "sub-3", code: "SUB-003" },
    ];

    const code = generateUniqueSubjectCode(subjects);
    expect(code).toBe("SUB-004");
  });

  it("accepts provided code when it is unique", () => {
    const subjects = [{ id: "sub-1", code: "SUB-001" }];

    const code = generateUniqueSubjectCode(subjects, {
      requestedCode: "MATH-100",
    });

    expect(code).toBe("MATH-100");
  });

  it("falls back to generated code when provided code already exists", () => {
    const subjects = [
      { id: "sub-1", code: "SUB-001" },
      { id: "sub-2", code: "SUB-002" },
    ];

    const code = generateUniqueSubjectCode(subjects, {
      requestedCode: "sub-002",
    });

    expect(code).toBe("SUB-003");
  });

  it("keeps incrementing for large datasets", () => {
    const subjects = [{ id: "sub-999", code: "SUB-999" }];

    const code = generateUniqueSubjectCode(subjects);
    expect(code).toBe("SUB-1000");
  });
});
