import { create } from "zustand";
import {
  COMMUNITY_FEED_FILTERS,
  COMMUNITY_TABS,
  REPORT_STATUS,
} from "../constants/community.constants";
import { communityService } from "../services/communityService";

const initialLoading = Object.freeze({
  bootstrap: false,
  announcements: false,
  messages: false,
  insights: false,
  bookmarks: false,
  moderation: false,
  reports: false,
  overview: false,
  mutation: false,
});

const toErrorMessage = (error, fallback = "Unable to complete your request.") =>
  error?.message || fallback;

const safeSet = (set, updater) => {
  set((state) => ({
    ...state,
    ...updater(state),
  }));
};

const applyToMessageTree = (tree, messageId, transformer) =>
  tree.map((node) => {
    const nextNode =
      node.id === messageId
        ? transformer(node)
        : {
            ...node,
            replies: applyToMessageTree(node.replies || [], messageId, transformer),
          };

    if (node.id === messageId) {
      return {
        ...nextNode,
        replies: applyToMessageTree(nextNode.replies || [], messageId, transformer),
      };
    }

    return nextNode;
  });

const flattenMessageTree = (tree) =>
  tree.flatMap((node) => [node, ...flattenMessageTree(node.replies || [])]);

export const useCommunityStore = create((set, get) => ({
  activeTab: COMMUNITY_TABS.ANNOUNCEMENTS,
  selectedChannelId: null,
  selectedThreadId: null,
  feedFilter: COMMUNITY_FEED_FILTERS.LATEST,
  searchQuery: "",
  selectedTopic: "",
  showBookmarksOnly: false,

  announcements: [],
  channels: [],
  messageTree: [],
  activeUsers: [],
  trendingTopics: [],
  announcementPreview: [],
  bookmarkedMessageIds: [],
  bookmarkedMessages: [],
  moderationConfig: {
    wordFilterEnabled: false,
    blockedWordsPlaceholder: [],
  },
  moderationSummary: {
    warnedUsers: 0,
    totalWarnings: 0,
    activeBans: 0,
  },
  actorModerationStatus: "CLEAN",
  reports: [],
  topContributors: [],
  overviewAnalytics: null,

  reportsMeta: {
    total: 0,
    page: 1,
    pageSize: 10,
    totalPages: 1,
  },

  loading: { ...initialLoading },
  error: null,

  setActiveTab: (tab) => {
    set({ activeTab: tab });
  },

  setSelectedChannel: (channelId) => {
    set({ selectedChannelId: channelId, selectedThreadId: null });
  },

  setSelectedThread: (threadId) => {
    set({ selectedThreadId: threadId || null });
  },

  setFeedFilter: (feedFilter) => set({ feedFilter }),

  setSearchQuery: (searchQuery) => set({ searchQuery }),

  setSelectedTopic: (selectedTopic) => set({ selectedTopic }),

  setShowBookmarksOnly: (showBookmarksOnly) => set({ showBookmarksOnly }),

  bootstrapForActor: async ({ actor }) => {
    safeSet(set, () => ({
      loading: { ...get().loading, bootstrap: true },
      error: null,
    }));

    try {
      const result = await communityService.bootstrap({ actor });
      const firstChannel = result.channels[0]?.id || null;

      safeSet(set, (state) => ({
        announcements: result.announcements,
        channels: result.channels,
        topContributors: result.topContributors,
        activeUsers: result.activeUsers || [],
        trendingTopics: result.trendingTopics || [],
        announcementPreview: result.announcementPreview || [],
        bookmarkedMessageIds: result.bookmarkedMessageIds || [],
        moderationConfig: result.moderationConfig || state.moderationConfig,
        actorModerationStatus: result.actorModerationStatus || "CLEAN",
        selectedChannelId: state.selectedChannelId || firstChannel,
        loading: { ...state.loading, bootstrap: false },
        error: null,
      }));

      return { ok: true };
    } catch (error) {
      safeSet(set, (state) => ({
        loading: { ...state.loading, bootstrap: false },
        error: toErrorMessage(error, "Unable to load community data."),
      }));

      return { ok: false, error };
    }
  },

  loadAnnouncements: async ({ actor, query = {} }) => {
    safeSet(set, (state) => ({
      loading: { ...state.loading, announcements: true },
      error: null,
    }));

    try {
      const paged = await communityService.listAnnouncements({ actor, query });

      safeSet(set, (state) => ({
        announcements: paged.items,
        loading: { ...state.loading, announcements: false },
      }));

      return paged;
    } catch (error) {
      safeSet(set, (state) => ({
        loading: { ...state.loading, announcements: false },
        error: toErrorMessage(error, "Unable to load announcements."),
      }));

      return null;
    }
  },

  markAnnouncementRead: async ({ actor, announcementId }) => {
    try {
      await communityService.markAnnouncementRead({ actor, announcementId });
      safeSet(set, (state) => ({
        announcements: state.announcements.map((item) =>
          item.id === announcementId ? { ...item, isRead: true, readAt: new Date().toISOString() } : item
        ),
      }));

      return { ok: true };
    } catch (error) {
      return { ok: false, error };
    }
  },

  upsertAnnouncement: async ({ actor, announcementId, payload }) => {
    safeSet(set, (state) => ({
      loading: { ...state.loading, mutation: true },
      error: null,
    }));

    try {
      if (announcementId) {
        await communityService.updateAnnouncement({ actor, announcementId, payload });
      } else {
        await communityService.createAnnouncement({ actor, payload });
      }

      const refreshed = await communityService.listAnnouncements({
        actor,
        query: {
          page: 1,
          pageSize: 20,
        },
      });

      safeSet(set, (state) => ({
        announcements: refreshed.items,
        loading: { ...state.loading, mutation: false },
      }));

      return { ok: true };
    } catch (error) {
      safeSet(set, (state) => ({
        loading: { ...state.loading, mutation: false },
        error: toErrorMessage(error, "Unable to save announcement."),
      }));

      return { ok: false, error };
    }
  },

  deleteAnnouncement: async ({ actor, announcementId }) => {
    safeSet(set, (state) => ({
      loading: { ...state.loading, mutation: true },
      error: null,
    }));

    try {
      await communityService.deleteAnnouncement({ actor, announcementId });

      safeSet(set, (state) => ({
        announcements: state.announcements.filter((item) => item.id !== announcementId),
        loading: { ...state.loading, mutation: false },
      }));

      return { ok: true };
    } catch (error) {
      safeSet(set, (state) => ({
        loading: { ...state.loading, mutation: false },
        error: toErrorMessage(error, "Unable to delete announcement."),
      }));

      return { ok: false, error };
    }
  },

  loadChannelMessages: async ({ actor, channelId }) => {
    safeSet(set, (state) => ({
      loading: { ...state.loading, messages: true },
      error: null,
    }));

    try {
      const resolvedChannelId = channelId || get().selectedChannelId;
      if (!resolvedChannelId) {
        safeSet(set, (state) => ({
          loading: { ...state.loading, messages: false },
          messageTree: [],
        }));

        return null;
      }

      const payload = await communityService.listChannelMessages({
        actor,
        channelId: resolvedChannelId,
      });

      const flattened = flattenMessageTree(payload.messages || []);
      const bookmarkedMessageIds = flattened
        .filter((item) => item.isBookmarkedByCurrentUser)
        .map((item) => item.id);

      safeSet(set, (state) => ({
        selectedChannelId: payload.channel.id,
        messageTree: payload.messages,
        bookmarkedMessageIds: Array.from(new Set([...state.bookmarkedMessageIds, ...bookmarkedMessageIds])),
        loading: { ...state.loading, messages: false },
      }));

      return payload;
    } catch (error) {
      safeSet(set, (state) => ({
        loading: { ...state.loading, messages: false },
        error: toErrorMessage(error, "Unable to load channel messages."),
      }));

      return null;
    }
  },

  createMessage: async ({ actor, channelId, bodyMarkdown, tags = [], parentMessageId = null }) => {
    safeSet(set, (state) => ({
      loading: { ...state.loading, mutation: true },
      error: null,
    }));

    try {
      await communityService.createMessage({
        actor,
        channelId,
        payload: {
          bodyMarkdown,
          tags,
          parentMessageId,
        },
      });

      await get().loadChannelMessages({ actor, channelId });
      await get().loadTopContributors({ actor });

      safeSet(set, (state) => ({
        loading: { ...state.loading, mutation: false },
      }));

      return { ok: true };
    } catch (error) {
      safeSet(set, (state) => ({
        loading: { ...state.loading, mutation: false },
        error: toErrorMessage(error, "Unable to post message."),
      }));

      return { ok: false, error };
    }
  },

  toggleReaction: async ({ actor, messageId, emoji }) => {
    const previousTree = get().messageTree;
    safeSet(set, (state) => ({
      messageTree: applyToMessageTree(state.messageTree, messageId, (node) => {
        const reactions = Array.isArray(node.reactions) ? [...node.reactions] : [];
        const current = reactions.find((item) => item.emoji === emoji);

        if (current) {
          if (current.reactedByCurrentUser) {
            const nextCount = Math.max((current.count || 1) - 1, 0);
            if (nextCount === 0) {
              return {
                ...node,
                reactions: reactions.filter((item) => item.emoji !== emoji),
              };
            }

            return {
              ...node,
              reactions: reactions.map((item) =>
                item.emoji === emoji
                  ? { ...item, count: nextCount, reactedByCurrentUser: false }
                  : item
              ),
            };
          }

          return {
            ...node,
            reactions: reactions.map((item) =>
              item.emoji === emoji
                ? {
                    ...item,
                    count: (item.count || 0) + 1,
                    reactedByCurrentUser: true,
                  }
                : item
            ),
          };
        }

        return {
          ...node,
          reactions: [...reactions, { emoji, count: 1, reactedByCurrentUser: true }],
        };
      }),
    }));

    try {
      await communityService.toggleReaction({ actor, messageId, emoji });
      await get().loadChannelMessages({ actor, channelId: get().selectedChannelId });
      await get().loadTopContributors({ actor });
      return { ok: true };
    } catch (error) {
      set({ messageTree: previousTree });
      return { ok: false, error };
    }
  },

  toggleHelpful: async ({ actor, messageId }) => {
    const previousTree = get().messageTree;
    safeSet(set, (state) => ({
      messageTree: applyToMessageTree(state.messageTree, messageId, (node) => {
        const currentlyMarked = Boolean(node.markedHelpfulByCurrentUser);
        return {
          ...node,
          markedHelpfulByCurrentUser: !currentlyMarked,
          helpfulCount: Math.max((node.helpfulCount || 0) + (currentlyMarked ? -1 : 1), 0),
        };
      }),
    }));

    try {
      await communityService.toggleHelpful({ actor, messageId });
      await get().loadChannelMessages({ actor, channelId: get().selectedChannelId });
      await get().loadTopContributors({ actor });
      return { ok: true };
    } catch (error) {
      set({ messageTree: previousTree });
      return { ok: false, error };
    }
  },

  toggleBookmark: async ({ actor, messageId }) => {
    const wasBookmarked = get().bookmarkedMessageIds.includes(messageId);
    safeSet(set, (state) => ({
      bookmarkedMessageIds: wasBookmarked
        ? state.bookmarkedMessageIds.filter((id) => id !== messageId)
        : [...state.bookmarkedMessageIds, messageId],
      messageTree: applyToMessageTree(state.messageTree, messageId, (node) => ({
        ...node,
        isBookmarkedByCurrentUser: !wasBookmarked,
      })),
    }));

    try {
      await communityService.toggleBookmark({ actor, messageId });
      return { ok: true };
    } catch (error) {
      safeSet(set, (state) => ({
        bookmarkedMessageIds: wasBookmarked
          ? [...state.bookmarkedMessageIds, messageId]
          : state.bookmarkedMessageIds.filter((id) => id !== messageId),
        messageTree: applyToMessageTree(state.messageTree, messageId, (node) => ({
          ...node,
          isBookmarkedByCurrentUser: wasBookmarked,
        })),
      }));

      return { ok: false, error };
    }
  },

  loadBookmarkedMessages: async ({ actor, page = 1, pageSize = 20 } = {}) => {
    safeSet(set, (state) => ({
      loading: { ...state.loading, bookmarks: true },
      error: null,
    }));

    try {
      const result = await communityService.listBookmarkedMessages({
        actor,
        query: { page, pageSize },
      });
      safeSet(set, (state) => ({
        bookmarkedMessages: result.items,
        loading: { ...state.loading, bookmarks: false },
      }));
      return result;
    } catch (error) {
      safeSet(set, (state) => ({
        loading: { ...state.loading, bookmarks: false },
        error: toErrorMessage(error, "Unable to load bookmarked posts."),
      }));
      return null;
    }
  },

  loadFeedInsights: async ({ actor }) => {
    safeSet(set, (state) => ({
      loading: { ...state.loading, insights: true },
      error: null,
    }));

    try {
      const payload = await communityService.getFeedInsights({ actor });
      safeSet(set, (state) => ({
        activeUsers: payload.activeUsers || [],
        trendingTopics: payload.trendingTopics || [],
        announcementPreview: payload.announcements || [],
        loading: { ...state.loading, insights: false },
      }));

      return payload;
    } catch (error) {
      safeSet(set, (state) => ({
        loading: { ...state.loading, insights: false },
        error: toErrorMessage(error, "Unable to load feed insights."),
      }));

      return null;
    }
  },

  reportMessage: async ({ actor, messageId, reason }) => {
    try {
      await communityService.reportMessage({ actor, messageId, reason });
      await get().loadChannelMessages({ actor, channelId: get().selectedChannelId });
      return { ok: true };
    } catch (error) {
      return { ok: false, error };
    }
  },

  moderateMessage: async ({ actor, messageId, action }) => {
    safeSet(set, (state) => ({
      loading: { ...state.loading, mutation: true },
      error: null,
    }));

    try {
      await communityService.moderateMessage({ actor, messageId, action });
      await get().loadChannelMessages({ actor, channelId: get().selectedChannelId });
      await get().loadReports({ actor });

      safeSet(set, (state) => ({
        loading: { ...state.loading, mutation: false },
      }));

      return { ok: true };
    } catch (error) {
      safeSet(set, (state) => ({
        loading: { ...state.loading, mutation: false },
        error: toErrorMessage(error, "Unable to moderate message."),
      }));

      return { ok: false, error };
    }
  },

  loadReports: async ({ actor, status = REPORT_STATUS.OPEN, page = 1, pageSize = 10 }) => {
    safeSet(set, (state) => ({
      loading: { ...state.loading, reports: true },
      error: null,
    }));

    try {
      const result = await communityService.listReports({
        actor,
        query: { status, page, pageSize },
      });

      safeSet(set, (state) => ({
        reports: result.items,
        reportsMeta: {
          total: result.total,
          page: result.page,
          pageSize: result.pageSize,
          totalPages: result.totalPages,
        },
        loading: { ...state.loading, reports: false },
      }));

      return result;
    } catch (error) {
      safeSet(set, (state) => ({
        loading: { ...state.loading, reports: false },
        error: toErrorMessage(error, "Unable to load reports."),
      }));

      return null;
    }
  },

  updateReportStatus: async ({ actor, reportId, status }) => {
    safeSet(set, (state) => ({
      loading: { ...state.loading, mutation: true },
      error: null,
    }));

    try {
      await communityService.updateReportStatus({ actor, reportId, status });
      await get().loadReports({ actor, status: REPORT_STATUS.OPEN });

      safeSet(set, (state) => ({
        loading: { ...state.loading, mutation: false },
      }));

      return { ok: true };
    } catch (error) {
      safeSet(set, (state) => ({
        loading: { ...state.loading, mutation: false },
        error: toErrorMessage(error, "Unable to update report status."),
      }));

      return { ok: false, error };
    }
  },

  updateChannel: async ({ actor, channelId, patch }) => {
    safeSet(set, (state) => ({
      loading: { ...state.loading, mutation: true },
      error: null,
    }));

    try {
      await communityService.updateChannel({ actor, channelId, patch });
      const channels = await communityService.listChannels({ actor });
      safeSet(set, (state) => ({
        channels,
        loading: { ...state.loading, mutation: false },
      }));

      return { ok: true };
    } catch (error) {
      safeSet(set, (state) => ({
        loading: { ...state.loading, mutation: false },
        error: toErrorMessage(error, "Unable to update channel settings."),
      }));

      return { ok: false, error };
    }
  },

  loadModerationConfig: async ({ actor }) => {
    safeSet(set, (state) => ({
      loading: { ...state.loading, moderation: true },
      error: null,
    }));

    try {
      const moderationConfig = await communityService.getModerationConfig({ actor });
      safeSet(set, (state) => ({
        moderationConfig,
        loading: { ...state.loading, moderation: false },
      }));
      return moderationConfig;
    } catch (error) {
      safeSet(set, (state) => ({
        loading: { ...state.loading, moderation: false },
        error: toErrorMessage(error, "Unable to load moderation settings."),
      }));
      return null;
    }
  },

  updateModerationConfig: async ({ actor, patch }) => {
    safeSet(set, (state) => ({
      loading: { ...state.loading, mutation: true },
      error: null,
    }));

    try {
      const moderationConfig = await communityService.updateModerationConfig({ actor, patch });
      safeSet(set, (state) => ({
        moderationConfig,
        loading: { ...state.loading, mutation: false },
      }));
      return { ok: true };
    } catch (error) {
      safeSet(set, (state) => ({
        loading: { ...state.loading, mutation: false },
        error: toErrorMessage(error, "Unable to update moderation settings."),
      }));
      return { ok: false, error };
    }
  },

  warnUser: async ({ actor, targetUserId, reason, messageId = null }) => {
    safeSet(set, (state) => ({
      loading: { ...state.loading, mutation: true },
      error: null,
    }));

    try {
      await communityService.warnUser({ actor, targetUserId, reason, messageId });
      const moderationSummary = await communityService.getUserModerationSummary({ actor });
      safeSet(set, (state) => ({
        moderationSummary,
        loading: { ...state.loading, mutation: false },
      }));
      await get().loadChannelMessages({ actor, channelId: get().selectedChannelId });
      return { ok: true };
    } catch (error) {
      safeSet(set, (state) => ({
        loading: { ...state.loading, mutation: false },
        error: toErrorMessage(error, "Unable to issue warning."),
      }));
      return { ok: false, error };
    }
  },

  toggleUserBan: async ({ actor, targetUserId, reason }) => {
    safeSet(set, (state) => ({
      loading: { ...state.loading, mutation: true },
      error: null,
    }));

    try {
      const result = await communityService.toggleUserBan({ actor, targetUserId, reason });
      const moderationSummary = await communityService.getUserModerationSummary({ actor });
      safeSet(set, (state) => ({
        moderationSummary,
        loading: { ...state.loading, mutation: false },
      }));
      await get().loadChannelMessages({ actor, channelId: get().selectedChannelId });
      return { ok: true, ...result };
    } catch (error) {
      safeSet(set, (state) => ({
        loading: { ...state.loading, mutation: false },
        error: toErrorMessage(error, "Unable to update member access."),
      }));
      return { ok: false, error };
    }
  },

  loadModerationSummary: async ({ actor }) => {
    try {
      const moderationSummary = await communityService.getUserModerationSummary({ actor });
      set({ moderationSummary });
      return moderationSummary;
    } catch {
      return null;
    }
  },

  loadOverview: async ({ actor }) => {
    safeSet(set, (state) => ({
      loading: { ...state.loading, overview: true },
      error: null,
    }));

    try {
      const overview = await communityService.getOverviewAnalytics({ actor });
      safeSet(set, (state) => ({
        overviewAnalytics: overview,
        loading: { ...state.loading, overview: false },
      }));

      return overview;
    } catch (error) {
      safeSet(set, (state) => ({
        loading: { ...state.loading, overview: false },
        error: toErrorMessage(error, "Unable to load community overview."),
      }));

      return null;
    }
  },

  loadTopContributors: async ({ actor, windowDays = 7, limit = 8 }) => {
    try {
      const rows = await communityService.getTopContributors({ actor, windowDays, limit });
      set({ topContributors: rows });
      return rows;
    } catch {
      return [];
    }
  },

  resetCommunityState: () => {
    set({
      activeTab: COMMUNITY_TABS.ANNOUNCEMENTS,
      selectedChannelId: null,
      selectedThreadId: null,
      feedFilter: COMMUNITY_FEED_FILTERS.LATEST,
      searchQuery: "",
      selectedTopic: "",
      showBookmarksOnly: false,
      announcements: [],
      channels: [],
      messageTree: [],
      activeUsers: [],
      trendingTopics: [],
      announcementPreview: [],
      bookmarkedMessageIds: [],
      bookmarkedMessages: [],
      moderationConfig: {
        wordFilterEnabled: false,
        blockedWordsPlaceholder: [],
      },
      moderationSummary: {
        warnedUsers: 0,
        totalWarnings: 0,
        activeBans: 0,
      },
      actorModerationStatus: "CLEAN",
      reports: [],
      topContributors: [],
      overviewAnalytics: null,
      reportsMeta: {
        total: 0,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      },
      loading: { ...initialLoading },
      error: null,
    });
  },
}));
