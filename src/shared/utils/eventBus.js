export const createEventBus = () => {
  const listeners = new Set();

  return {
    subscribe(listener) {
      if (typeof listener !== "function") {
        return () => {};
      }

      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },

    emit(event) {
      listeners.forEach((listener) => {
        try {
          listener(event);
        } catch {
          // Keep bus emission resilient to individual subscriber errors.
        }
      });
    },
  };
};

export const runtimeEventBus = createEventBus();
