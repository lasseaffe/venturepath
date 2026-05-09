# Nearby Search — Design Spec
Date: 2026-05-10

## Overview

Add a "Find nearby" feature to VenturePath with two entry points:
1. Inside the StopEditor panel ("Add a stop" / "Edit stop") — expands inline below the FROM field
2. On map pin popups — opens a floating overlay card on the map

Uses OpenTripMap (OTM) for place search. Foursquare logic is preserved in `foursquareEngine.js` for future re-enable. Includes AI-powered "Inspire me" that suggests a category+query based on city and context.

---

## Architecture

### New files

```
src/
  hooks/
    useNearbySearch.js              ← shared logic: OTM geocode + POI fetch + AI inspire
  components/nearby/
    NearbyDrawer.jsx                ← inline expansion inside StopEditor
    NearbyMapOverlay.jsx            ← floating card triggered from map pin popup
    NearbyResultCard.jsx            ← shared result card (used by both)
  utils/
    otmEngine.js                    ← OTM API wrapper (geocode + radius search)
```

### Modified files

- `src/components/trip/StopEditor.jsx` — add "Find nearby" button + render `NearbyDrawer`
- `src/components/itinerary/RouteMap.jsx` — fix map layout overflow; add compass button to Popup; render `NearbyMapOverlay`

---

## Data Flow

### OTM search (primary)

```
anchor (city/place name string)
  → otmGeocode(anchor)             → { lat, lon }
  → otmRadius(lat, lon, kinds, 12) → raw OTM places[]
  → mapOtmPlace()                  → normalised Place objects
  → client-side sort               → display
```

### Category chips → OTM kinds mapping

| Chip label  | OTM kinds string                          |
|-------------|-------------------------------------------|
| All         | `cultural,historic,foods,natural,sport`   |
| Cafés       | `cafe,foods`                              |
| Restaurants | `restaurants,foods`                       |
| Bars        | `bar`                                     |
| Attractions | `cultural,museums,theatres_and_entertainments` |
| Nature      | `natural,parks`                           |
| Historic    | `historic,architecture,religion`          |

### Sort (client-side)

Applied after fetch. Fields on the normalised Place object:
- `rating` — OTM `rate` field (0–3 integer), mapped to display stars
- `price` — not natively available in OTM; omitted from sort if absent, UI shows `—`

Sort options: Rating ↓ (default), Name A–Z.
Note: price sort is designed for future Foursquare re-enable (Foursquare returns `price` 1–4).

### AI "Inspire me"

```
User clicks "Inspire me ✨"
  → call Anthropic API (claude-haiku-4-5) with prompt:
    "You are a local travel expert. The user is in {anchor}.
     Suggest one OTM kinds string (comma-separated, from this list: cultural, historic,
     foods, restaurants, cafe, bar, natural, parks, museums,
     theatres_and_entertainments, sport, architecture) and a short
     display label (max 3 words). Reply in JSON: { kinds, label }"
  → parse { kinds, label }
  → run otmRadius(lat, lon, kinds, 12)
  → display results with label shown as active chip
```

The AI call is short and non-streaming. Uses `VITE_ANTHROPIC_API_KEY` from `.env`.
If AI call fails, fall back to a random entry from the OTM_KIND_MAP table.

---

## Components

### `otmEngine.js`

```js
// OTM_BASE = 'https://api.opentripmap.com/0.1/en'
// OTM_KEY  = import.meta.env.VITE_OTM_API_KEY

export async function otmGeocode(cityName)       // → { lat, lon } | null
export async function otmRadius(lat, lon, kinds, limit)  // → Place[]
export function mapOtmPlace(raw)                 // → normalised Place { id, name, type, rating, address, coords, kinds }

// Foursquare swap path (commented out, preserved):
// export async function fsqSearchByCategory(categoryId, near, limit)
// export async function fsqSearchPlaces(query, near, limit)
```

### `useNearbySearch.js`

```js
// Props: anchor (string) — default city/place name
// Returns:
{
  anchor, setAnchor,       // editable anchor location
  category, setCategory,  // active OTM kinds string
  sortBy, setSortBy,       // 'rating' | 'name'
  results,                 // Place[] after sort
  loading, error,
  inspire,                 // async fn — triggers AI → fetch
  search,                  // async fn(kinds?) — manual trigger
}
```

State reset: when `anchor` changes, results clear and a new search fires automatically.

### `NearbyResultCard.jsx`

Props: `{ place, onSelect }` where `onSelect` is optional (present in Drawer, absent in MapOverlay).

Displays: name, type tag, OTM rating stars (0–3 mapped to ★ symbols), address snippet, coords badge.

Clicking in Drawer context: fills `to` field in StopEditor and collapses drawer.
Clicking in MapOverlay context: drops a temporary highlight marker at `place.coords` on the map.

### `NearbyDrawer.jsx`

Rendered inside StopEditor below the FROM field group.

- Trigger: "Find nearby" button — full-width, dashed orange border (`border: '1px dashed var(--accent)'`)
- Toggle: click again to collapse (AnimatePresence slide-down, same spring as existing motion patterns)
- Anchor row: `📍 {anchor}` display + "change" chip → inline editable input
- Category chips: horizontal scroll row, pill style matching travel mode buttons
- Sort row: right-aligned toggle buttons `Rating ↓` / `Name A–Z`
- "Inspire me ✨" button: full-width orange, triggers AI flow
- Results: scrollable list of `NearbyResultCard`, max-height 240px with overflow-y-auto

### `NearbyMapOverlay.jsx`

Triggered from Leaflet Popup via compass icon 🧭.

- Positioned: `position: absolute`, top-right corner of the map container, `w-72`, z-50
- Close button: top-right ✕
- Same filter/sort/inspire UI as Drawer
- Results: clicking drops a temporary `L.circleMarker` (orange, 8px radius) at `place.coords`; marker auto-removes after 8 seconds or on overlay close
- Anchor defaults to the leg's `from` location name (passed as prop from RouteMap)

---

## Map Layout Fix

**Problem:** `StopEditor` is `fixed top-0 right-0 w-80` — it overlays the map.

**Fix:** Pass `editorOpen` boolean from `RouteMap` down. The map's inner flex container (`flex-1 relative`) gets:

```jsx
style={{ marginRight: editorOpen ? 320 : 0, transition: 'margin 0.3s ease' }}
```

This reflows the map tile area to stay within visible bounds when the editor is open.

Additionally add `overflow: hidden` to the RouteMap outer container to prevent any child from escaping its bounds.

---

## Compass Button in Popup

In the existing Leaflet `<Popup>` JSX in `RouteMap.jsx`, add below the status badge:

```jsx
<button
  onClick={() => { openNearbyOverlay(l); }}
  style={{ marginTop: 8, background: 'transparent', border: '1px solid #E67E22',
           color: '#E67E22', borderRadius: 4, padding: '2px 8px', fontSize: 11,
           cursor: 'pointer', fontFamily: 'monospace' }}
>
  🧭 Find nearby
</button>
```

`openNearbyOverlay(leg)` sets `nearbyAnchorLeg` state in RouteMap, which renders `NearbyMapOverlay`.

---

## Environment Variables

| Variable               | Purpose                        |
|------------------------|--------------------------------|
| `VITE_OTM_API_KEY`     | OpenTripMap (already in .env)  |
| `VITE_ANTHROPIC_API_KEY` | AI inspire call              |

---

## Foursquare Re-enable Path

When Foursquare billing is resolved:
1. In `otmEngine.js`, uncomment the FSQ functions
2. In `useNearbySearch.js`, swap `otmRadius` call for `fsqSearchByCategory`
3. Re-enable `price` sort (Foursquare returns `price` 1–4)
4. No UI changes required

---

## Out of Scope

- Persisting nearby results to trip store
- Saving a nearby place directly as a new leg (user fills TO field manually from result)
- Pagination of OTM results (capped at 12)
- Offline/caching of OTM responses
