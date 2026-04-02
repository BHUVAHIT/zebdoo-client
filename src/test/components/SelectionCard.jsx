import PropTypes from "prop-types";

const SelectionCard = ({
  title,
  subtitle,
  metaLeft,
  metaRight,
  onClick,
  selected,
  tone,
  disabled,
}) => (
  <button
    type="button"
    className={`mcq-selection-card ${selected ? "is-selected" : ""} ${tone ? `is-${tone}` : ""} ${
      disabled ? "is-disabled" : ""
    }`}
    onClick={onClick}
    disabled={disabled}
  >
    <div className="mcq-selection-card__head">
      <h3>{title}</h3>
      {metaRight ? <span>{metaRight}</span> : null}
    </div>
    <p>{subtitle}</p>
    {metaLeft ? <strong>{metaLeft}</strong> : null}
  </button>
);

SelectionCard.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  metaLeft: PropTypes.string,
  metaRight: PropTypes.string,
  onClick: PropTypes.func.isRequired,
  selected: PropTypes.bool,
  tone: PropTypes.string,
  disabled: PropTypes.bool,
};

SelectionCard.defaultProps = {
  subtitle: "",
  metaLeft: "",
  metaRight: "",
  selected: false,
  tone: "",
  disabled: false,
};

export default SelectionCard;
