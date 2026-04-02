import PropTypes from "prop-types";
import { useTestFlowStore } from "../store/testFlowStore";

const formatTimer = (seconds) => {
  const normalized = Math.max(Number(seconds) || 0, 0);
  const mins = Math.floor(normalized / 60);
  const secs = normalized % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
};

const AttemptTimer = ({ durationSeconds, timeLeft }) => {
  const progress = durationSeconds
    ? Math.max(Math.min((timeLeft / durationSeconds) * 100, 100), 0)
    : 0;
  const isWarning = timeLeft <= 5 * 60;
  const isCritical = timeLeft <= 60;

  return (
    <div
      className={`mcq-attempt-timer ${isWarning ? "is-warning" : ""} ${
        isCritical ? "is-critical" : ""
      }`}
      role="timer"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="mcq-attempt-timer__row">
        <span>Time Left</span>
        <strong>{formatTimer(timeLeft)}</strong>
      </div>
      <div className="mcq-attempt-timer__track" aria-hidden="true">
        <span style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
};

export const LiveAttemptTimer = () => {
  const durationSeconds = useTestFlowStore((state) => state.timer.durationSeconds);
  const timeLeft = useTestFlowStore((state) => state.timer.timeLeft);

  return <AttemptTimer durationSeconds={durationSeconds} timeLeft={timeLeft} />;
};

AttemptTimer.propTypes = {
  durationSeconds: PropTypes.number.isRequired,
  timeLeft: PropTypes.number.isRequired,
};

export default AttemptTimer;
