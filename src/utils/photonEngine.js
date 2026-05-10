import { searchLocations } from './geocodeEngine';

const PHOTON_BASE = 'https://photon.komoot.io/api';

function toOsmTag(filter) {
  // 'amenity=cafe' → 'amenity:cafe'
  return filter.replace('=', ':');
}

function normalizePhoton(feature) {
  const p = feature.properties;
  const [lng, lat] = feature.geometry.coordinates;
  return {
    id: `osm_${p.osm_id}`,
    name: p.name ?? p.city ?? 'Unknown',
    address: [p.housenumber, p.street, p.city].filter(Boolean).join(', '),
    coords: { lat, lng },
    osmTags: { [p.osm_key]: p.osm_value },
    category: p.osm_value ?? p.osm_key ?? 'place',
  };
}

function normalizeNominatim(r) {
  return {
    id: `osm_${r.id}`,
    name: r.name,
    address: r.address,
    coords: { lat: r.coords.lat, lng: r.coords.lng },
    osmTags: {},
    category: r.type ?? 'place',
  };
}

async function fetchPhoton(query, osmTag) {
  const params = new URLSearchParams({ q: query, limit: '7' });
  if (osmTag) params.set('osm_tag', osmTag);
  const res = await fetch(`${PHOTON_BASE}/?${params}`, { signal: AbortSignal.timeout(4000) });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.features ?? []).map(normalizePhoton);
}

export async function photonAutocomplete(query, filterMask = []) {
  if (!query?.trim()) return [];

  try {
    const tags = filterMask.length ? filterMask.map(toOsmTag) : [null];
    const batches = await Promise.all(tags.map(tag => fetchPhoton(query, tag)));
    const merged = batches.flat();

    // Deduplicate by id
    const seen = new Set();
    const unique = merged.filter(p => { if (seen.has(p.id)) return false; seen.add(p.id); return true; });

    if (unique.length > 0) return unique;
  } catch {
    // fall through to Nominatim
  }

  // Nominatim fallback
  try {
    const results = await searchLocations(query, 7);
    return results.map(normalizeNominatim);
  } catch {
    return [];
  }
}
