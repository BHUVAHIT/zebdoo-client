import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check } from "lucide-react";

const getComparableValue = (value) => {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value);
};

const StyledSelect = ({
  label,
  value,
  options = [],
  onChange,
  placeholder = "Select",
  disabled = false,
  className = "",
  compact = false,
}) => {
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const rafRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [menuRect, setMenuRect] = useState(null);

  const selectedOption = useMemo(() => {
    return options.find(
      (option) => getComparableValue(option.value) === getComparableValue(value)
    );
  }, [options, value]);

  const buttonLabel = selectedOption?.label || placeholder;

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) {
      return;
    }

    const nextRect = trigger.getBoundingClientRect();
    const viewportPadding = 12;
    const maxWidth = Math.max(window.innerWidth - viewportPadding * 2, 220);
    const width = Math.min(Math.max(nextRect.width, 180), maxWidth);
    const spaceBelow = window.innerHeight - nextRect.bottom - viewportPadding;
    const spaceAbove = nextRect.top - viewportPadding;
    const prefersOpenUp = spaceBelow < 200 && spaceAbove > spaceBelow;
    const maxHeight = Math.max(160, Math.min(320, (prefersOpenUp ? spaceAbove : spaceBelow) - 8));

    const top = prefersOpenUp
      ? Math.max(viewportPadding, nextRect.top - maxHeight - 8)
      : nextRect.bottom + 8;
    const left = Math.min(nextRect.left, window.innerWidth - width - viewportPadding);

    setMenuRect((previous) => {
      if (
        previous &&
        previous.top === top &&
        previous.left === left &&
        previous.width === width &&
        previous.maxHeight === maxHeight
      ) {
        return previous;
      }

      return {
        top,
        left,
        width,
        maxHeight,
      };
    });
  }, []);

  const schedulePositionUpdate = useCallback(() => {
    if (rafRef.current) {
      return;
    }

    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      updatePosition();
    });
  }, [updatePosition]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      const trigger = triggerRef.current;
      const menu = menuRef.current;
      if (!trigger || !menu) {
        setMenuRect(null);
        setIsOpen(false);
        return;
      }

      if (trigger.contains(event.target) || menu.contains(event.target)) {
        return;
      }

      setMenuRect(null);
      setIsOpen(false);
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setMenuRect(null);
        setIsOpen(false);
      }
    };

    updatePosition();
    window.addEventListener("resize", schedulePositionUpdate, { passive: true });
    window.addEventListener("scroll", schedulePositionUpdate, true);
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      if (rafRef.current) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      window.removeEventListener("resize", schedulePositionUpdate);
      window.removeEventListener("scroll", schedulePositionUpdate, true);
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, schedulePositionUpdate, updatePosition]);

  return (
    <div
      className={`sa-select ${compact ? "is-compact" : ""} ${disabled ? "is-disabled" : ""} ${
        className || ""
      }`.trim()}
    >
      {label ? (
        <p className="sa-select__label">
          {label}
        </p>
      ) : null}

      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          if (disabled) {
            return;
          }

          setIsOpen((previous) => {
            const next = !previous;
            if (!next) {
              setMenuRect(null);
            }

            return next;
          });
        }}
        disabled={disabled}
        aria-expanded={isOpen}
        className={`sa-select__trigger ${isOpen ? "is-open" : ""}`.trim()}
      >
        <span className="sa-select__value" title={buttonLabel}>
          {buttonLabel}
        </span>
        <ChevronDown
          size={16}
          className={`sa-select__chevron ${isOpen ? "is-open" : ""}`.trim()}
          aria-hidden="true"
        />
      </button>

      {isOpen && menuRect
        ? createPortal(
            <div
              ref={menuRef}
              className="sa-select__menu"
              style={{
                top: `${menuRect.top}px`,
                left: `${menuRect.left}px`,
                width: `${menuRect.width}px`,
                maxHeight: `${menuRect.maxHeight}px`,
              }}
              role="listbox"
              aria-label={label || "Select options"}
            >
              {options.map((option) => {
                const isSelected =
                  getComparableValue(option.value) === getComparableValue(value);

                return (
                  <button
                    key={`${getComparableValue(option.value)}-${option.label}`}
                    type="button"
                    className={`sa-select__option ${isSelected ? "is-selected" : ""}`.trim()}
                    onClick={() => {
                      onChange(option.value);
                      setMenuRect(null);
                      setIsOpen(false);
                    }}
                  >
                    <span className="sa-select__option-label" title={option.label}>
                      {option.label}
                    </span>
                    {isSelected ? <Check size={14} className="sa-select__option-check" /> : null}
                  </button>
                );
              })}
            </div>,
            document.body
          )
        : null}
    </div>
  );
};

export default memo(StyledSelect);
