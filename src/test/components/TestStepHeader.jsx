import PropTypes from "prop-types";
import BreadcrumbTrail from "./BreadcrumbTrail";

const TestStepHeader = ({ title, description, breadcrumbs, rightSlot }) => (
  <header className="mcq-step-header">
    <div>
      <BreadcrumbTrail items={breadcrumbs} />
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
    {rightSlot ? <div className="mcq-step-header__right">{rightSlot}</div> : null}
  </header>
);

TestStepHeader.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  breadcrumbs: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      to: PropTypes.string,
    })
  ).isRequired,
  rightSlot: PropTypes.node,
};

TestStepHeader.defaultProps = {
  rightSlot: null,
};

export default TestStepHeader;
