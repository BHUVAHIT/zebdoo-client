export const ROLES = Object.freeze({
  STUDENT: "STUDENT",
  SUPER_ADMIN: "SUPER_ADMIN",
});

const LEGACY_ROLE_ALIASES = Object.freeze({
  USER: ROLES.STUDENT,
  STUDENT: ROLES.STUDENT,
  ADMIN: ROLES.STUDENT,
  SUPER_ADMIN: ROLES.SUPER_ADMIN,
});

export const STUDENT_ROLES = Object.freeze([ROLES.STUDENT]);
export const SUPER_ADMIN_ROLES = Object.freeze([ROLES.SUPER_ADMIN]);
export const ADMIN_ROLES = SUPER_ADMIN_ROLES;

export const ROUTES = Object.freeze({
  home: "/",
  auth: {
    login: "/login",
    register: "/register",
  },
  student: {
    dashboard: "/dashboard",
    profile: "/student/profile",
    testPapersRoot: "/test-papers",
  },
  assessment: {
    root: "/assessment",
    sessionRoot: "/assessment/session",
    result: "/assessment/result",
  },
  admin: {
    root: "/admin",
    dashboard: "/admin/dashboard",
    qaChecklist: "/admin/qa-checklist",
    students: "/admin/students",
    subjects: "/admin/subjects",
    chapters: "/admin/chapters",
    tests: "/admin/tests",
    questions: "/admin/questions",
    questionBank: "/admin/question-bank",
    testPapers: "/admin/test-papers",
    testPapersCreate: "/admin/test-papers/create",
    testPapersEdit: "/admin/test-papers/edit/:id",
  },
  legacy: {
    testRoot: "/test",
    result: "/result",
    superAdminRoot: "/super-admin",
  },
});

export const routeBuilders = {
  assessmentSession: {
    root: ROUTES.assessment.sessionRoot,
    chapters: (subjectId) => `${ROUTES.assessment.sessionRoot}/${subjectId}/chapters`,
    difficulty: (subjectId, chapterId) =>
      `${ROUTES.assessment.sessionRoot}/${subjectId}/${chapterId}/difficulty`,
    attempt: (subjectId, chapterId, difficultyLevel) =>
      `${ROUTES.assessment.sessionRoot}/${subjectId}/${chapterId}/${difficultyLevel}/attempt`,
    preview: (subjectId, chapterId, difficultyLevel) =>
      `${ROUTES.assessment.sessionRoot}/${subjectId}/${chapterId}/${difficultyLevel}/preview`,
  },
  testPapers: {
    root: ROUTES.student.testPapersRoot,
    subject: (subjectId) => `${ROUTES.student.testPapersRoot}/${subjectId}`,
    mode: (subjectId, mode) => `${ROUTES.student.testPapersRoot}/${subjectId}/${mode}`,
    chapter: (subjectId, mode, chapterId) =>
      `${ROUTES.student.testPapersRoot}/${subjectId}/${mode}/${chapterId}`,
  },
  admin: {
    testPapersEdit: (id) => `${ROUTES.admin.testPapers}/edit/${id}`,
  },
};

export const normalizeRole = (role) => {
  const normalized = String(role || "").trim().toUpperCase();
  return LEGACY_ROLE_ALIASES[normalized] || normalized;
};

export const isSuperAdminRole = (role) => normalizeRole(role) === ROLES.SUPER_ADMIN;

export const isStudentRole = (role) => STUDENT_ROLES.includes(normalizeRole(role));

export const getDefaultAppRoute = (role) =>
  isSuperAdminRole(role) ? ROUTES.admin.root : ROUTES.student.dashboard;

export const getRoleHomeRoute = (role) =>
  isSuperAdminRole(role) ? ROUTES.admin.dashboard : ROUTES.student.dashboard;

export const PUBLIC_ROUTES = [ROUTES.home, ROUTES.auth.login, ROUTES.auth.register];
