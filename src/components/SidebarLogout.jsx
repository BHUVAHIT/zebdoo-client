import useAuth from "../hooks/useAuth";
import "./SidebarLogout.css";

const SidebarLogout = ({
  className = "",
  buttonClassName = "",
  label = "Logout",
  ariaLabel = "Logout",
  onLoggedOut,
  toast,
  requireConfirm = false,
  confirmMessage = "Are you sure you want to log out?",
}) => {
  const { logout } = useAuth();

  const handleLogout = () => {
    if (requireConfirm && !window.confirm(confirmMessage)) {
      return;
    }

    logout({ onLoggedOut, toast });
  };

  return (
    <div className={`sidebar-logout ${className}`.trim()}>
      <button
        type="button"
        className={`sidebar-logout__button ${buttonClassName}`.trim()}
        onClick={handleLogout}
        aria-label={ariaLabel}
      >
        <span className="sidebar-logout__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false">
            <path d="M15.75 3a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0V4.5H8.25A2.25 2.25 0 0 0 6 6.75v10.5A2.25 2.25 0 0 0 8.25 19.5H15V15.75a.75.75 0 0 1 1.5 0v4.5a.75.75 0 0 1-.75.75h-7.5A3.75 3.75 0 0 1 4.5 17.25V6.75A3.75 3.75 0 0 1 8.25 3h7.5Zm1.72 5.78a.75.75 0 0 1 1.06 0l2.69 2.69a.75.75 0 0 1 0 1.06l-2.69 2.69a.75.75 0 1 1-1.06-1.06l1.41-1.41H10.5a.75.75 0 0 1 0-1.5h8.38l-1.41-1.41a.75.75 0 0 1 0-1.06Z" />
          </svg>
        </span>
        <span>{label}</span>
      </button>
    </div>
  );
};

export default SidebarLogout;