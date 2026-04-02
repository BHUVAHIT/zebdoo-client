import { useCallback, useEffect, useMemo } from "react";
import { readCatalogDb, useCatalogStore } from "../../../store/catalogStore";

const normalizeId = (value) => String(value ?? "").trim();
const sameId = (left, right) => normalizeId(left) === normalizeId(right);

export const useEntityOptions = () => {
  const db = useCatalogStore((state) => state.db);

  useEffect(() => {
    if (!db) {
      readCatalogDb();
    }
  }, [db]);

  const options = useMemo(
    () => {
      const subjects = Array.isArray(db?.subjects) ? db.subjects : [];
      const chapters = Array.isArray(db?.chapters) ? db.chapters : [];
      const tests = Array.isArray(db?.tests) ? db.tests : [];

      const activeSubjectIds = new Set(
        subjects
          .filter((item) => String(item.status || "ACTIVE").toUpperCase() !== "INACTIVE")
          .map((item) => String(item.id))
      );

      const subjectOptions = subjects
        .filter((item) => String(item.status || "ACTIVE").toUpperCase() !== "INACTIVE")
        .map((item) => ({
          label: `${item.name || "Subject"}${item.code ? ` (${item.code})` : ""}`,
          value: item.id,
        }))
        .sort((left, right) =>
          String(left.label || "").localeCompare(String(right.label || ""))
        );

      const chapterOptions = chapters
        .filter(
          (item) =>
            String(item.status || "ACTIVE").toUpperCase() !== "INACTIVE" &&
            activeSubjectIds.has(String(item.subjectId))
        )
        .map((item) => ({
          label: item.title || item.name || "Chapter",
          value: item.id,
          subjectId: item.subjectId,
        }));

      const activeChapterIds = new Set(chapterOptions.map((item) => String(item.value)));

      const testOptions = tests
        .filter(
          (item) =>
            String(item.status || "ACTIVE").toUpperCase() !== "INACTIVE" &&
            activeSubjectIds.has(String(item.subjectId)) &&
            activeChapterIds.has(String(item.chapterId))
        )
        .map((item) => ({
          label: item.title || "Test",
          value: item.id,
          subjectId: item.subjectId,
          chapterId: item.chapterId,
        }));

      return {
        subjects: subjectOptions,
        chapters: chapterOptions,
        tests: testOptions,
      };
    },
    [db]
  );

  const loading = !db;
  const error = "";

  const refresh = useCallback(async () => {
    readCatalogDb();
    return Promise.resolve();
  }, []);

  const getChapterOptions = useCallback(
    (subjectId) =>
      options.chapters.filter(
        (item) => !subjectId || sameId(item.subjectId, subjectId)
      ),
    [options.chapters]
  );

  const getTestOptions = useCallback(
    ({ subjectId, chapterId } = {}) =>
      options.tests.filter(
        (item) =>
          (!subjectId || sameId(item.subjectId, subjectId)) &&
          (!chapterId || sameId(item.chapterId, chapterId))
      ),
    [options.tests]
  );

  const subjectMap = useMemo(
    () =>
      options.subjects.reduce((acc, item) => {
        acc[item.value] = item;
        return acc;
      }, {}),
    [options.subjects]
  );

  return {
    loading,
    error,
    options,
    subjectMap,
    refresh,
    getChapterOptions,
    getTestOptions,
  };
};
