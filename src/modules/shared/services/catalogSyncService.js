import { syncCatalogSlicesFromSource } from "../../../infrastructure/adapters/catalogAdapter";
import { SYNC_EVENT } from "../../../shared/constants/syncEvents";
import { subscribeToSyncEvents } from "../../../shared/utils/syncChannel";
import { catalogStore } from "../../../store/catalogStore";

let isStarted = false;
let cleanup = () => {};

export const startCatalogSyncService = ({ onCatalogSynced } = {}) => {
  if (isStarted) {
    return cleanup;
  }

  const unsubscribe = subscribeToSyncEvents((event) => {
    if (event?.type !== SYNC_EVENT.CATALOG_UPDATED) {
      return;
    }

    if (event?.source === "local") {
      return;
    }

    catalogStore.getState().syncFromStorage();
    const nextVersion = syncCatalogSlicesFromSource();
    onCatalogSynced?.(nextVersion);
  });

  isStarted = true;
  cleanup = () => {
    unsubscribe?.();
    isStarted = false;
    cleanup = () => {};
  };

  return cleanup;
};
