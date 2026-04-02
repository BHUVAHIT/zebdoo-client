import { create } from "zustand";
import {
  devtools,
  persist,
  createJSONStorage,
  subscribeWithSelector,
} from "zustand/middleware";

const STORE_NAME = "zebdoo:subject-store:v1";

const normalizeId = (value) => String(value ?? "").trim();

const normalizeSubject = (subject = {}) => ({
  ...subject,
  id: normalizeId(subject.id),
  name: String(subject.name || ""),
  status: String(subject.status || "ACTIVE").toUpperCase(),
});

const buildSubjectState = (subjects = []) => {
  const byId = {};
  const allIds = [];

  subjects.forEach((item) => {
    const normalized = normalizeSubject(item);
    if (!normalized.id) return;

    byId[normalized.id] = normalized;
    allIds.push(normalized.id);
  });

  return {
    byId,
    allIds,
  };
};

export const useSubjectStore = create(
  subscribeWithSelector(
    devtools(
      persist(
        (set, get) => ({
          byId: {},
          allIds: [],

          setSubjects: (subjects) => {
            set(buildSubjectState(subjects), false, "subject/setSubjects");
          },

          upsertSubject: (subject) => {
            const normalized = normalizeSubject(subject);
            if (!normalized.id) return;

            set((state) => ({
              byId: {
                ...state.byId,
                [normalized.id]: normalized,
              },
              allIds: state.allIds.includes(normalized.id)
                ? state.allIds
                : [...state.allIds, normalized.id],
            }), false, "subject/upsertSubject");
          },

          removeSubject: (subjectId) => {
            const id = normalizeId(subjectId);
            if (!id) return;

            set((state) => {
              if (!state.byId[id]) return state;

              const nextById = { ...state.byId };
              delete nextById[id];

              return {
                byId: nextById,
                allIds: state.allIds.filter((item) => item !== id),
              };
            }, false, "subject/removeSubject");
          },

          clearSubjects: () => {
            set({ byId: {}, allIds: [] }, false, "subject/clearSubjects");
          },

          getSubjectById: (subjectId) => {
            const id = normalizeId(subjectId);
            return get().byId[id] || null;
          },
        }),
        {
          name: STORE_NAME,
          storage: createJSONStorage(() => window.localStorage),
          partialize: (state) => ({
            byId: state.byId,
            allIds: state.allIds,
          }),
        }
      ),
      { name: "subject-store" }
    )
  )
);

export const selectSubjects = (state) => state.allIds.map((id) => state.byId[id]).filter(Boolean);

export const makeSelectSubjectById = (subjectId) => (state) => {
  const id = normalizeId(subjectId);
  return state.byId[id] || null;
};
