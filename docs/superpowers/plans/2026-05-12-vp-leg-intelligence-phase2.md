# Leg Intelligence Phase 2 — Camping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Add first-class camping support to VenturePath — `Stay.kind` discriminator, rich `CampMeta`, `CampLens` overlay on inbound leg, PackingEngine cascade for bear/fire/water gear, and the new Spruce `#3A6B5C` brand token.

**Architecture:** `Stay.kind` is a discriminated union tag that activates `campMeta` when set to `'camp'|'wild'|'shelter'`. `CampLens` is a new component that overlays on the inbound car/foot leg's `LegLens` when the next stay is a camp kind. PackingEngine reads stays from the trip store and auto-suggests camping-specific gear.

**Tech Stack:** Vite + React 19, React Context + useReducer (NOT Zustand), Vitest + @testing-library/react, dnd-kit (sleep arrangement is deferred — squad data not in store yet), JetBrains Mono, VP brand tokens.

**Phase 1 must be complete:** `feat/leg-intelligence-phase1` branch with Tasks 0-17 all committed.

---

### Task 0: Store — Stay.kind + campMeta reducers

**Files:**
- Modify: `src/store/useTripStore.jsx`
- Create: `src/store/__tests__/useTripStore.camping.test.jsx`

**What to change in useTripStore.jsx:**

1. In `ADD_STAY` case, default `kind` to `'hotel'`:
```js
case 'ADD_STAY': {
  const stay = { ...action.payload, id: action.payload.id ?? crypto.randomUUID(), kind: action.payload.kind ?? 'hotel' };
  return { ...state, stays: [...state.stays, stay] };
}
```

2. Add two new cases after `REMOVE_STAY`:
```js
case 'SET_CAMP_META': {
  const { stayId, campMeta } = action.payload;
  const stays = state.stays.map(s => s.id === stayId ? { ...s, campMeta } : s);
  return { ...state, stays };
}
case 'UPDATE_CAMP_META': {
  const { stayId, patch } = action.payload;
  const stays = state.stays.map(s =>
    s.id === stayId ? { ...s, campMeta: { ...(s.campMeta ?? {}), ...patch } } : s
  );
  return { ...state, stays };
}
```

3. Add action creators in TripStoreProvider (after `removeStay`):
```js
const setCampMeta = (stayId, campMeta) =>
  dispatch({ type: 'SET_CAMP_META', payload: { stayId, campMeta } });
const updateCampMeta = (stayId, patch) =>
  dispatch({ type: 'UPDATE_CAMP_META', payload: { stayId, patch } });
```

4. Add `setCampMeta, updateCampMeta` to the Context value object.

**Test file** (`src/store/__tests__/useTripStore.camping.test.jsx`):
```jsx
import { renderHook, act } from '@testing-library/react';
import { TripStoreProvider, useTripStore } from '../useTripStore';

beforeEach(() => localStorage.clear());
const wrapper = ({ children }) => <TripStoreProvider>{children}</TripStoreProvider>;

describe('camping store actions', () => {
  it('ADD_STAY defaults kind to hotel', () => {
    const { result } = renderHook(() => useTripStore(), { wrapper });
    act(() => { result.current.addStay({ name: 'Sheraton' }); });
    expect(result.current.stays.at(-1).kind).toBe('hotel');
  });

  it('ADD_STAY preserves explicit kind', () => {
    const { result } = renderHook(() => useTripStore(), { wrapper });
    act(() => { result.current.addStay({ name: 'Wild camp', kind: 'wild' }); });
    expect(result.current.stays.at(-1).kind).toBe('wild');
  });

  it('setCampMeta sets campMeta on the stay', () => {
    const { result } = renderHook(() => useTripStore(), { wrapper });
    let stayId;
    act(() => { result.current.addStay({ id: 'stay-c1', name: 'Campsite', kind: 'camp' }); stayId = 'stay-c1'; });
    act(() => { result.current.setCampMeta(stayId, { bearCountry: true, siteType: 'tent' }); });
    const stay = result.current.stays.find(s => s.id === stayId);
    expect(stay.campMeta.bearCountry).toBe(true);
    expect(stay.campMeta.siteType).toBe('tent');
  });

  it('updateCampMeta patches campMeta fields without overwriting others', () => {
    const { result } = renderHook(() => useTripStore(), { wrapper });
    act(() => { result.current.addStay({ id: 'stay-c2', name: 'Wild Pitch', kind: 'wild' }); });
    act(() => { result.current.setCampMeta('stay-c2', { bearCountry: true, siteType: 'bivy' }); });
    act(() => { result.current.updateCampMeta('stay-c2', { siteType: 'hammock' }); });
    const stay = result.current.stays.find(s => s.id === 'stay-c2');
    expect(stay.campMeta.bearCountry).toBe(true); // preserved
    expect(stay.campMeta.siteType).toBe('hammock'); // updated
  });

  it('updateCampMeta works even with no prior campMeta', () => {
    const { result } = renderHook(() => useTripStore(), { wrapper });
    act(() => { result.current.addStay({ id: 'stay-c3', name: 'Shelter', kind: 'shelter' }); });
    act(() => { result.current.updateCampMeta('stay-c3', { sanitation: 'pack-out' }); });
    const stay = result.current.stays.find(s => s.id === 'stay-c3');
    expect(stay.campMeta.sanitation).toBe('pack-out');
  });
});
```

- [ ] Write test file
- [ ] Run `npx vitest run src/store/__tests__/useTripStore.camping.test.jsx` → confirm FAIL
- [ ] Make the store changes
- [ ] Run tests → confirm all 5 pass
- [ ] `git add src/store/useTripStore.jsx src/store/__tests__/useTripStore.camping.test.jsx`
- [ ] `git commit -m "feat(store): add Stay.kind, SET_CAMP_META, UPDATE_CAMP_META reducers"`
- [ ] Append log entry to `C:\Users\lasse\Desktop\holyflex\logs\2026-05-12.md`

---

### Task 1: CampLens component

**Files:**
- Create: `src/components/legLens/CampLens.jsx`
- Create: `src/components/legLens/__tests__/CampLens.test.jsx`

**Spec:** A purely display component (no store access) showing the camping safety overlay. Renders inside `LegLensCar` when the next stay after this leg is `kind: 'camp'|'wild'|'shelter'`.

**Props:** `{ stay, campMeta }` where `campMeta` may be partial.

**Implementation:**
```jsx
// src/components/legLens/CampLens.jsx
const SPRUCE = '#3A6B5C';

export function CampLens({ stay, campMeta = {} }) {
  const {
    siteType,
    bearCountry,
    bearStorage,
    fireRules = {},
    waterSource = {},
    sanitation,
    permits = [],
    alternates = [],
  } = campMeta;

  return (
    <div style={{ fontFamily: 'JetBrains Mono, monospace', background: '#0E1012', color: '#D9C5B2', borderTop: `2px solid ${SPRUCE}` }}>
      <div style={{ padding: '10px 16px', background: 'rgba(58,107,92,0.12)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: '1rem' }}>🏕</span>
        <span style={{ color: SPRUCE, fontWeight: 600, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Camp Intelligence — {stay?.name ?? 'Camp'}
        </span>
        {stay?.kind === 'wild' && (
          <span style={{ marginLeft: 'auto', fontSize: '0.65rem', color: '#F2A900', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Wild Pitch
          </span>
        )}
      </div>

      <div style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Permits */}
        {permits.length > 0 && (
          <Row icon="📋" label="Permits" value={permits.map(p => p.name ?? p).join(', ')} color="#F2A900" />
        )}
        {permits.length === 0 && (
          <Row icon="📋" label="Permits" value="None required" color={SPRUCE} />
        )}

        {/* Fire rules */}
        <Row
          icon={fireRules.permitted === false ? '🔥🚫' : '🔥'}
          label="Fire"
          value={fireRules.permitted === false ? (fireRules.stoveOnly ? 'Stove only' : 'Fire ban') : 'Permitted'}
          color={fireRules.permitted === false ? '#dc2626' : SPRUCE}
        />

        {/* Water */}
        <Row
          icon="💧"
          label="Water"
          value={waterSource.type
            ? `${waterSource.type}${waterSource.treatRequired ? ' — treat required' : ''}${waterSource.distanceM ? ` (${waterSource.distanceM}m)` : ''}`
            : 'Unknown — carry own'}
          color={waterSource.treatRequired ? '#F2A900' : SPRUCE}
        />

        {/* Bear */}
        {bearCountry && (
          <Row
            icon="🐻"
            label="Bear country"
            value={bearStorage ?? 'canister-required'}
            color="#F2A900"
          />
        )}

        {/* Sanitation */}
        {sanitation && <Row icon="🚽" label="Sanitation" value={sanitation} color="#D9C5B2" />}

        {/* Alternates */}
        {alternates.length > 0 && (
          <Row icon="↔" label="Alternates" value={`${alternates.length} backup site${alternates.length > 1 ? 's' : ''}`} color="#D9C5B2" />
        )}
      </div>
    </div>
  );
}

function Row({ icon, label, value, color }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: '0.78rem' }}>
      <span style={{ flexShrink: 0, width: 18 }}>{icon}</span>
      <span style={{ color: '#666', minWidth: 70, flexShrink: 0 }}>{label}</span>
      <span style={{ color }}>{value}</span>
    </div>
  );
}
```

**Tests:**
```jsx
import { render, screen } from '@testing-library/react';
import { CampLens } from '../CampLens';

const stay = { id: 'stay-1', name: 'Chiemsee Süd', kind: 'camp' };

const campMeta = {
  siteType: 'tent',
  bearCountry: true,
  bearStorage: 'canister-required',
  fireRules: { permitted: false, stoveOnly: true },
  waterSource: { type: 'stream', treatRequired: true, distanceM: 200 },
  sanitation: 'pack-out',
  permits: [{ name: 'NPS backcountry' }],
  alternates: ['alt-stay-1'],
};

describe('CampLens', () => {
  it('renders camp name in header', () => {
    render(<CampLens stay={stay} campMeta={campMeta} />);
    expect(screen.getByText(/Chiemsee Süd/)).toBeInTheDocument();
  });

  it('shows fire ban when fireRules.permitted is false', () => {
    render(<CampLens stay={stay} campMeta={campMeta} />);
    expect(screen.getByText('Stove only')).toBeInTheDocument();
  });

  it('shows water source with treat required', () => {
    render(<CampLens stay={stay} campMeta={campMeta} />);
    expect(screen.getByText(/treat required/)).toBeInTheDocument();
  });

  it('shows bear country warning', () => {
    render(<CampLens stay={stay} campMeta={campMeta} />);
    expect(screen.getByText(/canister-required/)).toBeInTheDocument();
  });

  it('shows permit name', () => {
    render(<CampLens stay={stay} campMeta={campMeta} />);
    expect(screen.getByText(/NPS backcountry/)).toBeInTheDocument();
  });

  it('shows Wild Pitch badge for wild kind', () => {
    render(<CampLens stay={{ ...stay, kind: 'wild' }} campMeta={campMeta} />);
    expect(screen.getByText('Wild Pitch')).toBeInTheDocument();
  });

  it('renders gracefully with empty campMeta', () => {
    render(<CampLens stay={stay} campMeta={{}} />);
    expect(screen.getByText(/Chiemsee Süd/)).toBeInTheDocument();
    expect(screen.getByText(/None required/)).toBeInTheDocument();
  });
});
```

- [ ] Write test file
- [ ] Run → confirm FAIL
- [ ] Write component
- [ ] Run → confirm 7 pass
- [ ] `git add src/components/legLens/CampLens.jsx src/components/legLens/__tests__/CampLens.test.jsx`
- [ ] `git commit -m "feat(legLens): add CampLens overlay with permit/fire/water/bear/alternates"`
- [ ] Append log entry

---

### Task 2: Wire CampLens into LegLensCar

**Files:**
- Modify: `src/components/legLens/LegLensCar.jsx`
- Modify: `src/components/legLens/LegLens.jsx`
- Modify: `src/components/legLens/__tests__/LegLensCar.test.jsx` (add tests)

**What to change:**

In `LegLens.jsx` — add `nextStay` prop and pass it through:
```jsx
export function LegLens({ leg, nextStay, onVariantSelect, ... }) {
  // ...existing code...
  {leg.mode === 'car' ? (
    <LegLensCar leg={leg} nextStay={nextStay} onVariantSelect={...} ... />
  ) : ( ... )}
}
```

In `LegLensCar.jsx` — add `nextStay` prop, import CampLens, render at bottom:
```jsx
import { CampLens } from './CampLens.jsx';

const CAMP_KINDS = new Set(['camp', 'wild', 'shelter']);

export function LegLensCar({ leg, nextStay, onVariantSelect, ... }) {
  // ...existing code...
  // At the very end, after the Waypoints section:
  {nextStay && CAMP_KINDS.has(nextStay.kind) && (
    <CampLens stay={nextStay} campMeta={nextStay.campMeta ?? {}} />
  )}
}
```

**New tests to add to LegLensCar.test.jsx:**
```jsx
it('renders CampLens when nextStay.kind is wild', () => {
  const nextStay = { id: 'stay-w1', name: 'Wild Pitch Site', kind: 'wild', campMeta: { bearCountry: true } };
  render(<LegLensCar leg={legWithMeta} nextStay={nextStay} onVariantSelect={vi.fn()} onWaypointConfirm={vi.fn()} onWaypointBook={vi.fn()} onWaypointDismiss={vi.fn()} onHydrate={vi.fn()} />);
  expect(screen.getByText(/Wild Pitch Site/)).toBeInTheDocument();
});

it('does NOT render CampLens when nextStay.kind is hotel', () => {
  const nextStay = { id: 'stay-h1', name: 'Hotel Hafen', kind: 'hotel' };
  render(<LegLensCar leg={legWithMeta} nextStay={nextStay} onVariantSelect={vi.fn()} onWaypointConfirm={vi.fn()} onWaypointBook={vi.fn()} onWaypointDismiss={vi.fn()} onHydrate={vi.fn()} />);
  expect(screen.queryByText(/Hotel Hafen/)).not.toBeInTheDocument();
});
```

Also update **TripPlanner.jsx** — pass `nextStay` to LegLens:
Find the leg that's active, find the next stay after it. Simple heuristic: first stay with `kind === 'camp'|'wild'|'shelter'` for now (Phase 2 scope):
```jsx
// In TripPlanner, where LegLens is mounted:
const activeLeg = legs.find(l => l.id === activeLegId) ?? null;
const nextCampStay = stays.find(s => ['camp','wild','shelter'].includes(s.kind)) ?? null;

<LegLens
  leg={activeLeg}
  nextStay={nextCampStay}
  ...existing props...
/>
```

- [ ] Modify LegLensCar.jsx to accept nextStay + render CampLens
- [ ] Modify LegLens.jsx to accept nextStay + pass to LegLensCar
- [ ] Add 2 tests to LegLensCar.test.jsx
- [ ] Run `npx vitest run src/components/legLens` → confirm new tests + existing pass
- [ ] Modify TripPlanner.jsx to pass nextStay
- [ ] `git add src/components/legLens/LegLensCar.jsx src/components/legLens/LegLens.jsx src/components/legLens/__tests__/LegLensCar.test.jsx src/pages/TripPlanner.jsx`
- [ ] `git commit -m "feat(legLens): wire CampLens into LegLensCar when next stay is camp/wild/shelter"`
- [ ] Append log entry

---

### Task 3: PackingEngine camp gear cascade

**Files:**
- Create: `src/utils/campingGear.js`
- Create: `src/utils/__tests__/campingGear.test.js`
- Modify: `src/components/logistics/PackingEngine.jsx`

**Utility function** (`src/utils/campingGear.js`):
```js
// Returns array of { id, name, category, reason } gear items driven by campMeta
export function deriveCampingGear(stays = []) {
  const gear = [];
  const seen = new Set();

  function add(id, name, category, reason) {
    if (!seen.has(id)) { seen.add(id); gear.push({ id, name, category, reason }); }
  }

  const campStays = stays.filter(s => ['camp', 'wild', 'shelter'].includes(s.kind));
  if (campStays.length === 0) return [];

  // Every camping stay gets a tent
  add('tent', 'Tent / shelter', 'Gear', 'camping night');

  campStays.forEach(stay => {
    const meta = stay.campMeta ?? {};

    if (meta.bearCountry) {
      add('bear-canister', 'Bear canister', 'Gear', 'bear country at ' + stay.name);
    }
    if (meta.fireRules?.permitted === false) {
      add('camp-stove', 'Camp stove + fuel', 'Gear', 'fire ban at ' + stay.name);
    }
    if (meta.waterSource?.treatRequired) {
      add('water-filter', 'Water filter / purification tabs', 'Gear', 'water treatment at ' + stay.name);
    }
    if (meta.sanitation === 'pack-out') {
      add('waste-bags', 'Waste bags (LNT)', 'Gear', 'pack-out sanitation at ' + stay.name);
    }
    if (meta.siteType === 'hammock') {
      add('hammock', 'Hammock + straps', 'Gear', 'hammock site at ' + stay.name);
    }
  });

  return gear;
}
```

**Tests** (`src/utils/__tests__/campingGear.test.js`):
```js
import { deriveCampingGear } from '../campingGear';

describe('deriveCampingGear', () => {
  it('returns empty array for no camp stays', () => {
    expect(deriveCampingGear([{ kind: 'hotel', name: 'Hilton' }])).toHaveLength(0);
  });

  it('returns tent for any camp stay', () => {
    const gear = deriveCampingGear([{ kind: 'camp', name: 'Site A', campMeta: {} }]);
    expect(gear.some(g => g.id === 'tent')).toBe(true);
  });

  it('adds bear canister when bearCountry is true', () => {
    const gear = deriveCampingGear([{ kind: 'wild', name: 'Wild', campMeta: { bearCountry: true } }]);
    expect(gear.some(g => g.id === 'bear-canister')).toBe(true);
  });

  it('adds camp stove when fire is banned', () => {
    const gear = deriveCampingGear([{ kind: 'camp', name: 'Camp', campMeta: { fireRules: { permitted: false } } }]);
    expect(gear.some(g => g.id === 'camp-stove')).toBe(true);
  });

  it('adds water filter when treat required', () => {
    const gear = deriveCampingGear([{ kind: 'camp', name: 'Camp', campMeta: { waterSource: { treatRequired: true } } }]);
    expect(gear.some(g => g.id === 'water-filter')).toBe(true);
  });

  it('deduplicates across multiple stays', () => {
    const stays = [
      { kind: 'camp', name: 'A', campMeta: { bearCountry: true } },
      { kind: 'wild', name: 'B', campMeta: { bearCountry: true } },
    ];
    const gear = deriveCampingGear(stays);
    expect(gear.filter(g => g.id === 'bear-canister')).toHaveLength(1);
  });
});
```

**PackingEngine modification:**
- Import `useTripStore` and `deriveCampingGear`
- Merge `deriveCampingGear(stays)` into the items list (map to same shape as DEFAULT_ITEMS with `packed: false`)
- Deduplicate by id vs existing DEFAULT_ITEMS

```jsx
import { useTripStore } from '../../store/useTripStore';
import { deriveCampingGear } from '../../utils/campingGear';

export default function PackingEngine() {
  const { stays } = useTripStore();
  const campGear = deriveCampingGear(stays).map((g, i) => ({
    id: 1000 + i,
    name: g.name,
    category: g.category,
    packed: false,
    campDriven: true,
    reason: g.reason,
  }));

  const [items, setItems] = useState(() => [...DEFAULT_ITEMS, ...campGear]);
  // ... rest of component unchanged
```

Wait — `useState` with an initializer that depends on campGear won't re-run when stays change. Better: merge them in render.

Actually the cleanest approach: keep `manualItems` in state, compute `allItems = [...manualItems, ...campGear]` in render. But this changes the toggle logic. Simpler: use `useEffect` to extend `items` when campGear changes.

Let the implementer figure the simplest approach that passes tests. Key requirement: when `stays` contains a camp stay with `bearCountry: true`, PackingEngine renders a "Bear canister" item.

No automated test for PackingEngine integration (Leaflet-free but store-dependent, and it will be complex). Test `deriveCampingGear` utility only (above).

- [ ] Write `src/utils/__tests__/campingGear.test.js`
- [ ] Run → confirm FAIL
- [ ] Write `src/utils/campingGear.js`
- [ ] Run → confirm 6 pass
- [ ] Modify `src/components/logistics/PackingEngine.jsx` to import + use deriveCampingGear
- [ ] `git add src/utils/campingGear.js src/utils/__tests__/campingGear.test.js src/components/logistics/PackingEngine.jsx`
- [ ] `git commit -m "feat(packing): camp gear cascade — bear/fire/water/hammock auto-added from campMeta"`
- [ ] Append log entry

---

### Task 4: Spruce token + moodboard

**Files:**
- Modify: `src/pages/moodboard/moodboard.config.js`
- Modify: `docs/moodboard.log.md`
- Read and potentially modify: `src/index.css` (add CSS variable)
- Run: `npm run moodboard:check`

**Changes:**

In `src/pages/moodboard/moodboard.config.js`, add to `colors` array (after the existing entries):
```js
{ name: 'Spruce', hex: '#3A6B5C', usage: 'Camp/wild stays — CampLens header, camp waypoint pins', group: 'functional' },
```

Also add vocabulary entry:
```js
{ use: 'Wild Pitch', avoid: 'wild camping / dispersed camping' },
{ use: 'Basecamp', avoid: 'campsite (generic)' },
```

In `src/index.css`, find the `:root` or `[data-theme="dark"]` block and add:
```css
--spruce: #3A6B5C;
```

In `docs/moodboard.log.md`, prepend a new entry (newest on top):
```markdown
## 2026-05-12 — Phase 2 Camping: Spruce token + CampLens

### Changed
- Added Spruce `#3A6B5C` token for camp/wild stay contexts — CampLens header, camp waypoint pins
- Added `--spruce` CSS variable to `:root` in `index.css`
- Added `Wild Pitch` and `Basecamp` to VP-1 vocabulary contract in `moodboard.config.js`
- `CampLens` component uses Spruce as brand color for all camp intelligence contexts

### Ideas / next steps
- Phase 3: terrain-colored trail icons (Spruce for forest legs, Sandstone for desert legs)
- Consider Spruce as CalendarStrip node color for camp nights
```

Run `npm run moodboard:check` and fix any drift warnings.

- [ ] Edit moodboard.config.js — add Spruce to colors + Wild Pitch to vocabulary
- [ ] Edit index.css — add `--spruce: #3A6B5C`
- [ ] Edit docs/moodboard.log.md — prepend dated entry
- [ ] Run `npm run moodboard:check` in `C:\Users\lasse\Desktop\venturepath`
- [ ] `git add src/pages/moodboard/moodboard.config.js src/index.css docs/moodboard.log.md`
- [ ] `git commit -m "design: add Spruce #3A6B5C token for camp contexts; update moodboard"`
- [ ] Append log entry to `C:\Users\lasse\Desktop\holyflex\logs\2026-05-12.md`

---

### Task 5: CampMeta editor component

**Files:**
- Create: `src/components/logistics/CampMetaEditor.jsx`
- Create: `src/components/logistics/__tests__/CampMetaEditor.test.jsx`
- Modify: `src/components/logistics/AccommodationSearch.jsx` (mount editor for camp stays)

**Spec:** A compact form that lets the Architect configure a stay's campMeta. Shown inline when a stay's `kind` is `'camp'|'wild'|'shelter'`. Calls `updateCampMeta` from the store on each field change.

**Props:** `{ stay }` — reads `stay.campMeta` + `stay.kind`, writes via `updateCampMeta` from store.

**Implementation:**
```jsx
import { useTripStore } from '../../store/useTripStore';

const SPRUCE = '#3A6B5C';
const SITE_TYPES = ['tent', 'rv', 'campervan', 'hammock', 'bivy', 'cabin'];
const SANITATION_OPTS = ['flush', 'pit', 'composting', 'pack-out', 'none'];

export function CampMetaEditor({ stay }) {
  const { updateCampMeta } = useTripStore();
  const meta = stay.campMeta ?? {};

  function update(patch) { updateCampMeta(stay.id, patch); }

  return (
    <div style={{ fontFamily: 'JetBrains Mono, monospace', background: 'rgba(58,107,92,0.08)', border: `1px solid ${SPRUCE}`, borderRadius: 4, padding: 12, fontSize: '0.78rem', color: '#D9C5B2' }}>
      <div style={{ color: SPRUCE, fontWeight: 600, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.7rem' }}>
        Camp Configuration
      </div>

      <Field label="Site type">
        <select value={meta.siteType ?? 'tent'} onChange={e => update({ siteType: e.target.value })}
          style={selectStyle}>
          {SITE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </Field>

      <Field label="Bear country">
        <Toggle checked={!!meta.bearCountry} onChange={v => update({ bearCountry: v })} />
      </Field>

      <Field label="Fire permitted">
        <Toggle checked={meta.fireRules?.permitted !== false} onChange={v => update({ fireRules: { ...meta.fireRules, permitted: v } })} />
      </Field>

      <Field label="Water treat">
        <Toggle checked={!!meta.waterSource?.treatRequired} onChange={v => update({ waterSource: { ...meta.waterSource, treatRequired: v } })} />
      </Field>

      <Field label="Sanitation">
        <select value={meta.sanitation ?? 'none'} onChange={e => update({ sanitation: e.target.value })}
          style={selectStyle}>
          {SANITATION_OPTS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </Field>
    </div>
  );
}

const selectStyle = { background: '#0E1012', color: '#D9C5B2', border: '1px solid #333', fontFamily: 'inherit', padding: '2px 6px', borderRadius: 2 };

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <span style={{ minWidth: 90, color: '#666' }}>{label}</span>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      style={{ background: checked ? SPRUCE : '#1a1a1a', border: `1px solid ${checked ? SPRUCE : '#333'}`, borderRadius: 12, width: 36, height: 20, cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}
    >
      <span style={{ position: 'absolute', top: 2, left: checked ? 18 : 2, width: 14, height: 14, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
    </button>
  );
}
```

**Tests:**
```jsx
import { render, screen, fireEvent } from '@testing-library/react';
import { CampMetaEditor } from '../CampMetaEditor';

// Mock useTripStore — we test that it calls updateCampMeta correctly
vi.mock('../../../store/useTripStore', () => ({
  useTripStore: () => ({ updateCampMeta: vi.fn() }),
}));

// Re-import with mock in place
import { useTripStore } from '../../../store/useTripStore';

const stay = { id: 'stay-1', name: 'Wild Camp', kind: 'wild', campMeta: { siteType: 'tent', bearCountry: false } };

describe('CampMetaEditor', () => {
  it('renders Camp Configuration header', () => {
    render(<CampMetaEditor stay={stay} />);
    expect(screen.getByText(/Camp Configuration/)).toBeInTheDocument();
  });

  it('renders site type selector', () => {
    render(<CampMetaEditor stay={stay} />);
    expect(screen.getByDisplayValue('tent')).toBeInTheDocument();
  });

  it('calls updateCampMeta when site type changes', () => {
    const updateCampMeta = vi.fn();
    vi.mocked(useTripStore).mockReturnValue({ updateCampMeta });
    render(<CampMetaEditor stay={stay} />);
    fireEvent.change(screen.getByDisplayValue('tent'), { target: { value: 'hammock' } });
    expect(updateCampMeta).toHaveBeenCalledWith('stay-1', { siteType: 'hammock' });
  });

  it('Bear country toggle calls updateCampMeta with bearCountry:true', () => {
    const updateCampMeta = vi.fn();
    vi.mocked(useTripStore).mockReturnValue({ updateCampMeta });
    render(<CampMetaEditor stay={stay} />);
    // Bear country toggle is aria-pressed=false (bearCountry is false)
    const toggle = screen.getAllByRole('button').find(b => b.getAttribute('aria-pressed') === 'false');
    fireEvent.click(toggle);
    expect(updateCampMeta).toHaveBeenCalledWith('stay-1', expect.objectContaining({ bearCountry: true }));
  });
});
```

**AccommodationSearch modification:** Read current AccommodationSearch.jsx first. Find where individual stays are listed/shown. After each stay card where `stay.kind` is in `['camp','wild','shelter']`, render `<CampMetaEditor stay={stay} />`.

- [ ] Write test file
- [ ] Run → confirm FAIL
- [ ] Write CampMetaEditor.jsx
- [ ] Run → confirm 4 pass
- [ ] Read AccommodationSearch.jsx — find stay card render location
- [ ] Add CampMetaEditor inline for camp stays
- [ ] `git add src/components/logistics/CampMetaEditor.jsx src/components/logistics/__tests__/CampMetaEditor.test.jsx src/components/logistics/AccommodationSearch.jsx`
- [ ] `git commit -m "feat(logistics): add CampMetaEditor for configuring campMeta on camp/wild/shelter stays"`
- [ ] Append log entry

---

### Task 6: Phase 2 end-to-end verification

- [ ] Run `npx vitest run src/store/__tests__/useTripStore.camping.test.jsx src/components/legLens src/utils/__tests__/campingGear.test.js src/components/logistics/__tests__/CampMetaEditor.test.jsx`
- [ ] Confirm all Phase 2 tests pass (≥ 22 new tests across 5 test files)
- [ ] Run `git log --oneline -10` — confirm 6 Phase 2 commits are clean
- [ ] Append final verification log entry to `C:\Users\lasse\Desktop\holyflex\logs\2026-05-12.md`

---

## Phase summary

| Task | Files | Tests |
|---|---|---|
| 0 | useTripStore.jsx | 5 |
| 1 | CampLens.jsx | 7 |
| 2 | LegLensCar.jsx, LegLens.jsx, TripPlanner.jsx | 2 |
| 3 | campingGear.js, PackingEngine.jsx | 6 |
| 4 | moodboard.config.js, index.css, moodboard.log.md | — |
| 5 | CampMetaEditor.jsx, AccommodationSearch.jsx | 4 |
| 6 | Verification | — |

**Phases 3-5 (follow-on):**
- Phase 3 — Foot legs: legMeta.foot, footEngine, GPX→Vault, Open Elevation
- Phase 4 — Transit + Flight: legMeta.{flight,train,bus,ferry,boat} engines, layover waypoints
- Phase 5 — Cross-app: streak events to HolyFlex, camping/fuel context to What's Cooking
