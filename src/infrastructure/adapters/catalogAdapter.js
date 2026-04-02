import { getNormalizedCatalogSnapshot, catalogStore } from "../../store/catalogStore";
import { useChapterStore } from "../../store/chapterStore";
import { useQuestionStore } from "../../store/questionStore";
import { useSubjectStore } from "../../store/subjectStore";
import { useTestStore } from "../../store/testStore";

export const syncCatalogSlicesFromSource = () => {
  const snapshot = getNormalizedCatalogSnapshot();
  const db = snapshot?.db || {};

  useSubjectStore.getState().setSubjects(db.subjects || []);
  useChapterStore.getState().setChapters(db.chapters || []);
  useTestStore.getState().setTests(db.tests || []);
  useQuestionStore.getState().setQuestions(db.questions || []);

  return snapshot.version;
};

export const subscribeToCatalogVersionChanges = (listener) =>
  catalogStore.subscribe((state, previousState) => {
    if (state.version === previousState.version) return;
    listener(state.version, previousState.version);
  });
