import { memo } from "react";
import PropTypes from "prop-types";

const OptionItem = ({ option, optionLabel, isSelected, isDisabled, onSelect }) => {
  return (
    <button
      type="button"
      className={`test-option ${isSelected ? "is-selected" : ""}`}
      onClick={onSelect}
      disabled={isDisabled}
      aria-pressed={isSelected}
    >
      <span className="test-option__label">{optionLabel}</span>
      <span className="test-option__text">{option.text}</span>
      <span className={`test-option__indicator ${isSelected ? "is-selected" : ""}`} />
    </button>
  );
};

OptionItem.propTypes = {
  option: PropTypes.shape({
    id: PropTypes.string.isRequired,
    text: PropTypes.string.isRequired,
  }).isRequired,
  optionLabel: PropTypes.string.isRequired,
  isSelected: PropTypes.bool,
  isDisabled: PropTypes.bool,
  onSelect: PropTypes.func.isRequired,
};

OptionItem.defaultProps = {
  isSelected: false,
  isDisabled: false,
};

export default memo(OptionItem);