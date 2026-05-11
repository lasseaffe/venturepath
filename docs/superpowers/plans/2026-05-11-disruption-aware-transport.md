# Disruption-Aware Multi-Modal Transport Builder — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add bus and tram modes with live DB schedules, GTFS-RT disruption alerts, and automatic cascade connection-miss detection with cross-modal Rome2rio alternative finding to the multi-leg transport builder.

**Architecture:** `v6.db.transport.rest` (keyless, Hafas backend) serves as the single schedule source for all ground modes (train, bus, tram) — it handles product filtering natively. A `DisruptionEngine` polls live trip delay data every 90s and runs cascade math across consecutive confirmed legs. `AlternativeEngine` calls Rome2rio for cross-modal rerouting on disruption, falling back to DB-Rest journeys if quota is exhausted.

**Tech Stack:** React 18, Vite, Vitest 4, framer-motion (already installed), `v6.db.transport.rest` (keyless), Rome2rio REST API (`VITE_ROME2RIO_KEY`), Nominatim/OSM (keyless)

---

## File Map

**Create:**
- `src/utils/transitEngine.js` — stop resolution + DB-Rest journey search for all ground modes
- `src/utils/transitEngine.test.js`
- `src/utils/disruptionEngine.js` — GTFS-RT alert polling + cascade detection
- `src/utils/disruptionEngine.test.js`
- `src/utils/alternativeEngine.js` — Rome2rio wrapper + DB-Rest fallback
- `src/utils/alternativeEngine.test.js`

**Modify:**
- `src/utils/geocodeEngine.js` — dedup fix + `searchBusStops` + `searchTramStops`
- `src/utils/geocodeEngine.test.js` — tests for new functions + dedup
- `src/components/logistics/LegCard.jsx` — 4 modes, MODE_CONFIG, real schedules, disruption bar, simulate all modes
- `src/components/logistics/EmergencyRebook.jsx` — all-mode redesign, real alternatives, cascade banner
- `src/components/logistics/PublicTransport.jsx` — disruption polling, cascade UI, CHECK ROUTE button

---

## Task 1: geocodeEngine — dedup fix + bus/tram stop search

**Files:**
- Modify: `src/utils/geocodeEngine.js`
- Modify: `src/utils/geocodeEngine.test.js`

- [ ] **Step 1.1: Add coordinate-based deduplication to `searchByFilter`**

In `src/utils/geocodeEngine.js`, replace the `searchByFilter` function body with:

```js
async function searchByFilter(text, filterFn, transportType, limit = 5) {
  if (!text?.trim()) return [];
  try {
    const res = await fetch(
      `${BASE}/search?q=${encodeURIComponent(text)}&format=json&limit=${limit * 3}&addressdetails=1`,
      { headers: HEADERS }
    );
    const data = await res.json();
    const seen = new Set();
    return data
      .filter(filterFn)
      .map(r => ({
        id: r.place_id,
        name: r.display_name.split(',')[0],
        address: r.display_name,
        coords: { lat: parseFloat(r.lat), lng: parseFloat(r.lon) },
        type: r.type,
        class: r.class,
        transportType,
      }))
      .filter(r => {
        const key = `${r.coords.lat.toFixed(3)},${r.coords.lng.toFixed(3)}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, limit);
  } catch {
    return [];
  }
}
```

- [ ] **Step 1.2: Add bus and tram filter predicates and export functions**

Append to `src/utils/geocodeEngine.js` after the existing `searchTransportHubs` export:

```js
const isBusStop  = r => r.class === 'highway' && r.type === 'bus_stop';
const isTramStop = r => r.class === 'railway' && r.type === 'tram_stop';

export async function searchBusStops(text, limit = 5) {
  return searchWithFallback(text, isBusStop, 'bus', 'bus stop', limit);
}

export async function searchTramStops(text, limit = 5) {
  return searchWithFallback(text, isTramStop, 'tram', 'tram stop', limit);
}
```

- [ ] **Step 1.3: Write failing tests**

Replace the contents of `src/utils/geocodeEngine.test.js` with:

```js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { filterByAllowedClass, searchStations, searchBusStops, searchTramStops } from './geocodeEngine';

// ── existing tests ──────────────────────────────────────────────────────────
describe('filterByAllowedClass', () => {
  it('keeps results whose class is in the allowlist', () => {
    const input = [
      { id: 1, name: 'Landungsbrücken', class: 'railway' },
      { id: 2, name: 'Café Central',    class: 'amenity' },
      { id: 3, name: 'Altona',          class: 'place'   },
    ];
    expect(filterByAllowedClass(input)).toHaveLength(3);
  });

  it('removes results whose class is not in the allowlist', () => {
    const input = [
      { id: 1, name: 'Stolperstein dedicated to Max', class: 'historic' },
      { id: 2, name: 'Boundary marker',               class: 'man_made' },
      { id: 3, name: 'Landungsbrücken',                class: 'railway'  },
    ];
    const out = filterByAllowedClass(input);
    expect(out).toHaveLength(1);
    expect(out[0].name).toBe('Landungsbrücken');
  });

  it('keeps results with no class field (unknown = pass through)', () => {
    const input = [{ id: 1, name: 'Mystery Place' }];
    expect(filterByAllowedClass(input)).toHaveLength(1);
  });

  it('returns empty array for empty input', () => {
    expect(filterByAllowedClass([])).toEqual([]);
  });
});

// ── deduplication ────────────────────────────────────────────────────────────
describe('searchStations deduplication', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => [
        // same physical stop, two OSM entries (DE + EN name)
        { place_id: 1, display_name: 'Hamburg Hauptbahnhof, Nordsteg, St. Georg, Hamburg', lat: '53.5530', lon: '10.0069', class: 'railway', type: 'station' },
        { place_id: 2, display_name: 'Hamburg Central Station, Nordsteg, St. Georg, Hamburg', lat: '53.5530', lon: '10.0069', class: 'railway', type: 'station' },
        // different station
        { place_id: 3, display_name: 'Hamburg-Altona, Altona-Nord, Hamburg', lat: '53.5503', lon: '9.9346', class: 'railway', type: 'station' },
      ],
    });
  });

  afterEach(() => { vi.restoreAllMocks(); });

  it('removes the EN/DE duplicate at the same coordinate', async () => {
    const results = await searchStations('hamburg', 5);
    expect(results).toHaveLength(2);
    expect(results[0].name).toBe('Hamburg Hauptbahnhof');
    expect(results[1].name).toBe('Hamburg-Altona');
  });
});

// ── bus stop search ──────────────────────────────────────────────────────────
describe('searchBusStops', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => [
        { place_id: 10, display_name: 'Rathausmarkt, Hamburg', lat: '53.5503', lon: '9.9946', class: 'highway', type: 'bus_stop' },
        { place_id: 11, display_name: 'Jungfernstieg, Hamburg', lat: '53.5535', lon: '9.9926', class: 'highway', type: 'bus_stop' },
      ],
    });
  });

  afterEach(() => { vi.restoreAllMocks(); });

  it('returns bus stops with transportType bus', async () => {
    const results = await searchBusStops('rathausmarkt', 5);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].transportType).toBe('bus');
  });
});

// ── tram stop search ─────────────────────────────────────────────────────────
describe('searchTramStops', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => [
        { place_id: 20, display_name: 'Rathaus, Freiburg', lat: '47.9959', lon: '7.8508', class: 'railway', type: 'tram_stop' },
      ],
    });
  });

  afterEach(() => { vi.restoreAllMocks(); });

  it('returns tram stops with transportType tram', async () => {
    const results = await searchTramStops('rathaus', 5);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].transportType).toBe('tram');
  });
});
```

- [ ] **Step 1.4: Run tests — expect failures on new functions**

```bash
cd C:\Users\lasse\Desktop\venturepath && npx vitest run src/utils/geocodeEngine.test.js
```

Expected: deduplication + filterByAllowedClass tests pass; searchBusStops / searchTramStops fail if functions not yet added (they should pass after Step 1.2 above).

- [ ] **Step 1.5: Run tests — verify all pass**

```bash
cd C:\Users\lasse\Desktop\venturepath && npx vitest run src/utils/geocodeEngine.test.js
```

Expected output: `Tests 10 passed (10)`

- [ ] **Step 1.6: Commit**

```bash
cd C:\Users\lasse\Desktop\venturepath && git add src/utils/geocodeEngine.js src/utils/geocodeEngine.test.js && git commit -m "feat(transport): dedup Nominatim results by coords + searchBusStops + searchTramStops"
```

---

## Task 2: transitEngine — stop resolution + schedule search

**Files:**
- Create: `src/utils/transitEngine.js`
- Create: `src/utils/transitEngine.test.js`

- [ ] **Step 2.1: Write failing tests first**

Create `src/utils/transitEngine.test.js`:

```js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resolveStop, searchConnections } from './transitEngine';

const NEARBY_RESPONSE = [
  { id: '8000157', name: 'Hamburg Hbf', location: { latitude: 53.553, longitude: 10.007 } },
];

const JOURNEYS_RESPONSE = {
  journeys: [
    {
      legs: [
        {
          origin:      { id: '8000157', name: 'Hamburg Hbf' },
          destination: { id: '8011160', name: 'Berlin Hbf'  },
          departure:   '2026-05-11T14:00:00+02:00',
          arrival:     '2026-05-11T16:21:00+02:00',
          line: { name: 'ICE 603', product: 'nationalExpress' },
          tripId: 'trip-abc-123',
        },
      ],
      price: { amount: 89.9, currency: 'EUR' },
    },
  ],
};

describe('resolveStop', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({ json: async () => NEARBY_RESPONSE });
  });
  afterEach(() => { vi.restoreAllMocks(); });

  it('returns the nearest stop with id and name', async () => {
    const stop = await resolveStop(53.553, 10.007);
    expect(stop).toMatchObject({ id: '8000157', name: 'Hamburg Hbf' });
  });

  it('returns null when no stops found nearby', async () => {
    global.fetch = vi.fn().mockResolvedValue({ json: async () => [] });
    const stop = await resolveStop(0, 0);
    expect(stop).toBeNull();
  });
});

describe('searchConnections', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({ json: async () => JOURNEYS_RESPONSE });
  });
  afterEach(() => { vi.restoreAllMocks(); });

  it('returns normalized connections with required fields', async () => {
    const conns = await searchConnections('8000157', '8011160', '2026-05-11T12:00:00Z', 'train');
    expect(conns).toHaveLength(1);
    expect(conns[0]).toMatchObject({
      carrier:   'ICE 603',
      departure: '2026-05-11T14:00:00+02:00',
      arrival:   '2026-05-11T16:21:00+02:00',
      realtime:  true,
      tripId:    'trip-abc-123',
    });
  });

  it('returns empty array on network failure', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network'));
    const conns = await searchConnections('8000157', '8011160', '2026-05-11T12:00:00Z', 'train');
    expect(conns).toEqual([]);
  });
});
```

- [ ] **Step 2.2: Run tests — expect failures (module not found)**

```bash
cd C:\Users\lasse\Desktop\venturepath && npx vitest run src/utils/transitEngine.test.js
```

Expected: `Cannot find module './transitEngine'`

- [ ] **Step 2.3: Create `src/utils/transitEngine.js`**

```js
const DB_REST = 'https://v6.db.transport.rest';
const HEADERS = { 'Accept-Language': 'en' };

// DB-Rest product filter strings per mode
const PRODUCT_PARAMS = {
  train: 'bus=false&tram=false&ferry=false&taxi=false',
  bus:   'tram=false&ferry=false&taxi=false&national=false&nationalExpress=false&regional=false&regionalExpress=false&suburban=false',
  tram:  'bus=false&ferry=false&taxi=false&national=false&nationalExpress=false&regional=false&regionalExpress=false&suburban=false',
};

function minsToHuman(mins) {
  const h = Math.floor(Math.abs(mins) / 60);
  const m = Math.abs(mins) % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function co2ForMode(mode, distanceKm) {
  const factors = { train: 14, bus: 68, tram: 22 };
  return Math.round((factors[mode] ?? 30) * distanceKm / 1000);
}

// Resolve nearest Hafas stop to a lat/lng coordinate.
export async function resolveStop(lat, lng) {
  try {
    const res = await fetch(
      `${DB_REST}/stops/nearby?latitude=${lat}&longitude=${lng}&results=1&distance=500`,
      { headers: HEADERS }
    );
    const data = await res.json();
    return data[0] ?? null;
  } catch {
    return null;
  }
}

// Fetch up to 3 connection options for a leg.
// fromId / toId are Hafas stop IDs from resolveStop.
export async function searchConnections(fromId, toId, isoDate, mode) {
  if (!fromId || !toId) return [];
  const params = PRODUCT_PARAMS[mode] ?? PRODUCT_PARAMS.train;
  try {
    const url = `${DB_REST}/journeys?from=${fromId}&to=${toId}&departure=${encodeURIComponent(isoDate)}&results=3&stopovers=false&${params}`;
    const res  = await fetch(url, { headers: HEADERS });
    const data = await res.json();

    return (data.journeys ?? []).map((j, i) => {
      const firstLeg = j.legs[0];
      const lastLeg  = j.legs[j.legs.length - 1];
      const deptMs   = new Date(firstLeg.departure).getTime();
      const arrvMs   = new Date(lastLeg.arrival).getTime();
      const durationMins = Math.round((arrvMs - deptMs) / 60000);

      return {
        id:        `conn-${i}`,
        carrier:   firstLeg.line?.name ?? firstLeg.walking ? 'Walk' : '—',
        departure: firstLeg.departure,
        arrival:   lastLeg.arrival,
        duration:  minsToHuman(durationMins),
        price:     j.price?.amount ?? null,
        co2:       co2ForMode(mode, durationMins * 1),  // rough proxy; refine later
        platform:  firstLeg.departurePlatform ?? null,
        realtime:  !!(firstLeg.departureDelay != null || firstLeg.currentTripPosition),
        tripId:    firstLeg.tripId ?? null,
        hafasFromId: fromId,
        hafasToId:   toId,
        label:     j.legs.length > 1
          ? j.legs.map(l => l.line?.name ?? '?').join(' + ')
          : (firstLeg.line?.name ?? 'Direct'),
      };
    });
  } catch {
    return [];
  }
}
```

- [ ] **Step 2.4: Run tests — verify all pass**

```bash
cd C:\Users\lasse\Desktop\venturepath && npx vitest run src/utils/transitEngine.test.js
```

Expected: `Tests 4 passed (4)`

- [ ] **Step 2.5: Commit**

```bash
cd C:\Users\lasse\Desktop\venturepath && git add src/utils/transitEngine.js src/utils/transitEngine.test.js && git commit -m "feat(transport): transitEngine — DB-Rest stop resolution + journey search for train/bus/tram"
```

---

## Task 3: disruptionEngine — alert fetching + cascade detection

**Files:**
- Create: `src/utils/disruptionEngine.js`
- Create: `src/utils/disruptionEngine.test.js`

- [ ] **Step 3.1: Write failing tests first**

Create `src/utils/disruptionEngine.test.js`:

```js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchAlerts, checkCascade } from './disruptionEngine';

// ── fetchAlerts ──────────────────────────────────────────────────────────────
describe('fetchAlerts', () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it('returns null when leg has no selectedOption', async () => {
    const leg = { id: 'l1', selectedOption: null };
    expect(await fetchAlerts(leg)).toBeNull();
  });

  it('returns null when trip has no delay at the origin stop', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({
        stopovers: [
          { stop: { id: '8000157' }, departureDelay: 0 },
        ],
        line: { name: 'ICE 603', product: 'nationalExpress' },
      }),
    });
    const leg = {
      id: 'l1',
      stopFromId: '8000157',
      selectedOption: { tripId: 'trip-abc' },
    };
    expect(await fetchAlerts(leg)).toBeNull();
  });

  it('returns a medium disruption for a 35-minute delay', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({
        stopovers: [
          { stop: { id: '8000157' }, departureDelay: 2100 }, // 35 min in seconds
        ],
        line: { name: 'ICE 603', product: 'nationalExpress' },
      }),
    });
    const leg = {
      id: 'l1',
      stopFromId: '8000157',
      selectedOption: { tripId: 'trip-abc' },
    };
    const result = await fetchAlerts(leg);
    expect(result).toMatchObject({
      severity:     'medium',
      delayMinutes: 35,
      source:       'db-rt',
    });
  });

  it('returns null on network failure', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('timeout'));
    const leg = { id: 'l1', stopFromId: '8000157', selectedOption: { tripId: 'trip-abc' } };
    expect(await fetchAlerts(leg)).toBeNull();
  });
});

// ── checkCascade ─────────────────────────────────────────────────────────────
describe('checkCascade', () => {
  it('returns empty when fewer than 2 confirmed legs', () => {
    const legs = [
      { id: 'l1', selectedOption: { departure: '2026-05-11T10:00:00Z', arrival: '2026-05-11T12:00:00Z' }, disruption: null },
    ];
    expect(checkCascade(legs)).toEqual([]);
  });

  it('returns empty when no disruptions', () => {
    const legs = [
      { id: 'l1', selectedOption: { departure: '2026-05-11T10:00:00Z', arrival: '2026-05-11T12:00:00Z' }, disruption: null },
      { id: 'l2', selectedOption: { departure: '2026-05-11T13:00:00Z', arrival: '2026-05-11T15:00:00Z' }, disruption: null },
    ];
    expect(checkCascade(legs)).toEqual([]);
  });

  it('flags amber when remaining buffer is 1–29 minutes', () => {
    // buffer = 12:20 - 12:00 = 20m; delay = 15m; remaining = 5m → amber
    const legs = [
      { id: 'l1', selectedOption: { departure: '2026-05-11T10:00:00Z', arrival: '2026-05-11T12:00:00Z' }, disruption: { delayMinutes: 15 } },
      { id: 'l2', selectedOption: { departure: '2026-05-11T12:20:00Z', arrival: '2026-05-11T14:00:00Z' }, disruption: null },
    ];
    const results = checkCascade(legs);
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ legId: 'l2', upstreamLegId: 'l1', severity: 'amber', remainingMinutes: 5 });
  });

  it('flags red when connection is missed (remaining < 0)', () => {
    // buffer = 12:30 - 12:00 = 30m; delay = 45m; remaining = -15m → red
    const legs = [
      { id: 'l1', selectedOption: { departure: '2026-05-11T10:00:00Z', arrival: '2026-05-11T12:00:00Z' }, disruption: { delayMinutes: 45 } },
      { id: 'l2', selectedOption: { departure: '2026-05-11T12:30:00Z', arrival: '2026-05-11T14:00:00Z' }, disruption: null },
    ];
    const results = checkCascade(legs);
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ severity: 'red', remainingMinutes: -15 });
  });

  it('propagates cascade: l2 delay endangers l3', () => {
    // l1→l2: buffer 60m, delay 70m → red (remaining -10m)
    // l2→l3: original buffer 30m; l2 now effectively 10m late → remaining 20m → amber
    const legs = [
      { id: 'l1', selectedOption: { departure: '2026-05-11T08:00:00Z', arrival: '2026-05-11T10:00:00Z' }, disruption: { delayMinutes: 70 } },
      { id: 'l2', selectedOption: { departure: '2026-05-11T11:00:00Z', arrival: '2026-05-11T13:00:00Z' }, disruption: null },
      { id: 'l3', selectedOption: { departure: '2026-05-11T13:30:00Z', arrival: '2026-05-11T15:00:00Z' }, disruption: null },
    ];
    const results = checkCascade(legs);
    // l1→l2: red; l2→l3: l2's effective arrival = 13:00 + 10m = 13:10, buffer to l3 = 13:30-13:10 = 20m → amber
    expect(results.some(r => r.legId === 'l2' && r.severity === 'red')).toBe(true);
    expect(results.some(r => r.legId === 'l3' && r.severity === 'amber')).toBe(true);
  });
});
```

- [ ] **Step 3.2: Run tests — expect failures (module not found)**

```bash
cd C:\Users\lasse\Desktop\venturepath && npx vitest run src/utils/disruptionEngine.test.js
```

Expected: `Cannot find module './disruptionEngine'`

- [ ] **Step 3.3: Create `src/utils/disruptionEngine.js`**

```js
const DB_REST = 'https://v6.db.transport.rest';
const HEADERS = { 'Accept-Language': 'en' };

// Fetch live delay data for one leg from DB-Rest GTFS-RT trip details.
export async function fetchAlerts(leg) {
  const tripId = leg.selectedOption?.tripId;
  if (!tripId) return null;

  try {
    const res  = await fetch(`${DB_REST}/trips/${encodeURIComponent(tripId)}?stopovers=true`, { headers: HEADERS });
    const data = await res.json();

    const stopover    = data.stopovers?.find(s => s.stop?.id === leg.stopFromId);
    const delaySecs   = stopover?.departureDelay ?? 0;
    const delayMinutes = Math.round(delaySecs / 60);
    if (delayMinutes <= 0) return null;

    const severity = delayMinutes >= 60 ? 'critical' : delayMinutes >= 20 ? 'medium' : 'low';
    const product  = data.line?.product ?? '';
    const isLongDistance = product === 'nationalExpress' || product === 'national';
    const type = isLongDistance && delayMinutes >= 60 ? 'cancellation' : 'delay';

    return {
      type,
      severity,
      delayMinutes,
      message: `${delayMinutes}m delay on ${data.line?.name ?? 'service'}`,
      source: 'db-rt',
    };
  } catch {
    return null;
  }
}

// Detect cascade risk across an ordered array of legs.
// Returns one CascadeResult per endangered leg.
export function checkCascade(legs) {
  const confirmed = legs.filter(l => l.selectedOption?.departure && l.selectedOption?.arrival);
  if (confirmed.length < 2) return [];

  const results = [];
  // Track effective arrival delay that propagates forward
  let propagatedDelayMinutes = 0;

  for (let i = 0; i < confirmed.length - 1; i++) {
    const curr = confirmed[i];
    const next = confirmed[i + 1];

    const arrivalMs   = new Date(curr.selectedOption.arrival).getTime();
    const departureMs = new Date(next.selectedOption.departure).getTime();
    const bufferMins  = (departureMs - arrivalMs) / 60000;

    const ownDelay   = curr.disruption?.delayMinutes ?? 0;
    const totalDelay = Math.max(ownDelay, propagatedDelayMinutes);
    const remaining  = Math.round(bufferMins - totalDelay);

    if (remaining < 30) {
      const severity = remaining < 0 ? 'red' : 'amber';
      results.push({ legId: next.id, upstreamLegId: curr.id, severity, remainingMinutes: remaining });
      // Propagate: if missed, next leg is effectively this many minutes late
      propagatedDelayMinutes = remaining < 0 ? Math.abs(remaining) : 0;
    } else {
      propagatedDelayMinutes = 0;
    }
  }

  return results;
}
```

- [ ] **Step 3.4: Run tests — verify all pass**

```bash
cd C:\Users\lasse\Desktop\venturepath && npx vitest run src/utils/disruptionEngine.test.js
```

Expected: `Tests 8 passed (8)`

- [ ] **Step 3.5: Commit**

```bash
cd C:\Users\lasse\Desktop\venturepath && git add src/utils/disruptionEngine.js src/utils/disruptionEngine.test.js && git commit -m "feat(transport): disruptionEngine — DB-RT alert fetch + cascade detection with propagation"
```

---

## Task 4: alternativeEngine — Rome2rio + DB-Rest fallback

**Files:**
- Create: `src/utils/alternativeEngine.js`
- Create: `src/utils/alternativeEngine.test.js`

- [ ] **Step 4.1: Write failing tests first**

Create `src/utils/alternativeEngine.test.js`:

```js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { findAlternatives } from './alternativeEngine';

const ROME2RIO_RESPONSE = {
  routes: [
    {
      name: 'Train',
      kind: 'train',
      duration: 141,
      distance: 289,
      segments: [{ kind: 'train', name: 'ICE 603', duration: 141 }],
      indicativePrice: { price: 89, currency: 'EUR' },
    },
    {
      name: 'Bus',
      kind: 'bus',
      duration: 300,
      distance: 295,
      segments: [{ kind: 'bus', name: 'FlixBus', duration: 300 }],
      indicativePrice: { price: 19, currency: 'EUR' },
    },
  ],
};

describe('findAlternatives', () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it('returns normalized alternatives from Rome2rio on success', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      json: async () => ROME2RIO_RESPONSE,
    });
    const alts = await findAlternatives(
      { lat: 53.553, lng: 10.007 },
      { lat: 52.525, lng: 13.369 },
      '2026-05-11T10:00:00Z'
    );
    expect(alts).toHaveLength(2);
    expect(alts[0]).toMatchObject({ label: 'Train', source: 'rome2rio', price: 89 });
  });

  it('falls back to DB-Rest journeys on Rome2rio 429', async () => {
    const DB_RESPONSE = {
      journeys: [
        {
          legs: [
            {
              origin:      { id: '8000157', name: 'Hamburg Hbf' },
              destination: { id: '8011160', name: 'Berlin Hbf'  },
              departure:   '2026-05-11T14:00:00+02:00',
              arrival:     '2026-05-11T16:21:00+02:00',
              line: { name: 'ICE 603', product: 'nationalExpress' },
              tripId: 'trip-abc',
            },
          ],
          price: null,
        },
      ],
    };
    global.fetch = vi.fn()
      // Rome2rio → 429
      .mockResolvedValueOnce({ status: 429, json: async () => ({}) })
      // stops/nearby for fromCoords
      .mockResolvedValueOnce({ json: async () => [{ id: '8000157', name: 'Hamburg Hbf' }] })
      // stops/nearby for toCoords
      .mockResolvedValueOnce({ json: async () => [{ id: '8011160', name: 'Berlin Hbf' }] })
      // journeys
      .mockResolvedValueOnce({ json: async () => DB_RESPONSE });

    const alts = await findAlternatives(
      { lat: 53.553, lng: 10.007 },
      { lat: 52.525, lng: 13.369 },
      '2026-05-11T10:00:00Z'
    );
    expect(alts).toHaveLength(1);
    expect(alts[0].source).toBe('db-rest');
  });

  it('returns empty array when both sources fail', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network'));
    const alts = await findAlternatives({ lat: 0, lng: 0 }, { lat: 1, lng: 1 }, '2026-05-11T10:00:00Z');
    expect(alts).toEqual([]);
  });
});
```

- [ ] **Step 4.2: Run tests — expect failures**

```bash
cd C:\Users\lasse\Desktop\venturepath && npx vitest run src/utils/alternativeEngine.test.js
```

- [ ] **Step 4.3: Create `src/utils/alternativeEngine.js`**

```js
import { resolveStop } from './transitEngine';

const ROME2RIO_BASE = 'https://free.rome2rio.com/api/1.4/json';
const DB_REST       = 'https://v6.db.transport.rest';
const DB_HEADERS    = { 'Accept-Language': 'en' };

const CO2_G_PER_KM = { plane: 255, train: 14, bus: 68, ferry: 19, car: 170, tram: 22 };

function minsToHuman(mins) {
  const h = Math.floor(Math.abs(mins) / 60);
  const m = Math.abs(mins) % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function dbProductToMode(product) {
  const map = {
    nationalExpress: 'train', national: 'train', regional: 'train',
    regionalExpress: 'train', suburban: 'train',
    bus: 'bus', tram: 'tram', ferry: 'ferry',
  };
  return map[product] ?? 'train';
}

async function fallbackDbRest(fromCoords, toCoords, isoDate) {
  const [fromStop, toStop] = await Promise.all([
    resolveStop(fromCoords.lat, fromCoords.lng),
    resolveStop(toCoords.lat, toCoords.lng),
  ]);
  if (!fromStop || !toStop) return [];

  const url  = `${DB_REST}/journeys?from=${fromStop.id}&to=${toStop.id}&departure=${encodeURIComponent(isoDate)}&results=4`;
  const res  = await fetch(url, { headers: DB_HEADERS });
  const data = await res.json();

  return (data.journeys ?? []).map((j, i) => {
    const first = j.legs[0];
    const last  = j.legs[j.legs.length - 1];
    const durationMins = Math.round((new Date(last.arrival) - new Date(first.departure)) / 60000);
    const modes = [...new Set(j.legs.map(l => dbProductToMode(l.line?.product)))];

    return {
      id:       `db-${i}`,
      label:    j.legs.map(l => l.line?.name ?? '?').join(' + '),
      modes,
      segments: j.legs.map(l => ({ mode: dbProductToMode(l.line?.product), carrier: l.line?.name ?? '—', duration: '' })),
      duration: minsToHuman(durationMins),
      price:    j.price?.amount ?? null,
      co2:      0,
      departs:  first.departure,
      arrives:  last.arrival,
      source:   'db-rest',
    };
  });
}

// Find cross-modal alternatives for a disrupted leg.
// Tries Rome2rio first; falls back to DB-Rest journeys on quota or failure.
export async function findAlternatives(fromCoords, toCoords, isoDate) {
  const key = import.meta.env.VITE_ROME2RIO_KEY;

  try {
    const url = `${ROME2RIO_BASE}/Search?key=${key}&sLat=${fromCoords.lat}&sLng=${fromCoords.lng}&dLat=${toCoords.lat}&dLng=${toCoords.lng}&currencyCode=EUR`;
    const res = await fetch(url);
    if (res.status === 429) throw new Error('quota');

    const data = await res.json();
    return (data.routes ?? []).slice(0, 4).map((r, i) => ({
      id:       `r2r-${i}`,
      label:    r.name,
      modes:    [...new Set((r.segments ?? []).map(s => s.kind).concat(r.kind))],
      segments: (r.segments ?? []).map(s => ({ mode: s.kind, carrier: s.name, duration: minsToHuman(s.duration) })),
      duration: minsToHuman(r.duration),
      price:    r.indicativePrice?.price ?? null,
      co2:      Math.round((r.distance ?? 0) * (CO2_G_PER_KM[r.kind] ?? 50) / 1000),
      departs:  isoDate,
      arrives:  null,
      source:   'rome2rio',
    }));
  } catch {
    try {
      return await fallbackDbRest(fromCoords, toCoords, isoDate);
    } catch {
      return [];
    }
  }
}
```

- [ ] **Step 4.4: Run tests — verify all pass**

```bash
cd C:\Users\lasse\Desktop\venturepath && npx vitest run src/utils/alternativeEngine.test.js
```

Expected: `Tests 3 passed (3)`

- [ ] **Step 4.5: Commit**

```bash
cd C:\Users\lasse\Desktop\venturepath && git add src/utils/alternativeEngine.js src/utils/alternativeEngine.test.js && git commit -m "feat(transport): alternativeEngine — Rome2rio with DB-Rest fallback"
```

---

## Task 5: LegCard — MODE_CONFIG + 4 mode buttons + extended leg shape

**Files:**
- Modify: `src/components/logistics/LegCard.jsx`

- [ ] **Step 5.1: Replace hardcoded color/mode logic with MODE_CONFIG**

At the top of `src/components/logistics/LegCard.jsx`, replace the two `const` blocks:

```js
const FLIGHT_PRIORITIES = [ ... ];
const TRAIN_PRIORITIES  = [ ... ];
```

with:

```js
const MODE_CONFIG = {
  flight: {
    label: 'FLIGHT', icon: '✈', accent: '#E67E22',
    simulate: 'SIMULATE CANCELLATION',
    searchLabel: 'SEARCH FLIGHTS',
    priorities: [
      { id: 'CHEAPEST', label: 'Economy', icon: '💰' },
      { id: 'FASTEST',  label: 'Speed',   icon: '⚡' },
      { id: 'GREENEST', label: 'Green',   icon: '🌿' },
    ],
  },
  train: {
    label: 'TRAIN', icon: '🚂', accent: '#4a9eff',
    simulate: 'SIMULATE DISRUPTION',
    searchLabel: 'SEARCH TRAINS',
    priorities: [
      { id: 'CHEAPEST', label: 'Economy', icon: '💰' },
      { id: 'FASTEST',  label: 'Direct',  icon: '⚡' },
      { id: 'GREENEST', label: 'Green',   icon: '🌿' },
    ],
  },
  bus: {
    label: 'BUS', icon: '🚌', accent: '#22a060',
    simulate: 'SIMULATE DISRUPTION',
    searchLabel: 'SEARCH BUS CONNECTIONS',
    priorities: [
      { id: 'CHEAPEST', label: 'Economy', icon: '💰' },
      { id: 'FASTEST',  label: 'Direct',  icon: '⚡' },
      { id: 'GREENEST', label: 'Green',   icon: '🌿' },
    ],
  },
  tram: {
    label: 'TRAM', icon: '🚃', accent: '#a855f7',
    simulate: 'SIMULATE DISRUPTION',
    searchLabel: 'SEARCH TRAM CONNECTIONS',
    priorities: [
      { id: 'CHEAPEST', label: 'Economy', icon: '💰' },
      { id: 'FASTEST',  label: 'Direct',  icon: '⚡' },
      { id: 'GREENEST', label: 'Green',   icon: '🌿' },
    ],
  },
};
const MODES = Object.keys(MODE_CONFIG);
```

- [ ] **Step 5.2: Add new imports to LegCard**

At the top of `src/components/logistics/LegCard.jsx`, replace:

```js
import { filterExpeditionFlights } from '../../utils/flightEngine';
import { searchAirports, searchStations, searchTransportHubs } from '../../utils/geocodeEngine';
```

with:

```js
import { filterExpeditionFlights } from '../../utils/flightEngine';
import { searchAirports, searchStations, searchTransportHubs, searchBusStops, searchTramStops } from '../../utils/geocodeEngine';
import { resolveStop, searchConnections } from '../../utils/transitEngine';
```

- [ ] **Step 5.3: Update `useTransportAutocomplete` to handle bus and tram**

Replace the `useTransportAutocomplete` hook body with:

```js
function useTransportAutocomplete(query, mode) {
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    if (!query.trim()) { setSuggestions([]); return; }
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setSearching(true);
      try {
        let results;
        if      (mode === 'flight') results = await searchAirports(query, 5);
        else if (mode === 'train')  results = await searchStations(query, 5);
        else if (mode === 'bus')    results = await searchBusStops(query, 5);
        else if (mode === 'tram')   results = await searchTramStops(query, 5);
        else                        results = await searchTransportHubs(query, 6);
        setSuggestions(results);
      } catch {
        setSuggestions([]);
      }
      setSearching(false);
    }, 350);
    return () => clearTimeout(timer.current);
  }, [query, mode]);

  return { suggestions, searching, clear: () => setSuggestions([]) };
}
```

- [ ] **Step 5.4: Update `AutocompleteField` to store coords on selection**

Replace the `onMouseDown` handler inside `AutocompleteField`:

```js
onMouseDown={() => {
  const coordsField = field === 'from' ? 'fromCoords' : 'toCoords';
  const snap = s.transportType === 'flight' ? 'flight'
             : s.transportType === 'train'  ? 'train'
             : s.transportType === 'bus'    ? 'bus'
             : s.transportType === 'tram'   ? 'tram'
             : mode;
  onUpdate(legId, {
    [field]:      s.name,
    [coordsField]: s.coords,
    searched: false,
    ...(snap !== mode && snap ? { mode: snap } : {}),
  });
  ac.clear();
}}
```

- [ ] **Step 5.5: Update LegCard component to use MODE_CONFIG and render 4 mode buttons**

In the `LegCard` component function, replace:

```js
const { id, mode, from, to, searched } = leg;
const [priority, setPriority]         = useState('CHEAPEST');
const [showSimulate, setShowSimulate] = useState(false);

const fromAC = useTransportAutocomplete(from, mode);
const toAC   = useTransportAutocomplete(to,   mode);

const isFlight = mode === 'flight';
const isTrain  = mode === 'train';
const accent   = isTrain ? '#4a9eff' : '#E67E22';

const priorities = isTrain ? TRAIN_PRIORITIES : FLIGHT_PRIORITIES;
```

with:

```js
const { id, mode, from, to, fromCoords, toCoords, searched, selectedOption, disruption, cascadeRisk } = leg;
const [priority, setPriority]   = useState('CHEAPEST');
const [showSimulate, setShowSimulate] = useState(false);

const fromAC = useTransportAutocomplete(from, mode);
const toAC   = useTransportAutocomplete(to,   mode);

const cfg        = MODE_CONFIG[mode] ?? { label: '—', icon: '?', accent: '#2a2f36', simulate: 'SIMULATE DISRUPTION', searchLabel: 'SELECT MODE', priorities: [] };
const accent     = cfg.accent;
const priorities = cfg.priorities;
```

- [ ] **Step 5.6: Replace the 2-button mode toggle row with a 4-button row**

Replace the block containing `{/* Header: leg index + mode toggle + simulate + remove */}` down to the closing `</div>` of the inner header flex row, with:

```jsx
{/* Header */}
<div className="flex items-center justify-between">
  <div className="flex items-center gap-3">
    <span className="text-[8px] font-mono text-[var(--text-muted)] tracking-widest">LEG {index + 1}</span>
    <div className="flex border border-[#2a2f36] rounded overflow-hidden text-[9px] font-mono">
      {MODES.map(m => {
        const mc = MODE_CONFIG[m];
        const isActive = mode === m;
        return (
          <button
            key={m}
            type="button"
            onClick={() => onUpdate(id, { mode: m, searched: false })}
            className="px-3 py-1.5 transition-colors"
            style={isActive
              ? { background: mc.accent, color: '#0E1012', fontWeight: 700 }
              : { color: 'var(--text-muted)' }
            }
          >
            {mc.icon} {mc.label}
          </button>
        );
      })}
    </div>
  </div>
  <div className="flex items-center gap-2">
    <button
      type="button"
      onClick={() => setShowSimulate(true)}
      className="px-2.5 py-1 border text-[9px] font-mono rounded transition-colors tracking-widest bg-red-900/30 border-red-500/40 text-red-400 hover:bg-red-900/50"
    >
      ⚠ {cfg.simulate}
    </button>
    {onRemove && (
      <button
        type="button"
        onClick={() => onRemove(id)}
        className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] text-xs font-mono transition-colors"
        title="Remove leg"
      >✕</button>
    )}
  </div>
</div>
```

- [ ] **Step 5.7: Update the search button label and empty state**

Replace `{isTrain ? 'SEARCH TRAINS' : 'SEARCH FLIGHTS'}` with `{cfg.searchLabel}`.

Replace `{mode ? 'ENTER ORIGIN + DESTINATION TO SEARCH' : 'SELECT MODE TO BEGIN'}` with the same (no change needed — it still reads from `mode`).

- [ ] **Step 5.8: Verify the app renders all 4 mode tabs**

Start dev server: `cd C:\Users\lasse\Desktop\venturepath && npm run dev`

Open `http://localhost:3001`, navigate to Public Transport, confirm ✈ FLIGHT / 🚂 TRAIN / 🚌 BUS / 🚃 TRAM buttons appear and each changes the accent color.

- [ ] **Step 5.9: Commit**

```bash
cd C:\Users\lasse\Desktop\venturepath && git add src/components/logistics/LegCard.jsx && git commit -m "feat(transport): LegCard — MODE_CONFIG + 4 mode tabs (flight/train/bus/tram) + coords stored on selection"
```

---

## Task 6: LegCard — real schedule fetch + loading skeleton + LIVE badge

**Files:**
- Modify: `src/components/logistics/LegCard.jsx`

- [ ] **Step 6.1: Add results state and replace mock fetch with transitEngine**

In the `LegCard` component, add two state declarations after existing `useState` calls:

```js
const [results, setResults]   = useState([]);
const [loading, setLoading]   = useState(false);
```

- [ ] **Step 6.2: Replace the form's `onSubmit` handler**

The current form has `onSubmit={e => { e.preventDefault(); onUpdate(id, { searched: true }); }}`.

Replace it with:

```js
const handleSearch = async (e) => {
  e.preventDefault();
  if (!fromCoords || !toCoords || !mode || mode === 'flight') {
    // flight stays on mock builder for now
    onUpdate(id, { searched: true });
    return;
  }
  setLoading(true);
  setResults([]);
  try {
    const [fromStop, toStop] = await Promise.all([
      resolveStop(fromCoords.lat, fromCoords.lng),
      resolveStop(toCoords.lat, toCoords.lng),
    ]);
    onUpdate(id, { stopFromId: fromStop?.id ?? null, stopToId: toStop?.id ?? null });
    const conns = await searchConnections(fromStop?.id, toStop?.id, new Date().toISOString(), mode);
    setResults(conns);
  } catch {
    setResults([]);
  }
  setLoading(false);
  onUpdate(id, { searched: true });
};
```

And update the form:

```jsx
<form onSubmit={handleSearch} className="space-y-2">
```

- [ ] **Step 6.3: Replace the results rendering block**

Replace the entire `{searched && ( ... )}` block that renders priority tabs and result cards with:

```jsx
{searched && (
  <>
    <div className="flex gap-1.5">
      {priorities.map(p => (
        <button
          key={p.id}
          onClick={() => setPriority(p.id)}
          className={`flex-1 py-1.5 text-[9px] font-mono tracking-widest rounded border transition-colors ${
            priority === p.id ? 'font-bold text-[#0E1012]' : 'bg-transparent border-[#2a2f36] text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
          }`}
          style={priority === p.id ? { background: accent, borderColor: accent } : {}}
        >
          {p.icon} {p.label}
        </button>
      ))}
    </div>

    {loading && (
      <div className="space-y-2">
        {[0, 1, 2].map(i => (
          <div key={i} className="bg-[#0E1012] rounded-lg p-3 border border-[#1e2328] animate-pulse">
            <div className="flex justify-between">
              <div className="space-y-2">
                <div className="h-2 w-20 bg-white/10 rounded" />
                <div className="h-4 w-32 bg-white/10 rounded" />
              </div>
              <div className="h-6 w-12 bg-white/10 rounded" />
            </div>
            <div className="flex justify-between mt-3">
              <div className="h-2 w-12 bg-white/10 rounded" />
              <div className="h-2 w-12 bg-white/10 rounded" />
            </div>
          </div>
        ))}
      </div>
    )}

    {!loading && results.length === 0 && mode !== 'flight' && (
      <div className="py-4 text-center text-[9px] font-mono text-[var(--text-muted)] tracking-widest">
        LIVE DATA UNAVAILABLE — check connection
      </div>
    )}

    <div className="space-y-2">
      {(mode === 'flight'
        ? filterExpeditionFlights(buildFlights(from, to), priority, 9999)
        : results
      ).map(r => (
        <div
          key={r.id}
          onClick={() => onUpdate(id, { selectedOption: r })}
          className={`bg-[#0E1012] rounded-lg p-3 border transition-colors cursor-pointer ${
            selectedOption?.id === r.id
              ? 'border-[var(--accent)]'
              : 'border-[#1e2328] hover:border-white/20'
          }`}
          style={selectedOption?.id === r.id ? { borderColor: accent } : {}}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="text-[10px] font-mono text-[var(--text-muted)] tracking-widest">{r.carrier ?? r.airline}</div>
                {r.realtime && (
                  <span className="text-[8px] font-mono text-green-400 tracking-widest">● LIVE</span>
                )}
              </div>
              <div className="text-white text-sm font-semibold font-mono mt-0.5">{r.route ?? r.label}</div>
            </div>
            <div className="text-right">
              <div className="text-lg font-mono font-bold" style={{ color: accent }}>
                {r.price != null ? `€${r.price}` : '—'}
              </div>
              <div className="text-[9px] text-[var(--text-muted)] font-mono">{r.label ?? r.type}</div>
            </div>
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-[10px] font-mono text-[var(--text-muted)]">{r.duration}</span>
            <span className={`text-[10px] font-mono ${r.co2 < 20 ? 'text-green-400' : r.co2 < 100 ? 'text-yellow-400' : 'text-red-400'}`}>
              {r.co2}kg CO₂
            </span>
          </div>
        </div>
      ))}
    </div>
  </>
)}
```

- [ ] **Step 6.4: Verify live results load**

With dev server running, search "Berlin" → "Hamburg" in TRAIN mode. Expect real DB connections with `● LIVE` badges to appear within ~3 seconds. Verify the loading skeleton pulses while data is fetching.

- [ ] **Step 6.5: Commit**

```bash
cd C:\Users\lasse\Desktop\venturepath && git add src/components/logistics/LegCard.jsx && git commit -m "feat(transport): LegCard — live DB schedule results, loading skeleton, LIVE badge, selectedOption"
```

---

## Task 7: LegCard — disruption status bar + simulate all modes

**Files:**
- Modify: `src/components/logistics/LegCard.jsx`

- [ ] **Step 7.1: Add disruption status bar below the header**

Insert this block immediately after the closing `</div>` of the header section (before the `<form>`):

```jsx
{/* Disruption / cascade status bar */}
{(disruption || cascadeRisk) && (
  <div
    className="rounded px-3 py-1.5 text-[9px] font-mono tracking-widest flex items-center gap-2"
    style={
      (cascadeRisk?.severity === 'red' || disruption?.severity === 'critical')
        ? { background: 'rgba(127,29,29,0.4)', borderLeft: `3px solid #f87171`, color: '#fca5a5' }
        : { background: 'rgba(120,53,15,0.4)', borderLeft: `3px solid #fbbf24`, color: '#fde68a' }
    }
  >
    {disruption && <span>⚠ {disruption.message}</span>}
    {cascadeRisk && (
      <span className="ml-1">
        {cascadeRisk.severity === 'red'
          ? '— CONNECTION MISSED'
          : `— connection buffer: ${cascadeRisk.remainingMinutes}m remaining`}
      </span>
    )}
  </div>
)}
```

- [ ] **Step 7.2: Replace the simulate button handler to write a real disruption to leg state**

Replace `onClick={() => setShowSimulate(true)}` on the simulate button with:

```js
onClick={() => {
  const delays = { flight: null, train: 20 + Math.floor(Math.random() * 70), bus: 10 + Math.floor(Math.random() * 30), tram: 10 + Math.floor(Math.random() * 30) };
  const typesByMode = {
    flight: ['cancellation'],
    train:  ['delay', 'cancellation', 'strike', 'construction'],
    bus:    ['delay', 'diversion'],
    tram:   ['delay', 'diversion'],
  };
  const types       = typesByMode[mode] ?? ['delay'];
  const type        = types[Math.floor(Math.random() * types.length)];
  const delayMins   = delays[mode] ?? 30;
  const severity    = delayMins >= 60 ? 'critical' : delayMins >= 20 ? 'medium' : 'low';
  onUpdate(id, {
    disruption: { type, severity, delayMinutes: delayMins, message: `Simulated ${type} (+${delayMins ?? '∞'}m)`, source: 'simulated' },
  });
  setShowSimulate(true);
}}
```

- [ ] **Step 7.3: Update EmergencyRebook invocation to pass new props**

Replace the `<EmergencyRebook ... />` JSX inside `<AnimatePresence>` with:

```jsx
<EmergencyRebook
  mode={mode ?? 'train'}
  route={`${from || '?'} → ${to || '?'}`}
  fromCoords={fromCoords}
  toCoords={toCoords}
  cascadeRisk={cascadeRisk}
  onClose={() => {
    setShowSimulate(false);
    onUpdate(id, { disruption: null });
  }}
/>
```

- [ ] **Step 7.4: Verify**

Simulate a disruption on BUS mode — expect amber/red status bar. The EmergencyRebook modal should open.

- [ ] **Step 7.5: Commit**

```bash
cd C:\Users\lasse\Desktop\venturepath && git add src/components/logistics/LegCard.jsx && git commit -m "feat(transport): LegCard — disruption status bar + simulate all 4 modes"
```

---

## Task 8: EmergencyRebook — all-mode redesign + real alternatives + cascade banner

**Files:**
- Modify: `src/components/logistics/EmergencyRebook.jsx`

- [ ] **Step 8.1: Read the current EmergencyRebook.jsx to understand structure before editing**

Read `src/components/logistics/EmergencyRebook.jsx` in full.

- [ ] **Step 8.2: Replace the component with the all-mode version**

Overwrite `src/components/logistics/EmergencyRebook.jsx` with:

```jsx
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { findAlternatives } from '../../utils/alternativeEngine';

const MODE_META = {
  flight: { header: 'SERVICE DISRUPTED',  accent: '#E67E22', icon: '✈' },
  train:  { header: 'SERVICE DISRUPTED',  accent: '#4a9eff', icon: '🚂' },
  bus:    { header: 'ROUTE DIVERSION',    accent: '#22a060', icon: '🚌' },
  tram:   { header: 'SERVICE DISRUPTION', accent: '#a855f7', icon: '🚃' },
};

const SQUAD = [
  { id: 'lead',  label: 'Lead',  icon: '🧗' },
  { id: 'scout', label: 'Scout', icon: '🗺' },
  { id: 'medic', label: 'Medic', icon: '🩺' },
];

const PRIORITIES = [
  { key: 0, badge: 'FASTEST ROUTE',    icon: '⚡' },
  { key: 1, badge: 'ECONOMY OPTION',   icon: '💰' },
  { key: 2, badge: 'GREENEST OPTION',  icon: '🌿' },
];

export default function EmergencyRebook({ onClose, route, mode, fromCoords, toCoords, cascadeRisk }) {
  const meta          = MODE_META[mode] ?? MODE_META.train;
  const isCascade     = !!cascadeRisk;
  const initialTime   = isCascade && cascadeRisk.severity === 'red' ? 45 : 60;

  const [alts, setAlts]           = useState([]);
  const [altsLoading, setAltsLoading] = useState(true);
  const [altsError, setAltsError] = useState(false);
  const [selected, setSelected]   = useState(null);
  const [votes, setVotes]         = useState({ 0: [], 1: [], 2: [] });
  const [confirmed, setConfirmed] = useState(false);
  const [timeLeft, setTimeLeft]   = useState(initialTime);
  const timerRef = useRef(null);

  // Fetch real alternatives
  useEffect(() => {
    if (!fromCoords || !toCoords) { setAltsLoading(false); return; }
    findAlternatives(fromCoords, toCoords, new Date().toISOString())
      .then(results => { setAlts(results.slice(0, 3)); setAltsLoading(false); })
      .catch(() => { setAltsError(true); setAltsLoading(false); });
  }, []);

  // Auto-select countdown
  useEffect(() => {
    if (confirmed || altsLoading) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          // Auto-select the option with most votes, or first alternative
          const bestIdx = [0, 1, 2].reduce((best, i) => votes[i].length > votes[best].length ? i : best, 0);
          setSelected(bestIdx);
          setConfirmed(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [altsLoading, confirmed]);

  const groupFavorite = [0, 1, 2].reduce((best, i) =>
    (votes[i]?.length ?? 0) > (votes[best]?.length ?? 0) ? i : best, 0
  );

  const cards = alts.length > 0
    ? alts.map((a, i) => ({ ...a, ...PRIORITIES[i] }))
    : PRIORITIES.map((p, i) => ({ ...p, id: `placeholder-${i}`, label: '—', duration: '—', price: null, co2: 0, modes: [] }));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: 'rgba(10,10,14,0.97)' }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          <span className="text-lg">{meta.icon}</span>
          <div>
            <div className="text-[10px] font-mono tracking-widest" style={{ color: meta.accent }}>⚠ {meta.header}</div>
            <div className="text-[9px] font-mono text-[var(--text-muted)]">{route}</div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {!confirmed && (
            <div className="text-right">
              <div className="text-[8px] font-mono text-[var(--text-muted)] tracking-widest">AUTO-SELECT IN</div>
              <div className="text-2xl font-mono font-bold" style={{ color: meta.accent }}>{timeLeft}s</div>
            </div>
          )}
          <button onClick={onClose} className="text-[9px] font-mono text-[var(--text-muted)] hover:text-white tracking-widest">✕ CLOSE</button>
        </div>
      </div>

      {/* Progress bar */}
      {!confirmed && (
        <div className="h-0.5 w-full" style={{ background: '#1e2328' }}>
          <motion.div
            className="h-full"
            style={{ background: meta.accent }}
            initial={{ width: '100%' }}
            animate={{ width: `${(timeLeft / initialTime) * 100}%` }}
            transition={{ duration: 1, ease: 'linear' }}
          />
        </div>
      )}

      <div className="flex-1 overflow-auto px-6 py-4">
        {/* Cascade banner */}
        {isCascade && (
          <div className="mb-4 px-4 py-2 rounded border border-amber-500/40 bg-amber-900/20 text-[9px] font-mono text-amber-300 tracking-widest">
            ↑ CASCADE — upstream disruption caused this missed connection
            {cascadeRisk.remainingMinutes < 0 && ` (${Math.abs(cascadeRisk.remainingMinutes)}m overrun)`}
          </div>
        )}

        <div className="text-center mb-4">
          <div className="text-white font-mono text-sm">AI found {alts.length || '…'} alternatives</div>
          <div className="text-[9px] font-mono text-[var(--text-muted)] tracking-widest mt-0.5">SQUAD FLASH VOTE — SELECT YOUR PREFERENCE</div>
        </div>

        {altsError && (
          <div className="text-center text-[9px] font-mono text-red-400 tracking-widest mb-4">
            LIVE ALTERNATIVES UNAVAILABLE — squad vote disabled, manual rebook required
          </div>
        )}

        {/* Alternative cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {cards.map((card, cardIdx) => (
            <div
              key={card.id ?? cardIdx}
              className={`rounded-lg border p-4 transition-colors ${
                selected === cardIdx ? 'border-white/40' : 'border-[#2a2f36]'
              } ${cardIdx === groupFavorite && !altsLoading ? 'ring-1' : ''}`}
              style={{
                background: '#0e1118',
                ...(selected === cardIdx ? { borderColor: meta.accent } : {}),
                ...(cardIdx === groupFavorite && !altsLoading ? { ringColor: meta.accent } : {}),
              }}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="text-[8px] font-mono tracking-widest text-[var(--text-muted)]">{card.badge}</div>
                  {cardIdx === groupFavorite && !altsLoading && (
                    <div className="text-[7px] font-mono tracking-widest mt-0.5" style={{ color: meta.accent }}>★ GROUP FAVOURITE</div>
                  )}
                </div>
                <span className="text-xl">{card.icon}</span>
              </div>

              {altsLoading ? (
                <div className="space-y-2 animate-pulse">
                  <div className="h-4 bg-white/10 rounded w-3/4" />
                  <div className="h-3 bg-white/10 rounded w-1/2" />
                  <div className="h-6 bg-white/10 rounded w-1/3" />
                </div>
              ) : (
                <>
                  <div className="text-white font-mono text-sm font-semibold mb-1">{card.label}</div>
                  <div className="text-[10px] font-mono text-[var(--text-muted)]">{card.duration}</div>
                  <div className="text-lg font-mono font-bold mt-1" style={{ color: meta.accent }}>
                    {card.price != null ? `€${card.price}` : '—'}
                  </div>
                </>
              )}

              {/* Squad vote buttons */}
              <div className="mt-3 space-y-1">
                {SQUAD.map(member => {
                  const hasVoted = votes[cardIdx]?.includes(member.id);
                  return (
                    <button
                      key={member.id}
                      type="button"
                      disabled={altsLoading || altsError}
                      onClick={() => {
                        setVotes(prev => {
                          // remove vote from other cards
                          const cleared = { 0: prev[0].filter(v => v !== member.id), 1: prev[1].filter(v => v !== member.id), 2: prev[2].filter(v => v !== member.id) };
                          return { ...cleared, [cardIdx]: hasVoted ? cleared[cardIdx] : [...cleared[cardIdx], member.id] };
                        });
                      }}
                      className={`w-full text-left px-2 py-1 rounded text-[9px] font-mono transition-colors border ${
                        hasVoted ? 'border-white/30 bg-white/10 text-white' : 'border-white/10 text-[var(--text-muted)] hover:bg-white/5'
                      }`}
                    >
                      {member.icon} {member.label}
                      {hasVoted && ' ✓'}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Confirm */}
        {(confirmed || selected !== null) && !altsLoading && (
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={onClose}
              className="px-8 py-2 rounded font-mono text-sm font-bold tracking-widest text-[#0E1012] transition-colors"
              style={{ background: meta.accent }}
            >
              CONFIRM REBOOK
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
```

- [ ] **Step 8.3: Verify EmergencyRebook works for all 4 modes**

With dev server running:
1. BUS leg → Simulate Disruption → green-accented modal with bus/tram alternatives
2. TRAM leg → Simulate Disruption → violet-accented modal
3. TRAIN leg → Simulate Disruption → blue-accented modal, alternatives load from DB-Rest or Rome2rio

- [ ] **Step 8.4: Commit**

```bash
cd C:\Users\lasse\Desktop\venturepath && git add src/components/logistics/EmergencyRebook.jsx && git commit -m "feat(transport): EmergencyRebook — all-mode visual personality, real alternatives, cascade banner, squad voting"
```

---

## Task 9: PublicTransport — disruption polling + cascade UI + CHECK ROUTE button

**Files:**
- Modify: `src/components/logistics/PublicTransport.jsx`

- [ ] **Step 9.1: Read current PublicTransport.jsx**

Read `src/components/logistics/PublicTransport.jsx` in full.

- [ ] **Step 9.2: Add imports**

Add to the import block at the top of `PublicTransport.jsx`:

```js
import { useRef, useEffect, useCallback } from 'react';
import { fetchAlerts, checkCascade } from '../../utils/disruptionEngine';
```

(Keep all existing imports.)

- [ ] **Step 9.3: Add `useInterval` hook above the component**

Insert before the `export default function PublicTransport` line:

```js
function useInterval(callback, delayMs) {
  const savedCallback = useRef(callback);
  useEffect(() => { savedCallback.current = callback; }, [callback]);
  useEffect(() => {
    if (delayMs === null) return;
    const id = setInterval(() => savedCallback.current(), delayMs);
    return () => clearInterval(id);
  }, [delayMs]);
}
```

- [ ] **Step 9.4: Add polling and cascade state inside the component**

After the existing `const [legs, setLegs] = useState(...)` line, add:

```js
const [checking, setChecking] = useState(false);
```

- [ ] **Step 9.5: Add the poll + cascade function**

After the `removeLeg` / `addLeg` functions, add:

```js
const runDisruptionCheck = useCallback(async () => {
  const confirmed = legs.filter(l => l.selectedOption?.tripId);
  if (confirmed.length === 0) return;
  setChecking(true);
  const updates = await Promise.all(
    confirmed.map(async l => ({ id: l.id, disruption: await fetchAlerts(l) }))
  );
  setLegs(prev => {
    const withDisruption = prev.map(l => {
      const u = updates.find(x => x.id === l.id);
      return u ? { ...l, disruption: u.disruption } : l;
    });
    const cascadeResults = checkCascade(withDisruption);
    return withDisruption.map(l => ({
      ...l,
      cascadeRisk: cascadeResults.find(r => r.legId === l.id) ?? null,
    }));
  });
  setChecking(false);
}, [legs]);

useInterval(runDisruptionCheck, 90_000);
```

- [ ] **Step 9.6: Update the route summary to show connection buffer times and cascade indicators**

Find the route summary rendering code (the section that builds city/connector nodes). Add buffer display between connector pairs.

Locate the route summary `<div>` that iterates over nodes and replace its contents to compute buffer times:

```jsx
{/* Route summary */}
<div className="mt-2">
  <div className="text-[8px] font-mono text-[var(--text-muted)] tracking-widest mb-2">ROUTE SUMMARY</div>
  <div className="flex items-center flex-wrap gap-1 text-[10px] font-mono">
    {legs.map((leg, i) => {
      const mc = leg.mode ? { flight: '#E67E22', train: '#4a9eff', bus: '#22a060', tram: '#a855f7' }[leg.mode] : '#2a2f36';
      const modeIcon = leg.mode ? { flight: '✈', train: '🚂', bus: '🚌', tram: '🚃' }[leg.mode] : '?';
      const nextLeg = legs[i + 1];
      const buffer = (leg.selectedOption?.arrival && nextLeg?.selectedOption?.departure)
        ? Math.round((new Date(nextLeg.selectedOption.departure) - new Date(leg.selectedOption.arrival)) / 60000)
        : null;
      const cr = nextLeg?.cascadeRisk;
      return (
        <span key={leg.id} className="flex items-center gap-1">
          <span style={{ color: mc }}>{leg.from || '—'}</span>
          <span style={{ color: `${mc}99` }}>──{modeIcon}──</span>
          <span style={{ color: mc }}>{leg.to || '—'}</span>
          {buffer !== null && (
            <span
              className="text-[8px] font-mono px-1 rounded"
              style={{
                color: cr?.severity === 'red' ? '#f87171' : cr?.severity === 'amber' ? '#fbbf24' : 'var(--text-muted)',
              }}
            >
              {cr?.severity === 'red' ? 'MISSED ✕' : `+${buffer}m${cr ? ' ⚠' : ''}`}
            </span>
          )}
        </span>
      );
    })}
  </div>
</div>
```

- [ ] **Step 9.7: Add CHECK ROUTE button**

Find the "+ ADD LEG" button area in `PublicTransport.jsx` and add a CHECK ROUTE button beside it:

```jsx
<div className="flex gap-2">
  <button
    type="button"
    onClick={addLeg}
    className="flex-1 py-2 rounded text-[9px] font-mono tracking-widest border border-dashed border-[#2a2f36] text-[var(--text-muted)] hover:border-white/20 hover:text-[var(--text-secondary)] transition-colors"
  >
    + ADD LEG
  </button>
  <button
    type="button"
    onClick={runDisruptionCheck}
    disabled={checking}
    className="px-4 py-2 rounded text-[9px] font-mono tracking-widest border border-[#2a2f36] text-[var(--text-muted)] hover:border-white/20 hover:text-[var(--text-secondary)] transition-colors disabled:opacity-40"
  >
    {checking ? '⟳ CHECKING…' : '⚡ CHECK ROUTE'}
  </button>
</div>
```

- [ ] **Step 9.8: Add `fromCoords`, `toCoords`, `cascadeRisk` to LegCard props**

Ensure the `<LegCard>` usage in PublicTransport passes the full leg object (it already does via `leg={leg}` — no change needed if leg props are spread, but confirm the leg object includes the new fields by verifying `updateLeg` correctly patches them).

- [ ] **Step 9.9: Verify end-to-end cascade flow**

1. Add two TRAIN legs: Hamburg Hbf → Berlin Hbf (pick a result; confirm it), Berlin Hbf → Frankfurt Hbf (pick a result; confirm it)
2. Hit "SIMULATE DISRUPTION" on leg 1 with a large delay
3. Expect amber or red cascade warning to appear on leg 2's status bar
4. Expect the route summary to show `MISSED ✕` or `+Xm ⚠` between the two city nodes
5. Expect EmergencyRebook on leg 2 to show the cascade banner

- [ ] **Step 9.10: Commit**

```bash
cd C:\Users\lasse\Desktop\venturepath && git add src/components/logistics/PublicTransport.jsx && git commit -m "feat(transport): PublicTransport — 90s disruption polling, cascade detection, buffer display, CHECK ROUTE"
```

---

## Task 10: Add VITE_ROME2RIO_KEY to .env.local

**Files:**
- Modify: `.env.local` (not committed)

- [ ] **Step 10.1: Add the Rome2rio key**

In `.env.local` add:

```
VITE_ROME2RIO_KEY=your_key_here
```

Get a free key at `https://www.rome2rio.com/developers/` (1000 requests/day free tier). DB-Rest and Nominatim need no keys.

- [ ] **Step 10.2: Restart dev server and verify alternatives load in EmergencyRebook**

Stop and restart `npm run dev`. Open the app, simulate a disruption on a confirmed TRAIN leg, and verify EmergencyRebook shows real cross-modal alternatives from Rome2rio (not the DB-Rest fallback skeleton).

- [ ] **Step 10.3: Final commit**

```bash
cd C:\Users\lasse\Desktop\venturepath && git add docs/superpowers/plans/2026-05-11-disruption-aware-transport.md && git commit -m "docs: add disruption-aware transport implementation plan"
```

---

## Self-Review Checklist

- [x] **Spec §1 (Data engines):** Tasks 2–4 cover transitEngine, disruptionEngine, alternativeEngine with correct Connection/Disruption/Alternative shapes
- [x] **Spec §2 (Mode expansion + dedup):** Task 1 (dedup in searchByFilter), Task 5 (4 mode buttons, MODE_CONFIG, bus/tram autocomplete)
- [x] **Spec §3 (Real schedules):** Task 6 (real DB-Rest fetch, loading skeleton, LIVE badge, selectedOption)
- [x] **Spec §4 (Disruption status UI):** Task 7 (status bar in LegCard), Task 9 (route summary cascade nodes)
- [x] **Spec §5 (EmergencyRebook + alternatives):** Task 8 (all modes, real alternatives, cascade banner, squad voting)
- [x] **Spec §6 (Env vars):** Task 10 (VITE_ROME2RIO_KEY only; DB-Rest is keyless)
- [x] **Type consistency:** `Connection.tripId` defined in Task 2, consumed in Task 3; `cascadeRisk.remainingMinutes` defined in Task 3, consumed in Tasks 7+9
- [x] **No placeholders:** All code blocks are complete
- [x] **Note on spec deviation:** Spec mentioned `VITE_TRANSITLAND_KEY` for bus/tram schedules. This plan uses `v6.db.transport.rest` for all ground modes (Hafas backend covers buses and trams in Germany) — no Transitland key needed. Transitland is used only for stop search autocomplete via Nominatim (keyless OSM).
