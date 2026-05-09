import { getCached, setCached, makeCacheKey } from './routeCache';

const ORS_KEY = import.meta.env.VITE_ORS_API_KEY ?? '';
const ORS_BASE = 'https://api.openrouteservice.org/v2/directions';

const ORS_PROFILE = {
  car:     'driving-car',
  foot:    'foot-walking',
  cycling: 'cycling-regular',
};

// Exported for tests
export function haversineKm(a, b) {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const c = sinLat * sinLat +
    Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * sinLng * sinLng;
  return R * 2 * Math.atan2(Math.sqrt(c), Math.sqrt(1 - c));
}

// Exported for tests
export function filterModes(distanceKm) {
  const all = ['car', 'foot', 'cycling', 'flight', 'train', 'boat'];
  return all.filter(m => {
    if (m === 'flight' && distanceKm < 1) return false;
    if ((m === 'foot' || m === 'cycling') && distanceKm > 500) return false;
    return true;
  });
}

// Exported for tests
export function parseOrsResponse(json, mode) {
  try {
    const summary = json.routes?.[0]?.summary;
    if (!summary) return { mode, durationH: null, distanceKm: null };
    return {
      mode,
      durationH:  Math.round((summary.duration / 3600) * 10) / 10,
      distanceKm: Math.round(summary.distance / 1000),
    };
  } catch {
    return { mode, durationH: null, distanceKm: null };
  }
}

async function fetchOrsMode(fromCoords, toCoords, mode) {
  const profile = ORS_PROFILE[mode];
  if (!profile || !ORS_KEY) return { mode, durationH: null, distanceKm: null };
  try {
    const res = await fetch(`${ORS_BASE}/${profile}`, {
      method: 'POST',
      headers: { 'Authorization': ORS_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        coordinates: [
          [fromCoords.lng, fromCoords.lat],
          [toCoords.lng, toCoords.lat],
        ],
      }),
    });
    if (!res.ok) return { mode, durationH: null, distanceKm: null };
    return parseOrsResponse(await res.json(), mode);
  } catch {
    return { mode, durationH: null, distanceKm: null };
  }
}

function flightEstimate(fromCoords, toCoords) {
  const km = haversineKm(fromCoords, toCoords);
  const cruiseSpeed = 800; // km/h
  const overhead = 1.5;   // h for boarding/taxi/approach
  return {
    mode: 'flight',
    durationH: Math.round((km / cruiseSpeed + overhead) * 10) / 10,
    distanceKm: Math.round(km),
  };
}

export async function fetchRoutes(fromCoords, toCoords) {
  const cacheKey = makeCacheKey(fromCoords, toCoords);
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const distKm = haversineKm(fromCoords, toCoords);
  const modes = filterModes(distKm);

  const groundModes = modes.filter(m => ORS_PROFILE[m]);
  const manualModes = modes.filter(m => m === 'train' || m === 'boat');

  const [groundResults, flightResult] = await Promise.all([
    Promise.all(groundModes.map(m => fetchOrsMode(fromCoords, toCoords, m))),
    modes.includes('flight') ? Promise.resolve(flightEstimate(fromCoords, toCoords)) : Promise.resolve(null),
  ]);

  const results = [
    ...groundResults,
    ...(flightResult ? [flightResult] : []),
    ...manualModes.map(m => ({ mode: m, durationH: null, distanceKm: null })),
  ];

  setCached(cacheKey, results);
  return results;
}
