import { useState, useEffect } from 'react';
import { scoreCities } from '../utils/trendObserver';

const CACHE_KEY = 'vp_trends';
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

function getCached() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { data, fetchedAt } = JSON.parse(raw);
    if (Date.now() - fetchedAt > CACHE_TTL) return null;
    return data; // string[]
  } catch {
    return null;
  }
}

function setCache(trendTerms) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data: trendTerms, fetchedAt: Date.now() }));
  } catch {
    // sessionStorage unavailable — ignore
  }
}

async function fetchTrendTerms() {
  const res = await fetch('/api/trends');
  if (!res.ok) throw new Error(`Trends fetch failed: ${res.status}`);
  const text = await res.text();
  const doc = new DOMParser().parseFromString(text, 'text/xml');
  const items = Array.from(doc.querySelectorAll('item title'));
  // Skip the first <title> if it's the channel title (not an item title)
  return items.map(el => el.textContent?.trim()).filter(Boolean);
}

export function useTrendSignal(cities) {
  const [trendMap, setTrendMap] = useState(() => new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!cities.length) {
      setLoading(false);
      return;
    }

    let alive = true;

    async function load() {
      try {
        const cached = getCached();
        const terms = cached ?? await fetchTrendTerms().then(t => { setCache(t); return t; });
        if (alive) setTrendMap(scoreCities(cities, terms));
      } catch (err) {
        console.warn('[useTrendSignal] Failed to load trends:', err.message);
        // graceful fallback — trendMap stays empty
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => { alive = false; };
  }, [cities]);

  return { trendMap, loading };
}
