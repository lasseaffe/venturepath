import { ENDPOINTS, BROUTER_PROFILES, VALHALLA_PROFILES } from '../config/endpoints.js';

const cache = new Map();
const CACHE_CAP = 200;

function key({ from, to, profile }) {
  const r = (n) => Number(n).toFixed(5);
  return `${profile}|${r(from.lat)},${r(from.lng)}|${r(to.lat)},${r(to.lng)}`;
}

function lruSet(k, v) {
  if (cache.has(k)) cache.delete(k);
  cache.set(k, v);
  if (cache.size > CACHE_CAP) cache.delete(cache.keys().next().value);
}

export function _resetCache() { cache.clear(); }

function manualSegment(from, to, profile) {
  return {
    engine: 'manual',
    points: [
      { lat: from.lat, lng: from.lng, ele: null, time: null },
      { lat: to.lat, lng: to.lng, ele: null, time: null },
    ],
    segment: { profile, surface: null, routerEngine: 'manual' },
  };
}

async function fetchBRouter({ from, to, profile }) {
  const brouterProfile = BROUTER_PROFILES[profile] ?? 'hiking-mountain';
  const url = `${ENDPOINTS.brouter}?lonlats=${from.lng},${from.lat}|${to.lng},${to.lat}&profile=${brouterProfile}&format=geojson`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`BRouter ${res.status}`);
  const gj = await res.json();
  const coords = gj.features?.[0]?.geometry?.coordinates ?? [];
  return coords.map(([lng, lat, ele]) => ({ lat, lng, ele: ele ?? null, time: null }));
}

async function fetchValhalla({ from, to, profile }) {
  const vProfile = VALHALLA_PROFILES[profile] ?? 'auto';
  const body = {
    locations: [
      { lat: from.lat, lon: from.lng },
      { lat: to.lat,   lon: to.lng   },
    ],
    costing: vProfile,
    directions_options: { units: 'kilometers' },
  };
  const res = await fetch(ENDPOINTS.valhalla, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Valhalla ${res.status}`);
  const data = await res.json();
  const shape = data.trip?.legs?.[0]?.shape;
  return decodePolyline(shape).map(([lat, lng]) => ({ lat, lng, ele: null, time: null }));
}

// Google polyline decoder (Valhalla uses precision 6)
function decodePolyline(str, precision = 6) {
  if (!str) return [];
  const factor = Math.pow(10, precision);
  let index = 0, lat = 0, lng = 0;
  const out = [];
  while (index < str.length) {
    let b, shift = 0, result = 0;
    do { b = str.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += ((result & 1) ? ~(result >> 1) : (result >> 1));
    shift = 0; result = 0;
    do { b = str.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += ((result & 1) ? ~(result >> 1) : (result >> 1));
    out.push([lat / factor, lng / factor]);
  }
  return out;
}

export async function routeBetween({ from, to, profile }) {
  const k = key({ from, to, profile });
  if (cache.has(k)) return cache.get(k);
  try {
    const points = ['foot', 'cycling', 'mtb'].includes(profile)
      ? await fetchBRouter({ from, to, profile })
      : await fetchValhalla({ from, to, profile });
    if (points.length < 2) throw new Error('empty route');
    const result = {
      engine: ['foot', 'cycling', 'mtb'].includes(profile) ? 'brouter' : 'valhalla',
      points,
      segment: { profile, surface: null, routerEngine: ['foot', 'cycling', 'mtb'].includes(profile) ? 'brouter' : 'valhalla' },
    };
    lruSet(k, result);
    return result;
  } catch {
    const fallback = manualSegment(from, to, profile);
    lruSet(k, fallback);
    return fallback;
  }
}
