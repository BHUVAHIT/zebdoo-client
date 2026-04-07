import { create } from "zustand";
import {
  createJSONStorage,
  devtools,
  persist,
  subscribeWithSelector,
} from "zustand/middleware";
import { isKnownRole, normalizeRole as normalizeAppRole } from "../routes/routePaths";

const STORE_NAME = "zebdoo:session-store:v1";

const normalizeSessionRole = (value) => {
  const normalized = normalizeAppRole(value);
  return isKnownRole(normalized) ? normalized : "GUEST";
};

const createTabId = () => `tab-${Date.now()}-${Math.round(Math.random() * 1_000_000)}`;

export const useSessionStore = create(
  subscribeWithSelector(
    devtools(
      persist(
        (set) => ({
          tabId: createTabId(),
          activeRoute: "/",
          userRole: "GUEST",
          lastCatalogVersion: 0,
          lastSyncAt: 0,
          networkStatus:
            typeof navigator !== "undefined" && navigator.onLine ? "online" : "offline",

          hydrateRole: (role) => {
            set(
              {
                userRole: normalizeSessionRole(role),
              },
              false,
              "session/hydrateRole"
            );
          },

          setActiveRoute: (route) => {
            set(
              {
                activeRoute: String(route || "/"),
              },
              false,
              "session/setActiveRoute"
            );
          },

          markCatalogVersion: (version) => {
            set(
              {
                lastCatalogVersion: Number(version || 0),
                lastSyncAt: Date.now(),
              },
              false,
              "session/markCatalogVersion"
            );
          },

          setNetworkStatus: (status) => {
            set(
              {
                networkStatus: status === "offline" ? "offline" : "online",
              },
              false,
              "session/setNetworkStatus"
            );
          },
        }),
        {
          name: STORE_NAME,
          storage: createJSONStorage(() => window.localStorage),
          merge: (persistedState, currentState) => {
            const persisted = persistedState && typeof persistedState === "object" ? persistedState : {};

            return {
              ...currentState,
              ...persisted,
              tabId: createTabId(),
              userRole: normalizeSessionRole(persisted.userRole),
              activeRoute: String(persisted.activeRoute || currentState.activeRoute || "/"),
            };
          },
          partialize: (state) => ({
            activeRoute: state.activeRoute,
            userRole: state.userRole,
            lastCatalogVersion: state.lastCatalogVersion,
            lastSyncAt: state.lastSyncAt,
          }),
        }
      ),
      { name: "session-store" }
    )
  )
);
