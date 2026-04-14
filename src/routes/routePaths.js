export const ROLES = Object.freeze({
  STUDENT: "STUDENT",
  SUPER_ADMIN: "SUPER_ADMIN",
});

export const KNOWN_ROLES = Object.freeze([ROLES.STUDENT, ROLES.SUPER_ADMIN]);

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
    community: "/student/community",
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
    testPapers: "/admin/test-papers",
    testPapersCreate: "/admin/test-papers/create",
    testPapersEdit: "/admin/test-papers/edit/:id",
    community: "/admin/community",
    communityAnnouncements: "/admin/community/announcements",
    communityModeration: "/admin/community/moderation",
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

export const isKnownRole = (role) => KNOWN_ROLES.includes(normalizeRole(role));

export const isSuperAdminRole = (role) => normalizeRole(role) === ROLES.SUPER_ADMIN;

export const isStudentRole = (role) => STUDENT_ROLES.includes(normalizeRole(role));

export const getDefaultAppRoute = (role) => {
  const normalizedRole = normalizeRole(role);
  if (normalizedRole === ROLES.SUPER_ADMIN) return ROUTES.admin.root;
  if (normalizedRole === ROLES.STUDENT) return ROUTES.student.dashboard;
  return ROUTES.auth.login;
};

export const getRoleHomeRoute = (role) => {
  const normalizedRole = normalizeRole(role);
  if (normalizedRole === ROLES.SUPER_ADMIN) return ROUTES.admin.dashboard;
  if (normalizedRole === ROLES.STUDENT) return ROUTES.student.dashboard;
  return ROUTES.auth.login;
};

export const PUBLIC_ROUTES = [ROUTES.home, ROUTES.auth.login, ROUTES.auth.register];
