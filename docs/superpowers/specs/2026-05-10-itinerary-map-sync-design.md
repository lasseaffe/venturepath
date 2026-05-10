# Design: Interactive Map Sync with Spatial Itinerary Grid

**Date:** 2026-05-10  
**Status:** Approved  

---

## Summary

Add an interactive Leaflet map below the KanbanBoard on the ITINERARY tab. Clicking a stop card flies the map to that stop's pin and opens its popup. Clicking a map pin highlights the matching card and scrolls it into view.

---

## Architecture

All coordination state lives in `KanbanBoard`. A new `ItineraryMap` component is rendered immediately below the board grid, receiving props from KanbanBoard. No new context or store is added.

```
KanbanBoard
  ├── days state (existing)
  ├── activeStopId state (new)
  ├── coords ref (new — Map<blockId, [lat, lng]>)
  ├── <KanbanGrid …> (existing)
  └── <ItineraryMap
          days={days}
          coords={coords}
          activeStopId={activeStopId}
          onPinClick={setActiveStopId}
      />
```

---

## Components

### KanbanBoard changes

1. **`activeStopId` state** (`useState<string|null>(null)`)  
   Set when user clicks a block card; cleared when same card clicked again or when map background is clicked.

2. **`coords` ref** (`useRef<Map<blockId, [lat,lng]>>`)  
   Populated by a geocoding `useEffect` that watches `days`. For each block not yet in the ref, call `geocodeLocation(block.title)`. Results are stored in the ref; a `coordsVersion` counter (separate `useState`) triggers a re-render only when new results arrive.

3. **Card click handler** — clicking a card calls `setActiveStopId(block.id)` (toggle off if same id). The card receives `isActive={activeStopId === block.id}` and renders a glowing border when active.

4. **Scroll-to-card effect** — `useEffect([activeStopId])` queries `document.querySelector('[data-block-id="${activeStopId}"]')` and calls `.scrollIntoView({ behavior: 'smooth', block: 'nearest' })`.

### ItineraryMap (new file)

**Path:** `src/components/itinerary/ItineraryMap.jsx`

- Uses `MapContainer`, `TileLayer`, `Marker`, `Popup` from `react-leaflet` (already installed).
- Pin icon: same `makePin(num, color, isActive)` style as RouteMap — numbered, diamond-shaped, colored by category.
- Pin numbering: sequential across all days (block 1, 2, 3 … across days), matching their visual order in the board.
- `MapFlyTo` sub-component: calls `map.flyTo(coords, 14, { duration: 1.0 })` + opens that marker's popup via a `markerRefs` Map when `activeStopId` changes.
- Clicking a pin: calls `onPinClick(blockId)`.
- Clicking map background: calls `onPinClick(null)` to clear selection.
- Map height: `380px`, full-width, `border-radius: 8px`, matching board's dark tile layer (`CartoDB.DarkMatter`).
- Blocks without resolved coordinates are skipped silently (no pin rendered).

---

## Data Flow

```
Card click
  → setActiveStopId(id)
  → ItineraryMap receives new activeStopId
  → MapFlyTo fires → map.flyTo + popup opens
  → KanbanBoard useEffect fires → card scrollIntoView

Pin click
  → onPinClick(id) → setActiveStopId(id)
  → card gets isActive class → glowing border CSS
  → KanbanBoard useEffect fires → card scrollIntoView
```

---

## Geocoding Strategy

- `geocodeEngine.geocodeLocation(title)` already exists (Nominatim).
- Geocode fires once per block, results cached in `coordsRef`.
- Failed geocodes (null result) are marked with a sentinel (`false`) so they are not retried on re-render.
- Rate-limit: requests are fired with a 300 ms stagger between them to respect Nominatim's 1 req/s policy.

---

## Styling

- Active card: `box-shadow: 0 0 0 2px var(--accent), 0 0 12px rgba(var(--accent-rgb), 0.4)` added via inline style when `isActive`.
- Active pin: `border: 2px solid #fff` + stronger `box-shadow` (mirrors existing `makePin` `isActive` param).
- Map tile: `CartoDB.DarkMatter` — consistent with app's dark aesthetic.
- Map container background: `var(--surface)` while tiles load.

---

## Error Handling

- Geocoding failures: block skipped on map, card works normally.
- No coordinates at all: map renders empty with a centered message "Resolving locations…".
- `react-leaflet` not mounted server-side: not applicable (Vite SPA).

---

## Out of Scope

- Editing block coordinates manually (future).
- Polyline route between stops (RouteMap already handles legs).
- Persisting geocode cache across sessions.
