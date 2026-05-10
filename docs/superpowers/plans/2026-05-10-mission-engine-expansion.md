# Mission Engine Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add five interconnected systems to VenturePath — Vault Document Hub, Booking Matrix + Cancellation Simulator, Compass Ring HUD, Role-Based Packing Prompts, and 3D Journey Line + Stat Overlays — all sharing one Mission JSON spine via the existing sentinelBus.

**Architecture:** Extend `useTripStore` with three new top-level keys (`vault`, `booking`, `journey`), add four new sentinelBus event types, then build pure-logic utilities first and React components on top. All modules stay decoupled and communicate through sentinelBus. Mapbox GL JS replaces Leaflet for the Journey 3D view only.

**Tech Stack:** Vite + React 19, Zustand-like context reducer (`useTripStore`), Vitest for tests, `pdfjs-dist` (PDF parse), `tesseract.js` (OCR), `mapbox-gl` (3D map), Open-Elevation API (free, altitude lookup), Amadeus free tier (flights), existing `sentinelBus.js` event bus, existing `/api/chat` express route (Claude streaming).

---

## File Map

### New files — pure logic (no React)
| File | Responsibility |
|---|---|
| `src/utils/vaultExtractor.js` | Regex extraction of booking fields from raw text |
| `src/utils/simulatorEngine.js` | Rule-based delay ripple calculator |
| `src/utils/compassEngine.js` | Bearing, cardinal label, haversine |
| `src/utils/rolePackingConfig.js` | Static role → prompt array config |
| `src/utils/gpxParser.js` | DOMParser-based GPX track point extractor |
| `src/utils/elevationService.js` | Batched Open-Elevation API calls with sessionStorage cache |
| `src/utils/bookingEngine.js` | Goal-text parser + parallel API orchestrator |
| `src/data/permitRegistry.json` | Static destination → permit requirements map |

### New files — pure logic tests
| File | Tests |
|---|---|
| `src/utils/vaultExtractor.test.js` | Extraction of confirmation, dates, price, IATA codes |
| `src/utils/simulatorEngine.test.js` | MISSED/TIGHT/SAFE status calculation |
| `src/utils/compassEngine.test.js` | Bearing accuracy, cardinal labels |
| `src/utils/gpxParser.test.js` | Track point extraction, hr field, timestamp |
| `src/utils/elevationService.test.js` | Batch splitting, cache hit/miss |

### New files — React components
| File | Responsibility |
|---|---|
| `src/components/vault/VaultHub.jsx` | Document library grouped by type |
| `src/components/vault/VaultIngest.jsx` | Paste/upload modal, extraction preview |
| `src/components/vault/MedicAccessBadge.jsx` | Emergency access toggle, localStorage write |
| `src/components/booking/BookingMatrix.jsx` | Mission-goal search UI + BookingPackage card |
| `src/components/booking/CancellationSimulator.jsx` | Delay slider + MISSED/TIGHT/SAFE timeline |
| `src/components/booking/SimulatorNarrative.jsx` | Claude streaming recovery advice |
| `src/components/tactical/CompassRing.jsx` | Bearing dial HUD for TacticalMode |
| `src/components/logistics/RolePackingPrompts.jsx` | Role-keyed advisory checklist |
| `src/components/journey/JourneyMap3D.jsx` | Mapbox GL JS 3D map with breadcrumb trail |
| `src/components/journey/JourneySlideshow.jsx` | Photo viewer, emits PHOTO_ACTIVE |
| `src/components/journey/StatOverlay.jsx` | Altitude/HR/temp/timestamp HUD |
| `src/components/journey/GpxImporter.jsx` | GPX file input + match result display |

### Modified files
| File | Change |
|---|---|
| `src/store/useTripStore.jsx` | Add `vault`, `booking`, `journey` to initialState + four new reducer cases |
| `src/utils/sentinelBus.js` | No code change — four new event types are just string constants, documented in `src/utils/sentinelBusEvents.js` |
| `src/components/ui/TacticalMode.jsx` | Import + render `CompassRing` conditionally |
| `src/components/logistics/PackingManifest.jsx` | Insert `RolePackingPrompts` above item list |
| `src/pages/TripPlanner.jsx` | Add Vault tab + Booking tab to tab bar |

---

## Task 1: Extend useTripStore with vault, booking, journey

**Files:**
- Modify: `src/store/useTripStore.jsx`

- [ ] **Step 1: Add new keys to initialState**

In `src/store/useTripStore.jsx`, find the `initialState` object (currently ends with `architect: { ... }`) and add three new keys:

```js
const initialState = {
  trip: DEFAULT_TRIP,
  legs: DEFAULT_LEGS,
  objectives: DEFAULT_OBJECTIVES,
  manifestSettings: DEFAULT_MANIFEST_SETTINGS,
  userRole: 'LEADER',
  cloning: false,
  journey: null,
  architect: { insights: [], lastGeneratedAt: null },
  // --- new ---
  vault: { documents: [] },
  booking: { whatIfScenarios: [] },
  journeyData: { breadcrumbs: [], gpxImported: false, photos: [] },
};
```

Note: the existing `journey` key is `null` (used by the Journey tab for a different purpose). The new key is named `journeyData` to avoid collision.

- [ ] **Step 2: Add four reducer cases**

In the `reducer` function, add these four cases before the `default:` case:

```js
case 'ADD_VAULT_DOCUMENT': {
  const doc = { ...action.payload, id: `doc_${Date.now()}` };
  return { ...state, vault: { documents: [...state.vault.documents, doc] } };
}
case 'UPDATE_VAULT_DOCUMENT': {
  const documents = state.vault.documents.map(d =>
    d.id === action.payload.id ? { ...d, ...action.payload.changes } : d
  );
  return { ...state, vault: { documents } };
}
case 'ADD_SCENARIO': {
  const scenario = { ...action.payload, id: `scenario_${Date.now()}` };
  return { ...state, booking: { whatIfScenarios: [...state.booking.whatIfScenarios, scenario] } };
}
case 'SET_JOURNEY_DATA': {
  return { ...state, journeyData: { ...state.journeyData, ...action.payload } };
}
```

- [ ] **Step 3: Expose dispatch actions via the hook**

The existing `useTripStore` hook returns `{ trip, legs, objectives, manifestSettings, userRole, cloning, journey, architect, dispatch }`. Confirm `dispatch` is already exposed (it is — check line ~155). No change needed, callers will use `dispatch({ type: 'ADD_VAULT_DOCUMENT', payload: doc })` directly.

- [ ] **Step 4: Verify no test regressions**

Run: `npx vitest run`
Expected: all existing tests pass (routeCache, routeEngine, stopSearchEngine, useSmartStop, sentinelBus, weatherHazardMapper).

- [ ] **Step 5: Commit**

```bash
git add src/store/useTripStore.jsx
git commit -m "feat(store): add vault, booking, journeyData keys + four reducer cases"
```

---

## Task 2: sentinelBusEvents constants file

**Files:**
- Create: `src/utils/sentinelBusEvents.js`

- [ ] **Step 1: Create the constants file**

```js
// src/utils/sentinelBusEvents.js
export const VAULT_DOCUMENT_ADDED   = 'VAULT_DOCUMENT_ADDED';
export const CANCELLATION_SIMULATED = 'CANCELLATION_SIMULATED';
export const BREADCRUMB_UPDATED     = 'BREADCRUMB_UPDATED';
export const PHOTO_ACTIVE           = 'PHOTO_ACTIVE';
```

This is documentation + prevents string typos. All existing event strings (`HAZARD_UPDATED`, etc.) can remain inline in their files — only new ones go here.

- [ ] **Step 2: Commit**

```bash
git add src/utils/sentinelBusEvents.js
git commit -m "feat(sentinel): add four new event type constants"
```

---

## Task 3: vaultExtractor.js + tests

**Files:**
- Create: `src/utils/vaultExtractor.js`
- Create: `src/utils/vaultExtractor.test.js`

- [ ] **Step 1: Write the failing tests**

```js
// src/utils/vaultExtractor.test.js
import { describe, it, expect } from 'vitest';
import { extractVaultDocument } from './vaultExtractor';

describe('extractVaultDocument', () => {
  it('extracts confirmation number', () => {
    const result = extractVaultDocument('Booking Confirmation: ABC123 Thank you');
    expect(result.confirmation).toBe('ABC123');
  });

  it('extracts IATA origin and destination', () => {
    const result = extractVaultDocument('Flight departs LIS arrives BCN on 12 Nov 2026');
    expect(result.origin).toBe('LIS');
    expect(result.destination).toBe('BCN');
  });

  it('extracts ISO date', () => {
    const result = extractVaultDocument('Check-in: 2026-11-12, Check-out: 2026-11-15');
    expect(result.dates.start).toBe('2026-11-12');
    expect(result.dates.end).toBe('2026-11-15');
  });

  it('extracts price', () => {
    const result = extractVaultDocument('Total amount: €240.50');
    expect(result.price).toBe(240.5);
  });

  it('extracts carrier name', () => {
    const result = extractVaultDocument('Carrier: TAP Air Portugal');
    expect(result.carrier).toBe('TAP Air Portugal');
  });

  it('returns low confidence when fewer than 3 fields found', () => {
    const result = extractVaultDocument('Hello world nothing here');
    expect(result.confidence).toBe('low');
  });

  it('returns high confidence when 3+ fields found', () => {
    const result = extractVaultDocument(
      'Confirmation: XY789 Flight LIS to BCN Total: $180'
    );
    expect(result.confidence).toBe('high');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/utils/vaultExtractor.test.js`
Expected: FAIL — `extractVaultDocument` not found.

- [ ] **Step 3: Implement vaultExtractor.js**

```js
// src/utils/vaultExtractor.js

const IATA = '[A-Z]{3}';
const IATA_RE = new RegExp(`(?:departs?|from|origin)[^A-Z]*?(${IATA})`, 'i');
const IATA_DEST_RE = new RegExp(`(?:arrives?|to|destination)[^A-Z]*?(${IATA})`, 'i');
const CONFIRM_RE = /confirmation[:\s#]+([A-Z0-9]{4,12})/i;
const DATE_ISO_RE = /(\d{4}-\d{2}-\d{2})/g;
const PRICE_RE = /(?:total|amount|price)[:\s]+[€$£]?([\d,]+\.?\d{0,2})/i;
const CARRIER_RE = /(?:carrier|airline|operated by)[:\s]+([A-Za-z ]{3,40})/i;

export function extractVaultDocument(raw) {
  const result = {
    confirmation: null,
    origin: null,
    destination: null,
    dates: { start: null, end: null },
    price: null,
    carrier: null,
    confidence: 'low',
  };

  const confirmMatch = raw.match(CONFIRM_RE);
  if (confirmMatch) result.confirmation = confirmMatch[1].toUpperCase();

  const originMatch = raw.match(IATA_RE);
  if (originMatch) result.origin = originMatch[1].toUpperCase();

  const destMatch = raw.match(IATA_DEST_RE);
  if (destMatch) result.destination = destMatch[1].toUpperCase();

  const dates = [...raw.matchAll(DATE_ISO_RE)].map(m => m[1]);
  if (dates[0]) result.dates.start = dates[0];
  if (dates[1]) result.dates.end = dates[1];

  const priceMatch = raw.match(PRICE_RE);
  if (priceMatch) result.price = parseFloat(priceMatch[1].replace(',', ''));

  const carrierMatch = raw.match(CARRIER_RE);
  if (carrierMatch) result.carrier = carrierMatch[1].trim();

  const fieldCount = [
    result.confirmation,
    result.origin,
    result.destination,
    result.dates.start,
    result.price,
    result.carrier,
  ].filter(Boolean).length;

  result.confidence = fieldCount >= 3 ? 'high' : 'low';

  return result;
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npx vitest run src/utils/vaultExtractor.test.js`
Expected: 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/vaultExtractor.js src/utils/vaultExtractor.test.js
git commit -m "feat(vault): vaultExtractor — regex field extraction with confidence scoring"
```

---

## Task 4: simulatorEngine.js + tests

**Files:**
- Create: `src/utils/simulatorEngine.js`
- Create: `src/utils/simulatorEngine.test.js`

- [ ] **Step 1: Write the failing tests**

```js
// src/utils/simulatorEngine.test.js
import { describe, it, expect } from 'vitest';
import { simulateDelay } from './simulatorEngine';

const BASE_LEGS = [
  { id: 1, startISO: '2026-11-12T08:00:00Z', endISO: '2026-11-12T10:00:00Z' },
  { id: 2, startISO: '2026-11-12T12:00:00Z', endISO: '2026-11-12T14:00:00Z' },
  { id: 3, startISO: '2026-11-12T16:00:00Z', endISO: '2026-11-12T18:00:00Z' },
];

describe('simulateDelay', () => {
  it('marks downstream leg MISSED when buffer goes negative', () => {
    const results = simulateDelay(BASE_LEGS, 1, 5);
    const leg2 = results.find(r => r.leg_id === 2);
    expect(leg2.status).toBe('MISSED');
    expect(leg2.buffer_hours).toBeLessThan(0);
  });

  it('marks downstream leg TIGHT when buffer is 0–2h', () => {
    const results = simulateDelay(BASE_LEGS, 1, 1.5);
    const leg2 = results.find(r => r.leg_id === 2);
    expect(leg2.status).toBe('TIGHT');
    expect(leg2.buffer_hours).toBeGreaterThanOrEqual(0);
    expect(leg2.buffer_hours).toBeLessThanOrEqual(2);
  });

  it('marks downstream leg SAFE when buffer exceeds 2h', () => {
    const results = simulateDelay(BASE_LEGS, 1, 0.5);
    const leg2 = results.find(r => r.leg_id === 2);
    expect(leg2.status).toBe('SAFE');
    expect(leg2.buffer_hours).toBeGreaterThan(2);
  });

  it('does not include the trigger leg itself in results', () => {
    const results = simulateDelay(BASE_LEGS, 1, 3);
    expect(results.find(r => r.leg_id === 1)).toBeUndefined();
  });

  it('cascades delay through multiple downstream legs', () => {
    const results = simulateDelay(BASE_LEGS, 1, 5);
    expect(results.length).toBe(2);
    expect(results[0].leg_id).toBe(2);
    expect(results[1].leg_id).toBe(3);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/utils/simulatorEngine.test.js`
Expected: FAIL — `simulateDelay` not found.

- [ ] **Step 3: Implement simulatorEngine.js**

```js
// src/utils/simulatorEngine.js

/**
 * Simulates cascading impact of a delay on downstream legs.
 * @param {Array} legs - Array of legs, each with { id, startISO, endISO }
 * @param {number} triggerLegId - The leg that is delayed
 * @param {number} delayHours - How many hours the trigger leg is delayed
 * @returns {Array<ImpactResult>} - One entry per downstream leg
 */
export function simulateDelay(legs, triggerLegId, delayHours) {
  const triggerIndex = legs.findIndex(l => l.id === triggerLegId);
  if (triggerIndex === -1) return [];

  const downstream = legs.slice(triggerIndex + 1);
  let cumulativeDelayMs = delayHours * 3_600_000;

  return downstream.map(leg => {
    const originalStart = new Date(leg.startISO).getTime();
    const shiftedStart = originalStart + cumulativeDelayMs;
    const prevLeg = legs[legs.indexOf(leg) - 1];
    const prevShiftedEnd = new Date(prevLeg.endISO).getTime() + cumulativeDelayMs;
    const bufferMs = originalStart - prevShiftedEnd;
    const buffer_hours = parseFloat((bufferMs / 3_600_000).toFixed(2));

    let status;
    if (buffer_hours < 0) status = 'MISSED';
    else if (buffer_hours <= 2) status = 'TIGHT';
    else status = 'SAFE';

    // If this leg is also delayed (buffer gone), cascade delay forward
    if (buffer_hours < 0) cumulativeDelayMs += Math.abs(bufferMs);

    return {
      leg_id: leg.id,
      original_start: leg.startISO,
      shifted_start: new Date(shiftedStart).toISOString(),
      buffer_hours,
      status,
    };
  });
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npx vitest run src/utils/simulatorEngine.test.js`
Expected: 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/simulatorEngine.js src/utils/simulatorEngine.test.js
git commit -m "feat(booking): simulatorEngine — delay ripple calculator with MISSED/TIGHT/SAFE"
```

---

## Task 5: compassEngine.js + tests

**Files:**
- Create: `src/utils/compassEngine.js`
- Create: `src/utils/compassEngine.test.js`

- [ ] **Step 1: Write the failing tests**

```js
// src/utils/compassEngine.test.js
import { describe, it, expect } from 'vitest';
import { bearing, cardinalLabel, haversineKm } from './compassEngine';

describe('bearing', () => {
  it('returns ~0 for due north', () => {
    const b = bearing({ lat: 0, lng: 0 }, { lat: 1, lng: 0 });
    expect(b).toBeCloseTo(0, 0);
  });

  it('returns ~180 for due south', () => {
    const b = bearing({ lat: 1, lng: 0 }, { lat: 0, lng: 0 });
    expect(b).toBeCloseTo(180, 0);
  });

  it('returns ~90 for due east', () => {
    const b = bearing({ lat: 0, lng: 0 }, { lat: 0, lng: 1 });
    expect(b).toBeCloseTo(90, 0);
  });
});

describe('cardinalLabel', () => {
  it('returns N for 0', () => expect(cardinalLabel(0)).toBe('N'));
  it('returns N for 348', () => expect(cardinalLabel(348)).toBe('N'));
  it('returns NE for 45', () => expect(cardinalLabel(45)).toBe('NE'));
  it('returns S for 180', () => expect(cardinalLabel(180)).toBe('S'));
  it('returns W for 270', () => expect(cardinalLabel(270)).toBe('W'));
});

describe('haversineKm', () => {
  it('returns ~0 for same point', () => {
    expect(haversineKm({ lat: 48.8, lng: 2.3 }, { lat: 48.8, lng: 2.3 })).toBe(0);
  });

  it('returns reasonable distance between Paris and London', () => {
    const km = haversineKm({ lat: 48.85, lng: 2.35 }, { lat: 51.5, lng: -0.12 });
    expect(km).toBeGreaterThan(300);
    expect(km).toBeLessThan(400);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/utils/compassEngine.test.js`
Expected: FAIL.

- [ ] **Step 3: Implement compassEngine.js**

```js
// src/utils/compassEngine.js

const R = 6371;
const toRad = deg => (deg * Math.PI) / 180;

export function haversineKm(a, b) {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return parseFloat((2 * R * Math.asin(Math.sqrt(h))).toFixed(2));
}

export function bearing(from, to) {
  const φ1 = toRad(from.lat);
  const φ2 = toRad(to.lat);
  const Δλ = toRad(to.lng - from.lng);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (Math.atan2(y, x) * (180 / Math.PI) + 360) % 360;
}

const CARDINALS = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];

export function cardinalLabel(degrees) {
  const index = Math.round(degrees / 22.5) % 16;
  return CARDINALS[index];
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npx vitest run src/utils/compassEngine.test.js`
Expected: 10 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/compassEngine.js src/utils/compassEngine.test.js
git commit -m "feat(tactical): compassEngine — bearing, cardinal label, haversine"
```

---

## Task 6: gpxParser.js + tests

**Files:**
- Create: `src/utils/gpxParser.js`
- Create: `src/utils/gpxParser.test.js`

- [ ] **Step 1: Write the failing tests**

```js
// src/utils/gpxParser.test.js
import { describe, it, expect } from 'vitest';
import { parseGpx } from './gpxParser';

const SAMPLE_GPX = `<?xml version="1.0"?>
<gpx version="1.1">
  <trk><trkseg>
    <trkpt lat="38.7" lon="-9.1">
      <ele>120</ele>
      <time>2026-11-12T10:00:00Z</time>
      <extensions><gpxtpx:TrackPointExtension>
        <gpxtpx:hr>142</gpxtpx:hr>
      </gpxtpx:TrackPointExtension></extensions>
    </trkpt>
    <trkpt lat="38.8" lon="-9.2">
      <ele>200</ele>
      <time>2026-11-12T10:30:00Z</time>
    </trkpt>
  </trkseg></trk>
</gpx>`;

describe('parseGpx', () => {
  it('returns array of track points', () => {
    const points = parseGpx(SAMPLE_GPX);
    expect(points).toHaveLength(2);
  });

  it('extracts lat and lng', () => {
    const [p] = parseGpx(SAMPLE_GPX);
    expect(p.lat).toBeCloseTo(38.7);
    expect(p.lng).toBeCloseTo(-9.1);
  });

  it('extracts elevation', () => {
    const [p] = parseGpx(SAMPLE_GPX);
    expect(p.alt).toBe(120);
  });

  it('extracts timestamp as ISO string', () => {
    const [p] = parseGpx(SAMPLE_GPX);
    expect(p.timestamp).toBe('2026-11-12T10:00:00Z');
  });

  it('extracts heart rate when present', () => {
    const [p] = parseGpx(SAMPLE_GPX);
    expect(p.hr).toBe(142);
  });

  it('sets hr to null when not present', () => {
    const points = parseGpx(SAMPLE_GPX);
    expect(points[1].hr).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/utils/gpxParser.test.js`
Expected: FAIL.

- [ ] **Step 3: Implement gpxParser.js**

```js
// src/utils/gpxParser.js

export function parseGpx(gpxString) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(gpxString, 'application/xml');
  const points = [...doc.querySelectorAll('trkpt')];

  return points.map(pt => {
    const lat = parseFloat(pt.getAttribute('lat'));
    const lng = parseFloat(pt.getAttribute('lon'));
    const eleEl = pt.querySelector('ele');
    const timeEl = pt.querySelector('time');
    const hrEl = pt.querySelector('hr');

    return {
      lat,
      lng,
      alt: eleEl ? parseFloat(eleEl.textContent) : null,
      timestamp: timeEl ? timeEl.textContent.trim() : null,
      hr: hrEl ? parseInt(hrEl.textContent, 10) : null,
    };
  });
}

/**
 * Match GPX track points to photos by nearest timestamp within maxGapMs.
 * @param {Array} trackPoints - from parseGpx()
 * @param {Array} photos - each with { timestamp: ISO string }
 * @param {number} maxGapMs - default 5 minutes
 * @returns {Array} photos with alt and hr filled in where matched
 */
export function matchGpxToPhotos(trackPoints, photos, maxGapMs = 5 * 60 * 1000) {
  return photos.map(photo => {
    const photoTime = new Date(photo.timestamp).getTime();
    let best = null;
    let bestGap = Infinity;

    for (const pt of trackPoints) {
      const gap = Math.abs(new Date(pt.timestamp).getTime() - photoTime);
      if (gap < bestGap) { bestGap = gap; best = pt; }
    }

    if (best && bestGap <= maxGapMs) {
      return { ...photo, altitude: best.alt, heart_rate: best.hr };
    }
    return photo;
  });
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npx vitest run src/utils/gpxParser.test.js`
Expected: 6 tests PASS.

Note: `DOMParser` is available in browser environments and in Vitest's jsdom environment by default.

- [ ] **Step 5: Commit**

```bash
git add src/utils/gpxParser.js src/utils/gpxParser.test.js
git commit -m "feat(journey): gpxParser — DOMParser-based GPX extraction with photo timestamp matching"
```

---

## Task 7: rolePackingConfig.js + elevationService.js

**Files:**
- Create: `src/utils/rolePackingConfig.js`
- Create: `src/utils/elevationService.js`
- Create: `src/utils/elevationService.test.js`

These two have no interdependency so can be written in sequence in one task.

- [ ] **Step 1: Create rolePackingConfig.js**

```js
// src/utils/rolePackingConfig.js

export const ROLE_PROMPTS = {
  LEADER: [
    { label: 'All permits confirmed?', type: 'checkbox', critical: true },
    { label: 'Squad readiness checked?', type: 'checkbox', critical: true },
    { label: 'Emergency contacts distributed?', type: 'checkbox', critical: false },
  ],
  SCOUT: [
    { label: 'Power bank charged?', type: 'checkbox', critical: true },
    { label: 'Local SIM acquired?', type: 'checkbox', critical: false },
    { label: 'Offline maps downloaded?', type: 'checkbox', critical: true },
    { label: 'Navigation device charged?', type: 'checkbox', critical: true },
  ],
  MEDIC: [
    { label: 'First aid kit expiry date', type: 'date', critical: true },
    { label: 'Medication expiry date', type: 'date', critical: true },
    { label: 'Local emergency number saved?', type: 'checkbox', critical: true },
    { label: 'Allergy list shared with squad?', type: 'checkbox', critical: false },
  ],
};
```

- [ ] **Step 2: Write elevationService tests**

```js
// src/utils/elevationService.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchElevations, CACHE_KEY_PREFIX } from './elevationService';

beforeEach(() => sessionStorage.clear());

describe('fetchElevations', () => {
  it('returns elevations for each coord', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: [{ elevation: 120 }, { elevation: 250 }] }),
    });
    const result = await fetchElevations([{ lat: 38.7, lng: -9.1 }, { lat: 38.8, lng: -9.2 }]);
    expect(result).toEqual([120, 250]);
  });

  it('uses sessionStorage cache on second call', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: [{ elevation: 100 }] }),
    });
    const coords = [{ lat: 1.0, lng: 2.0 }];
    await fetchElevations(coords);
    await fetchElevations(coords);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('splits requests into batches of 512', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: Array(512).fill({ elevation: 0 }) }),
    });
    const coords = Array(600).fill({ lat: 0, lng: 0 });
    await fetchElevations(coords);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 3: Run elevation tests to verify failure**

Run: `npx vitest run src/utils/elevationService.test.js`
Expected: FAIL.

- [ ] **Step 4: Implement elevationService.js**

```js
// src/utils/elevationService.js

export const CACHE_KEY_PREFIX = 'vp_elev_';
const BATCH_SIZE = 512;
const API_URL = 'https://api.open-elevation.com/api/v1/lookup';

function cacheKey(coords) {
  return CACHE_KEY_PREFIX + coords.map(c => `${c.lat.toFixed(4)},${c.lng.toFixed(4)}`).join('|');
}

async function fetchBatch(coords) {
  const key = cacheKey(coords);
  const cached = sessionStorage.getItem(key);
  if (cached) return JSON.parse(cached);

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ locations: coords.map(c => ({ latitude: c.lat, longitude: c.lng })) }),
  });
  if (!res.ok) return coords.map(() => null);

  const data = await res.json();
  const elevations = data.results.map(r => r.elevation ?? null);
  sessionStorage.setItem(key, JSON.stringify(elevations));
  return elevations;
}

export async function fetchElevations(coords) {
  const results = [];
  for (let i = 0; i < coords.length; i += BATCH_SIZE) {
    const batch = coords.slice(i, i + BATCH_SIZE);
    const elevs = await fetchBatch(batch);
    results.push(...elevs);
  }
  return results;
}
```

- [ ] **Step 5: Run elevation tests to verify pass**

Run: `npx vitest run src/utils/elevationService.test.js`
Expected: 3 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/utils/rolePackingConfig.js src/utils/elevationService.js src/utils/elevationService.test.js
git commit -m "feat: rolePackingConfig static prompts + elevationService with batch + cache"
```

---

## Task 8: permitRegistry.json + bookingEngine.js

**Files:**
- Create: `src/data/permitRegistry.json`
- Create: `src/utils/bookingEngine.js`

- [ ] **Step 1: Create permitRegistry.json**

```json
{
  "Torres del Paine": ["CONAF Park Entry Permit", "W Trek Reservation"],
  "Machu Picchu": ["Machu Picchu Entry Ticket", "Huayna Picchu Permit (if applicable)"],
  "Everest Base Camp": ["TIMS Card", "Sagarmatha National Park Permit"],
  "Patagonia": ["CONAF Park Entry Permit"],
  "Schengen Area": ["Schengen Visa (non-EU citizens)"]
}
```

Save to: `src/data/permitRegistry.json`

- [ ] **Step 2: Implement bookingEngine.js**

```js
// src/utils/bookingEngine.js
import permitRegistry from '../data/permitRegistry.json';

const DURATION_RE = /(\d+)\s*days?/i;
const BUDGET_RE = /[€$£]?([\d,]+)/;

export function parseGoal(goalText) {
  const durationMatch = goalText.match(DURATION_RE);
  const budgetMatch = goalText.match(BUDGET_RE);

  // Extract destination: first noun phrase that isn't a number
  const withoutNumbers = goalText.replace(DURATION_RE, '').replace(BUDGET_RE, '');
  const destination = withoutNumbers
    .replace(/\b(in|to|for|at|budget|days?|euros?|dollars?)\b/gi, '')
    .replace(/[€$£,]/g, '')
    .trim()
    .replace(/\s+/g, ' ');

  return {
    destination: destination || null,
    days: durationMatch ? parseInt(durationMatch[1], 10) : null,
    budgetEur: budgetMatch ? parseFloat(budgetMatch[1].replace(',', '')) : null,
  };
}

export function getPermits(destination) {
  if (!destination) return [];
  const key = Object.keys(permitRegistry).find(k =>
    destination.toLowerCase().includes(k.toLowerCase())
  );
  return key ? permitRegistry[key] : [];
}

/**
 * Searches for a booking package given a mission goal string.
 * Returns a BookingPackage with flight, stay, transit, permits, totalCost.
 * Uses Amadeus free tier for flights (requires VITE_AMADEUS_KEY env var).
 * Falls back to placeholder data if API key not set.
 */
export async function searchMission(goalText) {
  const { destination, days, budgetEur } = parseGoal(goalText);
  const permits = getPermits(destination);

  // Geocode destination via Nominatim
  let coords = null;
  try {
    const geoRes = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(destination)}&format=json&limit=1`,
      { headers: { 'User-Agent': 'VenturePath/1.0' } }
    );
    const geoData = await geoRes.json();
    if (geoData[0]) coords = { lat: parseFloat(geoData[0].lat), lng: parseFloat(geoData[0].lon) };
  } catch (_) { /* network unavailable */ }

  // Placeholder package — replace with real Amadeus call when VITE_AMADEUS_KEY is set
  const amadeusKey = import.meta.env?.VITE_AMADEUS_KEY;
  const flight = amadeusKey
    ? await fetchAmadeusFlight(destination, amadeusKey)
    : { carrier: 'Search on Skyscanner', price: null, durationH: null };

  return {
    destination,
    coords,
    days,
    budgetEur,
    flight,
    stay: { name: `Search hotels in ${destination}`, pricePerNight: null },
    transit: 'Check local transit at Rome2Rio',
    permits,
    totalCost: null,
  };
}

async function fetchAmadeusFlight(destination, apiKey) {
  // Amadeus free tier: city search then flight offers
  // Implementation left as integration task — requires OAuth token exchange
  return { carrier: 'Amadeus search pending', price: null, durationH: null };
}
```

- [ ] **Step 3: Commit**

```bash
git add src/data/permitRegistry.json src/utils/bookingEngine.js
git commit -m "feat(booking): bookingEngine — goal parser, permit lookup, Nominatim geocode"
```

---

## Task 9: VaultHub + VaultIngest + MedicAccessBadge components

**Files:**
- Create: `src/components/vault/VaultHub.jsx`
- Create: `src/components/vault/VaultIngest.jsx`
- Create: `src/components/vault/MedicAccessBadge.jsx`

- [ ] **Step 1: Create MedicAccessBadge.jsx**

```jsx
// src/components/vault/MedicAccessBadge.jsx
import { useState } from 'react';

const TACTICAL_VAULT_KEY = 'tactical_vault';

export default function MedicAccessBadge({ doc, userRole }) {
  const [enabled, setEnabled] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(TACTICAL_VAULT_KEY) ?? '[]');
      return stored.some(d => d.id === doc.id);
    } catch { return false; }
  });

  if (userRole !== 'MEDIC' && userRole !== 'LEADER') return null;

  const toggle = () => {
    try {
      const stored = JSON.parse(localStorage.getItem(TACTICAL_VAULT_KEY) ?? '[]');
      const next = enabled
        ? stored.filter(d => d.id !== doc.id)
        : [...stored, doc];
      localStorage.setItem(TACTICAL_VAULT_KEY, JSON.stringify(next));
    } catch { /* localStorage unavailable */ }
    setEnabled(e => !e);
  };

  return (
    <button
      onClick={toggle}
      className={`text-xs px-2 py-1 rounded border font-mono transition-colors ${
        enabled
          ? 'bg-amber-400 text-black border-amber-400'
          : 'border-amber-400/40 text-amber-400/60 hover:border-amber-400 hover:text-amber-400'
      }`}
    >
      {enabled ? '🩺 Emergency Access ON' : '🩺 Emergency Access'}
    </button>
  );
}
```

- [ ] **Step 2: Create VaultIngest.jsx**

```jsx
// src/components/vault/VaultIngest.jsx
import { useState } from 'react';
import { extractVaultDocument } from '../../utils/vaultExtractor';
import { useTripStore } from '../../store/useTripStore';
import sentinelBus from '../../utils/sentinelBus';
import { VAULT_DOCUMENT_ADDED } from '../../utils/sentinelBusEvents';

const TABS = ['Paste Text', 'Upload File'];
const DOC_TYPES = ['flight', 'hotel', 'permit', 'insurance', 'medical'];

export default function VaultIngest({ onClose }) {
  const { dispatch, legs } = useTripStore();
  const [tab, setTab] = useState(0);
  const [raw, setRaw] = useState('');
  const [extracted, setExtracted] = useState(null);
  const [docType, setDocType] = useState('flight');
  const [loading, setLoading] = useState(false);

  const handleExtract = () => {
    const result = extractVaultDocument(raw);
    setExtracted(result);
  };

  const handleConfirm = () => {
    const doc = {
      type: docType,
      raw,
      extracted,
      leg_id: null,
      medic_emergency_access: false,
    };
    dispatch({ type: 'ADD_VAULT_DOCUMENT', payload: doc });
    const suggestedLegIndex = legs.length > 0 ? 0 : null;
    sentinelBus.emit(VAULT_DOCUMENT_ADDED, { doc, suggestedLegIndex });
    onClose();
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    if (file.type === 'application/pdf') {
      // pdfjs-dist: dynamically import to keep bundle lean
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let text = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map(item => item.str).join(' ') + '\n';
      }
      setRaw(text);
      setExtracted(extractVaultDocument(text));
    } else {
      // Image OCR via tesseract.js
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng');
      const { data: { text } } = await worker.recognize(file);
      await worker.terminate();
      setRaw(text);
      setExtracted(extractVaultDocument(text));
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-[#0E1012] border border-[#E67E22]/30 rounded-lg p-6 w-full max-w-lg">
        <h2 className="font-playfair text-white text-xl mb-4">Add Document to Vault</h2>

        {/* Type selector */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {DOC_TYPES.map(t => (
            <button
              key={t}
              onClick={() => setDocType(t)}
              className={`text-xs px-3 py-1 rounded font-mono capitalize ${
                docType === t ? 'bg-[#E67E22] text-black' : 'border border-[#E67E22]/30 text-[#D9C5B2]'
              }`}
            >{t}</button>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-white/10 mb-4">
          {TABS.map((t, i) => (
            <button
              key={t}
              onClick={() => setTab(i)}
              className={`pb-2 text-sm font-mono ${tab === i ? 'border-b-2 border-[#E67E22] text-[#E67E22]' : 'text-[#D9C5B2]'}`}
            >{t}</button>
          ))}
        </div>

        {tab === 0 && (
          <textarea
            className="w-full h-32 bg-black/40 border border-white/10 rounded p-3 text-sm text-white font-mono resize-none mb-3"
            placeholder="Paste your booking confirmation text here..."
            value={raw}
            onChange={e => setRaw(e.target.value)}
          />
        )}

        {tab === 1 && (
          <div className="mb-3">
            <input type="file" accept=".pdf,image/*" onChange={handleFile} className="text-[#D9C5B2] text-sm" />
            {loading && <p className="text-[#E67E22] text-xs mt-2 font-mono">Extracting...</p>}
          </div>
        )}

        {tab === 0 && !extracted && (
          <button onClick={handleExtract} className="w-full py-2 bg-[#E67E22] text-black font-mono text-sm rounded mb-3">
            Extract Fields
          </button>
        )}

        {extracted && (
          <div className="border border-[#E67E22]/30 rounded p-3 mb-3 text-sm font-mono text-[#D9C5B2] space-y-1">
            {extracted.confidence === 'low' && (
              <p className="text-amber-400 text-xs mb-2">⚠ Low confidence — please review the fields below</p>
            )}
            {Object.entries(extracted).filter(([k]) => k !== 'confidence').map(([k, v]) => (
              <div key={k} className="flex gap-2">
                <span className="text-[#E67E22] w-28">{k}:</span>
                <span>{typeof v === 'object' ? JSON.stringify(v) : String(v ?? '—')}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm font-mono text-[#D9C5B2] border border-white/10 rounded">Cancel</button>
          {extracted && (
            <button onClick={handleConfirm} className="px-4 py-2 text-sm font-mono bg-[#E67E22] text-black rounded">
              Save to Vault
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create VaultHub.jsx**

```jsx
// src/components/vault/VaultHub.jsx
import { useState } from 'react';
import { useTripStore } from '../../store/useTripStore';
import VaultIngest from './VaultIngest';
import MedicAccessBadge from './MedicAccessBadge';

const TYPE_ICONS = { flight: '✈', hotel: '🏨', permit: '📋', insurance: '🛡', medical: '🩺' };

export default function VaultHub() {
  const { vault, userRole, dispatch } = useTripStore();
  const [showIngest, setShowIngest] = useState(false);

  const grouped = (vault?.documents ?? []).reduce((acc, doc) => {
    if (!acc[doc.type]) acc[doc.type] = [];
    acc[doc.type].push(doc);
    return acc;
  }, {});

  return (
    <div className="p-4 text-white">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-playfair text-2xl">Vault</h2>
        <button
          onClick={() => setShowIngest(true)}
          className="px-4 py-2 bg-[#E67E22] text-black font-mono text-sm rounded"
        >
          + Add Document
        </button>
      </div>

      {Object.keys(grouped).length === 0 && (
        <div className="text-center py-16 text-[#D9C5B2]">
          <p className="text-4xl mb-3">🗄</p>
          <p className="font-playfair text-lg mb-1">Your Vault is empty</p>
          <p className="text-sm font-mono">Paste booking confirmations or upload PDFs to auto-create Legs.</p>
        </div>
      )}

      {Object.entries(grouped).map(([type, docs]) => (
        <div key={type} className="mb-6">
          <h3 className="font-mono text-[#E67E22] text-xs uppercase tracking-widest mb-2">
            {TYPE_ICONS[type]} {type}
          </h3>
          <div className="space-y-2">
            {docs.map(doc => (
              <div key={doc.id} className="bg-black/30 border border-white/10 rounded p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-sm text-white">
                      {doc.extracted?.carrier ?? doc.extracted?.confirmation ?? doc.type}
                    </p>
                    <p className="text-xs text-[#D9C5B2] font-mono mt-1">
                      {doc.extracted?.dates?.start ?? '—'} → {doc.extracted?.dates?.end ?? '—'}
                      {doc.extracted?.price ? ` · €${doc.extracted.price}` : ''}
                    </p>
                  </div>
                  <MedicAccessBadge doc={doc} userRole={userRole} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {showIngest && <VaultIngest onClose={() => setShowIngest(false)} />}
    </div>
  );
}
```

- [ ] **Step 4: Install pdfjs-dist and tesseract.js**

Run: `npm install pdfjs-dist tesseract.js`
Expected: packages added to node_modules, package.json updated.

- [ ] **Step 5: Commit**

```bash
git add src/components/vault/ package.json package-lock.json
git commit -m "feat(vault): VaultHub, VaultIngest, MedicAccessBadge — document ingestion with PDF/OCR/paste"
```

---

## Task 10: BookingMatrix + CancellationSimulator + SimulatorNarrative

**Files:**
- Create: `src/components/booking/BookingMatrix.jsx`
- Create: `src/components/booking/CancellationSimulator.jsx`
- Create: `src/components/booking/SimulatorNarrative.jsx`

- [ ] **Step 1: Create SimulatorNarrative.jsx**

```jsx
// src/components/booking/SimulatorNarrative.jsx
import { useState } from 'react';

export default function SimulatorNarrative({ impacts, triggerLeg }) {
  const [advice, setAdvice] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchAdvice = async () => {
    setLoading(true);
    setAdvice('');
    const prompt = `You are a travel recovery advisor for VenturePath. An Architect's expedition has a delay.
Trigger: Leg "${triggerLeg?.from} → ${triggerLeg?.to}" is delayed.
Downstream impact:
${impacts.map(i => `- Leg ${i.leg_id}: ${i.status} (buffer: ${i.buffer_hours}h)`).join('\n')}
Give 3 concrete, actionable recovery options. Be direct. Use expedition vocabulary.`;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt }),
      });
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setAdvice(prev => prev + decoder.decode(value));
      }
    } catch {
      setAdvice('Recovery advisor unavailable. Check your network connection.');
    }
    setLoading(false);
  };

  return (
    <div className="mt-4">
      {!advice && !loading && (
        <button
          onClick={fetchAdvice}
          className="w-full py-2 border border-[#E67E22]/50 text-[#E67E22] font-mono text-sm rounded hover:bg-[#E67E22]/10"
        >
          What should I do? →
        </button>
      )}
      {loading && <p className="text-[#E67E22] font-mono text-sm animate-pulse">Consulting recovery advisor...</p>}
      {advice && (
        <div className="bg-black/30 border border-[#E67E22]/20 rounded p-3 text-sm text-[#D9C5B2] font-mono whitespace-pre-wrap">
          {advice}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create CancellationSimulator.jsx**

```jsx
// src/components/booking/CancellationSimulator.jsx
import { useState, useMemo } from 'react';
import { simulateDelay } from '../../utils/simulatorEngine';
import sentinelBus from '../../utils/sentinelBus';
import { CANCELLATION_SIMULATED } from '../../utils/sentinelBusEvents';
import SimulatorNarrative from './SimulatorNarrative';

const STATUS_COLORS = { MISSED: 'text-red-400 border-red-400/40', TIGHT: 'text-amber-400 border-amber-400/40', SAFE: 'text-green-400 border-green-400/40' };

export default function CancellationSimulator({ leg, legs, onClose }) {
  const [delayHours, setDelayHours] = useState(0);

  const impacts = useMemo(() => {
    if (delayHours === 0) return [];
    const legsWithTimes = legs.map((l, i) => ({
      ...l,
      startISO: l.startISO ?? `2026-11-${12 + i}T08:00:00Z`,
      endISO: l.endISO ?? `2026-11-${12 + i}T10:00:00Z`,
    }));
    const results = simulateDelay(legsWithTimes, leg.id, delayHours);
    sentinelBus.emit(CANCELLATION_SIMULATED, { scenario: { trigger_leg: leg.id, delay_hours: delayHours, cascading_impacts: results } });
    return results;
  }, [delayHours, leg.id, legs]);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-[#0E1012] border border-[#E67E22]/30 rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-playfair text-white text-lg">What If?</h3>
          <button onClick={onClose} className="text-[#D9C5B2] font-mono text-sm">✕ Close</button>
        </div>

        <p className="text-[#D9C5B2] font-mono text-xs mb-4">
          Leg: {leg.from} → {leg.to}
        </p>

        <div className="mb-4">
          <label className="text-[#E67E22] font-mono text-xs mb-2 block">Delay: {delayHours}h</label>
          <input
            type="range" min={0} max={48} step={1}
            value={delayHours}
            onChange={e => setDelayHours(Number(e.target.value))}
            className="w-full accent-[#E67E22]"
          />
        </div>

        {impacts.length === 0 && delayHours === 0 && (
          <p className="text-[#D9C5B2] font-mono text-xs text-center py-4">Move the slider to simulate a delay.</p>
        )}

        {impacts.length > 0 && (
          <div className="space-y-2 mb-4">
            {impacts.map(impact => (
              <div key={impact.leg_id} className={`border rounded p-2 flex justify-between font-mono text-xs ${STATUS_COLORS[impact.status]}`}>
                <span>Leg {impact.leg_id}</span>
                <span>{impact.status} · {impact.buffer_hours}h buffer</span>
              </div>
            ))}
          </div>
        )}

        {impacts.length > 0 && <SimulatorNarrative impacts={impacts} triggerLeg={leg} />}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create BookingMatrix.jsx**

```jsx
// src/components/booking/BookingMatrix.jsx
import { useState } from 'react';
import { searchMission } from '../../utils/bookingEngine';

export default function BookingMatrix() {
  const [goal, setGoal] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!goal.trim()) return;
    setLoading(true);
    setResult(null);
    const pkg = await searchMission(goal);
    setResult(pkg);
    setLoading(false);
  };

  return (
    <div className="p-4 text-white">
      <h2 className="font-playfair text-2xl mb-2">Booking Matrix</h2>
      <p className="text-[#D9C5B2] font-mono text-xs mb-4">Describe your mission goal to get a complete booking package.</p>

      <div className="flex gap-2 mb-6">
        <input
          className="flex-1 bg-black/40 border border-white/10 rounded px-3 py-2 text-sm font-mono text-white placeholder-white/30"
          placeholder="e.g. 3 days in Lisbon, budget €800"
          value={goal}
          onChange={e => setGoal(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-4 py-2 bg-[#E67E22] text-black font-mono text-sm rounded disabled:opacity-50"
        >
          {loading ? 'Searching...' : 'Search →'}
        </button>
      </div>

      {result && (
        <div className="border border-[#E67E22]/30 rounded-lg p-4 space-y-3 font-mono text-sm">
          <div className="flex justify-between">
            <span className="text-[#E67E22]">Destination</span>
            <span className="text-white">{result.destination}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#E67E22]">Duration</span>
            <span className="text-white">{result.days ? `${result.days} days` : '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#E67E22]">Budget</span>
            <span className="text-white">{result.budgetEur ? `€${result.budgetEur}` : '—'}</span>
          </div>
          <div className="border-t border-white/10 pt-3">
            <p className="text-[#E67E22] mb-1">✈ Flight</p>
            <p className="text-[#D9C5B2]">{result.flight?.carrier ?? '—'}</p>
          </div>
          <div>
            <p className="text-[#E67E22] mb-1">🏨 Stay</p>
            <p className="text-[#D9C5B2]">{result.stay?.name ?? '—'}</p>
          </div>
          <div>
            <p className="text-[#E67E22] mb-1">🚌 Transit</p>
            <p className="text-[#D9C5B2]">{result.transit}</p>
          </div>
          {result.permits.length > 0 && (
            <div>
              <p className="text-[#E67E22] mb-1">📋 Permits Required</p>
              <ul className="text-amber-400 space-y-1">
                {result.permits.map(p => <li key={p}>• {p}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Verify dev server loads without errors**

Run: `npm run dev`
Open browser to the app. No console errors expected from new files (components are not yet wired into routing).

- [ ] **Step 5: Commit**

```bash
git add src/components/booking/
git commit -m "feat(booking): BookingMatrix, CancellationSimulator, SimulatorNarrative"
```

---

## Task 11: CompassRing + wire into TacticalMode

**Files:**
- Create: `src/components/tactical/CompassRing.jsx`
- Modify: `src/components/ui/TacticalMode.jsx`

- [ ] **Step 1: Create CompassRing.jsx**

```jsx
// src/components/tactical/CompassRing.jsx
import { useState, useEffect, useRef } from 'react';
import { bearing, cardinalLabel, haversineKm } from '../../utils/compassEngine';

export default function CompassRing({ stops }) {
  const [currentPos, setCurrentPos] = useState(null);
  const [stopIndex, setStopIndex] = useState(0);
  const watchRef = useRef(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    watchRef.current = navigator.geolocation.watchPosition(
      pos => setCurrentPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      null,
      { maximumAge: 5000 }
    );
    return () => navigator.geolocation.clearWatch(watchRef.current);
  }, []);

  if (!navigator.geolocation) {
    return (
      <div className="flex items-center justify-center w-40 h-40 rounded-full border-2 border-amber-400/30 text-amber-400 font-mono text-xs text-center">
        GPS unavailable
      </div>
    );
  }

  if (!currentPos || stops.length === 0) {
    return (
      <div className="flex items-center justify-center w-40 h-40 rounded-full border-2 border-amber-400/30 text-amber-400 font-mono text-xs text-center animate-pulse">
        Acquiring GPS...
      </div>
    );
  }

  const stop = stops[stopIndex % stops.length];
  const stopCoords = stop.coords ?? { lat: stop.lat, lng: stop.lng };
  const deg = bearing(currentPos, stopCoords);
  const distKm = haversineKm(currentPos, stopCoords);
  const cardinal = cardinalLabel(deg);

  return (
    <button
      onClick={() => setStopIndex(i => i + 1)}
      className="relative flex items-center justify-center w-40 h-40 rounded-full border-2 border-amber-400/60 bg-black/60 select-none"
      title="Tap to cycle to next stop"
    >
      {/* Rotating needle */}
      <div
        className="absolute w-1 h-16 bg-amber-400 rounded origin-bottom"
        style={{ transform: `rotate(${deg}deg)`, bottom: '50%', left: 'calc(50% - 2px)' }}
      />
      {/* Center info */}
      <div className="z-10 text-center">
        <p className="text-amber-400 font-mono text-xs">{cardinal}</p>
        <p className="text-amber-400 font-mono text-lg font-bold">{distKm < 1 ? `${(distKm * 1000).toFixed(0)}m` : `${distKm.toFixed(1)}km`}</p>
        <p className="text-amber-400/60 font-mono text-[10px] max-w-[80px] truncate">{stop.label ?? stop.to}</p>
      </div>
    </button>
  );
}
```

- [ ] **Step 2: Wire CompassRing into TacticalMode.jsx**

In `src/components/ui/TacticalMode.jsx`, add the import at the top:

```jsx
import CompassRing from '../tactical/CompassRing';
```

Find the JSX return block. After the SOS section (look for `handleSOS`), add the CompassRing before the closing `</div>`:

```jsx
{/* Compass Ring */}
<div className="flex justify-center mt-4">
  <CompassRing
    stops={legs.map(l => ({ label: `${l.from} → ${l.to}`, lat: null, lng: null }))}
  />
</div>
```

Note: `lat/lng` on legs is null for now (legs don't have coords yet). CompassRing handles null gracefully with the "Acquiring GPS" state. When the stop editor adds coords to legs in a future update, this will auto-populate.

- [ ] **Step 3: Verify TacticalMode renders**

Run: `npm run dev`, navigate to Tactical Mode in the app. Confirm: CompassRing shows "Acquiring GPS..." or the needle if GPS permission is granted. No console errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/tactical/CompassRing.jsx src/components/ui/TacticalMode.jsx
git commit -m "feat(tactical): CompassRing HUD — bearing dial wired into TacticalMode"
```

---

## Task 12: RolePackingPrompts + wire into PackingManifest

**Files:**
- Create: `src/components/logistics/RolePackingPrompts.jsx`
- Modify: `src/components/logistics/PackingManifest.jsx`

- [ ] **Step 1: Create RolePackingPrompts.jsx**

```jsx
// src/components/logistics/RolePackingPrompts.jsx
import { useState } from 'react';
import { ROLE_PROMPTS } from '../../utils/rolePackingConfig';

export default function RolePackingPrompts({ role }) {
  const prompts = ROLE_PROMPTS[role];
  const [checked, setChecked] = useState({});
  const [dates, setDates] = useState({});

  if (!prompts) return null;

  const toggle = (label) => setChecked(prev => ({ ...prev, [label]: !prev[label] }));
  const setDate = (label, val) => setDates(prev => ({ ...prev, [label]: val }));

  return (
    <div className="mb-4 border border-[#E67E22]/20 rounded p-3 bg-black/20">
      <p className="font-mono text-[#E67E22] text-xs uppercase tracking-widest mb-3">
        {role} Checklist
      </p>
      <div className="space-y-2">
        {prompts.map(prompt => (
          <div key={prompt.label} className="flex items-center gap-3">
            {prompt.type === 'checkbox' ? (
              <>
                <input
                  type="checkbox"
                  checked={!!checked[prompt.label]}
                  onChange={() => toggle(prompt.label)}
                  className="accent-[#E67E22]"
                />
                <span className={`font-mono text-sm ${prompt.critical ? 'text-white' : 'text-[#D9C5B2]'}`}>
                  {prompt.critical && !checked[prompt.label] && (
                    <span className="inline-block w-2 h-2 rounded-full bg-[#E67E22] mr-2 animate-pulse" />
                  )}
                  {prompt.label}
                </span>
              </>
            ) : (
              <>
                <span className={`font-mono text-sm ${prompt.critical ? 'text-white' : 'text-[#D9C5B2]'}`}>{prompt.label}</span>
                <input
                  type="date"
                  value={dates[prompt.label] ?? ''}
                  onChange={e => setDate(prompt.label, e.target.value)}
                  className="ml-auto bg-black/40 border border-white/10 rounded px-2 py-1 text-xs font-mono text-white"
                />
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire into PackingManifest.jsx**

In `src/components/logistics/PackingManifest.jsx`, add import at the top:

```jsx
import RolePackingPrompts from './RolePackingPrompts';
import { useTripStore } from '../../store/useTripStore';
```

Inside the component, add after the existing `const` declarations:

```jsx
const { userRole } = useTripStore();
```

In the JSX return, find the category filter buttons (look for `setFilter`). Directly above those buttons, insert:

```jsx
<RolePackingPrompts role={userRole} />
```

- [ ] **Step 3: Verify in browser**

Run: `npm run dev`, navigate to the Logistics tab → Packing Manifest. Confirm the role checklist appears above the category filter. With `userRole: 'LEADER'` (the default in the store), the Leader checklist should be visible.

- [ ] **Step 4: Commit**

```bash
git add src/components/logistics/RolePackingPrompts.jsx src/components/logistics/PackingManifest.jsx
git commit -m "feat(logistics): RolePackingPrompts — role-keyed advisory checklist in PackingManifest"
```

---

## Task 13: GpxImporter + StatOverlay + JourneySlideshow

**Files:**
- Create: `src/components/journey/GpxImporter.jsx`
- Create: `src/components/journey/StatOverlay.jsx`
- Create: `src/components/journey/JourneySlideshow.jsx`

- [ ] **Step 1: Create GpxImporter.jsx**

```jsx
// src/components/journey/GpxImporter.jsx
import { useState } from 'react';
import { parseGpx, matchGpxToPhotos } from '../../utils/gpxParser';
import { useTripStore } from '../../store/useTripStore';
import sentinelBus from '../../utils/sentinelBus';
import { BREADCRUMB_UPDATED } from '../../utils/sentinelBusEvents';

export default function GpxImporter() {
  const { journeyData, dispatch } = useTripStore();
  const [matchReport, setMatchReport] = useState(null);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const trackPoints = parseGpx(text);

    const photos = journeyData?.photos ?? [];
    const enrichedPhotos = matchGpxToPhotos(trackPoints, photos);
    const matchCount = enrichedPhotos.filter(p => p.altitude !== undefined).length;

    const breadcrumbs = trackPoints.map(pt => ({ lat: pt.lat, lng: pt.lng, alt: pt.alt, timestamp: pt.timestamp }));

    dispatch({ type: 'SET_JOURNEY_DATA', payload: { breadcrumbs, gpxImported: true, photos: enrichedPhotos } });
    sentinelBus.emit(BREADCRUMB_UPDATED, { breadcrumbs });
    setMatchReport({ total: photos.length, matched: matchCount, trackPoints: trackPoints.length });
  };

  return (
    <div className="border border-white/10 rounded p-3 mb-4">
      <p className="font-mono text-[#E67E22] text-xs uppercase tracking-widest mb-2">Import GPX Track</p>
      <input type="file" accept=".gpx" onChange={handleFile} className="text-[#D9C5B2] text-sm font-mono" />
      {matchReport && (
        <p className="text-xs font-mono text-[#D9C5B2] mt-2">
          Matched {matchReport.matched} of {matchReport.total} photos to {matchReport.trackPoints} track points.
        </p>
      )}
      {journeyData?.gpxImported && !matchReport && (
        <p className="text-xs font-mono text-green-400 mt-2">✓ GPX imported</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create StatOverlay.jsx**

```jsx
// src/components/journey/StatOverlay.jsx
import { useEffect, useState } from 'react';
import { fetchElevations } from '../../utils/elevationService';

export default function StatOverlay({ photo }) {
  const [altitude, setAltitude] = useState(photo.altitude ?? null);

  useEffect(() => {
    if (photo.altitude != null) { setAltitude(photo.altitude); return; }
    if (!photo.coords?.[0]) return;
    fetchElevations([{ lat: photo.coords[0], lng: photo.coords[1] }])
      .then(([elev]) => setAltitude(elev));
  }, [photo]);

  const stats = [
    { label: 'ALT', value: altitude != null ? `${altitude}m` : '—' },
    { label: 'HR', value: photo.heart_rate != null ? `${photo.heart_rate}bpm` : '—' },
    { label: 'TEMP', value: photo.temp != null ? `${photo.temp}°C` : '—' },
    { label: 'TIME', value: photo.timestamp ? new Date(photo.timestamp).toLocaleTimeString() : '—' },
  ];

  return (
    <div className="absolute bottom-3 left-3 flex gap-3">
      {stats.map(s => (
        <div key={s.label} className="bg-black/70 rounded px-2 py-1 font-mono text-xs">
          <span className="text-[#E67E22]">{s.label} </span>
          <span className="text-white">{s.value}</span>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create JourneySlideshow.jsx**

```jsx
// src/components/journey/JourneySlideshow.jsx
import { useState } from 'react';
import sentinelBus from '../../utils/sentinelBus';
import { PHOTO_ACTIVE } from '../../utils/sentinelBusEvents';
import StatOverlay from './StatOverlay';

export default function JourneySlideshow({ photos }) {
  const [index, setIndex] = useState(0);

  if (!photos || photos.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 border border-white/10 rounded text-[#D9C5B2] font-mono text-sm">
        No photos in this expedition yet.
      </div>
    );
  }

  const photo = photos[index];

  const go = (dir) => {
    const next = (index + dir + photos.length) % photos.length;
    setIndex(next);
    sentinelBus.emit(PHOTO_ACTIVE, { photo: photos[next] });
  };

  return (
    <div className="relative w-full aspect-video bg-black rounded overflow-hidden">
      <img src={photo.url} alt="" className="w-full h-full object-cover" />
      <StatOverlay photo={photo} />

      {/* Navigation */}
      <button
        onClick={() => go(-1)}
        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 text-white rounded-full w-8 h-8 flex items-center justify-center font-mono"
      >‹</button>
      <button
        onClick={() => go(1)}
        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 text-white rounded-full w-8 h-8 flex items-center justify-center font-mono"
      >›</button>

      {/* Counter */}
      <div className="absolute top-3 right-3 bg-black/60 rounded px-2 py-1 font-mono text-xs text-white">
        {index + 1} / {photos.length}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/journey/GpxImporter.jsx src/components/journey/StatOverlay.jsx src/components/journey/JourneySlideshow.jsx
git commit -m "feat(journey): GpxImporter, StatOverlay, JourneySlideshow — GPX matching + stat HUD"
```

---

## Task 14: JourneyMap3D (Mapbox GL JS)

**Files:**
- Create: `src/components/journey/JourneyMap3D.jsx`

- [ ] **Step 1: Install mapbox-gl**

Run: `npm install mapbox-gl`
Expected: package added.

- [ ] **Step 2: Add VITE_MAPBOX_TOKEN to .env.example**

In `.env.example`, add:

```
# Mapbox GL JS — required for 3D Journey Map
# Free tier: 50,000 map loads/month. Get token at https://account.mapbox.com
VITE_MAPBOX_TOKEN=your_token_here
```

Also add `VITE_MAPBOX_TOKEN=` to your local `.env` file with your actual token.

- [ ] **Step 3: Create JourneyMap3D.jsx**

```jsx
// src/components/journey/JourneyMap3D.jsx
import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import sentinelBus from '../../utils/sentinelBus';
import { PHOTO_ACTIVE, BREADCRUMB_UPDATED } from '../../utils/sentinelBusEvents';

const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

export default function JourneyMap3D({ breadcrumbs, photos }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const [activePhotoIndex, setActivePhotoIndex] = useState(null);

  useEffect(() => {
    if (!TOKEN || !containerRef.current) return;
    mapboxgl.accessToken = TOKEN;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: breadcrumbs[0] ? [breadcrumbs[0].lng, breadcrumbs[0].lat] : [0, 0],
      zoom: 10,
      pitch: 45,
    });

    mapRef.current = map;

    map.on('load', () => {
      // Terrain
      map.addSource('mapbox-dem', { type: 'raster-dem', url: 'mapbox://mapbox.mapbox-terrain-dem-v1', tileSize: 512 });
      map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 });

      // Breadcrumb trail
      if (breadcrumbs.length > 1) {
        const maxAlt = Math.max(...breadcrumbs.map(b => b.alt ?? 0));
        const minAlt = Math.min(...breadcrumbs.map(b => b.alt ?? 0));
        const altRange = maxAlt - minAlt || 1;

        map.addSource('trail', {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: breadcrumbs.map(b => [b.lng, b.lat, b.alt ?? 0]),
            },
          },
        });

        map.addLayer({
          id: 'trail-line',
          type: 'line',
          source: 'trail',
          paint: {
            'line-width': 3,
            'line-color': [
              'interpolate', ['linear'],
              ['get', 'alt'],
              minAlt, '#D9C5B2',
              maxAlt, '#E67E22',
            ],
          },
        });
      }

      // Photo markers
      photos.forEach((photo, i) => {
        if (!photo.coords) return;
        const el = document.createElement('div');
        el.className = 'w-4 h-4 rounded-full border-2 border-[#E67E22] bg-black cursor-pointer';
        el.dataset.index = i;
        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([photo.coords[1], photo.coords[0]])
          .addTo(map);
        el.addEventListener('click', () => {
          sentinelBus.emit(PHOTO_ACTIVE, { photo });
          setActivePhotoIndex(i);
        });
        markersRef.current.push(marker);
      });
    });

    // Listen for PHOTO_ACTIVE from slideshow
    const unsub = sentinelBus.on(PHOTO_ACTIVE, ({ photo }) => {
      if (photo.coords && mapRef.current) {
        mapRef.current.flyTo({ center: [photo.coords[1], photo.coords[0]], zoom: 14, pitch: 45, duration: 1000 });
      }
    });

    // Listen for BREADCRUMB_UPDATED
    const unsubBreadcrumb = sentinelBus.on(BREADCRUMB_UPDATED, ({ breadcrumbs: newBreadcrumbs }) => {
      const source = mapRef.current?.getSource('trail');
      if (source) {
        source.setData({
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: newBreadcrumbs.map(b => [b.lng, b.lat, b.alt ?? 0]) },
        });
      }
    });

    return () => {
      unsub();
      unsubBreadcrumb();
      map.remove();
    };
  }, []);

  if (!TOKEN) {
    return (
      <div className="flex items-center justify-center h-64 border border-white/10 rounded text-[#D9C5B2] font-mono text-sm text-center p-4">
        <div>
          <p className="text-[#E67E22] mb-2">3D Map unavailable</p>
          <p className="text-xs">Set VITE_MAPBOX_TOKEN in your .env file to enable the 3D Journey Map.</p>
        </div>
      </div>
    );
  }

  return <div ref={containerRef} className="w-full h-96 rounded overflow-hidden" />;
}
```

- [ ] **Step 4: Verify map renders**

Run: `npm run dev`. Navigate to the Journey tab (or wherever JourneyMap3D will be rendered). Confirm: map renders with dark style, no console errors. If VITE_MAPBOX_TOKEN is not set, the fallback message renders cleanly.

- [ ] **Step 5: Commit**

```bash
git add src/components/journey/JourneyMap3D.jsx .env.example package.json package-lock.json
git commit -m "feat(journey): JourneyMap3D — Mapbox GL JS 3D breadcrumb trail with photo pins"
```

---

## Task 15: Wire Vault + Booking tabs into TripPlanner

**Files:**
- Modify: `src/pages/TripPlanner.jsx`

- [ ] **Step 1: Read the current TripPlanner tab structure**

Open `src/pages/TripPlanner.jsx`. Find the tab bar — it currently has tabs like OVERVIEW, ITINERARY, LOGISTICS, DISCOVERY. Note the exact string values and the `activeTab` state.

- [ ] **Step 2: Add Vault and Booking tabs**

Add two imports at the top of TripPlanner.jsx:

```jsx
import VaultHub from '../components/vault/VaultHub';
import BookingMatrix from '../components/booking/BookingMatrix';
```

Add `'VAULT'` and `'BOOKING'` to the tabs array (exact name depends on current code — add them after `'DISCOVERY'`).

In the tab content render (look for `activeTab === 'OVERVIEW'` etc.), add:

```jsx
{activeTab === 'VAULT' && <VaultHub />}
{activeTab === 'BOOKING' && <BookingMatrix />}
```

- [ ] **Step 3: Verify in browser**

Run: `npm run dev`. Navigate to TripPlanner. Confirm two new tabs appear: VAULT and BOOKING. Clicking VAULT shows VaultHub empty state with "Add Document" button. Clicking BOOKING shows BookingMatrix search input.

- [ ] **Step 4: Commit**

```bash
git add src/pages/TripPlanner.jsx
git commit -m "feat(planner): wire Vault and Booking tabs into TripPlanner"
```

---

## Task 16: Wire Journey view with 3D map + slideshow + GPX importer

**Files:**
- Modify: `src/components/journey/JourneyTab.jsx`

- [ ] **Step 1: Read JourneyTab.jsx**

Open `src/components/journey/JourneyTab.jsx`. This is the existing journey tab component. Note its current structure.

- [ ] **Step 2: Add new imports**

```jsx
import JourneyMap3D from './JourneyMap3D';
import JourneySlideshow from './JourneySlideshow';
import GpxImporter from './GpxImporter';
import { useTripStore } from '../../store/useTripStore';
```

- [ ] **Step 3: Compose the new journey layout**

In the JourneyTab JSX, add a new section (or replace any placeholder content) with:

```jsx
const { journeyData } = useTripStore();
const photos = journeyData?.photos ?? [];
const breadcrumbs = journeyData?.breadcrumbs ?? [];

// In JSX:
<div className="space-y-4 p-4">
  <GpxImporter />
  <JourneySlideshow photos={photos} />
  <JourneyMap3D breadcrumbs={breadcrumbs} photos={photos} />
</div>
```

- [ ] **Step 4: Verify full journey view in browser**

Run: `npm run dev`. Open the Journey tab. Confirm: GPX importer shows, slideshow shows empty state, 3D map renders (or shows fallback if no token). Import a sample `.gpx` file — confirm match report appears. No console errors.

- [ ] **Step 5: Run all tests**

Run: `npx vitest run`
Expected: all tests pass (vaultExtractor ×7, simulatorEngine ×5, compassEngine ×10, gpxParser ×6, elevationService ×3, plus all existing tests).

- [ ] **Step 6: Final commit**

```bash
git add src/components/journey/JourneyTab.jsx
git commit -m "feat(journey): wire JourneyTab — 3D map + slideshow + GPX importer integrated"
```

---

## Self-Review

**Spec coverage check:**

| Spec Section | Covered by Task(s) |
|---|---|
| Shared data spine (vault, booking, journeyData keys) | Task 1 |
| sentinelBus new event types | Task 2 |
| VaultHub + VaultIngest (paste/upload) | Task 9 |
| MedicAccessBadge + localStorage offline | Task 9 |
| vaultExtractor regex extraction | Task 3 |
| BookingMatrix + bookingEngine | Tasks 8, 10 |
| CancellationSimulator + simulatorEngine | Tasks 4, 10 |
| SimulatorNarrative (Claude streaming) | Task 10 |
| Sentinel integration (CANCELLATION_SIMULATED → KanbanBoard) | Task 10 (emits event; KanbanBoard already listens to sentinel events) |
| CompassRing HUD | Task 11 |
| compassEngine (bearing, cardinal, haversine) | Task 5 |
| RolePackingPrompts | Task 12 |
| rolePackingConfig | Task 7 |
| gpxParser | Task 6 |
| matchGpxToPhotos | Task 6 |
| elevationService | Task 7 |
| GpxImporter | Task 13 |
| StatOverlay | Task 13 |
| JourneySlideshow (PHOTO_ACTIVE emit) | Task 13 |
| JourneyMap3D (Mapbox GL, breadcrumb trail, photo pins) | Task 14 |
| PHOTO_ACTIVE → map.flyTo | Task 14 |
| BREADCRUMB_UPDATED → source.setData | Task 14 |
| Vault + Booking tabs in TripPlanner | Task 15 |
| Journey view wired end-to-end | Task 16 |
| permitRegistry.json | Task 8 |
| pdfjs-dist + tesseract.js install | Task 9 |
| mapbox-gl install | Task 14 |

All spec sections covered. ✓

**Type consistency check:** `simulateDelay` defined in Task 4, called in Task 10 with same signature `(legs, leg.id, delayHours)` ✓. `parseGpx` + `matchGpxToPhotos` defined in Task 6, used in Task 13 ✓. `bearing`, `cardinalLabel`, `haversineKm` defined in Task 5, used in Task 11 ✓. `VAULT_DOCUMENT_ADDED`, `CANCELLATION_SIMULATED`, `BREADCRUMB_UPDATED`, `PHOTO_ACTIVE` all defined in Task 2, imported consistently in Tasks 9, 10, 13, 14 ✓. `SET_JOURNEY_DATA` reducer case defined in Task 1, dispatched in Task 13 ✓.
