import { getNormalizedCatalogSnapshot } from "./catalogStore";

const normalizeId = (value) => String(value ?? "").trim();

export const isCatalogEntityActive = (status) =>
  String(status || "ACTIVE").toUpperCase() !== "INACTIVE";

export const isCatalogWorkflowPublished = (workflowStatus) =>
  String(workflowStatus || "PUBLISHED").toUpperCase() === "PUBLISHED";

let activeGraphCache = {
  version: -1,
  graph: null,
};

const buildActiveGraph = (snapshot) => {
  const db = snapshot?.db || {};

  const activeSubjectIds = new Set(
    (db.subjects || [])
      .filter((item) => isCatalogEntityActive(item.status))
      .map((item) => normalizeId(item.id))
  );

  const activeChapterIds = new Set(
    (db.chapters || [])
      .filter(
        (item) =>
          isCatalogEntityActive(item.status) &&
          activeSubjectIds.has(normalizeId(item.subjectId))
      )
      .map((item) => normalizeId(item.id))
  );

  const activeTestIds = new Set(
    (db.tests || [])
      .filter(
        (item) =>
          isCatalogEntityActive(item.status) &&
          activeSubjectIds.has(normalizeId(item.subjectId)) &&
          activeChapterIds.has(normalizeId(item.chapterId))
      )
      .map((item) => normalizeId(item.id))
  );

  const publishedTestIds = new Set(
    (db.tests || [])
      .filter(
        (item) =>
          activeTestIds.has(normalizeId(item.id)) &&
          isCatalogWorkflowPublished(item.workflowStatus)
      )
      .map((item) => normalizeId(item.id))
  );

  const activeQuestionIds = new Set(
    (db.questions || [])
      .filter(
        (item) =>
          isCatalogEntityActive(item.status) &&
          activeTestIds.has(normalizeId(item.testId))
      )
      .map((item) => normalizeId(item.id))
  );

  const publishedQuestionIds = new Set(
    (db.questions || [])
      .filter(
        (item) =>
          activeQuestionIds.has(normalizeId(item.id)) &&
          isCatalogWorkflowPublished(item.workflowStatus)
      )
      .map((item) => normalizeId(item.id))
  );

  return {
    activeSubjectIds,
    activeChapterIds,
    activeTestIds,
    publishedTestIds,
    activeQuestionIds,
    publishedQuestionIds,
  };
};

const getActiveGraph = (snapshot = getNormalizedCatalogSnapshot()) => {
  const version = Number(snapshot?.version || 0);
  if (activeGraphCache.graph && activeGraphCache.version === version) {
    return activeGraphCache.graph;
  }

  const graph = buildActiveGraph(snapshot);
  activeGraphCache = {
    version,
    graph,
  };

  return graph;
};

const toEntityArray = (itemsById, ids = []) =>
  (ids || []).map((id) => itemsById[normalizeId(id)]).filter(Boolean);

export const selectCatalogSnapshot = () => getNormalizedCatalogSnapshot();

export const selectSubjects = ({ activeOnly = true, snapshot } = {}) => {
  const catalogSnapshot = snapshot || getNormalizedCatalogSnapshot();
  const subjects = catalogSnapshot?.db?.subjects || [];
  if (!activeOnly) return subjects;

  const { activeSubjectIds } = getActiveGraph(catalogSnapshot);
  return subjects.filter((item) => activeSubjectIds.has(normalizeId(item.id)));
};

export const selectChapterIdsBySubjectId = (
  subjectId,
  { activeOnly = true, requireActiveSubject = true, snapshot } = {}
) => {
  const catalogSnapshot = snapshot || getNormalizedCatalogSnapshot();
  const normalizedSubjectId = normalizeId(subjectId);
  if (!normalizedSubjectId) return [];

  const candidateIds =
    catalogSnapshot?.indexes?.chapterIdsBySubjectId?.[normalizedSubjectId] || [];
  const graph = getActiveGraph(catalogSnapshot);

  if (requireActiveSubject && !graph.activeSubjectIds.has(normalizedSubjectId)) {
    return [];
  }

  if (!activeOnly) {
    return candidateIds.filter(Boolean);
  }

  return candidateIds.filter((id) => graph.activeChapterIds.has(normalizeId(id)));
};

export const selectChaptersBySubjectId = (
  subjectId,
  { activeOnly = true, requireActiveSubject = true, snapshot } = {}
) => {
  const catalogSnapshot = snapshot || getNormalizedCatalogSnapshot();
  const ids = selectChapterIdsBySubjectId(subjectId, {
    activeOnly,
    requireActiveSubject,
    snapshot: catalogSnapshot,
  });

  return toEntityArray(catalogSnapshot?.entities?.chaptersById || {}, ids);
};

export const selectTestIdsByChapterId = (
  chapterId,
  {
    activeOnly = true,
    publishedOnly = false,
    requireActiveChapter = true,
    requireActiveSubject = true,
    snapshot,
  } = {}
) => {
  const catalogSnapshot = snapshot || getNormalizedCatalogSnapshot();
  const normalizedChapterId = normalizeId(chapterId);
  if (!normalizedChapterId) return [];

  const candidateIds =
    catalogSnapshot?.indexes?.testIdsByChapterId?.[normalizedChapterId] || [];
  const testsById = catalogSnapshot?.entities?.testsById || {};
  const graph = getActiveGraph(catalogSnapshot);

  if (requireActiveChapter && !graph.activeChapterIds.has(normalizedChapterId)) {
    return [];
  }

  return candidateIds.filter((id) => {
    const normalizedTestId = normalizeId(id);
    const test = testsById[normalizedTestId];
    if (!test) return false;

    if (activeOnly && !graph.activeTestIds.has(normalizedTestId)) return false;
    if (publishedOnly && !graph.publishedTestIds.has(normalizedTestId)) return false;
    if (requireActiveChapter && !graph.activeChapterIds.has(normalizeId(test.chapterId))) {
      return false;
    }
    if (requireActiveSubject && !graph.activeSubjectIds.has(normalizeId(test.subjectId))) {
      return false;
    }

    return true;
  });
};

export const selectTestsByChapterId = (
  chapterId,
  {
    activeOnly = true,
    publishedOnly = false,
    requireActiveChapter = true,
    requireActiveSubject = true,
    snapshot,
  } = {}
) => {
  const catalogSnapshot = snapshot || getNormalizedCatalogSnapshot();
  const ids = selectTestIdsByChapterId(chapterId, {
    activeOnly,
    publishedOnly,
    requireActiveChapter,
    requireActiveSubject,
    snapshot: catalogSnapshot,
  });

  return toEntityArray(catalogSnapshot?.entities?.testsById || {}, ids);
};

export const selectQuestionIdsByTestId = (
  testId,
  {
    activeOnly = true,
    publishedOnly = false,
    requireActiveTest = true,
    snapshot,
  } = {}
) => {
  const catalogSnapshot = snapshot || getNormalizedCatalogSnapshot();
  const normalizedTestId = normalizeId(testId);
  if (!normalizedTestId) return [];

  const candidateIds =
    catalogSnapshot?.indexes?.questionIdsByTestId?.[normalizedTestId] || [];
  const questionsById = catalogSnapshot?.entities?.questionsById || {};
  const graph = getActiveGraph(catalogSnapshot);

  if (requireActiveTest && !graph.activeTestIds.has(normalizedTestId)) {
    return [];
  }

  return candidateIds.filter((id) => {
    const normalizedQuestionId = normalizeId(id);
    const question = questionsById[normalizedQuestionId];
    if (!question) return false;

    if (activeOnly && !graph.activeQuestionIds.has(normalizedQuestionId)) return false;
    if (publishedOnly && !graph.publishedQuestionIds.has(normalizedQuestionId)) return false;
    if (requireActiveTest && !graph.activeTestIds.has(normalizeId(question.testId))) {
      return false;
    }

    return true;
  });
};

export const selectQuestionsByTestId = (
  testId,
  {
    activeOnly = true,
    publishedOnly = false,
    requireActiveTest = true,
    snapshot,
  } = {}
) => {
  const catalogSnapshot = snapshot || getNormalizedCatalogSnapshot();
  const ids = selectQuestionIdsByTestId(testId, {
    activeOnly,
    publishedOnly,
    requireActiveTest,
    snapshot: catalogSnapshot,
  });

  return toEntityArray(catalogSnapshot?.entities?.questionsById || {}, ids);
};
