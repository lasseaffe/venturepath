import { useState, useEffect, useCallback } from 'react';

// Mock WebSocket sync — in production replace with Supabase realtime or Firebase
const SYNC_EVENTS = [];
const listeners = new Set();

function emit(event) {
  SYNC_EVENTS.push(event);
  listeners.forEach(fn => fn(event));
}

export function useSquadSync({ onPathCloned } = {}) {
  const [syncReady, setSyncReady] = useState(false);
  const [lastEvent, setLastEvent] = useState(null);

  useEffect(() => {
    const handler = (event) => {
      setLastEvent(event);
      if (event.type === 'PATH_CLONED' && onPathCloned) {
        onPathCloned(event.payload);
      }
    };
    listeners.add(handler);
    const t = setTimeout(() => setSyncReady(true), 800); // simulate handshake
    return () => {
      listeners.delete(handler);
      clearTimeout(t);
    };
  }, [onPathCloned]);

  const broadcastClone = useCallback((templateData) => {
    emit({ type: 'PATH_CLONED', payload: templateData, timestamp: Date.now() });
  }, []);

  const broadcastActivity = useCallback((message) => {
    emit({ type: 'ACTIVITY', payload: message, timestamp: Date.now() });
  }, []);

  return { syncReady, lastEvent, broadcastClone, broadcastActivity };
}
