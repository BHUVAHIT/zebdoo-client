import { createPagedResult, withMockLatency, ApiError } from "../../../services/apiClient";
import { APP_ENV } from "../../../config/env";
import {
  generateTemporaryPassword,
  hashPassword,
  normalizeEmail,
  validatePasswordStrength,
  verifyPassword,
} from "../../../utils/security";
import { TEST_STORAGE_KEYS } from "../../../utils/constants";
import { loadFromStorage } from "../../../utils/helpers";
import { readCatalogDb, replaceCatalogDb } from "../../../store/catalogStore";
import { generateUniqueSubjectCode } from "./subjectCodeGenerator";

const DEFAULT_STUDENT_PASSWORD = "Student@123";
const DEFAULT_STUDENT_PASSWORD_HASH = hashPassword(DEFAULT_STUDENT_PASSWORD);
const LEGACY_ADMIN_PASSWORD_HASH = hashPassword("Admin@123");
const SUPER_ADMIN_PASSWORD_HASH = hashPassword("SuperAdmin@123");

const getDb = () => normalizeDb(readCatalogDb());

const saveDb = (db) => {
  replaceCatalogDb(normalizeDb(db));
};

const normalizeId = (value) => String(value ?? "").trim();
const sameId = (left, right) => normalizeId(left) === normalizeId(right);
const toBoolean = (value, fallback = false) => {
  if (typeof value === "boolean") return value;
  if (value === "true" || value === "yes" || value === 1 || value === "1") return true;
  if (value === "false" || value === "no" || value === 0 || value === "0") return false;
  return fallback;
};

const stripStudentSecrets = (student) => {
  const {
    passwordHash,
    ...rest
  } = student;

  return {
    ...rest,
    hasPassword: Boolean(passwordHash),
    forcePasswordChange: Boolean(student.forcePasswordChange),
    lastPasswordResetAt:
      student.passwordReset?.requestedAt || student.passwordUpdatedAt || null,
  };
};

const normalizeStudent = (student = {}) => ({
  ...student,
  id: normalizeId(student.id),
  email: normalizeEmail(student.email),
  status: String(student.status || "ACTIVE").toUpperCase(),
  passwordHash: String(student.passwordHash || DEFAULT_STUDENT_PASSWORD_HASH),
  forcePasswordChange: Boolean(student.forcePasswordChange),
  passwordReset: student.passwordReset || null,
  passwordUpdatedAt: student.passwordUpdatedAt || student.enrolledAt || new Date().toISOString(),
});

const normalizeDb = (rawDb = {}) => {
  const normalized = {
    ...rawDb,
    students: Array.isArray(rawDb.students) ? rawDb.students.map(normalizeStudent) : [],
    subjects: Array.isArray(rawDb.subjects)
      ? rawDb.subjects.map((item) => ({ ...item, id: normalizeId(item.id) }))
      : [],
    chapters: Array.isArray(rawDb.chapters)
      ? rawDb.chapters.map((item) => ({
          ...item,
          id: normalizeId(item.id),
          subjectId: normalizeId(item.subjectId),
        }))
      : [],
    tests: Array.isArray(rawDb.tests)
      ? rawDb.tests.map((item) => ({
          ...item,
          id: normalizeId(item.id),
          subjectId: normalizeId(item.subjectId),
          chapterId: normalizeId(item.chapterId),
          workflowStatus: normalizeWorkflowStatus(item.workflowStatus),
          mixStrategy: item.mixStrategy || "MANUAL",
        }))
      : [],
    questions: Array.isArray(rawDb.questions)
      ? rawDb.questions.map((item) => ({
          ...item,
          id: normalizeId(item.id),
          testId: normalizeId(item.testId),
          correctOptionId: String(item.correctOptionId || "A").toUpperCase(),
          tags: safeArray(item.tags),
          difficultyTag: String(item.difficultyTag || "MEDIUM").toUpperCase(),
          examRelevance: String(item.examRelevance || "MEDIUM").toUpperCase(),
          workflowStatus: normalizeWorkflowStatus(item.workflowStatus),
        }))
      : [],
  };

  return normalized;
};

const SYSTEM_USERS = Object.freeze([
  {
    id: "user-super-admin-1",
    name: "Super Admin",
    email: "superadmin@zebdoo.com",
    role: "SUPER_ADMIN",
    passwordHash: SUPER_ADMIN_PASSWORD_HASH,
  },
  {
    id: "user-admin-1",
    name: "Admin",
    email: "admin@gmail.com",
    role: "STUDENT",
    passwordHash: LEGACY_ADMIN_PASSWORD_HASH,
  },
]);

const nextId = (prefix) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

const normalizeQuery = (query = {}) => ({
  page: Math.max(Number(query.page) || 1, 1),
  pageSize: Math.max(Number(query.pageSize) || APP_ENV.defaultPageSize, 1),
  search: String(query.search || "").trim().toLowerCase(),
  sortBy: String(query.sortBy || "createdAt"),
  sortDir: query.sortDir === "asc" ? "asc" : "desc",
});

const containsSearch = (value, search) => String(value || "").toLowerCase().includes(search);

const sortRows = (rows, sortBy, sortDir) => {
  const multiplier = sortDir === "asc" ? 1 : -1;

  return [...rows].sort((a, b) => {
    const left = a?.[sortBy];
    const right = b?.[sortBy];

    if (left === right) return 0;
    return left > right ? multiplier : -1 * multiplier;
  });
};

const paginate = (rows, page, pageSize) => {
  const offset = (page - 1) * pageSize;
  return rows.slice(offset, offset + pageSize);
};

const withMutation = async (mutator) =>
  withMockLatency(() => {
    const db = getDb();
    const updated = normalizeDb(mutator(db));
    saveDb(updated);
    return { success: true };
  });

const withList = async (resolver, options = {}) =>
  withMockLatency(() => {
    const db = normalizeDb(getDb());
    return resolver(db);
  }, {
    signal: options.signal,
  });

const subjectMapFromDb = (db) =>
  db.subjects.reduce((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {});

const chapterMapFromDb = (db) =>
  db.chapters.reduce((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {});

const QUESTION_WORKFLOW_STATES = Object.freeze(["DRAFT", "REVIEW", "PUBLISHED"]);

const normalizeWorkflowStatus = (value) => {
  const normalized = String(value || "").trim().toUpperCase();
  if (QUESTION_WORKFLOW_STATES.includes(normalized)) {
    return normalized;
  }

  return "PUBLISHED";
};

const safeArray = (value) => (Array.isArray(value) ? value : []);

const getAttemptHistory = () => {
  const raw = loadFromStorage(TEST_STORAGE_KEYS.RESULT_HISTORY, []);
  return safeArray(raw);
};

const parseCsvRows = (csvText = "") => {
  return String(csvText || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split("|").map((item) => item.trim()))
    .filter((parts) => parts.length >= 8);
};

const parseTags = (value) =>
  String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export const superAdminService = {
  getMetrics: () =>
    withList((db) => ({
      students: db.students.length,
      subjects: db.subjects.length,
      chapters: db.chapters.length,
      tests: db.tests.length,
      questions: db.questions.length,
    })),

  getDashboardInsights: () =>
    withList((db) => {
      const collections = [db.students, db.subjects, db.chapters, db.tests, db.questions];
      const attemptHistory = getAttemptHistory();

      const totalEntities = collections.reduce((acc, rows) => acc + rows.length, 0);
      const activeEntities = collections.reduce(
        (acc, rows) =>
          acc + rows.filter((item) => String(item.status || "ACTIVE").toUpperCase() === "ACTIVE").length,
        0
      );
      const inactiveEntities = Math.max(totalEntities - activeEntities, 0);

      const expectedQuestionVolume = db.tests.length * 12;
      const questionCoverage = expectedQuestionVolume
        ? Number(((db.questions.length / expectedQuestionVolume) * 100).toFixed(2))
        : 0;

      const workflowCounts = db.questions.reduce(
        (acc, item) => {
          const key = normalizeWorkflowStatus(item.workflowStatus);
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        },
        { DRAFT: 0, REVIEW: 0, PUBLISHED: 0 }
      );

      const attemptsByStudent = attemptHistory.reduce((acc, item) => {
        const studentId = item.userId || "anonymous";
        if (!acc[studentId]) {
          acc[studentId] = {
            attempts: 0,
            scoreTotal: 0,
          };
        }

        acc[studentId].attempts += 1;
        acc[studentId].scoreTotal += Number(item.metrics?.scorePercent || 0);
        return acc;
      }, {});

      const studentScores = Object.values(attemptsByStudent).map((item) =>
        item.attempts ? item.scoreTotal / item.attempts : 0
      );

      const lowPerformingStudents = studentScores.filter((score) => score < 45).length;

      const topicMap = attemptHistory.reduce((acc, attempt) => {
        const topicKey = `${attempt.subject?.name || "Subject"}::${attempt.chapter?.name || "Chapter"}`;
        if (!acc[topicKey]) {
          acc[topicKey] = {
            id: topicKey,
            subjectName: attempt.subject?.name || "Subject",
            chapterName: attempt.chapter?.name || "Chapter",
            attempts: 0,
            accuracyTotal: 0,
          };
        }

        acc[topicKey].attempts += 1;
        acc[topicKey].accuracyTotal += Number(attempt.metrics?.accuracy || 0);
        return acc;
      }, {});

      const topicDifficulty = Object.values(topicMap)
        .map((item) => ({
          ...item,
          averageAccuracy: item.attempts
            ? Number((item.accuracyTotal / item.attempts).toFixed(2))
            : 0,
        }))
        .sort((left, right) => left.averageAccuracy - right.averageAccuracy)
        .slice(0, 6);

      const recentActivity = [
        ...db.students.map((item) => ({
          id: `student-${item.id}`,
          entity: "Student",
          message: `${item.name} profile is ${String(item.status || "ACTIVE").toLowerCase()}.`,
          status: item.status || "ACTIVE",
          createdAt: item.enrolledAt,
        })),
        ...db.subjects.map((item) => ({
          id: `subject-${item.id}`,
          entity: "Subject",
          message: `${item.name} catalog mapped with code ${item.code}.`,
          status: item.status || "ACTIVE",
          createdAt: item.createdAt,
        })),
        ...db.tests.map((item) => ({
          id: `test-${item.id}`,
          entity: "Test",
          message: `${item.title} (${item.difficulty}) ready for assessment flow.`,
          status: item.status || "ACTIVE",
          createdAt: item.createdAt,
        })),
      ]
        .sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0))
        .slice(0, 8);

      return {
        analytics: {
          totalEntities,
          activeEntities,
          inactiveEntities,
          questionCoverage,
          generatedAt: new Date().toISOString(),
        },
        contentWorkflow: {
          draft: workflowCounts.DRAFT || 0,
          review: workflowCounts.REVIEW || 0,
          published: workflowCounts.PUBLISHED || 0,
        },
        studentMonitoring: {
          activeLearners: Object.keys(attemptsByStudent).length,
          lowPerformingStudents,
          totalAttempts: attemptHistory.length,
        },
        topicDifficulty,
        health: {
          auth: "Healthy",
          dataStore: "Healthy",
          apiLatencyMs: Math.round((APP_ENV.mockLatencyMinMs + APP_ENV.mockLatencyMaxMs) / 2),
          incidents: 0,
        },
        recentActivity,
      };
    }),

  listStudents: (query, options = {}) =>
    withList((db) => {
      const { page, pageSize, search, sortBy, sortDir } = normalizeQuery(query);

      let rows = db.students.map(stripStudentSecrets);
      if (search) {
        rows = rows.filter(
          (item) =>
            containsSearch(item.name, search) ||
            containsSearch(item.email, search) ||
            containsSearch(item.srNo, search) ||
            containsSearch(item.level, search)
        );
      }

      const sorted = sortRows(rows, sortBy, sortDir);
      const items = paginate(sorted, page, pageSize);

      return createPagedResult({ items, total: sorted.length, page, pageSize });
    }, options),

  createStudent: (payload) =>
    withMutation((db) => {
      const normalizedEmail = normalizeEmail(payload.email);
      if (!normalizedEmail) {
        throw new ApiError("Email is required.", 400, "EMAIL_REQUIRED");
      }

      const duplicate = db.students.some((item) => normalizeEmail(item.email) === normalizedEmail);
      if (duplicate) {
        throw new ApiError("A student with this email already exists.", 409, "EMAIL_EXISTS");
      }

      const password = String(payload.password || "");
      const policy = validatePasswordStrength(password);
      if (!policy.isValid) {
        throw new ApiError(policy.errors[0], 400, "WEAK_PASSWORD");
      }

      return {
        ...db,
        students: [
          {
            id: nextId("stu"),
            name: payload.name,
            email: normalizedEmail,
            srNo: payload.srNo,
            level: payload.level,
            status: payload.status || "ACTIVE",
            passwordHash: hashPassword(password),
            forcePasswordChange: toBoolean(payload.forcePasswordChange, true),
            passwordReset: null,
            passwordUpdatedAt: new Date().toISOString(),
            enrolledAt: payload.enrolledAt || new Date().toISOString(),
          },
          ...db.students,
        ],
      };
    }),

  updateStudent: (id, payload) =>
    withMutation((db) => {
      const {
        password: _password,
        passwordHash: _passwordHash,
        passwordReset: _passwordReset,
        ...safePayload
      } = payload || {};

      return {
        ...db,
        students: db.students.map((item) =>
          sameId(item.id, id)
            ? {
                ...item,
                ...safePayload,
                email: safePayload.email
                  ? normalizeEmail(safePayload.email)
                  : item.email,
              }
            : item
        ),
      };
    }),

  deleteStudent: (id) =>
    withMutation((db) => ({
      ...db,
      students: db.students.filter((item) => !sameId(item.id, id)),
    })),

  resetStudentPassword: async (id, payload = {}) =>
    withMockLatency(() => {
      const db = getDb();
      const student = db.students.find((item) => sameId(item.id, id));

      if (!student) {
        throw new ApiError("Student not found.", 404, "STUDENT_NOT_FOUND");
      }

      const generatedTemporaryPassword = payload.generateTemporary
        ? generateTemporaryPassword()
        : null;
      const nextPassword = String(payload.password || generatedTemporaryPassword || "");
      const policy = validatePasswordStrength(nextPassword);

      if (!policy.isValid) {
        throw new ApiError(policy.errors[0], 400, "WEAK_PASSWORD");
      }

      const nowIso = new Date().toISOString();
      const resetToken = `rst-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      const expiresAt = new Date(Date.now() + 1000 * 60 * 30).toISOString();

      const updated = {
        ...db,
        students: db.students.map((item) =>
          sameId(item.id, id)
            ? {
                ...item,
                passwordHash: hashPassword(nextPassword),
                forcePasswordChange: toBoolean(payload.forcePasswordChange, true),
                passwordUpdatedAt: nowIso,
                passwordReset: {
                  requestedAt: nowIso,
                  requestedBy: "SUPER_ADMIN",
                  token: resetToken,
                  expiresAt,
                },
              }
            : item
        ),
      };

      saveDb(normalizeDb(updated));

      return {
        success: true,
        studentId: student.id,
        email: student.email,
        resetToken,
        resetTokenExpiresAt: expiresAt,
        temporaryPassword: generatedTemporaryPassword,
      };
    }),

  registerStudent: async (payload) =>
    withMockLatency(() => {
      const db = getDb();
      const normalizedEmail = normalizeEmail(payload.email);
      const password = String(payload.password || "");

      if (!normalizedEmail) {
        throw new ApiError("Email is required.", 400, "EMAIL_REQUIRED");
      }

      if (db.students.some((item) => normalizeEmail(item.email) === normalizedEmail)) {
        throw new ApiError("A student with this email already exists.", 409, "EMAIL_EXISTS");
      }

      const policy = validatePasswordStrength(password);
      if (!policy.isValid) {
        throw new ApiError(policy.errors[0], 400, "WEAK_PASSWORD");
      }

      const nowIso = new Date().toISOString();
      const student = normalizeStudent({
        id: nextId("stu"),
        name: payload.name,
        email: normalizedEmail,
        srNo: payload.srno || payload.srNo,
        level: payload.level,
        status: "ACTIVE",
        passwordHash: hashPassword(password),
        forcePasswordChange: false,
        passwordUpdatedAt: nowIso,
        enrolledAt: nowIso,
      });

      saveDb(
        normalizeDb({
          ...db,
          students: [student, ...db.students],
        })
      );

      return {
        user: {
          id: student.id,
          name: student.name,
          email: student.email,
          role: "STUDENT",
          srno: student.srNo,
          level: student.level,
          forcePasswordChange: student.forcePasswordChange,
        },
      };
    }),

  authenticateUser: async ({ email, password }) =>
    withList((db) => {
      const normalizedEmail = normalizeEmail(email);
      const normalizedPassword = String(password || "");

      const privilegedUser = SYSTEM_USERS.find(
        (item) => normalizeEmail(item.email) === normalizedEmail
      );

      if (privilegedUser && verifyPassword(normalizedPassword, privilegedUser.passwordHash)) {
        return {
          user: {
            id: privilegedUser.id,
            name: privilegedUser.name,
            email: privilegedUser.email,
            role: privilegedUser.role,
          },
          forcePasswordChange: false,
        };
      }

      const student = db.students.find(
        (item) => normalizeEmail(item.email) === normalizedEmail
      );

      if (student && verifyPassword(normalizedPassword, student.passwordHash)) {
        return {
          user: {
            id: student.id,
            name: student.name,
            email: student.email,
            role: "STUDENT",
            srno: student.srNo,
            level: student.level,
            forcePasswordChange: Boolean(student.forcePasswordChange),
          },
          forcePasswordChange: Boolean(student.forcePasswordChange),
        };
      }

      throw new ApiError("Invalid credentials.", 401, "INVALID_CREDENTIALS");
    }),

  listSubjects: (query, options = {}) =>
    withList((db) => {
      const { page, pageSize, search, sortBy, sortDir } = normalizeQuery(query);
      const chapterCountMap = db.chapters.reduce((acc, item) => {
        acc[item.subjectId] = (acc[item.subjectId] || 0) + 1;
        return acc;
      }, {});

      let rows = db.subjects.map((subject) => ({
        ...subject,
        chapterCount: chapterCountMap[subject.id] || 0,
      }));

      if (search) {
        rows = rows.filter(
          (item) =>
            containsSearch(item.name, search) ||
            containsSearch(item.code, search) ||
            containsSearch(item.description, search)
        );
      }

      const sorted = sortRows(rows, sortBy, sortDir);
      const items = paginate(sorted, page, pageSize);

      return createPagedResult({ items, total: sorted.length, page, pageSize });
    }, options),

  createSubject: (payload) =>
    withMutation((db) => {
      const subjectCode = generateUniqueSubjectCode(db.subjects, {
        requestedCode: payload.code,
        prefix: "SUB",
        minDigits: 3,
      });

      return {
        ...db,
        subjects: [
          {
            id: nextId("sub"),
            code: subjectCode,
            name: payload.name,
            description: payload.description,
            status: payload.status || "ACTIVE",
            createdAt: new Date().toISOString(),
          },
          ...db.subjects,
        ],
      };
    }),

  updateSubject: (id, payload) =>
    withMutation((db) => ({
      ...db,
      subjects: db.subjects.map((item) =>
        sameId(item.id, id)
          ? {
              ...item,
              ...payload,
            }
          : item
      ),
    })),

  deleteSubject: (id) =>
    withMutation((db) => {
      const chapterIds = db.chapters
        .filter((item) => sameId(item.subjectId, id))
        .map((item) => item.id);
      const testIds = db.tests
        .filter(
          (item) =>
            sameId(item.subjectId, id) ||
            chapterIds.some((chapterId) => sameId(chapterId, item.chapterId))
        )
        .map((item) => item.id);

      return {
        ...db,
        subjects: db.subjects.filter((item) => !sameId(item.id, id)),
        chapters: db.chapters.filter((item) => !sameId(item.subjectId, id)),
        tests: db.tests.filter(
          (item) => !testIds.some((testId) => sameId(testId, item.id))
        ),
        questions: db.questions.filter(
          (item) => !testIds.some((testId) => sameId(testId, item.testId))
        ),
      };
    }),

  listChapters: (query, options = {}) =>
    withList((db) => {
      const { page, pageSize, search, sortBy, sortDir } = normalizeQuery(query);
      const testCountMap = db.tests.reduce((acc, item) => {
        acc[item.chapterId] = (acc[item.chapterId] || 0) + 1;
        return acc;
      }, {});
      const subjects = subjectMapFromDb(db);

      let rows = db.chapters
        .filter((item) => !query?.subjectId || sameId(item.subjectId, query.subjectId))
        .map((item) => ({
          ...item,
          subjectName: subjects[item.subjectId]?.name || "Unknown",
          testCount: testCountMap[item.id] || 0,
        }));

      if (search) {
        rows = rows.filter(
          (item) => containsSearch(item.title, search) || containsSearch(item.subjectName, search)
        );
      }

      const sorted = sortRows(rows, sortBy, sortDir);
      const items = paginate(sorted, page, pageSize);

      return createPagedResult({ items, total: sorted.length, page, pageSize });
    }, options),

  createChapter: (payload) =>
    withMutation((db) => {
      const subjectExists = db.subjects.some((item) => sameId(item.id, payload.subjectId));
      if (!subjectExists) {
        throw new ApiError("Selected subject does not exist.", 400, "INVALID_SUBJECT");
      }

      return {
        ...db,
        chapters: [
          {
            id: nextId("chap"),
            subjectId: normalizeId(payload.subjectId),
            title: payload.title,
            orderNo: Number(payload.orderNo) || 1,
            status: payload.status || "ACTIVE",
            createdAt: new Date().toISOString(),
          },
          ...db.chapters,
        ],
      };
    }),

  updateChapter: (id, payload) =>
    withMutation((db) => ({
      ...db,
      chapters: db.chapters.map((item) =>
        sameId(item.id, id)
          ? {
              ...item,
              ...payload,
              subjectId: payload.subjectId ? normalizeId(payload.subjectId) : item.subjectId,
              orderNo: Number(payload.orderNo) || item.orderNo,
            }
          : item
      ),
    })),

  deleteChapter: (id) =>
    withMutation((db) => {
      const testIds = db.tests
        .filter((item) => sameId(item.chapterId, id))
        .map((item) => item.id);

      return {
        ...db,
        chapters: db.chapters.filter((item) => !sameId(item.id, id)),
        tests: db.tests.filter((item) => !sameId(item.chapterId, id)),
        questions: db.questions.filter(
          (item) => !testIds.some((testId) => sameId(testId, item.testId))
        ),
      };
    }),

  listTests: (query, options = {}) =>
    withList((db) => {
      const { page, pageSize, search, sortBy, sortDir } = normalizeQuery(query);
      const subjects = subjectMapFromDb(db);
      const chapters = chapterMapFromDb(db);
      const questionCountMap = db.questions.reduce((acc, item) => {
        acc[item.testId] = (acc[item.testId] || 0) + 1;
        return acc;
      }, {});

      let rows = db.tests
        .filter((item) => !query?.subjectId || sameId(item.subjectId, query.subjectId))
        .filter((item) => !query?.chapterId || sameId(item.chapterId, query.chapterId))
        .map((item) => ({
          ...item,
          subjectName: subjects[item.subjectId]?.name || "Unknown",
          chapterTitle: chapters[item.chapterId]?.title || "Unknown",
          questionCount: questionCountMap[item.id] || 0,
          workflowStatus: normalizeWorkflowStatus(item.workflowStatus),
          mixStrategy: item.mixStrategy || "MANUAL",
        }));

      if (search) {
        rows = rows.filter(
          (item) =>
            containsSearch(item.title, search) ||
            containsSearch(item.subjectName, search) ||
            containsSearch(item.chapterTitle, search)
        );
      }

      const sorted = sortRows(rows, sortBy, sortDir);
      const items = paginate(sorted, page, pageSize);

      return createPagedResult({ items, total: sorted.length, page, pageSize });
    }, options),

  createTest: (payload) =>
    withMutation((db) => {
      const chapter = db.chapters.find((item) => sameId(item.id, payload.chapterId));
      if (!chapter) {
        throw new ApiError("Selected chapter does not exist.", 400, "INVALID_CHAPTER");
      }

      return {
        ...db,
        tests: [
          {
            id: nextId("test"),
            chapterId: normalizeId(payload.chapterId),
            subjectId: normalizeId(payload.subjectId || chapter.subjectId),
            title: payload.title,
            difficulty: payload.difficulty,
            durationMinutes: Number(payload.durationMinutes) || 30,
            status: payload.status || "ACTIVE",
            workflowStatus: normalizeWorkflowStatus(payload.workflowStatus),
            mixStrategy: payload.mixStrategy || "MANUAL",
            createdAt: new Date().toISOString(),
          },
          ...db.tests,
        ],
      };
    }),

  updateTest: (id, payload) =>
    withMutation((db) => ({
      ...db,
      tests: db.tests.map((item) =>
        sameId(item.id, id)
          ? {
              ...item,
              ...payload,
              chapterId: payload.chapterId ? normalizeId(payload.chapterId) : item.chapterId,
              subjectId: payload.subjectId ? normalizeId(payload.subjectId) : item.subjectId,
              durationMinutes: Number(payload.durationMinutes) || item.durationMinutes,
              workflowStatus: payload.workflowStatus
                ? normalizeWorkflowStatus(payload.workflowStatus)
                : normalizeWorkflowStatus(item.workflowStatus),
              mixStrategy: payload.mixStrategy || item.mixStrategy || "MANUAL",
            }
          : item
      ),
    })),

  deleteTest: (id) =>
    withMutation((db) => ({
      ...db,
      tests: db.tests.filter((item) => !sameId(item.id, id)),
      questions: db.questions.filter((item) => !sameId(item.testId, id)),
    })),

  listQuestions: (query, options = {}) =>
    withList((db) => {
      const { page, pageSize, search, sortBy, sortDir } = normalizeQuery(query);
      const tests = db.tests.reduce((acc, item) => {
        acc[item.id] = item;
        return acc;
      }, {});
      const chapters = chapterMapFromDb(db);
      const subjects = subjectMapFromDb(db);

      let rows = db.questions
        .filter((item) => !query?.testId || sameId(item.testId, query.testId))
        .filter((item) => {
          if (!query?.chapterId && !query?.subjectId) return true;
          const test = tests[item.testId];
          if (!test) return false;
          if (query.chapterId && !sameId(test.chapterId, query.chapterId)) return false;
          if (query.subjectId && !sameId(test.subjectId, query.subjectId)) return false;
          return true;
        })
        .map((item) => {
          const test = tests[item.testId];
          const chapter = chapters[test?.chapterId];
          const subject = subjects[test?.subjectId];
          const answer = item.options.find((option) => option.id === item.correctOptionId);

          return {
            ...item,
            subjectId: test?.subjectId,
            chapterId: test?.chapterId,
            testTitle: test?.title || "Unknown",
            chapterTitle: chapter?.title || "Unknown",
            subjectName: subject?.name || "Unknown",
            correctAnswerLabel: item.correctOptionId,
            correctAnswerText: answer?.text || "-",
            tags: safeArray(item.tags),
            difficultyTag: String(item.difficultyTag || "MEDIUM").toUpperCase(),
            examRelevance: String(item.examRelevance || "MEDIUM").toUpperCase(),
            workflowStatus: normalizeWorkflowStatus(item.workflowStatus),
          };
        });

      if (search) {
        rows = rows.filter(
          (item) =>
            containsSearch(item.stem, search) ||
            containsSearch(item.testTitle, search) ||
            containsSearch(item.subjectName, search)
        );
      }

      const sorted = sortRows(rows, sortBy, sortDir);
      const items = paginate(sorted, page, pageSize);

      return createPagedResult({ items, total: sorted.length, page, pageSize });
    }, options),

  createQuestion: (payload) =>
    withMutation((db) => {
      const testExists = db.tests.some((item) => sameId(item.id, payload.testId));
      if (!testExists) {
        throw new ApiError("Selected test does not exist.", 400, "INVALID_TEST");
      }

      const options = ["A", "B", "C", "D"].map((id) => ({
        id,
        text: payload.options?.[id] || "",
      }));

      return {
        ...db,
        questions: [
          {
            id: nextId("que"),
            testId: normalizeId(payload.testId),
            stem: payload.stem,
            options,
            correctOptionId: payload.correctOptionId,
            solution: payload.solution,
            tags: safeArray(payload.tags),
            difficultyTag: String(payload.difficultyTag || "MEDIUM").toUpperCase(),
            examRelevance: String(payload.examRelevance || "MEDIUM").toUpperCase(),
            workflowStatus: normalizeWorkflowStatus(payload.workflowStatus),
            status: payload.status || "ACTIVE",
            createdAt: new Date().toISOString(),
          },
          ...db.questions,
        ],
      };
    }),

  updateQuestion: (id, payload) =>
    withMutation((db) => ({
      ...db,
      questions: db.questions.map((item) => {
        if (!sameId(item.id, id)) return item;

        const options = ["A", "B", "C", "D"].map((label) => ({
          id: label,
          text: payload.options?.[label] || item.options.find((option) => option.id === label)?.text || "",
        }));

        return {
          ...item,
          ...payload,
          options,
          tags: payload.tags ? safeArray(payload.tags) : safeArray(item.tags),
          difficultyTag: payload.difficultyTag
            ? String(payload.difficultyTag).toUpperCase()
            : item.difficultyTag,
          examRelevance: payload.examRelevance
            ? String(payload.examRelevance).toUpperCase()
            : item.examRelevance,
          workflowStatus: payload.workflowStatus
            ? normalizeWorkflowStatus(payload.workflowStatus)
            : normalizeWorkflowStatus(item.workflowStatus),
        };
      }),
    })),

  deleteQuestion: (id) =>
    withMutation((db) => ({
      ...db,
      questions: db.questions.filter((item) => !sameId(item.id, id)),
    })),

  bulkImportQuestions: (payload) =>
    withMutation((db) => {
      const testId = normalizeId(payload.testId);
      const testExists = db.tests.some((item) => sameId(item.id, testId));
      if (!testExists) {
        throw new ApiError("Selected test does not exist.", 400, "INVALID_TEST");
      }

      const rows = parseCsvRows(payload.csvText);
      if (!rows.length) {
        throw new ApiError(
          "No valid rows found. Use pipe-separated rows: stem|A|B|C|D|correct|solution|tags|difficulty|relevance|workflow.",
          400,
          "INVALID_CSV"
        );
      }

      const imported = rows.map((parts) => {
        const [
          stem,
          optionA,
          optionB,
          optionC,
          optionD,
          correctOption,
          solution,
          tags,
          difficultyTag,
          examRelevance,
          workflowStatus,
        ] = parts;

        const normalizedCorrect = String(correctOption || "A").trim().toUpperCase();
        const safeCorrect = ["A", "B", "C", "D"].includes(normalizedCorrect)
          ? normalizedCorrect
          : "A";

        return {
          id: nextId("que"),
          testId,
          stem,
          options: [
            { id: "A", text: optionA || "" },
            { id: "B", text: optionB || "" },
            { id: "C", text: optionC || "" },
            { id: "D", text: optionD || "" },
          ],
          correctOptionId: safeCorrect,
          solution: solution || "",
          tags: parseTags(tags),
          difficultyTag: String(difficultyTag || "MEDIUM").toUpperCase(),
          examRelevance: String(examRelevance || "MEDIUM").toUpperCase(),
          workflowStatus: normalizeWorkflowStatus(workflowStatus),
          status: "ACTIVE",
          createdAt: new Date().toISOString(),
        };
      });

      return {
        ...db,
        questions: [...imported, ...db.questions],
      };
    }),

  autoGenerateTests: (payload) =>
    withMutation((db) => {
      const subjectId = normalizeId(payload.subjectId);
      const chapterId = normalizeId(payload.chapterId);
      const chapter = db.chapters.find((item) => sameId(item.id, chapterId));

      if (!chapter || !sameId(chapter.subjectId, subjectId)) {
        throw new ApiError(
          "Chapter does not belong to selected subject.",
          400,
          "INVALID_CHAPTER_SUBJECT"
        );
      }

      const testCount = Math.max(Number(payload.testCount) || 3, 1);
      const mixStrategy = String(payload.mixStrategy || "PYQ+CONCEPT").toUpperCase();
      const baseTitle = String(payload.baseTitle || `${chapter.title} Auto Test`).trim();
      const createdAt = new Date().toISOString();
      const difficulties = ["EASY", "MEDIUM", "HARD"];

      const generatedTests = Array.from({ length: testCount }, (_, index) => {
        const difficulty = difficulties[index % difficulties.length];
        const durationMinutes = difficulty === "HARD" ? 60 : difficulty === "MEDIUM" ? 45 : 30;

        return {
          id: nextId("test"),
          chapterId,
          subjectId,
          title: `${baseTitle} ${index + 1}`,
          difficulty,
          durationMinutes,
          status: "ACTIVE",
          workflowStatus: "DRAFT",
          generationType: "RULE_BASED",
          mixStrategy,
          createdAt,
        };
      });

      return {
        ...db,
        tests: [...generatedTests, ...db.tests],
      };
    }),

  getEntityOptions: () =>
    withList((db) => {
      const activeSubjects = db.subjects.filter((item) => item.status !== "INACTIVE");
      const activeSubjectIds = new Set(activeSubjects.map((item) => normalizeId(item.id)));

      const activeChapters = db.chapters.filter(
        (item) => item.status !== "INACTIVE" && activeSubjectIds.has(normalizeId(item.subjectId))
      );
      const activeChapterIds = new Set(activeChapters.map((item) => normalizeId(item.id)));

      const activeTests = db.tests.filter(
        (item) =>
          item.status !== "INACTIVE" &&
          activeSubjectIds.has(normalizeId(item.subjectId)) &&
          activeChapterIds.has(normalizeId(item.chapterId))
      );

      return {
        subjects: activeSubjects.map((item) => ({
          label: `${item.name} (${item.code})`,
          value: item.id,
        })),
        chapters: activeChapters.map((item) => ({
          label: item.title,
          value: item.id,
          subjectId: item.subjectId,
        })),
        tests: activeTests.map((item) => ({
          label: item.title,
          value: item.id,
          subjectId: item.subjectId,
          chapterId: item.chapterId,
        })),
      };
    }),
};
