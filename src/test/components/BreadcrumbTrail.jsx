import PropTypes from "prop-types";
import { Link } from "react-router-dom";

const BreadcrumbTrail = ({ items }) => (
  <nav className="mcq-breadcrumb" aria-label="Test flow breadcrumb">
    {items.map((item, index) => {
      const isLast = index === items.length - 1;
      const key = `${item.label}-${index}`;

      return (
        <span key={key} className="mcq-breadcrumb__item">
          {item.to && !isLast ? <Link to={item.to}>{item.label}</Link> : <span>{item.label}</span>}
          {!isLast && <em aria-hidden="true">/</em>}
        </span>
      );
    })}
  </nav>
);

BreadcrumbTrail.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      to: PropTypes.string,
    })
  ).isRequired,
};

export default BreadcrumbTrail;
