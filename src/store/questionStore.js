import { create } from "zustand";
import {
  devtools,
  persist,
  createJSONStorage,
  subscribeWithSelector,
} from "zustand/middleware";
import { normalizeId } from "./normalize";

const STORE_NAME = "zebdoo:question-store:v1";

const normalizeQuestion = (question = {}) => ({
  ...question,
  id: normalizeId(question.id),
  testId: normalizeId(question.testId),
  stem: String(question.stem || question.question || ""),
  status: String(question.status || "ACTIVE").toUpperCase(),
});

const buildQuestionState = (questions = []) => {
  const byId = {};
  const allIds = [];
  const idsByTestId = {};

  questions.forEach((item) => {
    const normalized = normalizeQuestion(item);
    if (!normalized.id) return;

    byId[normalized.id] = normalized;
    allIds.push(normalized.id);

    if (!normalized.testId) return;

    idsByTestId[normalized.testId] = idsByTestId[normalized.testId] || [];
    idsByTestId[normalized.testId].push(normalized.id);
  });

  return {
    byId,
    allIds,
    idsByTestId,
  };
};

export const useQuestionStore = create(
  subscribeWithSelector(
    devtools(
      persist(
        (set, get) => ({
          byId: {},
          allIds: [],
          idsByTestId: {},

          setQuestions: (questions) => {
            set(buildQuestionState(questions), false, "question/setQuestions");
          },

          clearQuestions: () => {
            set(
              { byId: {}, allIds: [], idsByTestId: {} },
              false,
              "question/clearQuestions"
            );
          },

          getQuestionById: (questionId) => {
            const id = normalizeId(questionId);
            return get().byId[id] || null;
          },

          getQuestionIdsByTest: (testId) => {
            const id = normalizeId(testId);
            return get().idsByTestId[id] || [];
          },
        }),
        {
          name: STORE_NAME,
          storage: createJSONStorage(() => window.localStorage),
          partialize: (state) => ({
            byId: state.byId,
            allIds: state.allIds,
            idsByTestId: state.idsByTestId,
          }),
        }
      ),
      { name: "question-store" }
    )
  )
);
