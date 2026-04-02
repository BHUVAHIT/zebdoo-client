import { create } from "zustand";
import {
  devtools,
  persist,
  createJSONStorage,
  subscribeWithSelector,
} from "zustand/middleware";

const STORE_NAME = "zebdoo:chapter-store:v1";

const normalizeId = (value) => String(value ?? "").trim();

const normalizeChapter = (chapter = {}) => ({
  ...chapter,
  id: normalizeId(chapter.id),
  subjectId: normalizeId(chapter.subjectId),
  title: String(chapter.title || chapter.name || ""),
  status: String(chapter.status || "ACTIVE").toUpperCase(),
});

const buildChapterState = (chapters = []) => {
  const byId = {};
  const allIds = [];
  const idsBySubjectId = {};

  chapters.forEach((item) => {
    const normalized = normalizeChapter(item);
    if (!normalized.id) return;

    byId[normalized.id] = normalized;
    allIds.push(normalized.id);

    const subjectId = normalizeId(normalized.subjectId);
    if (!subjectId) return;

    idsBySubjectId[subjectId] = idsBySubjectId[subjectId] || [];
    idsBySubjectId[subjectId].push(normalized.id);
  });

  return {
    byId,
    allIds,
    idsBySubjectId,
  };
};

export const useChapterStore = create(
  subscribeWithSelector(
    devtools(
      persist(
        (set, get) => ({
          byId: {},
          allIds: [],
          idsBySubjectId: {},

          setChapters: (chapters) => {
            set(buildChapterState(chapters), false, "chapter/setChapters");
          },

          clearChapters: () => {
            set(
              { byId: {}, allIds: [], idsBySubjectId: {} },
              false,
              "chapter/clearChapters"
            );
          },

          getChapterById: (chapterId) => {
            const id = normalizeId(chapterId);
            return get().byId[id] || null;
          },

          getChapterIdsBySubject: (subjectId) => {
            const id = normalizeId(subjectId);
            return get().idsBySubjectId[id] || [];
          },
        }),
        {
          name: STORE_NAME,
          storage: createJSONStorage(() => window.localStorage),
          partialize: (state) => ({
            byId: state.byId,
            allIds: state.allIds,
            idsBySubjectId: state.idsBySubjectId,
          }),
        }
      ),
      { name: "chapter-store" }
    )
  )
);

export const makeSelectChaptersBySubjectId = (subjectId) => (state) => {
  const id = normalizeId(subjectId);
  const chapterIds = state.idsBySubjectId[id] || [];
  return chapterIds.map((chapterId) => state.byId[chapterId]).filter(Boolean);
};
