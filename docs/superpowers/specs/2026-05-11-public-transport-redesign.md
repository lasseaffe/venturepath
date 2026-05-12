# Public Transport Redesign — Design Spec
_2026-05-11_

## Context

The existing FLIGHTS tab in TripPlanner contains `FlightScout`, a single-mode flight search with a "Simulate Cancellation" button wired to `EmergencyRebook`. The user wants to:

1. Rename the tab from "FLIGHTS" to "PUBLIC TRANSPORT"
2. Add airport autocomplete (currently the FROM/TO fields use a generic Nominatim geocoder that returns any place, not airports/stations)
3. Add a Rail Scout section with its own Simulate Disruption flow
4. Support multi-leg itineraries where each leg is independently flight or train
5. Handle mixed routes (fly HAM→CDG, train CDG→AMS) naturally

## Design

### Page rename
- Tab label: `FLIGHTS` → `PUBLIC TRANSPORT` in `TripPlanner.jsx`
- Page header inside the tab: `FLIGHT SCOUT` → `PUBLIC TRANSPORT`

### Multi-leg architecture

The tab renders a list of **LegCards**. Each LegCard is self-contained:

```
LegCard
  ├── mode toggle: [✈ FLIGHT] [🚂 TRAIN]
  ├── FROM input  (autocomplete filtered by mode)
  ├── TO input    (autocomplete filtered by mode)
  ├── Search button (label adapts: SEARCH FLIGHTS / SEARCH TRAINS)
  ├── Results (existing FlightScout results UI, or new train mock results)
  └── Simulate Cancellation / Simulate Disruption button → EmergencyRebook modal
```

A **Route Summary** strip below all legs shows the full chain:
`Hamburg ──✈── Paris ──🚂── Amsterdam`

An **+ ADD LEG** dashed button appends a new blank LegCard.

### Mode toggle behavior
- Default mode for the first leg: FLIGHT (preserves existing FlightScout behavior)
- New legs start with no mode selected — both toggle options shown as inactive
- Autocomplete while no mode selected: shows **all transport hubs** (airports + train stations)
- When user selects an airport suggestion → mode snaps to FLIGHT
- When user selects a train station suggestion → mode snaps to TRAIN
- After mode is set: autocomplete filters to that mode only (airports or stations)

### Autocomplete filtering
- **FLIGHT mode**: filter Nominatim results to `aeroway` OSM class (airports)
  - Display format: `City Name (IATA)` e.g. `Hamburg (HAM)`
- **TRAIN mode**: filter Nominatim results to `railway=station` OSM tag
  - Display format: `Station Name` e.g. `Hamburg Hbf`
- **No mode set**: show both, label each result with a small ✈ or 🚂 icon

### Simulate Cancellation / Disruption
- FLIGHT leg: red button `⚠ SIMULATE CANCELLATION` → existing `EmergencyRebook` modal (no changes needed)
- TRAIN leg: blue button `⚠ SIMULATE DISRUPTION` → same `EmergencyRebook` modal, passed a `mode="train"` prop so it can adapt copy ("disruption" vs "cancellation", blue color scheme)

### Visual language
- Flight legs: Ember orange (`#E67E22`) accents, red cancellation button
- Train legs: blue (`#1a4a7a` / `#4a9eff`) accents, blue disruption button
- Both use existing Midnight background, JetBrains Mono, VenturePath token set

## Files to change

| File | Change |
|---|---|
| `src/pages/TripPlanner.jsx` | Rename tab label `FLIGHTS` → `PUBLIC TRANSPORT`; replace `<FlightScout>` with `<PublicTransport>` |
| `src/components/logistics/FlightScout.jsx` | Rename/refactor into `PublicTransport.jsx` (multi-leg container) + `LegCard.jsx` |
| `src/components/logistics/EmergencyRebook.jsx` | Add `mode` prop (`"flight"` \| `"train"`) to adapt copy and color scheme |
| `src/utils/geocodeEngine.js` | Add `searchAirports()` and `searchStations()` filtered variants alongside existing `searchLocations()` |

## New files

| File | Purpose |
|---|---|
| `src/components/logistics/PublicTransport.jsx` | Top-level container: leg list state, route summary strip, + ADD LEG |
| `src/components/logistics/LegCard.jsx` | Single leg: mode toggle, FROM/TO inputs, search, results, simulate button |

## Verification

1. Single flight leg: behaves identically to current FlightScout
2. Single train leg: FROM/TO show station suggestions; Search Trains button appears; results show mock trains
3. Mixed route: add two legs, set leg 1 to FLIGHT and leg 2 to TRAIN; route summary strip shows `City ──✈── City ──🚂── City`
4. Autocomplete mode-snap: on a new leg (no mode), type a city → select an airport → mode snaps to FLIGHT; select a station → mode snaps to TRAIN
5. Simulate Cancellation on FLIGHT leg: opens EmergencyRebook in red flight mode
6. Simulate Disruption on TRAIN leg: opens EmergencyRebook in blue train mode
7. Tab label in TripPlanner reads "PUBLIC TRANSPORT"
