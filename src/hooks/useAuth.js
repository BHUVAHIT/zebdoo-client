import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../routes/routePaths";
import { useAuthStore } from "../store/authStore";

export const useAuth = () => {
	const navigate = useNavigate();
	const user = useAuthStore((state) => state.user);
	const logoutStore = useAuthStore((state) => state.logout);

	const logout = useCallback(
		({ redirectTo = ROUTES.auth.login, replace = true, onLoggedOut, toast } = {}) => {
			logoutStore();

			if (typeof onLoggedOut === "function") {
				onLoggedOut();
			}

			if (toast?.notify) {
				toast.notify(
					toast.payload || {
						title: "Signed out",
						message: "Your session has ended successfully.",
						tone: "info",
					}
				);
			}

			navigate(redirectTo, { replace });
		},
		[logoutStore, navigate]
	);

	return {
		user,
		logout,
	};
};

export default useAuth;
