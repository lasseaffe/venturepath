import { useState, useCallback } from 'react';

export function useAdminLog() {
  const [lines, setLines] = useState([]);
  const [running, setRunning] = useState(false);

  const push = useCallback((type, message) => {
    setLines(prev => [...prev, { type, message, ts: new Date().toISOString() }]);
  }, []);

  const clear = useCallback(() => setLines([]), []);

  return { lines, running, setRunning, push, clear };
}
