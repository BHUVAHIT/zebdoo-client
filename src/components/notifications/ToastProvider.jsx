import { useCallback, useMemo, useState } from "react";
import { ToastContext } from "./toastContext";

const TONE_CLASS = {
  info: "is-info",
  success: "is-success",
  warning: "is-warning",
  error: "is-error",
};

const normalizeTone = (tone) => (TONE_CLASS[tone] ? tone : "info");

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const pushToast = useCallback(
    ({ title, message, tone = "info", timeoutMs = 3200 }) => {
      const id = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      const normalizedTone = normalizeTone(tone);

      setToasts((prev) => [
        ...prev,
        {
          id,
          title: title || "Notice",
          message: message || "",
          tone: normalizedTone,
        },
      ]);

      window.setTimeout(() => {
        removeToast(id);
      }, timeoutMs);
    },
    [removeToast]
  );

  const value = useMemo(
    () => ({
      pushToast,
    }),
    [pushToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <aside className="app-toast-stack" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => (
          <article key={toast.id} className={`app-toast ${TONE_CLASS[toast.tone]}`}>
            <header>{toast.title}</header>
            {toast.message ? <p>{toast.message}</p> : null}
            <button
              type="button"
              className="app-toast__close"
              onClick={() => removeToast(toast.id)}
              aria-label="Dismiss notification"
            >
              x
            </button>
          </article>
        ))}
      </aside>
    </ToastContext.Provider>
  );
};
