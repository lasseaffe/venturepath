// src/utils/elevationService.js

export const CACHE_KEY_PREFIX = 'vp_elev_';
const BATCH_SIZE = 512;
const API_URL = 'https://api.open-elevation.com/api/v1/lookup';

function cacheKey(coords) {
  return CACHE_KEY_PREFIX + coords.map(c => `${c.lat.toFixed(4)},${c.lng.toFixed(4)}`).join('|');
}

async function fetchBatch(coords) {
  const key = cacheKey(coords);
  const cached = sessionStorage.getItem(key);
  if (cached) return JSON.parse(cached);

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ locations: coords.map(c => ({ latitude: c.lat, longitude: c.lng })) }),
  });
  if (!res.ok) return coords.map(() => null);

  const data = await res.json();
  const elevations = data.results.map(r => r.elevation ?? null);
  sessionStorage.setItem(key, JSON.stringify(elevations));
  return elevations;
}

export async function fetchElevations(coords) {
  const results = [];
  for (let i = 0; i < coords.length; i += BATCH_SIZE) {
    const batch = coords.slice(i, i + BATCH_SIZE);
    const elevs = await fetchBatch(batch);
    results.push(...elevs);
  }
  return results;
}
