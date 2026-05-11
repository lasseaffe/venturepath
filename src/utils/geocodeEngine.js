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
    return data
      .filter(filterFn)
      .slice(0, limit)
      .map(r => ({
        id: r.place_id,
        name: r.display_name.split(',')[0],
        address: r.display_name,
        coords: { lat: parseFloat(r.lat), lng: parseFloat(r.lon) },
        type: r.type,
        class: r.class,
        transportType,
      }));
  } catch {
    return [];
  }
}

// Returns only airport results (OSM class: aeroway)
export async function searchAirports(text, limit = 5) {
  return searchByFilter(text, r => r.class === 'aeroway', 'flight', limit);
}

// Returns only train station results (OSM class: railway, type: station)
export async function searchStations(text, limit = 5) {
  return searchByFilter(text, r => r.class === 'railway' && r.type === 'station', 'train', limit);
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
