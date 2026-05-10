import { parseGpx } from './gpxParser';

const BASE_URLS = {
  hiking:  'https://hiking.waymarkedtrails.org/api/v1',
  cycling: 'https://cycling.waymarkedtrails.org/api/v1',
  mtb:     'https://mtb.waymarkedtrails.org/api/v1',
};

// Exported for tests
export function _bboxFromCenter(lat, lng, radiusM) {
  const latDelta = radiusM / 111320;
  const lngDelta = radiusM / (111320 * Math.cos((lat * Math.PI) / 180));
  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLng: lng - lngDelta,
    maxLng: lng + lngDelta,
  };
}

function normalizeRoute(raw, type) {
  return {
    id:          String(raw.id),
    name:        raw.name ?? 'Unnamed Route',
    type,
    difficulty:  raw.difficulty ?? 'unknown',
    distance_km: raw.length ? +(raw.length / 1000).toFixed(1) : 0,
    ascent_m:    raw.ascent ?? 0,
    geometry:    [],
    bbox:        null,
  };
}

export async function waymarkedRoutes(lat, lng, type = 'hiking', radiusM = 10000) {
  const base = BASE_URLS[type] ?? BASE_URLS.hiking;
  const { minLat, maxLat, minLng, maxLng } = _bboxFromCenter(lat, lng, radiusM);
  const bbox = `${minLng},${minLat},${maxLng},${maxLat}`;

  try {
    const url = `${base}/list/search?limit=10&bbox=${bbox}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results ?? []).map(r => normalizeRoute(r, type));
  } catch {
    return [];
  }
}

export async function fetchRouteGeometry(routeId, type = 'hiking') {
  const base = BASE_URLS[type] ?? BASE_URLS.hiking;
  try {
    const res = await fetch(`${base}/details/${routeId}/gpx`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const gpxText = await res.text();
    const points = parseGpx(gpxText);
    return points.map(p => ({ lat: p.lat, lng: p.lng }));
  } catch {
    return [];
  }
}

export function routeToLeg(route) {
  return {
    title:       route.name,
    distance_km: route.distance_km,
    ascent_m:    route.ascent_m,
    difficulty:  route.difficulty,
    geometry:    route.geometry,
    source:      'waymarked',
  };
}
