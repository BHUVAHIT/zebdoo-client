import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { ChevronDown, ChevronLeft, ChevronRight, Menu, X } from "lucide-react";
import { ROUTES } from "../../../routes/routePaths";
import {
  PREFETCH_PRIORITY,
  prefetchRouteByPath,
  scheduleIdlePrefetch,
} from "../../../routes/routePrefetch";
import { useAppToast } from "../../../components/notifications/useAppToast";
import SidebarLogout from "../../../components/SidebarLogout";
import useAuth from "../../../hooks/useAuth";

const NAV_ITEMS = [
  { label: "Dashboard", shortLabel: "DB", to: ROUTES.admin.dashboard },
  { label: "QA Checklist", shortLabel: "QA", to: ROUTES.admin.qaChecklist },
  { label: "Students", shortLabel: "ST", to: ROUTES.admin.students },
  { label: "Subjects", shortLabel: "SU", to: ROUTES.admin.subjects },
  { label: "Chapters", shortLabel: "CH", to: ROUTES.admin.chapters },
  { label: "Tests", shortLabel: "TE", to: ROUTES.admin.tests },
  { label: "Questions", shortLabel: "QU", to: ROUTES.admin.questions },
  { label: "Test Papers", shortLabel: "TP", to: ROUTES.admin.testPapers },
  { label: "Community", shortLabel: "CO", to: ROUTES.admin.community },
  {
    label: "Announcements",
    shortLabel: "AN",
    to: ROUTES.admin.communityAnnouncements,
  },
  {
    label: "Moderation",
    shortLabel: "MO",
    to: ROUTES.admin.communityModeration,
  },
];

const SuperAdminLayout = ({ children }) => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { pushToast } = useAppToast();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);
  const contentScrollRef = useRef(null);
  const prefetchedRouteSetRef = useRef(new Set());

  const activeSection =
    NAV_ITEMS.find((item) => location.pathname.startsWith(item.to))?.label || "Dashboard";

  const userName = String(user?.name || "Super Admin").trim() || "Super Admin";
  const userRole = String(user?.role || "SUPER_ADMIN").trim() || "SUPER_ADMIN";

  const userInitials = useMemo(() => {
    const parts = userName
      .split(/\s+/)
      .map((part) => part.trim())
      .filter(Boolean)
      .slice(0, 2);

    if (!parts.length) {
      return "SA";
    }

    return parts.map((part) => part[0]?.toUpperCase() || "").join("");
  }, [userName]);

  const supportsFinePointer = useMemo(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return true;
    }

    return window.matchMedia("(pointer: fine)").matches;
  }, []);

  const prefetchNavigationRoute = useCallback((to) => {
    if (!supportsFinePointer) {
      return;
    }

    const normalizedPath = String(to || "");
    if (!normalizedPath || prefetchedRouteSetRef.current.has(normalizedPath)) {
      return;
    }

    prefetchedRouteSetRef.current.add(normalizedPath);

    scheduleIdlePrefetch(() => {
      prefetchRouteByPath(to, { priority: PREFETCH_PRIORITY.HIGH });
    }, 220);
  }, [supportsFinePointer]);

  useEffect(() => {
    if (!mobileOpen && !profileMenuOpen) {
      return undefined;
    }

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
        setProfileMenuOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileOpen, profileMenuOpen]);

  useEffect(() => {
    if (!mobileOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileOpen(false);
    setProfileMenuOpen(false);
  }, [location.key]);

  useLayoutEffect(() => {
    const scrollContainer = contentScrollRef.current;
    if (!scrollContainer) {
      return undefined;
    }

    const storageKey = `sa:scroll:${location.key}`;
    let restoredPosition = 0;

    try {
      const stored = window.sessionStorage.getItem(storageKey);
      const parsed = Number(stored);
      restoredPosition = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
    } catch {
      restoredPosition = 0;
    }

    scrollContainer.scrollTo({
      top: restoredPosition,
      left: 0,
      behavior: "auto",
    });

    return () => {
      try {
        window.sessionStorage.setItem(storageKey, String(scrollContainer.scrollTop || 0));
      } catch {
        // Ignore storage failures; scroll reset still defaults to top for new routes.
      }
    };
  }, [location.key]);

  useEffect(() => {
    if (!profileMenuOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (profileMenuRef.current?.contains(event.target)) {
        return;
      }

      setProfileMenuOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [profileMenuOpen]);

  return (
    <div className={`sa-shell ${sidebarCollapsed ? "is-collapsed" : ""} ${mobileOpen ? "is-drawer-open" : ""}`}>
      <aside id="sa-sidebar" className={`sa-sidebar ${mobileOpen ? "is-open" : ""}`}>
        <div className="sa-brand">
          <h1 className="sa-brand__title">
            <span className="sa-brand__full">Zebdoo Admin</span>
            <span className="sa-brand__compact" aria-hidden="true">ZA</span>
          </h1>
          <p className="sa-brand__subtitle">Enterprise Control</p>
        </div>

        <nav className="sa-nav" aria-label="Admin navigation">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `sa-nav__link ${isActive ? "is-active" : ""}`}
              onMouseEnter={() => prefetchNavigationRoute(item.to)}
              onFocus={() => prefetchNavigationRoute(item.to)}
              onClick={() => {
                setMobileOpen(false);
                setProfileMenuOpen(false);
              }}
            >
              <span className="sa-nav__link-text">{item.label}</span>
              <span className="sa-nav__link-short" aria-hidden="true">
                {item.shortLabel}
              </span>
            </NavLink>
          ))}
        </nav>

        <SidebarLogout
          className="mt-auto"
          buttonClassName="w-full justify-center px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-semibold transition-colors"
          onLoggedOut={() => setMobileOpen(false)}
          toast={{
            notify: pushToast,
            payload: {
              title: "Signed out",
              message: "Your session has ended successfully.",
              tone: "info",
            },
          }}
        />
      </aside>

      {mobileOpen && (
        <button
          type="button"
          className="sa-sidebar-backdrop"
          aria-label="Close navigation menu"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <section className="sa-main">
        <header className="sa-header">
          <div className="sa-header__inner">
            <div className="sa-header__left">
              <button
                type="button"
                className="sa-icon-btn sa-icon-btn--mobile lg:hidden"
                aria-expanded={mobileOpen}
                aria-controls="sa-sidebar"
                aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
                onClick={() => setMobileOpen((prev) => !prev)}
              >
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>

              <button
                type="button"
                className="sa-icon-btn sa-icon-btn--desktop"
                aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                onClick={() => setSidebarCollapsed((prev) => !prev)}
                title={sidebarCollapsed ? "Expand" : "Collapse"}
              >
                {sidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
              </button>

              <div className="sa-header__title-wrap">
                <p className="sa-header__kicker">Enterprise Management</p>
                <h2 className="sa-header__title">{activeSection}</h2>
              </div>
            </div>

            <div className="relative" ref={profileMenuRef}>
              <button
                type="button"
                className="sa-profile-trigger"
                aria-haspopup="menu"
                aria-expanded={profileMenuOpen}
                onClick={() => setProfileMenuOpen((prev) => !prev)}
              >
                <span className="sa-profile-avatar" aria-hidden="true">
                  {userInitials}
                </span>

                <span className="sa-profile-meta">
                  <span className="sa-profile-name" title={userName}>{userName}</span>
                  <span className="sa-profile-role">{userRole}</span>
                </span>

                <ChevronDown
                  size={16}
                  className={`sa-profile-chevron ${profileMenuOpen ? "is-open" : ""}`}
                  aria-hidden="true"
                />
              </button>

              {profileMenuOpen ? (
                <div className="sa-profile-menu" role="menu" aria-label="Profile menu">
                  <div className="sa-profile-menu__summary">
                    <span className="sa-profile-avatar sa-profile-avatar--menu" aria-hidden="true">
                      {userInitials}
                    </span>

                    <div className="sa-profile-menu__meta">
                      <p className="sa-profile-menu__name" title={userName}>{userName}</p>
                      <p className="sa-profile-menu__role">{userRole}</p>
                    </div>
                  </div>

                  <div className="sa-profile-menu__divider" role="presentation" />

                  <button
                    type="button"
                    className="sa-profile-menu__item sa-profile-menu__item--danger"
                    role="menuitem"
                    onClick={() => {
                      setProfileMenuOpen(false);
                      logout({
                        onLoggedOut: () => {
                          setMobileOpen(false);
                        },
                        toast: {
                          notify: pushToast,
                          payload: {
                            title: "Signed out",
                            message: "Your session has ended successfully.",
                            tone: "info",
                          },
                        },
                      });
                    }}
                  >
                    Sign out
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <div className="sa-main__scroll" ref={contentScrollRef}>
          <div className="sa-main__content">
            {children}
          </div>
        </div>
      </section>
    </div>
  );
};

export default SuperAdminLayout;
