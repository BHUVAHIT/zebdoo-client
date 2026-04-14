import { useEffect, useMemo, useState } from "react";
import { Shield } from "lucide-react";
import { useAppToast } from "../../../components/notifications/useAppToast";
import useAuth from "../../../hooks/useAuth";
import ChannelSidebar from "../components/ChannelSidebar";
import CommunityFeedToolbar from "../components/CommunityFeedToolbar";
import MessageThreadList from "../components/MessageThreadList";
import { REPORT_STATUS } from "../constants/community.constants";
import { useCommunityStore } from "../store/communityStore";
import { formatRelativeTime } from "../utils/communityMarkdown";
import "../community.css";

const flattenTree = (messages) =>
  messages.flatMap((message) => [message, ...flattenTree(message.replies || [])]);

const REPORT_FILTER_OPTIONS = [
  { label: "Open", value: REPORT_STATUS.OPEN },
  { label: "Resolved", value: REPORT_STATUS.RESOLVED },
  { label: "Rejected", value: REPORT_STATUS.REJECTED },
];

const AdminCommunityModerationPage = () => {
  const { user } = useAuth();
  const { pushToast } = useAppToast();
  const [reportFilter, setReportFilter] = useState(REPORT_STATUS.OPEN);
  const [blockedWordsDraft, setBlockedWordsDraft] = useState(null);

  const {
    feedFilter,
    searchQuery,
    selectedTopic,
    setFeedFilter,
    setSearchQuery,
    setSelectedTopic,
    channels,
    selectedChannelId,
    messageTree,
    trendingTopics,
    reports,
    reportsMeta,
    moderationConfig,
    moderationSummary,
    loading,
    error,
    bootstrapForActor,
    setSelectedChannel,
    loadChannelMessages,
    loadReports,
    loadFeedInsights,
    loadModerationConfig,
    updateModerationConfig,
    loadModerationSummary,
    updateReportStatus,
    moderateMessage,
    warnUser,
    toggleUserBan,
    updateChannel,
  } = useCommunityStore();

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
    loadReports({ actor: user, status: reportFilter });
    loadFeedInsights({ actor: user });
    loadModerationConfig({ actor: user });
    loadModerationSummary({ actor: user });
  }, [
    bootstrapForActor,
    loadFeedInsights,
    loadModerationConfig,
    loadModerationSummary,
    loadReports,
    reportFilter,
    user,
  ]);

  useEffect(() => {
    if (!user || !selectedChannelId) return;
    loadChannelMessages({ actor: user, channelId: selectedChannelId });
  }, [loadChannelMessages, selectedChannelId, user]);

  return (
    <section className="community-shell">
      <header className="community-hero admin-mode">
        <div>
          <p>Moderation Console</p>
          <h1>Review reports, lock threads, and keep channels safe</h1>
          <span>All student messages remain public; no private DM channels are available.</span>
        </div>
        <div className="community-hero__chips">
          <article>
            <Shield size={16} aria-hidden="true" />
            <strong>{reportsMeta.total}</strong>
            <small>{reportFilter.toLowerCase()} reports</small>
          </article>
        </div>
      </header>

      {error ? (
        <section className="community-card community-error-banner" role="alert">
          <p>{error}</p>
        </section>
      ) : null}

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
                title: "Channel update failed",
                message: result.error?.message || "Try again.",
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
                title: "Channel update failed",
                message: result.error?.message || "Try again.",
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
            <h3>Conversation moderation view</h3>
            <p>
              Channel: #{channels.find((item) => item.id === selectedChannelId)?.name || "channel"}
            </p>
            <strong>
              {moderationSummary.totalWarnings} warnings issued • {moderationSummary.activeBans} active bans
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
            onModerate={async (messageId, action) => {
              const result = await moderateMessage({ actor: user, messageId, action });
              if (!result.ok) {
                pushToast({
                  title: "Moderation failed",
                  message: result.error?.message || "Try again.",
                  tone: "warning",
                });
              }
            }}
            onWarnUser={async (message) => {
              const reason = window.prompt("Warning reason (minimum 5 characters)");
              if (!reason) return;

              const result = await warnUser({
                actor: user,
                targetUserId: message.author?.id,
                reason,
                messageId: message.id,
              });

              if (!result.ok) {
                pushToast({
                  title: "Warning failed",
                  message: result.error?.message || "Try again.",
                  tone: "warning",
                });
                return;
              }

              pushToast({
                title: "Warning issued",
                message: `Warning issued to ${message.author?.name || "user"}.`,
                tone: "success",
              });
            }}
            onBanUser={async (message) => {
              const reason = window.prompt("Ban/unban reason");
              const result = await toggleUserBan({
                actor: user,
                targetUserId: message.author?.id,
                reason,
              });

              if (!result.ok) {
                pushToast({
                  title: "Member access update failed",
                  message: result.error?.message || "Try again.",
                  tone: "warning",
                });
                return;
              }

              pushToast({
                title: result.banned ? "Member banned" : "Member unbanned",
                message: `${message.author?.name || "User"} access updated successfully.`,
                tone: "success",
              });
            }}
          />
        </section>

        <section className="community-card community-reports-panel">
          <header>
            <h3>Reported messages</h3>
            <div className="community-report-filters">
              {REPORT_FILTER_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={reportFilter === option.value ? "is-active" : ""}
                  onClick={() => setReportFilter(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </header>

          {loading.reports ? <p className="community-muted">Loading reports...</p> : null}

          {!loading.reports && !reports.length ? (
            <p className="community-muted">No reports for this filter.</p>
          ) : null}

          <div className="community-reports-list">
            {reports.map((report) => (
              <article key={report.id} className="community-report-item">
                <h4>{report.channel ? `#${report.channel.name}` : "Unknown channel"}</h4>
                <p>{report.reason}</p>
                <small>Reported {formatRelativeTime(report.createdAt)}</small>
                <blockquote>{report.message?.bodyMarkdown || "Message unavailable"}</blockquote>
                <div className="community-inline-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => moderateMessage({ actor: user, messageId: report.messageId, action: "hide" })}
                  >
                    Hide message
                  </button>
                  {report.status === REPORT_STATUS.OPEN ? (
                    <>
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={async () => {
                          const result = await updateReportStatus({
                            actor: user,
                            reportId: report.id,
                            status: REPORT_STATUS.RESOLVED,
                          });
                          if (!result.ok) {
                            pushToast({
                              title: "Update failed",
                              message: result.error?.message || "Try again.",
                              tone: "warning",
                            });
                          }
                        }}
                      >
                        Resolve
                      </button>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={async () => {
                          const result = await updateReportStatus({
                            actor: user,
                            reportId: report.id,
                            status: REPORT_STATUS.REJECTED,
                          });
                          if (!result.ok) {
                            pushToast({
                              title: "Update failed",
                              message: result.error?.message || "Try again.",
                              tone: "warning",
                            });
                          }
                        }}
                      >
                        Reject
                      </button>
                    </>
                  ) : null}
                </div>
              </article>
            ))}
          </div>

          <section className="community-card community-word-filter-card">
            <h4>Content filter tools</h4>
            <label className="community-switch-row">
              <input
                type="checkbox"
                checked={moderationConfig.wordFilterEnabled}
                onChange={async (event) => {
                  const result = await updateModerationConfig({
                    actor: user,
                    patch: { wordFilterEnabled: event.target.checked },
                  });
                  if (!result.ok) {
                    pushToast({
                      title: "Update failed",
                      message: "Could not update word filter state.",
                      tone: "warning",
                    });
                  }
                }}
              />
              <span>Enable blocked-word filter</span>
            </label>

            <textarea
              rows={4}
              value={blockedWordsDraft ?? (moderationConfig.blockedWordsPlaceholder || []).join(", ")}
              onChange={(event) => setBlockedWordsDraft(event.target.value)}
              placeholder="blocked-word-1, blocked-word-2"
            />

            <button
              type="button"
              className="btn-secondary"
              onClick={async () => {
                const result = await updateModerationConfig({
                  actor: user,
                  patch: {
                    blockedWordsPlaceholder: blockedWordsDraft
                      ? blockedWordsDraft
                          .split(",")
                          .map((word) => word.trim())
                          .filter(Boolean)
                      : (moderationConfig.blockedWordsPlaceholder || [])
                  },
                });

                if (!result.ok) {
                  pushToast({
                    title: "Filter update failed",
                    message: "Unable to save blocked words.",
                    tone: "warning",
                  });
                  return;
                }

                pushToast({
                  title: "Filter updated",
                  message: "Blocked words have been updated.",
                  tone: "success",
                });
              }}
            >
              Save blocked words
            </button>
          </section>
        </section>
      </div>
    </section>
  );
};

export default AdminCommunityModerationPage;
