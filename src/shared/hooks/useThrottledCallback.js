import { useCallback, useEffect, useRef } from "react";

export const useThrottledCallback = (callback, waitMs = 50) => {
  const callbackRef = useRef(callback);
  const lastExecutionRef = useRef(0);
  const pendingTimeoutRef = useRef(null);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    return () => {
      if (pendingTimeoutRef.current) {
        window.clearTimeout(pendingTimeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    (...args) => {
      const now = Date.now();
      const wait = Math.max(Number(waitMs) || 0, 0);
      const elapsed = now - lastExecutionRef.current;

      if (elapsed >= wait) {
        lastExecutionRef.current = now;
        callbackRef.current?.(...args);
        return;
      }

      if (pendingTimeoutRef.current) {
        window.clearTimeout(pendingTimeoutRef.current);
      }

      pendingTimeoutRef.current = window.setTimeout(() => {
        lastExecutionRef.current = Date.now();
        callbackRef.current?.(...args);
      }, wait - elapsed);
    },
    [waitMs]
  );
};
