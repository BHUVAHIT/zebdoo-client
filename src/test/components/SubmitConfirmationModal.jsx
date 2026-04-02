import PropTypes from "prop-types";

const SubmitConfirmationModal = ({
  open,
  stats,
  submitting,
  onCancel,
  onConfirm,
  modeLabel,
}) => {
  if (!open) return null;

  return (
    <div className="mcq-submit-modal__backdrop" role="presentation" onClick={onCancel}>
      <section
        className="mcq-submit-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Confirm submit"
        onClick={(event) => event.stopPropagation()}
      >
        <h3>Confirm Final Submission</h3>
        <p>
          {modeLabel} review is complete. Once submitted, answers cannot be changed.
        </p>

        <div className="mcq-submit-modal__stats">
          <article>
            <strong>{stats.totalQuestions}</strong>
            <span>Total</span>
          </article>
          <article>
            <strong>{stats.attempted}</strong>
            <span>Attempted</span>
          </article>
          <article>
            <strong>{stats.notAnswered}</strong>
            <span>Not Answered</span>
          </article>
          <article>
            <strong>{stats.reviewMarked}</strong>
            <span>Marked</span>
          </article>
        </div>

        <footer>
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Continue Reviewing
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={onConfirm}
            disabled={submitting}
          >
            {submitting ? "Submitting..." : "Submit Now"}
          </button>
        </footer>
      </section>
    </div>
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
