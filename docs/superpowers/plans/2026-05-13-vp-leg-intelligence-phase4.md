# Leg Intelligence Phase 4 — Transit + Flight Enrichment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add mode-specific intelligence for flight, train, bus, ferry, and boat legs — surfaced in dedicated LegLens panel components.

**Architecture:** Five new engine files and five new LegLens components, one per mode. Each engine returns a `legMeta` shape for its mode (no external API calls — data is manually editable in Phase 4, external APIs deferred to Phase 4+). A shared `TransitInfoCard` sub-component handles the carrier/number/station pattern shared by flight, train, and bus. Ferry and boat each get their own single-purpose components. `LegLens.jsx` dispatch block grows to cover all modes; remaining modes keep the existing placeholder. `waypointCategories.js` gains `layover` and `platform` categories.

**Tech Stack:** Vite + React 19, React Context+useReducer (NOT Zustand), Vitest + React Testing Library (globals:true, jsdom), JetBrains Mono throughout.

---

## File Map

**New files:**
- `src/utils/legIntelligence/engines/flightEngine.js`
- `src/utils/legIntelligence/engines/trainEngine.js`
- `src/utils/legIntelligence/engines/busEngine.js`
- `src/utils/legIntelligence/engines/ferryEngine.js`
- `src/utils/legIntelligence/engines/boatEngine.js`
- `src/utils/legIntelligence/__tests__/transitEngines.test.js` (covers all 5 engines in one file)
- `src/components/legLens/LegLensFlight.jsx`
- `src/components/legLens/LegLensTrain.jsx`
- `src/components/legLens/LegLensBus.jsx`
- `src/components/legLens/LegLensFerry.jsx`
- `src/components/legLens/LegLensBoat.jsx`
- `src/components/legLens/__tests__/LegLensTransit.test.jsx` (covers all 5 components)

**Modified files:**
- `src/utils/legIntelligence/index.js` — register all 5 new engines
- `src/utils/legIntelligence/waypointCategories.js` — add `layover`, `platform` categories
- `src/components/legLens/LegLens.jsx` — dispatch all 5 new modes

---

## Task 0: Add `layover` and `platform` waypoint categories

**Files:**
- Modify: `src/utils/legIntelligence/waypointCategories.js`
- Modify: `src/utils/legIntelligence/__tests__/waypointCategories.test.js`

- [ ] **Step 1: Write the failing tests**

Append to `src/utils/legIntelligence/__tests__/waypointCategories.test.js`:

```js
it('returns Sandstone color for layover category', () => {
  expect(getCategoryStyle('layover').color).toBe('#D9C5B2');
});
it('returns Ember color for platform category', () => {
  expect(getCategoryStyle('platform').color).toBe('#E67E22');
});
```

- [ ] **Step 2: Run to verify they fail**

`npx vitest run src/utils/legIntelligence/__tests__/waypointCategories.test.js`

- [ ] **Step 3: Add categories**

In `waypointCategories.js`, extend `WAYPOINT_CATEGORIES`:

```js
// Phase 4 additions — transit modes
layover:  { color: '#D9C5B2', icon: '⏳', label: 'Layover' },
platform: { color: '#E67E22', icon: '🚉', label: 'Platform' },
```

- [ ] **Step 4: Run to verify they pass**

`npx vitest run src/utils/legIntelligence/__tests__/waypointCategories.test.js`

- [ ] **Step 5: Commit**

```bash
git add src/utils/legIntelligence/waypointCategories.js src/utils/legIntelligence/__tests__/waypointCategories.test.js
git commit -m "feat(legIntelligence): add layover and platform waypoint categories for transit modes"
```

---

## Task 1: Five transit engines

**Files:**
- Create: `src/utils/legIntelligence/engines/flightEngine.js`
- Create: `src/utils/legIntelligence/engines/trainEngine.js`
- Create: `src/utils/legIntelligence/engines/busEngine.js`
- Create: `src/utils/legIntelligence/engines/ferryEngine.js`
- Create: `src/utils/legIntelligence/engines/boatEngine.js`
- Create: `src/utils/legIntelligence/__tests__/transitEngines.test.js`

- [ ] **Step 1: Write the failing tests**

Create `src/utils/legIntelligence/__tests__/transitEngines.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { hydrateFlightLeg } from '../engines/flightEngine.js';
import { hydrateTrainLeg } from '../engines/trainEngine.js';
import { hydrateBusLeg } from '../engines/busEngine.js';
import { hydrateFerryLeg } from '../engines/ferryEngine.js';
import { hydrateBoatLeg } from '../engines/boatEngine.js';

// ── Flight ──────────────────────────────────────────────────────────────────

describe('hydrateFlightLeg', () => {
  it('returns legMeta with mode flight', async () => {
    const { legMeta } = await hydrateFlightLeg({ id: 1, mode: 'flight', from: 'MUC', to: 'SCL' });
    expect(legMeta.mode).toBe('flight');
  });

  it('returns legMeta with carrier null by default', async () => {
    const { legMeta } = await hydrateFlightLeg({ id: 1, mode: 'flight' });
    expect(legMeta.carrier).toBeNull();
  });

  it('seeds carrier from leg.meta if present', async () => {
    const { legMeta } = await hydrateFlightLeg({ id: 1, mode: 'flight', meta: { carrier: 'LATAM', flightNumber: 'LA800' } });
    expect(legMeta.carrier).toBe('LATAM');
    expect(legMeta.flightNumber).toBe('LA800');
  });

  it('returns empty waypoints array', async () => {
    const { waypoints } = await hydrateFlightLeg({ id: 1, mode: 'flight' });
    expect(waypoints).toEqual([]);
  });

  it('includes lastHydratedAt', async () => {
    const { legMeta } = await hydrateFlightLeg({ id: 1, mode: 'flight' });
    expect(legMeta.lastHydratedAt).toBeTruthy();
  });
});

// ── Train ──────────────────────────────────────────────────────────────────

describe('hydrateTrainLeg', () => {
  it('returns legMeta with mode train', async () => {
    const { legMeta } = await hydrateTrainLeg({ id: 2, mode: 'train' });
    expect(legMeta.mode).toBe('train');
  });

  it('seeds carrier from leg.meta', async () => {
    const { legMeta } = await hydrateTrainLeg({ id: 2, mode: 'train', meta: { carrier: 'DB', trainNumber: 'ICE 1234' } });
    expect(legMeta.carrier).toBe('DB');
    expect(legMeta.trainNumber).toBe('ICE 1234');
  });

  it('returns empty waypoints by default', async () => {
    const { waypoints } = await hydrateTrainLeg({ id: 2, mode: 'train' });
    expect(waypoints).toEqual([]);
  });
});

// ── Bus ────────────────────────────────────────────────────────────────────

describe('hydrateBusLeg', () => {
  it('returns legMeta with mode bus', async () => {
    const { legMeta } = await hydrateBusLeg({ id: 3, mode: 'bus' });
    expect(legMeta.mode).toBe('bus');
  });

  it('seeds restroomBreaks from leg.meta', async () => {
    const { legMeta } = await hydrateBusLeg({ id: 3, mode: 'bus', meta: { restroomBreaks: 2 } });
    expect(legMeta.restroomBreaks).toBe(2);
  });
});

// ── Ferry ──────────────────────────────────────────────────────────────────

describe('hydrateFerryLeg', () => {
  it('returns legMeta with mode ferry', async () => {
    const { legMeta } = await hydrateFerryLeg({ id: 4, mode: 'ferry' });
    expect(legMeta.mode).toBe('ferry');
  });

  it('seeds vehicleCarried flag from leg.meta', async () => {
    const { legMeta } = await hydrateFerryLeg({ id: 4, mode: 'ferry', meta: { vehicleCarried: true } });
    expect(legMeta.vehicleCarried).toBe(true);
  });
});

// ── Boat ───────────────────────────────────────────────────────────────────

describe('hydrateBoatLeg', () => {
  it('returns legMeta with mode boat', async () => {
    const { legMeta } = await hydrateBoatLeg({ id: 5, mode: 'boat' });
    expect(legMeta.mode).toBe('boat');
  });

  it('seeds marina from leg.meta', async () => {
    const { legMeta } = await hydrateBoatLeg({ id: 5, mode: 'boat', meta: { marina: 'Puerto Natales Marina' } });
    expect(legMeta.marina).toBe('Puerto Natales Marina');
  });
});
```

- [ ] **Step 2: Run to verify they fail**

`npx vitest run src/utils/legIntelligence/__tests__/transitEngines.test.js`

- [ ] **Step 3: Create all five engines**

Create `src/utils/legIntelligence/engines/flightEngine.js`:

```js
export async function hydrateFlightLeg(leg) {
  const seed = leg?.meta ?? {};
  const legMeta = {
    mode: 'flight',
    carrier: seed.carrier ?? null,
    flightNumber: seed.flightNumber ?? null,
    departureTerminal: seed.departureTerminal ?? null,
    arrivalTerminal: seed.arrivalTerminal ?? null,
    departureGate: seed.departureGate ?? null,
    arrivalGate: seed.arrivalGate ?? null,
    seat: seed.seat ?? null,
    baggageAllowanceKg: seed.baggageAllowanceKg ?? null,
    layovers: seed.layovers ?? [],
    visaRequired: seed.visaRequired ?? false,
    lastHydratedAt: new Date().toISOString(),
  };
  return { legMeta, waypoints: [] };
}
```

Create `src/utils/legIntelligence/engines/trainEngine.js`:

```js
export async function hydrateTrainLeg(leg) {
  const seed = leg?.meta ?? {};
  const legMeta = {
    mode: 'train',
    carrier: seed.carrier ?? null,
    trainNumber: seed.trainNumber ?? null,
    departureStation: seed.departureStation ?? null,
    departurePlatform: seed.departurePlatform ?? null,
    arrivalStation: seed.arrivalStation ?? null,
    arrivalPlatform: seed.arrivalPlatform ?? null,
    classRef: seed.classRef ?? null,
    seat: seed.seat ?? null,
    transfers: seed.transfers ?? [],
    lastHydratedAt: new Date().toISOString(),
  };
  return { legMeta, waypoints: [] };
}
```

Create `src/utils/legIntelligence/engines/busEngine.js`:

```js
export async function hydrateBusLeg(leg) {
  const seed = leg?.meta ?? {};
  const legMeta = {
    mode: 'bus',
    carrier: seed.carrier ?? null,
    routeNumber: seed.routeNumber ?? null,
    departureStop: seed.departureStop ?? null,
    arrivalStop: seed.arrivalStop ?? null,
    seat: seed.seat ?? null,
    restroomBreaks: seed.restroomBreaks ?? null,
    lastHydratedAt: new Date().toISOString(),
  };
  return { legMeta, waypoints: [] };
}
```

Create `src/utils/legIntelligence/engines/ferryEngine.js`:

```js
export async function hydrateFerryLeg(leg) {
  const seed = leg?.meta ?? {};
  const legMeta = {
    mode: 'ferry',
    carrier: seed.carrier ?? null,
    vesselName: seed.vesselName ?? null,
    departurePort: seed.departurePort ?? null,
    arrivalPort: seed.arrivalPort ?? null,
    cabinRef: seed.cabinRef ?? null,
    vehicleCarried: seed.vehicleCarried ?? false,
    customsAtPort: seed.customsAtPort ?? false,
    tideWindow: seed.tideWindow ?? null,
    lastHydratedAt: new Date().toISOString(),
  };
  return { legMeta, waypoints: [] };
}
```

Create `src/utils/legIntelligence/engines/boatEngine.js`:

```js
export async function hydrateBoatLeg(leg) {
  const seed = leg?.meta ?? {};
  const legMeta = {
    mode: 'boat',
    marina: seed.marina ?? null,
    anchorages: seed.anchorages ?? [],
    portFees: seed.portFees ?? null,
    weatherWindowDate: seed.weatherWindowDate ?? null,
    tidesUrl: seed.tidesUrl ?? null,
    lastHydratedAt: new Date().toISOString(),
  };
  return { legMeta, waypoints: [] };
}
```

- [ ] **Step 4: Run to verify they pass**

`npx vitest run src/utils/legIntelligence/__tests__/transitEngines.test.js`

- [ ] **Step 5: Commit**

```bash
git add src/utils/legIntelligence/engines/flightEngine.js src/utils/legIntelligence/engines/trainEngine.js src/utils/legIntelligence/engines/busEngine.js src/utils/legIntelligence/engines/ferryEngine.js src/utils/legIntelligence/engines/boatEngine.js src/utils/legIntelligence/__tests__/transitEngines.test.js
git commit -m "feat(legIntelligence): add flight/train/bus/ferry/boat engines with legMeta shapes"
```

---

## Task 2: Five LegLens transit components + LegLens dispatch

**Files:**
- Create: `src/components/legLens/LegLensFlight.jsx`
- Create: `src/components/legLens/LegLensTrain.jsx`
- Create: `src/components/legLens/LegLensBus.jsx`
- Create: `src/components/legLens/LegLensFerry.jsx`
- Create: `src/components/legLens/LegLensBoat.jsx`
- Create: `src/components/legLens/__tests__/LegLensTransit.test.jsx`
- Modify: `src/components/legLens/LegLens.jsx`
- Modify: `src/utils/legIntelligence/index.js`

- [ ] **Step 1: Write the failing tests**

Create `src/components/legLens/__tests__/LegLensTransit.test.jsx`:

```jsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LegLensFlight } from '../LegLensFlight.jsx';
import { LegLensTrain } from '../LegLensTrain.jsx';
import { LegLensBus } from '../LegLensBus.jsx';
import { LegLensFerry } from '../LegLensFerry.jsx';
import { LegLensBoat } from '../LegLensBoat.jsx';

const flightMeta = { mode: 'flight', carrier: 'LATAM', flightNumber: 'LA800', departureTerminal: 'T2', arrivalTerminal: 'T1', seat: '24A', baggageAllowanceKg: 23, layovers: [], visaRequired: false, lastHydratedAt: '' };
const trainMeta  = { mode: 'train',  carrier: 'DB',    trainNumber: 'ICE 1234', departureStation: 'Munich Hbf', departurePlatform: '14', arrivalStation: 'Salzburg Hbf', arrivalPlatform: '2', classRef: '1st', seat: '45B', transfers: [], lastHydratedAt: '' };
const busMeta    = { mode: 'bus',    carrier: 'FlixBus', routeNumber: 'F301', departureStop: 'ZOB München', arrivalStop: 'Santiago', seat: 'Row 12', restroomBreaks: 2, lastHydratedAt: '' };
const ferryMeta  = { mode: 'ferry',  carrier: 'Navimag', vesselName: 'Evangelistas', departurePort: 'Puerto Montt', arrivalPort: 'Puerto Natales', vehicleCarried: true, customsAtPort: false, cabinRef: 'C12', tideWindow: null, lastHydratedAt: '' };
const boatMeta   = { mode: 'boat',   marina: 'Puerto Natales Marina', anchorages: ['Caleta Brecknock'], portFees: 40, weatherWindowDate: '2026-11-15', tidesUrl: null, lastHydratedAt: '' };

const baseLeg = { id: 1, waypoints: [] };

describe('LegLensFlight', () => {
  it('shows carrier name', () => {
    render(<LegLensFlight leg={{ ...baseLeg, mode: 'flight', legMeta: flightMeta }} onHydrate={() => {}} />);
    expect(screen.getByText(/LATAM/)).toBeInTheDocument();
  });
  it('shows flight number', () => {
    render(<LegLensFlight leg={{ ...baseLeg, mode: 'flight', legMeta: flightMeta }} onHydrate={() => {}} />);
    expect(screen.getByText(/LA800/)).toBeInTheDocument();
  });
  it('shows seat', () => {
    render(<LegLensFlight leg={{ ...baseLeg, mode: 'flight', legMeta: flightMeta }} onHydrate={() => {}} />);
    expect(screen.getByText(/24A/)).toBeInTheDocument();
  });
  it('shows loading when no legMeta', () => {
    render(<LegLensFlight leg={{ ...baseLeg, mode: 'flight' }} onHydrate={() => {}} />);
    expect(screen.getByText(/flight intelligence/i)).toBeInTheDocument();
  });
});

describe('LegLensTrain', () => {
  it('shows train number', () => {
    render(<LegLensTrain leg={{ ...baseLeg, mode: 'train', legMeta: trainMeta }} onHydrate={() => {}} />);
    expect(screen.getByText(/ICE 1234/)).toBeInTheDocument();
  });
  it('shows departure platform', () => {
    render(<LegLensTrain leg={{ ...baseLeg, mode: 'train', legMeta: trainMeta }} onHydrate={() => {}} />);
    expect(screen.getByText(/14/)).toBeInTheDocument();
  });
  it('shows loading when no legMeta', () => {
    render(<LegLensTrain leg={{ ...baseLeg, mode: 'train' }} onHydrate={() => {}} />);
    expect(screen.getByText(/train intelligence/i)).toBeInTheDocument();
  });
});

describe('LegLensBus', () => {
  it('shows carrier', () => {
    render(<LegLensBus leg={{ ...baseLeg, mode: 'bus', legMeta: busMeta }} onHydrate={() => {}} />);
    expect(screen.getByText(/FlixBus/)).toBeInTheDocument();
  });
  it('shows restroom break count', () => {
    render(<LegLensBus leg={{ ...baseLeg, mode: 'bus', legMeta: busMeta }} onHydrate={() => {}} />);
    expect(screen.getByText(/2/)).toBeInTheDocument();
  });
  it('shows loading when no legMeta', () => {
    render(<LegLensBus leg={{ ...baseLeg, mode: 'bus' }} onHydrate={() => {}} />);
    expect(screen.getByText(/bus intelligence/i)).toBeInTheDocument();
  });
});

describe('LegLensFerry', () => {
  it('shows vessel name', () => {
    render(<LegLensFerry leg={{ ...baseLeg, mode: 'ferry', legMeta: ferryMeta }} onHydrate={() => {}} />);
    expect(screen.getByText(/Evangelistas/)).toBeInTheDocument();
  });
  it('shows vehicle carried badge when true', () => {
    render(<LegLensFerry leg={{ ...baseLeg, mode: 'ferry', legMeta: ferryMeta }} onHydrate={() => {}} />);
    expect(screen.getByText(/vehicle/i)).toBeInTheDocument();
  });
  it('shows loading when no legMeta', () => {
    render(<LegLensFerry leg={{ ...baseLeg, mode: 'ferry' }} onHydrate={() => {}} />);
    expect(screen.getByText(/ferry intelligence/i)).toBeInTheDocument();
  });
});

describe('LegLensBoat', () => {
  it('shows marina name', () => {
    render(<LegLensBoat leg={{ ...baseLeg, mode: 'boat', legMeta: boatMeta }} onHydrate={() => {}} />);
    expect(screen.getByText(/Puerto Natales Marina/)).toBeInTheDocument();
  });
  it('shows port fees', () => {
    render(<LegLensBoat leg={{ ...baseLeg, mode: 'boat', legMeta: boatMeta }} onHydrate={() => {}} />);
    expect(screen.getByText(/40/)).toBeInTheDocument();
  });
  it('shows loading when no legMeta', () => {
    render(<LegLensBoat leg={{ ...baseLeg, mode: 'boat' }} onHydrate={() => {}} />);
    expect(screen.getByText(/boat intelligence/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify they fail**

`npx vitest run src/components/legLens/__tests__/LegLensTransit.test.jsx`

- [ ] **Step 3: Create the five components**

Create `src/components/legLens/LegLensFlight.jsx`:

```jsx
import { useEffect } from 'react';

const S = '#D9C5B2';

function Row({ label, value, color = S }) {
  if (value == null || value === '') return null;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', padding: '3px 0' }}>
      <span style={{ color: '#666' }}>{label}</span>
      <span style={{ color }}>{String(value)}</span>
    </div>
  );
}

export function LegLensFlight({ leg, onHydrate }) {
  const meta = leg?.legMeta;
  useEffect(() => { if (!meta && onHydrate) onHydrate(leg?.id); }, [leg?.id]);

  if (!meta) {
    return <div style={{ fontFamily: 'JetBrains Mono, monospace', color: S, padding: 16 }}>Loading flight intelligence…</div>;
  }

  return (
    <div style={{ fontFamily: 'JetBrains Mono, monospace', background: '#0E1012', color: S }}>
      <section style={{ padding: '12px 16px', borderBottom: '1px solid #1f1f1f' }}>
        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#666', marginBottom: 8 }}>Flight Details</div>
        <Row label="Carrier" value={meta.carrier} color="#E67E22" />
        <Row label="Flight" value={meta.flightNumber} color="#E67E22" />
        <Row label="Seat" value={meta.seat} />
        <Row label="Baggage" value={meta.baggageAllowanceKg != null ? `${meta.baggageAllowanceKg} kg` : null} />
      </section>
      <section style={{ padding: '12px 16px', borderBottom: '1px solid #1f1f1f' }}>
        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#666', marginBottom: 8 }}>Terminals & Gates</div>
        <Row label="Dep. terminal" value={meta.departureTerminal} />
        <Row label="Dep. gate" value={meta.departureGate} />
        <Row label="Arr. terminal" value={meta.arrivalTerminal} />
        <Row label="Arr. gate" value={meta.arrivalGate} />
      </section>
      {meta.layovers?.length > 0 && (
        <section style={{ padding: '12px 16px', borderBottom: '1px solid #1f1f1f' }}>
          <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#666', marginBottom: 8 }}>Layovers</div>
          {meta.layovers.map((l, i) => (
            <div key={i} style={{ fontSize: '0.82rem', padding: '2px 0' }}>⏳ {l.airport} — {l.durationMin} min</div>
          ))}
        </section>
      )}
      {meta.visaRequired && (
        <section style={{ padding: '12px 16px' }}>
          <div style={{ color: '#F2A900', fontSize: '0.82rem' }}>⚠ Visa required</div>
        </section>
      )}
    </div>
  );
}
```

Create `src/components/legLens/LegLensTrain.jsx`:

```jsx
import { useEffect } from 'react';

const S = '#D9C5B2';

function Row({ label, value, color = S }) {
  if (value == null || value === '') return null;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', padding: '3px 0' }}>
      <span style={{ color: '#666' }}>{label}</span>
      <span style={{ color }}>{String(value)}</span>
    </div>
  );
}

export function LegLensTrain({ leg, onHydrate }) {
  const meta = leg?.legMeta;
  useEffect(() => { if (!meta && onHydrate) onHydrate(leg?.id); }, [leg?.id]);

  if (!meta) {
    return <div style={{ fontFamily: 'JetBrains Mono, monospace', color: S, padding: 16 }}>Loading train intelligence…</div>;
  }

  return (
    <div style={{ fontFamily: 'JetBrains Mono, monospace', background: '#0E1012', color: S }}>
      <section style={{ padding: '12px 16px', borderBottom: '1px solid #1f1f1f' }}>
        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#666', marginBottom: 8 }}>Train Details</div>
        <Row label="Carrier" value={meta.carrier} color="#E67E22" />
        <Row label="Train" value={meta.trainNumber} color="#E67E22" />
        <Row label="Class" value={meta.classRef} />
        <Row label="Seat" value={meta.seat} />
      </section>
      <section style={{ padding: '12px 16px' }}>
        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#666', marginBottom: 8 }}>Stations</div>
        <Row label="Departs" value={meta.departureStation} />
        <Row label="Platform" value={meta.departurePlatform} color="#E67E22" />
        <Row label="Arrives" value={meta.arrivalStation} />
        <Row label="Platform" value={meta.arrivalPlatform} color="#E67E22" />
      </section>
    </div>
  );
}
```

Create `src/components/legLens/LegLensBus.jsx`:

```jsx
import { useEffect } from 'react';

const S = '#D9C5B2';

function Row({ label, value, color = S }) {
  if (value == null || value === '') return null;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', padding: '3px 0' }}>
      <span style={{ color: '#666' }}>{label}</span>
      <span style={{ color }}>{String(value)}</span>
    </div>
  );
}

export function LegLensBus({ leg, onHydrate }) {
  const meta = leg?.legMeta;
  useEffect(() => { if (!meta && onHydrate) onHydrate(leg?.id); }, [leg?.id]);

  if (!meta) {
    return <div style={{ fontFamily: 'JetBrains Mono, monospace', color: S, padding: 16 }}>Loading bus intelligence…</div>;
  }

  return (
    <div style={{ fontFamily: 'JetBrains Mono, monospace', background: '#0E1012', color: S }}>
      <section style={{ padding: '12px 16px', borderBottom: '1px solid #1f1f1f' }}>
        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#666', marginBottom: 8 }}>Bus Details</div>
        <Row label="Carrier" value={meta.carrier} color="#E67E22" />
        <Row label="Route" value={meta.routeNumber} />
        <Row label="Seat" value={meta.seat} />
        <Row label="Restroom breaks" value={meta.restroomBreaks} />
      </section>
      <section style={{ padding: '12px 16px' }}>
        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#666', marginBottom: 8 }}>Stops</div>
        <Row label="Departs" value={meta.departureStop} />
        <Row label="Arrives" value={meta.arrivalStop} />
      </section>
    </div>
  );
}
```

Create `src/components/legLens/LegLensFerry.jsx`:

```jsx
import { useEffect } from 'react';

const S = '#D9C5B2';

function Row({ label, value, color = S }) {
  if (value == null || value === '') return null;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', padding: '3px 0' }}>
      <span style={{ color: '#666' }}>{label}</span>
      <span style={{ color }}>{String(value)}</span>
    </div>
  );
}

export function LegLensFerry({ leg, onHydrate }) {
  const meta = leg?.legMeta;
  useEffect(() => { if (!meta && onHydrate) onHydrate(leg?.id); }, [leg?.id]);

  if (!meta) {
    return <div style={{ fontFamily: 'JetBrains Mono, monospace', color: S, padding: 16 }}>Loading ferry intelligence…</div>;
  }

  return (
    <div style={{ fontFamily: 'JetBrains Mono, monospace', background: '#0E1012', color: S }}>
      <section style={{ padding: '12px 16px', borderBottom: '1px solid #1f1f1f' }}>
        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#666', marginBottom: 8 }}>Ferry Details</div>
        <Row label="Carrier" value={meta.carrier} color="#E67E22" />
        <Row label="Vessel" value={meta.vesselName} color="#E67E22" />
        <Row label="Cabin" value={meta.cabinRef} />
        {meta.vehicleCarried && <div style={{ fontSize: '0.8rem', color: '#F2A900', marginTop: 4 }}>🚗 Vehicle on board</div>}
        {meta.customsAtPort && <div style={{ fontSize: '0.8rem', color: '#F2A900', marginTop: 4 }}>🛂 Customs at arrival port</div>}
      </section>
      <section style={{ padding: '12px 16px' }}>
        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#666', marginBottom: 8 }}>Ports</div>
        <Row label="Departs" value={meta.departurePort} />
        <Row label="Arrives" value={meta.arrivalPort} />
      </section>
    </div>
  );
}
```

Create `src/components/legLens/LegLensBoat.jsx`:

```jsx
import { useEffect } from 'react';

const S = '#D9C5B2';

function Row({ label, value, color = S }) {
  if (value == null || value === '') return null;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', padding: '3px 0' }}>
      <span style={{ color: '#666' }}>{label}</span>
      <span style={{ color }}>{String(value)}</span>
    </div>
  );
}

export function LegLensBoat({ leg, onHydrate }) {
  const meta = leg?.legMeta;
  useEffect(() => { if (!meta && onHydrate) onHydrate(leg?.id); }, [leg?.id]);

  if (!meta) {
    return <div style={{ fontFamily: 'JetBrains Mono, monospace', color: S, padding: 16 }}>Loading boat intelligence…</div>;
  }

  return (
    <div style={{ fontFamily: 'JetBrains Mono, monospace', background: '#0E1012', color: S }}>
      <section style={{ padding: '12px 16px', borderBottom: '1px solid #1f1f1f' }}>
        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#666', marginBottom: 8 }}>Boat Details</div>
        <Row label="Marina" value={meta.marina} color="#E67E22" />
        <Row label="Port fees" value={meta.portFees != null ? `€${meta.portFees}` : null} />
        <Row label="Weather window" value={meta.weatherWindowDate} />
      </section>
      {meta.anchorages?.length > 0 && (
        <section style={{ padding: '12px 16px' }}>
          <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#666', marginBottom: 8 }}>Anchorages</div>
          {meta.anchorages.map((a, i) => (
            <div key={i} style={{ fontSize: '0.82rem', padding: '2px 0' }}>⚓ {a}</div>
          ))}
        </section>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Update LegLens.jsx to dispatch all 5 new modes**

In `src/components/legLens/LegLens.jsx`, add imports:

```jsx
import { LegLensCar } from './LegLensCar.jsx';
import { LegLensFoot } from './LegLensFoot.jsx';
import { LegLensFlight } from './LegLensFlight.jsx';
import { LegLensTrain } from './LegLensTrain.jsx';
import { LegLensBus } from './LegLensBus.jsx';
import { LegLensFerry } from './LegLensFerry.jsx';
import { LegLensBoat } from './LegLensBoat.jsx';
```

Replace the mode dispatch block with:

```jsx
{leg.mode === 'car' ? (
  <LegLensCar leg={leg} nextStay={nextStay} onVariantSelect={onVariantSelect} onWaypointConfirm={onWaypointConfirm} onWaypointBook={onWaypointBook} onWaypointDismiss={onWaypointDismiss} onHydrate={onHydrate} />
) : leg.mode === 'foot' ? (
  <LegLensFoot leg={leg} onHydrate={onHydrate} />
) : leg.mode === 'flight' ? (
  <LegLensFlight leg={leg} onHydrate={onHydrate} />
) : leg.mode === 'train' ? (
  <LegLensTrain leg={leg} onHydrate={onHydrate} />
) : leg.mode === 'bus' ? (
  <LegLensBus leg={leg} onHydrate={onHydrate} />
) : leg.mode === 'ferry' ? (
  <LegLensFerry leg={leg} onHydrate={onHydrate} />
) : leg.mode === 'boat' ? (
  <LegLensBoat leg={leg} onHydrate={onHydrate} />
) : (
  <LegLensPlaceholder mode={leg.mode} />
)}
```

- [ ] **Step 5: Register all engines in index.js**

In `src/utils/legIntelligence/index.js`:

```js
import { hydrateCarLeg } from './engines/carEngine.js';
import { hydrateFootLeg } from './engines/footEngine.js';
import { hydrateFlightLeg } from './engines/flightEngine.js';
import { hydrateTrainLeg } from './engines/trainEngine.js';
import { hydrateBusLeg } from './engines/busEngine.js';
import { hydrateFerryLeg } from './engines/ferryEngine.js';
import { hydrateBoatLeg } from './engines/boatEngine.js';

const ENGINES = {
  car:    hydrateCarLeg,
  foot:   hydrateFootLeg,
  flight: hydrateFlightLeg,
  train:  hydrateTrainLeg,
  bus:    hydrateBusLeg,
  ferry:  hydrateFerryLeg,
  boat:   hydrateBoatLeg,
};

export async function hydrateLeg(leg) {
  const engine = ENGINES[leg?.mode];
  if (!engine) return { legMeta: null, waypoints: [] };
  return engine(leg);
}

export { WAYPOINT_CATEGORIES, getCategoryStyle } from './waypointCategories.js';
```

- [ ] **Step 6: Run all Phase 4 tests**

`npx vitest run src/utils/legIntelligence/__tests__/transitEngines.test.js src/components/legLens/__tests__/LegLensTransit.test.jsx`

- [ ] **Step 7: Commit**

```bash
git add src/components/legLens/LegLensFlight.jsx src/components/legLens/LegLensTrain.jsx src/components/legLens/LegLensBus.jsx src/components/legLens/LegLensFerry.jsx src/components/legLens/LegLensBoat.jsx src/components/legLens/__tests__/LegLensTransit.test.jsx src/components/legLens/LegLens.jsx src/utils/legIntelligence/index.js
git commit -m "feat(legLens): add flight/train/bus/ferry/boat Leg Lens panels; wire all modes in dispatcher"
```

---

## Task 3: Phase 4 end-to-end verification

- [ ] **Step 1: Run full Phase 4 test suite**

```bash
npx vitest run src/utils/legIntelligence/__tests__/waypointCategories.test.js src/utils/legIntelligence/__tests__/transitEngines.test.js src/components/legLens/__tests__/LegLensTransit.test.jsx
```

Expected: ≥ 32 tests pass.

- [ ] **Step 2: Confirm commits**

`git log --oneline -6`

Expected: 3 Phase 4 commits (categories, engines, components+LegLens dispatch).

- [ ] **Step 3: Append log entry**

Append to `C:\Users\lasse\Desktop\holyflex\logs\2026-05-13.md`:

```
## [HH:MM] VP Phase 4 — Transit + Flight Enrichment
- Added layover and platform waypoint categories
- Added 5 transit engines (flight/train/bus/ferry/boat) with legMeta shapes
- Added 5 LegLens components (LegLensFlight, LegLensTrain, LegLensBus, LegLensFerry, LegLensBoat)
- LegLens now dispatches all 7 modes (car, foot, flight, train, bus, ferry, boat)
- Files changed: waypointCategories.js, flightEngine.js, trainEngine.js, busEngine.js, ferryEngine.js, boatEngine.js, LegLensFlight.jsx, LegLensTrain.jsx, LegLensBus.jsx, LegLensFerry.jsx, LegLensBoat.jsx, LegLens.jsx, index.js
```
