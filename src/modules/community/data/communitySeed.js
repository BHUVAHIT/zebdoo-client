import {
  ANNOUNCEMENT_PRIORITIES,
  ANNOUNCEMENT_STATUS,
  REPORT_STATUS,
} from "../constants/community.constants";

const now = Date.now();

const isoOffset = (minutes) => new Date(now + minutes * 60 * 1000).toISOString();

export const createCommunitySeed = () => ({
  announcements: [
    {
      id: "ann-1001",
      title: "April Revision Sprint Starts Tomorrow",
      bodyRichText:
        "**Plan update:** Daily sprint starts at 7:00 PM.\n\n- Topic recap in first 20 mins\n- Live doubt window in last 15 mins\n\n[View timetable](https://example.edu/revision)",
      priority: ANNOUNCEMENT_PRIORITIES.IMPORTANT,
      status: ANNOUNCEMENT_STATUS.PUBLISHED,
      scheduledFor: null,
      publishedAt: isoOffset(-720),
      createdBy: {
        id: "user-super-admin-1",
        name: "Super Admin",
        role: "SUPER_ADMIN",
      },
      targetAudience: "ALL",
      meta: {
        viewsCount: 14,
      },
      createdAt: isoOffset(-760),
      updatedAt: isoOffset(-730),
    },
    {
      id: "ann-1002",
      title: "Mock Test Marathon: Sunday",
      bodyRichText:
        "Join the **Mock Marathon** this Sunday.\n\n- 3 sectional tests\n- 1 grand analysis session\n\nBring your calculator and notes.",
      priority: ANNOUNCEMENT_PRIORITIES.EVENT,
      status: ANNOUNCEMENT_STATUS.PUBLISHED,
      scheduledFor: null,
      publishedAt: isoOffset(-210),
      createdBy: {
        id: "user-super-admin-1",
        name: "Super Admin",
        role: "SUPER_ADMIN",
      },
      targetAudience: "ALL",
      meta: {
        viewsCount: 9,
      },
      createdAt: isoOffset(-240),
      updatedAt: isoOffset(-210),
    },
    {
      id: "ann-1003",
      title: "Career Guidance AMA",
      bodyRichText:
        "Career mentors will be live in the community.\n\n- Resume quick-check\n- Articlehip tips\n- Interview Q&A",
      priority: ANNOUNCEMENT_PRIORITIES.UPDATE,
      status: ANNOUNCEMENT_STATUS.SCHEDULED,
      scheduledFor: isoOffset(480),
      publishedAt: null,
      createdBy: {
        id: "user-super-admin-1",
        name: "Super Admin",
        role: "SUPER_ADMIN",
      },
      targetAudience: "ALL",
      meta: {
        viewsCount: 0,
      },
      createdAt: isoOffset(-90),
      updatedAt: isoOffset(-90),
    },
  ],
  announcementReads: [
    {
      id: "read-9001",
      announcementId: "ann-1001",
      userId: "seed-student-2",
      readAt: isoOffset(-700),
    },
  ],
  channels: [
    {
      id: "channel-math",
      slug: "math",
      name: "math",
      category: "Concept Labs",
      memberCount: 278,
      description: "Numerical techniques, speed maths, and problem-solving patterns.",
      isEnabled: true,
      isReadOnly: false,
      sortOrder: 1,
      createdAt: isoOffset(-8000),
    },
    {
      id: "channel-coding",
      slug: "coding",
      name: "coding",
      category: "Concept Labs",
      memberCount: 431,
      description: "Programming logic, snippets, debugging, and implementation support.",
      isEnabled: true,
      isReadOnly: false,
      sortOrder: 2,
      createdAt: isoOffset(-8000),
    },
    {
      id: "channel-career",
      slug: "career",
      name: "career",
      category: "Guidance Hub",
      memberCount: 185,
      description: "Career discussions, interviews, internships, and growth planning.",
      isEnabled: true,
      isReadOnly: false,
      sortOrder: 3,
      createdAt: isoOffset(-8000),
    },
    {
      id: "channel-exams",
      slug: "exams",
      name: "exams",
      category: "Exam Ops",
      memberCount: 362,
      description: "Exam strategy, planning, and paper analysis.",
      isEnabled: true,
      isReadOnly: false,
      sortOrder: 4,
      createdAt: isoOffset(-8000),
    },
  ],
  messages: [
    {
      id: "msg-2001",
      channelId: "channel-coding",
      author: {
        id: "seed-student-1",
        name: "Aarav Sharma",
        role: "STUDENT",
      },
      bodyMarkdown:
        "How do I optimize this loop for large arrays?\n\n```js\nfor (let i = 0; i < arr.length; i += 1) {\n  // process\n}\n```",
      createdAt: isoOffset(-180),
      updatedAt: null,
      isHidden: false,
      helpfulCount: 2,
      parentMessageId: null,
      threadLocked: false,
      tags: ["optimization", "javascript", "debugging"],
    },
    {
      id: "msg-2002",
      channelId: "channel-coding",
      author: {
        id: "seed-student-2",
        name: "Siya Patel",
        role: "STUDENT",
      },
      bodyMarkdown:
        "Try caching `arr.length` and avoid heavy logic inside the loop body. Also benchmark with realistic data.",
      createdAt: isoOffset(-170),
      updatedAt: null,
      isHidden: false,
      helpfulCount: 1,
      parentMessageId: "msg-2001",
      threadLocked: false,
      tags: ["optimization", "benchmark"],
    },
    {
      id: "msg-2003",
      channelId: "channel-math",
      author: {
        id: "seed-student-3",
        name: "Karan Mehta",
        role: "STUDENT",
      },
      bodyMarkdown: "Any quick trick for ratio simplification in timed tests?",
      createdAt: isoOffset(-120),
      updatedAt: null,
      isHidden: false,
      helpfulCount: 0,
      parentMessageId: null,
      threadLocked: false,
      tags: ["ratio", "speed-math"],
    },
  ],
  messageReactions: [
    {
      id: "react-3001",
      messageId: "msg-2001",
      emoji: "🔥",
      userId: "seed-student-2",
      reactedAt: isoOffset(-175),
    },
    {
      id: "react-3002",
      messageId: "msg-2002",
      emoji: "👍",
      userId: "seed-student-1",
      reactedAt: isoOffset(-165),
    },
  ],
  messageHelpfulVotes: [
    {
      id: "help-4001",
      messageId: "msg-2001",
      userId: "seed-student-2",
      createdAt: isoOffset(-175),
    },
    {
      id: "help-4002",
      messageId: "msg-2001",
      userId: "seed-student-3",
      createdAt: isoOffset(-172),
    },
    {
      id: "help-4003",
      messageId: "msg-2002",
      userId: "seed-student-1",
      createdAt: isoOffset(-165),
    },
  ],
  messageReports: [
    {
      id: "rep-5001",
      messageId: "msg-2003",
      reporterId: "seed-student-2",
      reason: "Potentially unclear/off-topic phrasing.",
      status: REPORT_STATUS.OPEN,
      createdAt: isoOffset(-95),
      resolvedAt: null,
      resolvedBy: null,
    },
  ],
  savedMessages: [
    {
      id: "bookmark-7001",
      messageId: "msg-2001",
      userId: "seed-student-3",
      createdAt: isoOffset(-130),
    },
  ],
  userModeration: {
    warnings: [],
    bans: [],
  },
  moderationConfig: {
    wordFilterEnabled: false,
    blockedWordsPlaceholder: ["placeholder"],
  },
});
