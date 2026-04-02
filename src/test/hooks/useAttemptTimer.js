import { useEffect, useRef } from "react";
import { useTestFlowStore } from "../store/testFlowStore";

export const useAttemptTimer = ({ enabled, onTimeout }) => {
  const endsAt = useTestFlowStore((state) => state.timer.endsAt);
  const syncTimer = useTestFlowStore((state) => state.syncTimer);

  const timeoutHandledRef = useRef(false);
  const onTimeoutRef = useRef(onTimeout);

  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  useEffect(() => {
    timeoutHandledRef.current = false;
  }, [endsAt]);

  useEffect(() => {
    if (!enabled || !endsAt) return undefined;

    const tick = () => {
      const next = syncTimer();
      if (next === 0 && !timeoutHandledRef.current) {
        timeoutHandledRef.current = true;
        onTimeoutRef.current?.();
      }
    };

    tick();
    const intervalId = window.setInterval(tick, 1000);

    return () => window.clearInterval(intervalId);
  }, [enabled, endsAt, syncTimer]);
};
