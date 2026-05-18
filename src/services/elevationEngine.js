import { ENDPOINTS } from '../config/endpoints.js';

const cache = new Map();
const CACHE_CAP = 5000;

function eleKey(lat, lng) {
  return `${lat.toFixed(5)},${lng.toFixed(5)}`;
}

export function _resetEleCache() { cache.clear(); }

async function batchOpenElevation(pts) {
  const body = { locations: pts.map(p => ({ latitude: p.lat, longitude: p.lng })) };
  const res = await fetch(ENDPOINTS.openElevation, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Open-Elevation ${res.status}`);
  const data = await res.json();
  return data.results.map(r => r.elevation);
}

export async function hydrateElevations(points) {
  const out = new Array(points.length).fill(null);
  const toFetch = [];
  const toFetchIdx = [];

  points.forEach((p, i) => {
    if (p.ele != null) { out[i] = p.ele; return; }
    const k = eleKey(p.lat, p.lng);
    if (cache.has(k)) { out[i] = cache.get(k); return; }
    toFetch.push(p);
    toFetchIdx.push(i);
  });

  if (toFetch.length === 0) return out;

  try {
    const batches = [];
    for (let i = 0; i < toFetch.length; i += 100) batches.push(toFetch.slice(i, i + 100));
    const results = (await Promise.all(batches.map(batchOpenElevation))).flat();
    results.forEach((ele, j) => {
      const i = toFetchIdx[j];
      const k = eleKey(points[i].lat, points[i].lng);
      cache.set(k, ele);
      if (cache.size > CACHE_CAP) cache.delete(cache.keys().next().value);
      out[i] = ele;
    });
  } catch {
    // Leave nulls for failed batch — caller can retry
  }
  return out;
}
