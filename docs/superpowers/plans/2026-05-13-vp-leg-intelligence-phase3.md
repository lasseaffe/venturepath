# Leg Intelligence Phase 3 — Foot Legs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add full foot-leg intelligence: elevation profile, trail permits, water sources, resupply waypoints, and GPX→Vault wiring, surfaced in a new LegLensFoot component.

**Architecture:** A new `footEngine.js` fetches Open Elevation data and Overpass water/resupply nodes, builds `legMeta.foot`, and auto-creates waypoints (water, resupply, permit). `LegLensFoot.jsx` renders elevation stats, permit status, and water cards. GPX files are stored as base64 blobs in a `vault` slice on the store and referenced via `legMeta.foot.gpxFileId`. `waypointCategories.js` gains `water`, `resupply`, and `permit` entries. `LegLens.jsx` dispatches `foot` mode to the new component.

**Tech Stack:** Vite + React 19, React Context+useReducer (NOT Zustand), Vitest + React Testing Library (globals:true, jsdom), Open Elevation API (`https://api.open-elevation.com/api/v1/lookup`), Overpass API (already wired in adapters/overpass.js), JetBrains Mono throughout.

---

## File Map

**New files:**
- `src/utils/legIntelligence/adapters/openElevation.js`
- `src/utils/legIntelligence/adapters/overpassTrail.js` (water + resupply Overpass query, separate from car's overpass.js)
- `src/utils/legIntelligence/engines/footEngine.js`
- `src/utils/legIntelligence/__tests__/footEngine.test.js`
- `src/utils/legIntelligence/__tests__/openElevation.test.js`
- `src/utils/legIntelligence/__tests__/overpassTrail.test.js`
- `src/components/legLens/LegLensFoot.jsx`
- `src/components/legLens/__tests__/LegLensFoot.test.jsx`

**Modified files:**
- `src/utils/legIntelligence/waypointCategories.js` — add `water`, `resupply`, `permit` categories
- `src/utils/legIntelligence/index.js` — register `foot` engine
- `src/store/useTripStore.jsx` — add `vault` slice + `ADD_VAULT_FILE` reducer + `addVaultFile` action creator
- `src/components/legLens/LegLens.jsx` — dispatch `foot` mode to LegLensFoot

---

## Task 0: Add `water`, `resupply`, `permit` to waypointCategories

**Files:**
- Modify: `src/utils/legIntelligence/waypointCategories.js`

- [ ] **Step 1: Write the failing test**

Add to `src/utils/legIntelligence/__tests__/waypointCategories.test.js` (which already exists — append these test cases):

```js
it('returns Spruce color for water category', () => {
  expect(getCategoryStyle('water').color).toBe('#3A6B5C');
});
it('returns Sandstone color for resupply category', () => {
  expect(getCategoryStyle('resupply').color).toBe('#D9C5B2');
});
it('returns Golden Hour color for permit category', () => {
  expect(getCategoryStyle('permit').color).toBe('#F2C94C');
});
```

- [ ] **Step 2: Run tests to verify they fail**

`npx vitest run src/utils/legIntelligence/__tests__/waypointCategories.test.js`

- [ ] **Step 3: Add categories**

In `waypointCategories.js`, extend `WAYPOINT_CATEGORIES`:

```js
// Phase 3 additions — foot/trail modes
water:    { color: '#3A6B5C', icon: '💧', label: 'Water source' },
resupply: { color: '#D9C5B2', icon: '🎒', label: 'Resupply' },
permit:   { color: '#F2C94C', icon: '📋', label: 'Permit check' },
// Phase 3 additions — transfer/transit
transfer: { color: '#D9C5B2', icon: '🔄', label: 'Transfer' },
```

- [ ] **Step 4: Run tests to verify they pass**

`npx vitest run src/utils/legIntelligence/__tests__/waypointCategories.test.js`

- [ ] **Step 5: Commit**

```bash
git add src/utils/legIntelligence/waypointCategories.js src/utils/legIntelligence/__tests__/waypointCategories.test.js
git commit -m "feat(legIntelligence): add water/resupply/permit/transfer waypoint categories"
```

---

## Task 1: Add `vault` slice to useTripStore

**Files:**
- Modify: `src/store/useTripStore.jsx`
- Test: `src/store/__tests__/useTripStore.vault.test.jsx`

- [ ] **Step 1: Write the failing test**

Create `src/store/__tests__/useTripStore.vault.test.jsx`:

```jsx
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { TripProvider, useTripStore } from '../useTripStore';

function renderStore() {
  return renderHook(() => useTripStore(), { wrapper: TripProvider });
}

describe('vault slice', () => {
  it('starts with empty vault', () => {
    const { result } = renderStore();
    expect(result.current.vault).toEqual([]);
  });

  it('addVaultFile adds a file entry', () => {
    const { result } = renderStore();
    act(() => result.current.addVaultFile({ name: 'trail.gpx', data: 'base64abc', mimeType: 'application/gpx+xml' }));
    expect(result.current.vault).toHaveLength(1);
    expect(result.current.vault[0].name).toBe('trail.gpx');
  });

  it('addVaultFile auto-assigns id', () => {
    const { result } = renderStore();
    act(() => result.current.addVaultFile({ name: 'trail.gpx', data: 'x', mimeType: 'application/gpx+xml' }));
    expect(result.current.vault[0].id).toBeTruthy();
  });

  it('addVaultFile stores uploadedAt timestamp', () => {
    const { result } = renderStore();
    const before = Date.now();
    act(() => result.current.addVaultFile({ name: 'x.gpx', data: 'y', mimeType: 'application/gpx+xml' }));
    const ts = new Date(result.current.vault[0].uploadedAt).getTime();
    expect(ts).toBeGreaterThanOrEqual(before);
  });

  it('addVaultFile allows multiple files', () => {
    const { result } = renderStore();
    act(() => {
      result.current.addVaultFile({ name: 'a.gpx', data: 'a', mimeType: 'application/gpx+xml' });
      result.current.addVaultFile({ name: 'b.gpx', data: 'b', mimeType: 'application/gpx+xml' });
    });
    expect(result.current.vault).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

`npx vitest run src/store/__tests__/useTripStore.vault.test.jsx`

- [ ] **Step 3: Add vault to store**

In `useTripStore.jsx`:

a) Add `vault: []` to `initialState`:
```js
vault: [],   // { id, name, mimeType, data: base64, uploadedAt }
```

b) Add `ADD_VAULT_FILE` case in reducer (after `SET_CAMP_META` block):
```js
case 'ADD_VAULT_FILE': {
  const file = {
    ...action.payload,
    id: action.payload.id ?? crypto.randomUUID(),
    uploadedAt: action.payload.uploadedAt ?? new Date().toISOString(),
  };
  return { ...state, vault: [...state.vault, file] };
}
```

c) In the Context value object (where all action creators are spread), add:
```js
vault: state.vault,
addVaultFile: payload => dispatch({ type: 'ADD_VAULT_FILE', payload }),
```

d) In `LOAD_EXPEDITION`, extend the return:
```js
vault: e.vault ?? [],
```

- [ ] **Step 4: Run test to verify it passes**

`npx vitest run src/store/__tests__/useTripStore.vault.test.jsx`

- [ ] **Step 5: Commit**

```bash
git add src/store/useTripStore.jsx src/store/__tests__/useTripStore.vault.test.jsx
git commit -m "feat(store): add vault slice for GPX and permit file storage"
```

---

## Task 2: Open Elevation adapter

**Files:**
- Create: `src/utils/legIntelligence/adapters/openElevation.js`
- Create: `src/utils/legIntelligence/__tests__/openElevation.test.js`

- [ ] **Step 1: Write the failing test**

Create `src/utils/legIntelligence/__tests__/openElevation.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchElevationProfile } from '../adapters/openElevation.js';

describe('fetchElevationProfile', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('returns empty profile for polyline with fewer than 2 points', async () => {
    const result = await fetchElevationProfile([[48.0, 11.0]]);
    expect(result).toEqual({ points: [], gainM: 0, lossM: 0, maxElevM: 0, minElevM: 0 });
  });

  it('calls open-elevation API and parses results', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          { latitude: 48.0, longitude: 11.0, elevation: 500 },
          { latitude: 48.1, longitude: 11.1, elevation: 600 },
          { latitude: 48.2, longitude: 11.2, elevation: 550 },
        ]
      })
    }));
    const result = await fetchElevationProfile([[48.0, 11.0], [48.1, 11.1], [48.2, 11.2]]);
    expect(result.points).toHaveLength(3);
    expect(result.gainM).toBe(100); // 600 - 500
    expect(result.lossM).toBe(50);  // 600 - 550
    expect(result.maxElevM).toBe(600);
    expect(result.minElevM).toBe(500);
  });

  it('returns empty profile on fetch failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('net')));
    const result = await fetchElevationProfile([[48.0, 11.0], [48.1, 11.1]]);
    expect(result).toEqual({ points: [], gainM: 0, lossM: 0, maxElevM: 0, minElevM: 0 });
  });

  it('samples at most 100 points to stay under API limit', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: Array.from({ length: 100 }, (_, i) => ({ latitude: i, longitude: i, elevation: i * 10 })) })
    }));
    const longPolyline = Array.from({ length: 300 }, (_, i) => [i * 0.01, i * 0.01]);
    await fetchElevationProfile(longPolyline);
    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1].body);
    expect(body.locations.length).toBeLessThanOrEqual(100);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

`npx vitest run src/utils/legIntelligence/__tests__/openElevation.test.js`

- [ ] **Step 3: Create the adapter**

Create `src/utils/legIntelligence/adapters/openElevation.js`:

```js
const OPEN_ELEVATION_URL = 'https://api.open-elevation.com/api/v1/lookup';
const MAX_POINTS = 100;

function sample(polyline, max) {
  if (polyline.length <= max) return polyline;
  const step = (polyline.length - 1) / (max - 1);
  return Array.from({ length: max }, (_, i) => polyline[Math.round(i * step)]);
}

const EMPTY = { points: [], gainM: 0, lossM: 0, maxElevM: 0, minElevM: 0 };

export async function fetchElevationProfile(polyline) {
  if (!polyline || polyline.length < 2) return EMPTY;
  try {
    const sampled = sample(polyline, MAX_POINTS);
    const res = await fetch(OPEN_ELEVATION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locations: sampled.map(([lat, lng]) => ({ latitude: lat, longitude: lng })) }),
    });
    if (!res.ok) return EMPTY;
    const json = await res.json();
    const elevations = (json.results ?? []).map(r => r.elevation);
    if (elevations.length === 0) return EMPTY;

    let gainM = 0, lossM = 0;
    for (let i = 1; i < elevations.length; i++) {
      const diff = elevations[i] - elevations[i - 1];
      if (diff > 0) gainM += diff;
      else lossM += Math.abs(diff);
    }

    const points = (json.results ?? []).map(r => ({ lat: r.latitude, lng: r.longitude, elevM: r.elevation }));
    return { points, gainM, lossM, maxElevM: Math.max(...elevations), minElevM: Math.min(...elevations) };
  } catch {
    return EMPTY;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

`npx vitest run src/utils/legIntelligence/__tests__/openElevation.test.js`

- [ ] **Step 5: Commit**

```bash
git add src/utils/legIntelligence/adapters/openElevation.js src/utils/legIntelligence/__tests__/openElevation.test.js
git commit -m "feat(legIntelligence): add Open Elevation adapter with sampling + gain/loss calculation"
```

---

## Task 3: Overpass trail adapter (water + resupply)

**Files:**
- Create: `src/utils/legIntelligence/adapters/overpassTrail.js`
- Create: `src/utils/legIntelligence/__tests__/overpassTrail.test.js`

- [ ] **Step 1: Write the failing test**

Create `src/utils/legIntelligence/__tests__/overpassTrail.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchWaterAndResupply } from '../adapters/overpassTrail.js';

describe('fetchWaterAndResupply', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('returns empty buckets for polyline with fewer than 2 points', async () => {
    const result = await fetchWaterAndResupply([[48.0, 11.0]]);
    expect(result).toEqual({ water: [], resupply: [] });
  });

  it('classifies drinking_water nodes as water', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        elements: [{ id: 1, lat: 48.0, lon: 11.0, tags: { amenity: 'drinking_water' } }]
      })
    }));
    const result = await fetchWaterAndResupply([[48.0, 11.0], [48.1, 11.1]]);
    expect(result.water).toHaveLength(1);
    expect(result.water[0].coords).toEqual([48.0, 11.0]);
  });

  it('classifies supermarket nodes as resupply', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        elements: [{ id: 2, lat: 48.1, lon: 11.1, tags: { shop: 'supermarket', name: 'SPAR' } }]
      })
    }));
    const result = await fetchWaterAndResupply([[48.0, 11.0], [48.1, 11.1]]);
    expect(result.resupply).toHaveLength(1);
    expect(result.resupply[0].name).toBe('SPAR');
  });

  it('returns empty buckets on fetch failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('net')));
    const result = await fetchWaterAndResupply([[48.0, 11.0], [48.1, 11.1]]);
    expect(result).toEqual({ water: [], resupply: [] });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

`npx vitest run src/utils/legIntelligence/__tests__/overpassTrail.test.js`

- [ ] **Step 3: Create the adapter**

Create `src/utils/legIntelligence/adapters/overpassTrail.js`:

```js
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

function bboxFrom(polyline, padDeg = 0.1) {
  const lats = polyline.map(p => p[0]);
  const lngs = polyline.map(p => p[1]);
  return [
    Math.min(...lats) - padDeg, Math.min(...lngs) - padDeg,
    Math.max(...lats) + padDeg, Math.max(...lngs) + padDeg,
  ];
}

function buildQuery(bbox) {
  const [s, w, n, e] = bbox;
  return `
[out:json][timeout:25];
(
  node["amenity"="drinking_water"](${s},${w},${n},${e});
  node["natural"="spring"](${s},${w},${n},${e});
  node["shop"="supermarket"](${s},${w},${n},${e});
  node["shop"="convenience"](${s},${w},${n},${e});
  node["amenity"="ranger_station"](${s},${w},${n},${e});
);
out body;`;
}

function classify(el) {
  const t = el.tags ?? {};
  if (t.amenity === 'drinking_water' || t.natural === 'spring') return 'water';
  if (t.shop === 'supermarket' || t.shop === 'convenience' || t.amenity === 'ranger_station') return 'resupply';
  return null;
}

export async function fetchWaterAndResupply(polyline) {
  const empty = { water: [], resupply: [] };
  if (!polyline || polyline.length < 2) return empty;
  try {
    const bbox = bboxFrom(polyline);
    const res = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: buildQuery(bbox),
    });
    if (!res.ok) return empty;
    const json = await res.json();
    const buckets = { water: [], resupply: [] };
    for (const el of json.elements ?? []) {
      const kind = classify(el);
      if (!kind) continue;
      const t = el.tags ?? {};
      buckets[kind].push({
        name: t.name ?? (kind === 'water' ? 'Water source' : 'Resupply point'),
        coords: [el.lat, el.lon],
        subtype: t.natural ?? t.shop ?? t.amenity ?? undefined,
        osmId: el.id,
      });
    }
    return buckets;
  } catch {
    return empty;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

`npx vitest run src/utils/legIntelligence/__tests__/overpassTrail.test.js`

- [ ] **Step 5: Commit**

```bash
git add src/utils/legIntelligence/adapters/overpassTrail.js src/utils/legIntelligence/__tests__/overpassTrail.test.js
git commit -m "feat(legIntelligence): add Overpass trail adapter for water sources and resupply nodes"
```

---

## Task 4: footEngine

**Files:**
- Create: `src/utils/legIntelligence/engines/footEngine.js`
- Create: `src/utils/legIntelligence/__tests__/footEngine.test.js`

- [ ] **Step 1: Write the failing test**

Create `src/utils/legIntelligence/__tests__/footEngine.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { hydrateFootLeg } from '../engines/footEngine.js';

vi.mock('../adapters/openElevation.js', () => ({
  fetchElevationProfile: vi.fn().mockResolvedValue({
    points: [{ lat: 48, lng: 11, elevM: 500 }, { lat: 48.1, lng: 11.1, elevM: 600 }],
    gainM: 100, lossM: 0, maxElevM: 600, minElevM: 500,
  })
}));

vi.mock('../adapters/overpassTrail.js', () => ({
  fetchWaterAndResupply: vi.fn().mockResolvedValue({
    water: [{ name: 'Spring', coords: [48.05, 11.05], subtype: 'spring' }],
    resupply: [{ name: 'SPAR', coords: [48.02, 11.02], subtype: 'supermarket' }],
  })
}));

describe('hydrateFootLeg', () => {
  it('returns null legMeta when leg has no coords', async () => {
    const result = await hydrateFootLeg({ id: 1, mode: 'foot' });
    expect(result.legMeta).toBeNull();
    expect(result.waypoints).toEqual([]);
  });

  it('returns legMeta with elevationProfile', async () => {
    const result = await hydrateFootLeg({ id: 1, mode: 'foot', coords: [[48, 11], [48.1, 11.1]] });
    expect(result.legMeta.elevationProfile.gainM).toBe(100);
    expect(result.legMeta.elevationProfile.maxElevM).toBe(600);
  });

  it('creates water waypoints from OSM results', async () => {
    const result = await hydrateFootLeg({ id: 1, mode: 'foot', coords: [[48, 11], [48.1, 11.1]] });
    const water = result.waypoints.filter(w => w.category === 'water');
    expect(water).toHaveLength(1);
    expect(water[0].name).toBe('Spring');
    expect(water[0].source).toBe('auto');
  });

  it('creates resupply waypoints from OSM results', async () => {
    const result = await hydrateFootLeg({ id: 1, mode: 'foot', coords: [[48, 11], [48.1, 11.1]] });
    const resupply = result.waypoints.filter(w => w.category === 'resupply');
    expect(resupply).toHaveLength(1);
    expect(resupply[0].name).toBe('SPAR');
  });

  it('stores lastHydratedAt in legMeta', async () => {
    const result = await hydrateFootLeg({ id: 1, mode: 'foot', coords: [[48, 11], [48.1, 11.1]] });
    expect(result.legMeta.lastHydratedAt).toBeTruthy();
  });

  it('includes gpxFileId as null when not yet set', async () => {
    const result = await hydrateFootLeg({ id: 1, mode: 'foot', coords: [[48, 11], [48.1, 11.1]] });
    expect(result.legMeta.gpxFileId).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

`npx vitest run src/utils/legIntelligence/__tests__/footEngine.test.js`

- [ ] **Step 3: Create footEngine**

Create `src/utils/legIntelligence/engines/footEngine.js`:

```js
import { fetchElevationProfile } from '../adapters/openElevation.js';
import { fetchWaterAndResupply } from '../adapters/overpassTrail.js';

export async function hydrateFootLeg(leg) {
  const polyline = leg?.coords;
  if (!polyline || polyline.length < 2) return { legMeta: null, waypoints: [] };

  const [elevationProfile, amenities] = await Promise.all([
    fetchElevationProfile(polyline),
    fetchWaterAndResupply(polyline),
  ]);

  const waypoints = [];
  for (const w of amenities.water) {
    waypoints.push({
      category: 'water', name: w.name, coords: w.coords,
      subtype: w.subtype, source: 'auto', status: 'planned',
      kmFromStart: null,
    });
  }
  for (const r of amenities.resupply) {
    waypoints.push({
      category: 'resupply', name: r.name, coords: r.coords,
      subtype: r.subtype, source: 'auto', status: 'planned',
      kmFromStart: null,
    });
  }

  const legMeta = {
    elevationProfile,
    permits: [],
    bearCountry: false,
    difficultyRating: null,
    gpxFileId: null,
    lastHydratedAt: new Date().toISOString(),
  };

  return { legMeta, waypoints };
}
```

- [ ] **Step 4: Run test to verify it passes**

`npx vitest run src/utils/legIntelligence/__tests__/footEngine.test.js`

- [ ] **Step 5: Commit**

```bash
git add src/utils/legIntelligence/engines/footEngine.js src/utils/legIntelligence/__tests__/footEngine.test.js
git commit -m "feat(legIntelligence): add footEngine with elevation profile and water/resupply waypoints"
```

---

## Task 5: Register foot engine + LegLensFoot component

**Files:**
- Modify: `src/utils/legIntelligence/index.js`
- Create: `src/components/legLens/LegLensFoot.jsx`
- Create: `src/components/legLens/__tests__/LegLensFoot.test.jsx`
- Modify: `src/components/legLens/LegLens.jsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/legLens/__tests__/LegLensFoot.test.jsx`:

```jsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LegLensFoot } from '../LegLensFoot.jsx';

const BASE_LEG = { id: 3, mode: 'foot', from: 'Trailhead', to: 'Summit', durationH: 8, distanceKm: 22, coords: [[48, 11], [48.2, 11.2]] };

describe('LegLensFoot', () => {
  it('shows loading state when no legMeta', () => {
    render(<LegLensFoot leg={BASE_LEG} onHydrate={() => {}} />);
    expect(screen.getByText(/Calculating trail intelligence/i)).toBeInTheDocument();
  });

  it('shows elevation gain when legMeta present', () => {
    const leg = { ...BASE_LEG, legMeta: { elevationProfile: { gainM: 450, lossM: 120, maxElevM: 2800, minElevM: 1200 }, permits: [], bearCountry: false, gpxFileId: null } };
    render(<LegLensFoot leg={leg} onHydrate={() => {}} />);
    expect(screen.getByText(/450/)).toBeInTheDocument();
  });

  it('shows elevation loss', () => {
    const leg = { ...BASE_LEG, legMeta: { elevationProfile: { gainM: 450, lossM: 120, maxElevM: 2800, minElevM: 1200 }, permits: [], bearCountry: false, gpxFileId: null } };
    render(<LegLensFoot leg={leg} onHydrate={() => {}} />);
    expect(screen.getByText(/120/)).toBeInTheDocument();
  });

  it('shows bear country warning when bearCountry is true', () => {
    const leg = { ...BASE_LEG, legMeta: { elevationProfile: { gainM: 0, lossM: 0, maxElevM: 0, minElevM: 0 }, permits: [], bearCountry: true, gpxFileId: null } };
    render(<LegLensFoot leg={leg} onHydrate={() => {}} />);
    expect(screen.getByText(/bear country/i)).toBeInTheDocument();
  });

  it('shows permit name when permits array has entries', () => {
    const leg = { ...BASE_LEG, legMeta: { elevationProfile: { gainM: 0, lossM: 0, maxElevM: 0, minElevM: 0 }, permits: [{ name: 'W Circuit Permit', status: 'required' }], bearCountry: false, gpxFileId: null } };
    render(<LegLensFoot leg={leg} onHydrate={() => {}} />);
    expect(screen.getByText(/W Circuit Permit/i)).toBeInTheDocument();
  });

  it('shows water waypoints', () => {
    const leg = { ...BASE_LEG, waypoints: [{ id: 'w1', category: 'water', name: 'Rio Ascencio Spring', status: 'planned' }], legMeta: { elevationProfile: { gainM: 0, lossM: 0, maxElevM: 0, minElevM: 0 }, permits: [], bearCountry: false, gpxFileId: null } };
    render(<LegLensFoot leg={leg} onHydrate={() => {}} />);
    expect(screen.getByText(/Rio Ascencio Spring/i)).toBeInTheDocument();
  });

  it('shows GPX upload CTA when gpxFileId is null', () => {
    const leg = { ...BASE_LEG, legMeta: { elevationProfile: { gainM: 0, lossM: 0, maxElevM: 0, minElevM: 0 }, permits: [], bearCountry: false, gpxFileId: null } };
    render(<LegLensFoot leg={leg} onHydrate={() => {}} />);
    expect(screen.getByText(/upload gpx/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

`npx vitest run src/components/legLens/__tests__/LegLensFoot.test.jsx`

- [ ] **Step 3: Create LegLensFoot**

Create `src/components/legLens/LegLensFoot.jsx`:

```jsx
import { useEffect } from 'react';

const S = '#D9C5B2';  // Sandstone
const SPRUCE = '#3A6B5C';

function Row({ icon, label, value, color = S }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', padding: '3px 0' }}>
      <span style={{ color: '#666' }}>{icon} {label}</span>
      <span style={{ color }}>{value}</span>
    </div>
  );
}

export function LegLensFoot({ leg, onHydrate }) {
  const meta = leg?.legMeta;
  const waypoints = leg?.waypoints ?? [];

  useEffect(() => {
    if (!meta && onHydrate) onHydrate(leg?.id);
  }, [leg?.id]);

  if (!meta) {
    return (
      <div style={{ fontFamily: 'JetBrains Mono, monospace', color: '#D9C5B2', padding: 16 }}>
        Calculating trail intelligence…
      </div>
    );
  }

  const elev = meta.elevationProfile ?? {};
  const waterWps = waypoints.filter(w => w.category === 'water');
  const resupplyWps = waypoints.filter(w => w.category === 'resupply');

  return (
    <div style={{ fontFamily: 'JetBrains Mono, monospace', background: '#0E1012', color: S }}>
      {/* Elevation */}
      <section style={{ padding: '12px 16px', borderBottom: '1px solid #1f1f1f' }}>
        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#666', marginBottom: 8 }}>Elevation</div>
        <Row icon="↑" label="Gain" value={`${elev.gainM ?? 0} m`} color="#E67E22" />
        <Row icon="↓" label="Loss" value={`${elev.lossM ?? 0} m`} color={S} />
        <Row icon="▲" label="Max" value={`${elev.maxElevM ?? 0} m`} color={S} />
        <Row icon="▼" label="Min" value={`${elev.minElevM ?? 0} m`} color={S} />
      </section>

      {/* Permits */}
      {(meta.permits?.length > 0 || meta.bearCountry) && (
        <section style={{ padding: '12px 16px', borderBottom: '1px solid #1f1f1f' }}>
          <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#666', marginBottom: 8 }}>Permits & Hazards</div>
          {meta.permits.map((p, i) => (
            <Row key={i} icon="📋" label={p.name} value={p.status ?? 'required'} color="#F2C94C" />
          ))}
          {meta.bearCountry && (
            <Row icon="🐻" label="Bear country" value="canister required" color="#dc2626" />
          )}
        </section>
      )}

      {/* Water sources */}
      {waterWps.length > 0 && (
        <section style={{ padding: '12px 16px', borderBottom: '1px solid #1f1f1f' }}>
          <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#666', marginBottom: 8 }}>Water Sources</div>
          {waterWps.map(w => (
            <Row key={w.id} icon="💧" label={w.name} value={w.status} color={SPRUCE} />
          ))}
        </section>
      )}

      {/* Resupply */}
      {resupplyWps.length > 0 && (
        <section style={{ padding: '12px 16px', borderBottom: '1px solid #1f1f1f' }}>
          <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#666', marginBottom: 8 }}>Resupply</div>
          {resupplyWps.map(w => (
            <Row key={w.id} icon="🎒" label={w.name} value={w.status} color={S} />
          ))}
        </section>
      )}

      {/* GPX */}
      <section style={{ padding: '12px 16px' }}>
        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#666', marginBottom: 8 }}>Trail File</div>
        {meta.gpxFileId ? (
          <div style={{ fontSize: '0.82rem', color: SPRUCE }}>GPX linked ✓</div>
        ) : (
          <button
            style={{ fontSize: '0.8rem', color: '#E67E22', background: 'transparent', border: '1px solid #E67E22', borderRadius: 4, padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit' }}
            onClick={() => document.getElementById(`gpx-upload-${leg.id}`)?.click()}
            aria-label="Upload GPX file"
          >
            Upload GPX
          </button>
        )}
        <input id={`gpx-upload-${leg.id}`} type="file" accept=".gpx" style={{ display: 'none' }} aria-hidden="true" />
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Register foot engine in index.js**

In `src/utils/legIntelligence/index.js`:

```js
import { hydrateCarLeg } from './engines/carEngine.js';
import { hydrateFootLeg } from './engines/footEngine.js';

const ENGINES = { car: hydrateCarLeg, foot: hydrateFootLeg };

export async function hydrateLeg(leg) {
  const engine = ENGINES[leg?.mode];
  if (!engine) return { legMeta: null, waypoints: [] };
  return engine(leg);
}

export { WAYPOINT_CATEGORIES, getCategoryStyle } from './waypointCategories.js';
```

- [ ] **Step 5: Wire LegLensFoot into LegLens.jsx**

In `src/components/legLens/LegLens.jsx`, add the import and dispatch:

```jsx
import { LegLensCar } from './LegLensCar.jsx';
import { LegLensFoot } from './LegLensFoot.jsx';
```

Replace the mode dispatch block:

```jsx
{leg.mode === 'car' ? (
  <LegLensCar
    leg={leg}
    nextStay={nextStay}
    onVariantSelect={onVariantSelect}
    onWaypointConfirm={onWaypointConfirm}
    onWaypointBook={onWaypointBook}
    onWaypointDismiss={onWaypointDismiss}
    onHydrate={onHydrate}
  />
) : leg.mode === 'foot' ? (
  <LegLensFoot leg={leg} onHydrate={onHydrate} />
) : (
  <LegLensPlaceholder mode={leg.mode} />
)}
```

- [ ] **Step 6: Run all tests to verify everything passes**

`npx vitest run src/components/legLens/__tests__/LegLensFoot.test.jsx src/utils/legIntelligence/__tests__/footEngine.test.js`

- [ ] **Step 7: Commit**

```bash
git add src/utils/legIntelligence/index.js src/utils/legIntelligence/engines/footEngine.js src/components/legLens/LegLensFoot.jsx src/components/legLens/__tests__/LegLensFoot.test.jsx src/components/legLens/LegLens.jsx
git commit -m "feat(legLens): add LegLensFoot with elevation, permits, water, resupply, GPX upload"
```

---

## Task 6: Phase 3 end-to-end verification

- [ ] **Step 1: Run full Phase 3 test suite**

```bash
npx vitest run src/utils/legIntelligence/__tests__/waypointCategories.test.js src/store/__tests__/useTripStore.vault.test.jsx src/utils/legIntelligence/__tests__/openElevation.test.js src/utils/legIntelligence/__tests__/overpassTrail.test.js src/utils/legIntelligence/__tests__/footEngine.test.js src/components/legLens/__tests__/LegLensFoot.test.jsx
```

Expected: ≥ 26 tests pass across 6 files.

- [ ] **Step 2: Confirm commits**

`git log --oneline -8`

Expected: 5 Phase 3 commits (waypointCategories, vault, openElevation, overpassTrail, footEngine+LegLensFoot).

- [ ] **Step 3: Append log entry**

Append to `C:\Users\lasse\Desktop\holyflex\logs\2026-05-13.md`:

```
## [HH:MM] VP Phase 3 — Foot Leg Intelligence
- Added water/resupply/permit/transfer waypoint categories
- Added vault slice to store (GPX + permit file storage)
- Added Open Elevation adapter with gain/loss calculation
- Added Overpass trail adapter for water sources and resupply
- Added footEngine (elevation + water/resupply waypoints)
- Added LegLensFoot component (elevation, permits, water, resupply, GPX upload)
- Wired foot engine into hydrateLeg dispatcher
- Files changed: waypointCategories.js, useTripStore.jsx, openElevation.js, overpassTrail.js, footEngine.js, LegLensFoot.jsx, LegLens.jsx, index.js
```
