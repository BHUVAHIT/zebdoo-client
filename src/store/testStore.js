import { create } from "zustand";
import {
  devtools,
  persist,
  createJSONStorage,
  subscribeWithSelector,
} from "zustand/middleware";
import { normalizeId } from "./normalize";

const STORE_NAME = "zebdoo:test-store:v1";

const normalizeTest = (test = {}) => ({
  ...test,
  id: normalizeId(test.id),
  subjectId: normalizeId(test.subjectId),
  chapterId: normalizeId(test.chapterId),
  difficulty: String(test.difficulty || "").toLowerCase(),
  status: String(test.status || "ACTIVE").toUpperCase(),
});

const buildTestState = (tests = []) => {
  const byId = {};
  const allIds = [];
  const idsByChapterId = {};

  tests.forEach((item) => {
    const normalized = normalizeTest(item);
    if (!normalized.id) return;

    byId[normalized.id] = normalized;
    allIds.push(normalized.id);

    if (!normalized.chapterId) return;

    idsByChapterId[normalized.chapterId] = idsByChapterId[normalized.chapterId] || [];
    idsByChapterId[normalized.chapterId].push(normalized.id);
  });

  return {
    byId,
    allIds,
    idsByChapterId,
  };
};

export const useTestStore = create(
  subscribeWithSelector(
    devtools(
      persist(
        (set, get) => ({
          byId: {},
          allIds: [],
          idsByChapterId: {},
          lastUpdatedAt: 0,

          setTests: (tests) => {
            set(
              {
                ...buildTestState(tests),
                lastUpdatedAt: Date.now(),
              },
              false,
              "test/setTests"
            );
          },

          clearTests: () => {
            set(
              {
                byId: {},
                allIds: [],
                idsByChapterId: {},
                lastUpdatedAt: Date.now(),
              },
              false,
              "test/clearTests"
            );
          },

          getTestById: (testId) => {
            const id = normalizeId(testId);
            return get().byId[id] || null;
          },

          getTestIdsByChapter: (chapterId) => {
            const id = normalizeId(chapterId);
            return get().idsByChapterId[id] || [];
          },
        }),
        {
          name: STORE_NAME,
          storage: createJSONStorage(() => window.localStorage),
          partialize: (state) => ({
            byId: state.byId,
            allIds: state.allIds,
            idsByChapterId: state.idsByChapterId,
            lastUpdatedAt: state.lastUpdatedAt,
          }),
        }
      ),
      { name: "test-store" }
    )
  )
);
