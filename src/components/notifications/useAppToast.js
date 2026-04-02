import { useContext } from "react";
import { ToastContext } from "./toastContext";

export const useAppToast = () => useContext(ToastContext);
