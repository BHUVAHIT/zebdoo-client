import { useEffect } from "react";
import { startCatalogSyncService } from "../../modules/shared/services/catalogSyncService";
import {
  subscribeToCatalogVersionChanges,
  syncCatalogSlicesFromSource,
} from "../../infrastructure/adapters/catalogAdapter";
import { useSessionStore } from "../../store/sessionStore";
import { startClientPerformanceAudit } from "../../shared/utils/performanceAudit";

const RuntimeSyncProvider = ({ children }) => {
  useEffect(() => {
    const session = useSessionStore.getState();

    const markSyncedVersion = (version) => {
      session.markCatalogVersion(version);
    };

    const initialVersion = syncCatalogSlicesFromSource();
    markSyncedVersion(initialVersion);
    const stopAudit = startClientPerformanceAudit();

    const stopCatalogSyncService = startCatalogSyncService({
      onCatalogSynced: markSyncedVersion,
    });

    const unsubscribeCatalog = subscribeToCatalogVersionChanges((nextVersion) => {
      syncCatalogSlicesFromSource();
      markSyncedVersion(nextVersion);
    });

    const handleOnline = () => session.setNetworkStatus("online");
    const handleOffline = () => session.setNetworkStatus("offline");

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      stopAudit?.();
      stopCatalogSyncService?.();
      unsubscribeCatalog?.();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return children;
};

export default RuntimeSyncProvider;
