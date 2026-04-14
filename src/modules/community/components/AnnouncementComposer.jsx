import { useMemo, useState } from "react";
import {
  ANNOUNCEMENT_PRIORITY_OPTIONS,
  ANNOUNCEMENT_PRIORITIES,
} from "../constants/community.constants";

const EMPTY_ANNOUNCEMENT = {
  title: "",
  bodyRichText: "",
  priority: ANNOUNCEMENT_PRIORITIES.GENERAL,
  scheduledFor: "",
  targetAudience: "ALL",
};

const toInputDateTime = (isoDate) => {
  if (!isoDate) return "";
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "";

  const timezoneOffset = date.getTimezoneOffset() * 60000;
  const local = new Date(date.getTime() - timezoneOffset);
  return local.toISOString().slice(0, 16);
};

const fromInputDateTime = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

const AnnouncementComposer = ({ editingAnnouncement, submitting, onCancel, onSubmit }) => {
  const initialFormValues = useMemo(() => {
    if (!editingAnnouncement) {
      return EMPTY_ANNOUNCEMENT;
    }

    return {
      title: editingAnnouncement.title || "",
      bodyRichText: editingAnnouncement.bodyRichText || "",
      priority: editingAnnouncement.priority || ANNOUNCEMENT_PRIORITIES.GENERAL,
      scheduledFor: toInputDateTime(editingAnnouncement.scheduledFor),
      targetAudience: editingAnnouncement.targetAudience || "ALL",
    };
  }, [editingAnnouncement]);

  const [formValues, setFormValues] = useState(initialFormValues);

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit({
      ...formValues,
      scheduledFor: fromInputDateTime(formValues.scheduledFor),
    });
  };

  return (
    <form className="community-card community-announcement-composer" onSubmit={handleSubmit}>
      <header>
        <h3>{editingAnnouncement ? "Edit announcement" : "Create announcement"}</h3>
        <p>Supports markdown-like text, links, bullets, and schedule publishing.</p>
      </header>

      <label>
        <span>Title</span>
        <input
          type="text"
          value={formValues.title}
          onChange={(event) => setFormValues((prev) => ({ ...prev, title: event.target.value }))}
          placeholder="Ex: Mock test strategy update"
          required
          minLength={6}
          maxLength={160}
        />
      </label>

      <label>
        <span>Priority</span>
        <select
          value={formValues.priority}
          onChange={(event) =>
            setFormValues((prev) => ({ ...prev, priority: event.target.value }))
          }
        >
          {ANNOUNCEMENT_PRIORITY_OPTIONS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span>Target audience (future-ready)</span>
        <select
          value={formValues.targetAudience}
          onChange={(event) =>
            setFormValues((prev) => ({ ...prev, targetAudience: event.target.value }))
          }
        >
          <option value="ALL">All</option>
          <option value="STUDENT">Students</option>
          <option value="SUPER_ADMIN">Super admins</option>
        </select>
      </label>

      <label>
        <span>Schedule publish (optional)</span>
        <input
          type="datetime-local"
          value={formValues.scheduledFor}
          onChange={(event) =>
            setFormValues((prev) => ({ ...prev, scheduledFor: event.target.value }))
          }
        />
      </label>

      <label>
        <span>Content</span>
        <textarea
          value={formValues.bodyRichText}
          onChange={(event) =>
            setFormValues((prev) => ({ ...prev, bodyRichText: event.target.value }))
          }
          rows={7}
          placeholder="Use **bold**, links [text](https://url), bullets, and code blocks."
          required
          minLength={12}
        />
      </label>

      <div className="community-inline-actions">
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? "Saving..." : editingAnnouncement ? "Update" : "Publish"}
        </button>
        {editingAnnouncement ? (
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Cancel edit
          </button>
        ) : null}
      </div>
    </form>
  );
};

export default AnnouncementComposer;
