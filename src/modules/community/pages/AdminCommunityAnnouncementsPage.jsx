import { useEffect, useMemo, useState } from "react";
import { Megaphone } from "lucide-react";
import { useAppToast } from "../../../components/notifications/useAppToast";
import useAuth from "../../../hooks/useAuth";
import AnnouncementComposer from "../components/AnnouncementComposer";
import AnnouncementFeed from "../components/AnnouncementFeed";
import {
  ANNOUNCEMENT_PRIORITY_OPTIONS,
  ANNOUNCEMENT_STATUS,
} from "../constants/community.constants";
import { useCommunityStore } from "../store/communityStore";
import "../community.css";

const AdminCommunityAnnouncementsPage = () => {
  const { user } = useAuth();
  const { pushToast } = useAppToast();
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");

  const {
    announcements,
    loading,
    error,
    bootstrapForActor,
    loadAnnouncements,
    upsertAnnouncement,
    deleteAnnouncement,
  } = useCommunityStore();

  useEffect(() => {
    if (!user) return;

    bootstrapForActor({ actor: user });
    loadAnnouncements({
      actor: user,
      query: {
        page: 1,
        pageSize: 20,
      },
    });
  }, [bootstrapForActor, loadAnnouncements, user]);

  const visibleAnnouncements = useMemo(
    () =>
      announcements.filter((item) => {
        const matchesSearch =
          !searchText ||
          `${item.title} ${item.bodyRichText}`.toLowerCase().includes(searchText.toLowerCase());
        const matchesStatus = !statusFilter || item.status === statusFilter;
        const matchesPriority = !priorityFilter || item.priority === priorityFilter;
        return matchesSearch && matchesStatus && matchesPriority;
      }),
    [announcements, priorityFilter, searchText, statusFilter]
  );

  return (
    <section className="community-shell">
      <header className="community-hero admin-mode">
        <div>
          <p>Announcements Management</p>
          <h1>Broadcast updates with priority and schedule control</h1>
          <span>
            Publish now or schedule, then monitor read/engagement trends from one panel.
          </span>
        </div>
        <div className="community-hero__chips">
          <article>
            <Megaphone size={16} aria-hidden="true" />
            <strong>{announcements.length}</strong>
            <small>Total announcements</small>
          </article>
        </div>
      </header>

      {error ? (
        <section className="community-card community-error-banner" role="alert">
          <p>{error}</p>
        </section>
      ) : null}

      <div className="community-admin-announcements-grid">
        <div className="community-admin-announcements-editor-stack">
          <AnnouncementComposer
            key={editingAnnouncement?.id || "new-announcement"}
            editingAnnouncement={editingAnnouncement}
            submitting={loading.mutation}
            onCancel={() => setEditingAnnouncement(null)}
            onSubmit={async (payload) => {
              const result = await upsertAnnouncement({
                actor: user,
                announcementId: editingAnnouncement?.id || null,
                payload,
              });

              if (!result.ok) {
                pushToast({
                  title: "Save failed",
                  message: result.error?.message || "Unable to save announcement.",
                  tone: "error",
                });
                return;
              }

              pushToast({
                title: "Announcement saved",
                message: "Your announcement has been updated.",
                tone: "success",
              });
              setEditingAnnouncement(null);
            }}
          />

          <section className="community-card community-announcement-filters">
            <h3>Announcement filters</h3>
            <input
              type="search"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Search title or content"
            />
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="">All statuses</option>
              {Object.values(ANNOUNCEMENT_STATUS).map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <select
              value={priorityFilter}
              onChange={(event) => setPriorityFilter(event.target.value)}
            >
              <option value="">All priorities</option>
              {ANNOUNCEMENT_PRIORITY_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </section>
        </div>

        <AnnouncementFeed
          canManage
          loading={loading.announcements || loading.bootstrap}
          announcements={visibleAnnouncements}
          onEdit={setEditingAnnouncement}
          onDelete={async (announcementId) => {
            const confirmed = window.confirm("Delete this announcement?");
            if (!confirmed) return;

            const result = await deleteAnnouncement({ actor: user, announcementId });
            if (!result.ok) {
              pushToast({
                title: "Delete failed",
                message: result.error?.message || "Unable to delete announcement.",
                tone: "error",
              });
              return;
            }

            if (editingAnnouncement?.id === announcementId) {
              setEditingAnnouncement(null);
            }

            pushToast({
              title: "Deleted",
              message: "Announcement removed.",
              tone: "info",
            });
          }}
          onMarkRead={() => {}}
        />
      </div>
    </section>
  );
};

export default AdminCommunityAnnouncementsPage;
