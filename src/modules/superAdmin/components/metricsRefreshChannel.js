const listeners = new Set();

export const requestSuperAdminMetricsRefresh = () => {
  listeners.forEach((listener) => {
    try {
      listener?.();
    } catch {
      // Ignore listener errors to keep refresh fanout resilient.
    }
  });
};

export const subscribeSuperAdminMetricsRefresh = (listener) => {
  if (typeof listener !== "function") {
    return () => {};
  }

  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
