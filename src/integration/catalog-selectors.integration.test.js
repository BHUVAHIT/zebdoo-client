import { beforeEach, describe, expect, it } from "vitest";
import { catalogStore, replaceCatalogDb } from "../store/catalogStore";
import {
  selectCatalogSnapshot,
  selectChaptersBySubjectId,
  selectQuestionsByTestId,
  selectSubjects,
  selectTestsByChapterId,
} from "../store/catalogSelectors";

const buildDb = () => ({
  students: [],
  subjects: [
    {
      id: "sub-active",
      code: "SUB-A",
      name: "Active Subject",
      status: "ACTIVE",
      createdAt: new Date().toISOString(),
    },
    {
      id: "sub-inactive",
      code: "SUB-I",
      name: "Inactive Subject",
      status: "INACTIVE",
      createdAt: new Date().toISOString(),
    },
  ],
  chapters: [
    {
      id: "chap-active",
      subjectId: "sub-active",
      title: "Active Chapter",
      status: "ACTIVE",
      createdAt: new Date().toISOString(),
    },
    {
      id: "chap-inactive",
      subjectId: "sub-active",
      title: "Inactive Chapter",
      status: "INACTIVE",
      createdAt: new Date().toISOString(),
    },
    {
      id: "chap-orphan-active",
      subjectId: "sub-inactive",
      title: "Orphan Chapter",
      status: "ACTIVE",
      createdAt: new Date().toISOString(),
    },
  ],
  tests: [
    {
      id: "test-published",
      subjectId: "sub-active",
      chapterId: "chap-active",
      title: "Published Test",
      difficulty: "MEDIUM",
      workflowStatus: "PUBLISHED",
      status: "ACTIVE",
      durationMinutes: 45,
      createdAt: new Date().toISOString(),
    },
    {
      id: "test-draft",
      subjectId: "sub-active",
      chapterId: "chap-active",
      title: "Draft Test",
      difficulty: "EASY",
      workflowStatus: "DRAFT",
      status: "ACTIVE",
      durationMinutes: 30,
      createdAt: new Date().toISOString(),
    },
    {
      id: "test-inactive",
      subjectId: "sub-active",
      chapterId: "chap-active",
      title: "Inactive Test",
      difficulty: "HARD",
      workflowStatus: "PUBLISHED",
      status: "INACTIVE",
      durationMinutes: 60,
      createdAt: new Date().toISOString(),
    },
  ],
  questions: [
    {
      id: "q-published",
      testId: "test-published",
      stem: "Published and active question",
      options: [
        { id: "A", text: "A" },
        { id: "B", text: "B" },
        { id: "C", text: "C" },
        { id: "D", text: "D" },
      ],
      correctOptionId: "A",
      workflowStatus: "PUBLISHED",
      status: "ACTIVE",
      createdAt: new Date().toISOString(),
    },
    {
      id: "q-draft",
      testId: "test-published",
      stem: "Draft question",
      options: [
        { id: "A", text: "A" },
        { id: "B", text: "B" },
        { id: "C", text: "C" },
        { id: "D", text: "D" },
      ],
      correctOptionId: "B",
      workflowStatus: "DRAFT",
      status: "ACTIVE",
      createdAt: new Date().toISOString(),
    },
    {
      id: "q-inactive",
      testId: "test-published",
      stem: "Inactive question",
      options: [
        { id: "A", text: "A" },
        { id: "B", text: "B" },
        { id: "C", text: "C" },
        { id: "D", text: "D" },
      ],
      correctOptionId: "C",
      workflowStatus: "PUBLISHED",
      status: "INACTIVE",
      createdAt: new Date().toISOString(),
    },
    {
      id: "q-under-draft-test",
      testId: "test-draft",
      stem: "Question under draft test",
      options: [
        { id: "A", text: "A" },
        { id: "B", text: "B" },
        { id: "C", text: "C" },
        { id: "D", text: "D" },
      ],
      correctOptionId: "D",
      workflowStatus: "PUBLISHED",
      status: "ACTIVE",
      createdAt: new Date().toISOString(),
    },
    {
      id: "q-under-inactive-test",
      testId: "test-inactive",
      stem: "Question under inactive test",
      options: [
        { id: "A", text: "A" },
        { id: "B", text: "B" },
        { id: "C", text: "C" },
        { id: "D", text: "D" },
      ],
      correctOptionId: "A",
      workflowStatus: "PUBLISHED",
      status: "ACTIVE",
      createdAt: new Date().toISOString(),
    },
  ],
});

describe("catalog selectors integration", () => {
  beforeEach(() => {
    window.localStorage.clear();
    catalogStore.setState({ db: null, version: 0 });
    replaceCatalogDb(buildDb());
  });

  it("returns active entities by normalized relationships", () => {
    const snapshot = selectCatalogSnapshot();

    const subjects = selectSubjects({ snapshot });
    expect(subjects.map((item) => item.id)).toEqual(["sub-active"]);

    const chapters = selectChaptersBySubjectId("sub-active", { snapshot });
    expect(chapters.map((item) => item.id)).toEqual(["chap-active"]);

    const publishedTests = selectTestsByChapterId("chap-active", {
      snapshot,
      publishedOnly: true,
    });
    expect(publishedTests.map((item) => item.id)).toEqual(["test-published"]);

    const publishedQuestions = selectQuestionsByTestId("test-published", {
      snapshot,
      publishedOnly: true,
    });
    expect(publishedQuestions.map((item) => item.id)).toEqual(["q-published"]);
  });

  it("can optionally bypass parent-gate checks when requested", () => {
    const snapshot = selectCatalogSnapshot();

    const strictChapters = selectChaptersBySubjectId("sub-inactive", {
      snapshot,
      activeOnly: true,
      requireActiveSubject: true,
    });
    expect(strictChapters).toHaveLength(0);

    const relaxedChapters = selectChaptersBySubjectId("sub-inactive", {
      snapshot,
      activeOnly: false,
      requireActiveSubject: false,
    });
    expect(relaxedChapters.map((item) => item.id)).toEqual(["chap-orphan-active"]);
  });
});
