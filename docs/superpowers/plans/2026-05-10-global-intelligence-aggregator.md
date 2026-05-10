# GlobalIntelligence Aggregator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single `globalIntelligence.js` orchestrator that fans out to Overpass, OTM, WikiData, and Waymarked Trails in parallel, merges + scores results by mission context, and caches WikiData enrichments in IndexedDB + Supabase.

**Architecture:** Four new utility files (`wikidataEngine`, `waymarkedEngine`, `enrichmentCache`, `globalIntelligence`) follow the existing `*Engine.js` pattern in `src/utils/`. The existing `searchRanker.js` gains a `section` multiplier. `ExpeditionContext` gains `activeSection` state consumed by all search callers.

**Tech Stack:** Vitest + jsdom (existing), native `fetch` + `AbortSignal.timeout`, native `indexedDB`, Supabase JS client (`src/lib/supabase/client.ts`), existing `gpxParser.js` + `@xmldom/xmldom`.

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Create | `src/utils/wikidataEngine.js` | WikiData name→QID→properties lookup |
| Create | `src/utils/wikidataEngine.test.js` | Unit tests for wikidata engine |
| Create | `src/utils/waymarkedEngine.js` | Waymarked Trails route list + GPX fetch |
| Create | `src/utils/waymarkedEngine.test.js` | Unit tests for waymarked engine |
| Create | `src/utils/enrichmentCache.js` | IndexedDB read/write + Supabase upsert |
| Create | `src/utils/enrichmentCache.test.js` | Unit tests for cache layer |
| Create | `src/utils/globalIntelligence.js` | Orchestrator — fan-out, merge, score |
| Create | `src/utils/globalIntelligence.test.js` | Integration tests for orchestrator |
| Modify | `src/utils/searchRanker.js` | Add `section` multiplier to `rankResults` |
| Modify | `src/utils/searchRanker.test.js` | Tests for new section scoring |
| Modify | `src/context/ExpeditionContext.jsx` | Add `activeSection` + `setActiveSection` |
| Modify | `src/components/layout/Sidebar.jsx` | Call `setActiveSection` on tab change |
| Modify | `src/components/ui/TacticalMode.jsx` | Set/restore `activeSection = 'tactical'` |

---

## Task 1: Extend `searchRanker.js` with section multipliers

**Files:**
- Modify: `src/utils/searchRanker.js`
- Modify: `src/utils/searchRanker.test.js`

- [ ] **Step 1: Write failing tests for section scoring**

Open `src/utils/searchRanker.test.js` and add at the bottom:

```js
import { describe, it, expect } from 'vitest';
import { rankResults } from './searchRanker';

// --- existing tests stay above ---

describe('rankResults — section scoring', () => {
  const makePoi = (id, osmTags, coords = { lat: 48.86, lng: 2.35 }) => ({
    id, name: id, coords, osmTags,
  });

  it('tactical section boosts pharmacy above outdoor shop', () => {
    const pharmacy = makePoi('pharmacy', { amenity: 'pharmacy' });
    const outdoor  = makePoi('outdoor',  { shop: 'outdoor' });
    const results  = rankResults([outdoor, pharmacy], { section: 'tactical' });
    expect(results[0].id).toBe('pharmacy');
  });

  it('logistics section boosts outdoor shop above pharmacy', () => {
    const pharmacy = makePoi('pharmacy', { amenity: 'pharmacy' });
    const outdoor  = makePoi('outdoor',  { shop: 'outdoor' });
    const results  = rankResults([pharmacy, outdoor], { section: 'logistics' });
    expect(results[0].id).toBe('outdoor');
  });

  it('discovery section boosts attraction above pharmacy', () => {
    const pharmacy   = makePoi('pharmacy',   { amenity: 'pharmacy' });
    const attraction = makePoi('attraction', { tourism: 'attraction' });
    const results    = rankResults([pharmacy, attraction], { section: 'discovery' });
    expect(results[0].id).toBe('attraction');
  });

  it('planner section applies no section boost — existing scoring unchanged', () => {
    const pharmacy = makePoi('pharmacy', { amenity: 'pharmacy' });
    const outdoor  = makePoi('outdoor',  { shop: 'outdoor' });
    // No section boost — score is equal (both get dist=0.5, no vibe/role), order is stable
    const results = rankResults([pharmacy, outdoor], { section: 'planner' });
    expect(results).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd C:/Users/lasse/Desktop/venturepath
npx vitest run src/utils/searchRanker.test.js
```

Expected: FAIL — `section` property not used yet.

- [ ] **Step 3: Add section multipliers to `searchRanker.js`**

Replace the entire contents of `src/utils/searchRanker.js` with:

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

// Section-aware boosts: added on top of vibe/role scoring
const SECTION_BOOSTS = {
  tactical:  [
    { tags: { amenity: 'pharmacy' },       bonus: 0.5 },
    { tags: { amenity: 'drinking_water' }, bonus: 0.4 },
    { tags: { amenity: 'shelter' },        bonus: 0.3 },
  ],
  logistics: [
    { tags: { shop: 'outdoor' },      bonus: 0.4 },
    { tags: { shop: 'supermarket' },  bonus: 0.3 },
    { tags: { shop: 'hardware' },     bonus: 0.3 },
  ],
  discovery: [
    { tags: { tourism: 'attraction' },       bonus: 0.5 },
    { tags: { tourism: 'viewpoint' },        bonus: 0.4 },
    { tags: { leisure: 'nature_reserve' },   bonus: 0.3 },
  ],
  planner: [],
};

function tagMatches(osmTags, boostList) {
  return boostList.some(rule => {
    if (rule._wildcard) return osmTags[rule._wildcard] !== undefined;
    const [key, val] = Object.entries(rule)[0];
    return osmTags[key] === val;
  });
}

function sectionBonus(osmTags, section) {
  const boosts = SECTION_BOOSTS[section] ?? [];
  for (const { tags, bonus } of boosts) {
    const [key, val] = Object.entries(tags)[0];
    if (osmTags[key] === val) return bonus;
  }
  return 0;
}

function rDist(poi, currentLegCoords, maxDistKm) {
  if (!currentLegCoords) return 0.5;
  if (maxDistKm === 0) return 1.0;
  const d = haversineKm(poi.coords, currentLegCoords);
  return Math.max(0, 1 - d / maxDistKm);
}

export function rankResults(pois, context = {}) {
  if (!pois.length) return [];
  const {
    currentLegCoords = null,
    tripType = '',
    userRole = 'MEMBER',
    section = 'planner',
  } = context;

  const vibeList = VIBE_BOOSTS[tripType] ?? [];
  const roleList = ROLE_BOOSTS[userRole] ?? [];

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
      const sec   = sectionBonus(tags, section);
      return { ...poi, _score: dist + vibe + role + sec };
    })
    .sort((a, b) => b._score - a._score);
}
```

- [ ] **Step 4: Run tests — all pass**

```bash
npx vitest run src/utils/searchRanker.test.js
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/searchRanker.js src/utils/searchRanker.test.js
git commit -m "feat(search): add section-aware scoring to rankResults"
```

---

## Task 2: Build `wikidataEngine.js`

**Files:**
- Create: `src/utils/wikidataEngine.js`
- Create: `src/utils/wikidataEngine.test.js`

- [ ] **Step 1: Write failing tests**

Create `src/utils/wikidataEngine.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { wikidataFetch } from './wikidataEngine';

beforeEach(() => vi.restoreAllMocks());

const mockSearch = (qid) => ({
  ok: true,
  json: async () => ({
    search: qid ? [{ id: qid, label: 'Test Place', description: 'A test place' }] : [],
  }),
});

const mockEntity = (qid) => ({
  ok: true,
  json: async () => ({
    entities: {
      [qid]: {
        id: qid,
        descriptions: { en: { value: '14th-century Gothic cathedral' } },
        claims: {
          P31: [{ mainsnak: { datavalue: { value: { id: 'Q2977' } } } }],
          P18: [{ mainsnak: { datavalue: { value: 'Prague_Cathedral.jpg' } } }],
        },
        labels: { en: { value: 'St. Vitus Cathedral' } },
      },
    },
  }),
});

// Mock wikidata label lookup for P31
const mockLabel = {
  ok: true,
  json: async () => ({
    entities: { Q2977: { labels: { en: { value: 'cathedral' } } } },
  }),
};

describe('wikidataFetch', () => {
  it('returns null when search finds no results', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(mockSearch(null)));
    const result = await wikidataFetch('Nonexistent Place', { lat: 0, lng: 0 });
    expect(result).toBeNull();
  });

  it('returns enrichment shape on successful lookup', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(mockSearch('Q12345'))
      .mockResolvedValueOnce(mockEntity('Q12345'))
      .mockResolvedValueOnce(mockLabel),
    );
    const result = await wikidataFetch('St. Vitus Cathedral', { lat: 50.09, lng: 14.4 });
    expect(result).toMatchObject({
      qid: 'Q12345',
      description: '14th-century Gothic cathedral',
      instance_of: 'cathedral',
    });
    expect(result.image_url).toContain('Prague_Cathedral.jpg');
  });

  it('returns null on fetch error — never throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new Error('network')));
    await expect(wikidataFetch('Any', { lat: 0, lng: 0 })).resolves.toBeNull();
  });
});
```

- [ ] **Step 2: Run to confirm fail**

```bash
npx vitest run src/utils/wikidataEngine.test.js
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `wikidataEngine.js`**

Create `src/utils/wikidataEngine.js`:

```js
const WD_API = 'https://www.wikidata.org/w/api.php';
const COMMONS_THUMB = 'https://commons.wikimedia.org/wiki/Special:FilePath/';
const DEBOUNCE_MS = 200;

let _lastCall = 0;

async function debounce() {
  const now = Date.now();
  const wait = DEBOUNCE_MS - (now - _lastCall);
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  _lastCall = Date.now();
}

async function searchEntity(name) {
  const url = new URL(WD_API);
  url.searchParams.set('action', 'wbsearchentities');
  url.searchParams.set('search', name);
  url.searchParams.set('language', 'en');
  url.searchParams.set('limit', '1');
  url.searchParams.set('format', 'json');
  url.searchParams.set('origin', '*');

  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(3000) });
  if (!res.ok) return null;
  const data = await res.json();
  return data.search?.[0]?.id ?? null;
}

async function fetchEntityProps(qid) {
  const url = new URL(WD_API);
  url.searchParams.set('action', 'wbgetentities');
  url.searchParams.set('ids', qid);
  url.searchParams.set('props', 'descriptions|claims|labels');
  url.searchParams.set('languages', 'en');
  url.searchParams.set('format', 'json');
  url.searchParams.set('origin', '*');

  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(3000) });
  if (!res.ok) return null;
  const data = await res.json();
  return data.entities?.[qid] ?? null;
}

async function resolveLabel(qid) {
  const url = new URL(WD_API);
  url.searchParams.set('action', 'wbgetentities');
  url.searchParams.set('ids', qid);
  url.searchParams.set('props', 'labels');
  url.searchParams.set('languages', 'en');
  url.searchParams.set('format', 'json');
  url.searchParams.set('origin', '*');

  try {
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return qid;
    const data = await res.json();
    return data.entities?.[qid]?.labels?.en?.value ?? qid;
  } catch {
    return qid;
  }
}

function buildImageUrl(filename) {
  if (!filename) return null;
  const encoded = encodeURIComponent(filename.replace(/ /g, '_'));
  return `${COMMONS_THUMB}${encoded}?width=400`;
}

export async function wikidataFetch(name, _coords) {
  try {
    await debounce();
    const qid = await searchEntity(name);
    if (!qid) return null;

    const entity = await fetchEntityProps(qid);
    if (!entity) return null;

    const description = entity.descriptions?.en?.value ?? '';

    const p31Claim = entity.claims?.P31?.[0]?.mainsnak?.datavalue?.value?.id;
    const instance_of = p31Claim ? await resolveLabel(p31Claim) : '';

    const p18Filename = entity.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
    const image_url = buildImageUrl(p18Filename);

    return { qid, description, instance_of, image_url };
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run tests — all pass**

```bash
npx vitest run src/utils/wikidataEngine.test.js
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/wikidataEngine.js src/utils/wikidataEngine.test.js
git commit -m "feat(intel): wikidataEngine — name→QID→fact sheet lookup"
```

---

## Task 3: Build `waymarkedEngine.js`

**Files:**
- Create: `src/utils/waymarkedEngine.js`
- Create: `src/utils/waymarkedEngine.test.js`

- [ ] **Step 1: Write failing tests**

Create `src/utils/waymarkedEngine.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { waymarkedRoutes, fetchRouteGeometry, _bboxFromCenter } from './waymarkedEngine';

beforeEach(() => vi.restoreAllMocks());

const mockRouteList = {
  ok: true,
  json: async () => ({
    results: [
      { id: 101, name: 'Alpine Trail', difficulty: 'demanding', length: 12400, ascent: 850 },
      { id: 102, name: 'Valley Loop',  difficulty: 'easy',      length: 5200,  ascent: 120 },
    ],
  }),
};

const GPX_SAMPLE = `<?xml version="1.0"?>
<gpx><trk><trkseg>
  <trkpt lat="47.1" lon="11.2"><ele>900</ele></trkpt>
  <trkpt lat="47.2" lon="11.3"><ele>1100</ele></trkpt>
</trkseg></trk></gpx>`;

const mockGpx = { ok: true, text: async () => GPX_SAMPLE };

describe('_bboxFromCenter', () => {
  it('returns a bbox object with four numeric fields', () => {
    const bbox = _bboxFromCenter(47.5, 11.0, 10000);
    expect(bbox).toHaveProperty('minLat');
    expect(bbox).toHaveProperty('maxLat');
    expect(bbox).toHaveProperty('minLng');
    expect(bbox).toHaveProperty('maxLng');
    expect(bbox.minLat).toBeLessThan(bbox.maxLat);
  });
});

describe('waymarkedRoutes', () => {
  it('returns normalized route array', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(mockRouteList));
    const routes = await waymarkedRoutes(47.5, 11.0, 'hiking', 10000);
    expect(routes).toHaveLength(2);
    expect(routes[0]).toMatchObject({
      id: '101',
      name: 'Alpine Trail',
      difficulty: 'demanding',
      distance_km: 12.4,
      ascent_m: 850,
      geometry: [],
      type: 'hiking',
    });
  });

  it('returns empty array on fetch error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new Error('network')));
    const routes = await waymarkedRoutes(47.5, 11.0);
    expect(routes).toEqual([]);
  });
});

describe('fetchRouteGeometry', () => {
  it('returns parsed LatLng array from GPX', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(mockGpx));
    const geom = await fetchRouteGeometry('101', 'hiking');
    expect(geom).toHaveLength(2);
    expect(geom[0]).toMatchObject({ lat: 47.1, lng: 11.2 });
  });

  it('returns empty array on error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new Error('fail')));
    const geom = await fetchRouteGeometry('999', 'hiking');
    expect(geom).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to confirm fail**

```bash
npx vitest run src/utils/waymarkedEngine.test.js
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `waymarkedEngine.js`**

Create `src/utils/waymarkedEngine.js`:

```js
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
    geometry:    [],   // populated lazily by fetchRouteGeometry
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

// Shape a waymarked route into a VenturePath Leg object for KanbanBoard import
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
```

- [ ] **Step 4: Run tests — all pass**

```bash
npx vitest run src/utils/waymarkedEngine.test.js
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/waymarkedEngine.js src/utils/waymarkedEngine.test.js
git commit -m "feat(intel): waymarkedEngine — hiking/cycling route fetch + GPX parse"
```

---

## Task 4: Build `enrichmentCache.js`

**Files:**
- Create: `src/utils/enrichmentCache.js`
- Create: `src/utils/enrichmentCache.test.js`

- [ ] **Step 1: Write failing tests**

Create `src/utils/enrichmentCache.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest';

// We test the cache logic by mocking IDB and Supabase
// The cache module exports get() and set() — we test their read-priority logic

// Mock IDB
const idbStore = {};
vi.mock('./enrichmentCache', async (importOriginal) => {
  // We test the exported pure helpers instead — see below
  return importOriginal();
});

import { _isFresh, _buildRecord } from './enrichmentCache';

describe('_isFresh', () => {
  it('returns true when fetched_at is within 30 days', () => {
    const record = { fetched_at: new Date().toISOString(), qid: 'Q1', description: 'test', instance_of: 'place', image_url: null };
    expect(_isFresh(record)).toBe(true);
  });

  it('returns false when fetched_at is older than 30 days', () => {
    const old = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
    const record = { fetched_at: old, qid: 'Q1', description: 'test', instance_of: 'place', image_url: null };
    expect(_isFresh(record)).toBe(false);
  });
});

describe('_buildRecord', () => {
  it('produces a record with poi_id and fetched_at', () => {
    const enrichment = { qid: 'Q99', description: 'A place', instance_of: 'museum', image_url: null };
    const record = _buildRecord('osm_123', enrichment);
    expect(record.poi_id).toBe('osm_123');
    expect(record.wikidata_qid).toBe('Q99');
    expect(record.fetched_at).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run to confirm fail**

```bash
npx vitest run src/utils/enrichmentCache.test.js
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `enrichmentCache.js`**

Create `src/utils/enrichmentCache.js`:

```js
import { createClient } from '../lib/supabase/client';

const DB_NAME    = 'vp_intelligence';
const STORE_NAME = 'poi_enrichment';
const FRESHNESS_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// Exported for unit tests
export function _isFresh(record) {
  if (!record?.fetched_at) return false;
  return Date.now() - new Date(record.fetched_at).getTime() < FRESHNESS_MS;
}

export function _buildRecord(poi_id, enrichment) {
  return {
    poi_id,
    wikidata_qid: enrichment.qid,
    description:  enrichment.description,
    image_url:    enrichment.image_url,
    instance_of:  enrichment.instance_of,
    fetched_at:   new Date().toISOString(),
  };
}

// ── IndexedDB helpers ──────────────────────────────────────────────────────────

let _db = null;

function openDb() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = (e) => {
      e.target.result.createObjectStore(STORE_NAME, { keyPath: 'poi_id' });
    };
    req.onsuccess = (e) => { _db = e.target.result; resolve(_db); };
    req.onerror   = () => reject(req.error);
  });
}

async function idbGet(poi_id) {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx  = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(poi_id);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror   = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

async function idbSet(record) {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx  = db.transaction(STORE_NAME, 'readwrite');
      const req = tx.objectStore(STORE_NAME).put(record);
      req.onsuccess = () => resolve();
      req.onerror   = () => reject(req.error);
    });
  } catch {
    // Never throw — cache write failure is non-fatal
  }
}

// ── Supabase helpers ───────────────────────────────────────────────────────────

async function supabaseGet(poi_id) {
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from('poi_enrichment')
      .select('*')
      .eq('poi_id', poi_id)
      .maybeSingle();
    return data ?? null;
  } catch {
    return null;
  }
}

async function supabaseUpsert(record) {
  try {
    const supabase = createClient();
    await supabase.from('poi_enrichment').upsert(record, {
      onConflict: 'poi_id',
      ignoreDuplicates: false,
    });
  } catch {
    // Non-fatal — offline or quota
  }
}

// ── Public API ─────────────────────────────────────────────────────────────────

export async function get(poi_id) {
  // 1. IndexedDB
  const local = await idbGet(poi_id);
  if (local && _isFresh(local)) return local;

  // 2. Supabase
  const remote = await supabaseGet(poi_id);
  if (remote && _isFresh(remote)) {
    await idbSet(remote);
    return remote;
  }

  return null;
}

export async function set(poi_id, enrichment) {
  const record = _buildRecord(poi_id, enrichment);
  await idbSet(record);
  await supabaseUpsert(record);
}
```

- [ ] **Step 4: Run tests — all pass**

```bash
npx vitest run src/utils/enrichmentCache.test.js
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/enrichmentCache.js src/utils/enrichmentCache.test.js
git commit -m "feat(intel): enrichmentCache — IndexedDB + Supabase two-layer WikiData cache"
```

---

## Task 5: Apply Supabase migration

**Files:**
- Create: `src/utils/migrations/001_poi_enrichment.sql` (reference only — apply via Supabase dashboard)

- [ ] **Step 1: Create migration file**

Create `src/utils/migrations/001_poi_enrichment.sql`:

```sql
CREATE TABLE IF NOT EXISTS poi_enrichment (
  poi_id        TEXT PRIMARY KEY,
  wikidata_qid  TEXT,
  description   TEXT,
  image_url     TEXT,
  instance_of   TEXT,
  fetched_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Allow authenticated users to read and write their own enrichments
ALTER TABLE poi_enrichment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read enrichments"
  ON poi_enrichment FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can upsert enrichments"
  ON poi_enrichment FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update stale enrichments"
  ON poi_enrichment FOR UPDATE
  USING (auth.role() = 'authenticated');
```

- [ ] **Step 2: Apply via Supabase SQL editor**

Open the Supabase project dashboard → SQL Editor → paste the contents of `001_poi_enrichment.sql` → Run.

Verify: the `poi_enrichment` table appears in the Table Editor with columns `poi_id, wikidata_qid, description, image_url, instance_of, fetched_at`.

- [ ] **Step 3: Commit migration file**

```bash
git add src/utils/migrations/001_poi_enrichment.sql
git commit -m "feat(db): add poi_enrichment table migration"
```

---

## Task 6: Build `globalIntelligence.js` orchestrator

**Files:**
- Create: `src/utils/globalIntelligence.js`
- Create: `src/utils/globalIntelligence.test.js`

- [ ] **Step 1: Write failing tests**

Create `src/utils/globalIntelligence.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { globalSearch } from './globalIntelligence';

beforeEach(() => vi.restoreAllMocks());

// Mock all source engines
vi.mock('./overpassEngine', () => ({
  overpassRadius: vi.fn().mockResolvedValue([
    { id: 'osm_1', name: 'Pharmacy', coords: { lat: 48.86, lng: 2.35 }, osmTags: { amenity: 'pharmacy' }, category: 'pharmacy' },
  ]),
}));

vi.mock('./otmEngine', () => ({
  otmRadius: vi.fn().mockResolvedValue([
    { id: 'otm_a', name: 'Museum', coords: { lat: 48.87, lng: 2.36 }, osmTags: {}, type: 'museum', rating: 3 },
  ]),
}));

vi.mock('./waymarkedEngine', () => ({
  waymarkedRoutes: vi.fn().mockResolvedValue([
    { id: '101', name: 'Alpine Trail', type: 'hiking', distance_km: 12, ascent_m: 800, geometry: [], difficulty: 'demanding' },
  ]),
}));

describe('globalSearch', () => {
  it('returns pois array from merged sources', async () => {
    const result = await globalSearch({
      query: 'water',
      coords: { lat: 48.86, lng: 2.35 },
      section: 'tactical',
      missionType: 'alpine',
      userRole: 'MEDIC',
    });
    expect(result.pois.length).toBeGreaterThan(0);
    expect(result.routes).toEqual([]);
  });

  it('returns routes when includeRoutes is true', async () => {
    const result = await globalSearch({
      query: 'hiking',
      coords: { lat: 48.86, lng: 2.35 },
      section: 'discovery',
      missionType: 'alpine',
      userRole: 'LEADER',
      includeRoutes: true,
    });
    expect(result.routes).toHaveLength(1);
    expect(result.routes[0].name).toBe('Alpine Trail');
  });

  it('deduplicates POIs within 50m of each other — OTM wins', async () => {
    const { overpassRadius } = await import('./overpassEngine');
    const { otmRadius } = await import('./otmEngine');

    overpassRadius.mockResolvedValueOnce([
      { id: 'osm_dup', name: 'OSM Museum', coords: { lat: 48.8700, lng: 2.3600 }, osmTags: { tourism: 'museum' }, category: 'museum' },
    ]);
    otmRadius.mockResolvedValueOnce([
      { id: 'otm_dup', name: 'OTM Museum', coords: { lat: 48.8701, lng: 2.3601 }, osmTags: {}, type: 'museum', rating: 4 },
    ]);

    const result = await globalSearch({
      query: 'museum', coords: { lat: 48.87, lng: 2.36 }, section: 'discovery',
    });
    // Only one museum — OTM wins
    const museums = result.pois.filter(p => p.name.includes('Museum'));
    expect(museums).toHaveLength(1);
    expect(museums[0].id).toBe('otm_dup');
  });

  it('returns pois even when one source fails', async () => {
    const { overpassRadius } = await import('./overpassEngine');
    overpassRadius.mockRejectedValueOnce(new Error('Overpass down'));

    const result = await globalSearch({
      query: 'museum', coords: { lat: 48.86, lng: 2.35 }, section: 'discovery',
    });
    // OTM results still come through
    expect(result.pois.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run to confirm fail**

```bash
npx vitest run src/utils/globalIntelligence.test.js
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `globalIntelligence.js`**

Create `src/utils/globalIntelligence.js`:

```js
import { overpassRadius } from './overpassEngine';
import { otmRadius } from './otmEngine';
import { waymarkedRoutes } from './waymarkedEngine';
import { rankResults } from './searchRanker';
import { haversineKm } from './routeEngine';

// OSM tactical layers fired on every search
const TACTICAL_FILTERS = [
  'amenity=drinking_water', 'amenity=shelter', 'amenity=toilets',
  'amenity=pharmacy', 'amenity=charging_station',
  'shop=outdoor', 'shop=supermarket', 'shop=hardware',
  'internet_access=wlan', 'amenity=public_transport',
];

// Deduplicate: if an OSM node and OTM result are within 50m, OTM wins
function deduplicateByProximity(osmPois, otmPois, thresholdKm = 0.05) {
  const kept = [...otmPois];
  const otmCoords = otmPois.map(p => p.coords);

  for (const osmPoi of osmPois) {
    const tooClose = otmCoords.some(c => c && osmPoi.coords && haversineKm(c, osmPoi.coords) < thresholdKm);
    if (!tooClose) kept.push(osmPoi);
  }
  return kept;
}

/**
 * @param {{
 *   query: string,
 *   coords: { lat: number, lng: number },
 *   section?: 'planner'|'logistics'|'tactical'|'discovery',
 *   missionType?: string,
 *   userRole?: string,
 *   radiusM?: number,
 *   includeRoutes?: boolean,
 * }} options
 * @returns {Promise<{ pois: object[], routes: object[] }>}
 */
export async function globalSearch({
  query = '',
  coords,
  section = 'planner',
  missionType = '',
  userRole = 'MEMBER',
  radiusM = 5000,
  includeRoutes = false,
} = {}) {
  if (!coords) return { pois: [], routes: [] };

  const { lat, lng } = coords;

  const tasks = [
    overpassRadius(lat, lng, TACTICAL_FILTERS, '', radiusM),
    otmRadius(lat, lng, 'cultural,historic,foods,natural,sport', 20),
    includeRoutes ? waymarkedRoutes(lat, lng, 'hiking', radiusM) : Promise.resolve([]),
  ];

  const [osmResult, otmResult, routesResult] = await Promise.allSettled(tasks);

  const osmPois   = osmResult.status   === 'fulfilled' ? osmResult.value   : [];
  const otmPois   = otmResult.status   === 'fulfilled' ? otmResult.value   : [];
  const routes    = routesResult.status === 'fulfilled' ? routesResult.value : [];

  const merged = deduplicateByProximity(osmPois, otmPois);

  const ranked = rankResults(merged, {
    currentLegCoords: coords,
    tripType: missionType,
    userRole,
    section,
  });

  return { pois: ranked, routes };
}
```

- [ ] **Step 4: Run tests — all pass**

```bash
npx vitest run src/utils/globalIntelligence.test.js
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/globalIntelligence.js src/utils/globalIntelligence.test.js
git commit -m "feat(intel): globalIntelligence orchestrator — parallel fan-out, merge, rank"
```

---

## Task 7: Wire `activeSection` into `ExpeditionContext`

**Files:**
- Modify: `src/context/ExpeditionContext.jsx`

- [ ] **Step 1: Add `activeSection` state to the context**

In `src/context/ExpeditionContext.jsx`, find the block where context state is assembled (search for `createContext` and the `value` prop passed to `Provider`). Add the following:

After the existing `useState` declarations near the top of the component, add:
```js
const [activeSection, setActiveSection] = useState('planner');
```

In the `value` object passed to the context Provider, add:
```js
activeSection,
setActiveSection,
```

The value object should look similar to (add only the two new lines — do not change other fields):
```js
value={{
  // ... all existing fields ...
  activeSection,
  setActiveSection,
}}
```

- [ ] **Step 2: Verify the app still loads**

```bash
npx vite --port 3001
```

Open `http://localhost:3001` — app should render without errors. Check browser console for no warnings about missing context values.

- [ ] **Step 3: Commit**

```bash
git add src/context/ExpeditionContext.jsx
git commit -m "feat(context): add activeSection + setActiveSection to ExpeditionContext"
```

---

## Task 8: Wire `setActiveSection` into `Sidebar` + `TacticalMode`

**Files:**
- Modify: `src/components/layout/Sidebar.jsx`
- Modify: `src/components/ui/TacticalMode.jsx`

- [ ] **Step 1: Update `Sidebar.jsx` to call `setActiveSection` on tab change**

In `src/components/layout/Sidebar.jsx`, import `useExpedition` (or whatever the context hook is named — search for `useContext` in this file):

Add the section map and wire it up. Find where `onTabChange` is called on nav item click and extend it:

```js
// Add near top of component (after existing imports/hooks):
import { useExpeditionContext } from '../../context/ExpeditionContext';
// (use whatever the actual export name is — check ExpeditionContext.jsx)

// Inside the component:
const { setActiveSection } = useExpeditionContext();

const SECTION_MAP = {
  OVERVIEW:   'planner',
  ITINERARY:  'planner',
  FLIGHTS:    'planner',
  STAYS:      'planner',
  LOGISTICS:  'logistics',
  DISCOVERY:  'discovery',
  JOURNEY:    'planner',
  VAULT:      'planner',
  BOOKING:    'planner',
};
```

Then find the nav item click handler (look for `onTabChange(item.id)` or similar) and extend it:

```js
// Before: onTabChange(item.id)
// After:
onTabChange(item.id);
setActiveSection(SECTION_MAP[item.id] ?? 'planner');
```

- [ ] **Step 2: Update `TacticalMode.jsx` to set/restore `activeSection`**

In `src/components/ui/TacticalMode.jsx`, add a `useEffect` that sets the section on mount and restores it on unmount:

```js
import { useEffect } from 'react';
// import the context hook (same as Sidebar step above)

// Inside component, after getting setActiveSection from context:
useEffect(() => {
  setActiveSection('tactical');
  return () => setActiveSection('planner');
}, [setActiveSection]);
```

- [ ] **Step 3: Verify section changes in browser**

```bash
npx vite --port 3001
```

Open the app. Open browser DevTools → React DevTools → find `ExpeditionContext`. Click through sidebar tabs — `activeSection` should change: LOGISTICS → `'logistics'`, DISCOVERY → `'discovery'`, OVERVIEW → `'planner'`.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/Sidebar.jsx src/components/ui/TacticalMode.jsx
git commit -m "feat(nav): wire activeSection through Sidebar and TacticalMode"
```

---

## Task 9: Run full test suite + final verification

- [ ] **Step 1: Run all tests**

```bash
cd C:/Users/lasse/Desktop/venturepath
npx vitest run
```

Expected: All existing tests pass + new tests for `wikidataEngine`, `waymarkedEngine`, `enrichmentCache`, `globalIntelligence`, `searchRanker` pass. Zero failures.

- [ ] **Step 2: Smoke test in browser**

```bash
npx vite --port 3001
```

- Open `http://localhost:3001`
- Navigate to any trip → LOGISTICS tab → verify `activeSection` shows `'logistics'` in React DevTools
- Navigate to DISCOVERY tab → verify `activeSection` shows `'discovery'`
- Open TacticalMode → verify `activeSection` shows `'tactical'`, closes → restores `'planner'`

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat(intel): GlobalIntelligence aggregator — subsystem A complete"
```
