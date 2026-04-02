import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

const ConfirmDialog = ({ open, title, message, confirmLabel, onCancel, onConfirm, busy }) => {
  const dialogRef = useRef(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel?.();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onCancel, open]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const dialog = dialogRef.current;
    if (!dialog) {
      return undefined;
    }

    const previousFocus = document.activeElement;

    const getFocusableNodes = () =>
      Array.from(dialog.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
        (element) => !element.hasAttribute("disabled")
      );

    requestAnimationFrame(() => {
      const first = getFocusableNodes()[0] || dialog;
      first.focus();
    });

    const trapFocus = (event) => {
      if (event.key !== "Tab") {
        return;
      }

      const nodes = getFocusableNodes();
      if (!nodes.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = nodes[0];
      const last = nodes[nodes.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    dialog.addEventListener("keydown", trapFocus);

    return () => {
      dialog.removeEventListener("keydown", trapFocus);
      if (previousFocus && typeof previousFocus.focus === "function") {
        previousFocus.focus();
      }
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className="sa-modal-overlay"
      role="presentation"
      onMouseDown={onCancel}
    >
      <section
        ref={dialogRef}
        className="sa-modal-panel sa-confirm-dialog"
        style={{ "--modal-width": "430px" }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="sa-modal-header">
          <h3 id={titleId} className="text-lg font-bold text-slate-900 m-0">
            {title || "Confirm action"}
          </h3>
        </header>

        <div className="sa-modal-body">
          <p id={descriptionId} className="sa-confirm-dialog__message">
            {message || "This action cannot be undone."}
          </p>

          <div className="sa-confirm-dialog__actions">
            <button
              type="button"
              className="sa-btn"
              onClick={onCancel}
              disabled={busy}
            >
              Cancel
            </button>
            <button
              type="button"
              className="sa-btn sa-btn--danger"
              onClick={onConfirm}
              disabled={busy}
            >
              {busy ? "Please wait..." : confirmLabel || "Delete"}
            </button>
          </div>
        </div>
      </section>
    </div>,
    document.body
  );
};

export default ConfirmDialog;
