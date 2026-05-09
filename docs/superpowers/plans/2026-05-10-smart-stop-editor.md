# Smart Stop Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dumb, manual StopEditor panel with a smart one that auto-ranks autocomplete results by proximity, fetches real route data (ORS) for viable travel modes, pre-fills visit duration from place type, and fixes the Inspire me stale-closure bug.

**Architecture:** A new `routeCache.js` (session Map) and `routeEngine.js` (ORS + haversine flight) provide route data. A new `useSmartStop.js` hook owns all intelligence and exposes clean state to `StopEditor.jsx`, which becomes a thin UI shell with a mode comparison table. `stopSearchEngine.js` gains a proximity re-ranking step. `useNearbySearch.js` gets a stale-closure fix and simplified Inspire me.

**Tech Stack:** React 18, Vite, OpenRouteService REST API (`VITE_ORS_API_KEY`), Foursquare Places v3 (`VITE_FSQ_API_KEY`), Nominatim (no key), OpenTripMap (`VITE_OTM_API_KEY`), Framer Motion, Vitest + jsdom

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/utils/routeCache.js` | Create | Session-lifetime in-memory cache keyed by coord pair |
| `src/utils/routeEngine.js` | Create | ORS routing, haversine flight estimate, mode filtering |
| `src/utils/stopSearchEngine.js` | Modify | Add haversine proximity re-ranking after results return |
| `src/hooks/useSmartStop.js` | Create | All stop-editor intelligence: autocomplete, routes, visit duration |
| `src/hooks/useNearbySearch.js` | Modify | Fix stale closure in `inspire()`, simplify to category-respecting search |
| `src/components/trip/StopEditor.jsx` | Refactor | Thin UI shell consuming useSmartStop; mode comparison table |
| `.env.example` | Modify | Document VITE_ORS_API_KEY |
| `src/utils/routeCache.test.js` | Create | Unit tests for cache get/set/key rounding |
| `src/utils/routeEngine.test.js` | Create | Unit tests for haversine, mode filtering, ORS integration |
| `src/utils/stopSearchEngine.test.js` | Create | Unit tests for proximity re-ranking |
| `src/hooks/useSmartStop.test.js` | Create | Unit tests for hook state transitions |

---

## Task 1: Route Cache Utility

**Files:**
- Create: `src/utils/routeCache.js`
- Create: `src/utils/routeCache.test.js`

- [ ] **Step 1: Write the failing tests**

Create `src/utils/routeCache.test.js`:

```js
import { describe, it, expect, beforeEach } from 'vitest';
import { getCached, setCached, makeCacheKey, clearCache } from './routeCache';

describe('routeCache', () => {
  beforeEach(() => clearCache());

  it('returns null for a cache miss', () => {
    const key = makeCacheKey({ lat: 51.5074, lng: -0.1278 }, { lat: 48.8566, lng: 2.3522 });
    expect(getCached(key)).toBeNull();
  });

  it('returns stored value on hit', () => {
    const key = makeCacheKey({ lat: 51.5074, lng: -0.1278 }, { lat: 48.8566, lng: 2.3522 });
    const data = [{ mode: 'car', durationH: 5, distanceKm: 450 }];
    setCached(key, data);
    expect(getCached(key)).toEqual(data);
  });

  it('rounds coords to 4dp so near-identical coords hit the same key', () => {
    const key1 = makeCacheKey({ lat: 51.50741, lng: -0.12781 }, { lat: 48.85661, lng: 2.35221 });
    const key2 = makeCacheKey({ lat: 51.5074,  lng: -0.1278  }, { lat: 48.8566,  lng: 2.3522  });
    expect(key1).toBe(key2);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/utils/routeCache.test.js
```
Expected: FAIL — `routeCache` module not found.

- [ ] **Step 3: Implement routeCache.js**

Create `src/utils/routeCache.js`:

```js
const cache = new Map();

export function makeCacheKey(fromCoords, toCoords) {
  const r = (n) => Math.round(n * 10000) / 10000;
  return `${r(fromCoords.lat)},${r(fromCoords.lng)}|${r(toCoords.lat)},${r(toCoords.lng)}`;
}

export function getCached(key) {
  return cache.has(key) ? cache.get(key) : null;
}

export function setCached(key, value) {
  cache.set(key, value);
}

export function clearCache() {
  cache.clear();
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/utils/routeCache.test.js
```
Expected: PASS — 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/utils/routeCache.js src/utils/routeCache.test.js
git commit -m "feat: add session route cache utility"
```

---

## Task 2: Route Engine Utility

**Files:**
- Create: `src/utils/routeEngine.js`
- Create: `src/utils/routeEngine.test.js`

- [ ] **Step 1: Write the failing tests**

Create `src/utils/routeEngine.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { haversineKm, filterModes, parseOrsResponse } from './routeEngine';

describe('haversineKm', () => {
  it('returns ~5570 km between London and New York', () => {
    const km = haversineKm({ lat: 51.5074, lng: -0.1278 }, { lat: 40.7128, lng: -74.006 });
    expect(km).toBeGreaterThan(5500);
    expect(km).toBeLessThan(5700);
  });

  it('returns ~0 for identical coords', () => {
    const km = haversineKm({ lat: 48.8566, lng: 2.3522 }, { lat: 48.8566, lng: 2.3522 });
    expect(km).toBeCloseTo(0, 1);
  });
});

describe('filterModes', () => {
  it('excludes flight when distance < 1 km', () => {
    const modes = filterModes(0.5);
    expect(modes).not.toContain('flight');
  });

  it('includes flight when distance > 1 km', () => {
    const modes = filterModes(200);
    expect(modes).toContain('flight');
  });

  it('excludes foot and cycling when distance > 500 km', () => {
    const modes = filterModes(600);
    expect(modes).not.toContain('foot');
    expect(modes).not.toContain('cycling');
  });

  it('includes all modes for medium distance (50 km)', () => {
    const modes = filterModes(50);
    expect(modes).toContain('car');
    expect(modes).toContain('foot');
    expect(modes).toContain('cycling');
    expect(modes).toContain('flight');
  });
});

describe('parseOrsResponse', () => {
  it('extracts duration and distance from ORS summary', () => {
    const orsJson = {
      routes: [{ summary: { distance: 450000, duration: 18000 } }]
    };
    const result = parseOrsResponse(orsJson, 'car');
    expect(result.mode).toBe('car');
    expect(result.distanceKm).toBeCloseTo(450, 0);
    expect(result.durationH).toBeCloseTo(5, 0);
  });

  it('returns null values when ORS response is malformed', () => {
    const result = parseOrsResponse({}, 'car');
    expect(result.durationH).toBeNull();
    expect(result.distanceKm).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/utils/routeEngine.test.js
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement routeEngine.js**

Create `src/utils/routeEngine.js`:

```js
import { getCached, setCached, makeCacheKey } from './routeCache';

const ORS_KEY = import.meta.env.VITE_ORS_API_KEY ?? '';
const ORS_BASE = 'https://api.openrouteservice.org/v2/directions';

const ORS_PROFILE = {
  car:     'driving-car',
  foot:    'foot-walking',
  cycling: 'cycling-regular',
};

// Exported for tests
export function haversineKm(a, b) {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const c = sinLat * sinLat +
    Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * sinLng * sinLng;
  return R * 2 * Math.atan2(Math.sqrt(c), Math.sqrt(1 - c));
}

// Exported for tests
export function filterModes(distanceKm) {
  const all = ['car', 'foot', 'cycling', 'flight', 'train', 'boat'];
  return all.filter(m => {
    if (m === 'flight' && distanceKm < 1) return false;
    if ((m === 'foot' || m === 'cycling') && distanceKm > 500) return false;
    return true;
  });
}

// Exported for tests
export function parseOrsResponse(json, mode) {
  try {
    const summary = json.routes?.[0]?.summary;
    if (!summary) return { mode, durationH: null, distanceKm: null };
    return {
      mode,
      durationH:  Math.round((summary.duration / 3600) * 10) / 10,
      distanceKm: Math.round(summary.distance / 1000),
    };
  } catch {
    return { mode, durationH: null, distanceKm: null };
  }
}

async function fetchOrsMode(fromCoords, toCoords, mode) {
  const profile = ORS_PROFILE[mode];
  if (!profile || !ORS_KEY) return { mode, durationH: null, distanceKm: null };
  try {
    const res = await fetch(`${ORS_BASE}/${profile}`, {
      method: 'POST',
      headers: { 'Authorization': ORS_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        coordinates: [
          [fromCoords.lng, fromCoords.lat],
          [toCoords.lng, toCoords.lat],
        ],
      }),
    });
    if (!res.ok) return { mode, durationH: null, distanceKm: null };
    return parseOrsResponse(await res.json(), mode);
  } catch {
    return { mode, durationH: null, distanceKm: null };
  }
}

function flightEstimate(fromCoords, toCoords) {
  const km = haversineKm(fromCoords, toCoords);
  const cruiseSpeed = 800; // km/h
  const overhead = 1.5;   // h for boarding/taxi/approach
  return {
    mode: 'flight',
    durationH: Math.round((km / cruiseSpeed + overhead) * 10) / 10,
    distanceKm: Math.round(km),
  };
}

/**
 * Fetch route data for all viable modes between two coordinate pairs.
 * Returns an array of { mode, durationH, distanceKm } — durationH/distanceKm
 * are null for manual modes (train, boat) or when ORS fails.
 */
export async function fetchRoutes(fromCoords, toCoords) {
  const cacheKey = makeCacheKey(fromCoords, toCoords);
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const distKm = haversineKm(fromCoords, toCoords);
  const modes = filterModes(distKm);

  const groundModes = modes.filter(m => ORS_PROFILE[m]);
  const manualModes = modes.filter(m => m === 'train' || m === 'boat');

  const [groundResults, flightResult] = await Promise.all([
    Promise.all(groundModes.map(m => fetchOrsMode(fromCoords, toCoords, m))),
    modes.includes('flight') ? Promise.resolve(flightEstimate(fromCoords, toCoords)) : Promise.resolve(null),
  ]);

  const results = [
    ...groundResults,
    ...(flightResult ? [flightResult] : []),
    ...manualModes.map(m => ({ mode: m, durationH: null, distanceKm: null })),
  ];

  setCached(cacheKey, results);
  return results;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/utils/routeEngine.test.js
```
Expected: PASS — 8 tests.

- [ ] **Step 5: Commit**

```bash
git add src/utils/routeEngine.js src/utils/routeEngine.test.js
git commit -m "feat: add route engine with ORS integration and haversine flight estimate"
```

---

## Task 3: Proximity Re-ranking in stopSearchEngine

**Files:**
- Modify: `src/utils/stopSearchEngine.js`
- Create: `src/utils/stopSearchEngine.test.js`

- [ ] **Step 1: Write the failing tests**

Create `src/utils/stopSearchEngine.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { rankByProximity } from './stopSearchEngine';

const paris = { lat: 48.8566, lng: 2.3522 };

describe('rankByProximity', () => {
  it('sorts results closest to reference coord first', () => {
    const results = [
      { id: '1', name: 'London', coords: { lat: 51.5074, lng: -0.1278 } },  // ~341 km
      { id: '2', name: 'Lyon',   coords: { lat: 45.75, lng: 4.85 } },        // ~393 km
      { id: '3', name: 'Reims',  coords: { lat: 49.2583, lng: 4.0317 } },    // ~136 km
    ];
    const ranked = rankByProximity(results, paris);
    expect(ranked[0].name).toBe('Reims');
    expect(ranked[1].name).toBe('London');
  });

  it('passes through results without coords unchanged in relative order', () => {
    const results = [
      { id: '1', name: 'A', coords: null },
      { id: '2', name: 'B', coords: null },
    ];
    const ranked = rankByProximity(results, paris);
    expect(ranked.map(r => r.name)).toEqual(['A', 'B']);
  });

  it('returns original array when refCoords is null', () => {
    const results = [{ id: '1', name: 'X', coords: { lat: 0, lng: 0 } }];
    expect(rankByProximity(results, null)).toEqual(results);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/utils/stopSearchEngine.test.js
```
Expected: FAIL — `rankByProximity` not exported.

- [ ] **Step 3: Update stopSearchEngine.js**

Replace `src/utils/stopSearchEngine.js` with:

```js
import { searchPlaces as fsqSearch } from './foursquareEngine';
import { searchLocations } from './geocodeEngine';
import { haversineKm } from './routeEngine';

// Exported for tests
export function rankByProximity(results, refCoords) {
  if (!refCoords) return results;
  return [...results].sort((a, b) => {
    const dA = a.coords ? haversineKm(a.coords, refCoords) : Infinity;
    const dB = b.coords ? haversineKm(b.coords, refCoords) : Infinity;
    return dA - dB;
  });
}

// Unified stop search: Foursquare (if key set) → Nominatim fallback
// destCoords: resolved { lat, lng } of trip destination for proximity ranking
export async function searchStops(query, nearCity = '', destCoords = null) {
  const fsqResults = await fsqSearch(query, nearCity);
  if (fsqResults.length > 0) return rankByProximity(fsqResults, destCoords);

  const nominatim = await searchLocations(`${query} ${nearCity}`.trim(), 5);
  const mapped = nominatim.map(r => ({
    id: String(r.id),
    name: r.name,
    address: r.address,
    type: r.type ?? 'Place',
    coords: r.coords,
  }));
  return rankByProximity(mapped, destCoords);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/utils/stopSearchEngine.test.js
```
Expected: PASS — 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/utils/stopSearchEngine.js src/utils/stopSearchEngine.test.js
git commit -m "feat: add proximity re-ranking to stop search results"
```

---

## Task 4: useSmartStop Hook

**Files:**
- Create: `src/hooks/useSmartStop.js`
- Create: `src/hooks/useSmartStop.test.js`

- [ ] **Step 1: Write the failing tests**

Create `src/hooks/useSmartStop.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { getVisitDurationSuggestion } from './useSmartStop';

describe('getVisitDurationSuggestion', () => {
  it('returns ~2.5h for museum', () => {
    expect(getVisitDurationSuggestion('Museum')).toBe('~2.5h');
  });

  it('returns ~1.5h for restaurant', () => {
    expect(getVisitDurationSuggestion('Restaurant')).toBe('~1.5h');
  });

  it('returns ~2h for bar', () => {
    expect(getVisitDurationSuggestion('Bar')).toBe('~2h');
  });

  it('returns ~3h for park', () => {
    expect(getVisitDurationSuggestion('Park')).toBe('~3h');
  });

  it('returns null for hotel', () => {
    expect(getVisitDurationSuggestion('Hotel')).toBeNull();
  });

  it('returns null for unknown type', () => {
    expect(getVisitDurationSuggestion('Bookshop')).toBeNull();
  });

  it('is case-insensitive', () => {
    expect(getVisitDurationSuggestion('CAFE')).toBe('~1.5h');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/hooks/useSmartStop.test.js
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement useSmartStop.js**

Create `src/hooks/useSmartStop.js`:

```js
import { useState, useEffect, useRef, useCallback } from 'react';
import { searchStops } from '../utils/stopSearchEngine';
import { geocodeLocation } from '../utils/geocodeEngine';
import { fetchRoutes } from '../utils/routeEngine';

// Exported for tests
export function getVisitDurationSuggestion(placeType) {
  if (!placeType) return null;
  const t = placeType.toLowerCase();
  if (/museum|gallery|exhibition/.test(t))           return '~2.5h';
  if (/restaurant|café|cafe|coffee/.test(t))         return '~1.5h';
  if (/bar|nightclub|pub/.test(t))                   return '~2h';
  if (/park|nature|reserve|garden/.test(t))          return '~3h';
  if (/hik|trail/.test(t))                           return '~3h';
  if (/historic|landmark|monument|church|castle/.test(t)) return '~1.5h';
  if (/hotel|hostel|accommodation|lodge/.test(t))    return null;
  return null;
}

function useDebounceSearch(query, destCoords, tripDestination, delay = 400) {
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setSearching(true);
      const res = await searchStops(query, tripDestination, destCoords);
      setResults(res);
      setSearching(false);
    }, delay);
    return () => clearTimeout(timer.current);
  }, [query, destCoords, tripDestination, delay]);

  return { results, searching, clear: () => setResults([]) };
}

export function useSmartStop(trip) {
  const [destCoords, setDestCoords] = useState(null);

  // Resolved coords + place type for each field
  const [fromCoords, setFromCoords] = useState(null);
  const [toCoords, setToCoords]     = useState(null);
  const [toPlaceType, setToPlaceType] = useState(null);

  // Route data
  const [routes, setRoutes]               = useState([]);
  const [loadingRoutes, setLoadingRoutes] = useState(false);

  // Autocomplete query strings (decoupled from committed field values)
  const [fromQuery, setFromQuery] = useState('');
  const [toQuery, setToQuery]     = useState('');

  const fromAC = useDebounceSearch(fromQuery, destCoords, trip?.destination ?? '');
  const toAC   = useDebounceSearch(toQuery,   destCoords, trip?.destination ?? '');

  // Resolve trip destination coords once on mount
  useEffect(() => {
    if (!trip?.destination) return;
    geocodeLocation(trip.destination).then(coords => {
      if (coords) setDestCoords(coords);
    });
  }, [trip?.destination]);

  const triggerRoutesFetch = useCallback(async (from, to) => {
    if (!from || !to) return;
    setLoadingRoutes(true);
    setRoutes([]);
    try {
      const result = await fetchRoutes(from, to);
      setRoutes(result);
    } finally {
      setLoadingRoutes(false);
    }
  }, []);

  function pickFrom(place) {
    setFromQuery('');
    fromAC.clear();
    if (place.coords) {
      setFromCoords(place.coords);
      if (toCoords) triggerRoutesFetch(place.coords, toCoords);
    }
  }

  function pickTo(place) {
    setToQuery('');
    toAC.clear();
    if (place.coords) {
      setToCoords(place.coords);
      setToPlaceType(place.type ?? null);
      if (fromCoords) triggerRoutesFetch(fromCoords, place.coords);
    }
  }

  const visitDurationSuggestion = getVisitDurationSuggestion(toPlaceType);

  return {
    // Autocomplete
    fromQuery, setFromQuery,
    toQuery,   setToQuery,
    fromResults: fromAC.results,
    toResults:   toAC.results,
    fromSearching: fromAC.searching,
    toSearching:   toAC.searching,
    pickFrom,
    pickTo,
    // Routes
    routes,
    loadingRoutes,
    // Duration hint
    visitDurationSuggestion,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/hooks/useSmartStop.test.js
```
Expected: PASS — 7 tests.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useSmartStop.js src/hooks/useSmartStop.test.js
git commit -m "feat: add useSmartStop hook with proximity autocomplete, route fetching, visit duration"
```

---

## Task 5: Fix Inspire Me in useNearbySearch

**Files:**
- Modify: `src/hooks/useNearbySearch.js`

- [ ] **Step 1: Locate the stale closure**

Open `src/hooks/useNearbySearch.js`. The problem is in `inspire()` (line ~112): it calls `search(parsed.kinds)` but `search` is defined with `useCallback` capturing `anchor` at creation time. When `inspire()` runs, `anchor` in `search`'s closure may already be stale.

Also note: `inspire()` overrides `category` via `setCategory(parsed.kinds)` then calls `search(parsed.kinds)` directly — bypassing the category state entirely. New behaviour: respect the *currently selected* category.

- [ ] **Step 2: Rewrite inspire() and remove AI override**

In `src/hooks/useNearbySearch.js`, replace the entire `inspire` function and the `callInspireAI` function with:

```js
// Replace callInspireAI and inspire functions with:
async function inspire() {
  // Use an anchor ref so we always read the latest value, not a stale closure
  await search(category);
}
```

And add an anchor ref at the top of the hook (after the `geoCache` ref):

```js
const anchorRef = useRef(anchor);
useEffect(() => { anchorRef.current = anchor; }, [anchor]);
```

Then update the `search` callback to read from `anchorRef.current` instead of `anchor` from closure:

```js
const search = useCallback(async (kindsOverride) => {
  const loc = anchorRef.current.trim();   // ← changed: use ref
  if (!loc) return;
  setLoading(true);
  setError(null);
  try {
    const geo = await resolveGeo(loc);
    if (!geo) { setError('Could not find location'); setLoading(false); return; }
    const kinds = kindsOverride ?? category;
    const places = await otmRadius(geo.lat, geo.lng, kinds, 12);
    setRaw(places);
  } catch {
    setError('Search failed');
  } finally {
    setLoading(false);
  }
}, [category]);  // anchor removed from deps — read via ref
```

Also remove `inspireLabel` from the return value and its state (`inspireLabel`, `setInspireLabel`) since Inspire me no longer sets a custom label. Update the return object:

```js
return {
  anchor, setAnchor,
  category, setCategory,
  sortBy, setSortBy,
  results,
  loading, error,
  inspire,
  search,
};
```

- [ ] **Step 3: Update NearbyDrawer to remove inspireLabel**

In `src/components/nearby/NearbyDrawer.jsx`, remove `inspireLabel` from the destructure:

```js
const {
  anchor, setAnchor,
  category, setCategory,
  sortBy, setSortBy,
  results, loading, error,
  inspire,
} = useNearbySearch(defaultAnchor);
```

And update the Inspire me button label:

```jsx
<button
  type="button"
  onClick={inspire}
  disabled={loading}
  className="w-full py-2 rounded-lg text-xs font-semibold text-white transition-opacity"
  style={{ background: 'var(--cta)', opacity: loading ? 0.6 : 1 }}
>
  {loading ? 'Searching…' : '✨ Inspire me'}
</button>
```

- [ ] **Step 4: Manually verify in browser**

Start the dev server:
```bash
npm run dev
```
1. Open the app → open "Add a stop"
2. Expand "Find nearby" — set anchor to any city (e.g. "Hamburg")
3. Select "Cafés" category
4. Click "Inspire me" — results should appear, category should stay on Cafés
5. Switch to "Bars", click "Inspire me" again — should show bar results, not switch back to Cafés

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useNearbySearch.js src/components/nearby/NearbyDrawer.jsx
git commit -m "fix: inspire me respects selected category and fixes stale closure bug"
```

---

## Task 6: Refactor StopEditor to use useSmartStop

**Files:**
- Modify: `src/components/trip/StopEditor.jsx`

- [ ] **Step 1: Understand the current structure**

`StopEditor.jsx` currently owns its own `useLocationAutocomplete` hook (local, defined in the file). This will be replaced by `useSmartStop`. The component also has a static `MODES` array driving pill buttons — this becomes a mode comparison table when `routes` is available.

- [ ] **Step 2: Replace the component**

Replace `src/components/trip/StopEditor.jsx` with:

```jsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTripStore } from '../../store/useTripStore';
import { useSmartStop } from '../../hooks/useSmartStop';
import NearbyDrawer from '../nearby/NearbyDrawer';

const MODE_META = {
  car:     { label: 'Car',          icon: '🚗' },
  foot:    { label: 'Foot',         icon: '🥾' },
  cycling: { label: 'Bus / Cycle',  icon: '🚌' },
  flight:  { label: 'Flight',       icon: '✈' },
  train:   { label: 'Train',        icon: '🚆' },
  boat:    { label: 'Boat',         icon: '⛵' },
};

function SuggestionList({ results, onPick }) {
  if (!results.length) return null;
  return (
    <ul
      className="absolute z-20 w-full mt-1 rounded-lg shadow-lg overflow-hidden"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      {results.map(r => (
        <li key={r.id}>
          <button
            type="button"
            onClick={() => onPick(r)}
            className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--surface-raised)]"
            style={{ color: 'var(--text-primary)' }}
          >
            <span className="font-medium">{r.name}</span>
            {r.address && r.address !== r.name && (
              <span className="block text-xs truncate" style={{ color: 'var(--text-muted)' }}>{r.address}</span>
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}

function EntryPicker({ legs, onSelect, onClose }) {
  const allPoints = legs.flatMap(l => [
    { label: l.from, sub: `From — ${l.to}` },
    { label: l.to,   sub: `To — ${l.from}` },
  ]);
  const seen = new Set();
  const unique = allPoints.filter(p => {
    if (seen.has(p.label)) return false;
    seen.add(p.label);
    return true;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.15 }}
      className="absolute z-30 w-full mt-1 rounded-lg shadow-xl overflow-hidden"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
        <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>PICK FROM TRIP</span>
        <button type="button" onClick={onClose} className="text-xs" style={{ color: 'var(--text-muted)' }}>✕</button>
      </div>
      {unique.length === 0 && (
        <p className="px-3 py-2 text-xs" style={{ color: 'var(--text-muted)' }}>No stops yet.</p>
      )}
      {unique.map(p => (
        <button
          key={p.label}
          type="button"
          onClick={() => onSelect(p.label)}
          className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--surface-raised)]"
          style={{ color: 'var(--text-primary)' }}
        >
          <span className="font-medium">{p.label}</span>
          <span className="block text-xs" style={{ color: 'var(--text-muted)' }}>{p.sub}</span>
        </button>
      ))}
    </motion.div>
  );
}

function ModeRow({ route, selected, onSelect }) {
  const meta = MODE_META[route.mode] ?? { label: route.mode, icon: '•' };
  const hasData = route.durationH != null && route.distanceKm != null;
  const durationLabel = hasData
    ? `${Math.floor(route.durationH)}h ${Math.round((route.durationH % 1) * 60)}m`
    : '—';
  const distanceLabel = hasData ? `${route.distanceKm} km` : '—';

  return (
    <button
      type="button"
      onClick={() => onSelect(route)}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors"
      style={{
        background: selected ? 'var(--cta)' : 'var(--surface-raised)',
        color: selected ? '#fff' : 'var(--text-primary)',
        border: `1px solid ${selected ? 'var(--cta)' : 'var(--border)'}`,
      }}
    >
      <span className="text-base">{meta.icon}</span>
      <span className="flex-1 text-left font-medium">{meta.label}</span>
      {hasData && (
        <span className="text-xs font-mono" style={{ color: selected ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)' }}>
          {durationLabel} · {distanceLabel}
        </span>
      )}
      {!hasData && (
        <span className="text-xs" style={{ color: selected ? 'rgba(255,255,255,0.6)' : 'var(--text-muted)' }}>manual</span>
      )}
    </button>
  );
}

function SkeletonModeRow() {
  return (
    <div className="w-full h-10 rounded-lg animate-pulse" style={{ background: 'var(--surface-raised)' }} />
  );
}

export default function StopEditor({ leg = null, defaultFrom = '', onClose }) {
  const { trip, legs, addLeg, updateLeg, removeLeg } = useTripStore();
  const isEdit = !!leg;

  const [from, setFrom] = useState(leg?.from ?? defaultFrom);
  const [to, setTo]     = useState(leg?.to ?? '');
  const [mode, setMode] = useState(leg?.mode ?? 'car');
  const [durationH, setDurationH]   = useState(leg?.durationH ?? '');
  const [distanceKm, setDistanceKm] = useState(leg?.distanceKm ?? '');
  const [showEntryPicker, setShowEntryPicker] = useState(false);

  const smart = useSmartStop(trip);

  function handlePickFrom(place) {
    setFrom(place.name);
    smart.setFromQuery('');
    smart.pickFrom(place);
  }

  function handlePickTo(place) {
    setTo(place.name);
    smart.setToQuery('');
    smart.pickTo(place);
  }

  function handleFromChange(val) {
    setFrom(val);
    smart.setFromQuery(val);
  }

  function handleToChange(val) {
    setTo(val);
    smart.setToQuery(val);
  }

  function handleModeRowSelect(route) {
    setMode(route.mode);
    if (route.durationH != null) setDurationH(String(route.durationH));
    if (route.distanceKm != null) setDistanceKm(String(route.distanceKm));
  }

  function handleSubmit(e) {
    e.preventDefault();
    const data = {
      from: from.trim(),
      to: to.trim(),
      mode,
      durationH:  parseFloat(durationH) || 0,
      distanceKm: parseFloat(distanceKm) || 0,
    };
    if (isEdit) {
      updateLeg({ ...data, id: leg.id, status: leg.status });
    } else {
      addLeg(data);
    }
    onClose();
  }

  function handleDelete() {
    if (isEdit) removeLeg(leg.id);
    onClose();
  }

  const showTable = smart.routes.length > 0;
  const showSkeleton = smart.loadingRoutes;

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 260 }}
      className="fixed top-0 right-0 h-full z-40 w-80 shadow-2xl flex flex-col"
      style={{ background: 'var(--surface)', borderLeft: '1px solid var(--border)' }}
    >
      <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
        <h3 className="font-editorial text-base" style={{ color: 'var(--text-primary)' }}>
          {isEdit ? 'Edit stop' : 'Add a stop'}
        </h3>
        <button onClick={onClose} className="text-lg" style={{ color: 'var(--text-muted)' }}>✕</button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* From */}
          <div className="relative">
            <div className="flex items-center justify-between mb-1.5">
              <label className="label-tag">From</label>
              <button
                type="button"
                onClick={() => setShowEntryPicker(v => !v)}
                className="text-xs px-2 py-0.5 rounded"
                style={{ background: 'var(--surface-raised)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
              >
                Select entry
              </button>
            </div>
            <input
              type="text"
              value={from}
              onChange={e => handleFromChange(e.target.value)}
              onFocus={() => from && smart.setFromQuery(from)}
              required
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
            {smart.fromSearching && (
              <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>searching…</div>
            )}
            <AnimatePresence>
              {showEntryPicker && (
                <EntryPicker
                  legs={legs}
                  onSelect={name => { setFrom(name); smart.setFromQuery(''); setShowEntryPicker(false); }}
                  onClose={() => setShowEntryPicker(false)}
                />
              )}
            </AnimatePresence>
            {!showEntryPicker && (
              <SuggestionList results={smart.fromResults} onPick={handlePickFrom} />
            )}
          </div>

          {/* Nearby search */}
          <NearbyDrawer
            anchor={from}
            onSelectPlace={name => {
              setTo(name);
              smart.setToQuery('');
            }}
          />

          {/* To */}
          <div className="relative">
            <label className="label-tag block mb-1.5">To</label>
            <input
              type="text"
              value={to}
              onChange={e => handleToChange(e.target.value)}
              onFocus={() => to && smart.setToQuery(to)}
              required
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
            {smart.toSearching && (
              <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>searching…</div>
            )}
            <SuggestionList results={smart.toResults} onPick={handlePickTo} />
          </div>

          {/* Travel mode — comparison table or skeletons or plain label */}
          <div>
            <label className="label-tag block mb-1.5">Travel mode</label>
            {showSkeleton && (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <SkeletonModeRow key={i} />)}
              </div>
            )}
            {!showSkeleton && showTable && (
              <div className="space-y-1.5">
                {smart.routes.map(route => (
                  <ModeRow
                    key={route.mode}
                    route={route}
                    selected={mode === route.mode}
                    onSelect={handleModeRowSelect}
                  />
                ))}
              </div>
            )}
            {!showSkeleton && !showTable && (
              <div className="flex flex-wrap gap-2">
                {Object.entries(MODE_META).map(([value, meta]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setMode(value)}
                    className="px-2.5 py-1 rounded-full text-xs font-medium transition-colors"
                    style={{
                      background: mode === value ? 'var(--cta)' : 'var(--surface-raised)',
                      color: mode === value ? '#fff' : 'var(--text-secondary)',
                      border: `1px solid ${mode === value ? 'var(--cta)' : 'var(--border)'}`,
                    }}
                  >
                    {meta.icon} {meta.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Duration + Distance */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-tag block mb-1.5">Duration (h)</label>
              <input
                type="number" min="0" step="0.5"
                value={durationH}
                onChange={e => setDurationH(e.target.value)}
                placeholder={smart.visitDurationSuggestion ?? ''}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              />
            </div>
            <div>
              <label className="label-tag block mb-1.5">Distance (km)</label>
              <input
                type="number" min="0"
                value={distanceKm}
                onChange={e => setDistanceKm(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              />
            </div>
          </div>

          <div className="pt-2 space-y-2">
            <button
              type="submit"
              className="w-full py-2.5 rounded-lg text-sm font-semibold text-white"
              style={{ background: 'var(--cta)' }}
            >
              {isEdit ? 'Save changes' : 'Add stop'}
            </button>
            {isEdit && (
              <button
                type="button"
                onClick={handleDelete}
                className="w-full py-2 rounded-lg text-sm transition-colors"
                style={{ background: 'transparent', color: 'var(--status-alert)', border: '1px solid var(--status-alert)' }}
              >
                Remove stop
              </button>
            )}
          </div>
        </form>
      </div>
    </motion.div>
  );
}
```

- [ ] **Step 2: Manually verify in browser**

```bash
npm run dev
```

Test the following:
1. Open "Add a stop" — From field pre-fills with last leg's destination (via `defaultFrom`)
2. Type a city name in From — suggestions appear, closest to trip destination are ranked first
3. Pick a From suggestion — coords stored internally
4. Type a destination in To — suggestions ranked by proximity
5. Pick a To suggestion — skeleton rows appear in Travel mode section, then resolve to real durations
6. Tap a mode row — Duration and Distance fields pre-fill
7. If destination is a restaurant/café type — Duration placeholder shows `~1.5h`
8. Flight row absent when From and To are within the same city

- [ ] **Step 3: Commit**

```bash
git add src/components/trip/StopEditor.jsx
git commit -m "feat: refactor StopEditor to use useSmartStop with mode comparison table"
```

---

## Task 7: Environment Variable Documentation

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: Add ORS key to .env.example**

Open `.env.example` (create it if it doesn't exist) and add:

```bash
# OpenRouteService — optional. Without this, route data is unavailable and travel mode is manual.
# Get a free key at https://openrouteservice.org/dev/#/signup
VITE_ORS_API_KEY=

# Foursquare Places v3 — optional. Without this, autocomplete falls back to Nominatim (OSM).
VITE_FSQ_API_KEY=

# OpenTripMap — optional. Required for "Find nearby" feature.
VITE_OTM_API_KEY=

# Anthropic — optional. Used for AI features.
VITE_ANTHROPIC_API_KEY=
```

- [ ] **Step 2: Commit**

```bash
git add .env.example
git commit -m "docs: document VITE_ORS_API_KEY and other env vars in .env.example"
```

---

## Task 8: Full Integration Smoke Test

- [ ] **Step 1: Run all unit tests**

```bash
npx vitest run
```
Expected: all tests pass.

- [ ] **Step 2: Start dev server and run through the full golden path**

```bash
npm run dev
```

Golden path:
1. Create or load a trip with a known destination (e.g. "Hamburg, Germany")
2. Open "Add a stop"
3. From: type "Gänsemarkt" → pick the Hamburg result (not a global one)
4. To: type "Miniatur Wunderland" → pick result → skeleton rows appear → resolve to Car/Foot/Bus/Cycle/Flight data
5. Flight row should NOT appear (both stops are within Hamburg)
6. Select Car row → Duration and Distance pre-fill with ORS data
7. Duration placeholder (if visible) should reflect place type
8. Open "Find nearby" → select Cafés → click "Inspire me" → café results appear, category stays on Cafés
9. Submit the stop — appears in the itinerary

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: smart stop editor — proximity autocomplete, ORS routing, visit duration, inspire me fix"
```
