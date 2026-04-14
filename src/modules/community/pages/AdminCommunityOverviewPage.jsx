import { useEffect, useMemo } from "react";
import { Activity, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAppToast } from "../../../components/notifications/useAppToast";
import useAuth from "../../../hooks/useAuth";
import { ROUTES } from "../../../routes/routePaths";
import ChannelSidebar from "../components/ChannelSidebar";
import CommunityFeedToolbar from "../components/CommunityFeedToolbar";
import CommunityInsightRail from "../components/CommunityInsightRail";
import CommunityStatCard from "../components/CommunityStatCard";
import MessageThreadList from "../components/MessageThreadList";
import { useCommunityStore } from "../store/communityStore";
import "../community.css";

const flattenTree = (messages) =>
  messages.flatMap((message) => [message, ...flattenTree(message.replies || [])]);

const AdminCommunityOverviewPage = () => {
  const { user } = useAuth();
  const { pushToast } = useAppToast();
  const navigate = useNavigate();

  const {
    feedFilter,
    searchQuery,
    selectedTopic,
    setFeedFilter,
    setSearchQuery,
    setSelectedTopic,
    selectedChannelId,
    channels,
    messageTree,
    activeUsers,
    trendingTopics,
    announcementPreview,
    moderationSummary,
    overviewAnalytics,
    loading,
    bootstrapForActor,
    loadOverview,
    loadFeedInsights,
    loadModerationSummary,
    setSelectedChannel,
    loadChannelMessages,
    updateChannel,
  } = useCommunityStore();

  const statCards = useMemo(() => {
    if (!overviewAnalytics) return [];

    return [
      { label: "Message count", value: overviewAnalytics.messageCount, tone: "indigo" },
      { label: "Announcement views", value: overviewAnalytics.announcementViews, tone: "blue" },
      { label: "Active users (7d)", value: overviewAnalytics.activeUsers, tone: "green" },
      { label: "Open reports", value: overviewAnalytics.openReports, tone: "amber" },
      { label: "Enabled channels", value: overviewAnalytics.channelsEnabled, tone: "pink" },
      { label: "Warned users", value: overviewAnalytics.warnedUsers, tone: "orange" },
      { label: "Active bans", value: overviewAnalytics.activeBans, tone: "rose" },
    ];
  }, [overviewAnalytics]);

  const visibleMessages = useMemo(() => {
    const rows = [...messageTree];

    const filtered = rows.filter((message) => {
      const pool = [message, ...flattenTree(message.replies || [])];
      const byQuery =
        !searchQuery ||
        pool.some((item) =>
          `${item.bodyMarkdown || ""} ${item.author?.name || ""}`
            .toLowerCase()
            .includes(searchQuery.toLowerCase())
        );

      const byTopic =
        !selectedTopic || pool.some((item) => (item.tags || []).includes(selectedTopic));

      if (feedFilter === "UNANSWERED") {
        return byQuery && byTopic && !message.replies?.length;
      }

      return byQuery && byTopic;
    });

    if (feedFilter === "POPULAR") {
      return filtered.sort((a, b) => {
        const scoreA = (a.helpfulCount || 0) + (a.reactions || []).reduce((acc, row) => acc + row.count, 0);
        const scoreB = (b.helpfulCount || 0) + (b.reactions || []).reduce((acc, row) => acc + row.count, 0);
        return scoreB - scoreA;
      });
    }

    if (feedFilter === "LATEST") {
      return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return filtered;
  }, [feedFilter, messageTree, searchQuery, selectedTopic]);

  useEffect(() => {
    if (!user) return;

    bootstrapForActor({ actor: user });
    loadOverview({ actor: user });
    loadFeedInsights({ actor: user });
    loadModerationSummary({ actor: user });
  }, [bootstrapForActor, loadOverview, loadFeedInsights, loadModerationSummary, user]);

  useEffect(() => {
    if (!user || !selectedChannelId) return;
    loadChannelMessages({ actor: user, channelId: selectedChannelId });
  }, [loadChannelMessages, selectedChannelId, user]);

  return (
    <section className="community-shell">
      <header className="community-hero admin-mode">
        <div>
          <p>Community Command Center</p>
          <h1>Moderation-ready insights for student collaboration</h1>
          <span>
            Track activity, channel health, and contributor quality without disrupting the live feed.
          </span>
        </div>
        <div className="community-hero__chips">
          <article>
            <Activity size={16} aria-hidden="true" />
            <strong>{overviewAnalytics?.activeUsers || 0}</strong>
            <small>Active users</small>
          </article>
          <article>
            <BarChart3 size={16} aria-hidden="true" />
            <strong>{overviewAnalytics?.openReports || 0}</strong>
            <small>Open reports</small>
          </article>
        </div>
      </header>

      <div className="community-stats-grid">
        {statCards.map((item) => (
          <CommunityStatCard key={item.label} label={item.label} value={item.value} tone={item.tone} />
        ))}
      </div>

      <div className="community-chat-grid admin-layout">
        <ChannelSidebar
          channels={channels}
          selectedChannelId={selectedChannelId}
          onSelect={setSelectedChannel}
          showAdminControls
          onToggleEnabled={async (channel) => {
            const result = await updateChannel({
              actor: user,
              channelId: channel.id,
              patch: { isEnabled: !channel.isEnabled },
            });

            if (!result.ok) {
              pushToast({
                title: "Update failed",
                message: result.error?.message || "Could not change channel visibility.",
                tone: "warning",
              });
            }
          }}
          onToggleReadOnly={async (channel) => {
            const result = await updateChannel({
              actor: user,
              channelId: channel.id,
              patch: { isReadOnly: !channel.isReadOnly },
            });

            if (!result.ok) {
              pushToast({
                title: "Update failed",
                message: result.error?.message || "Could not change channel access.",
                tone: "warning",
              });
            }
          }}
        />

        <section className="community-chat-main">
          <CommunityFeedToolbar
            searchQuery={searchQuery}
            onSearch={setSearchQuery}
            feedFilter={feedFilter}
            onFilterChange={setFeedFilter}
            selectedTopic={selectedTopic}
            topics={trendingTopics.slice(0, 8)}
            onTopicSelect={setSelectedTopic}
            showBookmarksOnly={false}
            onToggleBookmarksOnly={() => {}}
          />

          <header className="community-card community-chat-main__header">
            <h3>Live conversation snapshot</h3>
            <p>
              Viewing #{channels.find((item) => item.id === selectedChannelId)?.name || "channel"} for
              moderation health checks.
            </p>
            <strong>
              Warning load: {moderationSummary.totalWarnings} total warnings • {moderationSummary.activeBans} active bans
            </strong>
          </header>

          <MessageThreadList
            loading={loading.messages || loading.bootstrap}
            messages={visibleMessages}
            canModerate
            onReply={() => {}}
            onReact={() => {}}
            onHelpful={() => {}}
            onReport={() => {}}
            onBookmark={() => {}}
            onModerate={() => {}}
          />
        </section>

        <CommunityInsightRail
          activeUsers={activeUsers.slice(0, 6)}
          trendingTopics={trendingTopics.slice(0, 6)}
          announcements={announcementPreview}
          onOpenAnnouncements={() => navigate(ROUTES.admin.communityAnnouncements)}
        />
      </div>
    </section>
  );
};

export default AdminCommunityOverviewPage;
