import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { routeBuilders, ROUTES } from "../../../routes/routePaths";
import SidebarLogout from "../../../components/SidebarLogout";
import useAuth from "../../../hooks/useAuth";
import {
  getInitials,
  getStudentProfile,
} from "../../../services/studentProfileService";
import "./studentPortalLayout.css";

const NAV_ITEMS = [
  { label: "Dashboard", to: ROUTES.student.dashboard },
  { label: "Assessment Session", to: routeBuilders.assessmentSession.root },
  { label: "Exam Vault", to: routeBuilders.testPapers.root },
  { label: "Assessment Results", to: ROUTES.assessment.result },
];

const SEGMENT_LABELS = {
  dashboard: "Dashboard",
  "test-papers": "Exam Vault",
  assessment: "Assessment",
  session: "Session",
  result: "Result",
  chapters: "Chapters",
  "chapter-wise": "Chapter Wise",
  "full-syllabus": "Full Syllabus",
  difficulty: "Difficulty",
  attempt: "Attempt",
  preview: "Preview",
  student: "Student",
  profile: "Profile",
};

const buildBreadcrumbs = (pathname) => {
  const segments = pathname.split("/").filter(Boolean);
  if (!segments.length) return [{ label: "Home" }];

  let cumulative = "";
  return segments.map((segment) => {
    cumulative += `/${segment}`;
    const isIdentifier = /\d/.test(segment) || segment.length > 20;
    const normalizedSegment = segment.toLowerCase();
    return {
      label: isIdentifier
        ? "Selection"
        : SEGMENT_LABELS[normalizedSegment] || segment.replace(/-/g, " "),
      to: cumulative,
    };
  });
};

const StudentPortalLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const breadcrumbs = useMemo(() => buildBreadcrumbs(location.pathname), [location.pathname]);
  const studentProfile = useMemo(() => getStudentProfile(user), [user]);

  const closeSidebar = useCallback(() => {
    setIsSidebarOpen(false);
  }, []);

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen((prev) => !prev);
  }, []);

  const toggleProfileMenu = useCallback(() => {
    setIsProfileMenuOpen((prev) => !prev);
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    html.classList.add("student-portal-scroll-lock");
    body.classList.add("student-portal-scroll-lock");

    return () => {
      html.classList.remove("student-portal-scroll-lock");
      body.classList.remove("student-portal-scroll-lock");
    };
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!menuRef.current || menuRef.current.contains(event.target)) return;
      setIsProfileMenuOpen(false);
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setIsSidebarOpen(false);
      setIsProfileMenuOpen(false);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [location.pathname]);

  return (
    <div className="student-portal-shell">
      <button
        type="button"
        className="student-portal-shell__mobile-toggle"
        onClick={toggleSidebar}
        aria-label={isSidebarOpen ? "Close navigation menu" : "Open navigation menu"}
      >
        {isSidebarOpen ? "Close" : "Menu"}
      </button>

      {isSidebarOpen ? (
        <button
          type="button"
          className="student-portal-shell__backdrop"
          aria-label="Close navigation"
          onClick={closeSidebar}
        />
      ) : null}

      <aside className={`student-portal-sidebar ${isSidebarOpen ? "is-open" : ""}`}>
        <div className="student-portal-sidebar__brand">
          <h1>Zebdoo Student</h1>
          <p>Assessment and performance hub</p>
        </div>

        <nav className="student-portal-sidebar__nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `student-portal-sidebar__link ${isActive ? "is-active" : ""}`
              }
              onClick={closeSidebar}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <SidebarLogout
          className="student-portal-sidebar__logout"
          onLoggedOut={closeSidebar}
        />
      </aside>

      <main className="student-portal-main">
        <header className="student-portal-main__header">
          <div className="student-portal-main__intro">
            <p className="student-portal-main__kicker">Student Workspace</p>
            <h2>Welcome, {studentProfile.name || "Learner"}</h2>
            <nav className="student-portal-main__breadcrumb" aria-label="Breadcrumb">
              {breadcrumbs.map((item, index) => (
                <span key={`${item.label}-${item.to}`}>
                  {index > 0 ? <em>/</em> : null}
                  {item.to && index < breadcrumbs.length - 1 ? (
                    <Link to={item.to}>{item.label}</Link>
                  ) : (
                    <span>{item.label}</span>
                  )}
                </span>
              ))}
            </nav>
          </div>

          <div className="student-portal-main__profile-menu" ref={menuRef}>
            <button
              type="button"
              className="student-portal-main__identity"
              onClick={toggleProfileMenu}
              aria-expanded={isProfileMenuOpen}
              aria-haspopup="menu"
            >
              <span className="student-portal-main__avatar">
                {studentProfile.avatarUrl ? (
                  <img src={studentProfile.avatarUrl} alt={studentProfile.name} />
                ) : (
                  <em>{getInitials(studentProfile.name)}</em>
                )}
              </span>
              <span className="student-portal-main__identity-text">
                <strong>{studentProfile.name || "Learner"}</strong>
                <small>{studentProfile.email || "Student account"}</small>
              </span>
            </button>

            {isProfileMenuOpen ? (
              <div className="student-portal-main__dropdown" role="menu">
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    navigate(ROUTES.student.profile);
                  }}
                >
                  View Profile
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    navigate(`${ROUTES.student.profile}?edit=1`);
                  }}
                >
                  Edit Profile
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    logout({ onLoggedOut: () => setIsSidebarOpen(false) });
                  }}
                >
                  Logout
                </button>
              </div>
            ) : null}
          </div>
        </header>

        <div className="student-portal-main__content">{children}</div>
      </main>
    </div>
  );
};

export default StudentPortalLayout;
