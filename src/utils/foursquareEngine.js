// OpenTripMap Places API (replaces Foursquare)
// Docs: https://dev.opentripmap.org/docs
const OTM_KEY = import.meta.env.VITE_OTM_API_KEY ?? '';
const BASE = 'https://api.opentripmap.com/0.1/en/places';

// Block memorials and burial markers (Stolpersteine, grave markers) from stop suggestions
const BLOCKED_OTM_KINDS = new Set(['monuments_and_memorials', 'other_burial_places']);

export function filterOtmResults(results) {
  return results.filter(r => {
    const kinds = (r.kinds ?? '').split(',');
    return !kinds.some(k => BLOCKED_OTM_KINDS.has(k.trim()));
  });
}

// OTM kind groups mapped to our semantic categories
export const FSQ_CATEGORIES = {
  hotels:      'accomodations',
  restaurants: 'foods',
  bars:        'foods',
  attractions: 'interesting_places',
  cafes:       'foods',
  shopping:    'shops',
};

const ACTIVITY_QUERIES = [
  'hidden gem', 'scenic walk', 'historic landmark', 'panoramic view',
  'sunset spot', 'secret garden', 'night market', 'vintage market',
  'local museum', 'adventure sport', 'cultural site', 'rooftop view',
];

const FOOD_QUERIES = [
  'best brunch', 'street food', 'local favorite', 'craft cocktails',
  'artisan coffee', 'jazz bar', 'underground bar', 'wine bar',
  'farm-to-table', 'night market food', 'ramen shop', 'taco stand',
];

const STAY_QUERIES = [
  'boutique hotel', 'hostel', 'guesthouse', 'eco lodge',
  'bed and breakfast', 'apartment rental', 'camping', 'glamping',
  'ryokan', 'riad', 'mountain hut', 'beachfront lodge',
];

const DISCOVERY_QUERIES = [
  'hidden gem', 'local favorite', 'must-see attraction', 'off the beaten path',
  'scenic viewpoint', 'historic quarter', 'art district', 'street art',
  'underground scene', 'cultural landmark', 'rooftop view', 'secret garden',
];

export const INSPIRE_QUERIES = ACTIVITY_QUERIES;

export function getInspireQuery(context = 'activity') {
  const pool = {
    activity:  ACTIVITY_QUERIES,
    food:      FOOD_QUERIES,
    stay:      STAY_QUERIES,
    discovery: DISCOVERY_QUERIES,
  }[context] ?? ACTIVITY_QUERIES;
  return pool[Math.floor(Math.random() * pool.length)];
}

// Simple in-memory geocode cache keyed by city name
const geocodeCache = {};

async function geocodeCity(city) {
  if (!city) return null;
  const key = city.toLowerCase();
  if (geocodeCache[key]) return geocodeCache[key];
  try {
    const res = await fetch(`${BASE}/geoname?name=${encodeURIComponent(city)}&apikey=${OTM_KEY}`);
    const data = await res.json();
    if (data.status === 'OK') {
      const coords = { lat: data.lat, lon: data.lon };
      geocodeCache[key] = coords;
      return coords;
    }
  } catch { /* ignore */ }
  return null;
}

function kindLabel(kinds = '') {
  const first = kinds.split(',')[0] ?? 'place';
  return first.replace(/_/g, ' ')
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function mapOtmPlace(p) {
  return {
    id:      p.xid,
    name:    p.name || 'Unknown Place',
    address: '',
    type:    kindLabel(p.kinds),
    rating:  p.rate ? Math.min(5, p.rate + 2).toFixed(1) : null,
    price:   null,
    coords:  p.point ? { lat: p.point.lat, lng: p.point.lon } : null,
    tags:    p.kinds?.split(',').slice(0, 2).map(k => kindLabel(k)) ?? [],
  };
}

async function radiusSearch(kinds, city, limit = 8) {
  if (!OTM_KEY) return [];
  const coords = await geocodeCity(city);
  if (!coords) return [];
  try {
    const res = await fetch(
      `${BASE}/radius?radius=10000&lon=${coords.lon}&lat=${coords.lat}&kinds=${kinds}&limit=${limit}&rate=1&format=json&apikey=${OTM_KEY}`
    );
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return filterOtmResults(data.filter(p => p.name)).map(mapOtmPlace);
  } catch {
    return [];
  }
}

// Keyword-to-kinds heuristic for free-text "inspire" queries
function queryToKinds(query) {
  const q = query.toLowerCase();
  if (/hotel|hostel|stay|lodge|bed|breakfast|apartment|camp|glamp/.test(q)) return 'accomodations';
  if (/food|eat|restaurant|brunch|ramen|taco|street food|market food/.test(q)) return 'foods';
  if (/bar|cocktail|wine|jazz|drink/.test(q)) return 'foods';
  if (/coffee|café|cafe/.test(q)) return 'foods';
  if (/shop|market|vintage/.test(q)) return 'shops';
  if (/museum|gallery|art|culture|cultural|landmark|historic/.test(q)) return 'cultural,historic,museums';
  if (/view|panorama|rooftop|sunset|scenic/.test(q)) return 'natural,interesting_places';
  return 'interesting_places';
}

export async function searchPlaces(query, nearCity = '', limit = 8) {
  return radiusSearch(queryToKinds(query), nearCity || 'Paris', limit);
}

export async function searchByCategory(categoryId, nearCity = '', limit = 8) {
  // categoryId here is an OTM kinds string (from FSQ_CATEGORIES map above)
  return radiusSearch(categoryId, nearCity || 'Paris', limit);
}

export async function fetchLocalFlavor(location = 'Berlin', _budgetTier = 2) {
  return radiusSearch('foods', location, 6);
}
