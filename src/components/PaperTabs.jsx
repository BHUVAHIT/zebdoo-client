import { memo } from "react";

const PaperTabs = ({ options = [], activeType, countByType = {}, onChange }) => {
  return (
    <div className="exam-vault-paper-tabs" role="tablist" aria-label="Paper type filters">
      {options.map((option) => {
        const count = countByType[option.value] || 0;
        const isActive = activeType === option.value;

        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`exam-vault-paper-tabs__btn ${isActive ? "is-active" : ""}`}
            onClick={() => onChange?.(option.value)}
          >
            <span>{option.label}</span>
            <small>{count}</small>
          </button>
        );
      })}
    </div>
  );
};

export default memo(PaperTabs);