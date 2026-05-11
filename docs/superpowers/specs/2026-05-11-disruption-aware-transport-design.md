# Disruption-Aware Multi-Modal Transport Builder

**Date:** 2026-05-11
**Status:** Approved for implementation
**Project:** VenturePath (`C:\Users\lasse\Desktop\venturepath`)

---

## Context

The Public Transport feature (LegCard + PublicTransport) supports flight and train legs with mock result data and a squad disruption simulation modal. Several gaps block it from being genuinely useful:

1. Autocomplete returns duplicate EN/DE results for the same physical stop
2. Train "Simulate Disruption" opens EmergencyRebook but alternatives are hardcoded flight data — wrong mode
3. No bus or tram modes exist despite being the dominant local transit in German cities
4. Results are all mock — no real schedules, no real disruption data
5. Multi-leg routes have no cascade awareness: a missed connection on leg 1 silently endangers leg 2

This spec describes the full fix: four transport modes with live schedules, GTFS-RT disruption alerts, and automatic cascade detection with cross-modal alternative finding.

**Geographic scope:** Europe/Germany primary. DB-Rest for trains (no key, excellent DE coverage). Transitland GTFS for bus/tram (free tier key). Rome2rio for alternative finding (free tier, 1000 req/day). Fallback: Transitland journey search when Rome2rio quota exhausted.

---

## Architecture Overview

```
PublicTransport.jsx  (orchestrator — manages legs[], runs cascade check)
  └─ LegCard.jsx     (per-leg UI — 4 modes, real results, disruption status bar)
       └─ EmergencyRebook.jsx  (disruption modal — all modes, real alternatives)

utils/
  geocodeEngine.js     (existing — add bus/tram stop search, dedup fix)
  transitEngine.js     (NEW — DB-Rest + Transitland schedule fetching)
  disruptionEngine.js  (NEW — GTFS-RT alert polling, cascade detection)
  alternativeEngine.js (NEW — Rome2rio wrapper, Transitland fallback)
```

---

## Section 1: Data Engines

### `transitEngine.js` (new)

Single responsibility: fetch normalized connection options for a leg.

**Exports:**
```js
searchConnections(fromStop, toStop, isoDate, mode)
  // → Promise<Connection[]>
```

**Connection shape:**
```js
{
  id: string,
  carrier: string,          // "DB ICE", "HVV Bus 37"
  departure: string,        // ISO 8601
  arrival: string,          // ISO 8601
  duration: string,         // "2h 14m"
  price: number | null,     // EUR, null if unavailable
  co2: number,              // kg
  platform: string | null,
  realtime: boolean,        // true = live DB-RT data
  stopFromId: string,       // GTFS/DB stop ID (used by disruptionEngine)
  stopToId: string,
}
```

**Per-mode strategy:**
- `'train'` → `GET v6.db.transport.rest/stops/{id}/departures` — stop ID resolved from autocomplete coords via `GET /locations?latitude=&longitude=`. Returns real departures with live delay.
- `'bus'` | `'tram'` → Transitland `GET /api/v2/stops/{onestop_id}/departures` — onestop_id resolved from GTFS stop selected in autocomplete.
- `'flight'` → existing mock builder unchanged (Amadeus stub in `bookingEngine.js` slots in later without touching this file).

**Error handling:** Network failure returns `[]`; caller shows "LIVE DATA UNAVAILABLE — showing cached options" notice in the results area.

---

### `disruptionEngine.js` (new)

Single responsibility: fetch alerts for a leg and detect cascade risk across a route.

**Exports:**
```js
fetchAlerts(leg) → Promise<Disruption | null>

checkCascade(legs) → CascadeResult[]
```

**Disruption shape:**
```js
{
  type: 'delay' | 'cancellation' | 'strike' | 'construction' | 'diversion',
  severity: 'low' | 'medium' | 'critical',
  delayMinutes: number,
  message: string,
  source: 'db-rt' | 'transitland' | 'simulated',
}
```

`source: 'simulated'` is written by the Simulate Disruption button. The cascade engine makes no distinction — a simulated delay propagates exactly like a real one.

**Alert sources:**
- Train: `v6.db.transport.rest/trips/{tripId}` — `stopovers[].departureDelay` (seconds) gives live delay per stop. `tripId` comes from the `selectedOption` returned by `transitEngine`.
- Bus/Tram: Transitland `/api/v2/stop_times` for the selected onestop_id — cross-referenced against the agency's published service alerts feed where available.

**`checkCascade(legs)` algorithm:**
```
For each consecutive pair (N, N+1) where both have selectedOption:
  bufferMs = leg[N+1].selectedOption.departure - leg[N].selectedOption.arrival
  delay    = leg[N].disruption?.delayMinutes ?? 0
  remaining = bufferMs/60000 - delay           // minutes

  remaining < 30  → { severity: 'amber', legId: N+1, remainingMinutes: remaining }
  remaining < 0   → { severity: 'red',   legId: N+1, remainingMinutes: remaining }

Cascade propagates: if leg[N+1] is now red, leg[N+2]'s buffer recalculates
against leg[N+1]'s new estimated arrival (arrival + delayMinutes).
```

**Polling:** `PublicTransport.jsx` calls `fetchAlerts` every 90 seconds per confirmed leg via `useInterval`. Stops polling when the expedition departs + 6 hours.

---

### `alternativeEngine.js` (new)

Single responsibility: find cross-modal alternatives when a connection is missed.

**Export:**
```js
findAlternatives(fromCoords, toCoords, isoDate) → Promise<Alternative[]>
```

**Alternative shape:**
```js
{
  id: string,
  label: string,              // "ICE via Frankfurt", "Bus 37 + Tram 5"
  modes: Mode[],              // all modes involved
  segments: Segment[],
  duration: string,
  price: number | null,
  co2: number,
  departs: string,            // ISO
  arrives: string,            // ISO
  source: 'rome2rio' | 'transitland',
}
```

**Strategy:**
1. Call Rome2rio `/search?from=lat,lng&to=lat,lng` — returns up to 4 ranked routes
2. If `429` (quota) or network error → fall back to `v6.db.transport.rest/journeys?from=lat,lng&to=lat,lng` which is a full multi-modal journey planner covering train, regional bus, and ferry across Germany/Europe
3. Sort by duration ascending; label the fastest as "FASTEST ROUTE", cheapest as "ECONOMY OPTION", lowest-CO₂ as "GREENEST"

Env var: `VITE_ROME2RIO_KEY`

---

## Section 2: Mode Expansion + Autocomplete

### New modes in LegCard

Mode toggle expands to four buttons. All styling derives from `MODE_CONFIG` — no scattered color branches:

```js
const MODE_CONFIG = {
  flight: { label: 'FLIGHT', icon: '✈', accent: '#E67E22', simulate: 'SIMULATE CANCELLATION' },
  train:  { label: 'TRAIN',  icon: '🚂', accent: '#4a9eff', simulate: 'SIMULATE DISRUPTION'  },
  bus:    { label: 'BUS',    icon: '🚌', accent: '#22a060', simulate: 'SIMULATE DISRUPTION'  },
  tram:   { label: 'TRAM',   icon: '🚃', accent: '#a855f7', simulate: 'SIMULATE DISRUPTION'  },
};
```

Active mode button: `background: accent, color: #0E1012, font-bold`.
Inactive: `text-[var(--text-muted)] hover:text-[var(--text-secondary)]`.

### Autocomplete additions to `geocodeEngine.js`

Two new functions following the existing `searchWithFallback` pattern:

```js
searchBusStops(text, limit = 5)
  // OSM filter: r.tags?.highway === 'bus_stop' || r.class === 'highway' && r.type === 'bus_stop'
  // fallback suffix: 'bus stop'

searchTramStops(text, limit = 5)
  // OSM filter: r.class === 'railway' && r.type === 'tram_stop'
  // fallback suffix: 'tram stop'
```

`useTransportAutocomplete` in LegCard adds `'bus'` and `'tram'` branches calling these functions.

### Deduplication fix

In `searchByFilter`, after mapping results, deduplicate by coordinate bucket before returning:

```js
const seen = new Set();
return mapped.filter(r => {
  const key = `${r.coords.lat.toFixed(3)},${r.coords.lng.toFixed(3)}`;
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});
```

3 decimal places ≈ 100 m grid. First (highest-relevance) result per bucket survives. Eliminates EN/DE duplicates and node+relation pairs.

### Leg data shape additions

```js
{
  // existing
  id, mode, from, to, searched,
  // new
  fromCoords: { lat, lng } | null,   // set on autocomplete selection
  toCoords:   { lat, lng } | null,
  stopFromId: string | null,         // GTFS/DB stop ID for transitEngine
  stopToId:   string | null,
  selectedOption: Connection | null, // set when Pioneer taps a result card
  disruption: Disruption | null,     // set by disruptionEngine polling
  cascadeRisk: CascadeResult | null, // set by checkCascade
}
```

---

## Section 3: Real Schedule Data Flow

**Trigger:** Pioneer submits the search form. `LegCard` calls `transitEngine.searchConnections(from, to, date, mode)`.

**Loading state:** Results area shows three pulsing skeleton rows (matching result card height). No spinner. LaunchSequence aesthetic preserved.

**Result cards:** Same layout as current mock cards, plus:
- `● LIVE` badge (green, font-mono, 8px) next to departure time when `realtime: true`
- Tapping a card sets `leg.selectedOption` — this "confirms" the leg and enables disruption polling + cascade detection

**Flight mode:** Unchanged — still uses mock builder. Cards show no `● LIVE` badge.

---

## Section 4: Disruption Status UI

### LegCard status bar

A 28px strip at the top of each LegCard, hidden when `disruption === null`:

- **Amber** (`bg-amber-900/40 border-amber-500/40 text-amber-300`): delay or cascade risk. Shows `"⚠ [message] — connection buffer: Xm remaining"`
- **Red** (`bg-red-900/40 border-red-500/40 text-red-400`): cancellation or cascade critical. Shows `"✕ CONNECTION MISSED — alternatives loading…"` and auto-opens EmergencyRebook

### Route summary cascade nodes

Between leg connectors in PublicTransport's route summary, connection buffer time is shown:

- No disruption: `+2h 15m` in `text-[var(--text-muted)]`
- Amber: `+12m ⚠` in amber
- Red: `MISSED ✕` in red, pulsing

Tapping any red/amber node scrolls to the affected LegCard and opens EmergencyRebook.

### "CHECK ROUTE" button

Added to PublicTransport's route summary panel. Manually triggers a full `fetchAlerts` sweep across all confirmed legs followed by `checkCascade`. Useful before departing. Shows a brief `"Checking…"` pulse while running.

---

## Section 5: EmergencyRebook (all modes + real alternatives)

### Visual personality per mode

Header, accent, icon, and terminology all derive from `MODE_CONFIG`. No hardcoded flight copy:

| mode   | header text         | accent   | cascade label          |
|--------|---------------------|----------|------------------------|
| flight | SERVICE DISRUPTED   | #E67E22  | MISSED CONNECTION      |
| train  | SERVICE DISRUPTED   | #4a9eff  | MISSED CONNECTION      |
| bus    | ROUTE DIVERSION     | #22a060  | DELAYED TRANSFER       |
| tram   | SERVICE DISRUPTION  | #a855f7  | DELAYED TRANSFER       |

### Real alternatives

Alternative cards populated from `alternativeEngine.findAlternatives`. While loading: pulsing skeleton. On error: "LIVE ALTERNATIVES UNAVAILABLE — squad vote disabled, manual rebook required."

Top 3 alternatives shown (fastest, economy, greenest as before). Multi-segment alternatives show a compact segment list: `✈ LH504 + 🚂 ICE 123`.

### Cascade banner

When `disruption.source !== 'simulated'` and the disruption was triggered by cascade, a banner appears above the cards:

```
↑ CASCADE from Leg [N]: [leg N from] → [leg N to]
  Original connection buffer: Xm — now Ym overrun
```

### Simulate Disruption for all modes

Simulate button generates a realistic fake disruption:
- Bus/tram: `delayMinutes` 10–40, type randomly `'delay'|'diversion'`
- Train: `delayMinutes` 20–90, type randomly `'delay'|'cancellation'|'strike'|'construction'`
- `source: 'simulated'` — triggers full cascade + alternative-finding pipeline

Countdown drops from 60s → 45s when `cascadeRisk.severity === 'red'`.

---

## Section 6: Environment Variables

Add to `.env.local` (and document in `README`):

```
VITE_TRANSITLAND_KEY=...    # https://www.transit.land — free tier, bus/tram schedules
VITE_ROME2RIO_KEY=...       # https://www.rome2rio.com/api — free tier 1000 req/day
```

Existing keyless APIs: `v6.db.transport.rest`, Nominatim. No changes needed.

---

## Out of Scope

- Amadeus flight schedules (stub exists in `bookingEngine.js`, slots in independently)
- Ferry as a separate mode
- U-Bahn as a separate mode (treated as tram: same OSM filter, same GTFS source)
- Tactical Mode offline caching of disruption state
- Paid transit APIs (all integrations use free tiers)

---

## Verification

1. Type "hamburg" in TRAIN mode FROM field → expect 4–5 German-named stations, no EN/DE duplicates
2. Type "berlin" in BUS mode → expect bus stop suggestions
3. Select a train leg → result cards appear with `● LIVE` badge; departure times match DB website
4. Set two confirmed train legs with a 20m connection buffer → simulate disruption on leg 1 with 45m delay → expect amber cascade warning on leg 2 → expect EmergencyRebook to open with real Rome2rio alternatives
5. Simulate Disruption on a BUS leg → expect green-accented modal with bus/tram alternatives, not flight data
6. Hit CHECK ROUTE with no disruptions → expect "All legs clear" pulse in route summary
