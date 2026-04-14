import { ROLES, ROUTES, normalizeRole } from "./routePaths";

export const PREFETCH_PRIORITY = Object.freeze({
  CRITICAL: "critical",
  HIGH: "high",
  LOW: "low",
});

const PRIORITY_ORDER = [
  PREFETCH_PRIORITY.CRITICAL,
  PREFETCH_PRIORITY.HIGH,
  PREFETCH_PRIORITY.LOW,
];

const SOFT_INPUT_BLOCK_MS = 1400;
const LOW_PRIORITY_INPUT_BLOCK_MS = 4200;

const queueByPriority = {
  [PREFETCH_PRIORITY.CRITICAL]: [],
  [PREFETCH_PRIORITY.HIGH]: [],
  [PREFETCH_PRIORITY.LOW]: [],
};

let activePrefetchCount = 0;
let drainTimerId = null;
let inputTrackingReady = false;
let lastInputAt = 0;

const pendingByKey = new Map();

const normalizePriority = (value) => {
  const normalized = String(value || "").toLowerCase();

  if (normalized === PREFETCH_PRIORITY.CRITICAL) return PREFETCH_PRIORITY.CRITICAL;
  if (normalized === PREFETCH_PRIORITY.HIGH) return PREFETCH_PRIORITY.HIGH;
  return PREFETCH_PRIORITY.LOW;
};

const once = (loader) => {
  let promise = null;

  return () => {
    if (!promise) {
      promise = Promise.resolve()
        .then(() => loader())
        .catch((error) => {
          promise = null;
          throw error;
        });
    }

    return promise;
  };
};

const preloaders = Object.freeze({
  login: once(() => import("../modules/auth/pages/LoginPage")),
  register: once(() => import("../modules/auth/pages/RegisterPage")),

  studentDashboard: once(() => import("../modules/student/dashboard/pages/StudentDashboardPage")),
  studentProfile: once(() => import("../modules/student/profile/pages/StudentProfilePage")),
  studentCommunity: once(() => import("../modules/community/pages/StudentCommunityPage")),
  assessmentSession: once(() => import("../modules/assessment/pages/AssessmentSessionPage")),
  assessmentResult: once(() => import("../modules/assessment/pages/AssessmentResultPage")),
  testPaperSubjects: once(() => import("../pages/TestPaperSubjectsPage")),
  testPaperChapters: once(() => import("../pages/TestPaperChaptersPage")),
  testPaperList: once(() => import("../pages/TestPaperListPage")),

  superAdminApp: once(() => import("../modules/superAdmin/pages/SuperAdminApp")),
  adminDashboard: once(() => import("../modules/admin/dashboard/pages/AdminDashboardPage")),
  adminQaChecklist: once(() => import("../modules/admin/dashboard/pages/AdminQaChecklistPage")),
  adminStudents: once(() => import("../modules/admin/management/pages/StudentsManagementPage")),
  adminSubjects: once(() => import("../modules/admin/management/pages/SubjectsManagementPage")),
  adminChapters: once(() => import("../modules/admin/management/pages/ChaptersManagementPage")),
  adminTests: once(() => import("../modules/admin/management/pages/TestsManagementPage")),
  adminQuestions: once(() => import("../modules/admin/management/pages/QuestionsManagementPage")),
  adminPapers: once(() => import("../admin-pages/ManageTestPapersPage")),
  adminCommunityOverview: once(() => import("../modules/community/pages/AdminCommunityOverviewPage")),
  adminCommunityAnnouncements: once(() => import("../modules/community/pages/AdminCommunityAnnouncementsPage")),
  adminCommunityModeration: once(() => import("../modules/community/pages/AdminCommunityModerationPage")),
});

const uniqueKeys = (keys = []) => Array.from(new Set(keys.filter(Boolean)));

const getConnection = () => {
  if (typeof navigator === "undefined") return null;
  return navigator.connection || navigator.mozConnection || navigator.webkitConnection || null;
};

const isConstrainedNetwork = () => {
  const connection = getConnection();
  if (!connection) return false;

  if (connection.saveData) return true;

  const effectiveType = String(connection.effectiveType || "").toLowerCase();
  return effectiveType.includes("2g") || effectiveType.includes("slow");
};

const getConcurrencyBudget = () => {
  if (isConstrainedNetwork()) {
    return 0;
  }

  const deviceMemory = Number(typeof navigator !== "undefined" ? navigator.deviceMemory : 0);
  const hardwareConcurrency = Number(
    typeof navigator !== "undefined" ? navigator.hardwareConcurrency : 0
  );

  if (
    (Number.isFinite(deviceMemory) && deviceMemory > 0 && deviceMemory <= 2) ||
    (Number.isFinite(hardwareConcurrency) && hardwareConcurrency > 0 && hardwareConcurrency <= 4)
  ) {
    return 1;
  }

  return 2;
};

const bindInputTracking = () => {
  if (inputTrackingReady || typeof window === "undefined") {
    return;
  }

  const markInput = () => {
    lastInputAt = Date.now();
  };

  window.addEventListener("pointerdown", markInput, { capture: true, passive: true });
  window.addEventListener("keydown", markInput, { capture: true, passive: true });
  window.addEventListener("touchstart", markInput, { capture: true, passive: true });

  inputTrackingReady = true;
};

const isInputPending = () => {
  try {
    return Boolean(navigator?.scheduling?.isInputPending?.());
  } catch {
    return false;
  }
};

const shouldPauseForInteraction = (priority) => {
  if (priority === PREFETCH_PRIORITY.CRITICAL) {
    return false;
  }

  const elapsed = Date.now() - lastInputAt;
  if (elapsed < SOFT_INPUT_BLOCK_MS) {
    return true;
  }

  if (priority === PREFETCH_PRIORITY.LOW && elapsed < LOW_PRIORITY_INPUT_BLOCK_MS) {
    return true;
  }

  return isInputPending();
};

const scheduleDrain = (delayMs = 0) => {
  if (typeof window === "undefined") {
    return;
  }

  if (drainTimerId !== null) {
    return;
  }

  drainTimerId = window.setTimeout(() => {
    drainTimerId = null;
    void drainQueue();
  }, delayMs);
};

const dequeueTask = () => {
  for (const priority of PRIORITY_ORDER) {
    const queue = queueByPriority[priority];
    if (queue.length > 0) {
      return queue.shift();
    }
  }

  return null;
};

const completeTask = (task) => {
  const pending = pendingByKey.get(task.key);
  if (!pending) return;

  pendingByKey.delete(task.key);
  pending.resolve();
};

const runTask = (task) => {
  const preload = preloaders[task.key];
  if (!preload) {
    completeTask(task);
    return;
  }

  activePrefetchCount += 1;

  preload()
    .catch(() => undefined)
    .finally(() => {
      activePrefetchCount = Math.max(activePrefetchCount - 1, 0);
      completeTask(task);
      scheduleDrain();
    });
};

const drainQueue = async () => {
  bindInputTracking();

  const concurrencyBudget = getConcurrencyBudget();
  if (concurrencyBudget <= 0) {
    return;
  }

  while (activePrefetchCount < concurrencyBudget) {
    const task = dequeueTask();
    if (!task) {
      return;
    }

    if (shouldPauseForInteraction(task.priority)) {
      queueByPriority[task.priority].unshift(task);
      scheduleDrain(150);
      return;
    }

    runTask(task);
  }
};

const enqueuePrefetchTask = (key, priority) => {
  if (!preloaders[key]) {
    return Promise.resolve();
  }

  const existing = pendingByKey.get(key);
  if (existing) {
    return existing.promise;
  }

  let resolveTask;
  const promise = new Promise((resolve) => {
    resolveTask = resolve;
  });

  pendingByKey.set(key, {
    promise,
    resolve: resolveTask,
  });

  queueByPriority[priority].push({ key, priority });
  scheduleDrain();

  return promise;
};

export const prefetchChunks = async (keys = [], options = {}) => {
  const nextKeys = uniqueKeys(keys);
  const priority = normalizePriority(options.priority);

  await Promise.all(
    nextKeys.map((key) => enqueuePrefetchTask(key, priority))
  );
};

export const scheduleIdlePrefetch = (runner, timeout = 900) => {
  if (typeof window === "undefined") {
    return () => {};
  }

  if (typeof window.requestIdleCallback === "function") {
    const idleId = window.requestIdleCallback(() => {
      runner?.();
    }, { timeout });

    return () => {
      window.cancelIdleCallback?.(idleId);
    };
  }

  const timeoutId = window.setTimeout(() => {
    runner?.();
  }, Math.min(timeout, 180));

  return () => {
    window.clearTimeout(timeoutId);
  };
};

export const prefetchRoleCriticalRoutes = async (role) => {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === ROLES.STUDENT) {
    await prefetchChunks([
      "studentDashboard",
      "studentProfile",
      "studentCommunity",
      "assessmentSession",
      "testPaperSubjects",
      "assessmentResult",
    ], {
      priority: PREFETCH_PRIORITY.LOW,
    });
    return;
  }

  if (normalizedRole === ROLES.SUPER_ADMIN) {
    await prefetchChunks([
      "superAdminApp",
      "adminDashboard",
      "adminStudents",
      "adminSubjects",
      "adminTests",
      "adminQuestions",
      "adminPapers",
    ], {
      priority: PREFETCH_PRIORITY.LOW,
    });
    return;
  }

  await prefetchChunks(["login", "register"], {
    priority: PREFETCH_PRIORITY.LOW,
  });
};

const startsWith = (pathname, basePath) => String(pathname || "").startsWith(basePath);

export const prefetchLikelyRoutes = async ({ pathname, role } = {}) => {
  const normalizedPath = String(pathname || "");
  const normalizedRole = normalizeRole(role);

  const nextKeys = [];

  if (normalizedRole === ROLES.SUPER_ADMIN || startsWith(normalizedPath, ROUTES.admin.root)) {
    nextKeys.push(
      "superAdminApp",
      "adminDashboard",
      "adminQaChecklist",
      "adminStudents",
      "adminSubjects",
      "adminChapters",
      "adminTests",
      "adminQuestions",
      "adminPapers",
      "adminCommunityOverview",
      "adminCommunityAnnouncements",
      "adminCommunityModeration"
    );
  }

  if (normalizedRole === ROLES.STUDENT || startsWith(normalizedPath, ROUTES.student.dashboard)) {
    nextKeys.push(
      "studentDashboard",
      "studentProfile",
      "studentCommunity",
      "assessmentSession",
      "assessmentResult",
      "testPaperSubjects"
    );
  }

  if (startsWith(normalizedPath, ROUTES.student.testPapersRoot)) {
    nextKeys.push("testPaperSubjects", "testPaperChapters", "testPaperList", "assessmentSession");
  }

  if (startsWith(normalizedPath, ROUTES.assessment.sessionRoot)) {
    nextKeys.push("assessmentSession", "assessmentResult", "studentDashboard");
  }

  if (startsWith(normalizedPath, ROUTES.auth.login) || startsWith(normalizedPath, ROUTES.auth.register)) {
    nextKeys.push("studentDashboard", "superAdminApp");
  }

  await prefetchChunks(nextKeys, {
    priority: PREFETCH_PRIORITY.LOW,
  });
};

export const prefetchRouteByPath = async (pathname, options = {}) => {
  const normalizedPath = String(pathname || "");
  const priority = normalizePriority(options.priority || PREFETCH_PRIORITY.HIGH);

  if (normalizedPath.startsWith(ROUTES.auth.login)) {
    await prefetchChunks(["login"], { priority });
    return;
  }

  if (normalizedPath.startsWith(ROUTES.auth.register)) {
    await prefetchChunks(["register"], { priority });
    return;
  }

  if (normalizedPath.startsWith(ROUTES.admin.root)) {
    await prefetchChunks(["superAdminApp", "adminDashboard"], { priority });
    return;
  }

  if (normalizedPath.startsWith(ROUTES.student.dashboard)) {
    await prefetchChunks(["studentDashboard"], { priority });
    return;
  }

  if (normalizedPath.startsWith(ROUTES.student.profile)) {
    await prefetchChunks(["studentProfile"], { priority });
    return;
  }

  if (normalizedPath.startsWith(ROUTES.student.community)) {
    await prefetchChunks(["studentCommunity"], { priority });
    return;
  }

  if (normalizedPath.startsWith(ROUTES.assessment.sessionRoot)) {
    await prefetchChunks(["assessmentSession"], { priority });
    return;
  }

  if (normalizedPath.startsWith(ROUTES.assessment.result)) {
    await prefetchChunks(["assessmentResult"], { priority });
    return;
  }

  if (normalizedPath.startsWith(ROUTES.student.testPapersRoot)) {
    await prefetchChunks(["testPaperSubjects", "testPaperChapters", "testPaperList"], {
      priority,
    });
  }
};
