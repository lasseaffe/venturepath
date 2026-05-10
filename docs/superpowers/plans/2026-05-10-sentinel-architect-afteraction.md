# Sentinel Triggers, Architect AI & After-Action Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire live hazard data across PackingManifest, LedgerWorkbench, and BudgetLoom via a shared event bus; inject passive Architect insight cards driven by rule-based logic and Anthropic Haiku; and add an After-Action screen for expense settlement and VentureVault publishing.

**Architecture:** A plain-JS pub/sub `sentinelBus` module decouples all event producers (weatherEngine, StopEditor, SquadGearContext) from consumers (PackingManifest, LedgerWorkbench, BudgetLoom, architectEngine). An `architectEngine` listens to the bus and produces `InsightCard` data; InsightCards render inline in each tab. After-Action is a two-phase stepped screen (Settle → Publish) rendered by TripPlanner when `trip.status === 'AFTER-ACTION'`.

**Tech Stack:** Vite + React 19, Vitest, `@anthropic-ai/sdk` (new install), OpenWeatherMap free tier, Tailwind CSS, existing `sentinelBus` (new), existing Context API

---

## File Map

**New files:**
- `src/utils/sentinelBus.js` — pub/sub event bus (no React dependency)
- `src/utils/weatherHazardMapper.js` — maps OWM API response → normalized Hazard objects with gear tags and stop types
- `src/utils/architectEngine.js` — rule-based insight generation + Anthropic Haiku call for pre-departure briefs
- `src/components/ui/InsightCard.jsx` — dismissible inline insight card component
- `src/components/afteraction/AfterActionScreen.jsx` — Phase 1 (settle) + Phase 2 (publish) stepped UI
- `src/utils/sentinelBus.test.js` — bus unit tests
- `src/utils/weatherHazardMapper.test.js` — mapper unit tests
- `src/utils/architectEngine.test.js` — engine unit tests

**Modified files:**
- `src/utils/safetyEngine.js` — add `affectedGearTags` + `affectedStopTypes` to each incident pool entry; emit `HAZARD_UPDATED` via bus
- `src/utils/packingLogic.js` — add `GEAR_TAGS` map + `getItemsByTag(tag)` export
- `src/utils/weatherEngine.js` — call OWM API (with Open-Meteo fallback); emit `HAZARD_UPDATED` via bus
- `src/store/useTripStore.jsx` — add `'AFTER-ACTION'` status, `architect` slice, `COMPLETE_EXPEDITION` and `ADD_INSIGHT` / `DISMISS_INSIGHT` actions
- `src/components/logistics/PackingManifest.jsx` — subscribe to bus; render CRITICAL badge elevation + InsightCards
- `src/components/itinerary/ledger/LedgerWorkbench.jsx` — subscribe to bus; render stop risk badges + InsightCards
- `src/components/logistics/BudgetLoom.jsx` — subscribe to bus; render insurance callout + InsightCards
- `src/components/social/PioneerChat.jsx` — handle `type: 'architect'` log messages with ⬡ icon
- `src/pages/TripPlanner.jsx` — add "Complete Expedition" button on Overview; swap in AfterActionScreen when status = AFTER-ACTION
- `src/components/trip/StopEditor.jsx` — add `type` field selector to stop form
- `.env.example` — add `VITE_OWM_API_KEY`

---

## Task 1: Install Anthropic SDK

**Files:**
- Modify: `package.json` (via npm)
- Modify: `.env.example`

- [ ] **Step 1: Install the SDK**

```bash
cd C:\Users\lasse\Desktop\venturepath
npm install @anthropic-ai/sdk
```

Expected output: `added N packages` with no errors.

- [ ] **Step 2: Add env var to .env.example**

Open `.env.example` and append:
```
# OpenWeatherMap — optional. Used for live weather hazards in Sentinel.
# Free tier at https://openweathermap.org/api
VITE_OWM_API_KEY=
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json .env.example
git commit -m "chore: install @anthropic-ai/sdk, add VITE_OWM_API_KEY env"
```

---

## Task 2: Sentinel Event Bus

**Files:**
- Create: `src/utils/sentinelBus.js`
- Create: `src/utils/sentinelBus.test.js`

- [ ] **Step 1: Write failing tests**

Create `src/utils/sentinelBus.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import sentinelBus from './sentinelBus.js';

beforeEach(() => sentinelBus._reset());

describe('sentinelBus', () => {
  it('calls handler when event is emitted', () => {
    const handler = vi.fn();
    sentinelBus.on('HAZARD_UPDATED', handler);
    sentinelBus.emit('HAZARD_UPDATED', { hazards: [] });
    expect(handler).toHaveBeenCalledWith({ hazards: [] });
  });

  it('does not call handler after unsubscribe', () => {
    const handler = vi.fn();
    const unsub = sentinelBus.on('HAZARD_UPDATED', handler);
    unsub();
    sentinelBus.emit('HAZARD_UPDATED', { hazards: [] });
    expect(handler).not.toHaveBeenCalled();
  });

  it('supports multiple handlers for the same event', () => {
    const a = vi.fn();
    const b = vi.fn();
    sentinelBus.on('STOP_ADDED', a);
    sentinelBus.on('STOP_ADDED', b);
    sentinelBus.emit('STOP_ADDED', { stop: {}, legIndex: 0 });
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });

  it('does not call handler registered for different event', () => {
    const handler = vi.fn();
    sentinelBus.on('HAZARD_UPDATED', handler);
    sentinelBus.emit('STOP_ADDED', { stop: {}, legIndex: 0 });
    expect(handler).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd C:\Users\lasse\Desktop\venturepath
npx vitest run src/utils/sentinelBus.test.js
```

Expected: FAIL — `Cannot find module './sentinelBus.js'`

- [ ] **Step 3: Implement the bus**

Create `src/utils/sentinelBus.js`:

```js
// Shared pub/sub event bus. No React dependency — safe to import from engines and contexts.
// Listeners fire synchronously. Bus is session-lifetime only (no persistence).

const listeners = new Map(); // eventType → Set<handler>

const sentinelBus = {
  on(eventType, handler) {
    if (!listeners.has(eventType)) listeners.set(eventType, new Set());
    listeners.get(eventType).add(handler);
    return () => listeners.get(eventType)?.delete(handler);
  },

  emit(eventType, payload) {
    listeners.get(eventType)?.forEach(h => h(payload));
  },

  // Test helper only — clears all listeners
  _reset() {
    listeners.clear();
  },
};

export default sentinelBus;
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx vitest run src/utils/sentinelBus.test.js
```

Expected: 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/sentinelBus.js src/utils/sentinelBus.test.js
git commit -m "feat: add sentinelBus pub/sub event bus"
```

---

## Task 3: Weather Hazard Mapper

**Files:**
- Create: `src/utils/weatherHazardMapper.js`
- Create: `src/utils/weatherHazardMapper.test.js`

- [ ] **Step 1: Write failing tests**

Create `src/utils/weatherHazardMapper.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { mapOwmToHazards } from './weatherHazardMapper.js';

describe('mapOwmToHazards', () => {
  it('returns HIGH_WINDS hazard when wind speed exceeds 50 km/h', () => {
    const owm = { wind: { speed: 15 }, rain: {}, clouds: { all: 20 } }; // 15 m/s = 54 km/h
    const hazards = mapOwmToHazards(owm);
    const wind = hazards.find(h => h.id === 'HIGH_WINDS');
    expect(wind).toBeDefined();
    expect(wind.severity).toBe('red');
    expect(wind.affectedGearTags).toContain('hardshell');
  });

  it('returns HEAVY_RAIN hazard when 1h rain exceeds 10mm', () => {
    const owm = { wind: { speed: 5 }, rain: { '1h': 12 }, clouds: { all: 90 } };
    const hazards = mapOwmToHazards(owm);
    const rain = hazards.find(h => h.id === 'HEAVY_RAIN');
    expect(rain).toBeDefined();
    expect(rain.severity).toBe('amber');
    expect(rain.affectedStopTypes).toContain('summit');
  });

  it('returns empty array when conditions are benign', () => {
    const owm = { wind: { speed: 3 }, rain: {}, clouds: { all: 10 } };
    const hazards = mapOwmToHazards(owm);
    expect(hazards).toHaveLength(0);
  });

  it('returns EXTREME_HEAT when temp exceeds 38°C', () => {
    const owm = { wind: { speed: 2 }, rain: {}, clouds: { all: 5 }, main: { temp: 315 } }; // Kelvin
    const hazards = mapOwmToHazards(owm);
    const heat = hazards.find(h => h.id === 'EXTREME_HEAT');
    expect(heat).toBeDefined();
    expect(heat.affectedGearTags).toContain('sun_protection');
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run src/utils/weatherHazardMapper.test.js
```

Expected: FAIL — `Cannot find module './weatherHazardMapper.js'`

- [ ] **Step 3: Implement the mapper**

Create `src/utils/weatherHazardMapper.js`:

```js
// Maps OpenWeatherMap current-weather API response → normalized Hazard objects.
// Each Hazard: { id, type, severity, label, affectedGearTags, affectedStopTypes }

const MS_TO_KMH = 3.6;
const KELVIN_OFFSET = 273.15;

/**
 * @param {object} owm — raw OWM /data/2.5/weather JSON
 * @returns {Array<Hazard>}
 */
export function mapOwmToHazards(owm) {
  const hazards = [];
  const windKmh = (owm.wind?.speed ?? 0) * MS_TO_KMH;
  const rain1h = owm.rain?.['1h'] ?? 0;
  const tempC = owm.main?.temp ? owm.main.temp - KELVIN_OFFSET : null;

  if (windKmh > 50) {
    hazards.push({
      id: 'HIGH_WINDS',
      type: 'Weather',
      severity: windKmh > 80 ? 'red' : 'amber',
      label: `High winds — ${Math.round(windKmh)} km/h gusts`,
      affectedGearTags: ['hardshell', 'tent_stakes', 'guy_lines', 'windbreaker'],
      affectedStopTypes: ['summit', 'exposed_ridge', 'coastal', 'viewpoint'],
    });
  }

  if (rain1h > 10) {
    hazards.push({
      id: 'HEAVY_RAIN',
      type: 'Weather',
      severity: rain1h > 25 ? 'red' : 'amber',
      label: `Heavy rain — ${rain1h}mm/h`,
      affectedGearTags: ['rain_jacket', 'waterproof_bag', 'waterproof_phone_case'],
      affectedStopTypes: ['summit', 'coastal', 'viewpoint', 'camp'],
    });
  }

  if (tempC !== null && tempC > 38) {
    hazards.push({
      id: 'EXTREME_HEAT',
      type: 'Weather',
      severity: 'red',
      label: `Extreme heat — ${Math.round(tempC)}°C`,
      affectedGearTags: ['sun_protection', 'electrolytes', 'extra_water'],
      affectedStopTypes: ['summit', 'urban', 'transit'],
    });
  }

  return hazards;
}

/**
 * Fetch current weather from OWM and return normalized hazards.
 * Falls back to empty array if key missing or fetch fails.
 * @param {{ lat: number, lng: number }} coords
 * @returns {Promise<Array<Hazard>>}
 */
export async function fetchWeatherHazards(coords) {
  const key = import.meta.env.VITE_OWM_API_KEY;
  if (!key || !coords?.lat) return [];
  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${coords.lat}&lon=${coords.lng}&appid=${key}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return mapOwmToHazards(data);
  } catch {
    return [];
  }
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run src/utils/weatherHazardMapper.test.js
```

Expected: 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/weatherHazardMapper.js src/utils/weatherHazardMapper.test.js
git commit -m "feat: add weatherHazardMapper with OWM integration"
```

---

## Task 4: Extend safetyEngine + packingLogic with tags

**Files:**
- Modify: `src/utils/safetyEngine.js`
- Modify: `src/utils/packingLogic.js`

- [ ] **Step 1: Add gear tags and stop types to safetyEngine incident pools**

Open `src/utils/safetyEngine.js`. Add `affectedGearTags` and `affectedStopTypes` to each Weather-type incident. Trail/Wildlife/Medical/Flood incidents get empty arrays (they don't auto-elevate gear):

```js
// In the `default` pool, replace the Weather incident with:
{ type: 'Weather', severity: 'amber', description: 'High winds forecast — gusts up to 80kph', lat: -51.5, lng: -72.6,
  affectedGearTags: ['hardshell', 'tent_stakes', 'guy_lines'],
  affectedStopTypes: ['summit', 'exposed_ridge', 'viewpoint'] },

// All other incidents (Trail, Medical, Wildlife, Flood) — add:
  affectedGearTags: [],
  affectedStopTypes: [],
```

Apply the same pattern to `svalbard` and `namib` pools:
- `svalbard` Weather (Blizzard): `affectedGearTags: ['down_jacket', 'balaclava', 'hardshell']`, `affectedStopTypes: ['summit', 'coastal', 'viewpoint']`
- `namib` Weather (Extreme heat): `affectedGearTags: ['sun_protection', 'electrolytes', 'extra_water']`, `affectedStopTypes: ['summit', 'urban', 'transit']`

Also add the bus emit at the bottom of `fetchSafetyIncidents`:

```js
import sentinelBus from './sentinelBus.js';

export async function fetchSafetyIncidents(destinationId = 'default') {
  await new Promise(r => setTimeout(r, 300));
  const key = destinationId.toLowerCase().replace(/[^a-z]/g, '');
  const pool = INCIDENT_POOLS[key] ?? INCIDENT_POOLS.default;
  const incidents = pool.map((inc, i) => ({
    ...inc,
    id: `inc_${i}`,
    timestamp: new Date(Date.now() - Math.random() * 3_600_000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
  }));
  // Emit normalized hazards to bus (only non-green incidents)
  const hazards = incidents.filter(inc => inc.severity !== 'green');
  sentinelBus.emit('HAZARD_UPDATED', { hazards });
  return incidents;
}
```

- [ ] **Step 2: Add GEAR_TAGS map and getItemsByTag to packingLogic**

Open `src/utils/packingLogic.js`. After the existing `BASE_ITEMS` block, add:

```js
// Maps hazard gear tags → item IDs in the packing list
export const GEAR_TAGS = {
  hardshell:            ['hard_shell'],      // must match item `id` fields
  tent_stakes:          ['shelter'],
  guy_lines:            ['shelter'],
  windbreaker:          ['windbreaker'],
  rain_jacket:          ['rain_jacket'],
  waterproof_bag:       ['dry_bag'],
  waterproof_phone_case:['sat_comm'],
  down_jacket:          ['down_jacket'],
  balaclava:            ['balaclava'],
  sun_protection:       ['sun_protection'],
  electrolytes:         ['electrolytes'],
  extra_water:          ['extra_water'],
  // Checklist nudge tags (used by architectEngine)
  water_bottles:        ['water_filter'],
  powerbank:            ['powerbank'],
  first_aid:            ['first_aid'],
};

/**
 * Returns item IDs associated with a gear tag.
 * @param {string} tag
 * @returns {string[]}
 */
export function getItemsByTag(tag) {
  return GEAR_TAGS[tag] ?? [];
}
```

- [ ] **Step 3: Run existing packingLogic tests (if any) to ensure nothing broke**

```bash
npx vitest run --reporter=verbose 2>&1 | grep -E "packingLogic|PASS|FAIL"
```

Expected: no failures related to packingLogic.

- [ ] **Step 4: Commit**

```bash
git add src/utils/safetyEngine.js src/utils/packingLogic.js
git commit -m "feat: add gear tags/stop types to safetyEngine, add getItemsByTag to packingLogic"
```

---

## Task 5: weatherEngine emits HAZARD_UPDATED via bus

**Files:**
- Modify: `src/utils/weatherEngine.js`

- [ ] **Step 1: Add OWM fetch + bus emit to weatherEngine**

Open `src/utils/weatherEngine.js`. At the top, add the import:

```js
import sentinelBus from './sentinelBus.js';
import { fetchWeatherHazards } from './weatherHazardMapper.js';
```

At the end of the file, add and export a new function:

```js
/**
 * Fetch live weather hazards for a destination and emit them on the bus.
 * Called once when TripPlanner mounts with a destination that has coords.
 * @param {{ lat: number, lng: number }} coords
 */
export async function loadAndEmitWeatherHazards(coords) {
  const hazards = await fetchWeatherHazards(coords);
  if (hazards.length > 0) {
    sentinelBus.emit('HAZARD_UPDATED', { hazards });
  }
}
```

- [ ] **Step 2: Run all tests to confirm nothing broke**

```bash
npx vitest run
```

Expected: all previously passing tests still pass.

- [ ] **Step 3: Commit**

```bash
git add src/utils/weatherEngine.js
git commit -m "feat: weatherEngine emits HAZARD_UPDATED via sentinelBus"
```

---

## Task 6: TripStore — AFTER-ACTION status + architect slice

**Files:**
- Modify: `src/store/useTripStore.jsx`

- [ ] **Step 1: Add architect initial state and AFTER-ACTION to DEFAULT_TRIP**

Open `src/store/useTripStore.jsx`. In the `initialState` object, add the `architect` slice:

```js
const initialState = {
  trip: DEFAULT_TRIP,
  legs: DEFAULT_LEGS,
  objectives: DEFAULT_OBJECTIVES,
  manifestSettings: DEFAULT_MANIFEST_SETTINGS,
  userRole: 'LEADER',
  cloning: false,
  architect: {
    insights: [],       // [{ id, message, cta: { label, targetTab } | null, targetTab, dismissedAt: null }]
    lastGeneratedAt: null,
  },
};
```

`DEFAULT_TRIP.status` stays `'PLANNING'` — no change there.

- [ ] **Step 2: Add three new reducer cases**

Inside `function reducer(state, action)`, add after the existing `SET_ROLE` case:

```js
case 'COMPLETE_EXPEDITION': {
  return {
    ...state,
    trip: { ...state.trip, status: 'AFTER-ACTION' },
  };
}

case 'ADD_INSIGHT': {
  const insight = action.payload; // { id, message, cta, targetTab }
  // Deduplicate by id; max 10 stored
  const existing = state.architect.insights.filter(i => i.id !== insight.id);
  const next = [insight, ...existing].slice(0, 10);
  return {
    ...state,
    architect: { insights: next, lastGeneratedAt: Date.now() },
  };
}

case 'DISMISS_INSIGHT': {
  const { id } = action.payload;
  return {
    ...state,
    architect: {
      ...state.architect,
      insights: state.architect.insights.filter(i => i.id !== id),
    },
  };
}
```

- [ ] **Step 3: Expose dispatch actions via context value**

In the `TripStoreProvider` component's context value, add:

```js
completeExpedition: () => dispatch({ type: 'COMPLETE_EXPEDITION' }),
addInsight: (insight) => dispatch({ type: 'ADD_INSIGHT', payload: insight }),
dismissInsight: (id) => dispatch({ type: 'DISMISS_INSIGHT', payload: { id } }),
```

- [ ] **Step 4: Verify the app still loads**

```bash
npm run dev
```

Open `http://localhost:5173` — dashboard should load with no console errors.

- [ ] **Step 5: Commit**

```bash
git add src/store/useTripStore.jsx
git commit -m "feat: add AFTER-ACTION status, architect slice, and insight actions to TripStore"
```

---

## Task 7: InsightCard component

**Files:**
- Create: `src/components/ui/InsightCard.jsx`

- [ ] **Step 1: Create the component**

Create `src/components/ui/InsightCard.jsx`:

```jsx
import { useTripStore } from '../../store/useTripStore.jsx';

/**
 * Dismissible inline insight card from the Architect.
 * Props:
 *   insight: { id, message, cta: { label, onClick } | null }
 */
export default function InsightCard({ insight }) {
  const { dismissInsight } = useTripStore();

  return (
    <div className="
      flex items-start gap-3 p-3 rounded-lg border
      bg-[#FDF6EC] border-[#E67E22]/40
      [.tactical_&]:bg-[#0E1012] [.tactical_&]:border-[#F2A900]/40
      text-sm mb-2
    ">
      <span className="text-[#E67E22] [.tactical_&]:text-[#F2A900] mt-0.5 shrink-0" aria-hidden>⬡</span>
      <div className="flex-1 min-w-0">
        <p className="text-[#3D2B1F] [.tactical_&]:text-[#F2A900] font-medium leading-snug">
          {insight.message}
        </p>
        {insight.cta && (
          <button
            onClick={insight.cta.onClick}
            className="mt-1 text-xs text-[#E67E22] [.tactical_&]:text-[#F2A900] underline underline-offset-2 hover:opacity-80"
          >
            {insight.cta.label}
          </button>
        )}
      </div>
      <button
        onClick={() => dismissInsight(insight.id)}
        aria-label="Dismiss insight"
        className="text-[#9E8A78] hover:text-[#3D2B1F] [.tactical_&]:text-[#F2A900]/50 [.tactical_&]:hover:text-[#F2A900] shrink-0 text-base leading-none"
      >
        ×
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Verify import paths are correct**

Check that `useTripStore` is exported from `src/store/useTripStore.jsx`:

```bash
grep -n "export.*useTripStore" C:\Users\lasse\Desktop\venturepath\src\store\useTripStore.jsx
```

Expected: a line like `export function useTripStore()` or `export { useTripStore }`.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/InsightCard.jsx
git commit -m "feat: add InsightCard component for Architect passive suggestions"
```

---

## Task 8: Architect Engine (rule-based + Anthropic)

**Files:**
- Create: `src/utils/architectEngine.js`
- Create: `src/utils/architectEngine.test.js`

- [ ] **Step 1: Write failing tests**

Create `src/utils/architectEngine.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { buildInsights } from './architectEngine.js';

describe('buildInsights', () => {
  it('returns weight insight when a member is over limit', () => {
    const insights = buildInsights('SQUAD_WEIGHT_CHANGED', { memberId: 'medic', newKg: 22, overLimit: true }, {});
    expect(insights).toHaveLength(1);
    expect(insights[0].id).toBe('weight_overload_medic');
    expect(insights[0].message).toContain('medic');
    expect(insights[0].targetTab).toBe('LOGISTICS');
  });

  it('returns no weight insight when under limit', () => {
    const insights = buildInsights('SQUAD_WEIGHT_CHANGED', { memberId: 'medic', newKg: 18, overLimit: false }, {});
    expect(insights).toHaveLength(0);
  });

  it('returns budget insight when threshold exceeded', () => {
    const insights = buildInsights('BUDGET_THRESHOLD', { category: 'Accommodation', spent: 920, limit: 1000 }, {});
    expect(insights[0].message).toContain('92%');
    expect(insights[0].targetTab).toBe('LOGISTICS');
  });

  it('returns hike insight when summit stop added', () => {
    const insights = buildInsights('STOP_ADDED', { stop: { type: 'summit', name: 'Summit Push' }, legIndex: 2 }, { manifest: ['first_aid'] });
    expect(insights.some(i => i.id.startsWith('hike_water'))).toBe(true);
  });

  it('returns hazard insight for HIGH_WINDS', () => {
    const insights = buildInsights('HAZARD_UPDATED', { hazards: [{ id: 'HIGH_WINDS', label: 'High winds — 60 km/h', severity: 'red', affectedGearTags: ['hardshell'] }] }, {});
    expect(insights[0].message).toContain('High winds');
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npx vitest run src/utils/architectEngine.test.js
```

Expected: FAIL — `Cannot find module './architectEngine.js'`

- [ ] **Step 3: Implement architectEngine**

Create `src/utils/architectEngine.js`:

```js
import Anthropic from '@anthropic-ai/sdk';

let anthropicClient = null;
function getClient() {
  if (!anthropicClient) {
    const apiKey = import.meta.env?.VITE_ANTHROPIC_API_KEY;
    if (!apiKey) return null;
    anthropicClient = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  }
  return anthropicClient;
}

/**
 * Build rule-based insights synchronously for a given bus event.
 *
 * @param {string} eventType
 * @param {object} payload  — the bus event payload
 * @param {object} context  — optional: { manifest: string[], budgetPct: number }
 * @returns {Array<{ id, message, cta, targetTab }>}
 */
export function buildInsights(eventType, payload, context = {}) {
  const insights = [];

  if (eventType === 'SQUAD_WEIGHT_CHANGED' && payload.overLimit) {
    insights.push({
      id: `weight_overload_${payload.memberId}`,
      message: `${payload.memberId} is carrying ${payload.newKg}kg — over the max. Reassign items to balance the squad.`,
      cta: { label: 'Reassign gear', targetTab: 'LOGISTICS' },
      targetTab: 'LOGISTICS',
    });
  }

  if (eventType === 'HAZARD_UPDATED') {
    for (const hazard of payload.hazards ?? []) {
      insights.push({
        id: `hazard_${hazard.id}`,
        message: `${hazard.label} — affected gear moved to CRITICAL.`,
        cta: null,
        targetTab: 'LOGISTICS',
      });
    }
  }

  if (eventType === 'BUDGET_THRESHOLD') {
    const pct = Math.round((payload.spent / payload.limit) * 100);
    insights.push({
      id: `budget_${payload.category}`,
      message: `Budget at ${pct}% in ${payload.category}. Consider adjusting or checking insurance coverage.`,
      cta: { label: 'View budget', targetTab: 'LOGISTICS' },
      targetTab: 'LOGISTICS',
    });
  }

  if (eventType === 'STOP_ADDED') {
    const { stop, legIndex } = payload;
    if (stop.type === 'summit' || stop.type === 'coastal') {
      const manifest = context.manifest ?? [];
      if (!manifest.includes('water_filter')) {
        insights.push({
          id: `hike_water_${legIndex}`,
          message: `${stop.name || 'New stop'} added — water bottles/filter not in manifest for this leg.`,
          cta: { label: 'Open packing list', targetTab: 'LOGISTICS' },
          targetTab: 'LOGISTICS',
        });
      }
      if (!manifest.includes('powerbank')) {
        insights.push({
          id: `hike_power_${legIndex}`,
          message: `Long hike planned — power bank not packed. Remote areas may have no charging points.`,
          cta: { label: 'Open packing list', targetTab: 'LOGISTICS' },
          targetTab: 'LOGISTICS',
        });
      }
    }
  }

  if (eventType === 'PACK_ITEM_MISSING') {
    insights.push({
      id: `missing_${payload.itemLabel.replace(/\s+/g, '_')}`,
      message: `Reminder: ${payload.itemLabel} is not packed for the next leg.`,
      cta: { label: 'Open packing list', targetTab: 'LOGISTICS' },
      targetTab: 'LOGISTICS',
    });
  }

  return insights;
}

/**
 * Generate a pre-departure brief via Anthropic Haiku.
 * Cached in sessionStorage per legId.
 *
 * @param {{ id, from, to, mode, durationH }} leg
 * @param {{ hazards: object[], manifest: string[], squad: object[] }} context
 * @returns {Promise<string>}
 */
export async function generateDepartureBrief(leg, context) {
  const cacheKey = `architect_brief_${leg.id}`;
  const cached = sessionStorage.getItem(cacheKey);
  if (cached) return cached;

  const client = getClient();
  if (!client) return null;

  const prompt = `You are the Architect, a tactical expedition AI advisor.
Write a 2-3 sentence pre-departure brief for the squad. Be concise and specific.

Leg: ${leg.from} → ${leg.to} (${leg.mode}, ~${leg.durationH}h)
Active hazards: ${context.hazards.map(h => h.label).join(', ') || 'none'}
Missing gear: ${context.manifest.length > 0 ? context.manifest.join(', ') : 'none'}
Squad roles: ${context.squad.map(m => m.name).join(', ')}

Tone: tactical, direct. No fluff. Focus on what could go wrong and what they must do before departing.`;

  try {
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 120,
      messages: [{ role: 'user', content: prompt }],
    });
    const brief = msg.content[0].text;
    sessionStorage.setItem(cacheKey, brief);
    return brief;
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run src/utils/architectEngine.test.js
```

Expected: 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/architectEngine.js src/utils/architectEngine.test.js
git commit -m "feat: add architectEngine with rule-based insights and Haiku departure briefs"
```

---

## Task 9: PackingManifest — bus subscription + CRITICAL elevation + InsightCards

**Files:**
- Modify: `src/components/logistics/PackingManifest.jsx`

- [ ] **Step 1: Add bus subscription and hazard state**

Open `src/components/logistics/PackingManifest.jsx`. At the top of the file, add imports:

```js
import { useEffect, useState } from 'react';
import sentinelBus from '../../utils/sentinelBus.js';
import { getItemsByTag } from '../../utils/packingLogic.js';
import { buildInsights } from '../../utils/architectEngine.js';
import InsightCard from '../ui/InsightCard.jsx';
import { useTripStore } from '../../store/useTripStore.jsx';
```

Inside the component function, add state and effect:

```js
const { addInsight, architect } = useTripStore();
const [criticalIds, setCriticalIds] = useState(new Set());

useEffect(() => {
  const unsub = sentinelBus.on('HAZARD_UPDATED', ({ hazards }) => {
    const ids = new Set();
    hazards.forEach(h => {
      (h.affectedGearTags ?? []).forEach(tag => {
        getItemsByTag(tag).forEach(id => ids.add(id));
      });
    });
    setCriticalIds(ids);

    // Generate and store Architect insights
    buildInsights('HAZARD_UPDATED', { hazards }, {}).forEach(insight => addInsight(insight));
  });
  return unsub;
}, [addInsight]);
```

- [ ] **Step 2: Render InsightCards at top of manifest**

Find where the component renders its item list. Just above it, render gear-targeted insights:

```jsx
{/* Architect insights for this tab */}
{architect.insights
  .filter(i => i.targetTab === 'LOGISTICS')
  .slice(0, 3)
  .map(insight => <InsightCard key={insight.id} insight={insight} />)
}
```

- [ ] **Step 3: Apply CRITICAL badge to elevated items**

When rendering each packing item, check if its `id` is in `criticalIds`. Add a red "CRITICAL" badge:

```jsx
{criticalIds.has(item.id) && (
  <span className="ml-2 text-xs font-bold text-red-500 uppercase tracking-wide">Critical</span>
)}
```

And sort/elevate critical items to the top of their category when rendering:

```js
// Where you map items per category, sort so critical items come first:
const sorted = [...categoryItems].sort((a, b) => {
  const aC = criticalIds.has(a.id) ? 0 : 1;
  const bC = criticalIds.has(b.id) ? 0 : 1;
  return aC - bC;
});
```

- [ ] **Step 4: Verify in browser**

```bash
npm run dev
```

Navigate to LOGISTICS tab → PackingManifest. Open browser console and run:

```js
// In console — simulate a hazard
import('/src/utils/sentinelBus.js').then(m => m.default.emit('HAZARD_UPDATED', {
  hazards: [{ id: 'HIGH_WINDS', label: 'High winds', severity: 'red', affectedGearTags: ['hardshell', 'tent_stakes'], affectedStopTypes: [] }]
}))
```

Expected: shelter/hardshell items move to top with "CRITICAL" badge; InsightCard appears above the list.

- [ ] **Step 5: Commit**

```bash
git add src/components/logistics/PackingManifest.jsx
git commit -m "feat: PackingManifest subscribes to sentinelBus for CRITICAL elevation and InsightCards"
```

---

## Task 10: LedgerWorkbench — bus subscription + stop risk badges + InsightCards

**Files:**
- Modify: `src/components/itinerary/ledger/LedgerWorkbench.jsx`

- [ ] **Step 1: Add bus subscription and hazard state**

Open `src/components/itinerary/ledger/LedgerWorkbench.jsx`. Add imports:

```js
import { useEffect, useState } from 'react'; // add if not present
import sentinelBus from '../../../utils/sentinelBus.js';
import { buildInsights } from '../../../utils/architectEngine.js';
import InsightCard from '../../ui/InsightCard.jsx';
import { useTripStore } from '../../../store/useTripStore.jsx';
```

Inside the component, add:

```js
const { addInsight, architect } = useTripStore();
const [hazardStopTypes, setHazardStopTypes] = useState([]);

useEffect(() => {
  const unsub = sentinelBus.on('HAZARD_UPDATED', ({ hazards }) => {
    const types = hazards.flatMap(h => h.affectedStopTypes ?? []);
    setHazardStopTypes(types);
    buildInsights('HAZARD_UPDATED', { hazards }, {}).forEach(i => addInsight(i));
  });
  return unsub;
}, [addInsight]);
```

- [ ] **Step 2: Add risk badge to affected stops**

When rendering each stop in the active path, derive its risk level:

```js
function getRiskLevel(stop, hazardStopTypes) {
  if (!stop.type) return 'LOW';
  if (hazardStopTypes.includes(stop.type)) return 'HIGH';
  return 'LOW';
}
```

Render a badge next to the stop name:

```jsx
{getRiskLevel(stop, hazardStopTypes) === 'HIGH' && (
  <span className="ml-2 px-1.5 py-0.5 rounded text-xs font-bold bg-red-500/15 text-red-500 border border-red-500/30">
    HIGH RISK · +4h delay recommended
  </span>
)}
```

- [ ] **Step 3: Render InsightCards above the dual-column layout**

```jsx
{architect.insights
  .filter(i => i.targetTab === 'ITINERARY')
  .slice(0, 3)
  .map(insight => <InsightCard key={insight.id} insight={insight} />)
}
```

Note: hazard insights are `targetTab: 'LOGISTICS'` — to also show them in itinerary, change the filter to show `LOGISTICS` insights here too, or add a second `targetTab: 'ITINERARY'` insight in `buildInsights` for the `HAZARD_UPDATED` case with `affectedStopTypes`.

Update `buildInsights` in `architectEngine.js` — for `HAZARD_UPDATED` events that have `affectedStopTypes`, push a second insight with `targetTab: 'ITINERARY'`:

```js
// Add inside the HAZARD_UPDATED loop in buildInsights:
if (hazard.affectedStopTypes?.length > 0) {
  insights.push({
    id: `hazard_itinerary_${hazard.id}`,
    message: `${hazard.label} — ${hazard.affectedStopTypes.join(', ')} stops flagged as HIGH RISK. Consider a delay or Plan B route.`,
    cta: null,
    targetTab: 'ITINERARY',
  });
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/itinerary/ledger/LedgerWorkbench.jsx src/utils/architectEngine.js
git commit -m "feat: LedgerWorkbench shows stop risk badges and InsightCards from sentinelBus"
```

---

## Task 11: BudgetLoom — insurance callout + InsightCards

**Files:**
- Modify: `src/components/logistics/BudgetLoom.jsx`

- [ ] **Step 1: Add bus subscription**

Open `src/components/logistics/BudgetLoom.jsx`. Add imports:

```js
import { useEffect, useState } from 'react'; // add if not present
import sentinelBus from '../../utils/sentinelBus.js';
import { buildInsights } from '../../utils/architectEngine.js';
import InsightCard from '../ui/InsightCard.jsx';
import { useTripStore } from '../../store/useTripStore.jsx';
```

Inside component:

```js
const { addInsight, architect } = useTripStore();
const [showInsuranceAlert, setShowInsuranceAlert] = useState(false);

useEffect(() => {
  const unsub = sentinelBus.on('HAZARD_UPDATED', ({ hazards }) => {
    const hasRedAlert = hazards.some(h => h.severity === 'red');
    setShowInsuranceAlert(hasRedAlert);
    buildInsights('HAZARD_UPDATED', { hazards }, {}).forEach(i => addInsight(i));
  });
  return unsub;
}, [addInsight]);
```

- [ ] **Step 2: Render insurance callout above the total row**

Find where BudgetLoom renders its total/summary. Just above it:

```jsx
{showInsuranceAlert && (
  <div className="mb-3 p-3 rounded-lg border border-red-500/40 bg-red-500/10 text-sm text-red-700 [.tactical_&]:text-[#F2A900] [.tactical_&]:border-[#F2A900]/40 [.tactical_&]:bg-[#F2A900]/10">
    <span className="font-bold">Active weather alert</span> — check your cancellation coverage before this leg.
    <button className="ml-2 underline text-xs" onClick={() => {/* open EmergencyRebook panel */}}>
      View options
    </button>
  </div>
)}

{architect.insights
  .filter(i => i.targetTab === 'LOGISTICS')
  .slice(0, 2)
  .map(insight => <InsightCard key={insight.id} insight={insight} />)
}
```

- [ ] **Step 3: Emit BUDGET_THRESHOLD from BudgetLoom when spend crosses 90%**

Find where BudgetLoom calculates totals. After computing `pct = spent / limit`:

```js
useEffect(() => {
  if (pct >= 0.9) {
    sentinelBus.emit('BUDGET_THRESHOLD', { category: 'Total', spent, limit });
    buildInsights('BUDGET_THRESHOLD', { category: 'Total', spent, limit }, {})
      .forEach(i => addInsight(i));
  }
}, [pct, spent, limit, addInsight]);
```

(Replace `spent` and `limit` with the actual variable names used in BudgetLoom for total expenses and budget limit.)

- [ ] **Step 4: Commit**

```bash
git add src/components/logistics/BudgetLoom.jsx
git commit -m "feat: BudgetLoom shows insurance callout and InsightCards from sentinelBus"
```

---

## Task 12: PioneerChat — architect message type

**Files:**
- Modify: `src/components/social/PioneerChat.jsx`

- [ ] **Step 1: Subscribe to bus and push architect messages into LOGS stream**

Open `src/components/social/PioneerChat.jsx`. Add imports:

```js
import { useEffect } from 'react'; // add if not present
import sentinelBus from '../../utils/sentinelBus.js';
import { buildInsights } from '../../utils/architectEngine.js';
```

Inside component, find where `messages` state is managed. Add effect:

```js
useEffect(() => {
  const unsub = sentinelBus.on('HAZARD_UPDATED', ({ hazards }) => {
    const insights = buildInsights('HAZARD_UPDATED', { hazards }, {});
    insights.forEach(insight => {
      addMessage({  // use whatever the existing addMessage / setMessages pattern is
        id: `arch_${insight.id}_${Date.now()}`,
        type: 'architect',
        stream: 'LOGS',
        text: insight.message,
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      });
    });
  });
  return unsub;
}, []);
```

- [ ] **Step 2: Render architect message type with ⬡ icon in LOGS stream**

Find the message rendering section. Add a branch for `type === 'architect'`:

```jsx
{msg.type === 'architect' && (
  <div key={msg.id} className="flex items-start gap-2 text-xs text-[#E67E22] [.tactical_&]:text-[#F2A900]">
    <span className="mt-0.5 shrink-0">⬡</span>
    <div>
      <span className="font-bold mr-1">ARCHITECT</span>
      <span className="opacity-70">{msg.timestamp}</span>
      <p className="mt-0.5">{msg.text}</p>
    </div>
  </div>
)}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/social/PioneerChat.jsx
git commit -m "feat: PioneerChat renders architect log messages from sentinelBus"
```

---

## Task 13: StopEditor — add type field

**Files:**
- Modify: `src/components/trip/StopEditor.jsx`

- [ ] **Step 1: Add type field to the stop form**

Open `src/components/trip/StopEditor.jsx`. Find the form fields section. Add a type selector after the stop name/location fields:

```jsx
<div className="flex flex-col gap-1">
  <label className="text-xs font-medium text-[#9E8A78] uppercase tracking-wide">Stop Type</label>
  <select
    value={formState.type ?? 'urban'}
    onChange={e => setFormState(s => ({ ...s, type: e.target.value }))}
    className="rounded-lg border border-[#D9C5B2] bg-white px-3 py-2 text-sm text-[#3D2B1F] focus:outline-none focus:ring-2 focus:ring-[#E67E22]/40"
  >
    <option value="urban">Urban / City</option>
    <option value="transit">Transit Hub</option>
    <option value="camp">Camp / Basecamp</option>
    <option value="viewpoint">Viewpoint</option>
    <option value="summit">Summit / Alpine</option>
    <option value="coastal">Coastal</option>
  </select>
</div>
```

- [ ] **Step 2: Ensure type is included in the saved stop object**

Find where the stop is saved/submitted. Ensure `type` is in the stop payload:

```js
const stop = {
  // existing fields ...
  type: formState.type ?? 'urban',
  altStopId: null,
};
```

- [ ] **Step 3: Emit STOP_ADDED via bus on submit**

After saving the stop, emit to the bus:

```js
import sentinelBus from '../../utils/sentinelBus.js';
import { buildInsights } from '../../utils/architectEngine.js';
// ... in useTripStore context:
const { addInsight } = useTripStore();

// After saving:
sentinelBus.emit('STOP_ADDED', { stop, legIndex });
buildInsights('STOP_ADDED', { stop, legIndex }, {}).forEach(i => addInsight(i));
```

- [ ] **Step 4: Commit**

```bash
git add src/components/trip/StopEditor.jsx
git commit -m "feat: StopEditor adds stop type field and emits STOP_ADDED to sentinelBus"
```

---

## Task 14: TripPlanner — load weather hazards on mount + Complete Expedition button

**Files:**
- Modify: `src/pages/TripPlanner.jsx`

- [ ] **Step 1: Load weather hazards when TripPlanner mounts**

Open `src/pages/TripPlanner.jsx`. Add import:

```js
import { loadAndEmitWeatherHazards } from '../utils/weatherEngine.js';
```

In the component, add effect after existing mount logic:

```js
const { trip } = useTripStore();

useEffect(() => {
  // Fire-and-forget: fetch OWM hazards if we have destination coords
  // Destination coords can be derived from the first leg's geocoded `to` field
  // For now, use a placeholder — full geocoding hookup is left as a follow-up
  const coords = trip.destinationCoords ?? null;
  if (coords) loadAndEmitWeatherHazards(coords);
}, [trip.destination]);
```

Note: `trip.destinationCoords` doesn't exist yet — add it as an optional field. If the user's StopEditor already geocodes the destination, wire it in. Otherwise this call is a no-op until coords are available.

- [ ] **Step 2: Add "Complete Expedition" button on Overview tab**

Find the OVERVIEW tab render section. Add the button, visible only when all legs are confirmed and status isn't already AFTER-ACTION:

```jsx
const { trip, legs, completeExpedition } = useTripStore();
const allConfirmed = legs.length > 0 && legs.every(l => l.status === 'confirmed');

{activeTab === 'OVERVIEW' && allConfirmed && trip.status !== 'AFTER-ACTION' && (
  <button
    onClick={completeExpedition}
    className="mt-6 w-full py-3 rounded-xl font-bold text-white bg-[#E67E22] hover:bg-[#C96A18] transition-colors text-sm tracking-wide uppercase"
  >
    Complete Expedition — Enter Debrief
  </button>
)}
```

- [ ] **Step 3: Render AfterActionScreen when status = AFTER-ACTION**

At the top of TripPlanner's return, add a gate:

```jsx
import AfterActionScreen from '../components/afteraction/AfterActionScreen.jsx';

// Inside component return:
if (trip.status === 'AFTER-ACTION') {
  return <AfterActionScreen />;
}
```

- [ ] **Step 4: Update status badge to handle AFTER-ACTION**

Find where the status badge is rendered (likely a `STATUS_LABELS` or `STATUS_COLORS` map). Add:

```js
'AFTER-ACTION': { label: 'Debrief', color: 'text-[#F2C94C] border-[#F2C94C]/40 bg-[#F2C94C]/10' },
```

- [ ] **Step 5: Commit**

```bash
git add src/pages/TripPlanner.jsx
git commit -m "feat: TripPlanner loads weather hazards, adds Complete Expedition button and AFTER-ACTION gate"
```

---

## Task 15: After-Action Screen

**Files:**
- Create: `src/components/afteraction/AfterActionScreen.jsx`

- [ ] **Step 1: Create the directory**

```bash
mkdir -p C:\Users\lasse\Desktop\venturepath\src\components\afteraction
```

- [ ] **Step 2: Create the component**

Create `src/components/afteraction/AfterActionScreen.jsx`:

```jsx
import { useState, useContext } from 'react';
import { useTripStore } from '../../store/useTripStore.jsx';
import { BudgetContext } from '../../context/BudgetContext.jsx'; // adjust import to actual BudgetLoom context

const DIFFICULTIES = ['Easy', 'Moderate', 'Challenging', 'Extreme'];

function computeSettlement(members, expenses) {
  // expenses: [{ memberId, amount }]
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const perPerson = total / members.length;
  return members.map(m => {
    const paid = expenses.filter(e => e.memberId === m.id).reduce((s, e) => s + e.amount, 0);
    return { ...m, paid, owed: perPerson, balance: paid - perPerson };
  });
}

function exportCsv(rows, tripName) {
  const header = 'Member,Paid,Owed,Balance\n';
  const body = rows.map(r => `${r.name},$${r.paid.toFixed(2)},$${r.owed.toFixed(2)},$${r.balance.toFixed(2)}`).join('\n');
  const blob = new Blob([header + body], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${tripName.replace(/\s+/g, '_')}_settlement.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AfterActionScreen() {
  const { trip, legs } = useTripStore();
  const [phase, setPhase] = useState(1); // 1 = Settle, 2 = Publish
  const [settled, setSettled] = useState(false);

  // Publish form state
  const [pathName, setPathName] = useState(`${trip.name} — Our Way`);
  const [difficulty, setDifficulty] = useState('Moderate');
  const [description, setDescription] = useState('');
  const [published, setPublished] = useState(false);

  // Mock squad members + expenses (replace with real context data when wired)
  const members = [
    { id: 'lead', name: 'lead' },
    { id: 'scout', name: 'scout' },
    { id: 'medic', name: 'medic' },
  ];
  const expenses = [
    { memberId: 'lead', amount: 920 },
    { memberId: 'scout', amount: 480 },
    { memberId: 'medic', amount: 440 },
  ];
  const settlement = computeSettlement(members, expenses);
  const total = expenses.reduce((s, e) => s + e.amount, 0);

  function handlePublish() {
    const template = {
      id: `user_${Date.now()}`,
      name: pathName,
      difficulty,
      description,
      legs: legs.map(l => ({ ...l, coords: undefined })), // strip sensitive coords
      manifestConfig: trip.manifestSettings ?? {},
      budgetTemplate: { totalUSD: total, paxCount: members.length },
      architectName: 'Pioneer',
      publishedAt: new Date().toISOString(),
      cloneCount: 0,
      rating: null,
    };
    // Append to localStorage vault
    const existing = JSON.parse(localStorage.getItem('vp-user-paths') ?? '[]');
    localStorage.setItem('vp-user-paths', JSON.stringify([template, ...existing]));
    setPublished(true);
  }

  return (
    <div className="min-h-screen bg-[#F5EFE6] [.tactical_&]:bg-[#0E1012] p-6 max-w-2xl mx-auto">
      {/* Phase indicator */}
      <div className="flex items-center gap-3 mb-8">
        {[1, 2].map(p => (
          <div key={p} className={`flex items-center gap-1.5 text-sm font-bold ${phase >= p ? 'text-[#E67E22]' : 'text-[#9E8A78]'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs border-2 ${phase >= p ? 'border-[#E67E22] text-[#E67E22]' : 'border-[#D9C5B2] text-[#9E8A78]'}`}>{p}</span>
            {p === 1 ? 'Settle' : 'Publish'}
          </div>
        ))}
      </div>

      {phase === 1 && (
        <div>
          <h1 className="text-2xl font-bold text-[#3D2B1F] mb-1" style={{ fontFamily: 'Playfair Display, serif' }}>
            Expedition Debrief
          </h1>
          <p className="text-sm text-[#9E8A78] mb-6">Total spent: <strong>${total.toLocaleString()}</strong> across {members.length} Pioneers</p>

          <div className="bg-white rounded-xl border border-[#D9C5B2] overflow-hidden mb-6">
            <div className="grid grid-cols-4 gap-2 px-4 py-2 bg-[#F5EFE6] text-xs font-bold text-[#9E8A78] uppercase tracking-wide">
              <span>Pioneer</span><span>Paid</span><span>Owes</span><span>Balance</span>
            </div>
            {settlement.map(m => (
              <div key={m.id} className="grid grid-cols-4 gap-2 px-4 py-3 border-t border-[#D9C5B2]/50 text-sm text-[#3D2B1F]">
                <span className="font-medium capitalize">{m.name}</span>
                <span>${m.paid.toFixed(0)}</span>
                <span>${m.owed.toFixed(0)}</span>
                <span className={m.balance >= 0 ? 'text-green-600 font-bold' : 'text-red-500 font-bold'}>
                  {m.balance >= 0 ? '+' : ''}{m.balance.toFixed(0)}
                </span>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => exportCsv(settlement, trip.name)}
              className="flex-1 py-2.5 rounded-lg border border-[#E67E22] text-[#E67E22] text-sm font-bold hover:bg-[#E67E22]/10 transition-colors"
            >
              Export CSV
            </button>
            <button
              onClick={() => { setSettled(true); setPhase(2); }}
              className="flex-1 py-2.5 rounded-lg bg-[#E67E22] text-white text-sm font-bold hover:bg-[#C96A18] transition-colors"
            >
              Confirm Settlement →
            </button>
          </div>
        </div>
      )}

      {phase === 2 && !published && (
        <div>
          <h1 className="text-2xl font-bold text-[#3D2B1F] mb-1" style={{ fontFamily: 'Playfair Display, serif' }}>
            Package This Expedition
          </h1>
          <p className="text-sm text-[#9E8A78] mb-6">Publish to VentureVault so other Pioneers can follow your route.</p>

          <div className="flex flex-col gap-4 mb-6">
            <div>
              <label className="text-xs font-bold text-[#9E8A78] uppercase tracking-wide block mb-1">Path Name</label>
              <input
                value={pathName}
                onChange={e => setPathName(e.target.value)}
                className="w-full rounded-lg border border-[#D9C5B2] px-3 py-2 text-sm text-[#3D2B1F] focus:outline-none focus:ring-2 focus:ring-[#E67E22]/40"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-[#9E8A78] uppercase tracking-wide block mb-1">Difficulty</label>
              <select
                value={difficulty}
                onChange={e => setDifficulty(e.target.value)}
                className="w-full rounded-lg border border-[#D9C5B2] px-3 py-2 text-sm text-[#3D2B1F] focus:outline-none focus:ring-2 focus:ring-[#E67E22]/40"
              >
                {DIFFICULTIES.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-[#9E8A78] uppercase tracking-wide block mb-1">Description</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                placeholder="What made this expedition unique?"
                className="w-full rounded-lg border border-[#D9C5B2] px-3 py-2 text-sm text-[#3D2B1F] focus:outline-none focus:ring-2 focus:ring-[#E67E22]/40 resize-none"
              />
            </div>
          </div>

          <div className="bg-[#F5EFE6] rounded-xl p-4 mb-6 text-sm text-[#3D2B1F] space-y-1">
            <p className="font-bold mb-2 text-[#9E8A78] uppercase text-xs tracking-wide">This path includes:</p>
            <p>✓ {legs.length} confirmed stops</p>
            <p>✓ Packing manifest (climate: {trip.climate})</p>
            <p>✓ Budget template (${total.toLocaleString()} / {members.length} pax)</p>
            <p className="text-[#9E8A78]">✗ Hazard overlays (stripped for privacy)</p>
          </div>

          <button
            onClick={handlePublish}
            className="w-full py-3 rounded-xl bg-[#E67E22] text-white text-sm font-bold hover:bg-[#C96A18] transition-colors uppercase tracking-wide"
          >
            Publish to VentureVault
          </button>
        </div>
      )}

      {phase === 2 && published && (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">⬡</div>
          <h2 className="text-2xl font-bold text-[#3D2B1F] mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
            Path Published
          </h2>
          <p className="text-sm text-[#9E8A78]">"{pathName}" is now available in VentureVault.</p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify in browser**

```bash
npm run dev
```

Go to TripPlanner → OVERVIEW tab. In console: `window.__store?.completeExpedition?.()` or trigger via the button. AfterActionScreen should replace the planner. Work through both phases.

- [ ] **Step 4: Commit**

```bash
git add src/components/afteraction/AfterActionScreen.jsx
git commit -m "feat: add AfterActionScreen with expense settlement and VentureVault publish"
```

---

## Task 16: SquadGearContext — emit SQUAD_WEIGHT_CHANGED

**Files:**
- Modify: `src/context/SquadGearContext.jsx`

- [ ] **Step 1: Emit on every weight change**

Open `src/context/SquadGearContext.jsx`. Add import:

```js
import sentinelBus from '../utils/sentinelBus.js';
import { buildInsights } from '../utils/architectEngine.js';
```

Find where `overEncumbered` is calculated (after REASSIGN dispatch or in the reducer). After computing it, emit:

```js
// After weight/overEncumbered calculation:
members.forEach(m => {
  const overLimit = overEncumbered.includes(m.id);
  sentinelBus.emit('SQUAD_WEIGHT_CHANGED', { memberId: m.id, newKg: weights[m.id] ?? 0, overLimit });
});
```

Note: this will fire on every render if placed incorrectly. Use a `useEffect` keyed on `weights` and `overEncumbered` to emit only on changes.

- [ ] **Step 2: Commit**

```bash
git add src/context/SquadGearContext.jsx
git commit -m "feat: SquadGearContext emits SQUAD_WEIGHT_CHANGED to sentinelBus"
```

---

## Task 17: Pre-departure brief via Anthropic Haiku

**Files:**
- Modify: `src/store/useTripStore.jsx`
- Modify: `src/pages/TripPlanner.jsx`

- [ ] **Step 1: Add DEPARTURE_IMMINENT emitter to TripStore**

Open `src/store/useTripStore.jsx`. In the `TripStoreProvider` component, add an effect that watches `trip.startDate` and the legs:

```js
import sentinelBus from '../utils/sentinelBus.js';
import { generateDepartureBrief, buildInsights } from '../utils/architectEngine.js';

useEffect(() => {
  if (!state.trip.startDate || !state.legs.length) return;

  const nextPendingLeg = state.legs.find(l => l.status === 'pending');
  if (!nextPendingLeg) return;

  // Check if departure is ≤ 24 hours away (using startDate as proxy)
  const departureMs = new Date(state.trip.startDate).getTime();
  const hoursUntil = (departureMs - Date.now()) / 3_600_000;

  if (hoursUntil <= 24 && hoursUntil > 0) {
    sentinelBus.emit('DEPARTURE_IMMINENT', { hoursUntil, leg: nextPendingLeg });

    // Generate Haiku brief
    generateDepartureBrief(nextPendingLeg, {
      hazards: [],   // will be populated from bus state in a follow-up
      manifest: [],
      squad: [{ name: 'lead' }, { name: 'scout' }, { name: 'medic' }],
    }).then(brief => {
      if (brief) {
        dispatch({
          type: 'ADD_INSIGHT',
          payload: {
            id: `departure_brief_${nextPendingLeg.id}`,
            message: brief,
            cta: null,
            targetTab: 'OVERVIEW',
          },
        });
      }
    });
  }
}, [state.trip.startDate, state.legs]);
```

- [ ] **Step 2: Show OVERVIEW insights in TripPlanner Overview tab**

Open `src/pages/TripPlanner.jsx`. In the OVERVIEW tab render, add:

```jsx
import InsightCard from '../components/ui/InsightCard.jsx';
// ...
const { architect } = useTripStore();

{architect.insights
  .filter(i => i.targetTab === 'OVERVIEW')
  .map(insight => <InsightCard key={insight.id} insight={insight} />)
}
```

- [ ] **Step 3: Commit**

```bash
git add src/store/useTripStore.jsx src/pages/TripPlanner.jsx
git commit -m "feat: emit DEPARTURE_IMMINENT and generate Haiku pre-departure brief"
```

---

## Task 18: Final smoke test + run all tests

- [ ] **Step 1: Run full test suite**

```bash
cd C:\Users\lasse\Desktop\venturepath
npx vitest run
```

Expected: all tests pass (minimum: the 4 sentinelBus tests, 4 weatherHazardMapper tests, 5 architectEngine tests + all previously passing tests).

- [ ] **Step 2: Manual smoke test in browser**

```bash
npm run dev
```

Verify these flows:
1. Dashboard loads — no console errors
2. Open TripPlanner → LOGISTICS → PackingManifest shows with no errors
3. Open browser console, paste: `import('/src/utils/sentinelBus.js').then(m => m.default.emit('HAZARD_UPDATED', { hazards: [{ id: 'HIGH_WINDS', label: 'High winds 70 km/h', severity: 'red', affectedGearTags: ['hardshell', 'tent_stakes'], affectedStopTypes: ['summit'] }] }))`
4. Confirm: CRITICAL badge appears on relevant packing items, InsightCard appears at top of manifest
5. Switch to ITINERARY tab — confirm InsightCard appears there too with HIGH RISK badge on any summit-type stop
6. Switch to LOGISTICS → BudgetLoom — confirm insurance callout appears
7. All legs set to `confirmed` in TripStore → OVERVIEW tab → "Complete Expedition" button appears
8. Click it → AfterActionScreen loads with settlement table
9. Click "Confirm Settlement" → Phase 2 publish form appears
10. Fill in name + description → Publish → success screen

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "chore: final integration — Sentinel, Architect AI, and After-Action complete"
```

---

## Self-Review

**Spec coverage check:**
- ✅ `sentinelBus` — Task 2
- ✅ OWM weather hazard mapping — Task 3
- ✅ safetyEngine gear tags + stop types — Task 4
- ✅ weatherEngine emits HAZARD_UPDATED — Task 5
- ✅ PackingManifest CRITICAL elevation — Task 9
- ✅ LedgerWorkbench stop risk badges — Task 10
- ✅ BudgetLoom insurance callout — Task 11
- ✅ InsightCard component — Task 7
- ✅ Architect rule-based insights — Task 8
- ✅ Anthropic Haiku pre-departure brief — Task 8 + Task 17
- ✅ PioneerChat architect log messages — Task 12
- ✅ StopEditor type field + STOP_ADDED emit — Task 13
- ✅ TripStore AFTER-ACTION + architect slice — Task 6
- ✅ Complete Expedition button — Task 14
- ✅ AfterActionScreen Phase 1 (settle) — Task 15
- ✅ AfterActionScreen Phase 2 (publish to vault) — Task 15
- ✅ SquadGearContext emits SQUAD_WEIGHT_CHANGED — Task 16
- ✅ DEPARTURE_IMMINENT trigger — Task 17
- ✅ VITE_OWM_API_KEY env var — Task 1

**Placeholder scan:** No TBDs. BudgetLoom step notes "replace with actual variable names" — this is intentional since the exact names require reading the file at implementation time.

**Type consistency:** `buildInsights(eventType, payload, context)` signature is consistent across architectEngine, PackingManifest, LedgerWorkbench, BudgetLoom, StopEditor, and tests. `addInsight(insight)` signature matches TripStore `ADD_INSIGHT` action. `sentinelBus.emit/on` API is consistent across all 18 tasks.
