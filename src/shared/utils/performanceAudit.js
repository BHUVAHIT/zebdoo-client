const DEV_ONLY = import.meta.env?.DEV;

export const startClientPerformanceAudit = () => {
  if (!DEV_ONLY || typeof window === "undefined" || typeof PerformanceObserver === "undefined") {
    return () => {};
  }

  const observers = [];

  const createObserver = (entryType, logger) => {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => logger(entry));
      });

      observer.observe({ type: entryType, buffered: true });
      observers.push(observer);
    } catch {
      // Unsupported entry type in current browser.
    }
  };

  createObserver("paint", (entry) => {
    if (entry.name === "first-contentful-paint") {
      console.info("[perf] FCP", Math.round(entry.startTime));
    }
  });

  createObserver("largest-contentful-paint", (entry) => {
    console.info("[perf] LCP", Math.round(entry.startTime));
  });

  createObserver("longtask", (entry) => {
    if (entry.duration < 120) return;
    console.info("[perf] Long task", Math.round(entry.duration));
  });

  return () => {
    observers.forEach((observer) => observer.disconnect());
  };
};
