import { useState, useEffect, useCallback } from 'react';
import { listMyGatherings, listGatheringsForTrip } from './api.js';
import { cacheGatherings } from './tacticalCache.js';

export function useGatherings() {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listMyGatherings();
      setItems(data);
      cacheGatherings(data);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  return { items, loading, error, reload };
}

export function useTripGatherings(tripId) {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!tripId) { setItems([]); setLoading(false); return; }
    setLoading(true);
    const data = await listGatheringsForTrip(tripId);
    setItems(data);
    cacheGatherings(data);
    setLoading(false);
  }, [tripId]);

  useEffect(() => { reload(); }, [reload]);

  return { items, loading, reload };
}
