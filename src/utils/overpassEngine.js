const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const TTL_MS = 24 * 60 * 60 * 1000;

export function _cacheKey(destination, filters) {
  return `vp_overpass_${destination}_${[...filters].sort().join('+')}`;
}

function buildQuery(lat, lng, filters, radiusM) {
  const nodes = filters.map(f => {
    const [key, val] = f.split('=');
    const selector = val === '*' ? `[${key}]` : `[${key}=${val}]`;
    return `node${selector}(around:${radiusM},${lat},${lng});`;
  }).join('\n  ');
  return `[out:json][timeout:5];\n(\n  ${nodes}\n);\nout body;`;
}

function normalizeNode(node, filters) {
  const category = node.tags?.amenity ?? node.tags?.shop ?? node.tags?.tourism
    ?? (filters[0]?.split('=')[1]) ?? 'place';
  const name = node.tags?.name ?? node.tags?.['name:en'] ?? category;
  const street = node.tags?.['addr:street'];
  const num    = node.tags?.['addr:housenumber'];
  const address = [num, street].filter(Boolean).join(' ');
  return {
    id: `osm_${node.id}`,
    name,
    address,
    coords: { lat: node.lat, lng: node.lon },
    osmTags: node.tags ?? {},
    category,
  };
}

function readCache(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { results, cachedAt } = JSON.parse(raw);
    if (Date.now() - cachedAt > TTL_MS) return null;
    return results;
  } catch {
    return null;
  }
}

function writeCache(key, results) {
  try {
    localStorage.setItem(key, JSON.stringify({ results, cachedAt: Date.now() }));
  } catch {
    // QuotaExceededError — skip silently
  }
}

export async function overpassRadius(lat, lng, filters, destination = '', radiusM = 5000) {
  if (!filters.length) return [];

  const key = _cacheKey(destination, filters);
  const cached = readCache(key);
  if (cached) return cached;

  try {
    const body = buildQuery(lat, lng, filters, radiusM);
    const res = await fetch(OVERPASS_URL, {
      method: 'POST',
      body,
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const results = (data.elements ?? []).map(n => normalizeNode(n, filters));
    writeCache(key, results);
    return results;
  } catch {
    return [];
  }
}
