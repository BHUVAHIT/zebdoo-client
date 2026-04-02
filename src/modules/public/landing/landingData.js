export const landingStats = [
  { id: "students", value: "12k+", label: "Active CA aspirants" },
  { id: "questions", value: "45k+", label: "MCQs with explanations" },
  { id: "accuracy", value: "92%", label: "Student satisfaction" },
];

export const featureItems = [
  {
    id: "subjects",
    title: "Subject-wise Learning",
    description:
      "Start with the exact CA subjects you need and build depth with focused, exam-aligned modules.",
    icon: "book",
  },
  {
    id: "chapters",
    title: "Chapter-wise Preparation",
    description:
      "Break large portions into chapter tracks so revision feels structured, measurable, and stress free.",
    icon: "layers",
  },
  {
    id: "papers",
    title: "Previous Year Papers",
    description:
      "Practice real historical paper patterns and understand what the examiner repeatedly tests.",
    icon: "document",
  },
  {
    id: "mcq",
    title: "MCQ Practice by Difficulty",
    description:
      "Switch between Easy, Medium, and Hard rounds to sharpen fundamentals and advance to exam speed.",
    icon: "target",
  },
  {
    id: "solutions",
    title: "Detailed Solutions",
    description:
      "Review answer-by-answer logic with concise explanations that improve retention and confidence.",
    icon: "check",
  },
];

export const workflowSteps = [
  {
    id: "step-1",
    title: "Select Subject",
    description: "Choose the CA subject you want to master today.",
  },
  {
    id: "step-2",
    title: "Choose Chapter",
    description: "Pick a chapter and focus your study session with precision.",
  },
  {
    id: "step-3",
    title: "Pick Difficulty",
    description: "Start easy or challenge yourself with medium and hard test sets.",
  },
  {
    id: "step-4",
    title: "Start Practice",
    description: "Attempt MCQs, get instant feedback, and improve with explanations.",
  },
];

export const benefits = [
  "Save hours every week with guided preparation paths.",
  "Focus on exam-relevant problems instead of random practice.",
  "Train with real CA exam style and scoring pressure.",
  "Track consistency with repeatable daily practice routines.",
];

export const testimonialItems = [
  {
    id: "t-1",
    quote:
      "Zebdoo made revision predictable. I knew exactly what to practice every day before my CA test.",
    name: "Ananya Shah",
    meta: "CA Inter Student",
  },
  {
    id: "t-2",
    quote:
      "Difficulty-based MCQs helped me move from concept confusion to confidence in just a few weeks.",
    name: "Vaibhav Mandviya",
    meta: "CA Foundation Aspirant",
  },
  {
    id: "t-3",
    quote:
      "The chapter-wise flow and explanations are far better than scattered practice PDFs.",
    name: "JB Bhai",
    meta: "CA Final Candidate",
  },
];

export const subjectPreview = [
  { code: "ACC", name: "Accounting", progress: 72 },
  { code: "LAW", name: "Business Laws", progress: 54 },
  { code: "TAX", name: "Taxation", progress: 63 },
  { code: "CMA", name: "Cost & Management", progress: 48 },
];

export const testPreview = {
  title: "Taxation - GST Basics",
  difficulty: "Medium",
  question: "Input Tax Credit can be claimed only when which condition is satisfied?",
  options: [
    "Supplier has filed return and tax invoice is available",
    "Goods are purchased from any unregistered dealer",
    "Payment is made in cash mode only",
    "The invoice amount exceeds INR 50,000",
  ],
  activeOption: 0,
  timer: "18:24",
  totalQuestions: 30,
  currentQuestion: 12,
};
