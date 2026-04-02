import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { replaceCatalogDb, catalogStore } from "../store/catalogStore";
import {
  subscribeToCatalogVersionChanges,
  syncCatalogSlicesFromSource,
} from "../infrastructure/adapters/catalogAdapter";
import { useSubjectStore } from "../store/subjectStore";
import { useChapterStore } from "../store/chapterStore";
import { useQuestionStore } from "../store/questionStore";
import { useTestStore } from "../store/testStore";
import {
  SYNC_EVENT,
  SYNC_SOURCE,
} from "../shared/constants/syncEvents";
import { startCatalogSyncService } from "../modules/shared/services/catalogSyncService";
import { getSubjects } from "../test/services/testService";
import { runtimeEventBus } from "../shared/utils/eventBus";

const DB_STORAGE_KEY = "super-admin:db:v1";

const buildDb = ({ subjectId, subjectName }) => ({
  students: [],
  subjects: [
    {
      id: subjectId,
      code: `SUB-${subjectId}`,
      name: subjectName,
      description: `${subjectName} syllabus`,
      status: "ACTIVE",
      createdAt: new Date().toISOString(),
    },
  ],
  chapters: [
    {
      id: `${subjectId}-ch-1`,
      subjectId,
      title: `${subjectName} Chapter 1`,
      orderNo: 1,
      status: "ACTIVE",
      createdAt: new Date().toISOString(),
    },
  ],
  tests: [
    {
      id: `${subjectId}-test-1`,
      subjectId,
      chapterId: `${subjectId}-ch-1`,
      title: `${subjectName} Test 1`,
      difficulty: "MEDIUM",
      durationMinutes: 30,
      workflowStatus: "PUBLISHED",
      mixStrategy: "MANUAL",
      status: "ACTIVE",
      createdAt: new Date().toISOString(),
    },
  ],
  questions: [
    {
      id: `${subjectId}-q-1`,
      testId: `${subjectId}-test-1`,
      stem: `${subjectName} sample question`,
      options: [
        { id: "A", text: "Opt A" },
        { id: "B", text: "Opt B" },
        { id: "C", text: "Opt C" },
        { id: "D", text: "Opt D" },
      ],
      correctOptionId: "A",
      solution: "Because A",
      workflowStatus: "PUBLISHED",
      status: "ACTIVE",
      createdAt: new Date().toISOString(),
    },
  ],
});

const clearDomainSlices = () => {
  useSubjectStore.getState().clearSubjects();
  useChapterStore.getState().clearChapters();
  useTestStore.getState().clearTests();
  useQuestionStore.getState().clearQuestions();
};

describe("realtime catalog propagation integration", () => {
  beforeEach(() => {
    window.localStorage.clear();
    clearDomainSlices();
    catalogStore.setState({ db: null, version: 0 });
  });

  afterEach(() => {
    window.localStorage.clear();
    clearDomainSlices();
  });

  it("propagates admin catalog mutations to student-facing slices", async () => {
    const unsubscribe = subscribeToCatalogVersionChanges(() => {
      syncCatalogSlicesFromSource();
    });

    try {
      const nextDb = buildDb({
        subjectId: "fin-1",
        subjectName: "Financial Reporting",
      });

      replaceCatalogDb(nextDb);

      const subjectIds = useSubjectStore.getState().allIds;
      expect(subjectIds).toContain("fin-1");

      const subjects = await getSubjects();
      expect(subjects.some((item) => item.id === "fin-1")).toBe(true);
    } finally {
      unsubscribe();
    }
  });

  it("syncs modular slices from simulated multi-tab storage event", () => {
    const stopSync = startCatalogSyncService();

    try {
      const remoteDb = buildDb({
        subjectId: "tax-2",
        subjectName: "Taxation",
      });

      window.localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(remoteDb));

      runtimeEventBus.emit({
        type: SYNC_EVENT.CATALOG_UPDATED,
        payload: {
          action: "update",
          version: Date.now(),
        },
        source: SYNC_SOURCE.STORAGE,
        timestamp: Date.now(),
      });

      const subjectState = useSubjectStore.getState();
      expect(subjectState.allIds).toContain("tax-2");
    } finally {
      stopSync();
    }
  });
});
