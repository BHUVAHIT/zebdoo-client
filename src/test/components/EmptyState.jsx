import PropTypes from "prop-types";

const EmptyState = ({ title, description, actionLabel, onAction, isError }) => (
  <section className={`mcq-empty-state ${isError ? "is-error" : ""}`}>
    <h3>{title}</h3>
    <p>{description}</p>
    {actionLabel && onAction ? (
      <button type="button" className="btn-primary" onClick={onAction}>
        {actionLabel}
      </button>
    ) : null}
  </section>
);

EmptyState.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  actionLabel: PropTypes.string,
  onAction: PropTypes.func,
  isError: PropTypes.bool,
};

EmptyState.defaultProps = {
  actionLabel: "",
  onAction: null,
  isError: false,
};

export default EmptyState;
