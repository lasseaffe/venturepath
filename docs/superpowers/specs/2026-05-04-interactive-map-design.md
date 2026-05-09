# Interactive Route Map — Design Spec
**Date:** 2026-05-04  
**Status:** Approved for implementation

---

## Context

VenturePath has a fully-built itinerary planner but zero geographic visualization. Leg data (from/to labels, mode, distance, duration) is purely textual. The existing `TransitMap` component is a schematic vertical timeline — not a real map. No map library is installed.

The user wants an interactive map matching the style of the reference screenshot: city/stop pins on a real map, clickable to show stop details.

---

## Decision: Layout B — Split (Sidebar + Map) in OVERVIEW tab

The OVERVIEW tab currently renders a 4-column grid: `TimelinePath | TransitMap (×2) | PackingManifest`. The map replaces the middle two columns (`lg:col-span-2`) currently occupied by `TransitMap`, and the sidebar (leg list) occupies the first column, replacing `TimelinePath` on desktop.

**Result:** OVERVIEW tab becomes a 3-zone layout:
- Left (1 col): Leg list sidebar — scrollable list of all stops, click to focus
- Center (2 col): Live Leaflet map — pins + route polyline
- Right (1 col): PackingManifest (unchanged)

The existing `TransitMap` schematic stays in the ITINERARY tab where it already appears.

---

## Map Tiles

**Stadia Maps — Alidade Smooth Dark**  
Tile URL: `https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png`  
Attribution: `© Stadia Maps © OpenMapTiles © OpenStreetMap contributors`  
No API key required for development/low traffic. Dark palette matches VenturePath's `#0E1012` bg.

---

## Coordinate Data

The store legs have no lat/lng. We add a static lookup map in the new component (keyed by leg `id`) seeded with real Patagonia coordinates for the default trip. When a VentureVault path is cloned, it can supply coordinates via `leg.coords`; the component falls back to the static lookup if absent.

**Default leg coordinates (Operation Patagonia):**
| Leg id | Label | Lat | Lng |
|--------|-------|-----|-----|
| 1 | Home Base → Gateway City (SCL) | -33.4569 | -70.6483 |
| 2 | Gateway City → Trailhead Camp (PUQ) | -53.1638 | -70.9171 |
| 3 | Trailhead Camp → Summit Approach | -51.0 | -72.9 |
| 4 | Summit Approach → Base Camp Alpha | -50.94 | -73.41 |
| 5 | Base Camp Alpha → Home Base | -33.4569 | -70.6483 |

Polyline connects these points in leg order.

---

## New Component: `RouteMap`

**File:** `src/components/itinerary/RouteMap.jsx`

### Props
```js
RouteMap({ legs, selectedLegId, onSelectLeg })
```
- `legs` — array from `useTripStore` (id, from, to, mode, durationH, distanceKm, status)
- `selectedLegId` — controlled externally by OVERVIEW tab state
- `onSelectLeg(id)` — callback when user clicks a pin or sidebar item

### Internals
- `MapContainer` with `center` auto-fitted to all coordinates via `fitBounds`
- `TileLayer` (Stadia Alidade Smooth Dark)
- `Polyline` connecting all leg coords in order — color `#E67E22`, weight 2, dashArray `6 4`
- Per-leg `Marker` using a custom `DivIcon` that renders a numbered circle (styled with the existing accent colors: `#E67E22` confirmed, `#64a0ff` flight, `#64dc82` foot, `#ffc850` bus)
- `Popup` on each marker showing: stop name, mode icon, duration, distance, status badge
- When `selectedLegId` changes (from sidebar click), map calls `flyTo` on that marker's coords with zoom 10

### Mode color map
| mode | color |
|------|-------|
| flight | `#64a0ff` |
| bus | `#ffc850` |
| foot | `#64dc82` |
| boat | `#a78bfa` |
| default | `#E67E22` |

---

## Sidebar: `MapLegSidebar`

Inline subcomponent inside `RouteMap.jsx` (not a separate file — it's tightly coupled).

- Renders a scrollable list of leg items
- Each item shows: numbered circle (mode color), from→to label, mode badge, duration
- Active item (matches `selectedLegId`) gets `bg-[#E67E22]/10 border-[#E67E22]/30`
- Clicking an item calls `onSelectLeg(id)` → parent updates state → map flies to marker

---

## OVERVIEW Tab Changes (`TripPlanner.jsx`)

Add `selectedLegId` state. Replace the OVERVIEW grid:

```jsx
// Before
<div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
  <TimelinePath ... />                    {/* col 1 */}
  <div className="lg:col-span-2"><TransitMap /></div>   {/* col 2-3 */}
  <PackingManifest ... />                 {/* col 4 */}
</div>

// After
<div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
  <RouteMap                               {/* col 1-3, split internally */}
    legs={legs}
    selectedLegId={selectedLegId}
    onSelectLeg={setSelectedLegId}
    className="lg:col-span-3"
  />
  <PackingManifest ... />                 {/* col 4 */}
</div>
```

`RouteMap` renders its own internal 2-zone split (sidebar left, map right) within the 3-column space.

---

## Dependencies to Install

```
npm install react-leaflet leaflet
```

Leaflet also needs its CSS imported once in `main.jsx` (or `App.jsx`):
```js
import 'leaflet/dist/leaflet.css';
```

Fix the known Leaflet default-icon path issue with a one-time icon config call at module level in `RouteMap.jsx`.

---

## What Is NOT in Scope

- Real geocoding (no API calls to convert addresses to coords)
- Routing APIs (no real road/trail paths — polyline connects points directly)
- MustSee / LocalFlavor POI pins (discovery data has no coords)
- Mobile-specific map controls
- Map in ITINERARY or DISCOVERY tabs

---

## Verification

1. `npm run dev` — app loads, OVERVIEW tab shows map in center columns
2. All 5 default Patagonia pins visible on dark Stadia tiles
3. Orange dashed polyline connects them in order
4. Clicking any pin opens a popup with leg details
5. Clicking a sidebar leg item flies the map to that pin and highlights the sidebar item
6. PackingManifest still renders in right column, unchanged
7. ITINERARY tab still shows the text-based `TransitMap` — unaffected
