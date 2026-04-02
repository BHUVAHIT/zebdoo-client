import PropTypes from "prop-types";

const LoadingState = ({ label }) => (
  <div className="mcq-loading-state" role="status" aria-live="polite">
    <span className="mcq-loading-state__spinner" />
    <p>{label}</p>
  </div>
);

LoadingState.propTypes = {
  label: PropTypes.string,
};

LoadingState.defaultProps = {
  label: "Loading...",
};

export default LoadingState;
