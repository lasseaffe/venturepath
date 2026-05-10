const listeners = new Map();

const sentinelBus = {
  on(eventType, handler) {
    if (!listeners.has(eventType)) listeners.set(eventType, new Set());
    listeners.get(eventType).add(handler);
    return () => listeners.get(eventType)?.delete(handler);
  },

  emit(eventType, payload) {
    listeners.get(eventType)?.forEach(h => h(payload));
  },

  _reset() {
    listeners.clear();
  },
};

export default sentinelBus;
