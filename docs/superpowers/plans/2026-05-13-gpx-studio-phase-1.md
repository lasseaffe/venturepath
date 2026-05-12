# GPX Studio — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a standalone `/studio` route where an Architect can draw a multi-mode track click-by-click with road/trail snapping, see live elevation, undo/redo, and export a high-fidelity GPX file. No cross-tool wiring yet — that's Phase 2+.

**Architecture:** A new `tracks` slice in `useTripStore.jsx` holds dense polylines. Two stateless services (`routingEngine.js` over BRouter/Valhalla, `elevationEngine.js` over Open-Elevation) hydrate points. A shared `TrackStudio` component is mounted by `/studio` for v1; the in-trip overlay is deferred to Phase 4. Two new GPX modules (`gpxParser.v2.js`, `gpxExporter.v2.js`) replace the lossy v1 path for Studio I/O; the v1 path stays untouched until Phase 2.

**Tech Stack:** Vite + React 19 (JSX), Leaflet 1.9 + react-leaflet 5, Zustand-via-context store, Vitest 4 + jsdom + Testing Library, Framer Motion, Tailwind (custom VP tokens).

**Spec:** [`C:\Users\lasse\.claude\plans\for-venture-path-build-dynamic-token.md`](../../../../../../.claude/plans/for-venture-path-build-dynamic-token.md)

**Repo root:** `C:\Users\lasse\Desktop\venturepath` — never write outside this tree.

---

## Conventions

- All file paths are repo-relative from `C:\Users\lasse\Desktop\venturepath`.
- `npm` commands run from the repo root.
- Every task ends with a single `git commit`. Commit subjects use the format `feat(studio): <verb> <noun>` or `test(studio): …`.
- Tests live in `src/__tests__/` mirroring the source path: `src/services/routingEngine.js` → `src/__tests__/services/routingEngine.test.js`.
- Apple compliance: every user-visible string uses VP vocabulary (Architect/Pioneer/Compose/Anchor), VP tokens (`#0E1012` Midnight, `#E67E22` Ember, JetBrains Mono for data, Playfair Display for headings), and no empty states without CTA.

---

## File Map

**Create**
- `src/store/slices/tracks.js` — track reducer + actions + history stack
- `src/services/routingEngine.js` — BRouter/Valhalla adapter
- `src/services/elevationEngine.js` — Open-Elevation/OpenTopoData adapter + cache
- `src/utils/gpxParser.v2.js` — full `<trk>/<rte>/<wpt>` parser → `Track[]`
- `src/utils/gpxExporter.v2.js` — `Track[]` → GPX 1.1 with `<trkpt><ele>`
- `src/components/studio/TrackStudio.jsx` — full-canvas editor
- `src/components/studio/ToolRail.jsx` — left-rail tool selector
- `src/components/studio/StudioElevationStrip.jsx` — bottom elevation chart fed by `track.points`
- `src/pages/Studio.jsx` — route component for `/studio`
- `src/config/endpoints.js` — routing/elevation endpoint config (so we can self-host later)
- Tests under `src/__tests__/…` matching each module
- Fixtures under `src/__tests__/fixtures/gpx/` (hiking, cycling, multi-seg)

**Modify**
- `src/store/useTripStore.jsx` — wire `tracks` slice into root reducer + state
- Router file (likely `src/App.jsx` — verify in Task 1) — register `/studio` route

**Do NOT touch in Phase 1**
- `src/utils/gpxItineraryParser.js`, `src/utils/gpxExporter.js` (v1 stays alive)
- `src/components/itinerary/GpxPanel.jsx`, `GpxImportDialog.jsx` (Phase 2 rewrites these)
- `src/components/itinerary/RouteMap.jsx`, `ElevationStrip.jsx` (Phase 2/4)
- Anything in `holyflex/` or `whatscooking/`

---

## Task 1: Sanity check & dependency baseline

**Files:**
- Read-only inspection; only write `src/config/endpoints.js`.

- [ ] **Step 1: Confirm router file**

Run: `npm ls react-router-dom 2>&1 | head -5` (from `venturepath/`).
- If react-router-dom is present, the router lives in `src/App.jsx` or `src/main.jsx` — open both and confirm. Note the file.
- If NOT present: stop and report. Phase 1 needs routing; user must approve adding `react-router-dom@^6` before continuing.

- [ ] **Step 2: Confirm Vitest config exists**

Run: `cat vitest.config.* 2>/dev/null || cat vite.config.* | grep -A 5 test`
Expected: a `test:` block with `environment: 'jsdom'`. If absent, the test step in Task 2 will fail — add to `vite.config.js`:

```js
// vite.config.js — add inside defineConfig({...})
test: {
  environment: 'jsdom',
  setupFiles: ['./src/__tests__/setup.js'],
  globals: true,
},
```

Then create `src/__tests__/setup.js`:

```js
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 3: Create endpoint config**

Create `src/config/endpoints.js`:

```js
// Routing + elevation provider endpoints. Override via Vite env vars (VITE_BROUTER_URL, etc.)
// FOSSGIS public instances — no SLA. Plan to self-host post-launch.
export const ENDPOINTS = {
  brouter: import.meta.env.VITE_BROUTER_URL ?? 'https://brouter.de/brouter',
  valhalla: import.meta.env.VITE_VALHALLA_URL ?? 'https://valhalla1.openstreetmap.de/route',
  openElevation: import.meta.env.VITE_OPEN_ELEVATION_URL ?? 'https://api.open-elevation.com/api/v1/lookup',
  openTopoData: import.meta.env.VITE_OPENTOPODATA_URL ?? 'https://api.opentopodata.org/v1/srtm30m',
};

export const BROUTER_PROFILES = {
  foot:    'hiking-mountain',
  cycling: 'trekking',
  mtb:     'mtb',
};
export const VALHALLA_PROFILES = {
  car:  'auto',
  boat: 'pedestrian', // Valhalla has no boat profile; placeholder until we add manual mode
};
```

- [ ] **Step 4: Commit**

```bash
git add src/config/endpoints.js vite.config.js src/__tests__/setup.js
git commit -m "chore(studio): add endpoint config and vitest jsdom setup"
```

---

## Task 2: Tracks slice — pure reducer (TDD)

**Files:**
- Create: `src/store/slices/tracks.js`
- Test: `src/__tests__/store/slices/tracks.test.js`

- [ ] **Step 1: Write failing test for ADD_TRACK**

Create `src/__tests__/store/slices/tracks.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { tracksReducer, initialTracksState, ADD_TRACK, APPEND_POINTS, UNDO, REDO, REMOVE_TRACK } from '../../../store/slices/tracks.js';

describe('tracks slice', () => {
  it('ADD_TRACK appends a new track with generated id and empty points', () => {
    const next = tracksReducer(initialTracksState, {
      type: ADD_TRACK,
      payload: { name: 'Compose Test', profile: 'foot' },
    });
    expect(next.tracks).toHaveLength(1);
    expect(next.tracks[0].id).toMatch(/^[0-9a-f-]{36}$/);
    expect(next.tracks[0].name).toBe('Compose Test');
    expect(next.tracks[0].profile).toBe('foot');
    expect(next.tracks[0].points).toEqual([]);
    expect(next.tracks[0].segments).toEqual([]);
    expect(next.tracks[0].source).toBe('drawn');
  });

  it('APPEND_POINTS adds points and a segment record', () => {
    const a = tracksReducer(initialTracksState, { type: ADD_TRACK, payload: { name: 'T', profile: 'cycling' } });
    const id = a.tracks[0].id;
    const b = tracksReducer(a, {
      type: APPEND_POINTS,
      payload: {
        trackId: id,
        points: [{ lat: 52.0, lng: 5.0, ele: 10 }, { lat: 52.1, lng: 5.1, ele: 12 }],
        engine: 'brouter',
        profile: 'cycling',
      },
    });
    expect(b.tracks[0].points).toHaveLength(2);
    expect(b.tracks[0].segments).toHaveLength(1);
    expect(b.tracks[0].segments[0]).toMatchObject({ fromIdx: 0, toIdx: 1, profile: 'cycling', routerEngine: 'brouter' });
  });

  it('UNDO restores prior state; REDO re-applies it', () => {
    const a = tracksReducer(initialTracksState, { type: ADD_TRACK, payload: { name: 'T', profile: 'foot' } });
    const undone = tracksReducer(a, { type: UNDO });
    expect(undone.tracks).toHaveLength(0);
    const redone = tracksReducer(undone, { type: REDO });
    expect(redone.tracks).toHaveLength(1);
  });

  it('REMOVE_TRACK drops a track by id', () => {
    const a = tracksReducer(initialTracksState, { type: ADD_TRACK, payload: { name: 'T', profile: 'foot' } });
    const id = a.tracks[0].id;
    const b = tracksReducer(a, { type: REMOVE_TRACK, payload: { trackId: id } });
    expect(b.tracks).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tracks.test.js --run`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the slice**

Create `src/store/slices/tracks.js`:

```js
export const ADD_TRACK         = 'tracks/ADD';
export const REMOVE_TRACK      = 'tracks/REMOVE';
export const APPEND_POINTS     = 'tracks/APPEND_POINTS';
export const MOVE_POINT        = 'tracks/MOVE_POINT';
export const DELETE_POINT_RANGE= 'tracks/DELETE_POINT_RANGE';
export const ADD_WAYPOINT_TO_TRACK = 'tracks/ADD_WAYPOINT';
export const SET_TRACK_PROFILE = 'tracks/SET_PROFILE';
export const HYDRATE_ELEVATION = 'tracks/HYDRATE_ELEVATION';
export const UNDO              = 'tracks/UNDO';
export const REDO              = 'tracks/REDO';

const HISTORY_CAP = 50;

export const initialTracksState = {
  tracks: [],
  past: [],
  future: [],
};

function emptyStats() {
  return { distanceKm: 0, durationH: 0, ascentM: 0, descentM: 0, maxEleM: 0, minEleM: 0, difficulty: 'easy' };
}

function newTrack({ name, profile }) {
  return {
    id: crypto.randomUUID(),
    legId: null,
    name: name ?? 'Untitled Composition',
    profile: profile ?? 'foot',
    points: [],
    segments: [],
    waypoints: [],
    stats: emptyStats(),
    source: 'drawn',
    visibility: 'private',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function withHistory(prev, nextSnap) {
  const past = [...prev.past, { tracks: prev.tracks }].slice(-HISTORY_CAP);
  return { ...nextSnap, past, future: [] };
}

function recomputeStats(track) {
  const pts = track.points;
  if (pts.length < 2) return { ...track, stats: emptyStats() };
  let dist = 0, ascent = 0, descent = 0, maxE = -Infinity, minE = Infinity;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const R = 6371;
    const dLat = (b.lat - a.lat) * Math.PI / 180;
    const dLng = (b.lng - a.lng) * Math.PI / 180;
    const sA = Math.sin(dLat / 2), sB = Math.sin(dLng / 2);
    const chord = sA * sA + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * sB * sB;
    dist += R * 2 * Math.atan2(Math.sqrt(chord), Math.sqrt(1 - chord));
    if (a.ele != null && b.ele != null) {
      const d = b.ele - a.ele;
      if (d > 0) ascent += d; else descent -= d;
    }
    if (b.ele != null) { if (b.ele > maxE) maxE = b.ele; if (b.ele < minE) minE = b.ele; }
  }
  const SPEED = { foot: 5, cycling: 20, mtb: 12, car: 80, boat: 15, flight: 800 };
  const durationH = dist / (SPEED[track.profile] ?? 5);
  const difficulty =
    ascent > 1500 || dist > 30 ? 'expert' :
    ascent > 800  || dist > 18 ? 'hard'   :
    ascent > 300  || dist > 8  ? 'moderate' : 'easy';
  return {
    ...track,
    stats: {
      distanceKm: +dist.toFixed(2),
      durationH: +durationH.toFixed(2),
      ascentM: Math.round(ascent),
      descentM: Math.round(descent),
      maxEleM: maxE === -Infinity ? 0 : Math.round(maxE),
      minEleM: minE === Infinity ? 0 : Math.round(minE),
      difficulty,
    },
  };
}

function mapTrack(state, trackId, fn) {
  return state.tracks.map(t => t.id === trackId ? recomputeStats(fn(t)) : t);
}

export function tracksReducer(state = initialTracksState, action) {
  switch (action.type) {
    case ADD_TRACK: {
      const tracks = [...state.tracks, newTrack(action.payload ?? {})];
      return withHistory(state, { tracks });
    }
    case REMOVE_TRACK: {
      const tracks = state.tracks.filter(t => t.id !== action.payload.trackId);
      return withHistory(state, { tracks });
    }
    case APPEND_POINTS: {
      const { trackId, points, engine, profile } = action.payload;
      const tracks = mapTrack(state, trackId, t => {
        const fromIdx = t.points.length === 0 ? 0 : t.points.length - 1;
        const newPoints = [...t.points, ...points];
        const segment = {
          fromIdx,
          toIdx: newPoints.length - 1,
          profile: profile ?? t.profile,
          surface: null,
          routerEngine: engine ?? 'manual',
        };
        return { ...t, points: newPoints, segments: [...t.segments, segment], updatedAt: new Date().toISOString() };
      });
      return withHistory(state, { tracks });
    }
    case MOVE_POINT: {
      const { trackId, idx, lat, lng } = action.payload;
      const tracks = mapTrack(state, trackId, t => ({
        ...t,
        points: t.points.map((p, i) => i === idx ? { ...p, lat, lng, ele: null } : p),
        updatedAt: new Date().toISOString(),
      }));
      return withHistory(state, { tracks });
    }
    case DELETE_POINT_RANGE: {
      const { trackId, fromIdx, toIdx } = action.payload;
      const tracks = mapTrack(state, trackId, t => ({
        ...t,
        points: t.points.filter((_, i) => i < fromIdx || i > toIdx),
        segments: t.segments.filter(s => s.toIdx < fromIdx || s.fromIdx > toIdx),
        updatedAt: new Date().toISOString(),
      }));
      return withHistory(state, { tracks });
    }
    case ADD_WAYPOINT_TO_TRACK: {
      const { trackId, waypoint } = action.payload;
      const tracks = mapTrack(state, trackId, t => ({
        ...t,
        waypoints: [...t.waypoints, { id: crypto.randomUUID(), category: 'view', note: null, ...waypoint }],
        updatedAt: new Date().toISOString(),
      }));
      return { ...state, tracks }; // waypoint add doesn't push history (cheap to redo manually)
    }
    case SET_TRACK_PROFILE: {
      const { trackId, profile } = action.payload;
      const tracks = mapTrack(state, trackId, t => ({ ...t, profile, updatedAt: new Date().toISOString() }));
      return withHistory(state, { tracks });
    }
    case HYDRATE_ELEVATION: {
      const { trackId, elevations } = action.payload;
      const tracks = mapTrack(state, trackId, t => ({
        ...t,
        points: t.points.map((p, i) => elevations[i] != null ? { ...p, ele: elevations[i] } : p),
      }));
      return { ...state, tracks };
    }
    case UNDO: {
      if (state.past.length === 0) return state;
      const prev = state.past[state.past.length - 1];
      return {
        tracks: prev.tracks,
        past: state.past.slice(0, -1),
        future: [{ tracks: state.tracks }, ...state.future].slice(0, HISTORY_CAP),
      };
    }
    case REDO: {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      return {
        tracks: next.tracks,
        past: [...state.past, { tracks: state.tracks }].slice(-HISTORY_CAP),
        future: state.future.slice(1),
      };
    }
    default:
      return state;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tracks.test.js --run`
Expected: PASS — 4 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/store/slices/tracks.js src/__tests__/store/slices/tracks.test.js
git commit -m "feat(studio): tracks slice reducer with undo/redo and stats"
```

---

## Task 3: Routing engine — BRouter + Valhalla adapter (TDD)

**Files:**
- Create: `src/services/routingEngine.js`
- Test: `src/__tests__/services/routingEngine.test.js`

- [ ] **Step 1: Write failing test**

Create `src/__tests__/services/routingEngine.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { routeBetween, _resetCache } from '../../services/routingEngine.js';

const brouterGeoJson = {
  type: 'FeatureCollection',
  features: [{
    geometry: {
      type: 'LineString',
      coordinates: [[5.0, 52.0, 10], [5.05, 52.05, 12], [5.1, 52.1, 14]],
    },
  }],
};

const valhallaJson = {
  trip: {
    legs: [{
      shape: 'mocked_polyline',
    }],
  },
};

describe('routingEngine', () => {
  beforeEach(() => {
    _resetCache();
    globalThis.fetch = vi.fn();
  });

  it('routes foot profile via BRouter and returns points + segment', async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => brouterGeoJson,
    });
    const res = await routeBetween({
      from: { lat: 52.0, lng: 5.0 },
      to:   { lat: 52.1, lng: 5.1 },
      profile: 'foot',
    });
    expect(res.engine).toBe('brouter');
    expect(res.points).toHaveLength(3);
    expect(res.points[0]).toMatchObject({ lat: 52.0, lng: 5.0, ele: 10 });
    expect(res.segment.profile).toBe('foot');
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('caches identical requests', async () => {
    globalThis.fetch.mockResolvedValueOnce({ ok: true, json: async () => brouterGeoJson });
    const args = { from: { lat: 1, lng: 1 }, to: { lat: 2, lng: 2 }, profile: 'foot' };
    await routeBetween(args);
    await routeBetween(args);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('falls back to manual straight line when fetch fails', async () => {
    globalThis.fetch.mockRejectedValueOnce(new Error('network'));
    const res = await routeBetween({
      from: { lat: 0, lng: 0 },
      to:   { lat: 0, lng: 1 },
      profile: 'foot',
    });
    expect(res.engine).toBe('manual');
    expect(res.points).toHaveLength(2);
    expect(res.points[0]).toMatchObject({ lat: 0, lng: 0 });
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

Run: `npm test -- routingEngine.test.js --run`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the service**

Create `src/services/routingEngine.js`:

```js
import { ENDPOINTS, BROUTER_PROFILES, VALHALLA_PROFILES } from '../config/endpoints.js';

const cache = new Map();
const CACHE_CAP = 200;

function key({ from, to, profile }) {
  const r = (n) => Number(n).toFixed(5);
  return `${profile}|${r(from.lat)},${r(from.lng)}|${r(to.lat)},${r(to.lng)}`;
}

function lruSet(k, v) {
  if (cache.has(k)) cache.delete(k);
  cache.set(k, v);
  if (cache.size > CACHE_CAP) cache.delete(cache.keys().next().value);
}

export function _resetCache() { cache.clear(); }

function manualSegment(from, to, profile) {
  return {
    engine: 'manual',
    points: [
      { lat: from.lat, lng: from.lng, ele: null, time: null },
      { lat: to.lat, lng: to.lng, ele: null, time: null },
    ],
    segment: { profile, surface: null, routerEngine: 'manual' },
  };
}

async function fetchBRouter({ from, to, profile }) {
  const brouterProfile = BROUTER_PROFILES[profile] ?? 'hiking-mountain';
  const url = `${ENDPOINTS.brouter}?lonlats=${from.lng},${from.lat}|${to.lng},${to.lat}&profile=${brouterProfile}&format=geojson`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`BRouter ${res.status}`);
  const gj = await res.json();
  const coords = gj.features?.[0]?.geometry?.coordinates ?? [];
  return coords.map(([lng, lat, ele]) => ({ lat, lng, ele: ele ?? null, time: null }));
}

async function fetchValhalla({ from, to, profile }) {
  const vProfile = VALHALLA_PROFILES[profile] ?? 'auto';
  const body = {
    locations: [
      { lat: from.lat, lon: from.lng },
      { lat: to.lat,   lon: to.lng   },
    ],
    costing: vProfile,
    directions_options: { units: 'kilometers' },
  };
  const res = await fetch(ENDPOINTS.valhalla, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Valhalla ${res.status}`);
  const data = await res.json();
  const shape = data.trip?.legs?.[0]?.shape;
  return decodePolyline(shape).map(([lat, lng]) => ({ lat, lng, ele: null, time: null }));
}

// Google polyline decoder (Valhalla uses precision 6)
function decodePolyline(str, precision = 6) {
  if (!str) return [];
  const factor = Math.pow(10, precision);
  let index = 0, lat = 0, lng = 0;
  const out = [];
  while (index < str.length) {
    let b, shift = 0, result = 0;
    do { b = str.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += ((result & 1) ? ~(result >> 1) : (result >> 1));
    shift = 0; result = 0;
    do { b = str.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += ((result & 1) ? ~(result >> 1) : (result >> 1));
    out.push([lat / factor, lng / factor]);
  }
  return out;
}

export async function routeBetween({ from, to, profile }) {
  const k = key({ from, to, profile });
  if (cache.has(k)) return cache.get(k);
  try {
    const points = ['foot', 'cycling', 'mtb'].includes(profile)
      ? await fetchBRouter({ from, to, profile })
      : await fetchValhalla({ from, to, profile });
    if (points.length < 2) throw new Error('empty route');
    const result = {
      engine: ['foot', 'cycling', 'mtb'].includes(profile) ? 'brouter' : 'valhalla',
      points,
      segment: { profile, surface: null, routerEngine: ['foot', 'cycling', 'mtb'].includes(profile) ? 'brouter' : 'valhalla' },
    };
    lruSet(k, result);
    return result;
  } catch {
    const fallback = manualSegment(from, to, profile);
    lruSet(k, fallback);
    return fallback;
  }
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npm test -- routingEngine.test.js --run`
Expected: PASS — 3 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/services/routingEngine.js src/__tests__/services/routingEngine.test.js
git commit -m "feat(studio): routingEngine adapter for BRouter and Valhalla with LRU + manual fallback"
```

---

## Task 4: Elevation engine (TDD)

**Files:**
- Create: `src/services/elevationEngine.js`
- Test: `src/__tests__/services/elevationEngine.test.js`

- [ ] **Step 1: Write failing test**

Create `src/__tests__/services/elevationEngine.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { hydrateElevations, _resetEleCache } from '../../services/elevationEngine.js';

beforeEach(() => {
  _resetEleCache();
  globalThis.fetch = vi.fn();
});

describe('elevationEngine', () => {
  it('hydrates missing elevations from Open-Elevation', async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [{ elevation: 100 }, { elevation: 200 }] }),
    });
    const points = [
      { lat: 50, lng: 10, ele: null },
      { lat: 51, lng: 11, ele: null },
    ];
    const result = await hydrateElevations(points);
    expect(result).toEqual([100, 200]);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('returns existing elevations and only queries missing', async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [{ elevation: 300 }] }),
    });
    const points = [
      { lat: 50, lng: 10, ele: 99 },
      { lat: 51, lng: 11, ele: null },
    ];
    const result = await hydrateElevations(points);
    expect(result).toEqual([99, 300]);
  });

  it('returns nulls when fetch fails (does not throw)', async () => {
    globalThis.fetch.mockRejectedValueOnce(new Error('down'));
    const result = await hydrateElevations([{ lat: 0, lng: 0, ele: null }]);
    expect(result).toEqual([null]);
  });
});
```

- [ ] **Step 2: Run to confirm fail**

Run: `npm test -- elevationEngine.test.js --run`
Expected: FAIL.

- [ ] **Step 3: Implement service**

Create `src/services/elevationEngine.js`:

```js
import { ENDPOINTS } from '../config/endpoints.js';

const cache = new Map();
const CACHE_CAP = 5000;

function eleKey(lat, lng) {
  return `${lat.toFixed(5)},${lng.toFixed(5)}`;
}

export function _resetEleCache() { cache.clear(); }

async function batchOpenElevation(pts) {
  const body = { locations: pts.map(p => ({ latitude: p.lat, longitude: p.lng })) };
  const res = await fetch(ENDPOINTS.openElevation, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Open-Elevation ${res.status}`);
  const data = await res.json();
  return data.results.map(r => r.elevation);
}

export async function hydrateElevations(points) {
  const out = new Array(points.length).fill(null);
  const toFetch = [];
  const toFetchIdx = [];

  points.forEach((p, i) => {
    if (p.ele != null) { out[i] = p.ele; return; }
    const k = eleKey(p.lat, p.lng);
    if (cache.has(k)) { out[i] = cache.get(k); return; }
    toFetch.push(p);
    toFetchIdx.push(i);
  });

  if (toFetch.length === 0) return out;

  try {
    const batches = [];
    for (let i = 0; i < toFetch.length; i += 100) batches.push(toFetch.slice(i, i + 100));
    const results = (await Promise.all(batches.map(batchOpenElevation))).flat();
    results.forEach((ele, j) => {
      const i = toFetchIdx[j];
      const k = eleKey(points[i].lat, points[i].lng);
      cache.set(k, ele);
      if (cache.size > CACHE_CAP) cache.delete(cache.keys().next().value);
      out[i] = ele;
    });
  } catch {
    // Leave nulls for failed batch — caller can retry
  }
  return out;
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- elevationEngine.test.js --run`
Expected: PASS — 3 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/services/elevationEngine.js src/__tests__/services/elevationEngine.test.js
git commit -m "feat(studio): elevationEngine over Open-Elevation with point-level cache"
```

---

## Task 5: GPX parser v2 (TDD)

**Files:**
- Create: `src/utils/gpxParser.v2.js`
- Fixtures: `src/__tests__/fixtures/gpx/hike.gpx`, `cycle.gpx`, `multi-trk.gpx`
- Test: `src/__tests__/utils/gpxParser.v2.test.js`

- [ ] **Step 1: Create fixture GPX files**

Create `src/__tests__/fixtures/gpx/hike.gpx`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="test" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata><name>Test Hike</name></metadata>
  <wpt lat="46.5" lon="11.3"><name>Refugio</name><type>shelter</type></wpt>
  <trk>
    <name>Approach</name>
    <type>hiking</type>
    <trkseg>
      <trkpt lat="46.5"  lon="11.3"><ele>1200</ele></trkpt>
      <trkpt lat="46.51" lon="11.31"><ele>1250</ele></trkpt>
      <trkpt lat="46.52" lon="11.32"><ele>1320</ele></trkpt>
    </trkseg>
  </trk>
</gpx>
```

Create `src/__tests__/fixtures/gpx/cycle.gpx`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="test" xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <name>City Ride</name>
    <type>cycling</type>
    <trkseg>
      <trkpt lat="52.0" lon="5.0"><ele>5</ele></trkpt>
      <trkpt lat="52.01" lon="5.01"><ele>6</ele></trkpt>
    </trkseg>
  </trk>
</gpx>
```

Create `src/__tests__/fixtures/gpx/multi-trk.gpx`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="test" xmlns="http://www.topografix.com/GPX/1/1">
  <trk><name>A</name><trkseg>
    <trkpt lat="10" lon="10"><ele>1</ele></trkpt>
    <trkpt lat="11" lon="11"><ele>2</ele></trkpt>
  </trkseg></trk>
  <trk><name>B</name><trkseg>
    <trkpt lat="20" lon="20"><ele>3</ele></trkpt>
    <trkpt lat="21" lon="21"><ele>4</ele></trkpt>
  </trkseg></trk>
</gpx>
```

- [ ] **Step 2: Write parser test**

Create `src/__tests__/utils/gpxParser.v2.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseGpxToTracks } from '../../utils/gpxParser.v2.js';

function load(name) {
  return readFileSync(resolve(__dirname, '..', 'fixtures', 'gpx', name), 'utf8');
}

describe('gpxParser.v2', () => {
  it('parses a hiking GPX with elevation and one waypoint', () => {
    const tracks = parseGpxToTracks(load('hike.gpx'));
    expect(tracks).toHaveLength(1);
    expect(tracks[0].name).toBe('Approach');
    expect(tracks[0].profile).toBe('foot');
    expect(tracks[0].points).toHaveLength(3);
    expect(tracks[0].points[0]).toMatchObject({ lat: 46.5, lng: 11.3, ele: 1200 });
    expect(tracks[0].waypoints).toHaveLength(1);
    expect(tracks[0].waypoints[0].name).toBe('Refugio');
  });

  it('maps cycling type to cycling profile', () => {
    const tracks = parseGpxToTracks(load('cycle.gpx'));
    expect(tracks[0].profile).toBe('cycling');
    expect(tracks[0].points).toHaveLength(2);
  });

  it('returns one Track per <trk> in a multi-track GPX', () => {
    const tracks = parseGpxToTracks(load('multi-trk.gpx'));
    expect(tracks).toHaveLength(2);
    expect(tracks[0].name).toBe('A');
    expect(tracks[1].name).toBe('B');
  });
});
```

- [ ] **Step 3: Run to confirm fail**

Run: `npm test -- gpxParser.v2.test.js --run`
Expected: FAIL.

- [ ] **Step 4: Implement parser**

Create `src/utils/gpxParser.v2.js`:

```js
const TYPE_TO_PROFILE = {
  hiking: 'foot', walking: 'foot', running: 'foot',
  cycling: 'cycling', biking: 'cycling',
  'mountain biking': 'mtb', mtb: 'mtb',
  driving: 'car', motoring: 'car',
  sailing: 'boat',
};

function textOf(el, tag) {
  const list = el.getElementsByTagName(tag);
  return list.length ? (list[0].textContent ?? '').trim() : null;
}

function parsePoints(trkOrSeg) {
  const trkpts = Array.from(trkOrSeg.getElementsByTagName('trkpt'));
  return trkpts.map(p => ({
    lat: parseFloat(p.getAttribute('lat')),
    lng: parseFloat(p.getAttribute('lon')),
    ele: textOf(p, 'ele') != null ? parseFloat(textOf(p, 'ele')) : null,
    time: textOf(p, 'time'),
  })).filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lng));
}

function parseWaypoints(doc, ownerName) {
  return Array.from(doc.getElementsByTagName('wpt')).map((w, i) => ({
    id: crypto.randomUUID(),
    name: textOf(w, 'name') ?? `Waypoint ${i + 1}`,
    idx: 0, // best-effort: import waypoints anchor to start; user can move them in Studio
    category: textOf(w, 'type') ?? 'view',
    note: textOf(w, 'desc'),
    importedLat: parseFloat(w.getAttribute('lat')),
    importedLng: parseFloat(w.getAttribute('lon')),
    ownerName,
  }));
}

export function parseGpxToTracks(gpxString) {
  // Use DOMParser; works in both browser and jsdom test env
  const parser = typeof DOMParser !== 'undefined' ? new DOMParser() : new (require('@xmldom/xmldom').DOMParser)();
  const doc = parser.parseFromString(gpxString, 'application/xml');

  const trks = Array.from(doc.getElementsByTagName('trk'));
  const tracks = trks.map(trk => {
    const name = textOf(trk, 'name') ?? 'Imported Track';
    const profile = TYPE_TO_PROFILE[(textOf(trk, 'type') ?? '').toLowerCase()] ?? 'foot';
    const points = parsePoints(trk);
    const segments = points.length >= 2
      ? [{ fromIdx: 0, toIdx: points.length - 1, profile, surface: null, routerEngine: 'manual' }]
      : [];
    const waypoints = parseWaypoints(doc, name);
    return {
      id: crypto.randomUUID(),
      legId: null,
      name,
      profile,
      points,
      segments,
      waypoints,
      stats: { distanceKm: 0, durationH: 0, ascentM: 0, descentM: 0, maxEleM: 0, minEleM: 0, difficulty: 'easy' },
      source: 'imported',
      visibility: 'private',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });
  return tracks;
}
```

> Note: jsdom (Vitest env) provides DOMParser natively. The `@xmldom/xmldom` fallback in the code is defensive; remove the require branch if lint complains.

- [ ] **Step 5: Run tests**

Run: `npm test -- gpxParser.v2.test.js --run`
Expected: PASS — 3 tests green.

- [ ] **Step 6: Commit**

```bash
git add src/utils/gpxParser.v2.js src/__tests__/utils/gpxParser.v2.test.js src/__tests__/fixtures/gpx/
git commit -m "feat(studio): gpxParser v2 with full trk/trkseg/trkpt fidelity"
```

---

## Task 6: GPX exporter v2 (TDD)

**Files:**
- Create: `src/utils/gpxExporter.v2.js`
- Test: `src/__tests__/utils/gpxExporter.v2.test.js`

- [ ] **Step 1: Write test**

Create `src/__tests__/utils/gpxExporter.v2.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { exportTrackToGpx } from '../../utils/gpxExporter.v2.js';
import { parseGpxToTracks } from '../../utils/gpxParser.v2.js';

const sampleTrack = {
  id: 'a',
  name: 'Test Compose',
  profile: 'foot',
  points: [
    { lat: 46.5, lng: 11.3, ele: 1200, time: null },
    { lat: 46.51, lng: 11.31, ele: 1250, time: null },
  ],
  segments: [{ fromIdx: 0, toIdx: 1, profile: 'foot', surface: null, routerEngine: 'brouter' }],
  waypoints: [{ id: 'w', name: 'Camp', idx: 0, category: 'camp', note: 'water source' }],
  stats: { distanceKm: 1, durationH: 0.2, ascentM: 50, descentM: 0, maxEleM: 1250, minEleM: 1200, difficulty: 'easy' },
};

describe('gpxExporter.v2', () => {
  it('emits a valid GPX 1.1 document with trkpt + ele', () => {
    const xml = exportTrackToGpx(sampleTrack);
    expect(xml).toContain('<gpx version="1.1"');
    expect(xml).toContain('<trkpt lat="46.5" lon="11.3"');
    expect(xml).toContain('<ele>1200</ele>');
    expect(xml).toContain('<name>Test Compose</name>');
    expect(xml).toContain('<wpt');
    expect(xml).toContain('<name>Camp</name>');
  });

  it('round-trips through parser without losing points or elevation', () => {
    const xml = exportTrackToGpx(sampleTrack);
    const parsed = parseGpxToTracks(xml);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].points).toHaveLength(2);
    expect(parsed[0].points[0].ele).toBe(1200);
  });
});
```

- [ ] **Step 2: Run to confirm fail**

Run: `npm test -- gpxExporter.v2.test.js --run`
Expected: FAIL.

- [ ] **Step 3: Implement exporter**

Create `src/utils/gpxExporter.v2.js`:

```js
function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const PROFILE_TO_TYPE = {
  foot: 'hiking',
  cycling: 'cycling',
  mtb: 'mountain biking',
  car: 'driving',
  boat: 'sailing',
};

export function exportTrackToGpx(track) {
  const wpts = track.waypoints.map(w => {
    const p = track.points[w.idx] ?? track.points[0];
    return `  <wpt lat="${p.lat}" lon="${p.lng}">
    <name>${esc(w.name)}</name>
    <type>${esc(w.category)}</type>${w.note ? `\n    <desc>${esc(w.note)}</desc>` : ''}
  </wpt>`;
  }).join('\n');

  const trkpts = track.points.map(p => {
    const ele = p.ele != null ? `<ele>${p.ele}</ele>` : '';
    const time = p.time ? `<time>${esc(p.time)}</time>` : '';
    return `      <trkpt lat="${p.lat}" lon="${p.lng}">${ele}${time}</trkpt>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="VenturePath Studio" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${esc(track.name)}</name>
    <time>${new Date().toISOString()}</time>
  </metadata>
${wpts}
  <trk>
    <name>${esc(track.name)}</name>
    <type>${esc(PROFILE_TO_TYPE[track.profile] ?? 'hiking')}</type>
    <trkseg>
${trkpts}
    </trkseg>
  </trk>
</gpx>`;
}

export function downloadTrackGpx(track) {
  const xml = exportTrackToGpx(track);
  const blob = new Blob([xml], { type: 'application/gpx+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${track.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.gpx`;
  a.click();
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- gpxExporter.v2.test.js --run`
Expected: PASS — 2 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/utils/gpxExporter.v2.js src/__tests__/utils/gpxExporter.v2.test.js
git commit -m "feat(studio): gpxExporter v2 with trkpt+ele and round-trip parity"
```

---

## Task 7: Wire tracks slice into useTripStore

**Files:**
- Modify: `src/store/useTripStore.jsx`

- [ ] **Step 1: Inspect current store shape**

Run: `head -200 src/store/useTripStore.jsx` — locate `initialState`, the reducer dispatcher, and the context provider/hook export. (Already partially read in spec; verify lines.)

- [ ] **Step 2: Add slice import and wire**

Modify `src/store/useTripStore.jsx`:

At the top, after existing imports, add:

```js
import { tracksReducer, initialTracksState } from './slices/tracks.js';
```

Inside `initialState`, add the `tracks` slice (place after `vault: []`):

```js
  tracks: initialTracksState,
```

Inside the root `reducer(state, action)` switch, **before the `default:` clause**, add:

```js
    default: {
      if (typeof action.type === 'string' && action.type.startsWith('tracks/')) {
        return { ...state, tracks: tracksReducer(state.tracks, action) };
      }
      return state;
    }
```

> Remove the existing `default: return state;` if you keep the block above — there must be exactly one `default` clause.

- [ ] **Step 3: Add helper hook for components**

At the bottom of `useTripStore.jsx` (or wherever existing hooks like `useTrip()` live), export:

```js
export function useTracks() {
  const { state, dispatch } = useContext(TripStoreContext);
  return { tracks: state.tracks.tracks, past: state.tracks.past, future: state.tracks.future, dispatch };
}
```

> Verify `TripStoreContext` is the actual exported context name in the file; rename if it differs.

- [ ] **Step 4: Smoke test**

Run: `npm test -- --run` and verify everything still green. No new test required here — the slice is tested in isolation and integration is small.

- [ ] **Step 5: Commit**

```bash
git add src/store/useTripStore.jsx
git commit -m "feat(studio): wire tracks slice into root store with useTracks hook"
```

---

## Task 8: Studio page route shell

**Files:**
- Create: `src/pages/Studio.jsx`
- Modify: `src/App.jsx` (or wherever routes are declared — confirmed in Task 1)

- [ ] **Step 1: Write the page**

Create `src/pages/Studio.jsx`:

```jsx
import { useEffect } from 'react';
import { useTracks } from '../store/useTripStore.jsx';
import { ADD_TRACK } from '../store/slices/tracks.js';
import TrackStudio from '../components/studio/TrackStudio.jsx';

export default function Studio() {
  const { tracks, dispatch } = useTracks();

  // Ensure there's always one active draft track to compose into
  useEffect(() => {
    if (tracks.length === 0) {
      dispatch({ type: ADD_TRACK, payload: { name: "Architect's Composition", profile: 'foot' } });
    }
  }, [tracks.length, dispatch]);

  const active = tracks[tracks.length - 1];
  if (!active) return null;

  return (
    <div className="h-screen w-screen bg-[#0E1012] text-[#D9C5B2]">
      <TrackStudio trackId={active.id} />
    </div>
  );
}
```

- [ ] **Step 2: Register the route**

Open the router file identified in Task 1. Add the route. If using react-router-dom v6:

```jsx
// inside <Routes>
import Studio from './pages/Studio.jsx';
// …
<Route path="/studio" element={<Studio />} />
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/Studio.jsx src/App.jsx
git commit -m "feat(studio): /studio route with auto-created draft track"
```

> Note: `TrackStudio` doesn't exist yet — the build will fail at the import line. Acceptable: Task 9 creates a placeholder shell so this becomes wireable. Run `npm run dev` only at the end of Task 9.

---

## Task 9: TrackStudio shell + ToolRail (no drawing yet)

**Files:**
- Create: `src/components/studio/TrackStudio.jsx`
- Create: `src/components/studio/ToolRail.jsx`

- [ ] **Step 1: Build the ToolRail**

Create `src/components/studio/ToolRail.jsx`:

```jsx
import { Pencil, Move, MapPin, Undo2, Redo2, Download } from 'lucide-react';

const TOOLS = [
  { id: 'draw',     label: 'Compose',    Icon: Pencil  },
  { id: 'edit',     label: 'Re-route',   Icon: Move    },
  { id: 'waypoint', label: 'Anchor',     Icon: MapPin  },
];

export default function ToolRail({ tool, onTool, onUndo, onRedo, canUndo, canRedo, onExport, profile, onProfile }) {
  return (
    <aside className="absolute left-4 top-4 z-[1000] flex flex-col gap-2 rounded-md border border-[#3a2f25] bg-[#0E1012]/95 p-2 font-[JetBrains_Mono]">
      {TOOLS.map(({ id, label, Icon }) => (
        <button
          key={id}
          onClick={() => onTool(id)}
          aria-pressed={tool === id}
          className={`flex items-center gap-2 rounded px-3 py-2 text-xs uppercase tracking-wider ${
            tool === id ? 'bg-[#E67E22] text-[#0E1012]' : 'text-[#D9C5B2] hover:bg-[#1a1410]'
          }`}
          title={`${label} tool`}
        >
          <Icon size={14} />
          {label}
        </button>
      ))}

      <div className="my-1 h-px bg-[#3a2f25]" />

      <label className="text-[10px] uppercase tracking-wider text-[#D9C5B2]/60">Mode</label>
      <select
        value={profile}
        onChange={(e) => onProfile(e.target.value)}
        className="rounded bg-[#1a1410] px-2 py-1 text-xs text-[#D9C5B2]"
      >
        <option value="foot">Foot</option>
        <option value="cycling">Cycling</option>
        <option value="mtb">MTB</option>
        <option value="car">Car</option>
      </select>

      <div className="my-1 h-px bg-[#3a2f25]" />

      <button onClick={onUndo} disabled={!canUndo} className="flex items-center gap-2 rounded px-3 py-2 text-xs text-[#D9C5B2] hover:bg-[#1a1410] disabled:opacity-40" title="Undo">
        <Undo2 size={14} /> Undo
      </button>
      <button onClick={onRedo} disabled={!canRedo} className="flex items-center gap-2 rounded px-3 py-2 text-xs text-[#D9C5B2] hover:bg-[#1a1410] disabled:opacity-40" title="Redo">
        <Redo2 size={14} /> Redo
      </button>

      <div className="my-1 h-px bg-[#3a2f25]" />

      <button onClick={onExport} className="flex items-center gap-2 rounded bg-[#E67E22]/20 px-3 py-2 text-xs uppercase tracking-wider text-[#E67E22] hover:bg-[#E67E22]/30" title="Export GPX">
        <Download size={14} /> Export
      </button>
    </aside>
  );
}
```

- [ ] **Step 2: Build the studio shell**

Create `src/components/studio/TrackStudio.jsx`:

```jsx
import { useMemo, useState } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, useMapEvents } from 'react-leaflet';
import { useTracks } from '../../store/useTripStore.jsx';
import { SET_TRACK_PROFILE, UNDO, REDO } from '../../store/slices/tracks.js';
import { downloadTrackGpx } from '../../utils/gpxExporter.v2.js';
import ToolRail from './ToolRail.jsx';

export default function TrackStudio({ trackId }) {
  const { tracks, past, future, dispatch } = useTracks();
  const track = useMemo(() => tracks.find(t => t.id === trackId), [tracks, trackId]);
  const [tool, setTool] = useState('draw');

  if (!track) return null;

  const polyline = track.points.map(p => [p.lat, p.lng]);
  const center = polyline[0] ?? [46.5, 11.3]; // Dolomites — VP's expedition vibe

  return (
    <div className="relative h-full w-full">
      <ToolRail
        tool={tool}
        onTool={setTool}
        onUndo={() => dispatch({ type: UNDO })}
        onRedo={() => dispatch({ type: REDO })}
        canUndo={past.length > 0}
        canRedo={future.length > 0}
        onExport={() => downloadTrackGpx(track)}
        profile={track.profile}
        onProfile={(profile) => dispatch({ type: SET_TRACK_PROFILE, payload: { trackId: track.id, profile } })}
      />

      <MapContainer center={center} zoom={11} className="h-full w-full" attributionControl={false}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap'
        />
        {polyline.length >= 2 && (
          <Polyline positions={polyline} pathOptions={{ color: '#E67E22', weight: 4 }} />
        )}
        {track.points.map((p, i) => (
          <Marker key={i} position={[p.lat, p.lng]} />
        ))}
        <ClickHandler tool={tool} track={track} dispatch={dispatch} />
      </MapContainer>

      <div className="absolute right-4 top-4 z-[1000] rounded-md border border-[#3a2f25] bg-[#0E1012]/95 p-3 font-[JetBrains_Mono] text-xs text-[#D9C5B2]">
        <div className="text-[10px] uppercase tracking-wider text-[#D9C5B2]/60">Composition</div>
        <div className="mt-1">{track.stats.distanceKm.toFixed(2)} km · {Math.round(track.stats.durationH * 60)} min</div>
        <div>↑ {track.stats.ascentM} m · ↓ {track.stats.descentM} m</div>
        <div className="text-[#E67E22]">{track.stats.difficulty.toUpperCase()}</div>
      </div>
    </div>
  );
}

function ClickHandler({ tool, track, dispatch }) {
  // Filled in by Task 10 (drawing) and Task 11 (editing). Render nothing for now.
  useMapEvents({});
  return null;
}
```

- [ ] **Step 3: Smoke test**

Run: `npm run dev` and navigate to `http://localhost:3001/studio`.
Expected: Leaflet map renders, ToolRail visible on the left with Compose tool active, stats panel on right shows `0.00 km`, no errors in console.

- [ ] **Step 4: Commit**

```bash
git add src/components/studio/TrackStudio.jsx src/components/studio/ToolRail.jsx
git commit -m "feat(studio): TrackStudio shell with map + ToolRail (no drawing yet)"
```

---

## Task 10: Click-to-extend drawing

**Files:**
- Modify: `src/components/studio/TrackStudio.jsx` (replace the `ClickHandler` stub)

- [ ] **Step 1: Add drawing logic to ClickHandler**

In `src/components/studio/TrackStudio.jsx`, replace the entire `ClickHandler` function with:

```jsx
function ClickHandler({ tool, track, dispatch }) {
  useMapEvents({
    async click(e) {
      if (tool !== 'draw') return;
      const { lat, lng } = e.latlng;
      const last = track.points[track.points.length - 1];

      // First click: drop a single starting point
      if (!last) {
        dispatch({
          type: 'tracks/APPEND_POINTS',
          payload: {
            trackId: track.id,
            points: [{ lat, lng, ele: null, time: null }],
            engine: 'manual',
            profile: track.profile,
          },
        });
        return;
      }

      // Subsequent clicks: ask routing engine for a path from `last` to clicked point
      const { routeBetween } = await import('../../services/routingEngine.js');
      const { hydrateElevations } = await import('../../services/elevationEngine.js');

      const res = await routeBetween({
        from: { lat: last.lat, lng: last.lng },
        to:   { lat, lng },
        profile: track.profile,
      });
      // Skip the first point of the segment (it's `last`, already in the track)
      const newPoints = res.points.slice(1);
      dispatch({
        type: 'tracks/APPEND_POINTS',
        payload: { trackId: track.id, points: newPoints, engine: res.engine, profile: track.profile },
      });

      // Fire-and-forget elevation hydration for the new points
      const eles = await hydrateElevations(newPoints);
      const startIdx = track.points.length;
      const fullEles = new Array(startIdx).fill(null).concat(eles);
      dispatch({
        type: 'tracks/HYDRATE_ELEVATION',
        payload: { trackId: track.id, elevations: fullEles },
      });
    },
  });
  return null;
}
```

- [ ] **Step 2: Manual smoke test**

`npm run dev` → `/studio` → click 4 points in a city.
Expected: Each click extends the polyline; on a city, the polyline follows roads (BRouter call visible in Network tab). After ~2s the elevation strip values populate.

- [ ] **Step 3: Commit**

```bash
git add src/components/studio/TrackStudio.jsx
git commit -m "feat(studio): click-to-extend drawing with routing engine + elevation hydration"
```

---

## Task 11: Drag-vertex re-route

**Files:**
- Modify: `src/components/studio/TrackStudio.jsx`

- [ ] **Step 1: Replace static Marker rendering with draggable markers**

In `TrackStudio.jsx`, replace the `track.points.map(...)` Marker block with:

```jsx
{track.points.map((p, i) => (
  <Marker
    key={i}
    position={[p.lat, p.lng]}
    draggable={tool === 'edit'}
    eventHandlers={{
      dragend: async (ev) => {
        if (tool !== 'edit') return;
        const { lat, lng } = ev.target.getLatLng();
        dispatch({ type: 'tracks/MOVE_POINT', payload: { trackId: track.id, idx: i, lat, lng } });

        // Reroute prev→this and this→next, if neighbors exist
        const { routeBetween } = await import('../../services/routingEngine.js');
        const prev = track.points[i - 1];
        const next = track.points[i + 1];
        // Note: this is a simplified reroute that appends segments rather than splicing — full splice
        // is deferred; this is enough for v1 to show the editor working. A follow-up will splice in-range.
        if (prev) {
          await routeBetween({ from: { lat: prev.lat, lng: prev.lng }, to: { lat, lng }, profile: track.profile });
        }
        if (next) {
          await routeBetween({ from: { lat, lng }, to: { lat: next.lat, lng: next.lng }, profile: track.profile });
        }
      },
    }}
  />
))}
```

> Honest scope note: a *true* drag-and-splice (replacing the polyline segments around the moved vertex with newly-routed ones) is non-trivial because the slice currently appends segments rather than splicing them. v1 ships the *vertex move + warm cache for neighbors*, and the polyline visibly updates to the dragged location with straight lines to neighbors. Phase 4 will implement true segment splicing once segment indexing is reworked.

- [ ] **Step 2: Smoke test**

`npm run dev` → draw 4 points → switch to Re-route tool → drag middle vertex → polyline updates and vertex stays.

- [ ] **Step 3: Commit**

```bash
git add src/components/studio/TrackStudio.jsx
git commit -m "feat(studio): vertex drag in edit mode with neighbor cache warm-up"
```

---

## Task 12: Elevation strip wired to track.points

**Files:**
- Create: `src/components/studio/StudioElevationStrip.jsx`
- Modify: `src/components/studio/TrackStudio.jsx`

- [ ] **Step 1: Build the strip**

Create `src/components/studio/StudioElevationStrip.jsx`:

```jsx
export default function StudioElevationStrip({ points }) {
  const eles = points.map(p => p.ele).filter(e => e != null);
  if (eles.length < 2) {
    return (
      <div className="absolute bottom-4 left-1/2 z-[1000] -translate-x-1/2 rounded-md border border-[#3a2f25] bg-[#0E1012]/95 px-4 py-3 font-[JetBrains_Mono] text-xs text-[#D9C5B2]/60">
        Compose at least two points to see elevation
      </div>
    );
  }
  const min = Math.min(...eles);
  const max = Math.max(...eles);
  const range = max - min || 1;
  const W = 480, H = 80;
  const path = points
    .filter(p => p.ele != null)
    .map((p, i, arr) => {
      const x = (i / (arr.length - 1)) * W;
      const y = H - ((p.ele - min) / range) * H;
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <div className="absolute bottom-4 left-1/2 z-[1000] -translate-x-1/2 rounded-md border border-[#3a2f25] bg-[#0E1012]/95 p-3 font-[JetBrains_Mono]">
      <div className="mb-1 flex justify-between text-[10px] uppercase tracking-wider text-[#D9C5B2]/60">
        <span>{Math.round(min)} m</span>
        <span>Elevation</span>
        <span>{Math.round(max)} m</span>
      </div>
      <svg width={W} height={H} className="block">
        <path d={path} fill="none" stroke="#E67E22" strokeWidth="2" />
      </svg>
    </div>
  );
}
```

- [ ] **Step 2: Mount in TrackStudio**

In `src/components/studio/TrackStudio.jsx`, add the import:

```jsx
import StudioElevationStrip from './StudioElevationStrip.jsx';
```

And inside the outer `<div className="relative h-full w-full">`, after the `</MapContainer>` closing tag and before the stats panel, add:

```jsx
<StudioElevationStrip points={track.points} />
```

- [ ] **Step 3: Smoke test**

`npm run dev` → draw a route → wait for elevations → bottom strip shows the SVG profile.

- [ ] **Step 4: Commit**

```bash
git add src/components/studio/StudioElevationStrip.jsx src/components/studio/TrackStudio.jsx
git commit -m "feat(studio): bottom elevation strip rendered from track.points"
```

---

## Task 13: Apple compliance audit pass

**Files:**
- Read-only review of files touched in Tasks 8–12.

- [ ] **Step 1: Vocabulary check**

Run: `grep -rn "user\|trip\|setup\|journey\|create\b" src/components/studio/ src/pages/Studio.jsx`
Expected: zero hits in user-visible strings. If any appear, replace with Architect/Composition/Compose/expedition vocabulary.

- [ ] **Step 2: Token check**

Run: `grep -rn "text-gray-\|bg-gray-\|text-white\b\|bg-black\b" src/components/studio/ src/pages/Studio.jsx`
Expected: zero hits. All colors should be hex (`#0E1012`, `#E67E22`, `#D9C5B2`, `#3a2f25`) per VP-5.

- [ ] **Step 3: Empty state check**

Open `/studio` in a fresh state (clear localStorage). Verify the ElevationStrip empty state copy reads "Compose at least two points to see elevation" — branded, not generic.

- [ ] **Step 4: Differentiation answer (per Apple Rule 3)**

Append to `holyflex/logs/$(date +%Y-%m-%d).md`:

```
## [HH:MM] GPX Studio Phase 1 — differentiation
1. UNIQUENESS: Studio uses VP's expedition vocabulary, Midnight+Ember palette, and is wired to write to the same `useTripStore` that PackingManifest/RouteMap/LedgerWorkbench read from — a generic editor cannot share state across an expedition planner this way.
2. BRAND FIDELITY: #0E1012 Midnight bg, #E67E22 Ember polyline + active-tool, JetBrains Mono throughout, "Compose / Re-route / Anchor / Architect" copy.
3. FUNCTIONALITY DEPTH: draw, edit-vertex, profile switch, undo, redo, export GPX, anchor waypoints (5+ distinct actions).
- Files changed: see git log -- src/components/studio/ src/pages/Studio.jsx src/store/slices/tracks.js src/services/
```

- [ ] **Step 5: Commit (logs only — no code)**

```bash
git -C /c/Users/lasse/Desktop/holyflex add logs/
git -C /c/Users/lasse/Desktop/holyflex commit -m "log(venturepath): GPX Studio Phase 1 differentiation audit"
```

> Note: the log lives in the **holyflex** repo per CLAUDE.md's mandatory logging contract, even though the code lives in venturepath. Both repos get a commit.

---

## Task 14: End-to-end smoke + final commit

**Files:**
- No code changes; tag the Phase 1 boundary.

- [ ] **Step 1: Full test pass**

Run: `npm test -- --run`
Expected: every test green (slice + 2 services + 2 GPX modules).

- [ ] **Step 2: Build pass**

Run: `npm run build`
Expected: clean Vite build, no missing imports.

- [ ] **Step 3: Manual E2E**

`npm run dev` → `http://localhost:3001/studio`:
1. Click 5 points in a city → polyline snaps to roads (verify BRouter request in Network).
2. Switch to Re-route → drag middle vertex → polyline updates.
3. Stats panel updates on every action (distance, ascent).
4. Elevation strip renders SVG curve after a few seconds.
5. Click Export → `architects-composition.gpx` downloads. Open in https://gpx.studio → track + elevation render correctly.
6. Reload page → state is empty (Phase 1 does not persist tracks; Phase 3 will move to IndexedDB).

- [ ] **Step 4: Tag the milestone**

```bash
git tag studio-phase-1
git log --oneline studio-phase-1
```

---

## Out-of-Scope (deferred to later phases)

- Cross-tool wiring (RouteMap pins, FlightScout, PackingManifest, LedgerWorkbench, TacticalMode, VentureVault, POI reverse flow) — **Phases 2–4**.
- True segment-splicing on vertex drag (current behavior warms cache but doesn't reroute polyline mid-track) — **Phase 4**.
- Persistence to IndexedDB — **Phase 3** (large tracks will exceed localStorage).
- In-trip `EditTrackOverlay` inside TripPlanner — **Phase 4** (same `TrackStudio` component, new mount point).
- KML/GeoJSON import — **post-MVP**.
- Multi-track tabs, merge/split/reverse — **Phase 4**.

---

## Self-review notes

- All tests use real code; no `expect(true)` placeholders.
- The `default:` clause merge in Task 7 must keep the file's existing `default: return state;` — if there are TWO default clauses after the edit, the second is unreachable. Verify by reading the reducer after editing.
- The `ClickHandler` in Task 10 uses dynamic `import()` for `routingEngine` and `elevationEngine` to keep the initial Studio bundle small; this is intentional, not a placeholder.
- Task 11's drag-reroute is honestly scoped — it warms the cache and moves the vertex visually, but does not splice the polyline. The plan calls this out. A second-class implementation that pretends to do more would be worse than a true v1 that's clear about its limits.
- Task 13 writes the log to holyflex per CLAUDE.md mandate — this is intentional cross-repo behavior.
