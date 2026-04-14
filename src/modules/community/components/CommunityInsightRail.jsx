import { memo } from "react";
import { Bell, Flame, UsersRound } from "lucide-react";

const CommunityInsightRail = ({
  activeUsers = [],
  trendingTopics = [],
  announcements = [],
  onOpenAnnouncements,
}) => {
  return (
    <aside className="community-insight-rail" aria-label="Community insights">
      <section className="community-card community-insight-card">
        <header>
          <h3>
            <UsersRound size={16} aria-hidden="true" /> Active now
          </h3>
        </header>

        {!activeUsers.length ? <p className="community-muted">No active users yet.</p> : null}
        <ul>
          {activeUsers.map((user) => (
            <li key={user.userId}>
              <strong>{user.name}</strong>
              <span>{user.postsCount} posts</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="community-card community-insight-card">
        <header>
          <h3>
            <Flame size={16} aria-hidden="true" /> Trending topics
          </h3>
        </header>

        {!trendingTopics.length ? <p className="community-muted">No trending topics yet.</p> : null}
        <ul>
          {trendingTopics.map((topic) => (
            <li key={topic.topic}>
              <strong>#{topic.topic}</strong>
              <span>{topic.count} mentions</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="community-card community-insight-card">
        <header>
          <h3>
            <Bell size={16} aria-hidden="true" /> Announcement preview
          </h3>
          <button type="button" className="btn-secondary" onClick={onOpenAnnouncements}>
            Open all
          </button>
        </header>

        {!announcements.length ? <p className="community-muted">No announcements available.</p> : null}
        <ul>
          {announcements.map((announcement) => (
            <li key={announcement.id}>
              <strong>{announcement.title}</strong>
              <span>{announcement.priority}</span>
            </li>
          ))}
        </ul>
      </section>
    </aside>
  );
};

export default memo(CommunityInsightRail);
