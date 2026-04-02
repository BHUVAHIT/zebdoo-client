import { memo } from "react";
import PropTypes from "prop-types";
import { formatSeconds } from "../utils/helpers";

const Timer = ({ duration, timeLeft }) => {
  const progress = duration ? Math.max(Math.min((timeLeft / duration) * 100, 100), 0) : 0;
  const isWarning = timeLeft <= 5 * 60;
  const isCritical = timeLeft <= 60;

  return (
    <div
      className={`test-timer ${isWarning ? "is-warning" : ""} ${isCritical ? "is-critical" : ""}`}
      role="timer"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="test-timer__meta">
        <span>Time Left</span>
        <strong>{formatSeconds(timeLeft)}</strong>
      </div>
      <div className="test-timer__track" aria-hidden="true">
        <span className="test-timer__fill" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
};

Timer.propTypes = {
  duration: PropTypes.number.isRequired,
  timeLeft: PropTypes.number.isRequired,
};

export default memo(Timer);