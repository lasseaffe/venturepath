# GPX Studio — Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Make imported GPX files first-class citizens of an expedition: drop dense tracks into the existing RouteMap with pins, suggest flights to the start of the track, and persist tracks durably (IndexedDB) so 10k-point imports don't blow up localStorage.

**Architecture:** Three independent surfaces glued together by the existing `tracks` slice — (1) a storage swap that moves the slice out of `useTripStore`'s localStorage path into IndexedDB, (2) an import flow that uses `gpxParser.v2.js` to emit real `Track` records and auto-attaches them to a leg's waypoint list, (3) a flight suggestion path that finds the nearest IATA airport to the track's first point and surfaces it in FlightScout. No editor changes — Studio (Phase 1) stays untouched.

**Tech Stack:** Vite + React 19 (JSX), Vitest 4 + jsdom, browser-native IndexedDB (no idb-keyval — keep the dep tree thin), `react-leaflet`, the v2 parser/exporter from Phase 1.

**Spec:** `C:\Users\lasse\.claude\plans\for-venture-path-build-dynamic-token.md`
**Phase 1 plan (shipped):** `docs/superpowers/plans/2026-05-13-gpx-studio-phase-1.md`

**Repo root:** `C:\Users\lasse\Desktop\venturepath` — never write outside this tree.

---

## File Map

**Create**
- `src/store/tracksPersistence.js` — IndexedDB read/write/clear for the `tracks` slice
- `src/services/trackEmitters.js` — pure functions: `tracksToLegPatch(track)`, `nearestAirportToTrack(track)`. Phase 1 left this empty; Phase 2 fills the first two emitters.
- `src/data/airports.iata.json` — bundled IATA dataset (curated subset, ~500KB)
- `src/utils/iataNearest.js` — pure haversine + nearest-N lookup
- `src/components/itinerary/GpxImportDialog.v2.jsx` — new dialog that previews a `Track` (not flat stops) and offers attach-mode choices
- Tests for everything created (mirrored under `src/__tests__/`)

**Modify**
- `src/store/useTripStore.jsx` — strip `tracks` from the localStorage `loadState` / `saveState` paths; on mount, kick off a `loadTracksFromIdb()` hydrate that dispatches `HYDRATE_TRACKS`
- `src/store/slices/tracks.js` — add `HYDRATE_TRACKS` action that replaces `tracks` array wholesale (used by the IDB load)
- `src/components/itinerary/GpxPanel.jsx` — switch from `parseGpxToStops` to `parseGpxToTracks`; render the new dialog
- `src/utils/flightEngine.js` — add `suggestFromCoords({ lat, lng })`
- `src/components/logistics/FlightScout.jsx` — accept a `suggestedOrigin` prop and render a "Origin near track start" banner
- `src/pages/TripPlanner.jsx` — pass the active track's start point to FlightScout

**Do NOT touch in Phase 2**
- Anything under `src/components/studio/` (Phase 1 surface is frozen)
- The v1 parser/exporter (`gpxItineraryParser.js`, `gpxExporter.js`) — they keep running in parallel for anything that still calls them; Phase 4 removes them
- `useTripStore.jsx`'s `legs`, `stays`, `pois`, `dayLoops` reducer cases (no changes to existing behavior)
- The `tracks` reducer cases from Phase 1 — they're stable

---

## Task 1: IndexedDB persistence for tracks slice (TDD)

**Files:**
- Create: `src/store/tracksPersistence.js`
- Test: `src/__tests__/store/tracksPersistence.test.js`

- [ ] **Step 1: Write failing test**

The test uses [fake-indexeddb](https://www.npmjs.com/package/fake-indexeddb) which is NOT installed yet — install it first as a devDependency:

```bash
npm i -D fake-indexeddb
```

Add at the top of `src/test-setup.js` (the file vitest already uses):

```js
import 'fake-indexeddb/auto';
```

Create `src/__tests__/store/tracksPersistence.test.js`:

```js
import { describe, it, expect, beforeEach } from 'vitest';
import { saveTracks, loadTracks, clearTracks } from '../../store/tracksPersistence.js';

beforeEach(async () => {
  await clearTracks();
});

describe('tracksPersistence', () => {
  it('round-trips an array of tracks', async () => {
    const tracks = [{ id: 't1', name: 'A', points: [{ lat: 1, lng: 2, ele: 100 }] }];
    await saveTracks(tracks);
    const loaded = await loadTracks();
    expect(loaded).toEqual(tracks);
  });

  it('returns [] when nothing is saved', async () => {
    expect(await loadTracks()).toEqual([]);
  });

  it('overwrites prior tracks on save', async () => {
    await saveTracks([{ id: 'a' }]);
    await saveTracks([{ id: 'b' }]);
    expect(await loadTracks()).toEqual([{ id: 'b' }]);
  });
});
```

- [ ] **Step 2: Run to confirm fail**

```bash
npx vitest run tracksPersistence.test.js
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement persistence**

Create `src/store/tracksPersistence.js`:

```js
const DB_NAME = 'vp-studio';
const DB_VERSION = 1;
const STORE = 'tracks';
const KEY = 'all';

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(mode, fn) {
  return openDb().then(db => new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const store = t.objectStore(STORE);
    const result = fn(store);
    t.oncomplete = () => resolve(result?.result ?? result);
    t.onerror = () => reject(t.error);
  }));
}

export async function saveTracks(tracks) {
  return tx('readwrite', store => store.put(tracks, KEY));
}

export async function loadTracks() {
  const req = await tx('readonly', store => store.get(KEY));
  return req ?? [];
}

export async function clearTracks() {
  return tx('readwrite', store => store.delete(KEY));
}
```

- [ ] **Step 4: Verify pass + commit**

```bash
npx vitest run tracksPersistence.test.js
# expect 3/3 green

git add src/store/tracksPersistence.js src/__tests__/store/tracksPersistence.test.js src/test-setup.js package.json package-lock.json
git commit -m "feat(studio): IndexedDB persistence for tracks slice"
```

---

## Task 2: HYDRATE_TRACKS action + store wiring (TDD + integration)

**Files:**
- Modify: `src/store/slices/tracks.js` — add `HYDRATE_TRACKS` action
- Modify: `src/store/useTripStore.jsx` — strip `tracks` from localStorage, hydrate from IDB on mount
- Test: extend `src/__tests__/store/slices/tracks.test.js` with one new test

- [ ] **Step 1: Add a test for HYDRATE_TRACKS**

Append to `src/__tests__/store/slices/tracks.test.js`:

```js
import { HYDRATE_TRACKS } from '../../../store/slices/tracks.js';

it('HYDRATE_TRACKS replaces the tracks array and clears history', () => {
  const seed = tracksReducer(initialTracksState, { type: ADD_TRACK, payload: { name: 'X', profile: 'foot' } });
  const hydrated = tracksReducer(seed, {
    type: HYDRATE_TRACKS,
    payload: [{ id: 'h', name: 'Hydrated', profile: 'foot', points: [], segments: [], waypoints: [], stats: { distanceKm: 0, durationH: 0, ascentM: 0, descentM: 0, maxEleM: 0, minEleM: 0, difficulty: 'easy' }, source: 'imported', visibility: 'private', createdAt: '2026-05-13', updatedAt: '2026-05-13' }],
  });
  expect(hydrated.tracks).toHaveLength(1);
  expect(hydrated.tracks[0].id).toBe('h');
  expect(hydrated.past).toEqual([]);
  expect(hydrated.future).toEqual([]);
});
```

- [ ] **Step 2: Run to confirm fail**

```bash
npx vitest run tracks.test.js
```

- [ ] **Step 3: Implement HYDRATE_TRACKS**

In `src/store/slices/tracks.js`, add the constant export near the top with the others:

```js
export const HYDRATE_TRACKS = 'tracks/HYDRATE';
```

Add a case in the reducer (before `default:`):

```js
case HYDRATE_TRACKS: {
  return { tracks: action.payload ?? [], past: [], future: [] };
}
```

- [ ] **Step 4: Strip tracks from localStorage path in useTripStore**

Open `src/store/useTripStore.jsx`. Find the localStorage save/load helpers (`loadState` / the `useEffect` that calls `localStorage.setItem`). Tracks must NOT be serialized to localStorage anymore — they live in IDB only.

The cleanest cut: filter `tracks` out of the persisted state. Look for the `localStorage.setItem(STORAGE_KEY, JSON.stringify(state))` line (or similar) and replace with:

```js
const { tracks, ...persistable } = state;
localStorage.setItem(STORAGE_KEY, JSON.stringify(persistable));
```

In `loadState()`, after parsing JSON, do NOT restore `tracks` — leave `initialTracksState` as the seed. (The IDB hydrate below replaces it.)

- [ ] **Step 5: Hydrate from IDB on mount**

In `TripStoreProvider`, after the `useReducer(reducer, initialState, loadState)` line, add:

```js
useEffect(() => {
  let cancelled = false;
  import('./tracksPersistence.js').then(({ loadTracks }) => loadTracks()).then(loaded => {
    if (!cancelled && loaded.length > 0) {
      dispatch({ type: HYDRATE_TRACKS, payload: loaded });
    }
  });
  return () => { cancelled = true; };
}, []);
```

Make sure `HYDRATE_TRACKS` is imported at the top:

```js
import { tracksReducer, initialTracksState, HYDRATE_TRACKS } from './slices/tracks.js';
```

- [ ] **Step 6: Persist on track changes**

After the same `useReducer` line, add a second effect that writes tracks to IDB whenever they change:

```js
useEffect(() => {
  import('./tracksPersistence.js').then(({ saveTracks }) => saveTracks(state.tracks.tracks));
}, [state.tracks.tracks]);
```

> Note: dynamic `import()` keeps IDB code out of the initial bundle. The Promise rejection (e.g., quota exceeded) is intentionally not caught here for v2 — Phase 3 will add a user-facing error path. For now, errors silently fail.

- [ ] **Step 7: Smoke test full suite**

```bash
npx vitest run
```

Expected: all previously-passing tests still pass; 1 new test green (HYDRATE_TRACKS).

- [ ] **Step 8: Commit**

```bash
git add src/store/slices/tracks.js src/__tests__/store/slices/tracks.test.js src/store/useTripStore.jsx
git commit -m "feat(studio): hydrate tracks from IndexedDB; remove from localStorage path"
```

---

## Task 3: IATA airport dataset

**Files:**
- Create: `src/data/airports.iata.json`
- Create: `src/__tests__/fixtures/airports.smoke.test.js`

This is a data task, not code. We're bundling a curated subset of the IATA airport list.

- [ ] **Step 1: Source the dataset**

Use the public-domain list from [datahub.io/core/airport-codes](https://datahub.io/core/airport-codes). Download `airport-codes.json`. Filter to large + medium airports with valid IATA codes (`iata_code` non-empty, `type` in {`large_airport`, `medium_airport`}).

Run this one-shot Node script (you can put it in a temp file, run, delete):

```js
// scripts/build-airports.mjs (one-shot, not committed)
import { readFileSync, writeFileSync } from 'node:fs';
const all = JSON.parse(readFileSync('/tmp/airport-codes.json', 'utf8'));
const curated = all
  .filter(a => a.iata_code && /^[A-Z]{3}$/.test(a.iata_code) && (a.type === 'large_airport' || a.type === 'medium_airport'))
  .map(a => {
    const [lng, lat] = (a.coordinates ?? '').split(',').map(s => parseFloat(s.trim()));
    return { iata: a.iata_code, name: a.name, city: a.municipality, country: a.iso_country, lat, lng };
  })
  .filter(a => Number.isFinite(a.lat) && Number.isFinite(a.lng));
writeFileSync('src/data/airports.iata.json', JSON.stringify(curated, null, 0));
console.log(`Wrote ${curated.length} airports`);
```

Expected output: ~7000–8000 records, file size ~500KB.

- [ ] **Step 2: Smoke test the JSON**

Create `src/__tests__/fixtures/airports.smoke.test.js`:

```js
import { describe, it, expect } from 'vitest';
import airports from '../../data/airports.iata.json';

describe('airports.iata.json', () => {
  it('has at least 5000 entries', () => {
    expect(airports.length).toBeGreaterThan(5000);
  });

  it('every entry has iata, lat, lng', () => {
    for (const a of airports) {
      expect(a.iata).toMatch(/^[A-Z]{3}$/);
      expect(Number.isFinite(a.lat)).toBe(true);
      expect(Number.isFinite(a.lng)).toBe(true);
    }
  });

  it('contains FRA (Frankfurt) — sanity check', () => {
    expect(airports.find(a => a.iata === 'FRA')).toBeTruthy();
  });
});
```

- [ ] **Step 3: Verify + commit**

```bash
npx vitest run airports.smoke.test.js
# expect 3/3 green

git add src/data/airports.iata.json src/__tests__/fixtures/airports.smoke.test.js
git commit -m "feat(studio): bundle IATA airport dataset (large+medium, ~7500 airports)"
```

---

## Task 4: Nearest-airport lookup (TDD)

**Files:**
- Create: `src/utils/iataNearest.js`
- Test: `src/__tests__/utils/iataNearest.test.js`

- [ ] **Step 1: Write test**

Create `src/__tests__/utils/iataNearest.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { nearestAirport, nearestAirports } from '../../utils/iataNearest.js';

describe('iataNearest', () => {
  it('finds FRA closest to Frankfurt centre', () => {
    const a = nearestAirport({ lat: 50.1109, lng: 8.6821 });
    expect(a.iata).toBe('FRA');
  });

  it('returns N candidates sorted by distance', () => {
    const list = nearestAirports({ lat: 46.5, lng: 11.3 }, 3);
    expect(list).toHaveLength(3);
    // Distances must be monotonically increasing
    for (let i = 1; i < list.length; i++) {
      expect(list[i].distanceKm).toBeGreaterThanOrEqual(list[i - 1].distanceKm);
    }
  });
});
```

- [ ] **Step 2: Implement**

Create `src/utils/iataNearest.js`:

```js
import airports from '../data/airports.iata.json';

function haversine(a, b) {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const sA = Math.sin(dLat / 2), sB = Math.sin(dLng / 2);
  const chord = sA * sA + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * sB * sB;
  return R * 2 * Math.atan2(Math.sqrt(chord), Math.sqrt(1 - chord));
}

export function nearestAirports(point, n = 1) {
  return airports
    .map(a => ({ ...a, distanceKm: haversine(point, a) }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, n);
}

export function nearestAirport(point) {
  return nearestAirports(point, 1)[0] ?? null;
}
```

> Performance note: this does a full O(n) scan for each query (n ≈ 7500). For Phase 2's call frequency (one lookup per imported track) this is fine; total cost is single-digit milliseconds. Phase 4 can build a kd-tree if FlightScout starts hammering it.

- [ ] **Step 3: Verify + commit**

```bash
npx vitest run iataNearest.test.js
# expect 2/2 green

git add src/utils/iataNearest.js src/__tests__/utils/iataNearest.test.js
git commit -m "feat(studio): nearestAirport lookup over IATA dataset"
```

---

## Task 5: Track emitters — leg-patch builder (TDD)

**Files:**
- Create: `src/services/trackEmitters.js`
- Test: `src/__tests__/services/trackEmitters.test.js`

- [ ] **Step 1: Write test**

Create `src/__tests__/services/trackEmitters.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { tracksToLegPatch, nearestAirportToTrack } from '../../services/trackEmitters.js';

const track = {
  id: 't1',
  name: 'Sintra Loop',
  profile: 'cycling',
  points: [
    { lat: 38.8, lng: -9.4, ele: 100 },
    { lat: 38.81, lng: -9.41, ele: 120 },
    { lat: 38.82, lng: -9.42, ele: 140 },
  ],
  waypoints: [
    { id: 'w1', name: 'Refuel', idx: 1, category: 'food' },
  ],
  stats: { distanceKm: 5.2, durationH: 0.4, ascentM: 40, descentM: 0, maxEleM: 140, minEleM: 100, difficulty: 'easy' },
};

describe('trackEmitters', () => {
  it('tracksToLegPatch emits a leg with start/end + waypoints', () => {
    const patch = tracksToLegPatch(track);
    expect(patch.from).toBe('Sintra Loop · start');
    expect(patch.to).toBe('Sintra Loop · end');
    expect(patch.mode).toBe('cycling');
    expect(patch.distanceKm).toBe(5);
    expect(patch.coords).toEqual([38.82, -9.42]); // last point
    expect(patch.waypoints).toHaveLength(1);
    expect(patch.waypoints[0].name).toBe('Refuel');
    expect(patch.waypoints[0].coords).toEqual([38.81, -9.41]);
  });

  it('nearestAirportToTrack uses the track start point', () => {
    const airport = nearestAirportToTrack(track);
    expect(airport).toBeTruthy();
    expect(airport.iata).toMatch(/^[A-Z]{3}$/);
    // Lisbon (LIS) should be nearest to Sintra
    expect(airport.iata).toBe('LIS');
  });

  it('returns null for an empty track', () => {
    expect(nearestAirportToTrack({ points: [] })).toBeNull();
    expect(tracksToLegPatch({ points: [], waypoints: [], stats: {} })).toBeNull();
  });
});
```

- [ ] **Step 2: Implement**

Create `src/services/trackEmitters.js`:

```js
import { nearestAirport } from '../utils/iataNearest.js';

const PROFILE_TO_LEG_MODE = {
  foot: 'foot',
  cycling: 'cycling',
  mtb: 'cycling',
  car: 'car',
  boat: 'boat',
  flight: 'flight',
};

export function tracksToLegPatch(track) {
  if (!track?.points || track.points.length === 0) return null;
  const start = track.points[0];
  const end = track.points[track.points.length - 1];
  return {
    from: `${track.name} · start`,
    to: `${track.name} · end`,
    mode: PROFILE_TO_LEG_MODE[track.profile] ?? 'foot',
    distanceKm: Math.round(track.stats?.distanceKm ?? 0),
    durationH: track.stats?.durationH ?? 0,
    coords: [end.lat, end.lng],
    status: 'pending',
    trackId: track.id,
    climate: null,
    waypoints: (track.waypoints ?? []).map(w => {
      const p = track.points[w.idx] ?? start;
      return {
        id: w.id,
        name: w.name,
        coords: [p.lat, p.lng],
        category: w.category,
        status: 'planned',
        source: 'gpx-import',
      };
    }),
  };
}

export function nearestAirportToTrack(track) {
  if (!track?.points || track.points.length === 0) return null;
  const start = track.points[0];
  return nearestAirport({ lat: start.lat, lng: start.lng });
}
```

- [ ] **Step 3: Verify + commit**

```bash
npx vitest run trackEmitters.test.js
# expect 3/3 green

git add src/services/trackEmitters.js src/__tests__/services/trackEmitters.test.js
git commit -m "feat(studio): trackEmitters — leg patch + nearest airport"
```

---

## Task 6: New GpxImportDialog v2 (track-aware)

**Files:**
- Create: `src/components/itinerary/GpxImportDialog.v2.jsx`

> This is a UI task — no TDD unit tests. Smoke-tested through Task 8 manual E2E.

- [ ] **Step 1: Build the v2 dialog**

Create `src/components/itinerary/GpxImportDialog.v2.jsx`. The component takes `{ track, onConfirm, onCancel }` where `track` is a `Track` shape from `gpxParser.v2.js`. It renders:

- Header: track name, profile badge, point count
- Stats row: distance (km), duration (h), ascent/descent (m), difficulty pill
- Waypoint preview list (collapsed if >5)
- Elevation min/max
- Two attach modes:
  - **APPEND AS LEG** — call `onConfirm('append-as-leg')`
  - **REPLACE ITINERARY** — call `onConfirm('replace-with-leg')`
- Cancel button

Reuse the visual structure of the existing `GpxImportDialog.jsx` (Midnight bg, Ember accents, JetBrains Mono labels, Playfair Display heading) but render Track stats instead of a flat stop list.

The component must be ≤200 LOC. If you find it ballooning, split sub-renderers (StatsRow, WaypointList) into the same file as small unexported helpers.

> Keep `GpxImportDialog.jsx` (v1) intact — Phase 4 deletes it, not Phase 2.

- [ ] **Step 2: Commit**

```bash
git add src/components/itinerary/GpxImportDialog.v2.jsx
git commit -m "feat(studio): GpxImportDialog v2 — Track-aware preview"
```

---

## Task 7: Wire GpxPanel to v2 parser + ADD_TRACK + leg patch

**Files:**
- Modify: `src/components/itinerary/GpxPanel.jsx`

- [ ] **Step 1: Read GpxPanel.jsx** to understand its current shape — it uses `parseGpxToStops` from v1. You're replacing the parse + confirm pipeline:

  Old flow:
  1. User uploads file → `parseGpxToStops(text)` → `stops[]`
  2. Show `<GpxImportDialog stops={stops}>` → user picks append/replace
  3. On confirm: `stopsToLegs(stops)` → dispatch `ADD_LEG` per leg

  New flow:
  1. User uploads file → `parseGpxToTracks(text)` → `tracks[]` — take `tracks[0]` (Phase 4 handles multi-track)
  2. Show `<GpxImportDialog.v2 track={tracks[0]}>` → user picks attach mode
  3. On confirm:
     - Dispatch `ADD_TRACK` with the full track object (via `{ type: 'tracks/ADD', payload: track }` — Phase 1 reducer's `ADD_TRACK` generates a new id, but we want to keep the parsed one; **add a check**: if `payload.id` exists, use it; otherwise generate. Fix this in `src/store/slices/tracks.js` (single-line change inside `newTrack`).)
     - Compute `tracksToLegPatch(track)` and dispatch `ADD_LEG` (existing action) with it. The result: track is in `state.tracks.tracks` AND a corresponding leg is in `state.legs` with waypoints.

- [ ] **Step 2: Fix `newTrack` to honor an incoming id (one-liner)**

In `src/store/slices/tracks.js`, change `newTrack`:

```js
function newTrack(payload) {
  return {
    id: payload.id ?? crypto.randomUUID(),
    legId: payload.legId ?? null,
    name: payload.name ?? 'Untitled Composition',
    profile: payload.profile ?? 'foot',
    points: payload.points ?? [],
    segments: payload.segments ?? [],
    waypoints: payload.waypoints ?? [],
    stats: payload.stats ?? emptyStats(),
    source: payload.source ?? 'drawn',
    visibility: payload.visibility ?? 'private',
    createdAt: payload.createdAt ?? new Date().toISOString(),
    updatedAt: payload.updatedAt ?? new Date().toISOString(),
  };
}
```

The existing tracks slice test (`ADD_TRACK appends a new track with generated id...`) still passes because when no id is provided, `crypto.randomUUID()` runs.

- [ ] **Step 3: Wire the new flow in GpxPanel.jsx**

Replace the relevant import:

```jsx
import { parseGpxToTracks } from '../../utils/gpxParser.v2.js';
import GpxImportDialogV2 from './GpxImportDialog.v2.jsx';
import { tracksToLegPatch } from '../../services/trackEmitters.js';
import { ADD_TRACK } from '../../store/slices/tracks.js';
```

Replace the parse step (the line calling `parseGpxToStops`) with:

```jsx
const tracks = parseGpxToTracks(text);
const track = tracks[0] ?? null;
setPendingTrack(track);
```

Replace the confirm handler:

```jsx
const handleConfirm = (mode) => {
  if (!pendingTrack) return;
  dispatch({ type: ADD_TRACK, payload: pendingTrack });
  const legPatch = tracksToLegPatch(pendingTrack);
  if (mode === 'replace-with-leg') {
    dispatch({ type: 'REPLACE_LEGS', payload: [legPatch] });
  } else {
    dispatch({ type: 'ADD_LEG', payload: legPatch });
  }
  setPendingTrack(null);
};
```

Replace the dialog render:

```jsx
{pendingTrack && (
  <GpxImportDialogV2
    track={pendingTrack}
    onConfirm={handleConfirm}
    onCancel={() => setPendingTrack(null)}
  />
)}
```

- [ ] **Step 4: Manual smoke**

`npm run dev`, open TripPlanner, drop a real hiking GPX (you can use `src/__tests__/fixtures/gpx/hike.gpx` from Phase 1 — it has trk + waypoints). Verify:
- Dialog shows track name, profile, point count, waypoint list
- APPEND: new leg appears in RouteMap with pin at the track end point + waypoint pin at "Refugio"
- REPLACE: itinerary clears, single new leg with same pins
- After page reload: track persists (IDB)
- After page reload: legs persist (existing localStorage)

- [ ] **Step 5: Commit**

```bash
git add src/store/slices/tracks.js src/components/itinerary/GpxPanel.jsx
git commit -m "feat(studio): GpxPanel uses v2 parser; track import emits leg + waypoints"
```

---

## Task 8: FlightScout — suggest origin from imported track (TDD)

**Files:**
- Modify: `src/utils/flightEngine.js` — add `suggestFromCoords`
- Modify: `src/components/logistics/FlightScout.jsx` — banner
- Modify: `src/pages/TripPlanner.jsx` — pass active track to FlightScout
- Test: extend `src/__tests__/utils/iataNearest.test.js` (or new file) — test `suggestFromCoords`

- [ ] **Step 1: Add suggestFromCoords to flightEngine**

In `src/utils/flightEngine.js`, append:

```js
import { nearestAirport } from './iataNearest.js';

export function suggestFromCoords({ lat, lng }) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const a = nearestAirport({ lat, lng });
  if (!a) return null;
  return {
    iata: a.iata,
    name: a.name,
    city: a.city,
    country: a.country,
    distanceKm: Math.round(a.distanceKm),
  };
}
```

- [ ] **Step 2: Test it**

Create `src/__tests__/utils/flightEngine.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { suggestFromCoords } from '../../utils/flightEngine.js';

describe('flightEngine.suggestFromCoords', () => {
  it('returns the nearest airport with distance', () => {
    const r = suggestFromCoords({ lat: 50.1109, lng: 8.6821 });
    expect(r.iata).toBe('FRA');
    expect(r.distanceKm).toBeGreaterThanOrEqual(0);
    expect(r.distanceKm).toBeLessThan(30); // FRA is ~12km from Frankfurt centre
  });

  it('returns null for invalid coords', () => {
    expect(suggestFromCoords({ lat: NaN, lng: 0 })).toBeNull();
  });
});
```

Run: `npx vitest run flightEngine.test.js` — expect 2/2 green.

- [ ] **Step 3: Surface in FlightScout**

In `src/components/logistics/FlightScout.jsx`, add a prop `suggestedOrigin` (shape from `suggestFromCoords`). At the top of the existing component, before the flight search controls, render a banner if `suggestedOrigin` is set:

```jsx
{suggestedOrigin && (
  <div className="mb-3 rounded border border-[#E67E22]/40 bg-[#E67E22]/10 p-3 font-[JetBrains_Mono] text-xs text-[#D9C5B2]">
    <div className="text-[10px] uppercase tracking-wider text-[#E67E22] mb-1">
      Origin near track start
    </div>
    <div>
      <span className="font-bold text-[#F2EDE8]">{suggestedOrigin.iata}</span> — {suggestedOrigin.name}, {suggestedOrigin.city} ({suggestedOrigin.distanceKm} km from track start)
    </div>
    <button
      onClick={() => onApplyOrigin?.(suggestedOrigin.iata)}
      className="mt-2 rounded bg-[#E67E22] px-3 py-1 text-[10px] uppercase tracking-wider text-[#0E1012]"
    >
      Use as origin
    </button>
  </div>
)}
```

`onApplyOrigin` is a new optional prop the parent component (TripPlanner) wires to whatever sets the FlightScout's "from" field. (If FlightScout already has internal state for origin, it can use a `useEffect` to apply it directly.)

- [ ] **Step 4: Wire from TripPlanner**

In `src/pages/TripPlanner.jsx`, find where FlightScout is rendered. Compute `suggestedOrigin` from the most recently imported track:

```jsx
import { suggestFromCoords } from '../utils/flightEngine.js';
import { useTracks } from '../store/useTripStore.jsx';
// inside the component body:
const { tracks } = useTracks();
const lastTrack = tracks[tracks.length - 1];
const suggestedOrigin = lastTrack?.points?.[0]
  ? suggestFromCoords({ lat: lastTrack.points[0].lat, lng: lastTrack.points[0].lng })
  : null;
// pass to FlightScout:
<FlightScout suggestedOrigin={suggestedOrigin} ... />
```

> If FlightScout is currently rendered without props that suggest a "from" state, just wire `suggestedOrigin` for display — the apply button can be a no-op for v2 (`onApplyOrigin` undefined). Phase 4 will wire it fully.

- [ ] **Step 5: Manual smoke**

`npm run dev` → import hike.gpx into TripPlanner → open Logistics / FlightScout → verify banner appears showing nearest airport to (46.5, 11.3) — should be VRN (Verona) or BZO (Bolzano) or similar.

- [ ] **Step 6: Commit**

```bash
git add src/utils/flightEngine.js src/__tests__/utils/flightEngine.test.js src/components/logistics/FlightScout.jsx src/pages/TripPlanner.jsx
git commit -m "feat(studio): suggest flight origin from imported track start"
```

---

## Task 9: End-to-end smoke + tag

**Files:**
- No code changes; verification + tag.

- [ ] **Step 1: Run the full suite**

```bash
npx vitest run
```

Expected: all Phase 1 tests + all Phase 2 tests green. Total new tests added in Phase 2: ~13 (persistence 3 + hydrate 1 + airports 3 + nearestAirport 2 + emitters 3 + flightEngine 2 = 14, minus 1 overlap if any).

- [ ] **Step 2: Manual E2E**

`npm run dev` → `/studio` route → still works (no regressions). Then:

1. Compose a 3-click track in Studio, export GPX, save to disk.
2. Switch to TripPlanner.
3. Open the GPX panel and import the same file you just exported.
4. Verify:
   - GpxImportDialog v2 shows the track name, point count, waypoint list.
   - APPEND adds a leg; RouteMap shows pin at the track end.
   - FlightScout banner appears with nearest airport.
   - Refresh the page — track persists in IDB; leg persists in localStorage.

- [ ] **Step 3: Tag**

```bash
git tag studio-phase-2
```

- [ ] **Step 4: Log to holyflex per CLAUDE.md mandate**

Append a `## [HH:MM] VP — GPX Studio Phase 2 SHIPPED` entry to `C:\Users\lasse\Desktop\holyflex\logs\YYYY-MM-DD.md` with the same structure as the Phase 1 entry: files changed, tests delta, Apple differentiation, cross-tool/cross-app, honest scope limits.

---

## Out of Scope (Phase 3+)

- Track ↔ PackingManifest climate hints (Phase 3)
- Track ↔ LedgerWorkbench cost rollup (Phase 3)
- Track ↔ TacticalMode offline cache (Phase 3)
- Track ↔ VentureVault publish-as-Pro-Path (Phase 4)
- Discovery POIs → track waypoint drag (Phase 4)
- Multi-track import (today: import takes `tracks[0]` only; warn the user if `tracks.length > 1`)
- True drag-vertex segment splicing in Studio (Phase 4)
- Removing v1 GPX I/O modules (Phase 4)

---

## Risks & open questions

- **IDB quota**: a single 10k-point track is ~1MB serialized. Browsers allow ≥50MB. Quota errors silently fail in v2; Phase 3 will surface them.
- **fake-indexeddb test perf**: each save/load opens a fresh DB in jsdom — could slow the test suite. If `npx vitest run` jumps > 60s wall-time, consider mocking the persistence module in tests that don't need it.
- **Airport dataset freshness**: airports change rarely; refresh annually. Document the source URL + filter script in a comment at the top of `airports.iata.json` (a JSON file can't have comments — put a `_meta` key as the first entry, or commit `scripts/build-airports.mjs` for reproducibility).
- **FlightScout's existing internal state**: I haven't verified whether FlightScout already manages an `origin` field. Task 8 Step 3 may need adaptation. Read the file before editing.
