import {
  SYNC_CHANNEL_NAME,
  SYNC_SOURCE,
  SYNC_STORAGE_KEY,
} from "../constants/syncEvents";
import { runtimeEventBus } from "./eventBus";

const hasWindow = typeof window !== "undefined";
const instanceId = `${Date.now()}-${Math.round(Math.random() * 1_000_000)}`;

let broadcastChannel = null;

const canUseBroadcastChannel =
  hasWindow && typeof window.BroadcastChannel === "function";

if (canUseBroadcastChannel) {
  broadcastChannel = new window.BroadcastChannel(SYNC_CHANNEL_NAME);
}

const isValidEnvelope = (payload) => {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  return Boolean(payload?.event?.type) && Boolean(payload?.meta?.instanceId);
};

const buildEnvelope = (event, source = SYNC_SOURCE.LOCAL) => ({
  event,
  meta: {
    instanceId,
    source,
    timestamp: Date.now(),
  },
});

const parseStorageEnvelope = (raw) => {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    return isValidEnvelope(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const emitExternal = (envelope) => {
  if (!isValidEnvelope(envelope)) {
    return;
  }

  if (envelope.meta.instanceId === instanceId) {
    return;
  }

  runtimeEventBus.emit({
    ...envelope.event,
    source: envelope.meta.source,
    timestamp: envelope.meta.timestamp,
  });
};

if (broadcastChannel) {
  broadcastChannel.addEventListener("message", (messageEvent) => {
    emitExternal(messageEvent.data);
  });
}

if (hasWindow) {
  window.addEventListener("storage", (event) => {
    if (event.storageArea !== window.localStorage) return;
    if (event.key !== SYNC_STORAGE_KEY) return;

    const envelope = parseStorageEnvelope(event.newValue);
    if (!envelope) return;

    emitExternal(envelope);
  });
}

export const publishSyncEvent = (event) => {
  const envelope = buildEnvelope(event, SYNC_SOURCE.LOCAL);

  runtimeEventBus.emit({
    ...event,
    source: SYNC_SOURCE.LOCAL,
    timestamp: envelope.meta.timestamp,
  });

  if (broadcastChannel) {
    broadcastChannel.postMessage({
      ...envelope,
      meta: {
        ...envelope.meta,
        source: SYNC_SOURCE.BROADCAST,
      },
    });
    return;
  }

  if (!hasWindow) {
    return;
  }

  try {
    window.localStorage.setItem(
      SYNC_STORAGE_KEY,
      JSON.stringify({
        ...envelope,
        meta: {
          ...envelope.meta,
          source: SYNC_SOURCE.STORAGE,
        },
      })
    );
  } catch {
    // Ignore quota or unsupported storage failures.
  }
};

export const subscribeToSyncEvents = (listener) => runtimeEventBus.subscribe(listener);

export const getSyncInstanceId = () => instanceId;
