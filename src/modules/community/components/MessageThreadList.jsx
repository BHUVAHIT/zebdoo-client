import { memo, useMemo, useState } from "react";
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
  const [page, setPage] = useState(1);
  const visibleCount = page * pageSize;

  const visibleMessages = useMemo(() => messages.slice(0, visibleCount), [messages, visibleCount]);
  const hasMore = messages.length > visibleCount;

  if (loading) {
    return (
      <section className="community-card community-list-skeleton" aria-label="Loading messages">
        <div />
        <div />
        <div />
      </section>
    );
  }

  if (!messages.length) {
    return (
      <section className="community-card community-empty-state">
        <h3>No messages yet</h3>
        <p>Be the first to ask a question in this channel.</p>
      </section>
    );
  }

  return (
    <section className="community-message-list">
      {visibleMessages.map((message) => (
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

export default MessageThreadList;
