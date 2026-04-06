export const TEST_PAPER_MODULE = Object.freeze({
  name: "Exam Vault",
  shortName: "Vault",
  subtitle: "Previous year and revision papers in one premium workspace.",
});

export const TEST_PAPER_MODES = Object.freeze({
  CHAPTER_WISE: "chapter-wise",
  FULL_SYLLABUS: "full-syllabus",
});

export const TEST_PAPER_SCOPES = Object.freeze({
  CHAPTER_WISE: "CHAPTER_WISE",
  FULL_SYLLABUS: "FULL_SYLLABUS",
});

export const TEST_PAPER_TYPES = Object.freeze({
  PYC: "PYC",
  MTP: "MTP",
  RTP: "RTP",
  OTHERS: "OTHERS",
});

export const TEST_PAPER_TYPE_META = Object.freeze({
  [TEST_PAPER_TYPES.PYC]: {
    value: TEST_PAPER_TYPES.PYC,
    label: "Previous Year Papers",
    shortLabel: "PYC",
    description: "Real exam patterns from prior years.",
  },
  [TEST_PAPER_TYPES.MTP]: {
    value: TEST_PAPER_TYPES.MTP,
    label: "Mock Test Papers",
    shortLabel: "MTP",
    description: "High-fidelity exam simulations.",
  },
  [TEST_PAPER_TYPES.RTP]: {
    value: TEST_PAPER_TYPES.RTP,
    label: "Revision Test Papers",
    shortLabel: "RTP",
    description: "Focused revision before final attempts.",
  },
  [TEST_PAPER_TYPES.OTHERS]: {
    value: TEST_PAPER_TYPES.OTHERS,
    label: "Other Practice Papers",
    shortLabel: "OTHERS",
    description: "Practice sets, sample papers, and special compilations.",
  },
});

export const TEST_PAPER_TYPE_ORDER = Object.freeze([
  TEST_PAPER_TYPES.PYC,
  TEST_PAPER_TYPES.MTP,
  TEST_PAPER_TYPES.RTP,
  TEST_PAPER_TYPES.OTHERS,
]);

export const TEST_PAPER_SCOPE_OPTIONS = Object.freeze([
  { label: "Chapter Wise", value: TEST_PAPER_SCOPES.CHAPTER_WISE },
  { label: "Full Syllabus", value: TEST_PAPER_SCOPES.FULL_SYLLABUS },
]);

export const TEST_PAPER_MODE_OPTIONS = Object.freeze([
  { label: "Chapter Wise", value: TEST_PAPER_MODES.CHAPTER_WISE },
  { label: "Full Syllabus", value: TEST_PAPER_MODES.FULL_SYLLABUS },
]);

export const TEST_PAPER_TYPE_OPTIONS = TEST_PAPER_TYPE_ORDER.map((type) => ({
  label: TEST_PAPER_TYPE_META[type].shortLabel,
  value: type,
}));

export const normalizePaperType = (value) => {
  const normalized = String(value || "").trim().toUpperCase();
  return TEST_PAPER_TYPE_META[normalized] ? normalized : TEST_PAPER_TYPES.OTHERS;
};

export const getPaperTypeMeta = (value) =>
  TEST_PAPER_TYPE_META[normalizePaperType(value)] || TEST_PAPER_TYPE_META[TEST_PAPER_TYPES.OTHERS];
