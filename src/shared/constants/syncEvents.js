export const SYNC_CHANNEL_NAME = "zebdoo:runtime-sync:v1";
export const SYNC_STORAGE_KEY = "zebdoo:runtime-sync:storage:v1";

export const SYNC_EVENT = Object.freeze({
  CATALOG_UPDATED: "catalog.updated",
  SESSION_UPDATED: "session.updated",
});

export const SYNC_SOURCE = Object.freeze({
  LOCAL: "local",
  BROADCAST: "broadcast",
  STORAGE: "storage",
});
