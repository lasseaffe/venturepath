// Nominatim (OpenStreetMap) geocoder — no API key required
const BASE = 'https://nominatim.openstreetmap.org';
const HEADERS = { 'Accept-Language': 'en', 'User-Agent': 'VenturePath/1.0' };

const ALLOWED_CLASSES = new Set([
  'place', 'highway', 'railway', 'amenity',
  'tourism', 'natural', 'shop', 'leisure', 'aeroway',
]);

export function filterByAllowedClass(results) {
  return results.filter(r => !r.class || ALLOWED_CLASSES.has(r.class));
}

export async function geocodeLocation(text) {
  if (!text?.trim()) return null;
  try {
    const res = await fetch(
      `${BASE}/search?q=${encodeURIComponent(text)}&format=json&limit=1`,
      { headers: HEADERS }
    );
    const data = await res.json();
    if (!data[0]) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

export async function searchLocations(text, limit = 5) {
  if (!text?.trim()) return [];
  try {
    const res = await fetch(
      // fetch limit results; class filter may return fewer if some are non-travel OSM types
      `${BASE}/search?q=${encodeURIComponent(text)}&format=json&limit=${limit}&addressdetails=1`,
      { headers: HEADERS }
    );
    const data = await res.json();
    const mapped = data.map(r => ({
      id: r.place_id,
      name: r.display_name.split(',')[0],
      address: r.display_name,
      coords: { lat: parseFloat(r.lat), lng: parseFloat(r.lon) },
      type: r.type,
      class: r.class,
    }));
    return filterByAllowedClass(mapped);
  } catch {
    return [];
  }
}

// Shared helper to fetch and filter transport results
async function searchByFilter(text, filterFn, transportType, limit = 5) {
  if (!text?.trim()) return [];
  try {
    const res = await fetch(
      `${BASE}/search?q=${encodeURIComponent(text)}&format=json&limit=${limit * 3}&addressdetails=1`,
      { headers: HEADERS }
    );
    const data = await res.json();
    const seen = new Set();
    return data
      .filter(filterFn)
      .map(r => ({
        id: r.place_id,
        name: r.display_name.split(',')[0],
        address: r.display_name,
        coords: { lat: parseFloat(r.lat), lng: parseFloat(r.lon) },
        type: r.type,
        class: r.class,
        transportType,
      }))
      .filter(r => {
        const key = `${r.coords.lat.toFixed(3)},${r.coords.lng.toFixed(3)}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, limit);
  } catch {
    return [];
  }
}

const isAeroway = r => r.class === 'aeroway';
const isStation = r => r.class === 'railway' && r.type === 'station';

async function searchWithFallback(text, filterFn, transportType, suffix, limit) {
  const strict = await searchByFilter(text, filterFn, transportType, limit);
  if (strict.length >= 2) return strict;
  const fallback = await searchByFilter(`${text} ${suffix}`, filterFn, transportType, limit);
  const seen = new Set(strict.map(r => r.id));
  return [...strict, ...fallback.filter(r => !seen.has(r.id))].slice(0, limit);
}

// Returns airport results — falls back to "[text] airport" if city-name search yields < 2 hits
export async function searchAirports(text, limit = 5) {
  return searchWithFallback(text, isAeroway, 'flight', 'airport', limit);
}

// Returns train station results — falls back to "[text] station" if city-name search yields < 2 hits
export async function searchStations(text, limit = 5) {
  return searchWithFallback(text, isStation, 'train', 'station', limit);
}

// Returns airports + stations interleaved (for unset-mode legs)
export async function searchTransportHubs(text, limit = 5) {
  if (!text?.trim()) return [];
  const [airports, stations] = await Promise.all([
    searchAirports(text, Math.ceil(limit / 2)),
    searchStations(text, Math.floor(limit / 2)),
  ]);
  const result = [];
  const max = Math.max(airports.length, stations.length);
  for (let i = 0; i < max; i++) {
    if (airports[i]) result.push(airports[i]);
    if (stations[i]) result.push(stations[i]);
  }
  return result.slice(0, limit);
}

const isBusStop  = r => r.class === 'highway' && r.type === 'bus_stop';
const isTramStop = r => r.class === 'railway' && r.type === 'tram_stop';

export async function searchBusStops(text, limit = 5) {
  return searchWithFallback(text, isBusStop, 'bus', 'bus stop', limit);
}

export async function searchTramStops(text, limit = 5) {
  return searchWithFallback(text, isTramStop, 'tram', 'tram stop', limit);
}
