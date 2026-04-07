import PropTypes from "prop-types";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ButtonBusyLabel } from "../../components/loading/LoadingPrimitives";

const SubmitConfirmationModal = ({
  open,
  stats,
  submitting,
  onCancel,
  onConfirm,
  modeLabel,
}) => {
  const dialogRef = useRef(null);
  const cancelButtonRef = useRef(null);

  useEffect(() => {
    if (!open || submitting) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onCancel();
        return;
      }

      if (event.key !== "Tab") return;

      const focusableSelectors = [
        "button:not([disabled])",
        "[href]",
        "input:not([disabled])",
        "select:not([disabled])",
        "textarea:not([disabled])",
        '[tabindex]:not([tabindex="-1"])',
      ];
      const focusableNodes = Array.from(
        dialogRef.current?.querySelectorAll(focusableSelectors.join(",")) || []
      );

      if (!focusableNodes.length) return;

      const first = focusableNodes[0];
      const last = focusableNodes[focusableNodes.length - 1];
      const isShift = event.shiftKey;
      const active = document.activeElement;

      if (!isShift && active === last) {
        event.preventDefault();
        first.focus();
      }

      if (isShift && active === first) {
        event.preventDefault();
        last.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel, open, submitting]);

  useEffect(() => {
    if (!open) return undefined;

    const html = document.documentElement;
    const body = document.body;
    const previousActiveElement = document.activeElement;

    html.classList.add("mcq-modal-scroll-lock");
    body.classList.add("mcq-modal-scroll-lock");

    const focusTimeoutId = window.setTimeout(() => {
      cancelButtonRef.current?.focus();
    }, 20);

    return () => {
      window.clearTimeout(focusTimeoutId);
      html.classList.remove("mcq-modal-scroll-lock");
      body.classList.remove("mcq-modal-scroll-lock");

      if (previousActiveElement instanceof HTMLElement) {
        previousActiveElement.focus();
      }
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className="mcq-submit-modal__backdrop"
      role="presentation"
      onClick={submitting ? undefined : onCancel}
    >
      <section
        className="mcq-submit-modal"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mcq-submit-title"
        aria-describedby="mcq-submit-description"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id="mcq-submit-title">Ready to Submit Your Exam?</h3>
        <p id="mcq-submit-description">
          {modeLabel} review is complete. Once submitted, answers cannot be changed.
        </p>
        {stats.notAnswered > 0 ? (
          <p className="mcq-submit-modal__warning">
            You still have {stats.notAnswered} unanswered question(s). You can continue
            reviewing or submit now.
          </p>
        ) : null}

        <div className="mcq-submit-modal__stats">
          <article>
            <strong>{stats.totalQuestions}</strong>
            <span>Total Questions</span>
          </article>
          <article>
            <strong>{stats.attempted}</strong>
            <span>Answered</span>
          </article>
          <article>
            <strong>{stats.notAnswered}</strong>
            <span>Unanswered</span>
          </article>
          <article>
            <strong>{stats.reviewMarked}</strong>
            <span>Marked for Review</span>
          </article>
        </div>

        <footer>
          <button
            type="button"
            className="btn-secondary"
            ref={cancelButtonRef}
            onClick={onCancel}
            disabled={submitting}
          >
            Continue Reviewing
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={onConfirm}
            disabled={submitting}
          >
            <ButtonBusyLabel
              busy={submitting}
              busyLabel="Submitting..."
              idleLabel="Submit Now"
            />
          </button>
        </footer>
      </section>
    </div>,
    document.body
  );
};

SubmitConfirmationModal.propTypes = {
  open: PropTypes.bool.isRequired,
  stats: PropTypes.shape({
    totalQuestions: PropTypes.number.isRequired,
    attempted: PropTypes.number.isRequired,
    notAnswered: PropTypes.number.isRequired,
    reviewMarked: PropTypes.number.isRequired,
  }).isRequired,
  submitting: PropTypes.bool.isRequired,
  onCancel: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  modeLabel: PropTypes.string,
};

SubmitConfirmationModal.defaultProps = {
  modeLabel: "Preview",
};

export default SubmitConfirmationModal;
