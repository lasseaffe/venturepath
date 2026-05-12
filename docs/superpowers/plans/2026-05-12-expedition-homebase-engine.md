# Expedition Homebase Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Homebase Engine — accommodation anchors day-loops, adding a stop cascades to all 8 planning tools simultaneously, with Manual/Semi-Auto/Full Auto planning modes.

**Architecture:** `DayLoop` becomes a first-class entity in `useTripStore` (React Context + useReducer). A new `homebaseEngine.js` utility builds legs from the homebase to ordered stops and emits `HOMEBASE_STOP_ADDED` on `sentinelBus`, which fans out to 8 cascade listeners using a compute/apply pattern. The `CalendarStrip` above the map filters the left panel and map to a single day's loop.

**Tech Stack:** React 19, Vitest + jsdom + @testing-library/jest-dom, sentinelBus (existing Map-based event emitter), Tailwind CSS vars (`var(--accent)`, `var(--bg)`, etc.), Foursquare Places v3 API, Leaflet via react-leaflet.

**Spec:** `docs/superpowers/specs/2026-05-12-expedition-homebase-engine-design.md`

---

## File Map

**Create:**
- `src/utils/homebaseEngine.js` — buildLegs(), cascade listener registrations, onStopAdded()
- `src/utils/__tests__/homebaseEngine.test.js`
- `src/components/layout/CalendarStrip.jsx`
- `src/components/layout/__tests__/CalendarStrip.test.jsx`
- `src/components/itinerary/DayLoopPanel.jsx`
- `src/components/itinerary/__tests__/DayLoopPanel.test.jsx`
- `src/components/itinerary/CascadeConfirmSheet.jsx`
- `src/components/itinerary/__tests__/CascadeConfirmSheet.test.jsx`
- `src/components/itinerary/AddStopFlow.jsx`
- `src/components/itinerary/__tests__/AddStopFlow.test.jsx`

**Modify:**
- `src/utils/sentinelBusEvents.js` — add `HOMEBASE_STOP_ADDED`
- `src/store/useTripStore.jsx` — DayLoop entity, planningMode, Stay/Leg fields, new reducer cases
- `src/pages/TripPlanner.jsx` — mount CalendarStrip, DayLoopPanel, mode switcher
- `src/components/itinerary/RouteMap.jsx` (or equivalent map component) — day-loop route, distance ring, fly-to

---

## Task 1: Add HOMEBASE_STOP_ADDED to sentinelBusEvents

**Files:**
- Modify: `src/utils/sentinelBusEvents.js`
- Modify: `src/utils/__tests__/homebaseEngine.test.js` (create)

- [ ] **Step 1: Add the event constant**

Open `src/utils/sentinelBusEvents.js` and append:

```js
export const HOMEBASE_STOP_ADDED = 'HOMEBASE_STOP_ADDED';
```

- [ ] **Step 2: Commit**

```bash
git add src/utils/sentinelBusEvents.js
git commit -m "feat(homebase): add HOMEBASE_STOP_ADDED bus event"
```

---

## Task 2: Extend useTripStore with DayLoop entity

**Files:**
- Modify: `src/store/useTripStore.jsx`

- [ ] **Step 1: Write the failing test**

Create `src/store/__tests__/useTripStore.dayloop.test.jsx`:

```jsx
import { renderHook, act } from '@testing-library/react';
import { TripStoreProvider, useTripStore } from '../useTripStore';

const wrapper = ({ children }) => <TripStoreProvider>{children}</TripStoreProvider>;

describe('DayLoop store actions', () => {
  it('addDayLoop creates a day loop with correct shape', () => {
    const { result } = renderHook(() => useTripStore(), { wrapper });
    act(() => {
      result.current.addDayLoop({
        date: '2026-05-16',
        homebaseStayId: 'stay-1',
        planningMode: 'semi',
      });
    });
    expect(result.current.dayLoops).toHaveLength(1);
    const loop = result.current.dayLoops[0];
    expect(loop.date).toBe('2026-05-16');
    expect(loop.homebaseStayId).toBe('stay-1');
    expect(loop.stopIds).toEqual([]);
    expect(loop.autoLegIds).toEqual([]);
    expect(loop.id).toBeTruthy();
  });

  it('addStopToDayLoop appends stopId in order', () => {
    const { result } = renderHook(() => useTripStore(), { wrapper });
    act(() => {
      result.current.addDayLoop({ date: '2026-05-16', homebaseStayId: 'stay-1' });
    });
    const loopId = result.current.dayLoops[0].id;
    act(() => {
      result.current.addStopToDayLoop(loopId, { id: 'poi-1', name: 'Kunsthalle', coords: [53.56, 9.99], category: 'museum' });
    });
    expect(result.current.dayLoops[0].stopIds).toEqual(['poi-1']);
    expect(result.current.pois.find(p => p.id === 'poi-1')).toBeTruthy();
  });

  it('setAutoLegs replaces only homebase-engine legs for that dayLoop', () => {
    const { result } = renderHook(() => useTripStore(), { wrapper });
    act(() => {
      result.current.addDayLoop({ date: '2026-05-16', homebaseStayId: 'stay-1' });
    });
    const loopId = result.current.dayLoops[0].id;
    const newLegs = [
      { id: 'leg-a1', from: 'Hotel', to: 'Museum', mode: 'foot', source: 'homebase-engine', dayLoopId: loopId },
    ];
    act(() => {
      result.current.setAutoLegs(loopId, newLegs);
    });
    expect(result.current.dayLoops[0].autoLegIds).toEqual(['leg-a1']);
    expect(result.current.legs.find(l => l.id === 'leg-a1')).toBeTruthy();
  });

  it('trip.planningMode defaults to semi', () => {
    const { result } = renderHook(() => useTripStore(), { wrapper });
    expect(result.current.trip.planningMode).toBe('semi');
  });

  it('setTripPlanningMode updates trip.planningMode', () => {
    const { result } = renderHook(() => useTripStore(), { wrapper });
    act(() => { result.current.setTripPlanningMode('full'); });
    expect(result.current.trip.planningMode).toBe('full');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/store/__tests__/useTripStore.dayloop.test.jsx
```

Expected: FAIL — `addDayLoop is not a function`

- [ ] **Step 3: Extend initialState**

In `src/store/useTripStore.jsx`, update `DEFAULT_TRIP` and `initialState`:

```js
const DEFAULT_TRIP = {
  name: 'Operation Patagonia',
  destination: 'Torres del Paine, Chile',
  startDate: '2026-11-10',
  endDate: '2026-11-28',
  days: 18,
  climate: 'temperate',
  status: 'PLANNING',
  planningMode: 'semi',   // ADD THIS
};

const initialState = {
  trip: DEFAULT_TRIP,
  legs: DEFAULT_LEGS,
  objectives: DEFAULT_OBJECTIVES,
  manifestSettings: DEFAULT_MANIFEST_SETTINGS,
  userRole: 'LEADER',
  cloning: false,
  stays: [],
  pois: [],
  alerts: [],
  budget: { total: 0, items: [] },
  dayLoops: [],            // ADD THIS
};
```

- [ ] **Step 4: Add DayLoop reducer cases**

Inside the `reducer` function, add before `default:`:

```js
case 'ADD_DAY_LOOP': {
  const loop = {
    stopIds: [],
    autoLegIds: [],
    label: null,
    planningMode: state.trip.planningMode,
    ...action.payload,
    id: action.payload.id ?? crypto.randomUUID(),
  };
  return { ...state, dayLoops: [...state.dayLoops, loop] };
}

case 'ADD_STOP_TO_DAY_LOOP': {
  const { dayLoopId, stop } = action.payload;
  const poi = { ...stop, id: stop.id ?? crypto.randomUUID() };
  const dayLoops = state.dayLoops.map(dl =>
    dl.id === dayLoopId
      ? { ...dl, stopIds: [...dl.stopIds, poi.id] }
      : dl
  );
  const pois = state.pois.find(p => p.id === poi.id)
    ? state.pois
    : [...state.pois, poi];
  return { ...state, dayLoops, pois };
}

case 'REMOVE_STOP_FROM_DAY_LOOP': {
  const { dayLoopId, stopId } = action.payload;
  const dayLoops = state.dayLoops.map(dl =>
    dl.id === dayLoopId
      ? { ...dl, stopIds: dl.stopIds.filter(id => id !== stopId) }
      : dl
  );
  return { ...state, dayLoops };
}

case 'SET_AUTO_LEGS': {
  const { dayLoopId, legs } = action.payload;
  // Remove old homebase-engine legs for this dayLoop, add new ones
  const oldAutoIds = state.dayLoops.find(dl => dl.id === dayLoopId)?.autoLegIds ?? [];
  const filteredLegs = state.legs.filter(l => !oldAutoIds.includes(l.id));
  const newLegs = [...filteredLegs, ...legs];
  const dayLoops = state.dayLoops.map(dl =>
    dl.id === dayLoopId
      ? { ...dl, autoLegIds: legs.map(l => l.id) }
      : dl
  );
  return { ...state, legs: newLegs, dayLoops };
}

case 'SET_DAY_LOOP_MODE': {
  const { dayLoopId, mode } = action.payload;
  const dayLoops = state.dayLoops.map(dl =>
    dl.id === dayLoopId ? { ...dl, planningMode: mode } : dl
  );
  return { ...state, dayLoops };
}

case 'REMOVE_DAY_LOOP': {
  const loop = state.dayLoops.find(dl => dl.id === action.payload);
  const autoIds = loop?.autoLegIds ?? [];
  return {
    ...state,
    dayLoops: state.dayLoops.filter(dl => dl.id !== action.payload),
    legs: state.legs.filter(l => !autoIds.includes(l.id)),
  };
}

case 'SET_TRIP_PLANNING_MODE':
  return { ...state, trip: { ...state.trip, planningMode: action.payload } };
```

- [ ] **Step 5: Add dispatcher functions**

In `TripStoreProvider`, add after `addBudgetItem`:

```js
const addDayLoop = (data) => dispatch({ type: 'ADD_DAY_LOOP', payload: data });
const addStopToDayLoop = (dayLoopId, stop) =>
  dispatch({ type: 'ADD_STOP_TO_DAY_LOOP', payload: { dayLoopId, stop } });
const removeStopFromDayLoop = (dayLoopId, stopId) =>
  dispatch({ type: 'REMOVE_STOP_FROM_DAY_LOOP', payload: { dayLoopId, stopId } });
const setAutoLegs = (dayLoopId, legs) =>
  dispatch({ type: 'SET_AUTO_LEGS', payload: { dayLoopId, legs } });
const setDayLoopMode = (dayLoopId, mode) =>
  dispatch({ type: 'SET_DAY_LOOP_MODE', payload: { dayLoopId, mode } });
const removeDayLoop = (id) => dispatch({ type: 'REMOVE_DAY_LOOP', payload: id });
const setTripPlanningMode = (mode) =>
  dispatch({ type: 'SET_TRIP_PLANNING_MODE', payload: mode });
```

Update the Provider `value` prop to include all new functions and `dayLoops` from state:

```jsx
<TripStoreContext.Provider value={{
  ...state,
  clonePath, createTrip, updateTrip, addLeg, updateLeg, removeLeg, resetTrip,
  setRole, updateLegStatus, loadExpedition, replaceLegs, addStay, removeStay,
  addPoi, removePoi, addAlert, clearAlerts, addBudgetItem,
  addDayLoop, addStopToDayLoop, removeStopFromDayLoop, setAutoLegs,
  setDayLoopMode, removeDayLoop, setTripPlanningMode,
}}>
```

- [ ] **Step 6: Add dayLoops to localStorage persistence**

In the `useEffect` that calls `localStorage.setItem`, add `dayLoops` to the persisted object:

```js
localStorage.setItem(STORAGE_KEY, JSON.stringify({
  trip: state.trip,
  legs: state.legs,
  objectives: state.objectives,
  manifestSettings: state.manifestSettings,
  userRole: state.userRole,
  stays: state.stays,
  pois: state.pois,
  alerts: state.alerts,
  budget: state.budget,
  dayLoops: state.dayLoops,   // ADD THIS
}));
```

Also update `loadState`'s `LOAD_EXPEDITION` case to restore `dayLoops`:

```js
case 'LOAD_EXPEDITION': {
  // existing code...
  return {
    ...initialState,
    trip: e.trip ?? initialState.trip,
    legs: e.legs ?? [],
    objectives: e.objectives ?? [],
    manifestSettings: e.manifestSettings ?? initialState.manifestSettings,
    stays: e.stays ?? initialState.stays,
    pois: e.pois ?? initialState.pois,
    alerts: e.alerts ?? initialState.alerts,
    budget: e.budget ?? initialState.budget,
    dayLoops: e.dayLoops ?? [],   // ADD THIS
  };
}
```

- [ ] **Step 7: Run test to verify it passes**

```bash
npx vitest run src/store/__tests__/useTripStore.dayloop.test.jsx
```

Expected: all 5 tests PASS

- [ ] **Step 8: Commit**

```bash
git add src/store/useTripStore.jsx src/store/__tests__/useTripStore.dayloop.test.jsx
git commit -m "feat(homebase): DayLoop entity + planningMode in useTripStore"
```

---

## Task 3: HomebaseEngine.buildLegs() — pure function

**Files:**
- Create: `src/utils/homebaseEngine.js`
- Create: `src/utils/__tests__/homebaseEngine.test.js`

- [ ] **Step 1: Write the failing test**

```js
// src/utils/__tests__/homebaseEngine.test.js
import { buildLegs } from '../homebaseEngine';

const homebaseCoords = [53.5488, 9.9872]; // Hamburg Speicherstadt

const stops = [
  { id: 'poi-1', name: 'Kunsthalle', coords: [53.5607, 10.0006], category: 'museum' },
  { id: 'poi-2', name: 'Speicherstadt', coords: [53.5435, 9.9995], category: 'district' },
];

describe('buildLegs', () => {
  it('produces outbound legs from homebase through each stop', () => {
    const legs = buildLegs('loop-1', homebaseCoords, stops);
    // homebase → poi-1 → poi-2 → homebase = 3 legs
    expect(legs).toHaveLength(3);
    expect(legs[0].from).toBe('homebase');
    expect(legs[0].toId).toBe('poi-1');
    expect(legs[1].from).toBe('poi-1');
    expect(legs[1].toId).toBe('poi-2');
    expect(legs[2].from).toBe('poi-2');
    expect(legs[2].toId).toBe('homebase');
  });

  it('all produced legs have source homebase-engine', () => {
    const legs = buildLegs('loop-1', homebaseCoords, stops);
    expect(legs.every(l => l.source === 'homebase-engine')).toBe(true);
  });

  it('all produced legs have dayLoopId', () => {
    const legs = buildLegs('loop-1', homebaseCoords, stops);
    expect(legs.every(l => l.dayLoopId === 'loop-1')).toBe(true);
  });

  it('returns empty array when no stops', () => {
    expect(buildLegs('loop-1', homebaseCoords, [])).toEqual([]);
  });

  it('calculates non-zero distanceKm between Hamburg coords', () => {
    const legs = buildLegs('loop-1', homebaseCoords, stops);
    expect(legs[0].distanceKm).toBeGreaterThan(0);
  });

  it('each leg has a unique id', () => {
    const legs = buildLegs('loop-1', homebaseCoords, stops);
    const ids = legs.map(l => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/utils/__tests__/homebaseEngine.test.js
```

Expected: FAIL — `Cannot find module '../homebaseEngine'`

- [ ] **Step 3: Implement buildLegs()**

Create `src/utils/homebaseEngine.js`:

```js
import sentinelBus from './sentinelBus.js';
import { HOMEBASE_STOP_ADDED } from './sentinelBusEvents.js';

// ── Haversine distance (km) ───────────────────────────────────────────────────
function haversineKm([lat1, lng1], [lat2, lng2]) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── buildLegs ─────────────────────────────────────────────────────────────────
// Pure function — no store access, no side effects.
// Returns array of legs: homebase → stop[0] → ... → stop[n] → homebase.
// All legs tagged source:'homebase-engine' so the engine can safely rebuild them.
export function buildLegs(dayLoopId, homebaseCoords, stops) {
  if (!stops.length) return [];

  const points = [
    { id: 'homebase', name: 'Homebase', coords: homebaseCoords },
    ...stops,
    { id: 'homebase', name: 'Homebase', coords: homebaseCoords },
  ];

  return points.slice(0, -1).map((from, i) => {
    const to = points[i + 1];
    return {
      id: crypto.randomUUID(),
      dayLoopId,
      source: 'homebase-engine',
      from: from.id,
      fromName: from.name,
      toId: to.id,
      toName: to.name,
      mode: 'foot',
      status: 'pending',
      distanceKm: parseFloat(haversineKm(from.coords, to.coords).toFixed(2)),
      durationH: parseFloat((haversineKm(from.coords, to.coords) / 5).toFixed(2)), // ~5 km/h walk
    };
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/utils/__tests__/homebaseEngine.test.js
```

Expected: all 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/homebaseEngine.js src/utils/__tests__/homebaseEngine.test.js
git commit -m "feat(homebase): HomebaseEngine.buildLegs() pure function"
```

---

## Task 4: Cascade listener architecture — compute/apply pattern

**Files:**
- Modify: `src/utils/homebaseEngine.js`
- Modify: `src/utils/__tests__/homebaseEngine.test.js`

- [ ] **Step 1: Write failing tests for cascade listeners**

Append to `src/utils/__tests__/homebaseEngine.test.js`:

```js
import { buildCascadePreviews } from '../homebaseEngine';

const mockPayload = {
  dayLoopId: 'loop-1',
  dayLoop: { id: 'loop-1', date: '2026-05-16', homebaseStayId: 'stay-1', stopIds: ['poi-1'] },
  stop: { id: 'poi-1', name: 'Kunsthalle', coords: [53.5607, 10.0006], category: 'museum' },
  legs: [
    { id: 'leg-1', distanceKm: 1.4, mode: 'foot', source: 'homebase-engine' },
    { id: 'leg-2', distanceKm: 1.4, mode: 'foot', source: 'homebase-engine' },
  ],
  homebaseCoords: [53.5488, 9.9872],
  totalDistanceKm: 2.8,
  tripClimate: 'temperate',
};

describe('buildCascadePreviews', () => {
  it('returns a preview object for each of the 8 tools', () => {
    const previews = buildCascadePreviews(mockPayload);
    const keys = ['budget', 'packing', 'map', 'elevation', 'transit', 'tactical', 'squad', 'ledger'];
    keys.forEach(k => {
      expect(previews[k]).toBeDefined();
      expect(typeof previews[k].label).toBe('string');
      expect(typeof previews[k].value).toBe('string');
      expect(typeof previews[k].apply).toBe('function');
    });
  });

  it('budget preview includes a positive cost estimate', () => {
    const previews = buildCascadePreviews(mockPayload);
    expect(previews.budget.value).toMatch(/€/);
  });

  it('packing preview includes item suggestions for museum category', () => {
    const previews = buildCascadePreviews(mockPayload);
    expect(previews.packing.value).toMatch(/item/);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
npx vitest run src/utils/__tests__/homebaseEngine.test.js
```

Expected: FAIL — `buildCascadePreviews is not a function`

- [ ] **Step 3: Implement buildCascadePreviews()**

Append to `src/utils/homebaseEngine.js`:

```js
// ── Packing suggestions by POI category ──────────────────────────────────────
const PACKING_HINTS = {
  museum:    ['Comfortable shoes', 'Water bottle'],
  beach:     ['Sunscreen', 'Towel', 'Swimwear'],
  hiking:    ['Trail shoes', 'Rain jacket', 'Snacks'],
  park:      ['Sunscreen', 'Comfortable shoes'],
  restaurant:['Smart casual top'],
  bar:       ['Smart casual top'],
  district:  ['Comfortable shoes', 'Camera'],
  default:   ['Comfortable shoes'],
};

function packingHints(category) {
  return PACKING_HINTS[category] ?? PACKING_HINTS.default;
}

// Transit cost estimate: €0.30/km, min €1.50 per leg
function estimateCost(legs) {
  return legs.reduce((sum, l) => sum + Math.max(1.5, l.distanceKm * 0.3), 0);
}

// ── buildCascadePreviews ──────────────────────────────────────────────────────
// Returns { [toolKey]: { label, value, apply(dispatch) } }
// apply() is called when the Pioneer confirms (Semi) or immediately (Full).
export function buildCascadePreviews(payload) {
  const { dayLoopId, stop, legs, tripClimate } = payload;
  const cost = estimateCost(legs);
  const items = packingHints(stop.category ?? 'default');

  return {
    budget: {
      label: '💰 Budget',
      value: `+€${cost.toFixed(2)}`,
      apply: (dispatch) => dispatch({
        type: 'ADD_BUDGET_ITEM',
        payload: { label: `Transit · ${stop.name}`, amount: cost, currency: 'EUR', dayLoopId },
      }),
    },
    packing: {
      label: '🎒 Packing',
      value: `${items.length} item${items.length !== 1 ? 's' : ''} suggested`,
      apply: (dispatch) => {
        // PackingManifest listens to HOMEBASE_STOP_ADDED directly for suggestions
        // (it renders from the event, not the store — nothing to dispatch here)
      },
    },
    map: {
      label: '🗺️ Route',
      value: `${payload.totalDistanceKm.toFixed(1)} km loop`,
      apply: (_dispatch) => {
        // LiveMap re-renders reactively from store.dayLoops — no action needed
      },
    },
    elevation: {
      label: '⛰️ Elevation',
      value: 'Profile updating...',
      apply: (_dispatch) => {
        // ElevationStrip subscribes to HOMEBASE_STOP_ADDED and fetches independently
      },
    },
    transit: {
      label: '🚌 Transit',
      value: 'Fetching times...',
      apply: (_dispatch) => {
        // TransitPlanner subscribes to HOMEBASE_STOP_ADDED and fetches independently
      },
    },
    tactical: {
      label: '🛡️ Tactical',
      value: 'Caching area...',
      apply: (_dispatch) => {
        // TacticalCache prefetch fires via the bus listener (non-blocking)
      },
    },
    squad: {
      label: '👥 Squad',
      value: 'Notifying...',
      apply: (_dispatch) => {
        // SquadSync broadcasts via Supabase realtime (bus listener)
      },
    },
    ledger: {
      label: '⚖️ Ledger',
      value: 'Checking conflicts...',
      apply: (_dispatch) => {
        // LedgerWorkbench checks preferences (bus listener)
      },
    },
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/utils/__tests__/homebaseEngine.test.js
```

Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/homebaseEngine.js src/utils/__tests__/homebaseEngine.test.js
git commit -m "feat(homebase): cascade listener compute/apply architecture"
```

---

## Task 5: HomebaseEngine.onStopAdded() — main entry point

**Files:**
- Modify: `src/utils/homebaseEngine.js`
- Modify: `src/utils/__tests__/homebaseEngine.test.js`

- [ ] **Step 1: Write failing test**

Append to `src/utils/__tests__/homebaseEngine.test.js`:

```js
import { vi } from 'vitest';
import sentinelBus from '../sentinelBus.js';
import { HOMEBASE_STOP_ADDED } from '../sentinelBusEvents.js';
import { onStopAdded } from '../homebaseEngine';

describe('onStopAdded', () => {
  beforeEach(() => sentinelBus._reset());

  it('emits HOMEBASE_STOP_ADDED with correct payload', () => {
    const handler = vi.fn();
    sentinelBus.on(HOMEBASE_STOP_ADDED, handler);

    const dayLoop = { id: 'loop-1', homebaseStayId: 'stay-1', stopIds: ['poi-1'], planningMode: 'full' };
    const stop = { id: 'poi-1', name: 'Kunsthalle', coords: [53.56, 10.0], category: 'museum' };
    const homebaseCoords = [53.54, 9.98];
    const dispatch = vi.fn();

    onStopAdded({ dayLoop, stop, homebaseCoords, allStops: [stop], mode: 'full', dispatch });

    expect(handler).toHaveBeenCalledOnce();
    const payload = handler.mock.calls[0][0];
    expect(payload.dayLoopId).toBe('loop-1');
    expect(payload.stop.id).toBe('poi-1');
    expect(payload.legs).toBeDefined();
  });

  it('dispatches SET_AUTO_LEGS in full mode', () => {
    const dispatch = vi.fn();
    const dayLoop = { id: 'loop-1', homebaseStayId: 'stay-1', stopIds: ['poi-1'], planningMode: 'full' };
    const stop = { id: 'poi-1', name: 'Museum', coords: [53.56, 10.0], category: 'museum' };

    onStopAdded({ dayLoop, stop, homebaseCoords: [53.54, 9.98], allStops: [stop], mode: 'full', dispatch });

    const setAutoCall = dispatch.mock.calls.find(c => c[0].type === 'SET_AUTO_LEGS');
    expect(setAutoCall).toBeDefined();
  });

  it('does not dispatch SET_AUTO_LEGS in manual mode', () => {
    const dispatch = vi.fn();
    const dayLoop = { id: 'loop-1', homebaseStayId: 'stay-1', stopIds: [], planningMode: 'manual' };
    const stop = { id: 'poi-1', name: 'Museum', coords: [53.56, 10.0], category: 'museum' };

    onStopAdded({ dayLoop, stop, homebaseCoords: [53.54, 9.98], allStops: [stop], mode: 'manual', dispatch });

    const setAutoCall = dispatch.mock.calls.find(c => c[0].type === 'SET_AUTO_LEGS');
    expect(setAutoCall).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
npx vitest run src/utils/__tests__/homebaseEngine.test.js
```

Expected: FAIL — `onStopAdded is not a function`

- [ ] **Step 3: Implement onStopAdded()**

Append to `src/utils/homebaseEngine.js`:

```js
// ── onStopAdded ───────────────────────────────────────────────────────────────
// Called by AddStopFlow after addStopToDayLoop() has updated the store.
// { dayLoop, stop, homebaseCoords, allStops, mode, dispatch }
//   mode: effective planning mode (dayLoop.planningMode ?? trip.planningMode)
//   allStops: resolved POI objects for all stopIds in the dayLoop
//   dispatch: the store dispatch function
export function onStopAdded({ dayLoop, stop, homebaseCoords, allStops, mode, dispatch }) {
  const legs = buildLegs(dayLoop.id, homebaseCoords, allStops);
  const totalDistanceKm = legs.reduce((s, l) => s + l.distanceKm, 0);

  const payload = {
    dayLoopId: dayLoop.id,
    dayLoop,
    stop,
    legs,
    homebaseCoords,
    totalDistanceKm,
    mode,
  };

  if (mode === 'manual') {
    // Emit event so tools can observe, but do not build legs or cascade
    sentinelBus.emit(HOMEBASE_STOP_ADDED, { ...payload, legs: [] });
    return { previews: null, legs: [] };
  }

  // Build legs and commit them to the store in both semi and full modes
  dispatch({ type: 'SET_AUTO_LEGS', payload: { dayLoopId: dayLoop.id, legs } });

  sentinelBus.emit(HOMEBASE_STOP_ADDED, payload);

  const previews = buildCascadePreviews(payload);

  if (mode === 'full') {
    // Apply all cascades immediately
    Object.values(previews).forEach(p => p.apply(dispatch));
  }

  // In semi mode, return previews for CascadeConfirmSheet to render
  return { previews, legs };
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run src/utils/__tests__/homebaseEngine.test.js
```

Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/homebaseEngine.js src/utils/__tests__/homebaseEngine.test.js
git commit -m "feat(homebase): onStopAdded() entry point with mode-aware cascade"
```

---

## Task 6: CascadeConfirmSheet component

**Files:**
- Create: `src/components/itinerary/CascadeConfirmSheet.jsx`
- Create: `src/components/itinerary/__tests__/CascadeConfirmSheet.test.jsx`

- [ ] **Step 1: Write failing test**

```jsx
// src/components/itinerary/__tests__/CascadeConfirmSheet.test.jsx
import { render, screen, fireEvent } from '@testing-library/react';
import { CascadeConfirmSheet } from '../CascadeConfirmSheet';

const mockPreviews = {
  budget:    { label: '💰 Budget',   value: '+€3.80', apply: vi.fn() },
  packing:   { label: '🎒 Packing',  value: '2 items', apply: vi.fn() },
  map:       { label: '🗺️ Route',    value: '2.8 km',  apply: vi.fn() },
  elevation: { label: '⛰️ Elevation',value: 'Updating',apply: vi.fn() },
  transit:   { label: '🚌 Transit',  value: 'Fetching',apply: vi.fn() },
  tactical:  { label: '🛡️ Tactical', value: 'Caching', apply: vi.fn() },
  squad:     { label: '👥 Squad',    value: 'Notifying',apply: vi.fn() },
  ledger:    { label: '⚖️ Ledger',   value: 'Checking',apply: vi.fn() },
};

describe('CascadeConfirmSheet', () => {
  it('renders all 8 tool preview cards', () => {
    render(<CascadeConfirmSheet previews={mockPreviews} stopName="Kunsthalle" onApply={vi.fn()} onDiscard={vi.fn()} dispatch={vi.fn()} />);
    expect(screen.getByText('+€3.80')).toBeInTheDocument();
    expect(screen.getByText('2 items')).toBeInTheDocument();
    expect(screen.getByText('2.8 km')).toBeInTheDocument();
  });

  it('calls apply() for all previews and onApply() when Apply all clicked', () => {
    const onApply = vi.fn();
    const dispatch = vi.fn();
    render(<CascadeConfirmSheet previews={mockPreviews} stopName="Kunsthalle" onApply={onApply} onDiscard={vi.fn()} dispatch={dispatch} />);
    fireEvent.click(screen.getByText('Apply all changes'));
    Object.values(mockPreviews).forEach(p => expect(p.apply).toHaveBeenCalledWith(dispatch));
    expect(onApply).toHaveBeenCalledOnce();
  });

  it('calls onDiscard when Discard is clicked without calling apply', () => {
    const onDiscard = vi.fn();
    render(<CascadeConfirmSheet previews={mockPreviews} stopName="Kunsthalle" onApply={vi.fn()} onDiscard={onDiscard} dispatch={vi.fn()} />);
    fireEvent.click(screen.getByText('Discard'));
    expect(onDiscard).toHaveBeenCalledOnce();
    Object.values(mockPreviews).forEach(p => expect(p.apply).not.toHaveBeenCalled());
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
npx vitest run src/components/itinerary/__tests__/CascadeConfirmSheet.test.jsx
```

Expected: FAIL — `Cannot find module '../CascadeConfirmSheet'`

- [ ] **Step 3: Implement CascadeConfirmSheet**

```jsx
// src/components/itinerary/CascadeConfirmSheet.jsx
'use client';
import { useState } from 'react';

export function CascadeConfirmSheet({ previews, stopName, onApply, onDiscard, dispatch }) {
  const [selected, setSelected] = useState(() => new Set(Object.keys(previews)));

  function toggle(key) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function applyAll() {
    Object.entries(previews).forEach(([key, p]) => {
      if (selected.has(key)) p.apply(dispatch);
    });
    onApply();
  }

  return (
    <div style={{
      background: 'var(--surface-raised)',
      border: '1px solid rgba(230,126,34,0.3)',
      borderRadius: 2,
      padding: '12px 14px',
    }}>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--accent)', fontWeight: 700, marginBottom: 10 }}>
        ⚡ Semi-Auto Preview — &quot;{stopName}&quot; added
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, marginBottom: 10 }}>
        {Object.entries(previews).map(([key, p]) => (
          <button
            key={key}
            onClick={() => toggle(key)}
            style={{
              background: selected.has(key) ? 'rgba(230,126,34,0.08)' : 'var(--surface)',
              border: selected.has(key) ? '1px solid rgba(230,126,34,0.35)' : '1px solid rgba(242,237,232,0.07)',
              borderRadius: 2,
              padding: '7px 8px',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-secondary)' }}>{p.label}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-primary)', fontWeight: 700, marginTop: 2 }}>{p.value}</div>
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button
          onClick={applyAll}
          style={{ background: 'var(--accent)', color: '#0A0B0C', fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 700, padding: '5px 14px', borderRadius: 2, border: 'none', cursor: 'pointer' }}
        >
          Apply all changes
        </button>
        <button
          onClick={onDiscard}
          style={{ background: 'transparent', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '0.6rem', padding: '5px 10px', border: '1px solid rgba(242,237,232,0.12)', borderRadius: 2, cursor: 'pointer' }}
        >
          Discard
        </button>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.52rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
          or apply individually ↑
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run src/components/itinerary/__tests__/CascadeConfirmSheet.test.jsx
```

Expected: all 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/itinerary/CascadeConfirmSheet.jsx src/components/itinerary/__tests__/CascadeConfirmSheet.test.jsx
git commit -m "feat(homebase): CascadeConfirmSheet semi-auto preview component"
```

---

## Task 7: CalendarStrip component

**Files:**
- Create: `src/components/layout/CalendarStrip.jsx`
- Create: `src/components/layout/__tests__/CalendarStrip.test.jsx`

- [ ] **Step 1: Write failing test**

```jsx
// src/components/layout/__tests__/CalendarStrip.test.jsx
import { render, screen, fireEvent } from '@testing-library/react';
import { CalendarStrip } from '../CalendarStrip';

const trip = { startDate: '2026-05-14', endDate: '2026-05-17' };
const dayLoops = [
  { id: 'loop-1', date: '2026-05-14', homebaseStayId: 'stay-1', stopIds: [] },
  { id: 'loop-2', date: '2026-05-15', homebaseStayId: 'stay-1', stopIds: ['poi-1', 'poi-2'] },
  { id: 'loop-3', date: '2026-05-16', homebaseStayId: 'stay-1', stopIds: ['poi-3'] },
];
const stays = [{ id: 'stay-1', checkin: '2026-05-14', checkout: '2026-05-17', isHomebase: true }];

describe('CalendarStrip', () => {
  it('renders an ALL chip and one chip per trip day', () => {
    render(<CalendarStrip trip={trip} dayLoops={dayLoops} stays={stays} selectedDate={null} onSelectDate={vi.fn()} />);
    expect(screen.getByText('ALL')).toBeInTheDocument();
    expect(screen.getByText('14')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('16')).toBeInTheDocument();
    expect(screen.getByText('17')).toBeInTheDocument();
  });

  it('shows stop count on days that have stops', () => {
    render(<CalendarStrip trip={trip} dayLoops={dayLoops} stays={stays} selectedDate={null} onSelectDate={vi.fn()} />);
    expect(screen.getByText('2 stops')).toBeInTheDocument();
    expect(screen.getByText('1 stop')).toBeInTheDocument();
  });

  it('calls onSelectDate with the ISO date when a day chip is clicked', () => {
    const onSelectDate = vi.fn();
    render(<CalendarStrip trip={trip} dayLoops={dayLoops} stays={stays} selectedDate={null} onSelectDate={onSelectDate} />);
    fireEvent.click(screen.getByText('15'));
    expect(onSelectDate).toHaveBeenCalledWith('2026-05-15');
  });

  it('calls onSelectDate with null when ALL is clicked', () => {
    const onSelectDate = vi.fn();
    render(<CalendarStrip trip={trip} dayLoops={dayLoops} stays={stays} selectedDate='2026-05-15' onSelectDate={onSelectDate} />);
    fireEvent.click(screen.getByText('ALL'));
    expect(onSelectDate).toHaveBeenCalledWith(null);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
npx vitest run src/components/layout/__tests__/CalendarStrip.test.jsx
```

Expected: FAIL — `Cannot find module '../CalendarStrip'`

- [ ] **Step 3: Implement CalendarStrip**

```jsx
// src/components/layout/CalendarStrip.jsx
export function CalendarStrip({ trip, dayLoops, stays, selectedDate, onSelectDate }) {
  // Build array of ISO dates covering the trip
  const dates = [];
  if (trip.startDate && trip.endDate) {
    const start = new Date(trip.startDate);
    const end   = new Date(trip.endDate);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().slice(0, 10));
    }
  }

  function isHomebaseNight(iso) {
    return stays.some(s => s.isHomebase && s.checkin <= iso && iso < s.checkout);
  }

  function stopCount(iso) {
    return dayLoops.find(dl => dl.date === iso)?.stopIds.length ?? 0;
  }

  // Detect city block boundaries (Stay changes)
  function hasDividerBefore(iso) {
    const idx = dates.indexOf(iso);
    if (idx <= 0) return false;
    const prev = dates[idx - 1];
    const prevStay = stays.find(s => s.checkin <= prev && prev < s.checkout);
    const curStay  = stays.find(s => s.checkin <= iso  && iso  < s.checkout);
    return prevStay?.id !== curStay?.id;
  }

  const chipBase = {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    minWidth: 38, padding: '5px 4px', borderRadius: 2, cursor: 'pointer',
    border: '1px solid transparent', gap: 1, flexShrink: 0,
    fontFamily: 'var(--font-mono)',
  };

  return (
    <div style={{
      background: 'var(--surface)',
      borderBottom: '1px solid rgba(242,237,232,0.07)',
      padding: '8px 14px',
      display: 'flex',
      gap: 6,
      alignItems: 'center',
      overflowX: 'auto',
    }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.52rem', color: 'var(--text-muted)', letterSpacing: '0.15em', textTransform: 'uppercase', marginRight: 4, whiteSpace: 'nowrap' }}>
        Expedition →
      </span>

      {/* ALL chip */}
      <button
        onClick={() => onSelectDate(null)}
        style={{
          ...chipBase,
          background: !selectedDate ? 'rgba(230,126,34,0.12)' : 'var(--surface-raised)',
          borderColor: !selectedDate ? 'var(--accent)' : 'rgba(242,237,232,0.12)',
          color: !selectedDate ? 'var(--accent)' : 'var(--text-secondary)',
        }}
      >
        <span style={{ fontSize: '0.55rem', fontWeight: 700 }}>ALL</span>
        <span style={{ fontSize: '0.6rem' }}>⊞</span>
      </button>

      {dates.map(iso => {
        const d       = new Date(iso + 'T00:00:00');
        const dd      = d.getDate();
        const wd      = d.toLocaleDateString('en-US', { weekday: 'short' });
        const hb      = isHomebaseNight(iso);
        const count   = stopCount(iso);
        const active  = selectedDate === iso;

        return (
          <div key={iso} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {hasDividerBefore(iso) && (
              <div style={{ width: 1, height: 30, background: 'rgba(242,237,232,0.07)', flexShrink: 0 }} />
            )}
            <button
              onClick={() => onSelectDate(iso)}
              style={{
                ...chipBase,
                background: active ? 'rgba(230,126,34,0.12)' : hb ? 'rgba(92,154,106,0.06)' : 'transparent',
                borderColor: active ? 'var(--accent)' : hb ? 'rgba(92,154,106,0.3)' : 'transparent',
              }}
            >
              <span style={{ fontSize: '0.48rem', color: active ? 'var(--accent)' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{wd}</span>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: active ? 'var(--accent)' : 'var(--text-primary)' }}>{dd}</span>
              {hb && !active && <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#5C9A6A' }} />}
              {count > 0 && (
                <span style={{ fontSize: '0.45rem', color: active ? 'var(--accent)' : 'var(--accent)', opacity: active ? 1 : 0.7 }}>
                  {count} {count === 1 ? 'stop' : 'stops'}
                </span>
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run src/components/layout/__tests__/CalendarStrip.test.jsx
```

Expected: all 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/CalendarStrip.jsx src/components/layout/__tests__/CalendarStrip.test.jsx
git commit -m "feat(homebase): CalendarStrip component with homebase dots + stop counts"
```

---

## Task 8: DayLoopPanel component

**Files:**
- Create: `src/components/itinerary/DayLoopPanel.jsx`
- Create: `src/components/itinerary/__tests__/DayLoopPanel.test.jsx`

- [ ] **Step 1: Write failing test**

```jsx
// src/components/itinerary/__tests__/DayLoopPanel.test.jsx
import { render, screen, fireEvent } from '@testing-library/react';
import { DayLoopPanel } from '../DayLoopPanel';

const dayLoop = {
  id: 'loop-1',
  date: '2026-05-16',
  homebaseStayId: 'stay-1',
  stopIds: ['poi-1', 'poi-2'],
  autoLegIds: ['leg-r1'],
  planningMode: 'semi',
};
const stay = { id: 'stay-1', name: 'Hotel Hafen', coords: [53.54, 9.98], isHomebase: true };
const pois = [
  { id: 'poi-1', name: 'Kunsthalle', category: 'museum' },
  { id: 'poi-2', name: 'Speicherstadt', category: 'district' },
];

describe('DayLoopPanel', () => {
  it('renders homebase as first item', () => {
    render(<DayLoopPanel dayLoop={dayLoop} stay={stay} pois={pois} onAddStop={vi.fn()} />);
    expect(screen.getByText('Hotel Hafen')).toBeInTheDocument();
  });

  it('renders each stop in order', () => {
    render(<DayLoopPanel dayLoop={dayLoop} stay={stay} pois={pois} onAddStop={vi.fn()} />);
    const items = screen.getAllByRole('listitem');
    expect(items[1]).toHaveTextContent('Kunsthalle');
    expect(items[2]).toHaveTextContent('Speicherstadt');
  });

  it('renders auto-return as last item', () => {
    render(<DayLoopPanel dayLoop={dayLoop} stay={stay} pois={pois} onAddStop={vi.fn()} />);
    expect(screen.getByText('Return to Hotel Hafen')).toBeInTheDocument();
  });

  it('calls onAddStop when Add Stop button is clicked', () => {
    const onAddStop = vi.fn();
    render(<DayLoopPanel dayLoop={dayLoop} stay={stay} pois={pois} onAddStop={onAddStop} />);
    fireEvent.click(screen.getByText(/Add Stop/));
    expect(onAddStop).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
npx vitest run src/components/itinerary/__tests__/DayLoopPanel.test.jsx
```

- [ ] **Step 3: Implement DayLoopPanel**

```jsx
// src/components/itinerary/DayLoopPanel.jsx
export function DayLoopPanel({ dayLoop, stay, pois, onAddStop }) {
  const orderedStops = dayLoop.stopIds.map(id => pois.find(p => p.id === id)).filter(Boolean);

  const date = new Date(dayLoop.date + 'T00:00:00');
  const dateLabel = date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });

  function StopItem({ name, meta, variant = 'confirmed' }) {
    const borderColor = {
      homebase: '#5C9A6A',
      confirmed: 'var(--accent)',
      pending: 'rgba(230,126,34,0.3)',
      return: 'rgba(92,154,106,0.2)',
    }[variant];
    return (
      <li role="listitem" style={{
        background: 'var(--surface-raised)',
        borderLeft: `2px solid ${borderColor}`,
        borderTop: '1px solid rgba(242,237,232,0.07)',
        borderRight: '1px solid rgba(242,237,232,0.07)',
        borderBottom: '1px solid rgba(242,237,232,0.07)',
        borderRadius: 2,
        padding: '7px 9px',
        opacity: variant === 'return' ? 0.5 : 1,
      }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-primary)', fontWeight: 600 }}>{name}</div>
        {meta && <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.52rem', color: 'var(--text-muted)', marginTop: 2 }}>{meta}</div>}
      </li>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--surface)' }}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(242,237,232,0.07)' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent)' }}>
          {dateLabel}
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.52rem', color: 'var(--text-muted)', marginTop: 1 }}>
          {stay?.name} loop
        </div>
      </div>

      <ul style={{ flex: 1, overflowY: 'auto', padding: 6, display: 'flex', flexDirection: 'column', gap: 4, listStyle: 'none', margin: 0 }}>
        {stay && <StopItem name={stay.name} meta="Homebase" variant="homebase" />}
        {orderedStops.map(stop => (
          <StopItem key={stop.id} name={stop.name} meta={stop.category} variant="confirmed" />
        ))}
        {stay && <StopItem name={`Return to ${stay.name}`} meta="auto-leg" variant="return" />}
      </ul>

      <button
        onClick={onAddStop}
        style={{
          margin: 8,
          border: '1px dashed rgba(230,126,34,0.35)',
          borderRadius: 2,
          padding: 7,
          textAlign: 'center',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.58rem',
          color: 'var(--accent)',
          background: 'transparent',
          cursor: 'pointer',
        }}
      >
        + Add Stop to {dateLabel}
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run src/components/itinerary/__tests__/DayLoopPanel.test.jsx
```

Expected: all 4 PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/itinerary/DayLoopPanel.jsx src/components/itinerary/__tests__/DayLoopPanel.test.jsx
git commit -m "feat(homebase): DayLoopPanel component with ordered stop list"
```

---

## Task 9: AddStopFlow — Search by name + Scout Pins claim

**Files:**
- Create: `src/components/itinerary/AddStopFlow.jsx`
- Create: `src/components/itinerary/__tests__/AddStopFlow.test.jsx`

- [ ] **Step 1: Write failing tests**

```jsx
// src/components/itinerary/__tests__/AddStopFlow.test.jsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AddStopFlow } from '../AddStopFlow';

global.fetch = vi.fn();

afterEach(() => vi.clearAllMocks());

describe('AddStopFlow — search', () => {
  it('renders the search input', () => {
    render(<AddStopFlow dayLoopId="loop-1" homebaseCoords={[53.54, 9.98]} onAdd={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByPlaceholderText(/Search/i)).toBeInTheDocument();
  });

  it('fetches Foursquare results on input and shows them', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [
          { fsq_id: 'fsq-1', name: 'Kunsthalle Hamburg', categories: [{ name: 'museum' }], geocodes: { main: { latitude: 53.56, longitude: 10.0 } }, distance: 1400 },
        ],
      }),
    });

    render(<AddStopFlow dayLoopId="loop-1" homebaseCoords={[53.54, 9.98]} onAdd={vi.fn()} onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/Search/i), { target: { value: 'Kunsthalle' } });

    await waitFor(() => expect(screen.getByText('Kunsthalle Hamburg')).toBeInTheDocument());
  });

  it('calls onAdd with stop object when result is selected', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [
          { fsq_id: 'fsq-1', name: 'Kunsthalle Hamburg', categories: [{ name: 'museum' }], geocodes: { main: { latitude: 53.56, longitude: 10.0 } }, distance: 1400 },
        ],
      }),
    });

    const onAdd = vi.fn();
    render(<AddStopFlow dayLoopId="loop-1" homebaseCoords={[53.54, 9.98]} onAdd={onAdd} onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/Search/i), { target: { value: 'Kunsthalle' } });
    await waitFor(() => screen.getByText('Kunsthalle Hamburg'));
    fireEvent.click(screen.getByText('Kunsthalle Hamburg'));
    fireEvent.click(screen.getByText(/Add to Day/i));

    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({
      id: 'fsq-1',
      name: 'Kunsthalle Hamburg',
      coords: [53.56, 10.0],
      category: 'museum',
    }));
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
npx vitest run src/components/itinerary/__tests__/AddStopFlow.test.jsx
```

- [ ] **Step 3: Implement AddStopFlow**

```jsx
// src/components/itinerary/AddStopFlow.jsx
import { useState, useRef } from 'react';

const FSQ_KEY = import.meta.env.VITE_FSQ_API_KEY;

async function searchFoursquare(query, homebaseCoords) {
  const [lat, lng] = homebaseCoords;
  const url = `https://api.foursquare.com/v3/places/search?query=${encodeURIComponent(query)}&ll=${lat},${lng}&radius=10000&limit=8&fields=fsq_id,name,categories,geocodes,distance`;
  const res = await fetch(url, { headers: { Authorization: FSQ_KEY } });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.results ?? []).map(r => ({
    id: r.fsq_id,
    name: r.name,
    coords: [r.geocodes.main.latitude, r.geocodes.main.longitude],
    category: r.categories?.[0]?.name?.toLowerCase().split(' ')[0] ?? 'place',
    distanceM: r.distance,
  }));
}

export function AddStopFlow({ dayLoopId, homebaseCoords, onAdd, onClose, anchorCoords = null }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);

  function handleInput(e) {
    const val = e.target.value;
    setQuery(val);
    setSelected(null);
    clearTimeout(debounceRef.current);
    if (!val.trim()) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const coords = anchorCoords ?? homebaseCoords;
      const res = await searchFoursquare(val, coords);
      setResults(res);
      setLoading(false);
    }, 350);
  }

  function confirm() {
    if (!selected) return;
    onAdd(selected);
  }

  return (
    <div style={{ background: 'var(--surface-raised)', border: '1px solid rgba(230,126,34,0.3)', borderRadius: 2, padding: 12 }}>
      <input
        placeholder="Search places..."
        value={query}
        onChange={handleInput}
        autoFocus
        style={{
          width: '100%', background: 'var(--surface)', border: '1px solid rgba(230,126,34,0.3)',
          borderRadius: 2, padding: '6px 10px', fontFamily: 'var(--font-mono)', fontSize: '0.65rem',
          color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box',
        }}
      />

      {loading && (
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: 'var(--text-muted)', marginTop: 6 }}>Searching...</p>
      )}

      {results.length > 0 && (
        <ul style={{ margin: '6px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 3 }}>
          {results.map(r => (
            <li key={r.id}>
              <button
                onClick={() => setSelected(r)}
                style={{
                  width: '100%', textAlign: 'left', background: selected?.id === r.id ? 'rgba(230,126,34,0.08)' : 'var(--surface)',
                  border: selected?.id === r.id ? '1px solid rgba(230,126,34,0.4)' : '1px solid rgba(242,237,232,0.07)',
                  borderRadius: 2, padding: '5px 9px', cursor: 'pointer',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}
              >
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-primary)' }}>{r.name}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.52rem', color: 'var(--text-muted)' }}>
                  {r.distanceM ? `${(r.distanceM / 1000).toFixed(1)} km` : ''}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
          <button
            onClick={confirm}
            style={{ background: 'var(--accent)', color: '#0A0B0C', fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 700, padding: '5px 12px', borderRadius: 2, border: 'none', cursor: 'pointer' }}
          >
            + Add to Day
          </button>
          <button
            onClick={onClose}
            style={{ background: 'transparent', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '0.6rem', padding: '5px 10px', border: '1px solid rgba(242,237,232,0.12)', borderRadius: 2, cursor: 'pointer' }}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run src/components/itinerary/__tests__/AddStopFlow.test.jsx
```

Expected: all 3 PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/itinerary/AddStopFlow.jsx src/components/itinerary/__tests__/AddStopFlow.test.jsx
git commit -m "feat(homebase): AddStopFlow search-by-name with Foursquare"
```

---

## Task 10: TripPlanner — wire CalendarStrip + DayLoopPanel + planning mode switcher

**Files:**
- Modify: `src/pages/TripPlanner.jsx`

- [ ] **Step 1: Read the top of TripPlanner to understand its current structure**

Open `src/pages/TripPlanner.jsx` and locate:
1. The top-level state variables (look for `const [activeTab, setActiveTab]` or similar)
2. Where the left panel / stops panel is rendered
3. Where the map component is rendered

- [ ] **Step 2: Add selectedDate state and import new components**

At the top of `TripPlanner.jsx`, add imports:

```jsx
import { CalendarStrip } from '../components/layout/CalendarStrip';
import { DayLoopPanel } from '../components/itinerary/DayLoopPanel';
import { CascadeConfirmSheet } from '../components/itinerary/CascadeConfirmSheet';
import { AddStopFlow } from '../components/itinerary/AddStopFlow';
import { onStopAdded } from '../utils/homebaseEngine';
```

Inside the component, add state:

```jsx
const [selectedDate, setSelectedDate] = useState(null);
const [pendingPreviews, setPendingPreviews] = useState(null);
const [showAddStop, setShowAddStop] = useState(false);
```

Also destructure new store fields:

```jsx
const { trip, legs, stays, pois, dayLoops, addStopToDayLoop, setTripPlanningMode, dispatch } = useTripStore();
```

Note: `dispatch` is not currently exposed — add it to `TripStoreProvider`'s value prop in `useTripStore.jsx`:

```js
// In TripStoreProvider
<TripStoreContext.Provider value={{ ...state, dispatch, clonePath, ... }}>
```

- [ ] **Step 3: Add the planning mode switcher to the header area**

Find the trip header section (where `trip.name` and trip metadata are displayed). After the metadata, add:

```jsx
{/* Planning mode switcher */}
<div style={{ display: 'flex', border: '1px solid rgba(242,237,232,0.1)', borderRadius: 2, overflow: 'hidden', marginLeft: 'auto' }}>
  {['manual', 'semi', 'full'].map(mode => (
    <button
      key={mode}
      onClick={() => setTripPlanningMode(mode)}
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '0.52rem',
        padding: '4px 10px',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        cursor: 'pointer',
        border: 'none',
        background: trip.planningMode === mode
          ? mode === 'full' ? 'rgba(92,154,106,0.15)' : mode === 'semi' ? 'rgba(230,126,34,0.15)' : '#181A1C'
          : 'transparent',
        color: trip.planningMode === mode
          ? mode === 'full' ? '#5C9A6A' : mode === 'semi' ? 'var(--accent)' : '#8A8680'
          : '#484440',
        borderRight: mode !== 'full' ? '1px solid rgba(242,237,232,0.07)' : 'none',
      }}
    >
      {mode === 'semi' ? 'Semi ●' : mode.charAt(0).toUpperCase() + mode.slice(1)}
    </button>
  ))}
</div>
```

- [ ] **Step 4: Mount CalendarStrip below the trip header**

Find where the main content area begins (after the header, before the tab panels). Insert:

```jsx
<CalendarStrip
  trip={trip}
  dayLoops={dayLoops}
  stays={stays}
  selectedDate={selectedDate}
  onSelectDate={setSelectedDate}
/>
```

- [ ] **Step 5: Conditionally render DayLoopPanel in the left panel**

Find the existing left panel (currently shows expedition stops). Wrap its content:

```jsx
{selectedDate ? (
  (() => {
    const dayLoop = dayLoops.find(dl => dl.date === selectedDate);
    const stay    = stays.find(s => s.id === dayLoop?.homebaseStayId);
    const dayPois = (dayLoop?.stopIds ?? []).map(id => pois.find(p => p.id === id)).filter(Boolean);

    return dayLoop ? (
      <>
        <DayLoopPanel
          dayLoop={dayLoop}
          stay={stay}
          pois={dayPois}
          onAddStop={() => setShowAddStop(true)}
        />
        {showAddStop && (
          <div style={{ padding: 8 }}>
            <AddStopFlow
              dayLoopId={dayLoop.id}
              homebaseCoords={stay?.coords ?? [0, 0]}
              onAdd={async (stop) => {
                addStopToDayLoop(dayLoop.id, stop);
                const updatedStops = [...dayPois, stop];
                const effectiveMode = dayLoop.planningMode ?? trip.planningMode;
                const result = onStopAdded({
                  dayLoop,
                  stop,
                  homebaseCoords: stay?.coords ?? [0, 0],
                  allStops: updatedStops,
                  mode: effectiveMode,
                  dispatch,
                });
                if (effectiveMode === 'semi' && result.previews) {
                  setPendingPreviews({ previews: result.previews, stopName: stop.name });
                }
                setShowAddStop(false);
              }}
              onClose={() => setShowAddStop(false)}
            />
          </div>
        )}
        {pendingPreviews && (
          <div style={{ padding: 8 }}>
            <CascadeConfirmSheet
              previews={pendingPreviews.previews}
              stopName={pendingPreviews.stopName}
              onApply={() => setPendingPreviews(null)}
              onDiscard={() => setPendingPreviews(null)}
              dispatch={dispatch}
            />
          </div>
        )}
      </>
    ) : (
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-muted)', padding: 12 }}>
        No day loop for this date. Add a Stay covering this night first.
      </p>
    );
  })()
) : (
  /* existing expedition stops panel — leave untouched */
  <ExistingStopsPanel />
)}
```

Replace `<ExistingStopsPanel />` with whatever JSX is currently in the left panel.

- [ ] **Step 6: Run the dev server and verify visually**

```bash
npm run dev
```

Navigate to `http://localhost:3001`. Open the Trip Planner:
1. Confirm the calendar strip appears below the header
2. Confirm the planning mode switcher is in the header
3. Add a Stay (checkin/checkout dates that cover the trip) — DayLoops should auto-create via `addDayLoop` triggered from the AddStay flow
4. Click a day in the calendar strip → left panel switches to DayLoopPanel
5. Click "+ Add Stop" → AddStopFlow renders, search works, adding a stop fires the cascade

- [ ] **Step 7: Wire Stay addition to auto-create DayLoops**

Find wherever `addStay` is called in the codebase (likely in a stay/accommodation form). After `addStay(stayData)`, add:

```jsx
// Auto-create a DayLoop for each night this Stay covers
const start = new Date(stayData.checkin);
const end   = new Date(stayData.checkout);
for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
  addDayLoop({
    date: d.toISOString().slice(0, 10),
    homebaseStayId: stayData.id,
  });
}
```

Search for `addStay` usage:
```bash
grep -r "addStay" src/ --include="*.jsx" --include="*.js" -l
```

Update each call site to also call `addDayLoop` for each covered night.

- [ ] **Step 8: Commit**

```bash
git add src/pages/TripPlanner.jsx src/store/useTripStore.jsx
git commit -m "feat(homebase): wire CalendarStrip + DayLoopPanel + mode switcher into TripPlanner"
```

---

## Task 11: Map — day-loop route rendering + distance ring

**Files:**
- Modify: map component (find with `grep -r "RouteMap\|MapLayerController\|useMap" src/ --include="*.jsx" -l`)

- [ ] **Step 1: Find the map component**

```bash
grep -r "useMap\|MapContainer\|TileLayer" src/ --include="*.jsx" -l
```

Open the identified file. Look for where `legs` are currently drawn as polylines.

- [ ] **Step 2: Filter legs to active day when selectedDate is set**

Pass `selectedDate` as a prop to the map component from TripPlanner. Inside the map:

```jsx
// Filter legs to the active day's loop if a day is selected
const visibleLegs = selectedDate
  ? legs.filter(l => {
      const loop = dayLoops.find(dl => dl.date === selectedDate);
      return loop?.autoLegIds.includes(l.id) || (l.dayLoopId === loop?.id);
    })
  : legs;
```

Use `visibleLegs` instead of `legs` when rendering polylines.

- [ ] **Step 3: Draw the homebase distance ring when a day is selected**

Inside the map, when `selectedDate` is set and there is a homebase stay:

```jsx
{selectedDate && (() => {
  const loop = dayLoops.find(dl => dl.date === selectedDate);
  const stay = stays.find(s => s.id === loop?.homebaseStayId);
  if (!stay?.coords) return null;
  return (
    <Circle
      center={stay.coords}
      radius={5000}
      pathOptions={{ color: '#5C9A6A', opacity: 0.08, fillOpacity: 0.03, dashArray: '4 6' }}
    />
  );
})()}
```

`Circle` is from `react-leaflet`.

- [ ] **Step 4: Fly-to when a new stop is added**

In the map component, add a `useEffect` that watches `dayLoops` for changes to the active day's `stopIds`:

```jsx
const mapRef = useRef(null);
const prevStopCount = useRef(0);

useEffect(() => {
  if (!selectedDate || !mapRef.current) return;
  const loop = dayLoops.find(dl => dl.date === selectedDate);
  const count = loop?.stopIds.length ?? 0;
  if (count > prevStopCount.current && loop?.stopIds.length > 0) {
    const lastId = loop.stopIds[loop.stopIds.length - 1];
    const poi = pois.find(p => p.id === lastId);
    if (poi?.coords) mapRef.current.flyTo(poi.coords, 14, { duration: 1 });
  }
  prevStopCount.current = count;
}, [dayLoops, selectedDate, pois]);
```

Pass `ref={mapRef}` to the `MapContainer` (use `ref` prop with react-leaflet v4+: `<MapContainer ref={mapRef} ...>`).

- [ ] **Step 5: Verify visually**

```bash
npm run dev
```

1. Add a Stay → click a day in calendar strip
2. Add a stop via AddStopFlow → map should fly-to the stop and show the loop route
3. Switch back to ALL → all legs render
4. Confirm distance ring appears around the homebase when a day is selected

- [ ] **Step 6: Commit**

```bash
git add src/components/itinerary/RouteMap.jsx   # or whichever file you modified
git commit -m "feat(homebase): day-loop route filter, distance ring, fly-to on stop add"
```

---

## Self-review checklist

Run before marking this plan complete:

- [ ] `npx vitest run` — all tests pass
- [ ] `npm run build` — no TypeScript/build errors
- [ ] Add a Stay → DayLoops auto-created, homebase dots in CalendarStrip
- [ ] Select a day → panel switches to DayLoopPanel, map filters
- [ ] Add stop via search → cascade fires, route redraws
- [ ] Semi-Auto → CascadeConfirmSheet appears, Apply commits all, Discard rolls back
- [ ] Full Auto → cascade fires immediately, no confirm sheet
- [ ] Manual → stop is added, no legs built, no cascade
- [ ] Switch to ALL → full expedition route renders
- [ ] `source: 'homebase-engine'` legs not shown in existing expedition stops panel
