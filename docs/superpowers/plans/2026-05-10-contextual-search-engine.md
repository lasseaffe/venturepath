# Contextual Search Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Photon autocomplete, Overpass amenity queries, Mapillary street imagery, and a weighted SearchRanker to VenturePath's engine layer — replacing the broken Foursquare dependency with a fully free OSM stack.

**Architecture:** Five focused engine files under `src/utils/`, each with one responsibility. `adaptiveSearchEngine.js` orchestrates them so callers never import individual engines directly. OTM is preserved untouched for the DISCOVERY tab.

**Tech Stack:** Vitest, Photon (komoot public), Overpass API (public), Mapillary Graph API, localStorage for caching, existing `haversineKm` from `routeEngine.js`.

---

## File Map

| File | Status | Responsibility |
|---|---|---|
| `src/utils/photonEngine.js` | Create | Photon autocomplete → Nominatim fallback |
| `src/utils/photonEngine.test.js` | Create | Unit tests for photonEngine |
| `src/utils/overpassEngine.js` | Create | Overpass amenity queries + localStorage cache |
| `src/utils/overpassEngine.test.js` | Create | Unit tests for overpassEngine |
| `src/utils/searchRanker.js` | Create | Weighted scoring (proximity × vibe × role) |
| `src/utils/searchRanker.test.js` | Create | Unit tests for searchRanker |
| `src/utils/mapillaryEngine.js` | Create | Mapillary street-level image fetch |
| `src/utils/mapillaryEngine.test.js` | Create | Unit tests for mapillaryEngine |
| `src/utils/adaptiveSearchEngine.js` | Create | Orchestration — calls engines, merges, ranks |
| `src/utils/adaptiveSearchEngine.test.js` | Create | Integration tests for orchestration |
| `.env` | Modify | Add VITE_MAPILLARY_TOKEN |

---

## Task 1: `searchRanker.js` — weighted POI scoring

Start here because it's a pure function with no network calls — easiest to TDD and locks in the shared POI shape.

**Files:**
- Create: `src/utils/searchRanker.js`
- Create: `src/utils/searchRanker.test.js`

- [ ] **Step 1: Write the failing tests**

Create `src/utils/searchRanker.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { rankResults } from './searchRanker';

const makePoi = (overrides) => ({
  id: 'osm_1',
  name: 'Test POI',
  address: '',
  coords: { lat: 48.8566, lng: 2.3522 },
  osmTags: {},
  category: 'place',
  ...overrides,
});

describe('rankResults', () => {
  it('returns empty array for empty input', () => {
    expect(rankResults([], {})).toEqual([]);
  });

  it('attaches _score to each POI', () => {
    const pois = [makePoi()];
    const result = rankResults(pois, {});
    expect(result[0]).toHaveProperty('_score');
    expect(typeof result[0]._score).toBe('number');
  });

  it('does not mutate original array', () => {
    const pois = [makePoi()];
    rankResults(pois, {});
    expect(pois[0]._score).toBeUndefined();
  });

  it('ranks closer POI higher when both have same vibe/role', () => {
    const near = makePoi({ id: 'osm_near', coords: { lat: 48.857, lng: 2.353 } });
    const far  = makePoi({ id: 'osm_far',  coords: { lat: 51.5074, lng: -0.1278 } });
    const context = { currentLegCoords: { lat: 48.8566, lng: 2.3522 }, tripType: 'city', userRole: 'MEMBER' };
    const result = rankResults([far, near], context);
    expect(result[0].id).toBe('osm_near');
  });

  it('boosts cafe for leisure tripType', () => {
    const cafe  = makePoi({ id: 'cafe',  osmTags: { amenity: 'cafe' } });
    const other = makePoi({ id: 'other', osmTags: { amenity: 'fuel' } });
    const context = { currentLegCoords: null, tripType: 'leisure', userRole: 'MEMBER' };
    const result = rankResults([other, cafe], context);
    expect(result[0].id).toBe('cafe');
  });

  it('boosts pharmacy for MEDIC role', () => {
    const pharmacy = makePoi({ id: 'pharm', osmTags: { amenity: 'pharmacy' } });
    const cafe     = makePoi({ id: 'cafe',  osmTags: { amenity: 'cafe' } });
    const context = { currentLegCoords: null, tripType: 'city', userRole: 'MEDIC' };
    const result = rankResults([cafe, pharmacy], context);
    expect(result[0].id).toBe('pharm');
  });

  it('uses neutral R_dist (0.5) when currentLegCoords is null', () => {
    const poi = makePoi();
    const result = rankResults([poi], { currentLegCoords: null, tripType: 'city', userRole: 'MEMBER' });
    // With neutral dist (0.5 × 0.3 = 0.15) and no vibe/role match → score = 0.15
    expect(result[0]._score).toBeCloseTo(0.15, 2);
  });

  it('shop wildcard matches any shop= tag for city tripType', () => {
    const shop = makePoi({ id: 'shop', osmTags: { shop: 'bakery' } });
    const context = { currentLegCoords: null, tripType: 'city', userRole: 'MEMBER' };
    const result = rankResults([shop], context);
    // city vibe match (0.4) + neutral dist (0.15) = 0.55
    expect(result[0]._score).toBeCloseTo(0.55, 2);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd C:\Users\lasse\Desktop\venturepath
npx vitest run src/utils/searchRanker.test.js
```

Expected: FAIL — `Cannot find module './searchRanker'`

- [ ] **Step 3: Implement `searchRanker.js`**

Create `src/utils/searchRanker.js`:

```js
import { haversineKm } from './routeEngine';

const VIBE_BOOSTS = {
  alpine:   [{ shop: 'outdoor' }, { sport: 'climbing' }, { natural: 'peak' }],
  leisure:  [{ amenity: 'cafe' }, { tourism: 'attraction' }, { leisure: 'park' }],
  tactical: [{ shop: 'hardware' }, { amenity: 'hospital' }, { amenity: 'drinking_water' }],
  city:     [{ amenity: 'restaurant' }, { tourism: 'museum' }, { _wildcard: 'shop' }],
};

const ROLE_BOOSTS = {
  MEDIC:        [{ amenity: 'pharmacy' }, { amenity: 'hospital' }],
  NAVIGATOR:    [{ amenity: 'fuel' }, { highway: 'motorway_junction' }],
  QUARTERMASTER:[{ shop: 'supermarket' }, { shop: 'outdoor' }],
  LEADER:       [{ tourism: 'viewpoint' }, { tourism: 'attraction' }],
};

function tagMatches(osmTags, boostList) {
  return boostList.some(rule => {
    if (rule._wildcard) return osmTags[rule._wildcard] !== undefined;
    const [key, val] = Object.entries(rule)[0];
    return osmTags[key] === val;
  });
}

function rDist(poi, currentLegCoords, maxDistKm) {
  if (!currentLegCoords) return 0.5;
  if (maxDistKm === 0) return 1.0;
  const d = haversineKm(poi.coords, currentLegCoords);
  return Math.max(0, 1 - d / maxDistKm);
}

export function rankResults(pois, context = {}) {
  if (!pois.length) return [];
  const { currentLegCoords = null, tripType = '', userRole = 'MEMBER' } = context;

  const vibeList = VIBE_BOOSTS[tripType] ?? [];
  const roleList = ROLE_BOOSTS[userRole] ?? [];

  // Compute max distance for normalization
  let maxDistKm = 0;
  if (currentLegCoords) {
    for (const poi of pois) {
      const d = haversineKm(poi.coords, currentLegCoords);
      if (d > maxDistKm) maxDistKm = d;
    }
  }

  return [...pois]
    .map(poi => {
      const tags = poi.osmTags ?? {};
      const dist  = rDist(poi, currentLegCoords, maxDistKm) * 0.3;
      const vibe  = (vibeList.length && tagMatches(tags, vibeList) ? 1.0 : 0.0) * 0.4;
      const role  = (roleList.length && tagMatches(tags, roleList) ? 1.0 : 0.0) * 0.3;
      return { ...poi, _score: dist + vibe + role };
    })
    .sort((a, b) => b._score - a._score);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/utils/searchRanker.test.js
```

Expected: all 7 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/searchRanker.js src/utils/searchRanker.test.js
git commit -m "feat(search): add SearchRanker with proximity/vibe/role weighted scoring"
```

---

## Task 2: `photonEngine.js` — autocomplete with Nominatim fallback

**Files:**
- Create: `src/utils/photonEngine.js`
- Create: `src/utils/photonEngine.test.js`

- [ ] **Step 1: Write the failing tests**

Create `src/utils/photonEngine.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { photonAutocomplete } from './photonEngine';

beforeEach(() => { vi.restoreAllMocks(); });

describe('photonAutocomplete', () => {
  it('returns empty array for empty query', async () => {
    const result = await photonAutocomplete('', []);
    expect(result).toEqual([]);
  });

  it('normalizes Photon response to POI shape', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        features: [{
          properties: {
            osm_id: 123,
            name: 'Test Cafe',
            street: 'Main St',
            housenumber: '1',
            osm_key: 'amenity',
            osm_value: 'cafe',
          },
          geometry: { coordinates: [2.3522, 48.8566] },
        }],
      }),
    }));

    const result = await photonAutocomplete('cafe', ['amenity=cafe']);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'osm_123',
      name: 'Test Cafe',
      coords: { lat: 48.8566, lng: 2.3522 },
      category: 'cafe',
    });
    expect(result[0].osmTags).toBeDefined();
  });

  it('falls back to Nominatim when Photon returns empty features', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ features: [] }) })  // Photon
      .mockResolvedValueOnce({                                                      // Nominatim
        ok: true,
        json: async () => ([{
          place_id: 999,
          display_name: 'Berlin, Germany',
          lat: '52.52',
          lon: '13.405',
          type: 'city',
          address: {},
        }]),
      })
    );

    const result = await photonAutocomplete('Berlin', []);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('osm_999');
    expect(result[0].name).toBe('Berlin');
  });

  it('falls back to Nominatim when Photon fetch throws', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({ ok: true, json: async () => ([]) })
    );
    const result = await photonAutocomplete('Paris', []);
    expect(Array.isArray(result)).toBe(true);
  });

  it('deduplicates results by id', async () => {
    // Two filterMask entries returning same POI
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        features: [{
          properties: { osm_id: 42, name: 'Pharmacy', osm_key: 'amenity', osm_value: 'pharmacy' },
          geometry: { coordinates: [2.0, 48.0] },
        }],
      }),
    }));

    const result = await photonAutocomplete('pharm', ['amenity=pharmacy', 'amenity=hospital']);
    const ids = result.map(r => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/utils/photonEngine.test.js
```

Expected: FAIL — `Cannot find module './photonEngine'`

- [ ] **Step 3: Implement `photonEngine.js`**

Create `src/utils/photonEngine.js`:

```js
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
    id: `osm_${r.place_id}`,
    name: r.display_name.split(',')[0],
    address: r.display_name,
    coords: { lat: parseFloat(r.lat), lng: parseFloat(r.lon) },
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/utils/photonEngine.test.js
```

Expected: all 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/photonEngine.js src/utils/photonEngine.test.js
git commit -m "feat(search): add photonEngine with Nominatim fallback"
```

---

## Task 3: `overpassEngine.js` — amenity POI queries with localStorage cache

**Files:**
- Create: `src/utils/overpassEngine.js`
- Create: `src/utils/overpassEngine.test.js`

- [ ] **Step 1: Write the failing tests**

Create `src/utils/overpassEngine.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { overpassRadius, _cacheKey } from './overpassEngine';

beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

const mockOverpassResponse = (nodes) => ({
  ok: true,
  json: async () => ({ elements: nodes }),
});

const sampleNode = {
  id: 99,
  lat: 48.86,
  lon: 2.35,
  tags: { amenity: 'toilets', name: 'Public WC' },
};

describe('overpassRadius', () => {
  it('returns empty array for empty filters', async () => {
    const result = await overpassRadius(48.8566, 2.3522, []);
    expect(result).toEqual([]);
  });

  it('normalizes OSM node to POI shape', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(mockOverpassResponse([sampleNode])));

    const result = await overpassRadius(48.8566, 2.3522, ['amenity=toilets']);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'osm_99',
      name: 'Public WC',
      coords: { lat: 48.86, lng: 2.35 },
      category: 'toilets',
    });
    expect(result[0].osmTags).toMatchObject({ amenity: 'toilets' });
  });

  it('writes result to localStorage cache', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(mockOverpassResponse([sampleNode])));

    await overpassRadius(48.8566, 2.3522, ['amenity=toilets'], 'Paris');
    const key = _cacheKey('Paris', ['amenity=toilets']);
    const cached = JSON.parse(localStorage.getItem(key));
    expect(cached).toHaveProperty('results');
    expect(cached).toHaveProperty('cachedAt');
    expect(Array.isArray(cached.results)).toBe(true);
  });

  it('returns cached result without fetching when cache is fresh', async () => {
    const fetchMock = vi.stubGlobal('fetch', vi.fn());
    const key = _cacheKey('Paris', ['amenity=toilets']);
    localStorage.setItem(key, JSON.stringify({ results: [{ id: 'cached_1', name: 'Cached', coords: { lat: 0, lng: 0 }, osmTags: {}, category: 'place', address: '' }], cachedAt: Date.now() }));

    await overpassRadius(48.8566, 2.3522, ['amenity=toilets'], 'Paris');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('re-fetches when cache is older than 24h', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(mockOverpassResponse([])));
    const key = _cacheKey('Paris', ['amenity=toilets']);
    const staleTime = Date.now() - (25 * 60 * 60 * 1000);
    localStorage.setItem(key, JSON.stringify({ results: [], cachedAt: staleTime }));

    await overpassRadius(48.8566, 2.3522, ['amenity=toilets'], 'Paris');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('returns empty array on timeout without throwing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new DOMException('timeout', 'AbortError')));
    const result = await overpassRadius(48.8566, 2.3522, ['amenity=hospital']);
    expect(result).toEqual([]);
  });

  it('uses node name fallback to category when name tag absent', async () => {
    const unnamed = { id: 7, lat: 1.0, lon: 1.0, tags: { amenity: 'drinking_water' } };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(mockOverpassResponse([unnamed])));
    const result = await overpassRadius(1.0, 1.0, ['amenity=drinking_water']);
    expect(result[0].name).toBe('drinking_water');
  });
});

describe('_cacheKey', () => {
  it('sorts filters for stable key', () => {
    expect(_cacheKey('Paris', ['b=2', 'a=1'])).toBe(_cacheKey('Paris', ['a=1', 'b=2']));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/utils/overpassEngine.test.js
```

Expected: FAIL — `Cannot find module './overpassEngine'`

- [ ] **Step 3: Implement `overpassEngine.js`**

Create `src/utils/overpassEngine.js`:

```js
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const TTL_MS = 24 * 60 * 60 * 1000;

export function _cacheKey(destination, filters) {
  return `vp_overpass_${destination}_${[...filters].sort().join('+')}`;
}

function buildQuery(lat, lng, filters, radiusM) {
  const nodes = filters.map(f => {
    const [key, val] = f.split('=');
    return `node[${key}=${val}](around:${radiusM},${lat},${lng});`;
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/utils/overpassEngine.test.js
```

Expected: all 7 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/overpassEngine.js src/utils/overpassEngine.test.js
git commit -m "feat(search): add overpassEngine with 24h localStorage cache"
```

---

## Task 4: `mapillaryEngine.js` — street-level imagery

**Files:**
- Create: `src/utils/mapillaryEngine.js`
- Create: `src/utils/mapillaryEngine.test.js`
- Modify: `.env` (add `VITE_MAPILLARY_TOKEN`)

- [ ] **Step 1: Add env var**

Add to `.env` (create if absent):

```
VITE_MAPILLARY_TOKEN=your_mapillary_token_here
```

Get a token at `https://www.mapillary.com/developer/api-documentation` (free account).

- [ ] **Step 2: Write the failing tests**

Create `src/utils/mapillaryEngine.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchStreetImage } from './mapillaryEngine';

beforeEach(() => { vi.restoreAllMocks(); });

describe('fetchStreetImage', () => {
  it('returns thumb_256_url when image found', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [{ id: 'img1', thumb_256_url: 'https://example.com/img.jpg' }] }),
    }));

    const result = await fetchStreetImage(48.8566, 2.3522);
    expect(result).toBe('https://example.com/img.jpg');
  });

  it('returns null when no images found within radius', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    }));

    const result = await fetchStreetImage(0, 0);
    expect(result).toBeNull();
  });

  it('returns null on network failure without throwing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new Error('network')));
    const result = await fetchStreetImage(48.8566, 2.3522);
    expect(result).toBeNull();
  });

  it('returns null when token is missing', async () => {
    const original = import.meta.env.VITE_MAPILLARY_TOKEN;
    import.meta.env.VITE_MAPILLARY_TOKEN = '';
    const result = await fetchStreetImage(48.8566, 2.3522);
    import.meta.env.VITE_MAPILLARY_TOKEN = original;
    expect(result).toBeNull();
  });

  it('returns null on non-ok HTTP response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({ ok: false, json: async () => ({}) }));
    const result = await fetchStreetImage(48.8566, 2.3522);
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npx vitest run src/utils/mapillaryEngine.test.js
```

Expected: FAIL — `Cannot find module './mapillaryEngine'`

- [ ] **Step 4: Implement `mapillaryEngine.js`**

Create `src/utils/mapillaryEngine.js`:

```js
const MAPILLARY_BASE = 'https://graph.mapillary.com/images';

export async function fetchStreetImage(lat, lng) {
  const token = import.meta.env.VITE_MAPILLARY_TOKEN;
  if (!token) return null;

  try {
    const params = new URLSearchParams({
      fields: 'id,thumb_256_url',
      closeto: `${lng},${lat}`,
      radius: '100',
      limit: '1',
      access_token: token,
    });
    const res = await fetch(`${MAPILLARY_BASE}?${params}`, {
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.data?.[0]?.thumb_256_url ?? null;
  } catch {
    return null;
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx vitest run src/utils/mapillaryEngine.test.js
```

Expected: all 5 tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/utils/mapillaryEngine.js src/utils/mapillaryEngine.test.js .env
git commit -m "feat(search): add mapillaryEngine for street-level imagery"
```

---

## Task 5: `adaptiveSearchEngine.js` — orchestration layer

**Files:**
- Create: `src/utils/adaptiveSearchEngine.js`
- Create: `src/utils/adaptiveSearchEngine.test.js`

- [ ] **Step 1: Write the failing tests**

Create `src/utils/adaptiveSearchEngine.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock all engines before importing orchestrator
vi.mock('./photonEngine', () => ({
  photonAutocomplete: vi.fn().mockResolvedValue([]),
}));
vi.mock('./overpassEngine', () => ({
  overpassRadius: vi.fn().mockResolvedValue([]),
}));
vi.mock('./searchRanker', () => ({
  rankResults: vi.fn((pois) => pois.map(p => ({ ...p, _score: 0.5 }))),
}));
vi.mock('./geocodeEngine', () => ({
  geocodeLocation: vi.fn().mockResolvedValue({ lat: 48.8566, lng: 2.3522 }),
}));
vi.mock('./otmEngine', () => ({
  otmRadius: vi.fn().mockResolvedValue([]),
}));

import { getInspireResults, getAutocompleteResults, tripTypeFromClimate } from './adaptiveSearchEngine';
import { overpassRadius } from './overpassEngine';
import { photonAutocomplete } from './photonEngine';
import { rankResults } from './searchRanker';

const mockStrategy = {
  inspireQuery: { filters: ['amenity=cafe'] },
  filterMask: ['amenity=cafe'],
  resultActions: ['Save POI'],
};

const mockContext = { currentLegCoords: null, tripType: 'leisure', userRole: 'MEMBER' };

beforeEach(() => { vi.clearAllMocks(); });

describe('getInspireResults', () => {
  it('calls overpassRadius with strategy filters', async () => {
    await getInspireResults(mockStrategy, 'Paris', mockContext);
    expect(overpassRadius).toHaveBeenCalledWith(
      48.8566, 2.3522,
      ['amenity=cafe'],
      'Paris',
      5000,
    );
  });

  it('passes results through rankResults', async () => {
    overpassRadius.mockResolvedValueOnce([{ id: 'p1', name: 'A', coords: { lat: 0, lng: 0 }, osmTags: {}, category: 'cafe', address: '' }]);
    await getInspireResults(mockStrategy, 'Paris', mockContext);
    expect(rankResults).toHaveBeenCalled();
  });

  it('returns max 8 results', async () => {
    const many = Array.from({ length: 20 }, (_, i) => ({
      id: `p${i}`, name: `POI ${i}`, coords: { lat: 0, lng: 0 }, osmTags: {}, category: 'cafe', address: '', _score: 0.5,
    }));
    overpassRadius.mockResolvedValueOnce(many);
    rankResults.mockImplementationOnce(pois => pois);
    const result = await getInspireResults(mockStrategy, 'Paris', mockContext);
    expect(result.length).toBeLessThanOrEqual(8);
  });
});

describe('getAutocompleteResults', () => {
  it('calls photonAutocomplete with query and filterMask', async () => {
    await getAutocompleteResults('cafe', mockStrategy, mockContext);
    expect(photonAutocomplete).toHaveBeenCalledWith('cafe', ['amenity=cafe']);
  });

  it('returns max 10 results', async () => {
    const many = Array.from({ length: 15 }, (_, i) => ({
      id: `p${i}`, name: `POI ${i}`, coords: { lat: 0, lng: 0 }, osmTags: {}, category: 'cafe', address: '', _score: 0.5,
    }));
    photonAutocomplete.mockResolvedValueOnce(many);
    rankResults.mockImplementationOnce(pois => pois);
    const result = await getAutocompleteResults('cafe', mockStrategy, mockContext);
    expect(result.length).toBeLessThanOrEqual(10);
  });
});

describe('tripTypeFromClimate', () => {
  it('maps alpine → alpine', () => expect(tripTypeFromClimate('alpine')).toBe('alpine'));
  it('maps temperate → leisure', () => expect(tripTypeFromClimate('temperate')).toBe('leisure'));
  it('maps tropical → leisure', () => expect(tripTypeFromClimate('tropical')).toBe('leisure'));
  it('maps arid → tactical', () => expect(tripTypeFromClimate('arid')).toBe('tactical'));
  it('maps unknown → city', () => expect(tripTypeFromClimate('tundra')).toBe('city'));
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/utils/adaptiveSearchEngine.test.js
```

Expected: FAIL — `Cannot find module './adaptiveSearchEngine'`

- [ ] **Step 3: Implement `adaptiveSearchEngine.js`**

Create `src/utils/adaptiveSearchEngine.js`:

```js
import { photonAutocomplete } from './photonEngine';
import { overpassRadius } from './overpassEngine';
import { rankResults } from './searchRanker';
import { geocodeLocation } from './geocodeEngine';
import { otmRadius } from './otmEngine';

const CLIMATE_MAP = {
  alpine:    'alpine',
  temperate: 'leisure',
  tropical:  'leisure',
  arid:      'tactical',
};

export function tripTypeFromClimate(climate) {
  return CLIMATE_MAP[climate] ?? 'city';
}

export async function getInspireResults(strategy, destination, context) {
  const geo = await geocodeLocation(destination);
  if (!geo) return [];

  const overpassResults = await overpassRadius(
    geo.lat, geo.lng,
    strategy.inspireQuery.filters,
    destination,
    5000,
  );

  // Merge OTM for DISCOVERY tab if key available
  let merged = overpassResults;
  if (strategy._tab === 'DISCOVERY' && import.meta.env.VITE_OTM_API_KEY) {
    const otmResults = await otmRadius(geo.lat, geo.lng, 'cultural,historic,natural', 12);
    const seen = new Set(overpassResults.map(p => p.id));
    const unique = otmResults.filter(p => !seen.has(p.id));
    merged = [...overpassResults, ...unique];
  }

  return rankResults(merged, context).slice(0, 8);
}

export async function getAutocompleteResults(query, strategy, context) {
  const results = await photonAutocomplete(query, strategy.filterMask);
  return rankResults(results, context).slice(0, 10);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/utils/adaptiveSearchEngine.test.js
```

Expected: all 8 tests PASS

- [ ] **Step 5: Run full test suite to check no regressions**

```bash
npx vitest run
```

Expected: all pre-existing tests still PASS

- [ ] **Step 6: Commit**

```bash
git add src/utils/adaptiveSearchEngine.js src/utils/adaptiveSearchEngine.test.js
git commit -m "feat(search): add adaptiveSearchEngine orchestration layer"
```

---

## Task 6: Wire `searchStrategies.js` — strategy map

This is a data file, no tests needed (pure config). Creates the strategy map that spec B's `SearchContext` will consume.

**Files:**
- Create: `src/utils/searchStrategies.js`

- [ ] **Step 1: Create the strategy map**

Create `src/utils/searchStrategies.js`:

```js
export const SEARCH_STRATEGIES = {
  ITINERARY: {
    placeholder: 'Find stops, viewpoints…',
    inspireQuery: { filters: ['tourism=viewpoint', 'historic=monument', 'leisure=nature_reserve'] },
    filterMask: ['tourism=viewpoint', 'historic=*', 'leisure=nature_reserve'],
    resultActions: ['Add to Leg', 'Save POI'],
  },
  LOGISTICS: {
    placeholder: 'Find gear shops, grocery…',
    inspireQuery: { filters: ['shop=supermarket', 'shop=outdoor', 'shop=hardware'] },
    filterMask: ['shop=supermarket', 'shop=outdoor', 'shop=hardware'],
    resultActions: ['Add Supply Stop', 'Save POI'],
  },
  DISCOVERY: {
    _tab: 'DISCOVERY',
    placeholder: 'Explore hidden gems…',
    inspireQuery: { filters: ['tourism=attraction', 'tourism=museum', 'historic=*'] },
    filterMask: ['tourism=attraction', 'tourism=museum'],
    resultActions: ['Save to Collection', 'Share'],
  },
  TACTICAL_HUD: {
    placeholder: 'Find water, medical…',
    inspireQuery: { filters: ['amenity=drinking_water', 'amenity=toilets', 'amenity=hospital'] },
    filterMask: ['amenity=drinking_water', 'amenity=toilets', 'amenity=hospital'],
    resultActions: ['Mark Safe Point', 'SOS Anchor'],
  },
  BUDGET: {
    placeholder: 'Find ATMs, banks…',
    inspireQuery: { filters: ['amenity=atm', 'amenity=bank', 'amenity=bureau_de_change'] },
    filterMask: ['amenity=atm', 'amenity=bank'],
    resultActions: ['Log Expense Stop'],
  },
  STRATEGY: {
    placeholder: 'Search destinations, airports…',
    inspireQuery: { filters: ['aeroway=aerodrome', 'office=government'] },
    filterMask: ['aeroway=aerodrome'],
    resultActions: ['Add to Mission'],
  },
  DEFAULT: {
    placeholder: 'Search…',
    inspireQuery: { filters: [] },
    filterMask: [],
    resultActions: ['Save POI'],
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add src/utils/searchStrategies.js
git commit -m "feat(search): add SEARCH_STRATEGIES config map"
```

---

## Verification

- [ ] **Run full test suite one final time**

```bash
npx vitest run
```

Expected: all tests PASS, no regressions in existing engines.

- [ ] **Smoke test in browser**

```bash
npm run dev
```

Open `http://localhost:3001`. No console errors on load. Existing DISCOVERY tab still works (OTM untouched).
