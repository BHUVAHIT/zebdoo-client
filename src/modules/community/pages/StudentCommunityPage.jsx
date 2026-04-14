import { useCallback, useEffect, useMemo } from "react";
import { MessageSquareText, Megaphone, Trophy } from "lucide-react";
import RenderProfiler from "../../../components/performance/RenderProfiler";
import { useAppToast } from "../../../components/notifications/useAppToast";
import useAuth from "../../../hooks/useAuth";
import { COMMUNITY_TABS } from "../constants/community.constants";
import CommunityTabs from "../components/CommunityTabs";
import AnnouncementFeed from "../components/AnnouncementFeed";
import ChannelSidebar from "../components/ChannelSidebar";
import CommunityFeedToolbar from "../components/CommunityFeedToolbar";
import CommunityInsightRail from "../components/CommunityInsightRail";
import MessageComposer from "../components/MessageComposer";
import MessageThreadList from "../components/MessageThreadList";
import TopContributorsCard from "../components/TopContributorsCard";
import { useCommunityStore } from "../store/communityStore";
import "../community.css";

const STUDENT_JOINED_GROUPS = [
  { id: "group-1", name: "CA Finals 2026" },
  { id: "group-2", name: "Coding Practice League" },
  { id: "group-3", name: "Weekend Doubt Sprint" },
];

const flattenTree = (messages) =>
  messages.flatMap((message) => [message, ...flattenTree(message.replies || [])]);

const containsTopic = (message, selectedTopic) => {
  if (!selectedTopic) return true;
  const tags = Array.isArray(message.tags) ? message.tags : [];
  return tags.includes(selectedTopic);
};

const containsQuery = (message, searchQuery) => {
  if (!searchQuery) return true;
  const needle = searchQuery.toLowerCase();
  const haystack = `${message.author?.name || ""} ${message.bodyMarkdown || ""} ${(message.tags || []).join(" ")}`.toLowerCase();
  return haystack.includes(needle);
};

const messagePopularity = (message) => {
  const reactions = (message.reactions || []).reduce((acc, item) => acc + (item.count || 0), 0);
  return (message.helpfulCount || 0) * 3 + reactions;
};

const passesCurrentFilter = ({ message, feedFilter }) => {
  if (feedFilter === "UNANSWERED") {
    return !message.replies?.length;
  }

  return true;
};

const StudentCommunityPage = () => {
  const { user } = useAuth();
  const { pushToast } = useAppToast();

  const {
    activeTab,
    selectedChannelId,
    selectedThreadId,
    feedFilter,
    searchQuery,
    selectedTopic,
    showBookmarksOnly,
    announcements,
    announcementPreview,
    channels,
    messageTree,
    activeUsers,
    trendingTopics,
    bookmarkedMessages,
    topContributors,
    loading,
    error,
    setActiveTab,
    setFeedFilter,
    setSearchQuery,
    setSelectedTopic,
    setShowBookmarksOnly,
    setSelectedChannel,
    setSelectedThread,
    bootstrapForActor,
    loadFeedInsights,
    loadBookmarkedMessages,
    markAnnouncementRead,
    loadChannelMessages,
    createMessage,
    toggleReaction,
    toggleHelpful,
    toggleBookmark,
    reportMessage,
  } = useCommunityStore();

  const unreadAnnouncements = useMemo(
    () => announcements.filter((item) => !item.isRead).length,
    [announcements]
  );

  const selectedChannel = useMemo(
    () => channels.find((channel) => channel.id === selectedChannelId) || null,
    [channels, selectedChannelId]
  );

  const replyTarget = useMemo(() => {
    if (!selectedThreadId) return null;

    const stack = [...messageTree];
    while (stack.length) {
      const current = stack.pop();
      if (current.id === selectedThreadId) {
        return current;
      }

      if (current.replies?.length) {
        stack.push(...current.replies);
      }
    }

    return null;
  }, [messageTree, selectedThreadId]);

  useEffect(() => {
    if (!user) return;
    bootstrapForActor({ actor: user });
    loadFeedInsights({ actor: user });
    loadBookmarkedMessages({ actor: user, page: 1, pageSize: 20 });
  }, [bootstrapForActor, loadBookmarkedMessages, loadFeedInsights, user]);

  useEffect(() => {
    if (!user || !selectedChannelId) return;
    loadChannelMessages({ actor: user, channelId: selectedChannelId });
  }, [loadChannelMessages, selectedChannelId, user]);

  const tabs = useMemo(
    () => [
      {
        value: COMMUNITY_TABS.ANNOUNCEMENTS,
        label: "Latest Announcements",
        badge: unreadAnnouncements,
      },
      { value: COMMUNITY_TABS.CHAT, label: "Student Community Chat" },
      { value: COMMUNITY_TABS.BOOKMARKS, label: "Saved Discussions" },
      { value: COMMUNITY_TABS.CONTRIBUTORS, label: "Weekly Top Contributors" },
    ],
    [unreadAnnouncements]
  );

  const messagePools = useMemo(
    () =>
      messageTree.map((message) => ({
        message,
        pool: [message, ...flattenTree(message.replies || [])],
      })),
    [messageTree]
  );

  const filteredMessages = useMemo(() => {
    const mapped = messagePools
      .filter(({ message, pool }) => {
        const queryMatch = pool.some((item) => containsQuery(item, searchQuery));
        const topicMatch = pool.some((item) => containsTopic(item, selectedTopic));
        const bookmarkMatch = !showBookmarksOnly || pool.some((item) => item.isBookmarkedByCurrentUser);

        return queryMatch && topicMatch && bookmarkMatch && passesCurrentFilter({ message, feedFilter });
      })
      .map(({ message }) => message)
      .map((message) => ({
        ...message,
        replies: (message.replies || []).filter((reply) => containsQuery(reply, searchQuery)),
      }));

    if (feedFilter === "POPULAR") {
      return mapped.sort((a, b) => messagePopularity(b) - messagePopularity(a));
    }

    if (feedFilter === "LATEST") {
      return mapped.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return mapped;
  }, [feedFilter, messagePools, searchQuery, selectedTopic, showBookmarksOnly]);

  const handleSelectChannel = useCallback(
    (channelId) => {
      setSelectedChannel(channelId);
    },
    [setSelectedChannel]
  );

  const handleMarkAnnouncementRead = useCallback(
    async (announcementId) => {
      const result = await markAnnouncementRead({ actor: user, announcementId });
      if (!result.ok) {
        pushToast({
          title: "Unable to mark as read",
          message: result.error?.message || "Try again.",
          tone: "warning",
        });
      }
    },
    [markAnnouncementRead, pushToast, user]
  );

  const handleBookmarkChat = useCallback(
    async (messageId) => {
      const result = await toggleBookmark({ actor: user, messageId });
      if (!result.ok) {
        pushToast({
          title: "Unable to save post",
          message: result.error?.message || "Try again.",
          tone: "warning",
        });
      }
    },
    [pushToast, toggleBookmark, user]
  );

  const handleReactChat = useCallback(
    async (messageId, emoji) => {
      const result = await toggleReaction({ actor: user, messageId, emoji });
      if (!result.ok) {
        pushToast({
          title: "Reaction failed",
          message: result.error?.message || "Try again.",
          tone: "warning",
        });
      }
    },
    [pushToast, toggleReaction, user]
  );

  const handleHelpfulChat = useCallback(
    async (messageId) => {
      const result = await toggleHelpful({ actor: user, messageId });
      if (!result.ok) {
        pushToast({
          title: "Unable to update helpful",
          message: result.error?.message || "Try again.",
          tone: "warning",
        });
      }
    },
    [pushToast, toggleHelpful, user]
  );

  const handleReportChat = useCallback(
    async (messageId) => {
      const reason = window.prompt("Report reason (minimum 8 characters)");
      if (!reason) return;

      const result = await reportMessage({ actor: user, messageId, reason });
      if (result.ok) {
        pushToast({
          title: "Report submitted",
          message: "Thanks for helping keep the community safe.",
          tone: "success",
        });
        return;
      }

      pushToast({
        title: "Unable to report",
        message: result.error?.message || "Try again.",
        tone: "warning",
      });
    },
    [pushToast, reportMessage, user]
  );

  const handleBookmarkSaved = useCallback(
    async (messageId) => {
      const result = await toggleBookmark({ actor: user, messageId });
      if (!result.ok) {
        pushToast({
          title: "Unable to update bookmark",
          message: result.error?.message || "Try again.",
          tone: "warning",
        });
      }
      loadBookmarkedMessages({ actor: user, page: 1, pageSize: 20 });
    },
    [loadBookmarkedMessages, pushToast, toggleBookmark, user]
  );

  const handleOpenAnnouncements = useCallback(() => {
    setActiveTab(COMMUNITY_TABS.ANNOUNCEMENTS);
  }, [setActiveTab]);

  const postMessage = useCallback(async ({ bodyMarkdown, tags }) => {
    if (!user || !selectedChannelId) return false;

    const result = await createMessage({
      actor: user,
      channelId: selectedChannelId,
      bodyMarkdown,
      tags,
      parentMessageId: replyTarget?.id || null,
    });

    if (!result.ok) {
      pushToast({
        title: "Unable to post",
        message: result.error?.message || "Try again after a moment.",
        tone: "error",
      });
      return false;
    }

    setSelectedThread(null);
    return true;
  }, [createMessage, pushToast, replyTarget?.id, selectedChannelId, setSelectedThread, user]);

  return (
    <section className="community-shell">
      <header className="community-hero student-mode">
        <div>
          <p>Student Community</p>
          <h1>Learn together, ask faster, solve smarter</h1>
          <span>
            Public, educational channels with moderation safeguards and structured threads.
          </span>
        </div>
        <div className="community-hero__chips">
          <article>
            <Megaphone size={16} aria-hidden="true" />
            <strong>{announcements.length}</strong>
            <small>Announcements</small>
          </article>
          <article>
            <MessageSquareText size={16} aria-hidden="true" />
            <strong>{channels.length}</strong>
            <small>Active channels</small>
          </article>
          <article>
            <Trophy size={16} aria-hidden="true" />
            <strong>{topContributors.length}</strong>
            <small>Contributors ranked</small>
          </article>
        </div>
      </header>

      <CommunityTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {error ? (
        <section className="community-card community-error-banner" role="alert">
          <p>{error}</p>
        </section>
      ) : null}

      <div className="community-chat-grid community-workspace-grid">
        <RenderProfiler id="StudentCommunity.ChannelSidebar" thresholdMs={8}>
          <ChannelSidebar
            channels={channels}
            joinedGroups={STUDENT_JOINED_GROUPS}
            selectedChannelId={selectedChannelId}
            onSelect={handleSelectChannel}
          />
        </RenderProfiler>

        <section className="community-chat-main">
          {activeTab === COMMUNITY_TABS.ANNOUNCEMENTS ? (
            <RenderProfiler id="StudentCommunity.AnnouncementFeed" thresholdMs={10}>
              <AnnouncementFeed
                announcements={announcements}
                loading={loading.announcements || loading.bootstrap}
                onMarkRead={handleMarkAnnouncementRead}
              />
            </RenderProfiler>
          ) : null}

          {activeTab === COMMUNITY_TABS.CHAT ? (
            <>
              <CommunityFeedToolbar
                searchQuery={searchQuery}
                onSearch={setSearchQuery}
                feedFilter={feedFilter}
                onFilterChange={setFeedFilter}
                selectedTopic={selectedTopic}
                topics={trendingTopics.slice(0, 8)}
                onTopicSelect={setSelectedTopic}
                showBookmarksOnly={showBookmarksOnly}
                onToggleBookmarksOnly={setShowBookmarksOnly}
              />

              <header className="community-card community-chat-main__header">
                <h3>#{selectedChannel?.name || "channel"}</h3>
                <p>{selectedChannel?.description || "Choose a channel to join discussion."}</p>
                {selectedChannel?.isReadOnly ? <strong>This channel is currently read-only.</strong> : null}
              </header>

              <RenderProfiler id="StudentCommunity.ChatThreadList" thresholdMs={12}>
                <MessageThreadList
                  loading={loading.messages || loading.bootstrap}
                  messages={filteredMessages}
                  onReply={(message) => setSelectedThread(message.id)}
                  onBookmark={handleBookmarkChat}
                  onReact={handleReactChat}
                  onHelpful={handleHelpfulChat}
                  onReport={handleReportChat}
                  onModerate={() => {}}
                />
              </RenderProfiler>

              <MessageComposer
                disabled={!selectedChannel || !selectedChannel.isEnabled || selectedChannel.isReadOnly}
                submitting={loading.mutation}
                replyTarget={replyTarget}
                onCancelReply={() => setSelectedThread(null)}
                onSubmit={postMessage}
              />
            </>
          ) : null}

          {activeTab === COMMUNITY_TABS.BOOKMARKS ? (
            <>
              <header className="community-card community-chat-main__header">
                <h3>Saved discussions</h3>
                <p>Quickly revisit the most useful threads you bookmarked.</p>
              </header>
              <MessageThreadList
                loading={loading.bookmarks}
                messages={bookmarkedMessages}
                onReply={() => {}}
                onBookmark={handleBookmarkSaved}
                onReact={async (messageId, emoji) => {
                  await toggleReaction({ actor: user, messageId, emoji });
                }}
                onHelpful={async (messageId) => {
                  await toggleHelpful({ actor: user, messageId });
                }}
                onReport={() => {}}
                onModerate={() => {}}
              />
            </>
          ) : null}

          {activeTab === COMMUNITY_TABS.CONTRIBUTORS ? (
            <TopContributorsCard contributors={topContributors} />
          ) : null}
        </section>

        <RenderProfiler id="StudentCommunity.InsightRail" thresholdMs={8}>
          <CommunityInsightRail
            activeUsers={activeUsers.slice(0, 6)}
            trendingTopics={trendingTopics.slice(0, 6)}
            announcements={announcementPreview}
            onOpenAnnouncements={handleOpenAnnouncements}
          />
        </RenderProfiler>
      </div>
    </section>
  );
};

export default StudentCommunityPage;
