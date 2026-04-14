export const COMMUNITY_STORAGE_KEY = "zebdoo:community:db:v1";

export const COMMUNITY_TABS = Object.freeze({
  ANNOUNCEMENTS: "announcements",
  CHAT: "chat",
  CONTRIBUTORS: "contributors",
  BOOKMARKS: "bookmarks",
});

export const COMMUNITY_FEED_FILTERS = Object.freeze({
  LATEST: "LATEST",
  POPULAR: "POPULAR",
  UNANSWERED: "UNANSWERED",
});

export const COMMUNITY_FEED_FILTER_OPTIONS = Object.freeze([
  { value: COMMUNITY_FEED_FILTERS.LATEST, label: "Latest" },
  { value: COMMUNITY_FEED_FILTERS.POPULAR, label: "Popular" },
  { value: COMMUNITY_FEED_FILTERS.UNANSWERED, label: "Unanswered" },
]);

export const ANNOUNCEMENT_PRIORITIES = Object.freeze({
  IMPORTANT: "IMPORTANT",
  EVENT: "EVENT",
  UPDATE: "UPDATE",
  GENERAL: "GENERAL",
});

export const ANNOUNCEMENT_PRIORITY_OPTIONS = Object.freeze([
  { value: ANNOUNCEMENT_PRIORITIES.IMPORTANT, label: "Important" },
  { value: ANNOUNCEMENT_PRIORITIES.EVENT, label: "Event" },
  { value: ANNOUNCEMENT_PRIORITIES.UPDATE, label: "Update" },
  { value: ANNOUNCEMENT_PRIORITIES.GENERAL, label: "General" },
]);

export const ANNOUNCEMENT_STATUS = Object.freeze({
  PUBLISHED: "PUBLISHED",
  SCHEDULED: "SCHEDULED",
  ARCHIVED: "ARCHIVED",
});

export const REPORT_STATUS = Object.freeze({
  OPEN: "OPEN",
  RESOLVED: "RESOLVED",
  REJECTED: "REJECTED",
});

export const MODERATION_ACTIONS = Object.freeze({
  HIDE: "hide",
  UNHIDE: "unhide",
  LOCK_THREAD: "lock-thread",
  UNLOCK_THREAD: "unlock-thread",
});

export const MEMBER_MODERATION_STATUS = Object.freeze({
  CLEAN: "CLEAN",
  WARNED: "WARNED",
  BANNED: "BANNED",
});

export const RIGHT_RAIL_LIMITS = Object.freeze({
  ACTIVE_USERS: 6,
  TRENDING_TOPICS: 6,
  ANNOUNCEMENTS_PREVIEW: 4,
});

export const COMMUNITY_EMOJIS = Object.freeze(["👍", "🔥", "🎯", "💡", "🙌"]);

export const COMMUNITY_FEATURE_FLAGS = Object.freeze({
  pushNotificationsReady: true,
  moderationWordFilterPlaceholder: true,
});
