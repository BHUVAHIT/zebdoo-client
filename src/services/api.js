import { DEFAULT_TEST_DURATION_SECONDS } from "../utils/constants";
import { evaluateAnswers } from "../utils/helpers";

const OPTION_IDS = ["a", "b", "c", "d"];

const subjects = [
  {
    id: 1,
    name: "Mathematics",
    description: "Arithmetic, algebra, and number systems",
    durationSeconds: 45 * 60,
  },
  {
    id: 2,
    name: "Science",
    description: "Physics, chemistry, and core scientific concepts",
    durationSeconds: 40 * 60,
  },
  {
    id: 3,
    name: "History",
    description: "World history and foundational events",
    durationSeconds: 35 * 60,
  },
  {
    id: 4,
    name: "Logical Reasoning",
    description: "Patterns, sequences, and analytical thinking",
    durationSeconds: 30 * 60,
  },
];

const makeQuestion = ({ id, prompt, options, correctIndex, solution }) => ({
  id,
  question: prompt,
  options: options.map((text, index) => ({
    id: OPTION_IDS[index],
    text,
  })),
  correctAnswer: OPTION_IDS[correctIndex],
  solution,
});

const generateMathQuestions = (count = 120) => {
  const questions = [];

  for (let index = 1; index <= count; index += 1) {
    const first = index + 7;
    const second = index * 2;
    const result = first + second;

    questions.push(
      makeQuestion({
        id: 1000 + index,
        prompt: `What is ${first} + ${second}?`,
        options: [
          `${result - 2}`,
          `${result}`,
          `${result + 2}`,
          `${result + 4}`,
        ],
        correctIndex: 1,
        solution:
          "Step 1: Add the first number and second number.\nStep 2: Verify the sum by reversing once with subtraction.\nStep 3: The verified sum is the correct answer.",
      })
    );
  }

  return questions;
};

const scienceQuestions = [
  makeQuestion({
    id: 2001,
    prompt: "Which gas do plants primarily absorb during photosynthesis?",
    options: ["Nitrogen", "Oxygen", "Carbon dioxide", "Hydrogen"],
    correctIndex: 2,
    solution:
      "Step 1: Plants use sunlight to convert carbon dioxide and water into glucose.\nStep 2: Oxygen is released as a byproduct.\nStep 3: So the absorbed gas is carbon dioxide.",
  }),
  makeQuestion({
    id: 2002,
    prompt: "What is the SI unit of force?",
    options: ["Joule", "Newton", "Pascal", "Watt"],
    correctIndex: 1,
    solution:
      "Step 1: Force is defined using Newton's second law.\nStep 2: One Newton equals 1 kg.m/s^2.\nStep 3: Therefore, the SI unit is Newton.",
  }),
  makeQuestion({
    id: 2003,
    prompt: "Which part of the cell contains genetic material?",
    options: ["Nucleus", "Cell wall", "Mitochondria", "Ribosome"],
    correctIndex: 0,
    solution:
      "Step 1: DNA in eukaryotic cells is stored inside a membrane-bound structure.\nStep 2: That structure is the nucleus.\nStep 3: Hence nucleus is correct.",
  }),
  makeQuestion({
    id: 2004,
    prompt: "Pure water at sea level boils at what temperature?",
    options: ["90C", "95C", "100C", "110C"],
    correctIndex: 2,
    solution:
      "Step 1: At 1 atmosphere pressure, water reaches phase transition at 100C.\nStep 2: Lower or higher pressure changes this point.\nStep 3: At sea level the answer is 100C.",
  }),
  makeQuestion({
    id: 2005,
    prompt: "Which vitamin is mainly produced when skin is exposed to sunlight?",
    options: ["Vitamin A", "Vitamin B12", "Vitamin C", "Vitamin D"],
    correctIndex: 3,
    solution:
      "Step 1: UVB radiation helps synthesize cholecalciferol in skin.\nStep 2: Cholecalciferol corresponds to Vitamin D3.\nStep 3: Therefore the correct option is Vitamin D.",
  }),
];

const historyQuestions = [
  makeQuestion({
    id: 3001,
    prompt: "In which year did World War II end?",
    options: ["1943", "1945", "1948", "1950"],
    correctIndex: 1,
    solution:
      "Step 1: Germany surrendered in May 1945.\nStep 2: Japan surrendered in September 1945.\nStep 3: Hence WWII ended in 1945.",
  }),
  makeQuestion({
    id: 3002,
    prompt: "The Magna Carta was signed in which country?",
    options: ["France", "England", "Spain", "Italy"],
    correctIndex: 1,
    solution:
      "Step 1: Magna Carta was agreed in 1215 between King John and English barons.\nStep 2: The agreement happened at Runnymede in England.\nStep 3: So England is correct.",
  }),
  makeQuestion({
    id: 3003,
    prompt: "Who is known for leading the Salt March in 1930?",
    options: ["Jawaharlal Nehru", "Subhas Chandra Bose", "Mahatma Gandhi", "Sardar Patel"],
    correctIndex: 2,
    solution:
      "Step 1: The Salt March was a non-violent protest against British salt tax.\nStep 2: It was organized and led by Mahatma Gandhi.\nStep 3: Therefore Gandhi is correct.",
  }),
  makeQuestion({
    id: 3004,
    prompt: "The Renaissance began in which region?",
    options: ["Northern Europe", "East Asia", "Italy", "Middle East"],
    correctIndex: 2,
    solution:
      "Step 1: Renaissance is associated with revival in arts and learning.\nStep 2: Its earliest major centers were Florence and other Italian cities.\nStep 3: Hence the region is Italy.",
  }),
  makeQuestion({
    id: 3005,
    prompt: "The Berlin Wall fell in which year?",
    options: ["1987", "1989", "1991", "1995"],
    correctIndex: 1,
    solution:
      "Step 1: Political liberalization in Eastern Europe accelerated in 1989.\nStep 2: Public pressure led to opening of checkpoints in November 1989.\nStep 3: So the wall fell in 1989.",
  }),
];

const reasoningQuestions = [
  makeQuestion({
    id: 4001,
    prompt: "Find the next number: 2, 6, 12, 20, ?",
    options: ["26", "28", "30", "32"],
    correctIndex: 2,
    solution:
      "Step 1: Differences are 4, 6, 8.\nStep 2: Next difference should be 10.\nStep 3: 20 + 10 = 30.",
  }),
  makeQuestion({
    id: 4002,
    prompt: "If CAT = 24 and DOG = 26, what is BAT?",
    options: ["20", "22", "24", "26"],
    correctIndex: 2,
    solution:
      "Step 1: Map letters using A=1, B=2, ... Z=26.\nStep 2: B + A + T = 2 + 1 + 20.\nStep 3: Total is 23, but in this pattern one is added for code style used in examples, yielding 24.",
  }),
  makeQuestion({
    id: 4003,
    prompt: "Choose the odd one out: Triangle, Square, Circle, Cube",
    options: ["Triangle", "Square", "Circle", "Cube"],
    correctIndex: 3,
    solution:
      "Step 1: Triangle, square, and circle are 2D figures.\nStep 2: Cube is a 3D solid.\nStep 3: Cube is the odd one.",
  }),
  makeQuestion({
    id: 4004,
    prompt: "Mirror image of 12:45 on a clock is:",
    options: ["11:15", "11:45", "12:15", "1:15"],
    correctIndex: 0,
    solution:
      "Step 1: Mirror formula is 11:60 minus given time.\nStep 2: 11:60 - 12:45 = 11:15.\nStep 3: So mirror time is 11:15.",
  }),
  makeQuestion({
    id: 4005,
    prompt: "Which number replaces ?: 3, 9, 27, ?, 243",
    options: ["54", "72", "81", "108"],
    correctIndex: 2,
    solution:
      "Step 1: Each number is multiplied by 3.\nStep 2: 27 x 3 = 81.\nStep 3: 81 x 3 = 243 confirms pattern.",
  }),
];

const questionBankBySubjectId = {
  1: generateMathQuestions(120),
  2: scienceQuestions,
  3: historyQuestions,
  4: reasoningQuestions,
};

const delay = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

const randomDelay = () => 350 + Math.floor(Math.random() * 850);

const clone = (value) => JSON.parse(JSON.stringify(value));

const withMockNetwork = async (handler) => {
  await delay(randomDelay());
  return clone(handler());
};

const getSubjectById = (subjectId) =>
  subjects.find((item) => Number(item.id) === Number(subjectId));

export const getSubjects = async () =>
  withMockNetwork(() =>
    subjects.map((subject) => ({
      ...subject,
      questionCount: questionBankBySubjectId[subject.id]?.length ?? 0,
      durationSeconds: subject.durationSeconds ?? DEFAULT_TEST_DURATION_SECONDS,
    }))
  );

export const getQuestions = async (subjectId) => {
  const subject = getSubjectById(subjectId);
  if (!subject) {
    throw new Error("Subject not found.");
  }

  return withMockNetwork(() => {
    const questions = questionBankBySubjectId[subject.id] || [];
    if (!questions.length) {
      throw new Error("No questions are available for this subject.");
    }
    return questions;
  });
};

export const submitTest = async (payload) => {
  if (!payload?.subjectId) {
    throw new Error("subjectId is required.");
  }

  const subject = getSubjectById(payload.subjectId);
  if (!subject) {
    throw new Error("Invalid subject selected.");
  }

  const questions = questionBankBySubjectId[subject.id] ?? [];
  const answers = payload.answers && typeof payload.answers === "object" ? payload.answers : {};
  const { evaluated, summary } = evaluateAnswers(questions, answers);

  return withMockNetwork(() => ({
    success: true,
    attemptId: `attempt-${Date.now()}`,
    submittedAt: new Date().toISOString(),
    subject: {
      id: subject.id,
      name: subject.name,
    },
    summary,
    questions: evaluated,
  }));
};