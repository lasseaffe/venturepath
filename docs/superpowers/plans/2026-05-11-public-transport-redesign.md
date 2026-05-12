# Public Transport Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename the FLIGHTS tab to PUBLIC TRANSPORT and replace FlightScout with a multi-leg planner where each leg can independently be ✈ flight or 🚂 train, with filtered autocomplete and per-leg Simulate Cancellation/Disruption.

**Architecture:** A new `PublicTransport` container manages an array of leg objects (id, mode, from, to, searched). Each leg renders as a `LegCard` component with its own mode toggle, filtered autocomplete inputs, search results, and simulate button. `EmergencyRebook` gains a `mode` prop to adapt its copy and color scheme. `geocodeEngine.js` gets two new filtered search functions. `FlightScout.jsx` is left in place (other code may reference it) but is no longer rendered by TripPlanner.

**Tech Stack:** React 18, Framer Motion (already used), Tailwind CSS, Nominatim OSM API (existing), VenturePath design tokens

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/utils/geocodeEngine.js` | Modify | Add `searchAirports()` and `searchStations()` filtered variants |
| `src/components/logistics/EmergencyRebook.jsx` | Modify | Add `mode` prop (`"flight"` \| `"train"`) — adapt header copy + color scheme |
| `src/components/logistics/LegCard.jsx` | Create | Single leg UI: mode toggle, filtered FROM/TO autocomplete, search, results, simulate button |
| `src/components/logistics/PublicTransport.jsx` | Create | Container: legs array state, route summary strip, + ADD LEG button |
| `src/pages/TripPlanner.jsx` | Modify | Rename tab label + swap `<FlightScout>` for `<PublicTransport>` |

---

## Task 1: Add filtered geocode helpers

**Files:**
- Modify: `src/utils/geocodeEngine.js`

- [ ] **Step 1: Add `searchAirports`, `searchStations`, and `searchTransportHubs` to geocodeEngine.js**

Open `src/utils/geocodeEngine.js` and append after the existing `searchLocations` function:

```js
// Returns only airport results (OSM class: aeroway)
export async function searchAirports(text, limit = 5) {
  if (!text?.trim()) return [];
  try {
    const res = await fetch(
      `${BASE}/search?q=${encodeURIComponent(text)}&format=json&limit=${limit * 3}&addressdetails=1`,
      { headers: HEADERS }
    );
    const data = await res.json();
    return data
      .filter(r => r.class === 'aeroway')
      .slice(0, limit)
      .map(r => ({
        id: r.place_id,
        name: r.display_name.split(',')[0],
        address: r.display_name,
        coords: { lat: parseFloat(r.lat), lng: parseFloat(r.lon) },
        type: r.type,
        class: r.class,
        transportType: 'flight',
      }));
  } catch {
    return [];
  }
}

// Returns only train station results (OSM type: station under railway class)
export async function searchStations(text, limit = 5) {
  if (!text?.trim()) return [];
  try {
    const res = await fetch(
      `${BASE}/search?q=${encodeURIComponent(text)}&format=json&limit=${limit * 3}&addressdetails=1`,
      { headers: HEADERS }
    );
    const data = await res.json();
    return data
      .filter(r => r.class === 'railway' && r.type === 'station')
      .slice(0, limit)
      .map(r => ({
        id: r.place_id,
        name: r.display_name.split(',')[0],
        address: r.display_name,
        coords: { lat: parseFloat(r.lat), lng: parseFloat(r.lon) },
        type: r.type,
        class: r.class,
        transportType: 'train',
      }));
  } catch {
    return [];
  }
}

// Returns airports + stations interleaved (for unset-mode legs)
export async function searchTransportHubs(text, limit = 5) {
  if (!text?.trim()) return [];
  const [airports, stations] = await Promise.all([
    searchAirports(text, Math.ceil(limit / 2)),
    searchStations(text, Math.floor(limit / 2)),
  ]);
  // interleave: airport, station, airport, station…
  const result = [];
  const max = Math.max(airports.length, stations.length);
  for (let i = 0; i < max; i++) {
    if (airports[i]) result.push(airports[i]);
    if (stations[i]) result.push(stations[i]);
  }
  return result.slice(0, limit);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/utils/geocodeEngine.js
git commit -m "feat(transport): add searchAirports, searchStations, searchTransportHubs to geocodeEngine"
```

---

## Task 2: Add `mode` prop to EmergencyRebook

**Files:**
- Modify: `src/components/logistics/EmergencyRebook.jsx`

The modal currently hardcodes red flight styling and "FLIGHT CANCELLED" copy. We need it to adapt when `mode="train"`.

- [ ] **Step 1: Update the component signature and derive mode-dependent values**

Replace the existing `export default function EmergencyRebook({ onClose, cancelledFlight = 'LH 504 JFK→SCL' })` line and the alert header block:

```jsx
export default function EmergencyRebook({ onClose, cancelledFlight = 'LH 504 JFK→SCL', mode = 'flight' }) {
```

Then, immediately inside the function body (before the return), add:

```jsx
  const isTrain = mode === 'train';
  const accentColor   = isTrain ? '#4a9eff' : '#E67E22';
  const alertBg       = isTrain ? 'bg-blue-900/40'   : 'bg-red-900/40';
  const alertBorder   = isTrain ? 'border-blue-500/40' : 'border-red-500/40';
  const alertText     = isTrain ? 'text-blue-300'    : 'text-red-300';
  const alertSubText  = isTrain ? 'text-blue-400/70' : 'text-red-400/70';
  const alertIcon     = isTrain ? 'text-blue-400'    : 'text-red-400';
  const barColor      = isTrain ? 'bg-blue-500'      : 'bg-red-500';
  const headingCopy   = isTrain ? 'SERVICE DISRUPTED' : 'FLIGHT CANCELLED';
  const subCopy       = isTrain ? 'train disruption detected' : 'disruption detected';
```

- [ ] **Step 2: Apply the derived values to the JSX**

Replace the hardcoded alert header `<div>` (lines 107–131 in the original):

```jsx
      <div className={`${alertBg} border-b ${alertBorder} px-6 py-4 flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <span className={`${alertIcon} text-xl animate-pulse`}>⚠</span>
          <div>
            <div className={`${alertText} font-mono font-bold tracking-widest text-sm`}>{headingCopy}</div>
            <div className={`${alertSubText} font-mono text-[10px] mt-0.5`}>{cancelledFlight} — {subCopy}</div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {!selected && (
            <div className="text-center">
              <div className="text-[9px] font-mono text-slate-500 tracking-widest">AUTO-SELECT IN</div>
              <div className={`font-mono text-2xl font-bold ${timeLeft <= 10 ? `${alertText} animate-pulse` : 'text-[#F2C94C]'}`}>
                {timeLeft}s
              </div>
            </div>
          )}
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white transition-colors font-mono text-xs"
          >
            ✕ CLOSE
          </button>
        </div>
      </div>
```

Replace the countdown bar `<motion.div>` className:

```jsx
            <motion.div
              className={`h-full ${barColor}`}
              animate={{ width: `${100 - pct}%` }}
              transition={{ duration: 0.5 }}
            />
```

- [ ] **Step 3: Commit**

```bash
git add src/components/logistics/EmergencyRebook.jsx
git commit -m "feat(transport): add mode prop to EmergencyRebook for train disruption styling"
```

---

## Task 3: Create LegCard component

**Files:**
- Create: `src/components/logistics/LegCard.jsx`

This is the heart of the redesign — one self-contained leg with mode toggle, filtered autocomplete, search results (flights or mock trains), and simulate button.

- [ ] **Step 1: Create the mock train builder (mirrors buildFlights)**

Create `src/components/logistics/LegCard.jsx` with this content:

```jsx
import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { filterExpeditionFlights } from '../../utils/flightEngine';
import { searchAirports, searchStations, searchTransportHubs } from '../../utils/geocodeEngine';
import EmergencyRebook from './EmergencyRebook';

const FLIGHT_PRIORITIES = [
  { id: 'CHEAPEST', label: 'Economy', icon: '💰' },
  { id: 'FASTEST',  label: 'Speed',   icon: '⚡' },
  { id: 'GREENEST', label: 'Green',   icon: '🌿' },
];

const TRAIN_PRIORITIES = [
  { id: 'CHEAPEST', label: 'Economy', icon: '💰' },
  { id: 'FASTEST',  label: 'Direct',  icon: '⚡' },
  { id: 'GREENEST', label: 'Green',   icon: '🌿' },
];

function buildFlights(origin, dest) {
  const o = origin.toUpperCase().slice(0, 3) || 'JFK';
  const d = (dest || 'BER').slice(0, 3).toUpperCase();
  return [
    { id: 'f1', carrier: 'Lufthansa',     route: `${o} → ${dest || d}`, price: 542,  duration: '7h 45m', co2: 120, label: 'Economy'   },
    { id: 'f2', carrier: 'DirectJet',     route: `${o} → ${dest || d}`, price: 890,  duration: '2h 15m', co2: 210, label: 'Non-stop'  },
    { id: 'f3', carrier: 'GreenFly',      route: `${o} → ${dest || d}`, price: 620,  duration: '4h 45m', co2: 85,  label: 'Eco'       },
  ];
}

function buildTrains(origin, dest) {
  const o = origin || 'Hamburg Hbf';
  const d = dest || 'Unknown';
  return [
    { id: 't1', carrier: 'Deutsche Bahn', route: `${o} → ${d}`, price: 89,  duration: '4h 02m', co2: 12, label: 'ICE Direct'   },
    { id: 't2', carrier: 'Eurostar',      route: `${o} → ${d}`, price: 55,  duration: '6h 30m', co2: 8,  label: 'Economy Saver'},
    { id: 't3', carrier: 'Thalys',        route: `${o} → ${d}`, price: 120, duration: '3h 15m', co2: 10, label: 'Premium'      },
  ];
}

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
        if (mode === 'flight')      results = await searchAirports(query, 5);
        else if (mode === 'train')  results = await searchStations(query, 5);
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

export default function LegCard({ leg, index, onUpdate, onRemove }) {
  // leg shape: { id, mode: 'flight'|'train'|null, from: '', to: '', searched: false }
  const { mode, from, to, searched } = leg;
  const [priority, setPriority]       = useState('CHEAPEST');
  const [showSimulate, setShowSimulate] = useState(false);

  const fromAC = useTransportAutocomplete(from, mode);
  const toAC   = useTransportAutocomplete(to,   mode);

  const isFlight = mode === 'flight';
  const isTrain  = mode === 'train';
  const accent   = isTrain ? '#4a9eff' : '#E67E22';
  const accentBg = isTrain ? 'bg-blue-900/10 border-blue-500/30' : 'bg-[#E67E22]/10 border-[#E67E22]/30';

  const priorities = isTrain ? TRAIN_PRIORITIES : FLIGHT_PRIORITIES;

  const results = searched
    ? (isTrain
        ? buildTrains(from, to)
        : filterExpeditionFlights(buildFlights(from, to), priority, 9999))
    : [];

  function pickSuggestion(field, suggestion) {
    const snap = suggestion.transportType === 'flight' ? 'flight'
               : suggestion.transportType === 'train'  ? 'train'
               : mode;
    onUpdate(leg.id, { [field]: suggestion.name, ...(snap !== mode ? { mode: snap } : {}) });
    if (field === 'from') fromAC.clear(); else toAC.clear();
  }

  function handleSearch(e) {
    e.preventDefault();
    onUpdate(leg.id, { searched: true });
  }

  const simulateLabel = isTrain ? '⚠ SIMULATE DISRUPTION' : '⚠ SIMULATE CANCELLATION';
  const simulateCls   = isTrain
    ? 'bg-blue-900/30 border-blue-500/40 text-blue-400 hover:bg-blue-900/50'
    : 'bg-red-900/30 border-red-500/40 text-red-400 hover:bg-red-900/50';

  function AutocompleteField({ label, value, field, ac }) {
    return (
      <div className="relative">
        <div className="text-[8px] font-mono text-slate-500 tracking-widest mb-1">{label}</div>
        <input
          type="text"
          value={value}
          onChange={e => onUpdate(leg.id, { [field]: e.target.value, searched: false })}
          onBlur={() => setTimeout(ac.clear, 150)}
          placeholder={isTrain ? 'Station…' : isFlight ? 'Airport…' : 'Airport or station…'}
          className="w-full bg-[#0E1012] border border-[#2a2f36] rounded px-3 py-2 text-sm text-white placeholder-slate-600 font-mono focus:outline-none"
          style={{ '--tw-ring-color': accent }}
        />
        {ac.searching && (
          <span className="absolute right-2 top-[30px] text-[9px] font-mono text-slate-500">…</span>
        )}
        <AnimatePresence>
          {ac.suggestions.length > 0 && (
            <motion.ul
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute z-20 w-full mt-0.5 rounded overflow-hidden shadow-lg"
              style={{ background: '#141820', border: '1px solid #2a2f36' }}
            >
              {ac.suggestions.map(s => (
                <li key={s.id}>
                  <button
                    type="button"
                    onMouseDown={() => pickSuggestion(field, s)}
                    className="w-full text-left px-3 py-2 text-xs font-mono text-white hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                  >
                    <span className="mr-1.5">{s.transportType === 'flight' ? '✈' : s.transportType === 'train' ? '🚂' : ''}</span>
                    {s.name}
                    {s.address !== s.name && (
                      <span className="block text-[9px] text-slate-500 truncate">{s.address}</span>
                    )}
                  </button>
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <>
      <AnimatePresence>
        {showSimulate && (
          <EmergencyRebook
            mode={isTrain ? 'train' : 'flight'}
            cancelledFlight={`${from || '?'} → ${to || '?'}`}
            onClose={() => setShowSimulate(false)}
          />
        )}
      </AnimatePresence>

      <div
        className="rounded-lg border border-[#2a2f36] bg-[#111318] p-4 space-y-3"
        style={{ borderLeftColor: mode ? accent : '#2a2f36', borderLeftWidth: 2 }}
      >
        {/* Leg header: index + mode toggle + simulate + remove */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-[8px] font-mono text-slate-600 tracking-widest">LEG {index + 1}</span>
            {/* Mode toggle */}
            <div className="flex border border-[#2a2f36] rounded overflow-hidden text-[9px] font-mono">
              <button
                type="button"
                onClick={() => onUpdate(leg.id, { mode: 'flight', searched: false })}
                className={`px-3 py-1.5 transition-colors ${isFlight ? 'bg-[#E67E22] text-[#0E1012] font-bold' : 'text-slate-500 hover:text-slate-300'}`}
              >
                ✈ FLIGHT
              </button>
              <button
                type="button"
                onClick={() => onUpdate(leg.id, { mode: 'train', searched: false })}
                className={`px-3 py-1.5 transition-colors ${isTrain ? 'bg-[#1a4a7a] text-[#4a9eff] font-bold' : 'text-slate-500 hover:text-slate-300'}`}
              >
                🚂 TRAIN
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSimulate(true)}
              className={`px-2.5 py-1 border text-[9px] font-mono rounded transition-colors tracking-widest ${simulateCls}`}
            >
              {simulateLabel}
            </button>
            {onRemove && (
              <button
                type="button"
                onClick={() => onRemove(leg.id)}
                className="text-slate-600 hover:text-slate-400 text-xs font-mono transition-colors"
                title="Remove leg"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* FROM / TO */}
        <form onSubmit={handleSearch} className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <AutocompleteField label="FROM" value={from} field="from" ac={fromAC} />
            <AutocompleteField label="TO"   value={to}   field="to"   ac={toAC}   />
          </div>
          <button
            type="submit"
            className={`w-full py-2 rounded text-[10px] font-mono tracking-widest border transition-colors`}
            style={{ borderColor: `${accent}80`, color: accent }}
          >
            {isTrain ? 'SEARCH TRAINS' : 'SEARCH FLIGHTS'}
          </button>
        </form>

        {/* Priority tabs + results */}
        {searched && (
          <>
            <div className="flex gap-1.5">
              {priorities.map(p => (
                <button
                  key={p.id}
                  onClick={() => setPriority(p.id)}
                  className={`flex-1 py-1.5 text-[9px] font-mono tracking-widest rounded border transition-colors ${
                    priority === p.id
                      ? 'font-bold text-[#0E1012]'
                      : 'bg-transparent border-[#2a2f36] text-slate-500 hover:text-slate-300'
                  }`}
                  style={priority === p.id ? { background: accent, borderColor: accent } : {}}
                >
                  {p.icon} {p.label}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              {results.map(r => (
                <div
                  key={r.id}
                  className="bg-[#0E1012] rounded-lg p-3 border border-[#1e2328] transition-colors"
                  style={{ '--hover-border': `${accent}66` }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-mono text-slate-500 tracking-widest">{r.carrier}</div>
                      <div className="text-white text-sm font-semibold font-mono mt-0.5">{r.route}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-mono font-bold" style={{ color: accent }}>${r.price}</div>
                      <div className="text-[9px] text-slate-600 font-mono">{r.label}</div>
                    </div>
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-[10px] font-mono text-slate-600">{r.duration}</span>
                    <span className={`text-[10px] font-mono ${r.co2 < 20 ? 'text-green-400' : r.co2 < 100 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {r.co2}kg CO₂
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {!searched && (
          <div className="py-6 text-center">
            <div className="text-xl mb-1" style={{ color: `${accent}66` }}>
              {isTrain ? '🚂' : '✈'}
            </div>
            <div className="text-[9px] font-mono text-slate-700 tracking-widest">
              {mode ? 'ENTER ORIGIN + DESTINATION TO SEARCH' : 'SELECT MODE TO BEGIN'}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/logistics/LegCard.jsx
git commit -m "feat(transport): add LegCard component with mode toggle, filtered autocomplete, and simulate button"
```

---

## Task 4: Create PublicTransport container

**Files:**
- Create: `src/components/logistics/PublicTransport.jsx`

- [ ] **Step 1: Create the container**

```jsx
import { useState } from 'react';
import LegCard from './LegCard';

let _id = 0;
function newLeg(mode = null, from = '', to = '') {
  return { id: `leg-${++_id}`, mode, from, to, searched: false };
}

export default function PublicTransport({ destination = '' }) {
  const [legs, setLegs] = useState([newLeg('flight', '', destination)]);

  function updateLeg(id, patch) {
    setLegs(prev => prev.map(l => l.id === id ? { ...l, ...patch } : l));
  }

  function removeLeg(id) {
    setLegs(prev => prev.length > 1 ? prev.filter(l => l.id !== id) : prev);
  }

  function addLeg() {
    // Pre-fill new leg's FROM with the previous leg's TO for continuity
    const last = legs[legs.length - 1];
    setLegs(prev => [...prev, newLeg(null, last?.to ?? '', '')]);
  }

  // Build route summary: [Hamburg, ✈, Paris, 🚂, Amsterdam]
  const summaryNodes = [];
  legs.forEach((leg, i) => {
    if (i === 0 && leg.from) summaryNodes.push({ type: 'city', label: leg.from });
    if (leg.mode) {
      summaryNodes.push({ type: 'connector', label: leg.mode === 'flight' ? '──✈──' : '──🚂──', mode: leg.mode });
    }
    if (leg.to) summaryNodes.push({ type: 'city', label: leg.to });
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="label-tag">Public Transport</h2>
      </div>

      {legs.map((leg, i) => (
        <LegCard
          key={leg.id}
          leg={leg}
          index={i}
          onUpdate={updateLeg}
          onRemove={legs.length > 1 ? removeLeg : null}
        />
      ))}

      {/* Add Leg */}
      <button
        onClick={addLeg}
        className="w-full py-3 rounded-lg border border-dashed border-[#2a2f36] text-[9px] font-mono text-slate-600 tracking-widest hover:border-slate-500 hover:text-slate-400 transition-colors"
      >
        + ADD LEG
      </button>

      {/* Route summary strip */}
      {summaryNodes.length > 0 && (
        <div className="bg-[#0d0f12] border border-[#1a1f24] rounded-lg px-4 py-3">
          <div className="text-[8px] font-mono text-slate-600 tracking-widest mb-2">ROUTE SUMMARY</div>
          <div className="flex flex-wrap items-center gap-1 text-[10px] font-mono">
            {summaryNodes.map((node, i) => (
              <span
                key={i}
                style={{ color: node.type === 'connector' ? (node.mode === 'flight' ? '#E67E22' : '#4a9eff') : '#ffffff' }}
              >
                {node.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/logistics/PublicTransport.jsx
git commit -m "feat(transport): add PublicTransport container with multi-leg state and route summary"
```

---

## Task 5: Wire into TripPlanner

**Files:**
- Modify: `src/pages/TripPlanner.jsx`

- [ ] **Step 1: Swap the import**

Find:
```jsx
import FlightScout from '../components/logistics/FlightScout';
```
Replace with:
```jsx
import PublicTransport from '../components/logistics/PublicTransport';
```

- [ ] **Step 2: Rename the tab label and swap the component**

Find the tab button that renders `FLIGHTS` (look for a `tab === 'FLIGHTS'` conditional and the corresponding tab button). Change the tab label string from `'FLIGHTS'` to `'PUBLIC TRANSPORT'`.

Then find:
```jsx
{tab === 'FLIGHTS' && (
  <div className="max-w-2xl space-y-4">
    <FlightScout destination={trip.destination} />
  </div>
)}
```
Replace with:
```jsx
{tab === 'PUBLIC TRANSPORT' && (
  <div className="max-w-2xl space-y-4">
    <PublicTransport destination={trip.destination} />
  </div>
)}
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/TripPlanner.jsx
git commit -m "feat(transport): rename FLIGHTS tab to PUBLIC TRANSPORT, wire PublicTransport component"
```

---

## Verification Checklist

Run the dev server (`npm run dev` at port 3001) and manually verify:

- [ ] Tab in TripPlanner reads **PUBLIC TRANSPORT** (not FLIGHTS)
- [ ] Opening the tab shows one leg card defaulted to FLIGHT mode with orange accents
- [ ] Typing "hamburg" in FROM (flight mode) → dropdown shows only airports (Hamburg HAM), not train stations
- [ ] Typing "hamburg" in FROM (train mode) → dropdown shows only train stations (Hamburg Hbf)
- [ ] On a new unset-mode leg, typing "paris" → dropdown shows both ✈ Paris CDG and 🚂 Paris Gare du Nord with icons
- [ ] Selecting an airport suggestion on an unset leg → mode snaps to FLIGHT
- [ ] Selecting a station suggestion on an unset leg → mode snaps to TRAIN
- [ ] SEARCH FLIGHTS on a flight leg → shows 3 orange-accented flight result cards
- [ ] SEARCH TRAINS on a train leg → shows 3 blue-accented train result cards
- [ ] ⚠ SIMULATE CANCELLATION on flight leg → opens EmergencyRebook with red header saying "FLIGHT CANCELLED"
- [ ] ⚠ SIMULATE DISRUPTION on train leg → opens EmergencyRebook with blue header saying "SERVICE DISRUPTED"
- [ ] + ADD LEG → new leg appended, FROM pre-filled with previous leg's TO
- [ ] Remove (✕) button hides on single-leg layout, appears when 2+ legs
- [ ] Route summary strip shows correct chain: `Hamburg ──✈── Paris ──🚂── Amsterdam`
