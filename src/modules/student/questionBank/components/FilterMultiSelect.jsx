import { memo, useEffect, useMemo, useRef, useState } from "react";

const formatSummary = (selectedCount, selectedLabels, placeholder) => {
  if (selectedCount === 0) return placeholder;
  if (selectedCount <= 2) return selectedLabels.join(", ");
  return `${selectedLabels.slice(0, 2).join(", ")} +${selectedCount - 2}`;
};

const FilterMultiSelect = ({
  id,
  label,
  options,
  value,
  placeholder,
  disabled,
  isOpen,
  onOpen,
  onClose,
  onChange,
}) => {
  const containerRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event) => {
      if (!containerRef.current || containerRef.current.contains(event.target)) return;
      onClose();
    };

    const handleEscape = (event) => {
      if (event.key !== "Escape") return;
      onClose();
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  const selectedIds = useMemo(() => (Array.isArray(value) ? value : []), [value]);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const filteredOptions = useMemo(() => {
    const normalizedSearch = String(searchTerm || "").trim().toLowerCase();
    if (!normalizedSearch) return options;

    return options.filter((option) =>
      option.label.toLowerCase().includes(normalizedSearch)
    );
  }, [options, searchTerm]);

  const selectedLabels = useMemo(
    () =>
      options
        .filter((option) => selectedSet.has(option.id))
        .map((option) => option.label),
    [options, selectedSet]
  );

  return (
    <div className="sqb-filter-field" ref={containerRef}>
      <span className="sqb-filter-field__label">{label}</span>

      <button
        type="button"
        className={`sqb-filter-field__trigger ${isOpen ? "is-open" : ""}`}
        onClick={() => {
          if (disabled) return;
          if (isOpen) {
            onClose();
          } else {
            setSearchTerm("");
            onOpen();
          }
        }}
        disabled={disabled}
        aria-expanded={isOpen}
        aria-controls={`${id}-menu`}
      >
        <span>{formatSummary(selectedIds.length, selectedLabels, placeholder)}</span>
        <strong aria-hidden="true">▾</strong>
      </button>

      {isOpen ? (
        <div className="sqb-filter-dropdown" id={`${id}-menu`} role="listbox">
          <div className="sqb-filter-dropdown__search-wrap">
            <input
              type="search"
              className="sqb-filter-dropdown__search"
              placeholder="Search chapters"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>

          <div className="sqb-filter-dropdown__list">
            {filteredOptions.length === 0 ? (
              <p className="sqb-filter-dropdown__empty">No matches</p>
            ) : (
              filteredOptions.map((option) => {
                const checked = selectedSet.has(option.id);

                return (
                  <label key={option.id} className="sqb-filter-dropdown__checkbox-option">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) => {
                        if (event.target.checked) {
                          onChange([...selectedIds, option.id]);
                        } else {
                          onChange(selectedIds.filter((idItem) => idItem !== option.id));
                        }
                      }}
                    />
                    <span>{option.label}</span>
                  </label>
                );
              })
            )}
          </div>

          <div className="sqb-filter-dropdown__actions">
            <button
              type="button"
              className="sqb-filter-dropdown__action"
              onClick={() => onChange([])}
            >
              Clear
            </button>
            <button
              type="button"
              className="sqb-filter-dropdown__action"
              onClick={() => onChange(filteredOptions.map((option) => option.id))}
            >
              Select visible
            </button>
            <button
              type="button"
              className="sqb-filter-dropdown__action is-primary"
              onClick={onClose}
            >
              Done
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default memo(FilterMultiSelect);
