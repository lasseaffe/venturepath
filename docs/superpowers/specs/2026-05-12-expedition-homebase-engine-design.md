# Expedition Homebase Engine — Design Spec
**Date:** 2026-05-12
**Status:** Approved
**Project:** VenturePath

---

## Context

Trip-planning apps model itineraries as linear lists of stops. Travelers think spatially: the hotel is a base of operations, and every day radiates out from it and returns. VenturePath's Homebase Engine bridges this gap — it makes accommodation the anchor of day-loops, reduces manual planning friction to near zero, and cascades a single "add stop" action across all 8 planning tools simultaneously.

This is the most important feature in VenturePath. It is what distinguishes VP from every generic travel app on the market.

---

## Decisions Made

| Question | Decision |
|---|---|
| Can homebase shift mid-expedition? | Yes — each Stay anchors its own date block |
| Day-view selection mechanism | Calendar strip above the map |
| Planning automation | Three modes: Manual / Semi-Auto / Full Auto |
| Which tools cascade on stop add | All 8 (Budget, Packing, Map, Elevation, Transit, Tactical, Squad, Ledger) |
| Primary add-stop gestures | Search by name + Scout Pins (one-tap) + Tap → Search Here |

---

## Data Model

### New: `DayLoop` entity in `useTripStore`

```js
{
  id: string,              // nanoid
  date: string,            // ISO — "2026-05-16"
  homebaseStayId: string,  // links to the Stay covering this night
  stopIds: string[],       // ordered POI ids for the day
  autoLegIds: string[],    // engine-generated leg ids (source: 'homebase-engine')
  planningMode: 'manual' | 'semi' | 'full',  // overrides trip default for this day
  label: string | null,    // optional Pioneer-set label e.g. "Harbour day"
}
```

Add `dayLoops: DayLoop[]` and mutations `addDayLoop`, `addStopToDayLoop`, `removeDayLoop`, `reorderStopsInDayLoop`, `setDayLoopMode` to `useTripStore`.

### Modified: `Stay`

Add two fields:
```js
isHomebase: boolean,      // true by default — adding accommodation = homebase
homebaseColor: string | null, // optional per-city accent colour on map
```

When a Stay is added, the engine auto-creates DayLoops for each night in the checkin→checkout range, each pointing to that Stay as `homebaseStayId`.

### Modified: `Leg`

Add one field:
```js
source: 'manual' | 'homebase-engine',  // engine only touches legs it created
```

Auto-generated legs get `source: 'homebase-engine'`. The engine freely rebuilds them when stops are reordered; it never touches `source: 'manual'` legs.

### Modified: `trip`

Add one field:
```js
planningMode: 'manual' | 'semi' | 'full',  // default: 'semi', overridable per DayLoop
```

---

## UI Architecture

### Top Bar — Planning Mode Switcher

A three-state toggle always visible in the top bar:

```
[ Manual ]  [ Semi ● ]  [ Full Auto ]
```

Active mode is highlighted. Changing it updates `trip.planningMode`. Individual days can override via the DayLoop's own `planningMode` field (accessible from the day panel header).

### Calendar Strip

Sits between the top bar and the main map area. Scrollable horizontally.

```
Expedition → [ ALL ⊞ ] | [ Thu 14 🟢 ] [ Fri 15 🟢 2 stops ] [ Sat 16 ● 3 stops ] [ Sun 17 🟢 ] | [ Mon 18 ] ...
```

- **ALL ⊞** — resets map to full expedition view (all days, all homebases)
- **Green dot** — this night has a Stay (homebase). Green border on the day chip.
- **Stop count** — orange if stops exist for that day
- **City block dividers** — vertical lines separate homebase periods (Hamburg | Berlin)
- Tapping a day: filters left panel + map to that day's loop only
- Selected day gets orange border + accent

### Left Panel — Day View

When a day is selected:
- Header: "Day N · {date}" + homebase name
- List: homebase anchor (top, green left-border) → ordered stops (confirmed = solid orange border, pending = dashed) → auto-return leg (bottom, dimmed, tagged "auto-leg")
- "+ Add Stop to Day N" button at bottom (opens add-stop flow)

When ALL is selected:
- Header: "Expedition Stops"
- Lists all DayLoops grouped by homebase city block
- Existing behaviour preserved

### Map Area

**Full expedition view (ALL):**
- All homebase pins (🏨) with city labels
- All legs drawn, coloured by mode
- Distance rings around each homebase at ~5km radius (subtle, dashed)
- Legend: mode colours + confirmed/pending

**Day view (single day selected):**
- Only that day's homebase + stops visible
- Route drawn as an arc: homebase → stop 1 → stop 2 → ... → homebase (return leg dashed, dimmed)
- Scout Pins surfaced as claimable labels on map
- Bottom-left: "All Days / Day N" toggle as quick escape

**Map controls:**
- Search bar top-left (type to search, "Scout Pins" button right side)
- Zoom +/- top-right
- Long-press anywhere → "Search here" bubble

---

## Add-Stop Interaction Flows

All three flows converge at `addStopToDayLoop(dayLoopId, stop)`.

### Flow A — Search by Name
1. Pioneer taps "+ Add Stop" or the search bar
2. Types place name → results ranked by distance from homebase (Foursquare + Nominatim)
3. Taps result → place card (name, category, distance, hours, photo)
4. Taps "Add to Day N" → shared tail

### Flow B — Scout Pins (fastest — one tap)
1. Pioneer taps "Scout Pins" in search bar
2. AI-curated pins surface on map, ranked by `trip.climate` + `squad.preferences`
3. Pioneer taps "+" on any pin → shared tail (no confirmation card needed)

Already-added stops are greyed out. Pins outside the homebase area radius are hidden.

### Flow C — Tap Map → Search Here
1. Pioneer long-presses (500ms) any area on the map
2. Ghost pin drops + "🔍 Search here" bubble appears
3. Pioneer taps bubble → search opens anchored to tapped coordinates
4. Results are places within ~500m of tap point
5. Taps result → place card → "Add to Day N" → shared tail

### Shared Tail
```
stop { name, coords, category }
  → addStopToDayLoop(dayLoopId, stop)
  → HomebaseEngine.buildLegs(dayLoop)          // rebuilds all auto-legs for the day
  → useTripStore.setAutoLegs(dayLoopId, legs)  // commits legs with source:'homebase-engine'
  → sentinelBus.emit('homebase:stop-added', payload)
  → [Manual]   all listeners are no-ops
  → [Semi-Auto] listeners compute previews → Confirm Sheet rendered
  → [Full Auto] listeners fire immediately → toast with 5s undo
```

---

## Cascade Engine

**New file:** `src/utils/homebaseEngine.js`

### `HomebaseEngine.buildLegs(dayLoop)`

Reads `dayLoop.stopIds`, fetches coords for each stop + the homebase Stay, and builds a sequence of Legs:

```
homebase → stop[0] → stop[1] → ... → stop[n] → homebase (return)
```

- Uses existing `routeEngine` for mode + distance calculation
- All produced legs tagged `source: 'homebase-engine'`
- Drops all previous `source: 'homebase-engine'` legs for this dayLoop before rebuilding (clean slate)

### Event payload (`homebase:stop-added`)

```js
{
  dayLoop,           // full DayLoop object
  stop,              // newly added stop
  legs,              // rebuilt leg array
  homebaseCoords,    // [lat, lng] of the Stay
  totalDistanceKm,   // full day loop distance
  mode,              // trip.planningMode or dayLoop.planningMode
}
```

### Per-tool listener behaviour

| Tool | Receives | Does |
|---|---|---|
| **BudgetLoom** | legs[], stop.category | Estimates transit cost (distance × mode rate) + entry fee by category. Adds tagged line items. |
| **PackingManifest** | stop.category, trip.climate, legs[].mode | Maps category → item suggestions. Museum → comfortable shoes. Beach → sunscreen. Walking → blister plasters. |
| **LiveMap** | dayLoop.stopIds[], legs[] | Redraws route polyline. Updates distance ring. Fly-to animates to new stop. |
| **ElevationStrip** | legs[].coords[] | Fetches elevation profile via `elevationService`. Flags >50m gain on foot legs. |
| **TransitPlanner** | legs[].from/to, dayLoop.date | Fetches next 3 departures. Flags impossible timing gaps. |
| **TacticalCache** | stop.coords | Pre-fetches offline tiles + emergency services for 500m radius. Non-blocking background task. |
| **SquadSync** | dayLoop, stop, squad.pioneerIds[] | Broadcasts updated DayLoop via Supabase realtime. Creates Ledger nomination if conflict detected. |
| **LedgerWorkbench** | stop, squad.preferences[] | Checks preference conflicts. Creates nomination if conflict found, otherwise silent no-op. |

TacticalCache and SquadSync are always async/non-blocking — they never hold up the Semi-Auto confirm sheet.

### Semi-Auto Confirm Sheet

Renders after all listeners have returned previews. Shows all 8 tool outcomes in a grid:

```
⚡ Semi-Auto Preview — "Speicherstadt" added to Day 3
[ 🗺️ Route +1.4km ] [ 💰 Budget +€3.80 ] [ 🎒 Packing 2 items ] [ ⛰️ Elevation +12m ]
[ 🚌 Transit U3·09:14 ] [ 🛡️ Tactical Caching ] [ 👥 Squad 2 notified ] [ ⚖️ No conflict ]

[ Apply all changes ]  [ Discard ]             or apply individually ↑
```

Each preview card is independently approvable (click to toggle). "Apply all" commits everything checked. "Discard" rolls back the stop addition entirely.

---

## Components to Create / Modify

| File | Action | Notes |
|---|---|---|
| `src/utils/homebaseEngine.js` | **Create** | `buildLegs()`, `onStopAdded()`, per-tool listener registrations |
| `src/store/useTripStore.jsx` | **Modify** | Add `dayLoops[]`, mutations, `trip.planningMode` |
| `src/components/layout/CalendarStrip.jsx` | **Create** | Calendar strip UI component |
| `src/components/itinerary/DayLoopPanel.jsx` | **Create** | Left panel when a day is selected |
| `src/components/itinerary/CascadeConfirmSheet.jsx` | **Create** | Semi-Auto preview + confirm UI |
| `src/components/itinerary/AddStopFlow.jsx` | **Create** | Unified add-stop entry (wraps search, scout, tap flows) |
| `src/pages/TripPlanner.jsx` | **Modify** | Mount CalendarStrip, switch left panel to DayLoopPanel on day select |
| `src/components/itinerary/TimelinePath.jsx` | **Modify** | Filter to active day when day selected; preserve full view on ALL |
| `src/components/itinerary/RouteMap.jsx` | **Modify** | Day-loop route rendering, distance ring, fly-to on stop add |
| `src/components/dashboard/LaunchDashboard.jsx` | **Modify** | Wire planning mode switcher to top bar |

---

## Out of Scope (this spec)

- AI-generated full day plans (Full Auto mode's Claude integration) — spec separately
- Saved DayLoop templates / Pro-Path day suggestions
- Offline-first DayLoop sync (beyond TacticalCache prefetch)
- Per-stop time scheduling (drag to reorder time slots)

---

## Verification

1. Add a Stay → DayLoops auto-created for each night, homebase dot appears in calendar strip
2. Tap a day in calendar strip → map + panel filter to that day only
3. Add a stop via Search → route redraws, cascade fires (confirm sheet in Semi mode)
4. Add a stop via Scout Pins → one tap, no confirm card, cascade fires
5. Long-press map → "Search here" bubble → search anchored to coords → add stop → cascade fires
6. Switch planning mode Manual → no cascade fires on stop add
7. Switch to Full Auto → cascade fires instantly, toast shows with undo
8. Add a second Stay in a different city → new homebase block appears in calendar strip with divider
9. `source: 'homebase-engine'` legs never appear in manual leg list
10. Remove a stop → legs rebuild, all cascade tools update accordingly
