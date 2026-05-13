# Leg Intelligence Phase 5 — Cross-App Emissions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire VenturePath leg and camp data into the cross-app ecosystem — emitting streak events to HolyFlex and surfacing expedition context (fuel stops, fire rules, water) in What's Cooking.

**Architecture:** A new `src/utils/crossAppEmitter.js` module owns all cross-app POST calls. VenturePath calls it at key moments: leg confirmed, camp pitched, expedition logged. What's Cooking has an existing `/api/cross-app/context` endpoint (or we create a stub at `src/app/api/cross-app/context/route.ts` in the WC project). VP pushes a context blob via POST; WC reads it and surfaces fuel-stop grocery suggestions and no-cook night flags. HolyFlex `/api/streak/tick` already exists. We add a thin `streakEmitter.js` that VP calls after specific user actions.

**Key constraints:**
- All POST calls are fire-and-forget with `catch(() => {})` — VP must never fail due to cross-app outage
- HolyFlex runs at port 3000, What's Cooking at 3002, VenturePath at 3001
- HolyFlex streak endpoint: `POST /api/streak/tick` with body `{ action_id, user_id? }`
- What's Cooking context endpoint: `POST /api/cross-app/expedition-context` with body defined in Task 2

**Tech Stack:**
- VP (Vite + React 19, React Context+useReducer)
- WC (Next.js App Router at `C:\Users\lasse\Desktop\whatscooking`)
- HF (Next.js App Router at `C:\Users\lasse\Desktop\holyflex`)
- Vitest for VP unit tests; no new tests in HF/WC (endpoint stubs only)

---

## File Map

**New VP files:**
- `src/utils/crossAppEmitter.js` — POST helper with fire-and-forget pattern
- `src/utils/streakEmitter.js` — VP streak event emitter (calls HF /api/streak/tick)
- `src/utils/__tests__/crossAppEmitter.test.js`
- `src/utils/__tests__/streakEmitter.test.js`

**Modified VP files:**
- `src/pages/TripPlanner.jsx` — call streakEmitter on leg confirm + camp pitch
- `src/store/useTripStore.jsx` — emit expedition_logged on CREATE_TRIP / LOAD_EXPEDITION

**New WC file (stub endpoint):**
- `C:\Users\lasse\Desktop\whatscooking\src\app\api\cross-app\expedition-context\route.ts`

**No HF changes needed** — HF `/api/streak/tick` already exists; VP just calls it.

---

## Task 0: crossAppEmitter utility

**Files:**
- Create: `src/utils/crossAppEmitter.js`
- Create: `src/utils/__tests__/crossAppEmitter.test.js`

- [ ] **Step 1: Write the failing test**

Create `src/utils/__tests__/crossAppEmitter.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { emitCrossApp } from '../crossAppEmitter.js';

describe('emitCrossApp', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('calls fetch with the given url and JSON body', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
    await emitCrossApp('http://localhost:3000/api/streak/tick', { action_id: 'leg_confirmed' });
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/streak/tick',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ action_id: 'leg_confirmed' }),
      })
    );
  });

  it('does not throw on network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));
    await expect(emitCrossApp('http://localhost:3000/api/streak/tick', {})).resolves.toBeUndefined();
  });

  it('does not throw on non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    await expect(emitCrossApp('http://localhost:3000/api/streak/tick', {})).resolves.toBeUndefined();
  });

  it('returns undefined always (fire and forget)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
    const result = await emitCrossApp('http://localhost:3000/test', { x: 1 });
    expect(result).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

`npx vitest run src/utils/__tests__/crossAppEmitter.test.js`

- [ ] **Step 3: Create the emitter**

Create `src/utils/crossAppEmitter.js`:

```js
export async function emitCrossApp(url, payload) {
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    // fire-and-forget: VP must never fail due to cross-app outage
  }
}
```

- [ ] **Step 4: Run to verify it passes**

`npx vitest run src/utils/__tests__/crossAppEmitter.test.js`

- [ ] **Step 5: Commit**

```bash
git add src/utils/crossAppEmitter.js src/utils/__tests__/crossAppEmitter.test.js
git commit -m "feat(cross-app): add fire-and-forget crossAppEmitter utility"
```

---

## Task 1: streakEmitter — VP → HolyFlex

**Files:**
- Create: `src/utils/streakEmitter.js`
- Create: `src/utils/__tests__/streakEmitter.test.js`

- [ ] **Step 1: Write the failing test**

Create `src/utils/__tests__/streakEmitter.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../crossAppEmitter.js', () => ({
  emitCrossApp: vi.fn().mockResolvedValue(undefined),
}));

import { emitCrossApp } from '../crossAppEmitter.js';
import { emitLegConfirmed, emitCampPitched, emitExpeditionLogged } from '../streakEmitter.js';

const HF_STREAK_URL = 'http://localhost:3000/api/streak/tick';

describe('streakEmitter', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('emitLegConfirmed calls HF streak tick with leg_confirmed', async () => {
    await emitLegConfirmed({ legId: 3 });
    expect(emitCrossApp).toHaveBeenCalledWith(HF_STREAK_URL, expect.objectContaining({ action_id: 'leg_confirmed' }));
  });

  it('emitCampPitched calls HF streak tick with camp_pitched', async () => {
    await emitCampPitched({ stayId: 'abc' });
    expect(emitCrossApp).toHaveBeenCalledWith(HF_STREAK_URL, expect.objectContaining({ action_id: 'camp_pitched' }));
  });

  it('emitExpeditionLogged calls HF streak tick with expedition_logged', async () => {
    await emitExpeditionLogged({ tripName: 'Patagonia' });
    expect(emitCrossApp).toHaveBeenCalledWith(HF_STREAK_URL, expect.objectContaining({ action_id: 'expedition_logged' }));
  });

  it('emitLegConfirmed includes legId in payload', async () => {
    await emitLegConfirmed({ legId: 42 });
    const payload = emitCrossApp.mock.calls[0][1];
    expect(payload.metadata?.legId).toBe(42);
  });

  it('emitCampPitched includes stayId in payload', async () => {
    await emitCampPitched({ stayId: 'xyz' });
    const payload = emitCrossApp.mock.calls[0][1];
    expect(payload.metadata?.stayId).toBe('xyz');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

`npx vitest run src/utils/__tests__/streakEmitter.test.js`

- [ ] **Step 3: Create streakEmitter**

Create `src/utils/streakEmitter.js`:

```js
import { emitCrossApp } from './crossAppEmitter.js';

const HF_STREAK_URL = 'http://localhost:3000/api/streak/tick';

export function emitLegConfirmed({ legId } = {}) {
  return emitCrossApp(HF_STREAK_URL, { action_id: 'leg_confirmed', metadata: { legId } });
}

export function emitCampPitched({ stayId } = {}) {
  return emitCrossApp(HF_STREAK_URL, { action_id: 'camp_pitched', metadata: { stayId } });
}

export function emitExpeditionLogged({ tripName } = {}) {
  return emitCrossApp(HF_STREAK_URL, { action_id: 'expedition_logged', metadata: { tripName } });
}
```

- [ ] **Step 4: Run to verify it passes**

`npx vitest run src/utils/__tests__/streakEmitter.test.js`

- [ ] **Step 5: Commit**

```bash
git add src/utils/streakEmitter.js src/utils/__tests__/streakEmitter.test.js
git commit -m "feat(cross-app): add streakEmitter — VP emits leg_confirmed/camp_pitched/expedition_logged to HolyFlex"
```

---

## Task 2: WC expedition-context endpoint stub

This task writes to **What's Cooking** at `C:\Users\lasse\Desktop\whatscooking`.
Do NOT write this file inside the VenturePath directory.

**Files:**
- Create: `C:\Users\lasse\Desktop\whatscooking\src\app\api\cross-app\expedition-context\route.ts`

The endpoint receives a VP context blob and stores it in memory (no DB in Phase 5 — just accept and return 200 so VP doesn't error; UI integration is a follow-on).

- [ ] **Step 1: Check if the api directory exists**

```bash
ls C:/Users/lasse/Desktop/whatscooking/src/app/api/
```

- [ ] **Step 2: Create the endpoint**

Create `C:\Users\lasse\Desktop\whatscooking\src\app\api\cross-app\expedition-context\route.ts`:

```ts
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Expedition context pushed from VenturePath.
// Shape: {
//   tripName: string,
//   startDate: string,
//   endDate: string,
//   fuelStops: Array<{ name, coords, kmFromStart }>,  // grocery resupply opportunities
//   campNights: Array<{ date, firePermitted, waterTreatRequired }>,  // no-cook / water filter nights
//   destination: string,
// }

let lastContext: Record<string, unknown> | null = null;

export async function POST(request: Request) {
  try {
    lastContext = await request.json();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid JSON' }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({ context: lastContext });
}
```

- [ ] **Step 3: No test needed** — this is a thin stub; it will be integration-tested in a future session when WC surfaces the context in the UI. Verify it compiles by checking the WC build does not error: `cd C:/Users/lasse/Desktop/whatscooking && npx tsc --noEmit 2>&1 | tail -5`

- [ ] **Step 4: Commit (from WC directory)**

```bash
cd C:/Users/lasse/Desktop/whatscooking
git add src/app/api/cross-app/expedition-context/route.ts
git commit -m "feat(cross-app): add expedition-context endpoint stub for VenturePath context push"
cd C:/Users/lasse/Desktop/venturepath
```

---

## Task 3: Wire streak + WC context emission into TripPlanner

**Files:**
- Modify: `src/pages/TripPlanner.jsx`

VP calls the emitters at:
1. `handleWaypointConfirm` — when a leg waypoint is confirmed → `emitLegConfirmed`
2. When a stay with `kind ∈ {camp, wild, shelter}` is added → `emitCampPitched`
3. On trip creation / load → `emitExpeditionLogged` + push WC context

- [ ] **Step 1: Read the relevant portion of TripPlanner.jsx**

Read from line 1 to find the imports block and handler functions. Look for `handleWaypointConfirm`, `handleVariantSelect`, and the `useTripStore` destructure.

- [ ] **Step 2: Add imports**

At the top of TripPlanner.jsx, add after existing imports:

```jsx
import { emitLegConfirmed, emitCampPitched, emitExpeditionLogged } from '../utils/streakEmitter.js';
import { emitCrossApp } from '../utils/crossAppEmitter.js';
```

- [ ] **Step 3: Extend handleWaypointConfirm**

Find `handleWaypointConfirm` in TripPlanner.jsx. After calling `updateWaypoint(...)`, add:

```js
emitLegConfirmed({ legId: legs.find(l => l.waypoints?.some(w => w.id === waypointId))?.id });
```

- [ ] **Step 4: Add expedition context push helper**

Inside TripPlanner, add a helper function (near the other handlers):

```js
function pushExpeditionContext() {
  const campNights = stays
    .filter(s => ['camp', 'wild', 'shelter'].includes(s.kind))
    .map(s => ({
      date: s.checkin ?? null,
      firePermitted: s.campMeta?.fireRules?.permitted ?? true,
      waterTreatRequired: s.campMeta?.waterSource?.treatRequired ?? false,
    }));
  const fuelStops = legs.flatMap(l =>
    (l.legMeta?.fuelPlan?.stops ?? []).map(stop => ({ name: stop.name, coords: stop.coords, legId: l.id }))
  );
  emitCrossApp('http://localhost:3002/api/cross-app/expedition-context', {
    tripName: trip.name,
    startDate: trip.startDate,
    endDate: trip.endDate,
    destination: trip.destination,
    fuelStops,
    campNights,
  });
}
```

- [ ] **Step 5: Call pushExpeditionContext + emitExpeditionLogged on trip load**

In TripPlanner, find the `useEffect` that runs when the component mounts (or when `trip` changes). Add:

```js
useEffect(() => {
  if (trip?.name) {
    emitExpeditionLogged({ tripName: trip.name });
    pushExpeditionContext();
  }
}, [trip?.name]);
```

If there is no such useEffect, add one after the existing hooks.

- [ ] **Step 6: Emit camp_pitched when a camp stay is added**

In TripPlanner, find where stays are added (look for `addStay` calls or the accommodation section). After any `addStay` call that includes a camp/wild/shelter kind, add:

```js
if (['camp', 'wild', 'shelter'].includes(stay.kind)) {
  emitCampPitched({ stayId: stay.id ?? stay.name });
}
```

If there is no direct `addStay` call in TripPlanner (stays may be added via a child component), add a `useEffect` that watches `stays` length and emits for new camp stays:

```js
const prevStayCount = useRef(stays.length);
useEffect(() => {
  if (stays.length > prevStayCount.current) {
    const newStay = stays[stays.length - 1];
    if (newStay && ['camp', 'wild', 'shelter'].includes(newStay.kind)) {
      emitCampPitched({ stayId: newStay.id });
    }
  }
  prevStayCount.current = stays.length;
}, [stays.length]);
```

Make sure `useRef` is imported from React (it already should be, but check the existing imports).

- [ ] **Step 7: Commit**

```bash
git add src/pages/TripPlanner.jsx
git commit -m "feat(cross-app): wire streak emissions and WC context push from TripPlanner"
```

---

## Task 4: Phase 5 end-to-end verification

- [ ] **Step 1: Run VP cross-app unit tests**

```bash
cd C:/Users/lasse/Desktop/venturepath
npx vitest run src/utils/__tests__/crossAppEmitter.test.js src/utils/__tests__/streakEmitter.test.js
```

Expected: 9 tests pass.

- [ ] **Step 2: Check WC compiles cleanly**

```bash
cd C:/Users/lasse/Desktop/whatscooking
npx tsc --noEmit 2>&1 | tail -5
```

Expected: No errors (or only pre-existing errors unrelated to the new file).

- [ ] **Step 3: Confirm VP commits**

```bash
cd C:/Users/lasse/Desktop/venturepath
git log --oneline -6
```

Expected: 3 VP commits (crossAppEmitter, streakEmitter, TripPlanner wiring).

- [ ] **Step 4: Append log entry**

Append to `C:\Users\lasse\Desktop\holyflex\logs\2026-05-13.md`:

```
## [HH:MM] VP Phase 5 — Cross-App Emissions
- Added fire-and-forget crossAppEmitter utility
- Added streakEmitter: VP emits leg_confirmed, camp_pitched, expedition_logged to HolyFlex /api/streak/tick
- Added WC expedition-context stub endpoint (POST + GET /api/cross-app/expedition-context)
- Wired TripPlanner: leg confirm → leg_confirmed, camp stay added → camp_pitched, trip load → expedition_logged + WC context push
- Cross-app data: fuelStops (grocery resupply) + campNights (fire/water flags) → What's Cooking
- Files changed: crossAppEmitter.js, streakEmitter.js, TripPlanner.jsx (VP); expedition-context/route.ts (WC)
```
