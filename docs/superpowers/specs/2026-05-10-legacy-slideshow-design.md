# Legacy Slideshow — Design Spec
**Date:** 2026-05-10
**Status:** Approved
**Subsystem:** B of 4 (GlobalIntelligence → Legacy Slideshow → Savable Layers → TrendObserver)

---

## 1. Purpose

Replace the existing minimal `JourneySlideshow.jsx` (basic photo carousel) with a full split-screen "Legacy HUD" that turns an expedition's photo record into a navigable visual report. Breadcrumb gaps are auto-filled with landmark slides, WikiData fact sheets are inserted every 5 photos, and a rotating mini-map tracks the current position.

---

## 2. Architecture

```
LegacySlideshow.jsx              (replaces JourneySlideshow.jsx)
    ├── useSlideDeck.js           NEW hook — builds slide sequence + navigation state
    │     ├── buildSlideDeck()    pure fn: photos + breadcrumbs + legs → Slide[]
    │     └── deriveBearing()     per-photo bearing from EXIF → breadcrumbs → 0
    ├── SlideRenderer.jsx         NEW — renders one slide by type
    │     ├── PhotoSlide          image + StatOverlay
    │     ├── FactSlide           WikiData enrichment panel (lazy via enrichmentCache)
    │     ├── StatSlide           terminal-style leg summary
    │     └── BreadcrumbSlide     gap-fill landmark list
    ├── SlideshowMiniMap.jsx      NEW — rotating Leaflet mini-map, right panel
    └── SlideshowControls.jsx     NEW — prev/next/play/pause + keyboard shortcuts
```

**Modified:** `src/components/journey/JourneyTab.jsx` — swap `<JourneySlideshow>` for `<LegacySlideshow>`

---

## 3. New Files

### `src/utils/slideDeck.js`

Pure function — no side effects, fully testable.

**Slide types:**
```js
{ type: 'photo',       photo, bearing }
{ type: 'fact',        poi_id, poi_name, coords, legIndex }
{ type: 'stat',        leg_label, distance_km, ascent_m, photo_count }
{ type: 'breadcrumb',  landmarks, gap_minutes, from_time, to_time }
```

**Build algorithm:**
1. Sort photos by `timestamp` ascending
2. For each consecutive photo pair: if gap > 120 min → insert `breadcrumb` slide with up to 3 landmark names from breadcrumbs in that window
3. Every 5th photo slide → insert `fact` slide using the closest breadcrumb point's coords + nearest POI name
4. When photo coords jump to a new leg (haversine > 20km from previous leg centroid) → insert `stat` slide

**Exported API:**
```js
buildSlideDeck(photos, breadcrumbs, legs) → Slide[]
```

---

### `src/utils/bearingEngine.js`

**Priority:**
1. `photo.bearing` — EXIF bearing stored at upload time
2. Bracketing breadcrumb points by timestamp → `computeBearing(from, to)`
3. Default `0` (north-up)

**Exported API:**
```js
computeBearing(from, to) → number          // { lat, lng } → degrees 0-360
deriveBearing(photo, breadcrumbs) → number  // full priority chain
```

Binary search on breadcrumbs array by timestamp for O(log n) lookup.

---

### `src/components/journey/legacy/LegacySlideshow.jsx`

Top-level split-screen shell. Reads from `useTripStore` directly — no props needed.

**Layout:**
```
┌─────────────────────────┬──────────────────┐
│   SlideRenderer (~60%)  │ SlideshowMiniMap  │
│                         │     (~40%)        │
├─────────────────────────┴──────────────────┤
│            SlideshowControls               │
└────────────────────────────────────────────┘
```

Consumes `useSlideDeck` hook which returns:
```js
{ slides, currentIndex, currentSlide, goNext, goPrev, goTo, playing, setPlaying }
```

Empty state: if `photos.length === 0` → show branded empty state with Ember CTA "Add photos in STUDIO".

---

### `src/components/journey/legacy/useSlideDeck.js`

React hook wrapping `buildSlideDeck` + `deriveBearing`. Manages playback state.

```js
useSlideDeck() → {
  slides: Slide[],
  currentIndex: number,
  currentSlide: Slide,
  goNext: () => void,
  goPrev: () => void,
  goTo: (index: number) => void,
  playing: boolean,
  setPlaying: (bool) => void,
}
```

- Reads `journeyData.photos`, `journeyData.breadcrumbs`, `legs` from `useTripStore`
- Auto-advances every 4000ms when `playing === true`
- Emits `PHOTO_ACTIVE` on `sentinelBus` when a photo slide becomes active (preserves existing bus integration)

---

### `src/components/journey/legacy/SlideRenderer.jsx`

Renders one slide by type. Pure display component — receives `slide` prop.

**PhotoSlide:** Full-width `<img>` + `<StatOverlay photo={slide.photo} />`

**FactSlide:**
- Calls `enrichmentCache.get(slide.poi_id)` on render
- Loading state: skeleton pulse in Midnight/Sandstone
- Loaded: thumbnail left, description center, `instance_of` badge top-right
- Uses Playfair Display for the POI name, JetBrains Mono for the type badge

**StatSlide:** JetBrains Mono terminal aesthetic
```
── LEG COMPLETE ──────────────────
DISTANCE   12.4 km
ASCENT     840 m
PHOTOS     7
LEG        Trailhead → Summit
──────────────────────────────────
```
Ember `#E67E22` for labels, white for values.

**BreadcrumbSlide:** Midnight background
```
── YOU PASSED THROUGH HERE ───────
  ▸ Mirador Las Torres
  ▸ Valle del Francés lookout
  ▸ Grey Glacier viewpoint
  GAP: 2h 34m undocumented
──────────────────────────────────
```

---

### `src/components/journey/legacy/SlideshowMiniMap.jsx`

Small Leaflet map, right panel. On slide change:
- `map.flyTo(coords, zoom, { duration: 0.5 })` — smooth pan
- Pulsing Ember `#E67E22` circle marker at current position
- Map container: `transform: rotate(${bearing}deg)` CSS rotation
- Marker counter-rotates: `transform: rotate(${-bearing}deg)` to stay upright
- Non-photo slides: no rotation (bearing = 0), marker at slide coords

---

### `src/components/journey/legacy/SlideshowControls.jsx`

Bottom bar. Layout:
```
[‹ PREV]  [▶ PLAY / ‖ PAUSE]  [NEXT ›]    3 / 12  PHOTO
```

- Play: auto-advance every 4s
- Slide type label in JetBrains Mono uppercase (PHOTO / FACT / STAT / BREADCRUMB)
- Keyboard: `←` prev, `→` next, `Space` play/pause (event listener on mount, cleaned up on unmount)

---

## 4. Modified Files

### `src/components/journey/JourneyTab.jsx`

Replace:
```jsx
import JourneySlideshow from './JourneySlideshow';
// ...
<JourneySlideshow photos={photos} />
```

With:
```jsx
import LegacySlideshow from './legacy/LegacySlideshow';
// ...
<LegacySlideshow />
```

Remove the `photos` destructure from `journeyData` in this file (LegacySlideshow reads the store directly).

---

## 5. Data Flow

```
useTripStore
  journeyData.photos      → sorted by timestamp
  journeyData.breadcrumbs → used for gap-fill + bearing
  legs                    → used for stat slide boundaries

buildSlideDeck(photos, breadcrumbs, legs)
  → Slide[] (photo + fact + stat + breadcrumb interleaved)

useSlideDeck
  → currentSlide

SlideRenderer
  type=photo      → <img> + StatOverlay
  type=fact       → enrichmentCache.get(poi_id) → WikiData panel
  type=stat       → terminal summary
  type=breadcrumb → landmark list

SlideshowMiniMap
  → map.flyTo(currentSlide.coords)
  → rotate(bearing)

SlideshowControls
  → keyboard + buttons → goNext/goPrev/setPlaying
```

---

## 6. Bearing Derivation (Option C)

```
photo.bearing exists?
  → use it (EXIF stored at upload)

else: find bracketing breadcrumb points by timestamp
  breadcrumbs[i].timestamp <= photo.timestamp <= breadcrumbs[i+1].timestamp
  → computeBearing(breadcrumbs[i], breadcrumbs[i+1])

else: return 0 (north-up, mini-map unrotated)
```

---

## 7. Out of Scope (this spec)

- Extracting EXIF bearing at upload time (PhotoUploader.jsx change) — bearing gracefully defaults to 0
- Savable Category Layers / Radar HUD (Spec C)
- TrendObserver (Spec D)
- Video slide support (photos only)
