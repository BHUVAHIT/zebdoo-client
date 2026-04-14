import { memo, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Bookmark,
  BookmarkCheck,
  HandHeart,
  Lock,
  LockOpen,
  MessageCircleReply,
  ShieldAlert,
  UserMinus,
  UserRoundCheck,
} from "lucide-react";
import { COMMUNITY_EMOJIS } from "../constants/community.constants";
import {
  formatRelativeTime,
  formatRoleBadge,
  renderCommunityMarkdown,
} from "../utils/communityMarkdown";
import {
  expandMessagesForSyntheticLoad,
  isSyntheticLoadEnabled,
} from "../../../shared/utils/syntheticLoad";
import {
  logVirtualizationTuning,
  resolveVirtualizationTuning,
} from "../../../shared/utils/virtualizationTuning";

const PAGE_SIZE = 10;
const noop = () => {};

const MessageNode = memo(({
  message,
  depth,
  canModerate,
  onReply,
  onReact,
  onHelpful,
  onReport,
  onBookmark,
  onModerate,
  onWarnUser,
  onBanUser,
}) => {
  const moderationTone =
    message.authorModerationStatus === "BANNED"
      ? "is-danger"
      : message.authorModerationStatus === "WARNED"
        ? "is-warning"
        : "";

  return (
    <article className={`community-message ${message.isHidden ? "is-hidden" : ""} ${moderationTone}`}>
      <header className="community-message__header">
        <div>
          <strong>{message.author?.name || "Unknown"}</strong>
          <span>{formatRoleBadge(message.author?.role)}</span>
          {message.authorWarnings > 0 ? (
            <em className="community-warning-chip">{message.authorWarnings} warnings</em>
          ) : null}
        </div>
        <small>{formatRelativeTime(message.createdAt)}</small>
      </header>

      <div className="community-rich-content">{renderCommunityMarkdown(message.bodyMarkdown, message.id)}</div>

      {message.tags?.length ? (
        <ul className="community-tag-list" aria-label="Message tags">
          {message.tags.map((tag) => (
            <li key={`${message.id}-${tag}`}>#{tag}</li>
          ))}
        </ul>
      ) : null}

      <footer className="community-message__footer">
        <button type="button" onClick={() => onReply(message)}>
          <MessageCircleReply size={14} aria-hidden="true" /> Reply
        </button>

        <button
          type="button"
          className={message.markedHelpfulByCurrentUser ? "is-active" : ""}
          onClick={() => onHelpful(message.id)}
        >
          <HandHeart size={14} aria-hidden="true" /> Helpful ({message.helpfulCount || 0})
        </button>

        <button type="button" onClick={() => onReport(message.id)}>
          <ShieldAlert size={14} aria-hidden="true" /> Report
          {message.reportsOpenCount > 0 ? <em>{message.reportsOpenCount}</em> : null}
        </button>

        <button type="button" onClick={() => onBookmark(message.id)}>
          {message.isBookmarkedByCurrentUser ? (
            <>
              <BookmarkCheck size={14} aria-hidden="true" /> Saved
            </>
          ) : (
            <>
              <Bookmark size={14} aria-hidden="true" /> Save
            </>
          )}
        </button>

        <div className="community-message__reactions">
          {COMMUNITY_EMOJIS.map((emoji) => {
            const reaction = (message.reactions || []).find((item) => item.emoji === emoji);
            return (
              <button
                key={`${message.id}-${emoji}`}
                type="button"
                className={reaction?.reactedByCurrentUser ? "is-active" : ""}
                onClick={() => onReact(message.id, emoji)}
              >
                {emoji} {reaction?.count || 0}
              </button>
            );
          })}
        </div>

        {canModerate ? (
          <div className="community-message__moderation">
            <button type="button" onClick={() => onModerate(message.id, message.isHidden ? "unhide" : "hide")}>
              {message.isHidden ? "Unhide" : "Hide"}
            </button>
            <button
              type="button"
              onClick={() =>
                onModerate(message.id, message.threadLocked ? "unlock-thread" : "lock-thread")
              }
            >
              {message.threadLocked ? (
                <LockOpen size={14} aria-hidden="true" />
              ) : (
                <Lock size={14} aria-hidden="true" />
              )}
              {message.threadLocked ? "Unlock thread" : "Lock thread"}
            </button>
            {onWarnUser ? (
              <button type="button" onClick={() => onWarnUser(message)}>
                <AlertTriangle size={14} aria-hidden="true" /> Warn
              </button>
            ) : null}
            {onBanUser ? (
              <button type="button" onClick={() => onBanUser(message)}>
                {message.authorModerationStatus === "BANNED" ? (
                  <>
                    <UserRoundCheck size={14} aria-hidden="true" /> Unban
                  </>
                ) : (
                  <>
                    <UserMinus size={14} aria-hidden="true" /> Ban
                  </>
                )}
              </button>
            ) : null}
          </div>
        ) : null}
      </footer>

      {message.replies?.length ? (
        <div className={`community-message__replies depth-${depth + 1}`}>
          {message.replies.map((reply) => (
            <MessageNode
              key={reply.id}
              message={reply}
              depth={depth + 1}
              canModerate={canModerate}
              onReply={onReply}
              onReact={onReact}
              onHelpful={onHelpful}
              onReport={onReport}
              onBookmark={onBookmark}
              onModerate={onModerate}
              onWarnUser={onWarnUser}
              onBanUser={onBanUser}
            />
          ))}
        </div>
      ) : null}
    </article>
  );
});

MessageNode.displayName = "MessageNode";

const MessageThreadList = ({
  messages,
  canModerate = false,
  loading = false,
  onReply = noop,
  onReact = noop,
  onHelpful = noop,
  onReport = noop,
  onBookmark = noop,
  onModerate = noop,
  onWarnUser = null,
  onBanUser = null,
  pageSize = PAGE_SIZE,
}) => {
  const scrollRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [page, setPage] = useState(1);
  const syntheticLoadEnabled = isSyntheticLoadEnabled();
  const virtualizationConfig = useMemo(
    () => resolveVirtualizationTuning({ scope: "thread", syntheticLoadEnabled }),
    [syntheticLoadEnabled]
  );
  const [viewportHeight, setViewportHeight] = useState(
    virtualizationConfig.defaultViewportHeight
  );
  const effectivePageSize = syntheticLoadEnabled ? Math.max(pageSize, 240) : pageSize;

  useEffect(() => {
    logVirtualizationTuning({
      scope: "thread",
      config: virtualizationConfig,
      enabled: true,
    });
  }, [virtualizationConfig]);

  const effectiveMessages = useMemo(
    () => expandMessagesForSyntheticLoad(messages),
    [messages]
  );

  const visibleCount = page * effectivePageSize;

  const visibleMessages = useMemo(
    () => effectiveMessages.slice(0, visibleCount),
    [effectiveMessages, visibleCount]
  );
  const hasMore = effectiveMessages.length > visibleCount;

  const shouldVirtualize = visibleMessages.length >= virtualizationConfig.threshold;

  useEffect(() => {
    if (!shouldVirtualize) {
      return;
    }

    const node = scrollRef.current;
    if (!node) {
      return;
    }

    const updateViewport = () => {
      setViewportHeight(node.clientHeight || virtualizationConfig.defaultViewportHeight);
    };

    updateViewport();

    let resizeObserver;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(updateViewport);
      resizeObserver.observe(node);
    }

    window.addEventListener("resize", updateViewport);
    return () => {
      resizeObserver?.disconnect?.();
      window.removeEventListener("resize", updateViewport);
    };
  }, [shouldVirtualize, virtualizationConfig.defaultViewportHeight]);

  const virtualWindow = useMemo(() => {
    if (!shouldVirtualize) {
      return {
        visibleRows: visibleMessages,
        topSpacerHeight: 0,
        bottomSpacerHeight: 0,
      };
    }

    const estimatedHeight = virtualizationConfig.estimatedItemHeight;
    const overscanMessages = virtualizationConfig.overscan;

    const startIndex = Math.max(
      Math.floor(scrollTop / estimatedHeight) - overscanMessages,
      0
    );
    const visibleCountWithinViewport =
      Math.ceil(viewportHeight / estimatedHeight) + overscanMessages * 2;
    const endIndex = Math.min(startIndex + visibleCountWithinViewport, visibleMessages.length);

    return {
      visibleRows: visibleMessages.slice(startIndex, endIndex),
      topSpacerHeight: startIndex * estimatedHeight,
      bottomSpacerHeight: Math.max(
        (visibleMessages.length - endIndex) * estimatedHeight,
        0
      ),
    };
  }, [scrollTop, shouldVirtualize, viewportHeight, visibleMessages, virtualizationConfig]);

  if (loading) {
    return (
      <section className="community-card community-list-skeleton" aria-label="Loading messages">
        <div />
        <div />
        <div />
      </section>
    );
  }

  if (!effectiveMessages.length) {
    return (
      <section className="community-card community-empty-state">
        <h3>No messages yet</h3>
        <p>Be the first to ask a question in this channel.</p>
      </section>
    );
  }

  return (
    <section
      ref={scrollRef}
      className="community-message-list"
      onScroll={
        shouldVirtualize
          ? (event) => {
              setScrollTop(event.currentTarget.scrollTop || 0);
            }
          : undefined
      }
      style={
        shouldVirtualize
          ? {
              maxHeight: `${virtualizationConfig.defaultViewportHeight}px`,
              overflowY: "auto",
            }
          : undefined
      }
    >
      {virtualWindow.topSpacerHeight > 0 ? (
        <div aria-hidden="true" style={{ height: `${virtualWindow.topSpacerHeight}px` }} />
      ) : null}

      {virtualWindow.visibleRows.map((message) => (
        <MessageNode
          key={message.id}
          message={message}
          depth={0}
          canModerate={canModerate}
          onReply={onReply}
          onReact={onReact}
          onHelpful={onHelpful}
          onReport={onReport}
          onBookmark={onBookmark}
          onModerate={onModerate}
          onWarnUser={onWarnUser}
          onBanUser={onBanUser}
        />
      ))}

      {virtualWindow.bottomSpacerHeight > 0 ? (
        <div aria-hidden="true" style={{ height: `${virtualWindow.bottomSpacerHeight}px` }} />
      ) : null}

      {hasMore ? (
        <div className="community-pagination-row">
          <button type="button" className="btn-secondary" onClick={() => setPage((prev) => prev + 1)}>
            Load more discussions
          </button>
        </div>
      ) : null}
    </section>
  );
};

export default memo(MessageThreadList);
