# VenturePath OVERVIEW UX Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign VenturePath's OVERVIEW tab layout, elevation profile, safety pulse, tactical mode, and transport planner — all wired to a shared Zustand store so every tool's output feeds the map, elevation, timeline, and budget automatically.

**Architecture:** The store (`src/store/useTripStore.jsx`) is a React Context + useReducer store (not Zustand — despite naming). All tools call store actions (`addLeg`, `addStay`, etc.) and all OVERVIEW consumers re-render from those actions. A new lightweight toast system surfaces "added to plan" confirmations. The transport planner is rebuilt as a self-contained component; SafetyPulse is split into a compact ticker + slide-over drawer.

**Tech Stack:** React, Framer Motion, Leaflet (react-leaflet), JetBrains Mono font, CSS custom properties via `var(--*)`, SVG for elevation chart. No new dependencies needed.

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/store/useTripStore.jsx` | Modify | Add `stays`, `pois`, `alerts`, `budget` state + mutations; fix `addLeg` shape |
| `src/components/ui/Toast.jsx` | **Create** | Toast component + `useToastStore` hook (tiny module-level store) |
| `src/pages/TripPlanner.jsx` | Modify | OVERVIEW tab: flex-row map+path, elevation below, safety ticker below that |
| `src/components/itinerary/RouteMap.jsx` | Modify | Accept `className`/`style` prop instead of forcing full-width |
| `src/components/itinerary/ElevationStrip.jsx` | Modify | Add silhouette + mode-band layers to SVG |
| `src/components/logistics/SafetyTicker.jsx` | **Create** | Single-row compact ticker (split from SafetyPulse) |
| `src/components/logistics/SafetyPulse.jsx` | Modify | Remove outer layout; now just the panel content (used inside drawer) |
| `src/components/ui/TacticalMode.jsx` | Modify | Signal bars + amber coordinate strip redesign |
| `src/components/logistics/TransportPlanner.jsx` | **Create** | Full new transport planner (replaces PublicTransport in that tab) |

---

## Task 1: Extend useTripStore with stays, pois, alerts, budget

**Files:**
- Modify: `src/store/useTripStore.jsx`

The store currently has `legs`, `trip`, `objectives`, `manifestSettings`. We need `stays[]`, `pois[]`, `alerts[]`, `budget{}`. We also need to ensure `addLeg` accepts the canonical shape from the spec (with `from`/`to` as objects with `label`+`coords`, plus `departs`, `arrives`, `price`, `currency`, `co2kg`, `carrier`).

- [ ] **Step 1: Add initial state fields**

In `src/store/useTripStore.jsx`, find the `initialState` object (line ~35) and add:

```js
const initialState = {
  trip: DEFAULT_TRIP,
  legs: DEFAULT_LEGS,
  objectives: DEFAULT_OBJECTIVES,
  manifestSettings: DEFAULT_MANIFEST_SETTINGS,
  userRole: 'LEADER',
  cloning: false,
  stays: [],   // { id, name, coords, checkin, checkout, price, currency }
  pois: [],    // { id, name, coords, category, priority }
  alerts: [],  // { id, type, severity, coords, message }
  budget: { total: 0, items: [] }, // items: { id, label, amount, currency, legId? }
};
```

- [ ] **Step 2: Add reducer cases**

Inside the `reducer` function, before `default:`, add:

```js
case 'ADD_STAY': {
  const stay = { ...action.payload, id: action.payload.id ?? crypto.randomUUID() };
  return { ...state, stays: [...state.stays, stay] };
}
case 'REMOVE_STAY':
  return { ...state, stays: state.stays.filter(s => s.id !== action.payload) };
case 'ADD_POI': {
  const poi = { ...action.payload, id: action.payload.id ?? crypto.randomUUID() };
  return { ...state, pois: [...state.pois, poi] };
}
case 'REMOVE_POI':
  return { ...state, pois: state.pois.filter(p => p.id !== action.payload) };
case 'ADD_ALERT': {
  const alert = { ...action.payload, id: action.payload.id ?? crypto.randomUUID() };
  return { ...state, alerts: [...state.alerts, alert] };
}
case 'CLEAR_ALERTS':
  return { ...state, alerts: [] };
case 'ADD_BUDGET_ITEM': {
  const item = { ...action.payload, id: action.payload.id ?? crypto.randomUUID() };
  const newTotal = state.budget.total + (item.amount ?? 0);
  return { ...state, budget: { total: newTotal, items: [...state.budget.items, item] } };
}
```

- [ ] **Step 3: Add action creators to the provider**

Inside `TripStoreProvider`, after the existing action creators, add:

```js
const addStay = (data) => dispatch({ type: 'ADD_STAY', payload: data });
const removeStay = (id) => dispatch({ type: 'REMOVE_STAY', payload: id });
const addPoi = (data) => dispatch({ type: 'ADD_POI', payload: data });
const removePoi = (id) => dispatch({ type: 'REMOVE_POI', payload: id });
const addAlert = (data) => dispatch({ type: 'ADD_ALERT', payload: data });
const clearAlerts = () => dispatch({ type: 'CLEAR_ALERTS' });
const addBudgetItem = (data) => dispatch({ type: 'ADD_BUDGET_ITEM', payload: data });
```

Then add them all to the Provider value object alongside the existing ones.

- [ ] **Step 4: Persist new fields to localStorage**

Find the `localStorage.setItem` call inside the `useEffect` (around line 140) and add the new fields:

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
}));
```

- [ ] **Step 5: Commit**

```bash
git add src/store/useTripStore.jsx
git commit -m "feat(store): add stays, pois, alerts, budget state + mutations"
```

---

## Task 2: Toast system

**Files:**
- Create: `src/components/ui/Toast.jsx`

A module-level store (no React context needed — just a JS Set of listeners) keeps this tiny and import-anywhere.

- [ ] **Step 1: Create the file**

```jsx
// src/components/ui/Toast.jsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Module-level toast store — no context needed
let _listeners = new Set();
let _toasts = [];
let _nextId = 0;

export function showToast({ message, action, onAction, duration = 3000 }) {
  const id = ++_nextId;
  const toast = { id, message, action, onAction };
  _toasts = [..._toasts, toast];
  _listeners.forEach(fn => fn([..._toasts]));
  setTimeout(() => {
    _toasts = _toasts.filter(t => t.id !== id);
    _listeners.forEach(fn => fn([..._toasts]));
  }, duration);
}

function useToasts() {
  const [toasts, setToasts] = useState([..._toasts]);
  useEffect(() => {
    _listeners.add(setToasts);
    return () => _listeners.delete(setToasts);
  }, []);
  return toasts;
}

export default function ToastContainer() {
  const toasts = useToasts();

  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center',
      pointerEvents: 'none',
    }}>
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            style={{
              background: '#1a1f26',
              border: '1px solid #2a2f36',
              borderRadius: 4,
              padding: '8px 14px',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              pointerEvents: 'auto',
              minWidth: 260,
            }}
          >
            <span style={{ color: '#E67E22' }}>✓</span>
            <span style={{ flex: 1 }}>{t.message}</span>
            {t.action && (
              <button
                onClick={t.onAction}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#E67E22', fontFamily: 'inherit', fontSize: 11,
                  padding: 0, textDecoration: 'underline',
                }}
              >
                {t.action}
              </button>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
```

- [ ] **Step 2: Mount ToastContainer in TripPlanner**

Open `src/pages/TripPlanner.jsx`. At the top, add:

```js
import ToastContainer from '../components/ui/Toast';
```

Inside the returned JSX, add `<ToastContainer />` as the last child before the closing `</>`:

```jsx
      {/* ... existing content ... */}
      <ToastContainer />
    </>
  );
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/Toast.jsx src/pages/TripPlanner.jsx
git commit -m "feat(ui): add lightweight toast notification system"
```

---

## Task 3: OVERVIEW tab layout — map + path side-by-side

**Files:**
- Modify: `src/pages/TripPlanner.jsx`
- Modify: `src/components/itinerary/RouteMap.jsx`

- [ ] **Step 1: Make RouteMap accept a style prop**

Open `src/components/itinerary/RouteMap.jsx`. Find the outermost wrapper div. Change it to accept a `style` prop passed from the parent. If the component signature is `export default function RouteMap()`, change it to:

```jsx
export default function RouteMap({ style }) {
```

Then find the outermost wrapper div (the one that wraps the `<MapContainer>`) and spread the style:

```jsx
<div style={{ position: 'relative', ...style }}>
```

- [ ] **Step 2: Rebuild OVERVIEW tab layout in TripPlanner**

Open `src/pages/TripPlanner.jsx`. Find the `{tab === 'OVERVIEW' && (` block (around line 127). Replace the entire contents of that block with:

```jsx
{tab === 'OVERVIEW' && (
  <div className="space-y-3">
    {/* Row 1: Map (70%) + Path timeline (30%) */}
    <div style={{ display: 'flex', gap: 12, alignItems: 'stretch' }}>
      <div style={{ flex: '0 0 70%', position: 'relative', minHeight: 320 }}>
        <RouteMap style={{ height: 320 }} />
        <AnimatePresence>
          {activeLegId && (
            <LegHud
              leg={legs.find(l => l.id === activeLegId)}
              onClose={() => setActiveLegId(null)}
            />
          )}
        </AnimatePresence>
        {/* Leg quick-launch strip */}
        {legs.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
            {legs.filter(l => l.status === 'confirmed').map(l => (
              <button
                key={l.id}
                onClick={() => setActiveLegId(activeLegId === l.id ? null : l.id)}
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 9, letterSpacing: '0.08em',
                  padding: '3px 10px', borderRadius: 2,
                  border: `1px solid ${activeLegId === l.id ? '#E67E22' : '#2a2f36'}`,
                  background: activeLegId === l.id ? 'rgba(230,126,34,0.12)' : 'transparent',
                  color: activeLegId === l.id ? '#E67E22' : '#8A8680',
                  cursor: 'pointer',
                }}
              >
                {activeLegId === l.id ? '■ STOP' : `▶ LEG ${l.id}`} {l.to}
              </button>
            ))}
          </div>
        )}
      </div>
      {/* Path timeline — right column */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <TimelinePath />
      </div>
    </div>

    {/* Row 2: GPX + Elevation full width */}
    <GpxPanel />
    <ElevationStrip />

    {/* Row 3: Safety ticker */}
    <SafetyTicker destinationId={destinationId} center={mapCenter} zoom={8} />
  </div>
)}
```

- [ ] **Step 3: Add SafetyTicker import**

At the top of `TripPlanner.jsx`, replace:

```js
import SafetyPulse from '../components/logistics/SafetyPulse';
```

with:

```js
import SafetyTicker from '../components/logistics/SafetyTicker';
```

(SafetyPulse is now used only inside SafetyTicker's drawer.)

- [ ] **Step 4: Commit**

```bash
git add src/pages/TripPlanner.jsx src/components/itinerary/RouteMap.jsx
git commit -m "feat(overview): map+path side-by-side layout, elevation+safety below"
```

---

## Task 4: SafetyTicker — compact single-row + slide-over drawer

**Files:**
- Create: `src/components/logistics/SafetyTicker.jsx`
- Modify: `src/components/logistics/SafetyPulse.jsx`

- [ ] **Step 1: Strip SafetyPulse outer wrapper**

Open `src/components/logistics/SafetyPulse.jsx`. The component currently returns a `<div className="tactical-panel p-5 space-y-4">` wrapping everything. Change the signature to accept an `onClose` prop and remove the outer `tactical-panel` wrapper so it renders bare panel content. Change:

```jsx
export default function SafetyPulse({ destinationId = 'default', center = [20.0, 0.0], zoom = 9 }) {
```

to:

```jsx
export default function SafetyPulse({ destinationId = 'default', center = [20.0, 0.0], zoom = 9, onClose }) {
```

And change the outer `<div className="tactical-panel p-5 space-y-4">` to `<div className="p-5 space-y-4">` — just remove `tactical-panel` from the className.

- [ ] **Step 2: Create SafetyTicker.jsx**

```jsx
// src/components/logistics/SafetyTicker.jsx
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchSafetyIncidents, SEVERITY_COLORS } from '../../utils/safetyEngine';
import SafetyPulse from './SafetyPulse';

const REFRESH_MS = 30_000;
const SEV_DOT = { red: '#ef4444', amber: '#F59E0B', green: '#22c55e' };

export default function SafetyTicker({ destinationId = 'default', center = [20.0, 0.0], zoom = 9 }) {
  const [incidents, setIncidents] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const intervalRef = useRef(null);

  async function load() {
    const data = await fetchSafetyIncidents(destinationId);
    setIncidents(data);
  }

  useEffect(() => {
    load();
    intervalRef.current = setInterval(load, REFRESH_MS);
    return () => clearInterval(intervalRef.current);
  }, [destinationId]);

  const hasRed   = incidents.some(i => i.severity === 'red');
  const hasAmber = incidents.some(i => i.severity === 'amber');
  const level    = hasRed ? 'red' : hasAmber ? 'amber' : 'green';
  const topAlert = incidents.find(i => i.severity === level);

  // Clear categories (non-red/amber types that have green status)
  const clearCategories = incidents
    .filter(i => i.severity === 'green')
    .map(i => i.type)
    .slice(0, 3);

  return (
    <>
      {/* Single-row ticker */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '6px 12px',
          background: 'var(--surface-raised)',
          borderBottom: '1px solid var(--border)',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10,
          minHeight: 32,
        }}
      >
        {/* Severity dot */}
        <span
          style={{
            width: 7, height: 7, borderRadius: '50%',
            background: SEV_DOT[level], flexShrink: 0,
          }}
        />
        {/* Top alert summary */}
        <span style={{ color: 'var(--text-primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {topAlert
            ? `${topAlert.type} ${topAlert.time} — ${topAlert.description}`
            : 'No active alerts'}
        </span>
        {/* Clear category pills */}
        {clearCategories.map(cat => (
          <span
            key={cat}
            style={{
              background: 'rgba(34,197,94,0.1)',
              border: '1px solid rgba(34,197,94,0.25)',
              borderRadius: 10, padding: '1px 7px',
              fontSize: 8, color: '#22c55e', flexShrink: 0,
            }}
          >
            {cat} ✓
          </span>
        ))}
        {/* Expand link */}
        <button
          onClick={() => setDrawerOpen(true)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#E67E22', fontFamily: 'inherit', fontSize: 10,
            padding: 0, flexShrink: 0, whiteSpace: 'nowrap',
          }}
        >
          Safety Pulse →
        </button>
      </div>

      {/* Slide-over drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
              style={{
                position: 'fixed', inset: 0,
                background: 'rgba(0,0,0,0.5)', zIndex: 400,
              }}
            />
            {/* Drawer panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.25 }}
              style={{
                position: 'fixed', top: 0, right: 0, bottom: 0,
                width: 420, background: 'var(--surface)',
                borderLeft: '1px solid var(--border)',
                zIndex: 401, overflowY: 'auto',
              }}
            >
              {/* Drawer header */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 16px', borderBottom: '1px solid var(--border)',
              }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: '0.1em', color: 'var(--text-secondary)' }}>
                  SAFETY PULSE
                </span>
                <button
                  onClick={() => setDrawerOpen(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 16 }}
                >
                  ×
                </button>
              </div>
              <SafetyPulse
                destinationId={destinationId}
                center={center}
                zoom={zoom}
                onClose={() => setDrawerOpen(false)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
```

- [ ] **Step 3: Add ESC key to close drawer**

Inside SafetyTicker, add a `useEffect` for keyboard handling after the existing useEffect:

```js
useEffect(() => {
  function onKey(e) { if (e.key === 'Escape') setDrawerOpen(false); }
  window.addEventListener('keydown', onKey);
  return () => window.removeEventListener('keydown', onKey);
}, []);
```

- [ ] **Step 4: Commit**

```bash
git add src/components/logistics/SafetyTicker.jsx src/components/logistics/SafetyPulse.jsx
git commit -m "feat(safety): collapse SafetyPulse to compact ticker + slide-over drawer"
```

---

## Task 5: ElevationStrip — silhouette + mode-band layers

**Files:**
- Modify: `src/components/itinerary/ElevationStrip.jsx`

- [ ] **Step 1: Add the silhouette generator function**

At the top of `ElevationStrip.jsx`, after the existing constants, add:

```js
// Deterministic RNG seeded by destination string
function seededRng(seed) {
  let s = typeof seed === 'string'
    ? seed.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
    : seed;
  return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
}

// Build SVG mountain silhouette path for given viewbox width/height
function buildSilhouette(w, h, seed, peakHeightRatio = 0.65) {
  const rng = seededRng(seed);
  const peakCount = 7;
  // Generate sorted peak X positions and random heights
  const peaks = Array.from({ length: peakCount }, (_, i) => ({
    x: (i / (peakCount - 1)) * w,
    y: h - rng() * h * peakHeightRatio - h * 0.1,
  }));
  // Add edge anchors at ground level
  const pts = [{ x: 0, y: h }, ...peaks, { x: w, y: h }];
  // Build smooth path with cubic bezier
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const next = pts[i + 1];
    const cpx1 = prev.x + (curr.x - prev.x) * 0.5;
    const cpy1 = prev.y;
    const cpx2 = curr.x - (next.x - curr.x) * 0.2;
    const cpy2 = curr.y;
    d += ` C${cpx1},${cpy1} ${cpx2},${cpy2} ${curr.x},${curr.y}`;
  }
  d += ` L${pts[pts.length - 1].x},${pts[pts.length - 1].y} Z`;
  return d;
}
```

- [ ] **Step 2: Add mode-band tint colours**

After the existing `SURFACE` constant, add:

```js
const MODE_BAND = {
  flight: { color: '#E67E22', opacity: 0.06 },
  foot:   { color: '#64dc82', opacity: 0.04 },
  bus:    { color: '#64a0ff', opacity: 0.05 },
  train:  { color: '#64a0ff', opacity: 0.05 },
  boat:   { color: '#64a0ff', opacity: 0.05 },
  drive:  { color: '#D9C5B2', opacity: 0.04 },
};
```

- [ ] **Step 3: Replace the SVG defs and add background layers**

Inside the `<svg>` element (around line 129), replace the existing `<defs>` block with:

```jsx
<defs>
  <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stopColor="#0d1b2a" />
    <stop offset="100%" stopColor="#0E1012" />
  </linearGradient>
  <linearGradient id="mtnDistGrad" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stopColor="#1a2535" />
    <stop offset="100%" stopColor="#0E1012" />
  </linearGradient>
  <linearGradient id="elevGrad" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stopColor="#E67E22" stopOpacity="0.28" />
    <stop offset="100%" stopColor="#E67E22" stopOpacity="0.03" />
  </linearGradient>
</defs>
```

Then, directly after the `<defs>` block and before the `{profile ? (` block, add the background layers. You'll need access to the destination ID — get it from `useTripStore`:

At the top of the `ElevationStrip` function body (line ~37), destructure trip:

```js
const { legs, trip } = useTripStore();
const destinationSeed = trip?.destination ?? 'default';
```

Then add these background layers in the SVG, after `<defs>` and before `{profile ? (`:

```jsx
{/* Layer 1: sky */}
<rect x={0} y={0} width={SVG_W} height={SVG_H} fill="url(#skyGrad)" />

{/* Layer 2a: distant mountain silhouette */}
<path
  d={buildSilhouette(SVG_W, SVG_H, destinationSeed + '_far', 0.7)}
  fill="url(#mtnDistGrad)"
  opacity={0.6}
/>

{/* Layer 2b: near mountain silhouette */}
<path
  d={buildSilhouette(SVG_W, SVG_H, destinationSeed + '_near', 0.45)}
  fill="#1a1f26"
  opacity={0.8}
/>

{/* Layer 3: transport-mode tint bands — only when profile available */}
{profile && profile.segmentMeta.map((seg, i) => {
  const band = MODE_BAND[seg.mode];
  if (!band) return null;
  const x1 = profile.pts[seg.startIdx]?.x ?? 0;
  const x2 = profile.pts[seg.endIdx]?.x ?? SVG_W;
  return (
    <rect
      key={`band-${i}`}
      x={x1} y={0}
      width={x2 - x1} height={SVG_H}
      fill={band.color}
      opacity={band.opacity}
    />
  );
})}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/itinerary/ElevationStrip.jsx
git commit -m "feat(elevation): add mountain silhouette + transport-mode band layers"
```

---

## Task 6: TacticalMode visual redesign

**Files:**
- Modify: `src/components/ui/TacticalMode.jsx`

- [ ] **Step 1: Replace the JSX return**

Open `src/components/ui/TacticalMode.jsx`. Keep all existing state (`time`, `coords`, `freshness`, `sosReady`, `sosCopied`) and logic (`handleSOS`, `sosText`, `activeLeg`) unchanged. Replace only the `return (...)` block:

```jsx
return (
  <div
    data-tour="tactical"
    data-beacon="tactical-mode"
    className="min-h-screen font-mono flex flex-col"
    style={{ background: '#0A0A0A', color: '#F2A900', padding: 16 }}
  >
    {/* Header: signal bars + clock + freshness */}
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
      <div>
        {/* GPS signal bars */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
            {[4, 6, 9, 12].map((h, i) => (
              <div
                key={i}
                style={{
                  width: 3, height: h,
                  background: '#F2A900',
                  borderRadius: 1,
                }}
              />
            ))}
          </div>
          <span style={{ fontSize: 8, letterSpacing: '0.12em', color: '#F2A900' }}>GPS LOCKED</span>
        </div>
        <div style={{ fontSize: 22, fontWeight: 'bold', letterSpacing: '0.04em' }}>
          {time.toLocaleTimeString()}
        </div>
      </div>
      <div style={{ background: '#1a1a1a', borderRadius: 3, padding: '4px 8px', textAlign: 'center' }}>
        <div style={{ fontSize: 7, color: '#555', letterSpacing: '0.1em' }}>FRESHNESS</div>
        <div style={{ fontSize: 11, color: '#F2A900' }}>{freshness}</div>
      </div>
    </div>

    {/* Coordinate strip — amber bar */}
    <div
      style={{
        background: '#F2A900',
        color: '#0A0A0A',
        fontWeight: 'bold',
        borderRadius: 3,
        padding: '6px 10px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
      }}
    >
      <span style={{ fontSize: 12 }}>
        {coords.lat}° {coords.lat < 0 ? 'S' : 'N'}, {Math.abs(coords.lng)}° {coords.lng < 0 ? 'W' : 'E'}
      </span>
      <span style={{ fontSize: 9, opacity: 0.7 }}>↗ 042°  ▲ 1,240m</span>
    </div>

    {/* Current objective */}
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 7, color: '#555', letterSpacing: '0.1em', marginBottom: 4 }}>CURRENT OBJECTIVE</div>
      <div style={{
        borderLeft: '2px solid #2a2a2a',
        paddingLeft: 8,
        fontSize: 11,
        color: activeLeg ? '#F2A900' : '#888',
      }}>
        {activeLeg ? `${activeLeg.from} → ${activeLeg.to}` : 'No active leg'}
      </div>
    </div>

    {/* Squad comms */}
    <div style={{ flex: 1, marginBottom: 12 }}>
      <div style={{ fontSize: 7, color: '#555', letterSpacing: '0.1em', marginBottom: 6 }}>SQUAD COMMS — CACHED</div>
      {CACHED_MESSAGES.map((msg, i) => (
        <div key={i} style={{ fontSize: 10, color: i === 0 ? '#F2A900' : '#888', padding: '3px 0', borderBottom: '1px solid #1a1a1a' }}>
          │ {msg}
        </div>
      ))}
    </div>

    {/* SOS beacon */}
    <button
      onClick={handleSOS}
      style={{
        width: '100%',
        background: sosCopied ? '#1a1a1a' : '#7B1A1A',
        border: `1px solid ${sosCopied ? '#2a2a2a' : '#C0392B'}`,
        borderRadius: 4,
        padding: '10px 0',
        color: sosCopied ? '#4CAF50' : '#fff',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11,
        letterSpacing: '0.1em',
        cursor: 'pointer',
      }}
    >
      {sosCopied ? '✓ SOS TEXT COPIED TO CLIPBOARD' : '⚠ SOS EMERGENCY BEACON'}
    </button>

    {/* Exit */}
    <button
      onClick={onExit}
      style={{
        marginTop: 8, background: 'none', border: '1px solid #2a2a2a',
        borderRadius: 3, padding: '6px 0', width: '100%',
        color: '#555', fontFamily: 'inherit', fontSize: 9,
        letterSpacing: '0.1em', cursor: 'pointer',
      }}
    >
      EXIT TACTICAL MODE
    </button>
  </div>
);
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/TacticalMode.jsx
git commit -m "feat(tactical): signal bars + amber coordinate strip redesign"
```

---

## Task 7: TransportPlanner — new component

**Files:**
- Create: `src/components/logistics/TransportPlanner.jsx`

This replaces `PublicTransport` in the PUBLIC TRANSPORT tab. It keeps the disruption-check logic but adds: destination-first inputs, GPS-aware origin, single-row filters, radio-select + expand rows, and `addLeg` + `showToast` on "ADD TO PLAN".

- [ ] **Step 1: Create the file**

```jsx
// src/components/logistics/TransportPlanner.jsx
import { useState, useRef, useEffect, useCallback } from 'react';
import { useTripStore } from '../../store/useTripStore';
import { showToast } from '../ui/Toast';
import { searchLocations } from '../../utils/geocodeEngine';
import { filterExpeditionFlights } from '../../utils/flightEngine';
import { fetchAlerts, checkCascade } from '../../utils/disruptionEngine';

// Mode-specific filter pill sets
const MODE_PILLS = {
  flight: ['Direct', 'Eco', 'Flexible', 'Cabin bag'],
  train:  ['Rail pass', '1st class', 'Bike space'],
  bus:    ['Express only', 'Eco coach'],
  ferry:  ['Cabin class', 'Vehicle', 'Pet friendly'],
  drive:  ['Toll-free', 'EV only', 'Scenic route'],
};

const MODES = ['flight', 'train', 'bus', 'ferry', 'drive'];
const MODE_ICONS = { flight: '✈', train: '🚆', bus: '🚌', ferry: '🚢', drive: '🚗' };

function useLocationAutocomplete(onSelect) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const timerRef = useRef(null);
  const blurTimer = useRef(null);

  function onChange(val) {
    setQuery(val);
    clearTimeout(timerRef.current);
    if (val.length < 2) { setSuggestions([]); setOpen(false); return; }
    timerRef.current = setTimeout(async () => {
      const results = await searchLocations(val);
      setSuggestions(results ?? []);
      setOpen(true);
    }, 250);
  }

  function onBlur() {
    // 150ms delay so clicks on suggestions register first
    blurTimer.current = setTimeout(() => setOpen(false), 150);
  }

  function onFocus() {
    clearTimeout(blurTimer.current);
    if (query.length >= 2 && suggestions.length) setOpen(true);
  }

  function pick(suggestion) {
    setQuery(suggestion.label ?? suggestion.name ?? suggestion);
    setOpen(false);
    setSuggestions([]);
    onSelect(suggestion);
  }

  return { query, setQuery, suggestions, open, onChange, onBlur, onFocus, pick };
}

export default function TransportPlanner({ destination = '' }) {
  const { addLeg } = useTripStore();
  const [mode, setMode] = useState('flight');
  const [activePills, setActivePills] = useState([]);
  const [leaveBy, setLeaveBy] = useState('');
  const [arriveBy, setArriveBy] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState('Cheapest');
  const [toLocation, setToLocation] = useState(destination ? { label: destination } : null);
  const [fromLocation, setFromLocation] = useState(null);
  const [results, setResults] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [searching, setSearching] = useState(false);

  const toAC = useLocationAutocomplete(loc => setToLocation(loc));
  const fromAC = useLocationAutocomplete(loc => setFromLocation(loc));

  // Initialise TO field with trip destination prop
  useEffect(() => {
    if (destination && !toAC.query) toAC.setQuery(destination);
  }, [destination]);

  // Auto-detect nearest origin from GPS when mode changes
  useEffect(() => {
    if (fromLocation) return; // user already set it
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(pos => {
      const label = mode === 'flight' ? 'Nearest Airport' : mode === 'train' ? 'Nearest Station' : 'Current Location';
      setFromLocation({ label, coords: [pos.coords.latitude, pos.coords.longitude], autoDetected: true });
      fromAC.setQuery(label);
    });
  }, [mode]);

  async function search() {
    if (!toLocation || !fromLocation) return;
    setSearching(true);
    setSelectedId(null);
    const raw = await filterExpeditionFlights({
      from: fromLocation, to: toLocation, mode,
      leaveBy, arriveBy, maxPrice: maxPrice ? Number(maxPrice) : undefined,
      sortBy, pills: activePills,
    });
    setResults(raw ?? []);
    setSearching(false);
  }

  function togglePill(pill) {
    setActivePills(prev => prev.includes(pill) ? prev.filter(p => p !== pill) : [...prev, pill]);
  }

  function handleAddToPlan(result) {
    const leg = {
      id: crypto.randomUUID(),
      from: fromLocation,
      to: toLocation,
      mode,
      departs: result.departs ?? null,
      arrives: result.arrives ?? null,
      price: result.price,
      currency: result.currency ?? 'USD',
      co2kg: result.co2kg ?? null,
      carrier: result.carrier ?? result.airline ?? '',
      status: 'confirmed',
      // Legacy fields for existing consumers
      from: result.from ?? fromLocation?.label ?? '',
      to: result.to ?? toLocation?.label ?? '',
      durationH: result.durationH ?? null,
      distanceKm: result.distanceKm ?? null,
    };
    addLeg(leg);
    showToast({
      message: `${leg.carrier} ${fromLocation?.label} → ${toLocation?.label} added to plan`,
      action: 'View on map →',
      onAction: () => document.dispatchEvent(new CustomEvent('vp:navigate', { detail: { tab: 'OVERVIEW' } })),
    });
    setSelectedId(null);
  }

  const pills = MODE_PILLS[mode] ?? [];

  return (
    <div style={{ maxWidth: 640, fontFamily: "'JetBrains Mono', monospace" }}>
      {/* Mode tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
        {MODES.map(m => (
          <button
            key={m}
            onClick={() => { setMode(m); setResults([]); setSelectedId(null); setActivePills([]); }}
            style={{
              padding: '4px 10px', borderRadius: 2, border: 'none', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 8, letterSpacing: '0.06em',
              background: mode === m ? '#E67E22' : '#1a1f26',
              color: mode === m ? '#fff' : '#8A8680',
            }}
          >
            {MODE_ICONS[m]} {m.toUpperCase()}
          </button>
        ))}
      </div>

      {/* TO field */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 7, color: '#555', letterSpacing: '0.1em', marginBottom: 3 }}>TO — DESTINATION</div>
        <div style={{ position: 'relative' }}>
          <input
            value={toAC.query}
            onChange={e => toAC.onChange(e.target.value)}
            onBlur={toAC.onBlur}
            onFocus={toAC.onFocus}
            placeholder="Where are you going?"
            style={{
              width: '100%', boxSizing: 'border-box',
              background: '#1a1f26', border: `1px solid ${toLocation ? '#E67E22' : '#2a2f36'}`,
              borderRadius: 3, padding: '7px 10px', color: '#fff',
              fontFamily: 'inherit', fontSize: 11, outline: 'none',
            }}
          />
          {toAC.open && toAC.suggestions.length > 0 && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
              background: '#1a1f26', border: '1px solid #2a2f36',
              borderTop: 'none', borderRadius: '0 0 3px 3px', maxHeight: 160, overflowY: 'auto',
            }}>
              {toAC.suggestions.map((s, i) => (
                <div
                  key={i}
                  onMouseDown={() => toAC.pick(s)}
                  style={{ padding: '6px 10px', fontSize: 10, color: '#fff', cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#252b35'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  📍 {s.label ?? s.name ?? s}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* FROM field */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <span style={{ fontSize: 7, color: '#555', letterSpacing: '0.1em' }}>FROM — ORIGIN</span>
          {fromLocation?.autoDetected && (
            <span style={{ fontSize: 7, color: '#E67E22' }}>● USING YOUR LOCATION</span>
          )}
        </div>
        <div style={{ position: 'relative' }}>
          <input
            value={fromAC.query}
            onChange={e => fromAC.onChange(e.target.value)}
            onBlur={fromAC.onBlur}
            onFocus={fromAC.onFocus}
            placeholder="Where are you departing from?"
            style={{
              width: '100%', boxSizing: 'border-box',
              background: '#1a1f26', border: '1px solid #2a2f36',
              borderRadius: 3, padding: '7px 10px', color: '#fff',
              fontFamily: 'inherit', fontSize: 11, outline: 'none',
            }}
          />
          {fromLocation?.autoDetected && (
            <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 7, color: '#4CAF50' }}>
              ↻ nearest
            </span>
          )}
          {fromAC.open && fromAC.suggestions.length > 0 && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
              background: '#1a1f26', border: '1px solid #2a2f36',
              borderTop: 'none', borderRadius: '0 0 3px 3px', maxHeight: 160, overflowY: 'auto',
            }}>
              {fromAC.suggestions.map((s, i) => (
                <div
                  key={i}
                  onMouseDown={() => fromAC.pick(s)}
                  style={{ padding: '6px 10px', fontSize: 10, color: '#fff', cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#252b35'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  📍 {s.label ?? s.name ?? s}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Filter row — single line */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 5, marginBottom: 12,
        overflowX: 'auto', paddingBottom: 2,
      }}>
        {[
          { label: 'Leave', value: leaveBy, placeholder: 'Any time', onChange: setLeaveBy },
          { label: 'Arrive', value: arriveBy, placeholder: 'Any time', onChange: setArriveBy },
          { label: 'Price', value: maxPrice, placeholder: 'No limit', onChange: setMaxPrice },
        ].map(f => (
          <input
            key={f.label}
            value={f.value}
            onChange={e => f.onChange(e.target.value)}
            placeholder={f.placeholder}
            style={{
              flexShrink: 0, width: 80,
              background: '#1a1f26', border: '1px solid #2a2f36', borderRadius: 2,
              padding: '4px 7px', fontFamily: 'inherit', fontSize: 8,
              color: f.value ? '#fff' : '#8A8680', outline: 'none',
            }}
          />
        ))}
        {/* Sort dropdown */}
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          style={{
            flexShrink: 0,
            background: '#1a1f26', border: '1px solid #E67E22', borderRadius: 2,
            padding: '4px 7px', fontFamily: 'inherit', fontSize: 8,
            color: '#E67E22', outline: 'none', cursor: 'pointer',
          }}
        >
          {['Cheapest', 'Fastest', 'Greenest'].map(s => <option key={s}>{s}</option>)}
        </select>
        {/* Divider */}
        <div style={{ width: 1, height: 18, background: '#2a2f36', flexShrink: 0 }} />
        {/* Toggle pills */}
        {pills.map(pill => (
          <button
            key={pill}
            onClick={() => togglePill(pill)}
            style={{
              flexShrink: 0,
              background: activePills.includes(pill) ? 'rgba(230,126,34,0.15)' : '#1a1f26',
              border: `1px solid ${activePills.includes(pill) ? '#E67E22' : '#2a2f36'}`,
              borderRadius: 10, padding: '3px 9px',
              fontFamily: 'inherit', fontSize: 7,
              color: activePills.includes(pill) ? '#E67E22' : '#8A8680',
              cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            {pill}
          </button>
        ))}
        {/* Search button */}
        <button
          onClick={search}
          disabled={!toLocation || !fromLocation || searching}
          style={{
            flexShrink: 0, marginLeft: 'auto',
            background: '#E67E22', border: 'none', borderRadius: 2,
            padding: '4px 12px', fontFamily: 'inherit', fontSize: 8,
            color: '#fff', cursor: 'pointer', letterSpacing: '0.06em',
            opacity: (!toLocation || !fromLocation) ? 0.4 : 1,
          }}
        >
          {searching ? '...' : 'SEARCH'}
        </button>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div>
          <div style={{ fontSize: 7, color: '#555', letterSpacing: '0.08em', marginBottom: 6 }}>
            {results.length} RESULTS · sorted by {sortBy.toLowerCase()}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {results.map(r => {
              const isSelected = selectedId === r.id;
              const cheapestPrice = Math.min(...results.map(x => x.price ?? Infinity));
              const co2Delta = r.co2kg != null && results[0]?.co2kg != null
                ? r.co2kg - cheapestPrice
                : null;

              return (
                <div
                  key={r.id}
                  style={{
                    background: isSelected ? 'rgba(230,126,34,0.06)' : '#1a1f26',
                    border: `1px solid ${isSelected ? '#E67E22' : '#2a2f36'}`,
                    borderRadius: 3, overflow: 'hidden',
                  }}
                >
                  {/* Row — clickable to select */}
                  <div
                    onClick={() => setSelectedId(isSelected ? null : r.id)}
                    style={{ padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
                  >
                    {/* Radio dot */}
                    <div style={{
                      width: 12, height: 12, borderRadius: '50%', flexShrink: 0,
                      background: isSelected ? '#E67E22' : 'transparent',
                      border: `1px solid ${isSelected ? '#E67E22' : '#2a2f36'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {isSelected && <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#0E1012' }} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 8, color: isSelected ? '#E67E22' : '#8A8680' }}>
                        {r.carrier ?? r.airline} · {r.duration ?? r.durationH + 'h'} · {r.stops === 0 ? 'Direct' : `${r.stops} stop`}
                        {isSelected && ' ★ SELECTED'}
                      </div>
                      <div style={{ fontSize: 11, color: '#fff' }}>
                        {fromLocation?.label?.split(' ')[0]} → {toLocation?.label?.split(',')[0]}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 13, color: '#fff' }}>${r.price}</div>
                      {r.co2kg != null && (
                        <div style={{ fontSize: 7, color: r.co2kg < 100 ? '#4CAF50' : '#E67E22' }}>{r.co2kg}kg CO₂</div>
                      )}
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isSelected && (
                    <div style={{ background: '#0d1018', padding: '8px 10px', borderTop: '1px solid #1e2530' }}>
                      <div style={{ display: 'flex', gap: 14, fontSize: 8, color: '#8A8680', marginBottom: 6 }}>
                        {r.departs && <span>Departs <span style={{ color: '#fff' }}>{r.departs}</span></span>}
                        {r.arrives && <span>Arrives <span style={{ color: '#fff' }}>{r.arrives}</span></span>}
                        {r.flexible && <span>Flexible <span style={{ color: '#4CAF50' }}>✓</span></span>}
                        {r.baggage && <span>Baggage <span style={{ color: '#4CAF50' }}>{r.baggage}</span></span>}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: 7, color: '#555' }}>
                          {r.co2kg != null && cheapestPrice && r.co2kg !== cheapestPrice
                            ? `${Math.abs(r.co2kg - (results[0]?.co2kg ?? r.co2kg))}kg CO₂ vs cheapest`
                            : ''}
                        </div>
                        <button
                          onClick={() => handleAddToPlan(r)}
                          style={{
                            background: '#E67E22', border: 'none', borderRadius: 2,
                            padding: '5px 14px', fontFamily: 'inherit', fontSize: 8,
                            color: '#fff', cursor: 'pointer', letterSpacing: '0.06em',
                          }}
                        >
                          → ADD TO PLAN
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!searching && results.length === 0 && (toLocation || fromLocation) && (
        <div style={{ fontSize: 10, color: '#555', padding: '12px 0', textAlign: 'center' }}>
          Set both origin and destination, then press SEARCH
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Wire PUBLIC TRANSPORT tab to TransportPlanner**

Open `src/pages/TripPlanner.jsx`. Add the import:

```js
import TransportPlanner from '../components/logistics/TransportPlanner';
```

Find the `{tab === 'PUBLIC TRANSPORT' && (` block and replace it:

```jsx
{tab === 'PUBLIC TRANSPORT' && (
  <div className="space-y-4">
    <TransportPlanner destination={trip.destination} />
  </div>
)}
```

- [ ] **Step 3: Handle the vp:navigate custom event in TripPlanner**

Add a `useEffect` inside `TripPlanner` (after the existing state declarations) to listen for the toast's "View on map" navigation:

```js
useEffect(() => {
  function onNav(e) { if (e.detail?.tab) setTab(e.detail.tab); }
  document.addEventListener('vp:navigate', onNav);
  return () => document.removeEventListener('vp:navigate', onNav);
}, []);
```

- [ ] **Step 4: Commit**

```bash
git add src/components/logistics/TransportPlanner.jsx src/pages/TripPlanner.jsx
git commit -m "feat(transport): new TransportPlanner — destination-first, GPS origin, filter row, radio-select + add to plan"
```

---

## Task 8: Verify full flow end-to-end

- [ ] **Step 1: Start dev server**

```bash
cd C:/Users/lasse/Desktop/venturepath
npm run dev
```

Expected: server starts on port 3001, no compilation errors.

- [ ] **Step 2: Check OVERVIEW layout**

Open `http://localhost:3001` and navigate to a trip. Verify:
- Map occupies ~70% width, TimelinePath appears to its right
- Elevation strip is full-width below the map row
- Safety ticker is a single row at the bottom with a severity dot and "Safety Pulse →" link
- Clicking "Safety Pulse →" opens the slide-over drawer; ESC closes it

- [ ] **Step 3: Check elevation silhouette**

Verify the elevation strip shows mountain ridge silhouettes behind the curve. The silhouette shape should be consistent across page reloads (deterministic).

- [ ] **Step 4: Check Tactical Mode**

Click the Tactical Mode button. Verify:
- Signal bars (4 amber bars) appear top-left
- Large clock below bars
- Full-width amber coordinate strip below clock
- Squad comms section
- Red SOS button at bottom

- [ ] **Step 5: Check Transport Planner**

Click the PUBLIC TRANSPORT tab. Verify:
- TO field is on top, FROM field below
- Filter row is a single line (no wrapping) with dropdowns + toggle pills
- Clicking a result row selects it (amber border, radio dot fills)
- Expanded state shows "→ ADD TO PLAN" button
- Clicking "→ ADD TO PLAN" shows a toast at the bottom

- [ ] **Step 6: Verify store wiring**

After adding a leg via Transport Planner, switch to OVERVIEW tab. Verify the RouteMap has updated (new polyline or marker for the added leg).

- [ ] **Step 7: Final commit**

```bash
git add .
git commit -m "feat: VenturePath OVERVIEW UX redesign complete"
```

---

## Self-Review Notes

- **Spec §1 (layout):** Covered in Task 3. SafetyTicker import replaces SafetyPulse import. ✓
- **Spec §2 (elevation silhouette):** Covered in Task 5. Seeded RNG + two silhouette layers + mode band tints. ✓
- **Spec §3 (safety ticker):** Covered in Task 4. Single-row ticker + slide-over drawer with ESC close. ✓
- **Spec §4 (tactical mode):** Covered in Task 6. Signal bars, amber strip, squad comms, SOS. Existing SOS logic preserved. ✓
- **Spec §5 (transport planner):** Covered in Task 7. TO-first, GPS origin, filter row, radio-select, expand-to-add. ✓
- **Spec §6 (cross-tool flow):** `addLeg` wired in Task 7 step 1. `addStay`/`addPoi`/`addAlert`/`addBudgetItem` added to store in Task 1 (ready for future tools). Toast system in Task 2. ✓
- **Type consistency:** `addLeg` payload shape used in Task 7 matches store `ADD_LEG` handler (Task 1) — both use spread + id assignment. The store's existing `ADD_LEG` case already spreads the payload, so the new shape fields pass through cleanly. ✓
- **`leg.from`/`leg.to` legacy:** The `handleAddToPlan` function in TransportPlanner writes both the new object shape (`from: fromLocation`) and the legacy string fields (`from: fromLocation?.label`) to preserve compatibility with RouteMap and TimelinePath which read `leg.from` as a string. ✓
