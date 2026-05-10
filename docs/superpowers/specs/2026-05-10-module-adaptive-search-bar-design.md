# VenturePath — Module-Adaptive GlobalSearchBar Design Spec
**Date:** 2026-05-10  
**Status:** Approved for implementation

---

## Overview

A per-section search bar system that shape-shifts its behavior based on which tab is active in `TripPlanner`. Each section owns its own `AdaptiveSearchBar` instance. A shared `SearchContext` provider + strategy map drives all behavior — placeholder text, live Inspire Me queries, result filtering, and detail sheet actions — without duplicating logic across tabs.

---

## Architecture

### Layer breakdown

```
TripPlanner
└── SearchContext.Provider (activeTab, destination, userRole, strategy)
    ├── ITINERARY tab → <AdaptiveSearchBar />
    ├── LOGISTICS tab → <AdaptiveSearchBar />
    ├── DISCOVERY tab → <AdaptiveSearchBar />
    ├── TACTICAL_HUD tab → <AdaptiveSearchBar />   (stub — not yet built)
    ├── BUDGET tab      → <AdaptiveSearchBar />   (stub — not yet built)
    └── STRATEGY tab    → <AdaptiveSearchBar />   (stub — not yet built)
```

### Data flow

1. `TripPlanner` passes `activeTab` into `SearchContext.Provider` as a prop
2. `SearchContext` reads `trip.destination` and `userRole` from `useTripStore`
3. `SearchContext` computes `strategy` from `SEARCH_STRATEGIES[activeTab]`
4. `useAdaptiveSearch` consumes `SearchContext` → fires queries → returns results
5. `AdaptiveSearchBar` renders from hook output; tapping a result opens `POIDetailSheet`
6. `POIDetailSheet` emits action events to `sentinelBus`

---

## Files to Create

```
src/context/SearchContext.jsx
src/hooks/useAdaptiveSearch.js
src/utils/searchStrategies.js
src/components/search/AdaptiveSearchBar.jsx
src/components/search/POIDetailSheet.jsx
```

---

## SearchContext

**File:** `src/context/SearchContext.jsx`

```jsx
// Wraps TripPlanner (not the whole app — search is trip-scoped)
<SearchContext.Provider value={{ activeTab, destination, userRole, strategy }}>
```

- `activeTab` — prop passed from TripPlanner's `tab` state (no new global state)
- `destination` — `useTripStore().trip.destination`
- `userRole` — `useTripStore().userRole`
- `strategy` — `SEARCH_STRATEGIES[activeTab] ?? SEARCH_STRATEGIES.DEFAULT`

The provider owns **no** result state. Results live in `useAdaptiveSearch` per-instance.

---

## Strategy Map

**File:** `src/utils/searchStrategies.js`

Each strategy entry:

```js
{
  placeholder: string,
  inspireQuery: { overpassFilter: string },   // Overpass QL amenity/shop filter
  filterMask: string[],                        // OSM keys to constrain Photon results
  resultActions: string[],                     // Action button labels for POIDetailSheet
}
```

### Slot definitions

| Tab | Placeholder | Inspire Me (Overpass) | Result Actions |
|---|---|---|---|
| `ITINERARY` | `"Find stops, viewpoints…"` | `tourism=viewpoint`, `historic=*`, `leisure=nature_reserve` | `"Add to Leg"`, `"Save POI"` |
| `LOGISTICS` | `"Find gear shops, grocery…"` | `shop=supermarket`, `shop=outdoor`, `shop=hardware` | `"Add Supply Stop"`, `"Save POI"` |
| `DISCOVERY` | `"Explore hidden gems…"` | `tourism=attraction` (rating-filtered, low foot-traffic bias) | `"Save to Collection"`, `"Share"` |
| `TACTICAL_HUD` | `"Find water, medical…"` | `amenity=drinking_water`, `amenity=toilets`, `amenity=hospital` | `"Mark Safe Point"`, `"SOS Anchor"` |
| `BUDGET` | `"Find ATMs, banks…"` | `amenity=atm`, `amenity=bank`, `amenity=bureau_de_change` | `"Log Expense Stop"` |
| `STRATEGY` | `"Search destinations, airports…"` | `aeroway=aerodrome`, `office=government` | `"Add to Mission"` |
| `DEFAULT` | `"Search…"` | none (Nominatim text only) | `"Save POI"` |

---

## `useAdaptiveSearch` Hook

**File:** `src/hooks/useAdaptiveSearch.js`

```js
const { query, setQuery, results, loading, inspireResults, openDetail } = useAdaptiveSearch();
```

### Behavior

1. **On focus, query empty** → fires `strategy.inspireQuery` against Overpass API, anchored to `destination` geocode → populates `inspireResults`
2. **On query change** (debounced 300ms) → fires Photon autocomplete, results filtered by `strategy.filterMask` → populates `results`
3. **On result select** → calls `openDetail(poi, strategy.resultActions)` → opens `POIDetailSheet`
4. **On blur/close** → clears `results` and `inspireResults` (no persistence — ephemeral only)

### Geocoding

`destination` string → geocoded once per SearchContext mount via `geocodeEngine.geocodeLocation()`. Cached in a ref; not re-fired on every search.

### Error states

- Overpass timeout (>5s) → skip Inspire Me, show fallback chips, no error shown to user
- Photon failure → fall back to Nominatim `searchLocations()` silently

---

## `AdaptiveSearchBar` Component

**File:** `src/components/search/AdaptiveSearchBar.jsx`

### Rendering states

| State | Renders |
|---|---|
| Idle | Input with `strategy.placeholder`, no dropdown |
| Focused, empty | Inspire Me chips (Ember `#E67E22` pill tags) from `inspireResults`; if still loading, show 3 skeleton chips in `#0E1012`; if inspire fails, show static fallback chips from `strategy.filterMask` category names |
| Typing | Dropdown list of `results` in `tactical-panel` dark style; each row: POI name + category tag + distance from nearest leg anchor |
| Result tapped | Closes dropdown, opens `POIDetailSheet` |

### Styling contracts

- Input: `tactical-panel` background, `#E67E22` focus ring, `font-mono` placeholder
- Inspire chips: `bg-brand-accent/20 text-brand-accent border border-brand-accent/40`
- Result rows: `#0E1012` background, `#D9C5B2` secondary text for category + distance
- No generic Tailwind defaults without token overrides

---

## `POIDetailSheet` Component

**File:** `src/components/search/POIDetailSheet.jsx`

### Props

```js
{ poi, actions, onClose }
```

### Content

- POI name (Playfair Display heading)
- Category tag (`label-tag` class, JetBrains Mono)
- Distance from current leg anchor (computed via `haversineKm`)
- OSM metadata: opening hours, phone, website — rendered only if present, no empty fields shown
- Mapillary street-view thumbnail — fetched by coords if available; falls back to a category icon in Ember color on `#0E1012` background
- Action buttons — one per `actions` entry, Ember fill style

### Action → sentinelBus event map

| Action label | Event fired |
|---|---|
| `"Add to Leg"` | `LEG_STOP_ADDED` `{ poi }` |
| `"Add Supply Stop"` | `LOGISTICS_STOP_ADDED` `{ poi }` |
| `"Save to Collection"` | `COLLECTION_POI_SAVED` `{ poi }` |
| `"Save POI"` | `POI_SAVED` `{ poi }` |
| `"Mark Safe Point"` | `TACTICAL_SAFE_POINT_MARKED` `{ poi }` |
| `"SOS Anchor"` | `TACTICAL_SOS_ANCHOR_SET` `{ poi }` |
| `"Log Expense Stop"` | `BUDGET_EXPENSE_STOP_LOGGED` `{ poi }` |
| `"Add to Mission"` | `STRATEGY_DESTINATION_ADDED` `{ poi }` |
| `"Share"` | `POI_SHARE_REQUESTED` `{ poi }` |

The sheet is **not** tab-aware — it renders what it receives. Tab behavior lives in the strategy map only.

---

## Integration Points (TripPlanner changes)

- Wrap tab content area in `<SearchContext.Provider activeTab={tab}>` 
- Add `<AdaptiveSearchBar />` at the top of ITINERARY, LOGISTICS, DISCOVERY tab renders
- TACTICAL_HUD, BUDGET, STRATEGY tabs: add `<AdaptiveSearchBar />` when those tabs are built — zero other changes needed

---

## Out of Scope (covered in Search Engine spec — A)

- Overpass query construction details (BBox radius, Overpass QL syntax)
- Offline/Blackout mode — local MiniSearch index fallback
- SearchRanker weighted scoring (proximity × vibe × role)
- Tactical Collections ("Save All [Category]")

---

## Apple Compliance Checkpoints

**UNIQUENESS:** Strategy map ties search behavior to VenturePath's expedition vocabulary and mission profile — a generic travel app cannot produce tab-aware contextual Inspire Me results without knowing Legs, Squad roles, and the Tactical HUD concept.

**BRAND FIDELITY:** Ember `#E67E22` focus ring + inspire chips, Midnight `#0E1012` panels, Playfair Display headings, JetBrains Mono category tags, `tactical-panel` CSS class throughout.

**FUNCTIONALITY DEPTH:** Per result: view details, see distance from leg, view street imagery, take 1-3 context-specific actions, share. Minimum 4 distinct user actions per result beyond "read content."
