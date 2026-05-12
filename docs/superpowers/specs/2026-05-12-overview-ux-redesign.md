# VenturePath — OVERVIEW UX Redesign
**Date:** 2026-05-12
**Scope:** OVERVIEW tab layout, elevation profile, safety pulse, tactical mode, transport planner, cross-tool data flow

---

## 1. OVERVIEW Tab Layout

**Decision:** Option A — Map + Path side-by-side, elevation below, safety as ticker row.

### Map panel
- Width: ~70% of the content area (`lg:w-[70%]`)
- Height: shorter than current — no more full-viewport map
- Map controls (zoom, add stop, scout pins) remain inside the map

### Path timeline panel
- Width: remaining ~30%, same height as the map
- Sits to the **right** of the map, not below it
- `TimelinePath` component moved into a flex sibling of `RouteMap`
- Scrollable vertically if milestones overflow

### Elevation strip
- Full-width below the map+path row
- See §2 for visual treatment

### Safety pulse
- Collapses to a **single-row ticker** below the elevation strip
- No map, no tall incident list visible by default
- Shows: severity dot + top alert text + "Safety Pulse →" link that expands to full panel
- See §3 for full spec

### Layout structure (TripPlanner OVERVIEW tab)
```
┌─────────────────────────────────────────────┐
│  [RouteMap 70%]          │ [TimelinePath 30%]│
│                          │                   │
├──────────────────────────┴───────────────────┤
│  [ElevationStrip — full width]               │
├──────────────────────────────────────────────┤
│  [SafetyTicker — single row]                 │
└──────────────────────────────────────────────┘
```

---

## 2. Elevation Profile — Visual Treatment

**Decision:** Option C — mountain silhouette backdrop + transport-mode color bands combined.

### Implementation
- SVG-based, same `ElevationStrip` component
- **Layer 1 (bottom):** sky gradient (`#0d1b2a` → `#0E1012`)
- **Layer 2:** mountain ridge silhouettes — 2 layers, distant (`#1a2535`) and near (`#1a1f26`), generated as SVG paths with pseudo-random but deterministic control points derived from destination ID
- **Layer 3:** subtle transport-mode tint bands (flight `#E67E22` 6% opacity, foot `#64dc82` 4%, train/bus `#64a0ff` 5%) — rects spanning the X range of each leg segment
- **Layer 4 (top):** elevation curve line (`#E67E22`, 1.5px stroke) + fill gradient beneath it
- Hover: vertical dashed rule + elevation label at cursor X
- Footer: distance labels at start/mid/end, left-aligned destination names

### Silhouette generation
- Use destination ID to seed a simple deterministic RNG (sum of char codes)
- Generate 6–8 peak X positions and heights within the SVG viewbox
- Smooth with cubic bezier curves — same output every render for the same destination

---

## 3. Safety Pulse — Compact Ticker

**Decision:** Collapse from a tall map+feed panel to a single dismissible row.

### Ticker row (default state)
```
● ACTIVE ALERT   Weather 05:52 — High winds forecast, gusts up to 80kph   [Trail ✓] [Medical ✓]   Safety Pulse →
```
- Height: ~32px
- Left: severity dot (red/amber/green) + highest-severity alert summary
- Middle: green-check summary pills for clear categories
- Right: "Safety Pulse →" opens full panel as a slide-over or modal
- Refreshes every 30s (same as current)
- Background: `var(--surface-raised)`, border-bottom only

### Full panel (expanded, slide-over)
- Existing `SafetyPulse` component content (mini-map + incident feed) rendered in a right-side drawer
- Triggered by clicking "Safety Pulse →" in the ticker
- Closeable with ESC or clicking outside

---

## 4. Tactical Mode — Visual Redesign

**Decision:** Option C — signal bars + amber coordinate strip.

### Structure (top to bottom)
1. **Header row**: Signal-bar icon (4 bars, amber, sized by GPS lock quality) + "GPS LOCKED" label + clock (`6:04:40 AM`) + freshness chip (`14m ago`)
2. **Coordinate strip**: full-width amber (`#F2A900`) background, near-black text — coordinates + heading + altitude in one high-contrast bar. Impossible to miss.
3. **Current objective**: left-border accent (`2px solid #2a2a2a`), muted when no active leg
4. **Squad comms**: cached messages as pipe-prefixed lines (`│ Scout: …`)
5. **SOS beacon**: full-width red CTA, always at bottom

### GPS signal bars
- 4 vertical bars, heights increasing left-to-right
- Filled bars = signal strength (0–4 based on GPS status from store)
- All amber when LOCKED, grey when searching

### Coordinate strip
- `background: #F2A900`, `color: #0A0A0A`, `font-weight: bold`
- Format: `−50.9423° S, 73.4068° W  ↗ 042°  ▲ 1,240m`
- Full width, no border, `border-radius: 3px`

### No change to: SOS text generation logic, exit mechanism, offline-first data sourcing

---

## 5. Transport Planner — Full Redesign

**Decision:** Destination-first, location-aware origin, radio-select rows, compact single-row filters.

### Input order
1. **TO — DESTINATION** (top): free-text with autocomplete. Dropdown closes `onBlur` (click outside).
2. **FROM — ORIGIN** (below TO): auto-populated from GPS as nearest hub for the active mode (airport for flight, station for train, etc.). Shows `● USING YOUR LOCATION` + `↻ nearest` badge. One tap to override.

### Autocomplete behaviour
- `onBlur` with 150ms delay (allows click-on-suggestion to register before close)
- Dropdown max-height: 160px, scrollable
- Keyboard navigable (arrow keys + enter)

### Filter row (single line, never wraps)
```
[Leave ▾] [Arrive ▾] [Price ▾] [Cheapest ▾]  |  [Direct] [Eco] [Flexible] [Cabin bag]
```
- Left group: 4 dropdown pills — Leave By, Arrive By, Max Price, Sort By
- Vertical divider (`1px`, `#2a2f36`)
- Right group: boolean toggle pills — active = Ember fill, inactive = muted
- `overflow-x: auto`, `flex-shrink: 0` on all pills — single row always
- Mode-specific pill sets:
  - Flight: Direct, Eco, Flexible, Cabin bag
  - Train: Rail pass, 1st class, Bike space
  - Bus: Express only, Eco coach
  - Ferry: Cabin class, Vehicle, Pet friendly
  - Drive: Toll-free, EV only, Scenic route

### Result rows
- Radio-select: click row → radio dot fills amber, row gets amber border + 8% amber bg
- Selected row expands inline to show: departs, arrives, flexibility, baggage, CO₂ delta vs cheapest
- `→ ADD TO PLAN` button appears only in expanded state (bottom-right of expanded section)
- One row expanded at a time (selecting another collapses previous)
- `→ ADD TO PLAN` fires `useTripStore.addLeg()` — see §6

---

## 6. Cross-Tool Data Flow — Core Architecture

**This is a core product feature. Every tool must wire its commit action to `useTripStore`.**

### Store mutations to add/confirm
| Action | Mutation | Store field written |
|--------|----------|-------------------|
| Transport "Add to Plan" | `addLeg(leg)` | `legs[]` |
| Stay "Book / Save" | `addStay(stay)` | `stays[]` |
| Discovery POI "Save" | `addPoi(poi)` | `pois[]` |
| Safety alert acknowledged | `addAlert(alert)` | `alerts[]` |
| Budget item added | `addBudgetItem(item)` | `budget{}` |

### Leg shape (addLeg payload)
```js
{
  id: uuid,
  from: { label, coords },
  to: { label, coords },
  mode: 'flight' | 'train' | 'bus' | 'ferry' | 'drive' | 'foot',
  departs: ISO8601,
  arrives: ISO8601,
  price: number,
  currency: string,
  co2kg: number,
  carrier: string,
  status: 'confirmed' | 'pending',
}
```

### Automatic consumer reactions (no wiring needed — Zustand subscriptions)
- `RouteMap` — redraws polyline/arc for new leg
- `ElevationStrip` — fetches elevation for new leg coords, re-renders profile
- `TimelinePath` — appends departs/arrives as milestones
- `PackingManifest` — re-runs climate/day calculation
- `BudgetLoom` — adds price as line item

### User feedback on add
- Toast: `✓ [Carrier] [FROM]→[TO] added to plan · View on map →`
- Duration: 3s, clickable (clicking navigates to OVERVIEW tab + pans map to leg)
- Implemented as a lightweight toast store, not a full notification system

### Tools not yet wired (to do in follow-up)
- `VehicleSearch` → `addLeg()` with mode `drive`
- `AccommodationSearch` → `addStay()`
- `MustSee` / `BasecampScout` → `addPoi()`
- `BudgetLoom` manual entries → `addBudgetItem()`

---

## 7. Files to Create / Modify

| File | Change |
|------|--------|
| `src/pages/TripPlanner.jsx` | OVERVIEW tab layout — flex row for map+path, elevation below, safety ticker below that |
| `src/components/itinerary/RouteMap.jsx` | Remove full-width forced style, accept `className`/`style` prop for width |
| `src/components/itinerary/ElevationStrip.jsx` | Add silhouette layers + mode-band tinting to SVG |
| `src/components/itinerary/TimelinePath.jsx` | No layout change — just placed in right column |
| `src/components/logistics/SafetyPulse.jsx` | Extract full panel; add `SafetyTicker` compact row component |
| `src/components/ui/TacticalMode.jsx` | Full visual restructure per §4 |
| `src/components/logistics/PublicTransport.jsx` | Restructure: TO-first, GPS origin, filter row, radio-select rows |
| `src/store/useTripStore.js` | Add `addStay`, `addPoi`, `addAlert`, `addBudgetItem` mutations if missing; confirm `addLeg` shape |
| `src/components/ui/Toast.jsx` | New — lightweight toast component + `useToastStore` |

---

## Out of Scope
- AR Ghost Tours — not touched in this redesign
- LedgerWorkbench — not touched
- VentureVault — not touched
- Auth, routing, API layer — no changes
