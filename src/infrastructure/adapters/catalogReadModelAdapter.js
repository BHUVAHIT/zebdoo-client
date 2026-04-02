import { getNormalizedCatalogSnapshot } from "../../store/catalogStore";

const toArray = (value) => (Array.isArray(value) ? value : []);

export const getCatalogReadModel = () => {
  const snapshot = getNormalizedCatalogSnapshot();
  const db = snapshot?.db || {};

  const subjects = toArray(db.subjects);
  const chapters = toArray(db.chapters);
  const tests = toArray(db.tests);
  const questions = toArray(db.questions);

  return {
    version: Number(snapshot?.version || 0),
    db: {
      subjects,
      chapters,
      tests,
      questions,
    },
    entities: {
      subjectsById: snapshot?.entities?.subjectsById || {},
      chaptersById: snapshot?.entities?.chaptersById || {},
      testsById: snapshot?.entities?.testsById || {},
      questionsById: snapshot?.entities?.questionsById || {},
    },
    indexes: {
      chapterIdsBySubjectId: snapshot?.indexes?.chapterIdsBySubjectId || {},
      testIdsByChapterId: snapshot?.indexes?.testIdsByChapterId || {},
      questionIdsByTestId: snapshot?.indexes?.questionIdsByTestId || {},
    },
  };
};
