export const ATTEMPT_RECORD_SCHEMA = {
  attemptId: "mcq-attempt-17356608",
  userId: "stu-1001",
  subjectId: "taxation",
  chapterId: "gst-input-tax-credit",
  difficultyId: "medium",
  smartGoal: "exam-simulation",
  attemptMode: "exam",
  startedAt: "2026-03-30T09:00:00.000Z",
  submittedAt: "2026-03-30T09:36:10.000Z",
  durationSeconds: 2160,
  timeTakenSeconds: 2010,
  metrics: {
    totalQuestions: 30,
    attempted: 28,
    correct: 19,
    wrong: 9,
    notAnswered: 2,
    scorePercent: 63.33,
    accuracy: 67.86,
  },
};

export const QUESTION_ANALYTICS_SCHEMA = {
  questionId: "taxation:gst-input-tax-credit:medium:1",
  subjectId: "taxation",
  chapterId: "gst-input-tax-credit",
  totalAttempts: 45,
  correctAttempts: 22,
  wrongAttempts: 23,
  averageTimeSeconds: 58.4,
  isBookmarked: true,
  isLearned: false,
  note: "Recheck blocked credit exceptions",
  lastAttemptMode: "revision",
  lastAttemptedAt: "2026-03-30T09:36:10.000Z",
};

export const STUDENT_PROFILE_SCHEMA = {
  userId: "stu-1001",
  name: "Aarav Sharma",
  email: "aarav.sharma@example.com",
  avatarUrl: "https://api.dicebear.com/9.x/thumbs/svg?seed=aarav",
  emailLocked: true,
  updatedAt: "2026-03-30T10:12:00.000Z",
};

export const PERFORMANCE_SNAPSHOT_SCHEMA = {
  userId: "stu-1001",
  generatedAt: "2026-03-30T10:00:00.000Z",
  totals: {
    totalAttempts: 27,
    averageScore: 68.2,
    averageAccuracy: 71.4,
    averageTimePerQuestion: 53.1,
  },
  streakDays: 4,
  xp: {
    totalXp: 3520,
    level: 5,
    currentLevelProgress: 320,
    nextLevelXp: 800,
  },
  weakTopics: [
    {
      key: "taxation::gst-input-tax-credit",
      subjectId: "taxation",
      chapterId: "gst-input-tax-credit",
      subjectName: "Taxation",
      chapterName: "GST Input Tax Credit",
      attempts: 6,
      accuracy: 49.3,
      avgTimePerQuestion: 72.1,
      suggestedMode: "revision",
      suggestedDifficulty: "easy",
    },
  ],
};

export const FUTURE_DB_TABLE_HINTS = {
  attemptsTable: "attempts(id, user_id, subject_id, chapter_id, difficulty_id, smart_goal, mode, started_at, submitted_at, duration_seconds, time_taken_seconds, metrics_json)",
  answersTable: "attempt_answers(id, attempt_id, question_id, selected_option_id, is_correct, time_spent_seconds, bookmarked, note)",
  userStatsTable: "user_performance_snapshots(id, user_id, generated_at, totals_json, weak_topics_json, xp_json)",
  topicStatsTable: "topic_performance(id, subject_id, chapter_id, attempts, avg_accuracy, avg_time_per_question)",
  studentProfilesTable: "student_profiles(id, user_id, name, email, avatar_url, email_locked, updated_at)",
  questionStudyStateTable: "question_study_state(id, user_id, question_id, subject_id, chapter_id, bookmarked, learned, note, updated_at)",
};
