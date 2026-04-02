export const ADMIN_ENTITY = Object.freeze({
  STUDENTS: "students",
  SUBJECTS: "subjects",
  CHAPTERS: "chapters",
  TESTS: "tests",
  QUESTIONS: "questions",
});

export const TEST_DIFFICULTY_OPTIONS = Object.freeze([
  { label: "Easy", value: "EASY" },
  { label: "Medium", value: "MEDIUM" },
  { label: "Hard", value: "HARD" },
]);

export const STATUS_OPTIONS = Object.freeze([
  { label: "Active", value: "ACTIVE" },
  { label: "Inactive", value: "INACTIVE" },
]);

export const PAGE_SIZE_OPTIONS = Object.freeze([10, 20, 50, 100]);
