// src/utils/otmEngine.js
const OTM_BASE = 'https://api.opentripmap.com/0.1/en';
const OTM_KEY  = import.meta.env.VITE_OTM_API_KEY ?? '';

export const OTM_CATEGORIES = [
  { label: 'All',         kinds: 'cultural,historic,foods,natural,sport' },
  { label: 'Cafés',       kinds: 'cafe,foods' },
  { label: 'Restaurants', kinds: 'restaurants,foods' },
  { label: 'Bars',        kinds: 'bar' },
  { label: 'Attractions', kinds: 'cultural,museums,theatres_and_entertainments' },
  { label: 'Nature',      kinds: 'natural,parks' },
  { label: 'Historic',    kinds: 'historic,architecture,religion' },
];

// Geocode a city/place name string → { lat, lng } or null
// Note: OpenTripMap API uses 'lon' in responses, but we normalize to 'lng' for React-Leaflet compatibility
export async function otmGeocode(cityName) {
  if (!OTM_KEY || !cityName?.trim()) return null;
  try {
    const q = encodeURIComponent(cityName.trim());
    const res = await fetch(
      `${OTM_BASE}/places/geoname?name=${q}&apikey=${OTM_KEY}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.lat || !data.lon) return null;
    return { lat: data.lat, lng: data.lon };
  } catch (err) {
    console.error('[otmEngine] otmGeocode failed:', err);
    return null;
  }
}

// Search POIs by radius around a point
export async function otmRadius(lat, lon, kinds, limit = 12) {
  if (!OTM_KEY) return [];
  if (!kinds?.trim()) return [];
  try {
    const url = new URL(`${OTM_BASE}/places/radius`);
    url.searchParams.set('radius', '5000');
    url.searchParams.set('lon', lon);
    url.searchParams.set('lat', lat);
    url.searchParams.set('kinds', kinds);
    url.searchParams.set('limit', limit);
    // rate=2 means minimum 2-star OTM rating (filters out unrated places)
    url.searchParams.set('rate', '2');
    url.searchParams.set('format', 'json');
    url.searchParams.set('apikey', OTM_KEY);
    const res = await fetch(url.toString());
    if (!res.ok) return [];
    const data = await res.json();
    return (Array.isArray(data) ? data : []).map(mapOtmPlace).filter(Boolean);
  } catch (err) {
    console.error('[otmEngine] otmRadius failed:', err);
    return [];
  }
}

// Normalise a raw OTM place object
// coords: always uses { lat, lng } for React-Leaflet compatibility
export function mapOtmPlace(raw) {
  if (!raw?.name?.trim()) return null;
  // Stable ID: use normalized name as fallback (ensures same place always gets same ID)
  const stableId = raw.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  return {
    id:      raw.xid ?? raw.osm ?? stableId,
    name:    raw.name.trim(),
    type:    (raw.kinds ?? '').split(',')[0].replace(/_/g, ' ') || 'Place',
    rating:  typeof raw.rate === 'number' ? raw.rate : null,
    address: raw.point
      ? `${raw.point.lat?.toFixed(4)}, ${raw.point.lon?.toFixed(4)}`
      : '',
    coords:  raw.point
      ? { lat: raw.point.lat, lng: raw.point.lon }
      : null,
    kinds:   raw.kinds ?? '',
  };
}

// Foursquare swap path — uncomment when billing is resolved
// export async function fsqSearchByCategory(categoryId, near, limit = 12) { ... }
// export async function fsqSearchPlaces(query, near, limit = 12) { ... }
