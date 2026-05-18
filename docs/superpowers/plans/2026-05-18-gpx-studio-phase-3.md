# GPX Studio — Phase 3 Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** Connect imported/composed GPX tracks into three VP cross-tool surfaces: PackingManifest (climate hints from elevation), LedgerWorkbench (cost entries from distance × profile rate), TacticalMode (offline track cache + SOS last-point token). No editor changes — Studio surface stays frozen.

**Repo root:** `C:\Users\lasse\Desktop\venturepath`
**Phase 1 plan:** `docs/superpowers/plans/2026-05-13-gpx-studio-phase-1.md`
**Phase 2 plan:** `docs/superpowers/plans/2026-05-13-gpx-studio-phase-2.md`
**Tests at start:** 681 passing

---

## Architecture

All three wires follow the same pattern:
1. A new emitter function in `src/services/trackEmitters.js` — pure, no side effects, easily testable.
2. A new reducer action in `useTripStore.jsx` (or existing context for Ledger).
3. Triggered from `GpxPanel.jsx`'s `handleConfirm` (already the dispatch point for imports).
4. Minimal UI display in the target component — enough to satisfy Apple Rule 2 (≥2 interactive elements) and show real data.

### Wire A — Climate → PackingManifest
- `deriveClimateFromTrack(track)` → `{ climateBand, maxAltM, expectedLowTempC }`
- Lapse rate: −6.5°C / 1000m from base 15°C. Map to VP climate bands: `< −10°C → arctic`, `< 5°C → alpine` (new band), `< 15°C → temperate`, `≥ 25°C → tropical`, otherwise `desert` if dry indicator.
- New reducer action `UPDATE_MANIFEST_SETTINGS` that merges into `state.manifestSettings`.
- `PackingHudScreen` already accepts `climate` prop — it flows from `useTripStore().manifestSettings.climate`.

### Wire B — Cost → LedgerWorkbench
- `buildCostEntryForTrack(track)` → a nomination-pool item shaped for `nominate()`.
- Cost rates from `src/data/costRates.js` (new file): `{ foot: 0, cycling: 0.05, mtb: 0.08, car: 0.18, boat: 0.35, flight: 0.12 }` ($/km).
- Result: `{ id, name: "Route cost · {track.name}", type: "Transport", thumb: null, amount, currency: 'USD', votes: {}, status: 'nominated', source: 'gpx-import' }`.
- Dispatched via `nominate()` from ExpeditionContext — no new reducer action needed.

### Wire C — Tactical cache
- `cacheTrackForTactical(track)` → writes `{ id, name, points }` to IndexedDB store `vp-offline-tracks` (separate from the existing `vp-studio/tracks` store).
- `TacticalMode.jsx` reads the cache on mount and shows a "Cached Routes" section with track names + point count.
- SOS text gets a `TRACK_LAST_POINT` token: last cached track's final point coords.

---

## File Map

**Create**
- `src/data/costRates.js` — profile → $/km rate table
- `src/store/tacticalTrackCache.js` — IDB read/write for `vp-offline-tracks`
- Tests for all new emitter functions + tacticalTrackCache

**Modify**
- `src/services/trackEmitters.js` — add `deriveClimateFromTrack`, `buildCostEntryForTrack`, `cacheTrackForTactical`
- `src/store/useTripStore.jsx` — add `UPDATE_MANIFEST_SETTINGS` reducer case
- `src/components/itinerary/GpxPanel.jsx` — call all three emitters in `handleConfirm`
- `src/components/ui/TacticalMode.jsx` — read cached routes, show list, add TRACK_LAST_POINT to SOS text

**Do NOT touch**
- `src/components/studio/` (Phase 1 surface frozen)
- `src/store/tracksPersistence.js` (Phase 2 IDB — different store)
- The tracks reducer or Phase 1/2 actions

---

## Task 1: costRates.js + deriveClimateFromTrack + buildCostEntryForTrack (TDD)

### Step 1: Create cost rates data
Create `src/data/costRates.js`:
```js
export const COST_RATES_USD_PER_KM = {
  foot:    0,
  cycling: 0.05,
  mtb:     0.08,
  car:     0.18,
  boat:    0.35,
  flight:  0.12,
};
```

### Step 2: Write test
Create `src/__tests__/services/trackEmitters.phase3.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { deriveClimateFromTrack, buildCostEntryForTrack } from '../../services/trackEmitters.js';

const highAltTrack = {
  id: 'ht1', name: 'Himalaya Trek', profile: 'foot',
  points: [{ lat: 27.9, lng: 86.9, ele: 3400 }, { lat: 27.95, lng: 86.95, ele: 5200 }],
  stats: { distanceKm: 12, maxEleM: 5200, minEleM: 3400 },
};

const lowlandTrack = {
  id: 'lt1', name: 'City Cycle', profile: 'cycling',
  points: [{ lat: 52.5, lng: 13.4, ele: 50 }, { lat: 52.51, lng: 13.41, ele: 60 }],
  stats: { distanceKm: 8, maxEleM: 60, minEleM: 50 },
};

describe('deriveClimateFromTrack', () => {
  it('returns arctic for very high altitude', () => {
    const r = deriveClimateFromTrack(highAltTrack);
    expect(r.climateBand).toBe('arctic');
    expect(r.maxAltM).toBe(5200);
    expect(r.expectedLowTempC).toBeLessThan(-10);
  });

  it('returns temperate for low elevation city track', () => {
    const r = deriveClimateFromTrack(lowlandTrack);
    expect(r.climateBand).toBe('temperate');
    expect(r.expectedLowTempC).toBeGreaterThan(5);
  });

  it('returns null for empty track', () => {
    expect(deriveClimateFromTrack({ points: [], stats: {} })).toBeNull();
  });
});

describe('buildCostEntryForTrack', () => {
  it('returns null for foot profile (zero cost)', () => {
    expect(buildCostEntryForTrack(highAltTrack)).toBeNull();
  });

  it('builds a nomination entry for cycling', () => {
    const entry = buildCostEntryForTrack(lowlandTrack);
    expect(entry).not.toBeNull();
    expect(entry.name).toContain('City Cycle');
    expect(entry.amount).toBeCloseTo(8 * 0.05, 2);
    expect(entry.type).toBe('Transport');
    expect(entry.votes).toEqual({});
    expect(entry.status).toBe('nominated');
  });
});
```

### Step 3: Implement in trackEmitters.js
Append to `src/services/trackEmitters.js`:
```js
import { COST_RATES_USD_PER_KM } from '../data/costRates.js';

const LAPSE_RATE = 6.5; // °C per 1000m
const BASE_TEMP_C = 15; // sea level reference

function tempAtAlt(altM) {
  return BASE_TEMP_C - (altM / 1000) * LAPSE_RATE;
}

export function deriveClimateFromTrack(track) {
  if (!track?.points || track.points.length === 0) return null;
  const maxAltM = track.stats?.maxEleM ?? Math.max(...track.points.map(p => p.ele ?? 0));
  const expectedLowTempC = Math.round(tempAtAlt(maxAltM) * 10) / 10;
  let climateBand;
  if (expectedLowTempC < -10) climateBand = 'arctic';
  else if (expectedLowTempC < 5) climateBand = 'alpine';
  else if (expectedLowTempC < 15) climateBand = 'temperate';
  else if (expectedLowTempC < 25) climateBand = 'temperate';
  else climateBand = 'tropical';
  return { climateBand, maxAltM, expectedLowTempC };
}

export function buildCostEntryForTrack(track) {
  if (!track?.points || track.points.length === 0) return null;
  const rate = COST_RATES_USD_PER_KM[track.profile] ?? 0;
  if (rate === 0) return null;
  const distKm = track.stats?.distanceKm ?? 0;
  const amount = Math.round(distKm * rate * 100) / 100;
  return {
    id: `gpx-cost-${track.id}`,
    name: `Route cost · ${track.name}`,
    type: 'Transport',
    thumb: null,
    amount,
    currency: 'USD',
    votes: {},
    status: 'nominated',
    source: 'gpx-import',
  };
}
```

### Step 4: Run + commit
```
npx vitest run trackEmitters.phase3 --reporter=verbose
git add src/data/costRates.js src/services/trackEmitters.js src/__tests__/services/trackEmitters.phase3.test.js
git commit -m "feat(studio): track emitters phase 3 — climate derive + cost entry"
```

---

## Task 2: UPDATE_MANIFEST_SETTINGS + GpxPanel climate wire

### Step 1: Add reducer action
In `src/store/useTripStore.jsx`, add after the `REPLACE_LEGS` case:
```js
case 'UPDATE_MANIFEST_SETTINGS':
  return { ...state, manifestSettings: { ...state.manifestSettings, ...action.payload } };
```

Export the constant (or just use the string inline in GpxPanel).

### Step 2: Wire in GpxPanel.jsx
In `handleConfirm`, after the existing ADD_TRACK + ADD_LEG dispatches, add:
```js
import { deriveClimateFromTrack } from '../../services/trackEmitters.js';
// inside handleConfirm:
const climate = deriveClimateFromTrack(pendingTrack);
if (climate) {
  dispatch({ type: 'UPDATE_MANIFEST_SETTINGS', payload: { climate: climate.climateBand } });
}
```

### Step 3: Test
No new unit test needed (reducer action is trivial; deriveClimateFromTrack is already tested). Run full suite to confirm no regressions.

### Step 4: Commit
```
git add src/store/useTripStore.jsx src/components/itinerary/GpxPanel.jsx
git commit -m "feat(studio): GPX import auto-updates PackingManifest climate band"
```

---

## Task 3: Ledger cost wire

### Step 1: Wire in GpxPanel.jsx
```js
import { buildCostEntryForTrack } from '../../services/trackEmitters.js';
import { useExpedition } from '../../context/ExpeditionContext.jsx';
// in component body:
const { nominate } = useExpedition();
// inside handleConfirm:
const costEntry = buildCostEntryForTrack(pendingTrack);
if (costEntry) nominate(costEntry);
```

### Step 2: Commit
```
git add src/components/itinerary/GpxPanel.jsx
git commit -m "feat(studio): GPX import nominates route cost entry in LedgerWorkbench"
```

---

## Task 4: tacticalTrackCache.js + TacticalMode cached routes (TDD)

### Step 1: Write test
Create `src/__tests__/store/tacticalTrackCache.test.js`:
```js
import { describe, it, expect, beforeEach } from 'vitest';
import { cacheTacticalTrack, loadTacticalTracks, clearTacticalTracks } from '../../store/tacticalTrackCache.js';

beforeEach(async () => { await clearTacticalTracks(); });

describe('tacticalTrackCache', () => {
  it('stores and retrieves a track', async () => {
    await cacheTacticalTrack({ id: 't1', name: 'Ridge Run', points: [{ lat: 47, lng: 11, ele: 1200 }] });
    const tracks = await loadTacticalTracks();
    expect(tracks).toHaveLength(1);
    expect(tracks[0].name).toBe('Ridge Run');
  });

  it('accumulates multiple tracks (does not overwrite)', async () => {
    await cacheTacticalTrack({ id: 'a', name: 'A', points: [] });
    await cacheTacticalTrack({ id: 'b', name: 'B', points: [] });
    const tracks = await loadTacticalTracks();
    expect(tracks).toHaveLength(2);
  });

  it('returns [] when nothing cached', async () => {
    expect(await loadTacticalTracks()).toEqual([]);
  });
});
```

### Step 2: Implement tacticalTrackCache.js
Create `src/store/tacticalTrackCache.js`:
```js
const DB_NAME = 'vp-tactical';
const DB_VERSION = 1;
const STORE = 'cached-tracks';

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function cacheTacticalTrack(track) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, 'readwrite');
    t.objectStore(STORE).put({ id: track.id, name: track.name, points: track.points, cachedAt: new Date().toISOString() });
    t.oncomplete = resolve;
    t.onerror = () => reject(t.error);
  });
}

export async function loadTacticalTracks() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result ?? []);
    req.onerror = () => reject(req.error);
  });
}

export async function clearTacticalTracks() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, 'readwrite');
    t.objectStore(STORE).clear();
    t.oncomplete = resolve;
    t.onerror = () => reject(t.error);
  });
}
```

### Step 3: Add cacheTrackForTactical emitter
In `src/services/trackEmitters.js`, append:
```js
export async function cacheTrackForTactical(track) {
  if (!track?.points || track.points.length === 0) return;
  const { cacheTacticalTrack } = await import('../store/tacticalTrackCache.js');
  await cacheTacticalTrack(track);
}
```

### Step 4: Wire in GpxPanel.jsx
```js
import { cacheTrackForTactical } from '../../services/trackEmitters.js';
// inside handleConfirm (fire-and-forget, no await needed):
cacheTrackForTactical(pendingTrack);
```

### Step 5: Update TacticalMode.jsx
Read TacticalMode.jsx. Add a `cachedTracks` state loaded from IDB on mount:
```js
import { loadTacticalTracks } from '../../store/tacticalTrackCache.js';
// in component body:
const [cachedTracks, setCachedTracks] = useState([]);
useEffect(() => {
  loadTacticalTracks().then(setCachedTracks).catch(() => {});
}, []);
```

Add a "Cached Routes" section to the TacticalMode UI, rendered with the same Tactical Amber (#F2A900) on near-black palette. Show each track as `name (N pts)`. Empty state: "No routes cached — import a GPX in TripPlanner."

Enhance SOS text: if `cachedTracks.length > 0`, add a line:
```js
`Track last point: ${(() => { const last = cachedTracks[cachedTracks.length - 1]; const p = last?.points?.[last.points.length - 1]; return p ? `${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}` : 'unknown'; })()}`
```

### Step 6: Run + commit
```
npx vitest run tacticalTrackCache --reporter=verbose
git add src/store/tacticalTrackCache.js src/__tests__/store/tacticalTrackCache.test.js src/services/trackEmitters.js src/components/ui/TacticalMode.jsx src/components/itinerary/GpxPanel.jsx src/store/useTripStore.jsx
git commit -m "feat(studio): tactical track cache + SOS last-point token + cached routes panel"
```

---

## Task 5: E2E smoke + tag + log

### Step 1: Full test suite
```
npx vitest run
```
Expected: 681 + ~8 new = ~689 passing. All Phase 1+2+3 tests green.

### Step 2: Tag
```
git tag studio-phase-3
```

### Step 3: Log to holyflex
Append to `C:\Users\lasse\Desktop\holyflex\logs\YYYY-MM-DD.md` with Phase 3 completion entry.

---

## Out of Scope (Phase 4)
- Track → VentureVault publish-as-Pro-Path
- Discovery POIs → track waypoint drag
- Multi-track import
- Removing v1 GPX I/O modules
- True drag-vertex segment splicing
