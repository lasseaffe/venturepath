// VenturePath · Phase 2 · Gatherings hooks
// Two surfaces, both self-contained (no global store mutation):
//   useGatherings()           — all Gatherings visible to the signed-in Architect.
//                               Used by the standalone /events route.
//   useTripGatherings(tripId) — Gatherings bound to the current trip_id.
//                               Returns its own items[] so callers can pass them
//                               into RouteMap and TimelinePath as props.

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  listMyGatherings,
  listGatheringsForTrip,
  createGathering as apiCreateGathering,
  updateGathering as apiUpdateGathering,
  deleteGathering as apiDeleteGathering,
} from './api';
import { cacheGatherings } from './tacticalCache';

export function useGatherings() {
  const { architect } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    if (!architect?.id) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error: err } = await listMyGatherings();
    if (err) {
      setError(err.message);
      setItems([]);
    } else {
      setError(null);
      setItems(data ?? []);
      cacheGatherings(data ?? []);
    }
    setLoading(false);
  }, [architect?.id]);

  useEffect(() => { reload(); }, [reload]);

  const create = useCallback(async (input) => {
    if (!architect?.id) return { error: new Error('Sign in first.') };
    const result = await apiCreateGathering(input, { convenerId: architect.id });
    if (!result.error) await reload();
    return result;
  }, [architect?.id, reload]);

  const update = useCallback(async (id, patch) => {
    const result = await apiUpdateGathering(id, patch);
    if (!result.error) await reload();
    return result;
  }, [reload]);

  const remove = useCallback(async (id) => {
    const result = await apiDeleteGathering(id);
    if (!result.error) await reload();
    return result;
  }, [reload]);

  return { items, loading, error, reload, create, update, remove };
}

// Trip-scoped variant. Maintains its own items list so the TripPlanner section,
// RouteMap Pinpoint layer, and TimelinePath blocks all consume from the same source.
export function useTripGatherings(tripId) {
  const { architect } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    if (!architect?.id || !tripId) {
      setItems([]);
      return;
    }
    setLoading(true);
    const { data, error: err } = await listGatheringsForTrip(tripId);
    if (err) {
      setError(err.message);
      setItems([]);
    } else {
      setError(null);
      setItems(data ?? []);
      cacheGatherings(data ?? []);
    }
    setLoading(false);
  }, [architect?.id, tripId]);

  useEffect(() => { reload(); }, [reload]);

  return { items, loading, error, reload };
}
