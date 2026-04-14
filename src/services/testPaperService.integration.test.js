import { beforeEach, describe, expect, it, vi } from "vitest";
import { testPaperService } from "./testPaperService";

describe("testPaperService upload guardrails", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects non-pdf files", async () => {
    const file = new File(["hello"], "notes.txt", { type: "text/plain" });

    await expect(testPaperService.uploadPaperFile(file)).rejects.toThrow(
      "Only PDF files are supported."
    );
  });

  it("rejects oversized pdf files", async () => {
    const oversizedBuffer = new Uint8Array(16 * 1024 * 1024);
    const file = new File([oversizedBuffer], "large-paper.pdf", {
      type: "application/pdf",
    });

    await expect(testPaperService.uploadPaperFile(file)).rejects.toThrow(
      "PDF size must be 15 MB or less."
    );
  });

  it("uploads a valid pdf using fallback provider", async () => {
    const file = new File(["%PDF-1.4 mock"], "sample-paper.pdf", {
      type: "application/pdf",
    });

    const uploaded = await testPaperService.uploadPaperFile(file, {
      onProgress: vi.fn(),
    });

    expect(uploaded.provider).toBe("mock-storage");
    expect(uploaded.url).toContain("https://www.w3.org/");
    expect(uploaded.fileName).toBe("sample-paper.pdf");
  });
});
