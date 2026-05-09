import { useState, useEffect, useRef, useCallback } from 'react';
import { searchStops } from '../utils/stopSearchEngine';
import { geocodeLocation } from '../utils/geocodeEngine';
import { fetchRoutes } from '../utils/routeEngine';

// Exported for tests
export function getVisitDurationSuggestion(placeType) {
  if (!placeType) return null;
  const t = placeType.toLowerCase();
  if (/museum|gallery|exhibition/.test(t))           return '~2.5h';
  if (/restaurant|café|cafe|coffee/.test(t))         return '~1.5h';
  if (/bar|nightclub|pub/.test(t))                   return '~2h';
  if (/park|nature|reserve|garden/.test(t))          return '~3h';
  if (/hik|trail/.test(t))                           return '~3h';
  if (/historic|landmark|monument|church|castle/.test(t)) return '~1.5h';
  if (/hotel|hostel|accommodation|lodge/.test(t))    return null;
  return null;
}

function useDebounceSearch(query, destCoords, tripDestination, delay = 400) {
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setSearching(true);
      const res = await searchStops(query, tripDestination, destCoords);
      setResults(res);
      setSearching(false);
    }, delay);
    return () => clearTimeout(timer.current);
  }, [query, destCoords, tripDestination, delay]);

  return { results, searching, clear: () => setResults([]) };
}

export function useSmartStop(trip) {
  const [destCoords, setDestCoords] = useState(null);

  // Resolved coords + place type for each field
  const [fromCoords, setFromCoords] = useState(null);
  const [toCoords, setToCoords]     = useState(null);
  const [toPlaceType, setToPlaceType] = useState(null);

  // Route data
  const [routes, setRoutes]               = useState([]);
  const [loadingRoutes, setLoadingRoutes] = useState(false);

  // Autocomplete query strings (decoupled from committed field values)
  const [fromQuery, setFromQuery] = useState('');
  const [toQuery, setToQuery]     = useState('');

  const fromAC = useDebounceSearch(fromQuery, destCoords, trip?.destination ?? '');
  const toAC   = useDebounceSearch(toQuery,   destCoords, trip?.destination ?? '');

  // Resolve trip destination coords once on mount
  useEffect(() => {
    if (!trip?.destination) return;
    geocodeLocation(trip.destination).then(coords => {
      if (coords) setDestCoords(coords);
    });
  }, [trip?.destination]);

  const triggerRoutesFetch = useCallback(async (from, to) => {
    if (!from || !to) return;
    setLoadingRoutes(true);
    setRoutes([]);
    try {
      const result = await fetchRoutes(from, to);
      setRoutes(result);
    } finally {
      setLoadingRoutes(false);
    }
  }, []);

  function pickFrom(place) {
    setFromQuery('');
    fromAC.clear();
    if (place.coords) {
      setFromCoords(place.coords);
      if (toCoords) triggerRoutesFetch(place.coords, toCoords);
    }
  }

  function pickTo(place) {
    setToQuery('');
    toAC.clear();
    if (place.coords) {
      setToCoords(place.coords);
      setToPlaceType(place.type ?? null);
      if (fromCoords) triggerRoutesFetch(fromCoords, place.coords);
    }
  }

  const visitDurationSuggestion = getVisitDurationSuggestion(toPlaceType);

  return {
    // Autocomplete
    fromQuery, setFromQuery,
    toQuery,   setToQuery,
    fromResults: fromAC.results,
    toResults:   toAC.results,
    fromSearching: fromAC.searching,
    toSearching:   toAC.searching,
    pickFrom,
    pickTo,
    // Routes
    routes,
    loadingRoutes,
    // Duration hint
    visitDurationSuggestion,
  };
}
