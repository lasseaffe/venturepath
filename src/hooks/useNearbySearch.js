// src/hooks/useNearbySearch.js
import { useState, useEffect, useRef, useCallback } from 'react';
import { otmGeocode, otmRadius, OTM_CATEGORIES } from '../utils/otmEngine';


function sortPlaces(places, sortBy) {
  const copy = [...places];
  if (sortBy === 'rating') {
    return copy.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1));
  }
  return copy.sort((a, b) => a.name.localeCompare(b.name));
}

export function useNearbySearch(defaultAnchor = '') {
  const [anchor, setAnchorRaw]  = useState(defaultAnchor);
  const [category, setCategory] = useState(OTM_CATEGORIES[0].kinds);
  const [sortBy, setSortBy]     = useState('rating');
  const [rawResults, setRaw]    = useState([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const geoCache = useRef({});
  const anchorRef = useRef(anchor);
  useEffect(() => { anchorRef.current = anchor; }, [anchor]);

  async function resolveGeo(name) {
    if (geoCache.current[name]) return geoCache.current[name];
    const geo = await otmGeocode(name);
    if (geo) geoCache.current[name] = geo;
    return geo;
  }

  const search = useCallback(async (kindsOverride) => {
    const loc = anchorRef.current.trim();   // read from ref, not closure
    if (!loc) return;
    setLoading(true);
    setError(null);
    try {
      const geo = await resolveGeo(loc);
      if (!geo) { setError('Could not find location'); setLoading(false); return; }
      const kinds = kindsOverride ?? category;
      const places = await otmRadius(geo.lat, geo.lng, kinds, 12);
      setRaw(places);
    } catch {
      setError('Search failed');
    } finally {
      setLoading(false);
    }
  }, [category]);  // anchor removed from deps — read via ref

  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) { mounted.current = true; if (!anchor.trim()) return; }
    setRaw([]);
    search();
  }, [anchor, category, search]);

  function setAnchor(val) {
    setAnchorRaw(val);
    geoCache.current = {};
  }

  async function inspire() {
    await search(category);
  }

  const results = sortPlaces(rawResults, sortBy);

  return {
    anchor, setAnchor,
    category, setCategory,
    sortBy, setSortBy,
    results,
    loading, error,
    inspire,
    search,
  };
}
