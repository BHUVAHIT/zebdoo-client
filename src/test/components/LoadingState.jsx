import PropTypes from "prop-types";
import { PageContentSkeleton } from "../../components/loading/LoadingPrimitives";

const LoadingState = ({ label }) => (
  <PageContentSkeleton
    className="mcq-loading-state"
    title={label}
    description="Building your next exam step. This usually takes a moment."
  />
);

LoadingState.propTypes = {
  label: PropTypes.string,
};

LoadingState.defaultProps = {
  label: "Preparing your assessment...",
};

export default LoadingState;
