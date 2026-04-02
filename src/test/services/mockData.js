const OPTION_IDS = ["a", "b", "c", "d"];

const SUBJECTS = [
  {
    id: "advanced-accounting",
    name: "Advanced Accounting",
    shortCode: "ACC",
    description:
      "Accounting standards, consolidations, and final accounts for CA exam depth.",
  },
  {
    id: "corporate-law",
    name: "Corporate & Other Laws",
    shortCode: "LAW",
    description:
      "Company law provisions, compliance procedures, and governance concepts.",
  },
  {
    id: "taxation",
    name: "Taxation",
    shortCode: "TAX",
    description:
      "Direct tax computation, GST concepts, and practical return treatment.",
  },
];

const CHAPTERS_BY_SUBJECT = {
  "advanced-accounting": [
    {
      id: "as-framework",
      name: "Accounting Standards Framework",
      summary: "Recognition, measurement, and disclosure principles.",
    },
    {
      id: "consolidated-fs",
      name: "Consolidated Financial Statements",
      summary: "Control, NCI, goodwill, and group-level adjustments.",
    },
    {
      id: "amalgamation",
      name: "Amalgamation & Reconstruction",
      summary: "Purchase method, pooling of interests, and reserve treatment.",
    },
  ],
  "corporate-law": [
    {
      id: "companies-act-basics",
      name: "Companies Act Fundamentals",
      summary: "Incorporation, memoranda, and core compliance timelines.",
    },
    {
      id: "directors-management",
      name: "Directors & Management",
      summary: "Board powers, duties, and managerial appointment rules.",
    },
    {
      id: "meetings-resolutions",
      name: "Meetings & Resolutions",
      summary: "Notice requirements, quorum, and voting structures.",
    },
  ],
  taxation: [
    {
      id: "income-tax-basics",
      name: "Income Tax Basics",
      summary: "Residential status, heads of income, and deductions.",
    },
    {
      id: "salary-house-property",
      name: "Salary & House Property",
      summary: "Computation flows, exemptions, and set-off treatment.",
    },
    {
      id: "gst-input-tax-credit",
      name: "GST Input Tax Credit",
      summary: "Eligibility, reversals, and blocked credit provisions.",
    },
  ],
};

const DIFFICULTY_LEVELS = [
  {
    id: "easy",
    label: "Easy",
    colorToken: "easy",
    questionCount: 25,
    durationSeconds: 18 * 60,
    detail: "Core conceptual questions with direct application.",
  },
  {
    id: "medium",
    label: "Medium",
    colorToken: "medium",
    questionCount: 30,
    durationSeconds: 24 * 60,
    detail: "Scenario-based and mixed conceptual-computation set.",
  },
  {
    id: "hard",
    label: "Hard",
    colorToken: "hard",
    questionCount: 35,
    durationSeconds: 30 * 60,
    detail: "Exam-level integrated problems and edge case treatment.",
  },
];

const QUESTION_STEMS = {
  "advanced-accounting": [
    "Under the applicable accounting standard, how should the item be recognized in the books?",
    "Which adjustment is most appropriate while preparing final accounts for the reporting period?",
    "Which treatment best aligns with disclosure requirements for this scenario?",
    "How should this transaction be presented in financial statements for compliance?",
  ],
  "corporate-law": [
    "Under the Companies Act framework, which procedural step is mandatory in this situation?",
    "Which option correctly states the legal compliance requirement for the company?",
    "What is the most accurate interpretation of the governance rule in this context?",
    "Which action keeps the board in compliance with statutory obligations?",
  ],
  taxation: [
    "For this tax profile, which computation treatment is correct as per current provisions?",
    "Which option correctly reflects allowable deduction treatment for the assessee?",
    "How should the tax liability be adjusted considering the given facts?",
    "Which GST implication is most appropriate in this practical transaction scenario?",
  ],
};

const CHAPTER_CONTEXT = {
  "as-framework": "AS framework",
  "consolidated-fs": "consolidated statements",
  amalgamation: "amalgamation accounting",
  "companies-act-basics": "company law compliance",
  "directors-management": "director responsibility",
  "meetings-resolutions": "meeting governance",
  "income-tax-basics": "income tax",
  "salary-house-property": "salary and house property",
  "gst-input-tax-credit": "GST ITC",
};

const DIFFICULTY_HINT = {
  easy: "Focus on first-principle interpretation.",
  medium: "Apply concept to scenario-level details.",
  hard: "Resolve competing provisions and edge cases.",
};

const getDistractors = (subjectName, chapterName) => [
  `Ignore the key ${chapterName} condition and apply a generic ${subjectName} treatment`,
  `Apply prior-year logic without this period's statutory threshold adjustment`,
  `Classify the item under an unrelated provision due to superficial keyword match`,
];

const makeQuestion = ({
  subject,
  chapter,
  difficulty,
  index,
}) => {
  const stemList = QUESTION_STEMS[subject.id];
  const stem = stemList[index % stemList.length];
  const chapterContext = CHAPTER_CONTEXT[chapter.id] || chapter.name;
  const distractors = getDistractors(subject.name, chapter.name);

  const options = [
    `${DIFFICULTY_HINT[difficulty.id]} Choose the compliant treatment for ${chapterContext}.`,
    ...distractors,
  ];

  const rotated = options.map((_, optionIndex) => options[(optionIndex + index) % options.length]);
  const actualCorrectText = options[0];
  const resolvedCorrectIndex = rotated.findIndex((item) => item === actualCorrectText);

  const questionId = `${subject.id}:${chapter.id}:${difficulty.id}:${index + 1}`;

  return {
    id: questionId,
    question: `${index + 1}. ${stem}`,
    options: OPTION_IDS.map((id, optionIndex) => ({
      id,
      text: rotated[optionIndex],
    })),
    correctAnswer: OPTION_IDS[resolvedCorrectIndex],
    explanation:
      index % 2 === 0
        ? `${chapter.name}: ${DIFFICULTY_HINT[difficulty.id]} The compliant option keeps all required conditions and avoids classification errors.`
        : "",
  };
};

const buildQuestionSet = ({ subject, chapter, difficulty }) => {
  const total = difficulty.questionCount;
  return Array.from({ length: total }, (_, index) =>
    makeQuestion({
      subject,
      chapter,
      difficulty,
      index,
    })
  );
};

export const mockCatalog = {
  subjects: SUBJECTS,
  chaptersBySubject: CHAPTERS_BY_SUBJECT,
  difficulties: DIFFICULTY_LEVELS,
};

export const getQuestionSet = ({ subjectId, chapterId, difficultyLevel }) => {
  const subject = SUBJECTS.find((item) => item.id === subjectId);
  const chapter = CHAPTERS_BY_SUBJECT[subjectId]?.find((item) => item.id === chapterId);
  const difficulty = DIFFICULTY_LEVELS.find((item) => item.id === difficultyLevel);

  if (!subject || !chapter || !difficulty) {
    return [];
  }

  return buildQuestionSet({ subject, chapter, difficulty });
};
