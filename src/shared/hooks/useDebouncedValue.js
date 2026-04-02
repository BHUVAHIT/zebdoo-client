import { useEffect, useState } from "react";

export const useDebouncedValue = (value, delayMs = 220) => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setDebounced(value);
    }, Math.max(Number(delayMs) || 0, 0));

    return () => {
      window.clearTimeout(timerId);
    };
  }, [delayMs, value]);

  return debounced;
};
