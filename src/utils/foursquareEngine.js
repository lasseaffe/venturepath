// Foursquare Places API v3
// Set VITE_FSQ_API_KEY in .env
const FSQ_API_KEY = import.meta.env.VITE_FSQ_API_KEY ?? '';

// Category IDs for filtered searches
export const FSQ_CATEGORIES = {
  hotels:      '19014',
  restaurants: '13065',
  bars:        '13003',
  attractions: '16000',
  cafes:       '13032',
  shopping:    '17000',
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

// Legacy alias
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

function mapPlace(p) {
  return {
    id:      p.fsq_id,
    name:    p.name,
    address: p.location?.formatted_address ?? p.location?.locality ?? '',
    type:    p.categories?.[0]?.name ?? 'Place',
    rating:  p.rating ? (p.rating / 2).toFixed(1) : null,
    price:   p.price ?? null,
    coords:  p.geocodes?.main
      ? { lat: p.geocodes.main.latitude, lng: p.geocodes.main.longitude }
      : null,
    tags:    p.categories?.slice(0, 2).map(c => c.name) ?? [],
  };
}

export async function searchPlaces(query, nearCity = '', limit = 8) {
  if (!FSQ_API_KEY) return [];
  try {
    const near = nearCity ? `&near=${encodeURIComponent(nearCity)}` : '';
    const resp = await fetch(
      `https://api.foursquare.com/v3/places/search?query=${encodeURIComponent(query)}${near}&limit=${limit}&sort=RATING`,
      { headers: { accept: 'application/json', Authorization: FSQ_API_KEY } }
    );
    const data = await resp.json();
    return (data.results ?? []).map(mapPlace);
  } catch {
    return [];
  }
}

export async function searchByCategory(categoryId, nearCity = '', limit = 8) {
  if (!FSQ_API_KEY) return [];
  try {
    const near = nearCity ? `&near=${encodeURIComponent(nearCity)}` : '';
    const resp = await fetch(
      `https://api.foursquare.com/v3/places/search?categories=${categoryId}${near}&limit=${limit}&sort=RATING`,
      { headers: { accept: 'application/json', Authorization: FSQ_API_KEY } }
    );
    const data = await resp.json();
    return (data.results ?? []).map(mapPlace);
  } catch {
    return [];
  }
}

export async function fetchLocalFlavor(location = 'Berlin', budgetTier = 2) {
  if (!FSQ_API_KEY) {
    console.warn('[foursquareEngine] No VITE_FSQ_API_KEY set — returning empty results');
    return [];
  }
  try {
    const resp = await fetch(
      `https://api.foursquare.com/v3/places/search?near=${encodeURIComponent(location)}&categories=13000&min_price=1&max_price=${budgetTier}&limit=6&sort=RATING`,
      { headers: { accept: 'application/json', Authorization: FSQ_API_KEY } }
    );
    const data = await resp.json();
    return (data.results ?? []).map(p => ({
      id:      p.fsq_id,
      name:    p.name,
      type:    p.categories?.[0]?.name ?? 'Local Eatery',
      rating:  p.rating ? (p.rating / 2).toFixed(1) : '4.0',
      price:   p.price ?? 1,
      address: p.location?.formatted_address ?? '',
      tags:    p.categories?.slice(0, 2).map(c => c.name) ?? [],
    }));
  } catch (err) {
    console.error('[foursquareEngine] fetch failed:', err);
    return [];
  }
}
