import { useState, useRef, useCallback } from 'react';
import { getInspireResults, getAutocompleteResults, tripTypeFromClimate } from '../utils/adaptiveSearchEngine';
import { geocodeLocation } from '../utils/geocodeEngine';
import { useTripStore } from '../store/useTripStore';

const DEBOUNCE_MS = 300;

export function useAdaptiveSearch(strategy, destination, userRole, climate) {
  const { legs } = useTripStore();

  const [query, setQueryRaw] = useState('');
  const [results, setResults] = useState([]);
  const [inspireResults, setInspireResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [detailPoi, setDetailPoi] = useState(null);
  const [detailActions, setDetailActions] = useState([]);

  const geoRef = useRef(null);
  const debounceRef = useRef(null);

  async function getGeo() {
    if (geoRef.current) return geoRef.current;
    const geo = await geocodeLocation(destination);
    geoRef.current = geo;
    return geo;
  }

  function buildContext() {
    const pendingLeg = legs?.find(l => l.status === 'pending');
    return {
      currentLegCoords: pendingLeg?.coords ?? null,
      tripType: tripTypeFromClimate(climate),
      userRole,
    };
  }

  const handleFocus = useCallback(async () => {
    if (query.trim()) return;
    setLoading(true);
    try {
      await getGeo();
      const r = await getInspireResults(strategy, destination, buildContext());
      setInspireResults(r);
    } finally {
      setLoading(false);
    }
  }, [query, strategy, destination, userRole, climate]);

  const handleBlur = useCallback(() => {
    // Delay allows chip/row click events to fire before clearing state
    setTimeout(() => {
      setResults([]);
      setInspireResults([]);
    }, 200);
  }, []);

  const setQuery = useCallback((val) => {
    setQueryRaw(val);
    clearTimeout(debounceRef.current);
    if (!val.trim()) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await getAutocompleteResults(val, strategy, buildContext());
        setResults(r);
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);
  }, [strategy, destination, userRole, climate]);

  const openDetail = useCallback((poi, actions) => {
    setDetailPoi(poi);
    setDetailActions(actions);
    setResults([]);
    setInspireResults([]);
  }, []);

  const closeDetail = useCallback(() => {
    setDetailPoi(null);
    setDetailActions([]);
  }, []);

  return {
    query, setQuery,
    results, inspireResults,
    loading,
    handleFocus, handleBlur,
    detailPoi, detailActions,
    openDetail, closeDetail,
  };
}
