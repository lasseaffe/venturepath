# Design: Map, Packing & Animation Bug Fixes

**Date:** 2026-05-11  
**Branch:** feat/packing-hud-redesign  
**Scope:** 4 targeted bug fixes — no new features, no refactoring beyond what serves each fix

---

## Bug 1 — Maps Overlapping Content Below

### Problem
Leaflet injects `position: absolute` tile panes with `z-index: 400+`. The outermost
wrapper of `ItineraryMap` (`position: relative; isolation: isolate`) has no
`overflow: hidden`, so Leaflet internals bleed through DOM siblings below.

### Fix
**File:** `src/components/itinerary/ItineraryMap.jsx`

Add `overflow: 'hidden'` to the outermost `<div>` (line 72, the `marginTop: 16px` wrapper).
No height or layout changes needed — the inner 380px container already clips correctly;
the outer wrapper just needs to prevent z-index bleed.

### Acceptance
- Content below the stop map is fully visible and not obscured.
- Map still interactable (pan, zoom, pin clicks).

---

## Bug 2 — Stop Map Default Zoom: World → City Level

### Problem
`ItineraryMap` initialises with `center={[20, 0]} zoom={2}` (world view).
`MapController` only flies to the *active* stop — it never auto-fits all resolved stops on mount.

### Fix
**File:** `src/components/itinerary/ItineraryMap.jsx`

Enhance `MapController` with a one-time mount effect:
- Collect all resolved `coords` into a Leaflet `LatLngBounds`
- Call `map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 })` on mount
- If no coords are resolved yet, keep world-view fallback (unchanged)
- The existing `flyTo` on `activeStopId` change remains as-is

`maxZoom: 13` ensures the map never goes closer than city-block level
even for a single stop.

### Acceptance
- Opening the ITINERARY tab with stops shows a city/region view, not the whole world.
- Single stop → city-level zoom (~13).
- Multiple stops spread across a country → zooms to fit all of them.
- User can still zoom out freely.

---

## Bug 3 — Bag Card: Wrong Destination + Too Large

### Problem
`BagHud` hardcodes `height: 480`. Neither `BagHud` nor `PackingHudScreen` reads from
`useTripStore`, so no destination label appears anywhere on the card.

### Fix
**File:** `src/components/logistics/PackingHudScreen.jsx`  
**File:** `src/components/logistics/BagHud.jsx`

1. In `PackingHudScreen`, pull `trip.destination` from `useTripStore()` and pass it
   as a `destination` prop to `BagHud`.
2. In `BagHud`, display destination as a small `font-mono text-[8px] text-slate-500`
   label in the top bar row (alongside the SKIN selector and REMOVE BAG button).
3. Reduce `BagHud` outer container height from `480` to `340`. The SVG viewBox
   already scales — this simply makes the card a compact panel rather than a
   full-screen element.

### Acceptance
- Trip destination (e.g. "Torres del Paine, Chile") visible on the bag card.
- Card height is visually compact (~340px), consistent with surrounding panels.
- Skin selector, view mode tabs, and 2D/3D illustration still render correctly.

---

## Bug 4 — Missing Animations (Recurring Caching Regression)

### 4a — Backpack Animation Layer Dropped

**Root cause:** `BagAnim_backpack.jsx` exports an animation overlay with the correct
interface `{hoveredZone, highlightedZone, accentColor, activeSkin}`, but it was never
imported in `Bag2D.jsx`. All other bag types wire their animation modules via
`BAG_ANIM_LAYER`; the backpack's `AnimatedBackpack` function is entirely inline and
never loads the external file.

**Fix**  
**File:** `src/components/logistics/bag/Bag2D.jsx`

Add at top of imports:
```js
import BagAnim_backpack from './BagAnim_backpack';
```

Inside `AnimatedBackpack`'s SVG return, after the body geometry and before the zone
hit-areas, render:
```jsx
<BagAnim_backpack
  hoveredZone={hoveredZone}
  highlightedZone={null}
  accentColor={p.accent}
  activeSkin={activeSkin}
/>
```

### 4b — Card Hero Images Not Persisting (KanbanBoard + ProPathCard)

**Root cause:** `useDestinationImage` fires a fresh `/api/destination-images` fetch on
every mount with no client-side caching. When the API returns empty (rate-limit,
Supabase miss, or scraper failure), images disappear silently. `ProPathCard` relies on
`path.cover_image_url` from seed data, which is currently null for all seed entries.

**Fix — `useDestinationImage` hook**  
**File:** `src/hooks/useDestinationImage.js`

Add `sessionStorage` caching keyed by `queryKey = "${type}:${query}"`:
- On fetch success, write `sessionStorage.setItem(key, JSON.stringify(images))`
- On mount, check `sessionStorage.getItem(key)` before fetching; use cached value
  and skip the network call if present
- Cache survives tab-internal navigation (component unmount/remount) but clears
  on full page reload, ensuring freshness is reasonable

**Fix — `ProPathCard` hero fallback**  
**File:** `src/components/discovery/ProPathCard.jsx`

`ProPathCard` already has a climate-gradient fallback for when `cover_image_url` is
null — this is working correctly. No code change needed here. The seed data needs
`cover_image_url` populated, but that is a data concern outside this spec's scope.
The card heroes issue for ProPathCard is therefore the gradient fallback displaying
instead of a photo — acceptable until seed data is enriched.

**Note:** The KanbanBoard day-column heroes and ExpeditionSelectScreen heroes use
`useDestinationImage` and will benefit from the sessionStorage cache fix.

### Acceptance
- Hovering zones on a backpack bag shows zone-specific animation (lid opens, pocket
  illuminates, etc.) — same behaviour as duffel/suitcase/etc.
- Navigating between ITINERARY and LOGISTICS tabs does not re-fetch destination images;
  KanbanBoard day headers stay populated.
- ProPathCard shows climate gradient when no `cover_image_url` is present (documented
  expected behaviour, not a bug in the component).

---

## Files Changed Summary

| File | Change |
|---|---|
| `src/components/itinerary/ItineraryMap.jsx` | overflow:hidden on outer wrapper + fitBounds on mount |
| `src/components/logistics/PackingHudScreen.jsx` | read destination from useTripStore, pass to BagHud |
| `src/components/logistics/BagHud.jsx` | accept + display destination prop; reduce height 480→340 |
| `src/components/logistics/bag/Bag2D.jsx` | import + render BagAnim_backpack in AnimatedBackpack |
| `src/hooks/useDestinationImage.js` | sessionStorage cache to prevent re-fetch on remount |

---

## Apple Compliance Check

**UNIQUENESS:** Fixes are internal to VenturePath-specific components (Packing HUD,
Expedition vocabulary, squad gear system) — no generic patterns introduced.  
**BRAND FIDELITY:** Midnight/Ember/JetBrains Mono tokens preserved throughout.  
**FUNCTIONALITY DEPTH:** Bug fixes restore interactivity that was regressing; no
functionality removed.
