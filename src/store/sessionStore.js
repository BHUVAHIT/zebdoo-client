import { create } from "zustand";
import {
  createJSONStorage,
  devtools,
  persist,
  subscribeWithSelector,
} from "zustand/middleware";

const STORE_NAME = "zebdoo:session-store:v1";

const normalizeRole = (value) => String(value || "GUEST").trim().toUpperCase();

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
                userRole: normalizeRole(role),
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
          partialize: (state) => ({
            tabId: state.tabId,
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
