import { hashPassword } from "../../../utils/security";

const SUBJECT_SEED = [
  "Accounting",
  "Auditing",
  "Taxation",
  "Corporate Law",
  "Financial Management",
  "Cost Accounting",
];

const CHAPTER_SEED = [
  "Fundamentals",
  "Advanced Concepts",
  "Applications",
  "Case Studies",
  "Practice Workbook",
];

const STUDENT_LEVELS = ["Foundation", "Inter", "Final"];
const DIFFICULTIES = ["EASY", "MEDIUM", "HARD"];
const DEFAULT_STUDENT_PASSWORD_HASH = hashPassword("Student@123");

const makeIso = (daysAgo) => {
  const date = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  return date.toISOString();
};

const makeStudent = (index) => {
  const level = STUDENT_LEVELS[index % STUDENT_LEVELS.length];
  const isActive = index % 7 !== 0;

  return {
    id: `stu-${index + 1}`,
    name: `Student ${index + 1}`,
    email: `student${index + 1}@zebdoo.com`,
    srNo: `SR${String(120000 + index).padStart(6, "0")}`,
    level,
    status: isActive ? "ACTIVE" : "INACTIVE",
    passwordHash: DEFAULT_STUDENT_PASSWORD_HASH,
    forcePasswordChange: false,
    passwordUpdatedAt: makeIso(320 - index),
    enrolledAt: makeIso(320 - index),
  };
};

const buildOptions = (questionText, answerIndex) => {
  const labels = ["A", "B", "C", "D"];
  return labels.map((label, index) => ({
    id: label,
    text:
      index === answerIndex
        ? `Correct insight for ${questionText}`
        : `Distractor ${index + 1} for ${questionText}`,
  }));
};

export const buildInitialAdminDb = () => {
  const students = Array.from({ length: 240 }, (_, index) => makeStudent(index));

  const subjects = SUBJECT_SEED.map((name, index) => ({
    id: `sub-${index + 1}`,
    code: `SUB${String(index + 1).padStart(2, "0")}`,
    name,
    description: `${name} structured curriculum and question bank.`,
    status: "ACTIVE",
    createdAt: makeIso(420 - index * 4),
  }));

  const chapters = [];
  const tests = [];
  const questions = [];

  subjects.forEach((subject, subjectIndex) => {
    CHAPTER_SEED.forEach((chapterName, chapterIndex) => {
      const chapterId = `chap-${subjectIndex + 1}-${chapterIndex + 1}`;
      chapters.push({
        id: chapterId,
        subjectId: subject.id,
        title: `${chapterName} ${subject.name}`,
        orderNo: chapterIndex + 1,
        status: "ACTIVE",
        createdAt: makeIso(360 - chapterIndex * 5 - subjectIndex * 3),
      });

      DIFFICULTIES.forEach((difficulty, testIndex) => {
        const testId = `test-${subjectIndex + 1}-${chapterIndex + 1}-${testIndex + 1}`;
        tests.push({
          id: testId,
          subjectId: subject.id,
          chapterId,
          title: `${subject.name} ${chapterName} ${difficulty} Test`,
          difficulty,
          durationMinutes: 30 + testIndex * 15,
          status: "ACTIVE",
          createdAt: makeIso(300 - testIndex * 3 - chapterIndex * 4),
        });

        for (let q = 1; q <= 12; q += 1) {
          const answerIndex = (q + testIndex) % 4;
          const stem = `Q${q} ${subject.name} ${chapterName} ${difficulty}`;

          questions.push({
            id: `que-${subjectIndex + 1}-${chapterIndex + 1}-${testIndex + 1}-${q}`,
            testId,
            stem: `What is the most accurate statement for ${stem}?`,
            options: buildOptions(stem, answerIndex),
            correctOptionId: ["A", "B", "C", "D"][answerIndex],
            solution:
              `Step 1: Identify concept in ${subject.name}.\n` +
              `Step 2: Match chapter objective from ${chapterName}.\n` +
              "Step 3: Select the option that satisfies both conceptual and contextual constraints.",
            status: "ACTIVE",
            createdAt: makeIso(240 - q - chapterIndex * 2),
          });
        }
      });
    });
  });

  return {
    students,
    subjects,
    chapters,
    tests,
    questions,
  };
};
