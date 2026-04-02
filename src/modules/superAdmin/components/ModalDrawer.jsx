import { X } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

const ModalDrawer = ({ open, title, children, onClose, width = "520px" }) => {
  const drawerRef = useRef(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    const previousOverscroll = document.body.style.overscrollBehaviorY;
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehaviorY = "none";

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.overscrollBehaviorY = previousOverscroll;
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose?.();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose, open]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const drawer = drawerRef.current;
    if (!drawer) {
      return undefined;
    }

    const previousFocus = document.activeElement;
    const getFocusableNodes = () =>
      Array.from(drawer.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
        (element) => !element.hasAttribute("disabled")
      );

    const focusables = getFocusableNodes();
    const firstFocusable = focusables[0] || drawer;
    requestAnimationFrame(() => {
      firstFocusable.focus();
    });

    const trapFocus = (event) => {
      if (event.key !== "Tab") {
        return;
      }

      const nodes = getFocusableNodes();
      if (!nodes.length) {
        event.preventDefault();
        drawer.focus();
        return;
      }

      const firstNode = nodes[0];
      const lastNode = nodes[nodes.length - 1];

      if (event.shiftKey && document.activeElement === firstNode) {
        event.preventDefault();
        lastNode.focus();
      } else if (!event.shiftKey && document.activeElement === lastNode) {
        event.preventDefault();
        firstNode.focus();
      }
    };

    drawer.addEventListener("keydown", trapFocus);

    return () => {
      drawer.removeEventListener("keydown", trapFocus);
      if (previousFocus && typeof previousFocus.focus === "function") {
        previousFocus.focus();
      }
    };
  }, [open]);

  if (!open) {
    return null;
  }

  return createPortal(
    <div
      className="sa-modal-overlay"
      role="presentation"
      onMouseDown={onClose}
    >
      <aside
        ref={drawerRef}
        className="sa-modal-panel"
        style={{ "--modal-width": width }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="sa-modal-header">
          <h3 id={titleId} className="text-lg font-bold text-slate-900 m-0">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="sa-modal-close"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </header>

        <div id={descriptionId} className="sa-modal-body">{children}</div>
      </aside>
    </div>,
    document.body
  );
};

export default ModalDrawer;
