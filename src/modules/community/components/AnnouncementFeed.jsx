import { Eye, Clock3 } from "lucide-react";
import PriorityPill from "./PriorityPill";
import { formatRelativeTime, renderCommunityMarkdown } from "../utils/communityMarkdown";

const AnnouncementFeed = ({
  announcements,
  canManage = false,
  loading = false,
  compact = false,
  maxItems = null,
  onMarkRead,
  onEdit,
  onDelete,
}) => {
  const rows = typeof maxItems === "number" ? announcements.slice(0, maxItems) : announcements;

  if (loading) {
    return (
      <section className="community-card community-list-skeleton" aria-label="Loading announcements">
        <div />
        <div />
        <div />
      </section>
    );
  }

  if (!announcements.length) {
    return (
      <section className="community-card community-empty-state">
        <h3>No announcements yet</h3>
        <p>Announcements will appear here as soon as admins publish updates.</p>
      </section>
    );
  }

  return (
    <section className="community-announcement-feed">
      {rows.map((announcement) => (
        <article
          key={announcement.id}
          className={`community-card community-announcement-card ${announcement.isRead ? "is-read" : "is-unread"} ${compact ? "is-compact" : ""}`}
        >
          <header>
            <div className="community-announcement-card__title-wrap">
              <PriorityPill priority={announcement.priority} />
              <h3>{announcement.title}</h3>
              {!announcement.isRead ? <span className="community-unread-dot">Unread</span> : null}
            </div>

            {canManage ? (
              <div className="community-inline-actions">
                <button type="button" className="btn-secondary" onClick={() => onEdit(announcement)}>
                  Edit
                </button>
                <button type="button" className="btn-secondary" onClick={() => onDelete(announcement.id)}>
                  Delete
                </button>
              </div>
            ) : (
              !announcement.isRead ? (
                <button type="button" className="btn-secondary" onClick={() => onMarkRead(announcement.id)}>
                  Mark read
                </button>
              ) : null
            )}
          </header>

          {!compact ? (
            <div className="community-rich-content">
              {renderCommunityMarkdown(announcement.bodyRichText, announcement.id)}
            </div>
          ) : null}

          <footer>
            <p>
              Posted by <strong>{announcement.createdBy?.name || "Admin"}</strong>
            </p>
            <span>
              <Clock3 size={14} aria-hidden="true" />
              {announcement.status === "SCHEDULED"
                ? `Scheduled ${formatRelativeTime(announcement.scheduledFor)}`
                : formatRelativeTime(announcement.publishedAt || announcement.createdAt)}
            </span>
            <span>
              <Eye size={14} aria-hidden="true" />
              {announcement.meta?.viewsCount || 0} views
            </span>
          </footer>
        </article>
      ))}
    </section>
  );
};

export default AnnouncementFeed;
