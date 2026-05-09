// src/hooks/useNearbySearch.js
import { useState, useEffect, useRef, useCallback } from 'react';
import { otmGeocode, otmRadius, OTM_CATEGORIES } from '../utils/otmEngine';

const ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY ?? '';

const FALLBACK_KINDS = OTM_CATEGORIES.filter(c => c.label !== 'All');

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
  const [inspireLabel, setInspireLabel] = useState(null);

  const geoCache = useRef({});
  const inspiringRef = useRef(false);

  async function resolveGeo(name) {
    if (geoCache.current[name]) return geoCache.current[name];
    const geo = await otmGeocode(name);
    if (geo) geoCache.current[name] = geo;
    return geo;
  }

  const search = useCallback(async (kindsOverride) => {
    const loc = anchor.trim();
    if (!loc) return;
    setLoading(true);
    setError(null);
    try {
      const geo = await resolveGeo(loc);
      if (!geo) { setError('Could not find location'); setLoading(false); return; }
      const kinds = kindsOverride ?? category;
      // otmGeocode returns { lat, lng } — pass both to otmRadius
      const places = await otmRadius(geo.lat, geo.lng, kinds, 12);
      setRaw(places);
    } catch {
      setError('Search failed');
    } finally {
      setLoading(false);
    }
  }, [anchor, category]);

  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) { mounted.current = true; if (!anchor.trim()) return; }
    if (inspiringRef.current) return; // suppress during inspire
    setRaw([]);
    setInspireLabel(null);
    search();
  }, [anchor, category, search]);

  function setAnchor(val) {
    setAnchorRaw(val);
    geoCache.current = {};
  }

  async function callInspireAI(prompt) {
    const localUrl = import.meta.env.VITE_LOCAL_LLM_URL;
    const localModel = import.meta.env.VITE_LOCAL_LLM_MODEL ?? 'llama3';

    if (localUrl) {
      const res = await fetch(`${localUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          model: localModel,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 64,
          stream: false,
        }),
      });
      if (!res.ok) throw new Error('Local LLM request failed');
      const data = await res.json();
      return data.choices?.[0]?.message?.content ?? '';
    }

    if (ANTHROPIC_KEY) {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': ANTHROPIC_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
          'anthropic-dangerous-direct-browser-calls': 'true',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 64,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      if (!res.ok) throw new Error('Anthropic request failed');
      const data = await res.json();
      return data.content?.[0]?.text ?? '';
    }

    throw new Error('No AI backend configured');
  }

  async function inspire() {
    setError(null);
    try {
      const prompt = `You are a local travel expert. The user is in "${anchor.trim()}". Suggest one OpenTripMap kinds string (comma-separated values only from: cultural, historic, foods, restaurants, cafe, bar, natural, parks, museums, theatres_and_entertainments, sport, architecture) and a short display label (max 3 words). Reply with valid JSON only, no markdown: {"kinds":"...","label":"..."}`;
      const text = await callInspireAI(prompt);
      const parsed = JSON.parse(text);
      if (!parsed.kinds) throw new Error('Bad AI response');
      inspiringRef.current = true;
      setInspireLabel(parsed.label);
      setCategory(parsed.kinds);
      await search(parsed.kinds);
      inspiringRef.current = false;
    } catch {
      const pick = FALLBACK_KINDS[Math.floor(Math.random() * FALLBACK_KINDS.length)];
      inspiringRef.current = true;
      setInspireLabel(pick.label);
      setCategory(pick.kinds);
      await search(pick.kinds);
      inspiringRef.current = false;
    }
  }

  const results = sortPlaces(rawResults, sortBy);

  return {
    anchor, setAnchor,
    category, setCategory,
    sortBy, setSortBy,
    results,
    loading, error,
    inspireLabel,
    inspire,
    search,
  };
}
