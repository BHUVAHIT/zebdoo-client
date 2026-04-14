import { useEffect } from "react";
import { startCatalogSyncService } from "../../modules/shared/services/catalogSyncService";
import {
  subscribeToCatalogVersionChanges,
  syncCatalogSlicesFromSource,
} from "../../infrastructure/adapters/catalogAdapter";
import { useSessionStore } from "../../store/sessionStore";
import { startClientPerformanceAudit } from "../../shared/utils/performanceAudit";

const scheduleAfterFirstPaint = (runner) => {
  if (typeof window === "undefined") {
    return () => {};
  }

  let timeoutId = null;
  const rafId = window.requestAnimationFrame(() => {
    timeoutId = window.setTimeout(() => {
      runner?.();
    }, 0);
  });

  return () => {
    window.cancelAnimationFrame(rafId);
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
    }
  };
};

const scheduleIdleWork = (runner, timeout = 1400) => {
  if (typeof window === "undefined") {
    return () => {};
  }

  if (typeof window.requestIdleCallback === "function") {
    const idleId = window.requestIdleCallback(() => {
      runner?.();
    }, { timeout });

    return () => {
      window.cancelIdleCallback?.(idleId);
    };
  }

  const timeoutId = window.setTimeout(() => {
    runner?.();
  }, Math.min(timeout, 220));

  return () => {
    window.clearTimeout(timeoutId);
  };
};

const RuntimeSyncProvider = ({ children }) => {
  useEffect(() => {
    const session = useSessionStore.getState();
    let hasStartedRuntime = false;
    let stopAudit = () => {};
    let stopCatalogSyncService = () => {};
    let unsubscribeCatalog = () => {};

    const markSyncedVersion = (version) => {
      session.markCatalogVersion(version);
    };

    const startRuntimeSyncServices = () => {
      if (hasStartedRuntime) {
        return;
      }

      hasStartedRuntime = true;
      const initialVersion = syncCatalogSlicesFromSource();
      markSyncedVersion(initialVersion);

      stopCatalogSyncService =
        startCatalogSyncService({
          onCatalogSynced: markSyncedVersion,
        }) ||
        (() => {});

      unsubscribeCatalog =
        subscribeToCatalogVersionChanges((nextVersion) => {
          syncCatalogSlicesFromSource();
          markSyncedVersion(nextVersion);
        }) ||
        (() => {});
    };

    const cancelRuntimeStart = scheduleAfterFirstPaint(startRuntimeSyncServices);
    const cancelAuditStart = scheduleIdleWork(() => {
      stopAudit = startClientPerformanceAudit() || (() => {});
    }, 1800);

    const handleOnline = () => session.setNetworkStatus("online");
    const handleOffline = () => session.setNetworkStatus("offline");

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      cancelRuntimeStart?.();
      cancelAuditStart?.();
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
