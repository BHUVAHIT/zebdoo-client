import { createPagedResult, withMockLatency, ApiError } from "../../../services/apiClient";
import { loadFromStorage, saveToStorage } from "../../../utils/helpers";
import {
  ANNOUNCEMENT_PRIORITIES,
  ANNOUNCEMENT_STATUS,
  COMMUNITY_EMOJIS,
  COMMUNITY_STORAGE_KEY,
  MEMBER_MODERATION_STATUS,
  REPORT_STATUS,
} from "../constants/community.constants";
import { createCommunitySeed } from "../data/communitySeed";

const DEFAULT_PAGE_SIZE = 12;

const isSuperAdmin = (actor) => String(actor?.role || "").toUpperCase() === "SUPER_ADMIN";

const asActor = (actor) => ({
  id: String(actor?.id || actor?.email || "anonymous"),
  name: String(actor?.name || "Unknown User").trim() || "Unknown User",
  role: String(actor?.role || "STUDENT").toUpperCase(),
});

const normalizeText = (value) => String(value || "").trim();
const safeArray = (value) => (Array.isArray(value) ? value : []);

const nextId = (prefix) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

const readDb = () => {
  const existing = loadFromStorage(COMMUNITY_STORAGE_KEY, null);
  if (!existing || typeof existing !== "object") {
    const seed = createCommunitySeed();
    saveToStorage(COMMUNITY_STORAGE_KEY, seed);
    return seed;
  }

  return {
    announcements: safeArray(existing.announcements),
    announcementReads: safeArray(existing.announcementReads),
    channels: safeArray(existing.channels),
    messages: safeArray(existing.messages),
    messageReactions: safeArray(existing.messageReactions),
    messageHelpfulVotes: safeArray(existing.messageHelpfulVotes),
    messageReports: safeArray(existing.messageReports),
    savedMessages: safeArray(existing.savedMessages),
    userModeration: {
      warnings: safeArray(existing?.userModeration?.warnings),
      bans: safeArray(existing?.userModeration?.bans),
    },
    moderationConfig: {
      wordFilterEnabled: Boolean(existing?.moderationConfig?.wordFilterEnabled),
      blockedWordsPlaceholder: safeArray(existing?.moderationConfig?.blockedWordsPlaceholder),
    },
  };
};

const writeDb = (db) => {
  saveToStorage(COMMUNITY_STORAGE_KEY, db);
};

const withDbMutation = async (mutator) =>
  withMockLatency(() => {
    const db = readDb();
    const result = mutator(db);
    writeDb(db);
    return result;
  });

const withDbRead = async (resolver) =>
  withMockLatency(() => {
    const db = readDb();
    return resolver(db);
  });

const normalizePriority = (priority) => {
  const normalized = String(priority || "").toUpperCase();
  if (Object.values(ANNOUNCEMENT_PRIORITIES).includes(normalized)) {
    return normalized;
  }

  return ANNOUNCEMENT_PRIORITIES.GENERAL;
};

const normalizeAnnouncementStatus = (status) => {
  const normalized = String(status || "").toUpperCase();
  if (Object.values(ANNOUNCEMENT_STATUS).includes(normalized)) {
    return normalized;
  }

  return ANNOUNCEMENT_STATUS.PUBLISHED;
};

const toTimestamp = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

const assertSuperAdmin = (actor) => {
  if (!isSuperAdmin(actor)) {
    throw new ApiError("Only super admins can perform this action.", 403, "FORBIDDEN");
  }
};

const normalizeTags = (tags) =>
  safeArray(tags)
    .map((tag) => normalizeText(tag).toLowerCase())
    .filter(Boolean)
    .slice(0, 5);

const normalizeBlockedWords = (words) =>
  safeArray(words)
    .map((word) => normalizeText(word).toLowerCase())
    .filter(Boolean)
    .slice(0, 40);

const getCurrentBan = (db, userId) =>
  db.userModeration.bans.find((ban) => String(ban.userId) === String(userId) && ban.isActive);

const getWarningCount = (db, userId) =>
  db.userModeration.warnings.filter((warning) => String(warning.userId) === String(userId)).length;

const getModerationStatus = (db, userId) => {
  if (getCurrentBan(db, userId)) return MEMBER_MODERATION_STATUS.BANNED;
  if (getWarningCount(db, userId) > 0) return MEMBER_MODERATION_STATUS.WARNED;
  return MEMBER_MODERATION_STATUS.CLEAN;
};

const getBookmarkLookup = (db, actorId) => {
  const rows = db.savedMessages.filter((row) => String(row.userId) === String(actorId));
  return rows.reduce((acc, row) => {
    acc[row.messageId] = row;
    return acc;
  }, {});
};

const extractHashtags = (text) => {
  const matches = String(text || "").match(/#([a-zA-Z0-9_-]+)/g) || [];
  return matches.map((token) => token.replace("#", "").toLowerCase());
};

const buildFeedInsights = (db) => {
  const activeUsers = Array.from(
    db.messages.reduce((acc, message) => {
      if (message.isHidden) return acc;

      const item = acc.get(message.author.id) || {
        userId: message.author.id,
        name: message.author.name,
        postsCount: 0,
        lastPostedAt: message.createdAt,
      };

      item.postsCount += 1;
      if (new Date(message.createdAt).getTime() > new Date(item.lastPostedAt).getTime()) {
        item.lastPostedAt = message.createdAt;
      }

      acc.set(message.author.id, item);
      return acc;
    }, new Map()).values()
  )
    .sort((a, b) => new Date(b.lastPostedAt).getTime() - new Date(a.lastPostedAt).getTime());

  const topicCounts = db.messages.reduce((acc, message) => {
    const tags = normalizeTags(message.tags);
    const inferred = extractHashtags(message.bodyMarkdown);
    [...tags, ...inferred].forEach((topic) => {
      acc[topic] = (acc[topic] || 0) + 1;
    });
    return acc;
  }, {});

  const trendingTopics = Object.entries(topicCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([topic, count]) => ({ topic, count }));

  return {
    activeUsers,
    trendingTopics,
  };
};

const paginateRows = ({ rows, page, pageSize }) => {
  const safePage = Math.max(Number(page) || 1, 1);
  const safePageSize = Math.max(Number(pageSize) || DEFAULT_PAGE_SIZE, 1);
  const offset = (safePage - 1) * safePageSize;
  const items = rows.slice(offset, offset + safePageSize);

  return createPagedResult({
    items,
    page: safePage,
    pageSize: safePageSize,
    total: rows.length,
  });
};

const publishDueAnnouncements = (db) => {
  const now = Date.now();
  let changed = false;

  db.announcements = db.announcements.map((announcement) => {
    if (announcement.status !== ANNOUNCEMENT_STATUS.SCHEDULED || !announcement.scheduledFor) {
      return announcement;
    }

    if (new Date(announcement.scheduledFor).getTime() > now) {
      return announcement;
    }

    changed = true;
    return {
      ...announcement,
      status: ANNOUNCEMENT_STATUS.PUBLISHED,
      publishedAt: announcement.publishedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });

  return changed;
};

const getReactionsByMessage = (db, actorId) =>
  db.messageReactions.reduce((acc, reaction) => {
    if (!acc[reaction.messageId]) {
      acc[reaction.messageId] = {};
    }

    if (!acc[reaction.messageId][reaction.emoji]) {
      acc[reaction.messageId][reaction.emoji] = {
        emoji: reaction.emoji,
        count: 0,
        reactedByCurrentUser: false,
      };
    }

    const bucket = acc[reaction.messageId][reaction.emoji];
    bucket.count += 1;
    if (String(reaction.userId) === String(actorId)) {
      bucket.reactedByCurrentUser = true;
    }

    return acc;
  }, {});

const getHelpfulVoteLookup = (db, actorId) =>
  db.messageHelpfulVotes.reduce((acc, vote) => {
    if (!acc[vote.messageId]) {
      acc[vote.messageId] = { count: 0, hasVoted: false };
    }

    acc[vote.messageId].count += 1;
    if (String(vote.userId) === String(actorId)) {
      acc[vote.messageId].hasVoted = true;
    }

    return acc;
  }, {});

const resolveMessageTree = (messages) => {
  const messageMap = messages.reduce((acc, message) => {
    acc[message.id] = {
      ...message,
      replies: [],
    };
    return acc;
  }, {});

  const roots = [];

  messages.forEach((message) => {
    const current = messageMap[message.id];
    if (message.parentMessageId && messageMap[message.parentMessageId]) {
      messageMap[message.parentMessageId].replies.push(current);
      return;
    }

    roots.push(current);
  });

  return roots;
};

const buildTopContributors = (db, { windowDays = 7, limit = 5 } = {}) => {
  const fromTs = Date.now() - Math.max(windowDays, 1) * 24 * 60 * 60 * 1000;
  const relevantMessages = db.messages.filter(
    (message) => !message.isHidden && new Date(message.createdAt).getTime() >= fromTs
  );

  const helpfulByMessage = db.messageHelpfulVotes.reduce((acc, vote) => {
    acc[vote.messageId] = (acc[vote.messageId] || 0) + 1;
    return acc;
  }, {});

  const reactionsByMessage = db.messageReactions.reduce((acc, reaction) => {
    acc[reaction.messageId] = (acc[reaction.messageId] || 0) + 1;
    return acc;
  }, {});

  const scoreByUser = relevantMessages.reduce((acc, message) => {
    const userId = message.author.id;
    if (!acc[userId]) {
      acc[userId] = {
        userId,
        name: message.author.name,
        messagesLast7Days: 0,
        helpfulScore: 0,
        reactionScore: 0,
        totalScore: 0,
      };
    }

    const helpfulScore = helpfulByMessage[message.id] || 0;
    const reactionScore = reactionsByMessage[message.id] || 0;

    acc[userId].messagesLast7Days += 1;
    acc[userId].helpfulScore += helpfulScore;
    acc[userId].reactionScore += reactionScore;
    acc[userId].totalScore += 3 + helpfulScore * 4 + reactionScore * 2;

    return acc;
  }, {});

  return Object.values(scoreByUser)
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, limit)
    .map((item, index) => ({
      ...item,
      rank: index + 1,
    }));
};

const normalizeAnnouncementInput = (input) => {
  const title = normalizeText(input?.title);
  const bodyRichText = normalizeText(input?.bodyRichText);

  if (title.length < 6) {
    throw new ApiError("Announcement title must be at least 6 characters.", 400, "INVALID_TITLE");
  }

  if (bodyRichText.length < 12) {
    throw new ApiError(
      "Announcement content must be at least 12 characters.",
      400,
      "INVALID_BODY"
    );
  }

  const scheduledFor = toTimestamp(input?.scheduledFor);
  const nowIso = new Date().toISOString();
  const status =
    scheduledFor && new Date(scheduledFor).getTime() > Date.now()
      ? ANNOUNCEMENT_STATUS.SCHEDULED
      : normalizeAnnouncementStatus(input?.status);

  return {
    title,
    bodyRichText,
    priority: normalizePriority(input?.priority),
    targetAudience: normalizeText(input?.targetAudience || "ALL") || "ALL",
    scheduledFor,
    status,
    publishedAt:
      status === ANNOUNCEMENT_STATUS.PUBLISHED
        ? toTimestamp(input?.publishedAt) || nowIso
        : null,
  };
};

const getChannelOrThrow = (db, channelId) => {
  const channel = db.channels.find((item) => item.id === channelId);
  if (!channel) {
    throw new ApiError("Channel not found.", 404, "CHANNEL_NOT_FOUND");
  }
  return channel;
};

const getMessageOrThrow = (db, messageId) => {
  const message = db.messages.find((item) => item.id === messageId);
  if (!message) {
    throw new ApiError("Message not found.", 404, "MESSAGE_NOT_FOUND");
  }
  return message;
};

const ensureMessageAllowed = ({ actor, channel, parentMessage }) => {
  if (!channel.isEnabled && !isSuperAdmin(actor)) {
    throw new ApiError("This channel is disabled by an admin.", 403, "CHANNEL_DISABLED");
  }

  if (channel.isReadOnly && !isSuperAdmin(actor)) {
    throw new ApiError("This channel is read-only right now.", 403, "CHANNEL_READ_ONLY");
  }

  if (parentMessage?.threadLocked && !isSuperAdmin(actor)) {
    throw new ApiError("This thread is locked by an admin.", 403, "THREAD_LOCKED");
  }
};

export const communityService = {
  bootstrap: async ({ actor }) =>
    withDbRead((db) => {
      const actorData = asActor(actor);
      const changed = publishDueAnnouncements(db);
      if (changed) writeDb(db);

      const channels = db.channels
        .filter((channel) => (isSuperAdmin(actorData) ? true : channel.isEnabled))
        .sort((a, b) => a.sortOrder - b.sortOrder);

      const announcements = db.announcements
        .filter((item) => {
          if (isSuperAdmin(actorData)) return true;
          return item.status === ANNOUNCEMENT_STATUS.PUBLISHED;
        })
        .sort((a, b) => {
          const left = new Date(b.publishedAt || b.scheduledFor || b.createdAt).getTime();
          const right = new Date(a.publishedAt || a.scheduledFor || a.createdAt).getTime();
          return left - right;
        });

      const readLookup = db.announcementReads.reduce((acc, readItem) => {
        if (String(readItem.userId) === actorData.id) {
          acc[readItem.announcementId] = readItem.readAt;
        }
        return acc;
      }, {});

      const enrichedAnnouncements = announcements.map((announcement) => ({
        ...announcement,
        readAt: readLookup[announcement.id] || null,
        isRead: Boolean(readLookup[announcement.id]),
      }));

      const insights = buildFeedInsights(db);
      const bookmarkLookup = getBookmarkLookup(db, actorData.id);

      return {
        announcements: enrichedAnnouncements,
        channels,
        topContributors: buildTopContributors(db),
        activeUsers: insights.activeUsers,
        trendingTopics: insights.trendingTopics,
        announcementPreview: enrichedAnnouncements.slice(0, 4),
        bookmarkedMessageIds: Object.keys(bookmarkLookup),
        moderationConfig: db.moderationConfig,
        actorModerationStatus: getModerationStatus(db, actorData.id),
        observability: {
          eventHooks: [
            "community.message.created",
            "community.message.reported",
            "community.announcement.viewed",
            "community.channel.toggled",
            "community.thread.locked",
          ],
        },
      };
    }),

  listAnnouncements: async ({ actor, query = {} }) =>
    withDbRead((db) => {
      const actorData = asActor(actor);
      const statusFilter = normalizeText(query.status).toUpperCase();
      const priorityFilter = normalizeText(query.priority).toUpperCase();
      const page = Math.max(Number(query.page) || 1, 1);
      const pageSize = Math.max(Number(query.pageSize) || DEFAULT_PAGE_SIZE, 1);

      publishDueAnnouncements(db);

      const readsByActor = db.announcementReads.reduce((acc, item) => {
        if (String(item.userId) === actorData.id) {
          acc[item.announcementId] = item.readAt;
        }
        return acc;
      }, {});

      const rows = db.announcements
        .filter((announcement) => {
          if (!isSuperAdmin(actorData) && announcement.status !== ANNOUNCEMENT_STATUS.PUBLISHED) {
            return false;
          }

          if (statusFilter && announcement.status !== statusFilter) {
            return false;
          }

          if (priorityFilter && announcement.priority !== priorityFilter) {
            return false;
          }

          return true;
        })
        .sort((a, b) => {
          const left = new Date(b.publishedAt || b.scheduledFor || b.createdAt).getTime();
          const right = new Date(a.publishedAt || a.scheduledFor || a.createdAt).getTime();
          return left - right;
        })
        .map((item) => ({
          ...item,
          readAt: readsByActor[item.id] || null,
          isRead: Boolean(readsByActor[item.id]),
        }));

      return paginateRows({ rows, page, pageSize });
    }),

  createAnnouncement: async ({ actor, payload }) =>
    withDbMutation((db) => {
      const actorData = asActor(actor);
      assertSuperAdmin(actorData);

      const normalized = normalizeAnnouncementInput(payload);
      const nowIso = new Date().toISOString();

      const created = {
        id: nextId("ann"),
        ...normalized,
        createdBy: actorData,
        meta: {
          viewsCount: 0,
        },
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      db.announcements.unshift(created);
      return created;
    }),

  updateAnnouncement: async ({ actor, announcementId, payload }) =>
    withDbMutation((db) => {
      const actorData = asActor(actor);
      assertSuperAdmin(actorData);

      const index = db.announcements.findIndex((item) => item.id === announcementId);
      if (index < 0) {
        throw new ApiError("Announcement not found.", 404, "ANNOUNCEMENT_NOT_FOUND");
      }

      const normalized = normalizeAnnouncementInput(payload);
      const current = db.announcements[index];
      db.announcements[index] = {
        ...current,
        ...normalized,
        updatedAt: new Date().toISOString(),
      };

      return db.announcements[index];
    }),

  deleteAnnouncement: async ({ actor, announcementId }) =>
    withDbMutation((db) => {
      const actorData = asActor(actor);
      assertSuperAdmin(actorData);

      const initialLength = db.announcements.length;
      db.announcements = db.announcements.filter((item) => item.id !== announcementId);
      if (db.announcements.length === initialLength) {
        throw new ApiError("Announcement not found.", 404, "ANNOUNCEMENT_NOT_FOUND");
      }

      db.announcementReads = db.announcementReads.filter(
        (readItem) => readItem.announcementId !== announcementId
      );

      return { success: true };
    }),

  markAnnouncementRead: async ({ actor, announcementId }) =>
    withDbMutation((db) => {
      const actorData = asActor(actor);
      const announcement = db.announcements.find((item) => item.id === announcementId);
      if (!announcement) {
        throw new ApiError("Announcement not found.", 404, "ANNOUNCEMENT_NOT_FOUND");
      }

      const existing = db.announcementReads.find(
        (item) => item.announcementId === announcementId && String(item.userId) === actorData.id
      );

      if (!existing) {
        db.announcementReads.push({
          id: nextId("read"),
          announcementId,
          userId: actorData.id,
          readAt: new Date().toISOString(),
        });

        announcement.meta = announcement.meta || { viewsCount: 0 };
        announcement.meta.viewsCount = (announcement.meta.viewsCount || 0) + 1;
      }

      return { success: true };
    }),

  getAnnouncementAnalytics: async ({ actor, announcementId }) =>
    withDbRead((db) => {
      const actorData = asActor(actor);
      assertSuperAdmin(actorData);

      const announcement = db.announcements.find((item) => item.id === announcementId);
      if (!announcement) {
        throw new ApiError("Announcement not found.", 404, "ANNOUNCEMENT_NOT_FOUND");
      }

      const reads = db.announcementReads.filter((item) => item.announcementId === announcementId);

      return {
        announcementId,
        viewsCount: announcement?.meta?.viewsCount || 0,
        uniqueReaders: reads.length,
        lastReadAt: reads.length ? reads[reads.length - 1].readAt : null,
      };
    }),

  listChannels: async ({ actor }) =>
    withDbRead((db) => {
      const actorData = asActor(actor);
      const rows = db.channels
        .filter((channel) => (isSuperAdmin(actorData) ? true : channel.isEnabled))
        .sort((a, b) => a.sortOrder - b.sortOrder);

      return rows;
    }),

  updateChannel: async ({ actor, channelId, patch }) =>
    withDbMutation((db) => {
      const actorData = asActor(actor);
      assertSuperAdmin(actorData);

      const index = db.channels.findIndex((item) => item.id === channelId);
      if (index < 0) {
        throw new ApiError("Channel not found.", 404, "CHANNEL_NOT_FOUND");
      }

      db.channels[index] = {
        ...db.channels[index],
        isEnabled:
          typeof patch?.isEnabled === "boolean" ? patch.isEnabled : db.channels[index].isEnabled,
        isReadOnly:
          typeof patch?.isReadOnly === "boolean"
            ? patch.isReadOnly
            : db.channels[index].isReadOnly,
      };

      return db.channels[index];
    }),

  listChannelMessages: async ({ actor, channelId }) =>
    withDbRead((db) => {
      const actorData = asActor(actor);
      const channel = getChannelOrThrow(db, channelId);
      if (!channel.isEnabled && !isSuperAdmin(actorData)) {
        throw new ApiError("Channel is currently disabled.", 403, "CHANNEL_DISABLED");
      }

      const actorId = actorData.id;
      const reactionLookup = getReactionsByMessage(db, actorId);
      const helpfulLookup = getHelpfulVoteLookup(db, actorId);
      const bookmarkLookup = getBookmarkLookup(db, actorId);

      const rows = db.messages
        .filter((message) => message.channelId === channelId)
        .filter((message) => (isSuperAdmin(actorData) ? true : !message.isHidden))
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        .map((message) => ({
          ...message,
          tags: normalizeTags(message.tags),
          reactions: Object.values(reactionLookup[message.id] || {}),
          reportsOpenCount: db.messageReports.filter(
            (report) => report.messageId === message.id && report.status === REPORT_STATUS.OPEN
          ).length,
          helpfulCount: helpfulLookup[message.id]?.count || message.helpfulCount || 0,
          markedHelpfulByCurrentUser: Boolean(helpfulLookup[message.id]?.hasVoted),
          isBookmarkedByCurrentUser: Boolean(bookmarkLookup[message.id]),
          authorModerationStatus: getModerationStatus(db, message.author.id),
          authorWarnings: getWarningCount(db, message.author.id),
        }));

      return {
        channel,
        messages: resolveMessageTree(rows),
      };
    }),

  createMessage: async ({ actor, channelId, payload }) =>
    withDbMutation((db) => {
      const actorData = asActor(actor);
      const channel = getChannelOrThrow(db, channelId);
      const bodyMarkdown = normalizeText(payload?.bodyMarkdown);
      const parentMessageId = normalizeText(payload?.parentMessageId) || null;
      const tags = normalizeTags(payload?.tags);

      if (getCurrentBan(db, actorData.id) && !isSuperAdmin(actorData)) {
        throw new ApiError(
          "Your account is temporarily restricted from posting. Contact support.",
          403,
          "ACCOUNT_RESTRICTED"
        );
      }

      if (bodyMarkdown.length < 2) {
        throw new ApiError("Message must be at least 2 characters.", 400, "INVALID_MESSAGE");
      }

      if (bodyMarkdown.length > 2500) {
        throw new ApiError("Message is too long.", 400, "MESSAGE_TOO_LONG");
      }

      const parentMessage = parentMessageId ? getMessageOrThrow(db, parentMessageId) : null;
      ensureMessageAllowed({ actor: actorData, channel, parentMessage });

      if (db.moderationConfig.wordFilterEnabled) {
        const blockedWords = normalizeBlockedWords(db.moderationConfig.blockedWordsPlaceholder);
        const lowered = bodyMarkdown.toLowerCase();
        const matched = blockedWords.filter((word) => lowered.includes(word));
        if (matched.length) {
          throw new ApiError(
            `Message contains blocked terms: ${matched.slice(0, 3).join(", ")}`,
            400,
            "BLOCKED_CONTENT"
          );
        }
      }

      if (parentMessage && parentMessage.channelId !== channelId) {
        throw new ApiError(
          "Reply must belong to the same channel.",
          400,
          "INVALID_PARENT_CHANNEL"
        );
      }

      const created = {
        id: nextId("msg"),
        channelId,
        author: actorData,
        bodyMarkdown,
        createdAt: new Date().toISOString(),
        updatedAt: null,
        isHidden: false,
        helpfulCount: 0,
        parentMessageId,
        threadLocked: false,
        tags,
      };

      db.messages.push(created);
      return created;
    }),

  toggleReaction: async ({ actor, messageId, emoji }) =>
    withDbMutation((db) => {
      const actorData = asActor(actor);
      const message = getMessageOrThrow(db, messageId);

      if (message.isHidden && !isSuperAdmin(actorData)) {
        throw new ApiError("You cannot react to a hidden message.", 403, "MESSAGE_HIDDEN");
      }

      if (!COMMUNITY_EMOJIS.includes(emoji)) {
        throw new ApiError("Unsupported reaction.", 400, "INVALID_REACTION");
      }

      const existingIndex = db.messageReactions.findIndex(
        (item) =>
          item.messageId === messageId && item.emoji === emoji && String(item.userId) === actorData.id
      );

      if (existingIndex >= 0) {
        db.messageReactions.splice(existingIndex, 1);
        return { toggledOn: false };
      }

      db.messageReactions.push({
        id: nextId("react"),
        messageId,
        emoji,
        userId: actorData.id,
        reactedAt: new Date().toISOString(),
      });

      return { toggledOn: true };
    }),

  toggleHelpful: async ({ actor, messageId }) =>
    withDbMutation((db) => {
      const actorData = asActor(actor);
      const message = getMessageOrThrow(db, messageId);
      if (message.isHidden && !isSuperAdmin(actorData)) {
        throw new ApiError("You cannot mark hidden messages as helpful.", 403, "MESSAGE_HIDDEN");
      }

      const existingIndex = db.messageHelpfulVotes.findIndex(
        (vote) => vote.messageId === messageId && String(vote.userId) === actorData.id
      );

      if (existingIndex >= 0) {
        db.messageHelpfulVotes.splice(existingIndex, 1);
      } else {
        db.messageHelpfulVotes.push({
          id: nextId("help"),
          messageId,
          userId: actorData.id,
          createdAt: new Date().toISOString(),
        });
      }

      const total = db.messageHelpfulVotes.filter((vote) => vote.messageId === messageId).length;
      message.helpfulCount = total;
      return { helpfulCount: total, marked: existingIndex < 0 };
    }),

  reportMessage: async ({ actor, messageId, reason }) =>
    withDbMutation((db) => {
      const actorData = asActor(actor);
      getMessageOrThrow(db, messageId);

      const normalizedReason = normalizeText(reason);
      if (normalizedReason.length < 8) {
        throw new ApiError("Please provide a brief reason (min 8 chars).", 400, "INVALID_REASON");
      }

      const existingOpen = db.messageReports.find(
        (item) =>
          item.messageId === messageId &&
          String(item.reporterId) === actorData.id &&
          item.status === REPORT_STATUS.OPEN
      );

      if (existingOpen) {
        return existingOpen;
      }

      const report = {
        id: nextId("rep"),
        messageId,
        reporterId: actorData.id,
        reason: normalizedReason,
        status: REPORT_STATUS.OPEN,
        createdAt: new Date().toISOString(),
        resolvedAt: null,
        resolvedBy: null,
      };

      db.messageReports.push(report);
      return report;
    }),

  moderateMessage: async ({ actor, messageId, action }) =>
    withDbMutation((db) => {
      const actorData = asActor(actor);
      assertSuperAdmin(actorData);

      const message = getMessageOrThrow(db, messageId);
      const normalizedAction = String(action || "").toLowerCase();

      if (normalizedAction === "hide") {
        message.isHidden = true;
      }

      if (normalizedAction === "unhide") {
        message.isHidden = false;
      }

      if (normalizedAction === "lock-thread") {
        message.threadLocked = true;
      }

      if (normalizedAction === "unlock-thread") {
        message.threadLocked = false;
      }

      message.updatedAt = new Date().toISOString();
      return message;
    }),

  listReports: async ({ actor, query = {} }) =>
    withDbRead((db) => {
      const actorData = asActor(actor);
      assertSuperAdmin(actorData);

      const statusFilter = normalizeText(query.status).toUpperCase();
      const page = Math.max(Number(query.page) || 1, 1);
      const pageSize = Math.max(Number(query.pageSize) || DEFAULT_PAGE_SIZE, 1);

      const messageMap = db.messages.reduce((acc, message) => {
        acc[message.id] = message;
        return acc;
      }, {});

      const channelMap = db.channels.reduce((acc, channel) => {
        acc[channel.id] = channel;
        return acc;
      }, {});

      const rows = db.messageReports
        .filter((report) => (statusFilter ? report.status === statusFilter : true))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .map((report) => {
          const message = messageMap[report.messageId];
          const channel = message ? channelMap[message.channelId] : null;

          return {
            ...report,
            message,
            channel,
          };
        });

      return paginateRows({ rows, page, pageSize });
    }),

  updateReportStatus: async ({ actor, reportId, status }) =>
    withDbMutation((db) => {
      const actorData = asActor(actor);
      assertSuperAdmin(actorData);

      const normalizedStatus = String(status || "").toUpperCase();
      if (!Object.values(REPORT_STATUS).includes(normalizedStatus)) {
        throw new ApiError("Invalid report status.", 400, "INVALID_REPORT_STATUS");
      }

      const report = db.messageReports.find((item) => item.id === reportId);
      if (!report) {
        throw new ApiError("Report not found.", 404, "REPORT_NOT_FOUND");
      }

      report.status = normalizedStatus;
      report.resolvedBy = actorData.id;
      report.resolvedAt = normalizedStatus === REPORT_STATUS.OPEN ? null : new Date().toISOString();

      return report;
    }),

  toggleBookmark: async ({ actor, messageId }) =>
    withDbMutation((db) => {
      const actorData = asActor(actor);
      const message = getMessageOrThrow(db, messageId);
      if (message.isHidden && !isSuperAdmin(actorData)) {
        throw new ApiError("Cannot bookmark hidden message.", 403, "MESSAGE_HIDDEN");
      }

      const existingIndex = db.savedMessages.findIndex(
        (item) => item.messageId === messageId && String(item.userId) === String(actorData.id)
      );

      if (existingIndex >= 0) {
        db.savedMessages.splice(existingIndex, 1);
        return { bookmarked: false };
      }

      db.savedMessages.push({
        id: nextId("bookmark"),
        messageId,
        userId: actorData.id,
        createdAt: new Date().toISOString(),
      });

      return { bookmarked: true };
    }),

  listBookmarkedMessages: async ({ actor, query = {} }) =>
    withDbRead((db) => {
      const actorData = asActor(actor);
      const page = Math.max(Number(query.page) || 1, 1);
      const pageSize = Math.max(Number(query.pageSize) || DEFAULT_PAGE_SIZE, 1);
      const bookmarkLookup = getBookmarkLookup(db, actorData.id);
      const helpfulLookup = getHelpfulVoteLookup(db, actorData.id);
      const reactionLookup = getReactionsByMessage(db, actorData.id);

      const rows = db.messages
        .filter((message) => Boolean(bookmarkLookup[message.id]))
        .filter((message) => (isSuperAdmin(actorData) ? true : !message.isHidden))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .map((message) => ({
          ...message,
          tags: normalizeTags(message.tags),
          reactions: Object.values(reactionLookup[message.id] || {}),
          helpfulCount: helpfulLookup[message.id]?.count || message.helpfulCount || 0,
          markedHelpfulByCurrentUser: Boolean(helpfulLookup[message.id]?.hasVoted),
          isBookmarkedByCurrentUser: true,
          authorModerationStatus: getModerationStatus(db, message.author.id),
          authorWarnings: getWarningCount(db, message.author.id),
          reportsOpenCount: db.messageReports.filter(
            (report) => report.messageId === message.id && report.status === REPORT_STATUS.OPEN
          ).length,
        }));

      return paginateRows({ rows, page, pageSize });
    }),

  getFeedInsights: async ({ actor }) =>
    withDbRead((db) => {
      const actorData = asActor(actor);
      const insights = buildFeedInsights(db);
      const announcements = db.announcements
        .filter((item) => {
          if (isSuperAdmin(actorData)) return true;
          return item.status === ANNOUNCEMENT_STATUS.PUBLISHED;
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 4);

      return {
        activeUsers: insights.activeUsers,
        trendingTopics: insights.trendingTopics,
        announcements,
      };
    }),

  getModerationConfig: async ({ actor }) =>
    withDbRead((db) => {
      const actorData = asActor(actor);
      assertSuperAdmin(actorData);
      return db.moderationConfig;
    }),

  updateModerationConfig: async ({ actor, patch = {} }) =>
    withDbMutation((db) => {
      const actorData = asActor(actor);
      assertSuperAdmin(actorData);

      db.moderationConfig = {
        ...db.moderationConfig,
        wordFilterEnabled:
          typeof patch.wordFilterEnabled === "boolean"
            ? patch.wordFilterEnabled
            : db.moderationConfig.wordFilterEnabled,
        blockedWordsPlaceholder: Array.isArray(patch.blockedWordsPlaceholder)
          ? normalizeBlockedWords(patch.blockedWordsPlaceholder)
          : db.moderationConfig.blockedWordsPlaceholder,
      };

      return db.moderationConfig;
    }),

  warnUser: async ({ actor, targetUserId, reason, messageId = null }) =>
    withDbMutation((db) => {
      const actorData = asActor(actor);
      assertSuperAdmin(actorData);

      const normalizedTarget = normalizeText(targetUserId);
      const normalizedReason = normalizeText(reason);
      if (!normalizedTarget) {
        throw new ApiError("Target user is required.", 400, "INVALID_TARGET_USER");
      }

      if (normalizedReason.length < 5) {
        throw new ApiError("Warning reason is too short.", 400, "INVALID_WARNING_REASON");
      }

      const warning = {
        id: nextId("warn"),
        userId: normalizedTarget,
        reason: normalizedReason,
        messageId,
        issuedBy: actorData.id,
        createdAt: new Date().toISOString(),
      };

      db.userModeration.warnings.push(warning);
      return warning;
    }),

  toggleUserBan: async ({ actor, targetUserId, reason }) =>
    withDbMutation((db) => {
      const actorData = asActor(actor);
      assertSuperAdmin(actorData);

      const normalizedTarget = normalizeText(targetUserId);
      if (!normalizedTarget) {
        throw new ApiError("Target user is required.", 400, "INVALID_TARGET_USER");
      }

      const existingBan = getCurrentBan(db, normalizedTarget);
      if (existingBan) {
        existingBan.isActive = false;
        existingBan.updatedAt = new Date().toISOString();
        existingBan.updatedBy = actorData.id;
        return { banned: false, ban: existingBan };
      }

      const ban = {
        id: nextId("ban"),
        userId: normalizedTarget,
        reason: normalizeText(reason) || "Policy violation",
        isActive: true,
        issuedBy: actorData.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      db.userModeration.bans.push(ban);
      return { banned: true, ban };
    }),

  getUserModerationSummary: async ({ actor }) =>
    withDbRead((db) => {
      const actorData = asActor(actor);
      assertSuperAdmin(actorData);

      const warningsByUser = db.userModeration.warnings.reduce((acc, warning) => {
        acc[warning.userId] = (acc[warning.userId] || 0) + 1;
        return acc;
      }, {});

      const activeBans = db.userModeration.bans.filter((ban) => ban.isActive);
      return {
        warnedUsers: Object.keys(warningsByUser).length,
        totalWarnings: db.userModeration.warnings.length,
        activeBans: activeBans.length,
      };
    }),

  getOverviewAnalytics: async ({ actor }) =>
    withDbRead((db) => {
      const actorData = asActor(actor);
      assertSuperAdmin(actorData);

      const now = Date.now();
      const activeWindow = 7 * 24 * 60 * 60 * 1000;
      const activeUserSet = new Set(
        db.messages
          .filter((message) => now - new Date(message.createdAt).getTime() <= activeWindow)
          .map((message) => message.author.id)
      );

      return {
        messageCount: db.messages.filter((message) => !message.isHidden).length,
        announcementViews: db.announcements.reduce(
          (acc, announcement) => acc + Number(announcement?.meta?.viewsCount || 0),
          0
        ),
        activeUsers: activeUserSet.size,
        openReports: db.messageReports.filter((item) => item.status === REPORT_STATUS.OPEN).length,
        channelsEnabled: db.channels.filter((channel) => channel.isEnabled).length,
        warnedUsers: Array.from(new Set(db.userModeration.warnings.map((item) => item.userId))).length,
        activeBans: db.userModeration.bans.filter((ban) => ban.isActive).length,
      };
    }),

  getTopContributors: async ({ actor, windowDays = 7, limit = 5 }) =>
    withDbRead((db) => {
      const actorData = asActor(actor);
      if (!actorData.id) {
        throw new ApiError("Invalid actor.", 400, "INVALID_ACTOR");
      }

      return buildTopContributors(db, { windowDays, limit });
    }),
};

export const communityApiContracts = Object.freeze({
  announcements: {
    list: "GET /api/v1/community/announcements",
    create: "POST /api/v1/community/announcements",
    update: "PATCH /api/v1/community/announcements/:id",
    remove: "DELETE /api/v1/community/announcements/:id",
    read: "POST /api/v1/community/announcements/:id/read",
    analytics: "GET /api/v1/community/announcements/:id/analytics",
  },
  channels: {
    list: "GET /api/v1/community/channels",
    update: "PATCH /api/v1/community/channels/:id",
  },
  messages: {
    list: "GET /api/v1/community/channels/:channelId/messages",
    create: "POST /api/v1/community/channels/:channelId/messages",
    react: "POST /api/v1/community/messages/:id/reactions",
    helpful: "POST /api/v1/community/messages/:id/helpful",
    bookmark: "POST /api/v1/community/messages/:id/bookmark",
    report: "POST /api/v1/community/messages/:id/report",
    moderate: "PATCH /api/v1/community/messages/:id/moderation",
  },
  feed: {
    insights: "GET /api/v1/community/feed/insights",
    bookmarks: "GET /api/v1/community/feed/bookmarks",
  },
  reports: {
    list: "GET /api/v1/community/reports",
    update: "PATCH /api/v1/community/reports/:id",
  },
  moderation: {
    config: "GET/PATCH /api/v1/community/moderation/config",
    warn: "POST /api/v1/community/moderation/warn",
    ban: "POST /api/v1/community/moderation/ban",
  },
  analytics: {
    overview: "GET /api/v1/community/analytics/overview",
    contributors: "GET /api/v1/community/analytics/top-contributors",
  },
});
