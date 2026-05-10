const listeners = new Map();

const sentinelBus = {
  on(eventType, handler) {
    if (!listeners.has(eventType)) listeners.set(eventType, new Set());
    const set = listeners.get(eventType);
    set.add(handler);
    return () => set.delete(handler);
  },

  emit(eventType, payload) {
    listeners.get(eventType)?.forEach(h => h(payload));
  },

  _reset() {
    listeners.clear();
  },
};

export default sentinelBus;
