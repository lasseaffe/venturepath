import { useState, useCallback } from 'react';

const LIST_KEY = 'vp-expeditions';

function load() {
  try {
    const raw = localStorage.getItem(LIST_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function save(list) {
  try {
    localStorage.setItem(LIST_KEY, JSON.stringify(list));
  } catch { /* storage full */ }
}

/**
 * Manages a list of saved expedition snapshots.
 * Each item: { id, savedAt, trip, legs, objectives, manifestSettings }
 */
export function useExpeditionList() {
  const [expeditions, setExpeditions] = useState(load);

  const saveExpedition = useCallback((snapshot) => {
    setExpeditions(prev => {
      const exists = prev.find(e => e.id === snapshot.id);
      const updated = exists
        ? prev.map(e => e.id === snapshot.id ? { ...snapshot, savedAt: Date.now() } : e)
        : [{ ...snapshot, id: snapshot.id ?? crypto.randomUUID(), savedAt: Date.now() }, ...prev];
      save(updated);
      return updated;
    });
  }, []);

  const deleteExpedition = useCallback((id) => {
    setExpeditions(prev => {
      const updated = prev.filter(e => e.id !== id);
      save(updated);
      return updated;
    });
  }, []);

  return { expeditions, saveExpedition, deleteExpedition };
}
