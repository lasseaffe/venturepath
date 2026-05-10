# Journey Photo Tour — Design Spec
**Date:** 2026-05-10  
**Project:** VenturePath  
**Status:** Approved for implementation

---

## Overview

A first-class **Journey** tab in TripPlanner that lets users attach photos to trip stops, write short captions, and play back a cinematic map-driven photo tour of their trip. Tours can be published publicly via a shareable link.

The feature has two equal-weight experiences:
- **Studio** — authoring: attach photos, write captions, set cover, publish
- **Tour** — playback: hybrid auto-play slideshow with animated map + photo panel

---

## Data Model

### Photo object (stored per leg/stop)

```js
{
  id: string,           // nanoid or Date.now() string
  url: string,          // base64 data URI (upload) or external URL (link)
  caption: string,      // short caption, max ~140 chars
  source: 'upload' | 'link',
  order: number         // display order within this stop
}
```

Added to each leg as `leg.photos: Photo[]` (default `[]`).

### Journey metadata (stored per trip)

```js
journey: {
  published: boolean,
  shareSlug: string,    // e.g. "patagonia-2025-lasse", user-editable before publish
  coverStopId: number,  // leg id whose first photo is the tour cover
  title: string,        // tour display title (defaults to trip name)
  createdAt: string     // ISO timestamp
}
```

Added to each trip as `trip.journey` (default `null`).

### Store changes

- `useTripStore` bumps `STORE_VERSION` to `3`
- New action types:
  - `ADD_PHOTO` — `{ legId, photo }`
  - `REMOVE_PHOTO` — `{ legId, photoId }`
  - `UPDATE_PHOTO` — `{ legId, photoId, changes }`
  - `REORDER_PHOTOS` — `{ legId, orderedIds }`
  - `SET_JOURNEY_META` — `{ tripId, journey }`

---

## Navigation & App Structure

A new **JOURNEY** tab is added as the 8th tab in `TripPlanner`, positioned between DISCOVERY and VAULT.

```
OVERVIEW | ITINERARY | FLIGHTS | STAYS | LOGISTICS | DISCOVERY | JOURNEY | VAULT
```

The Journey tab renders `JourneyTab.jsx`, which shows a mode toggle at the top:

```
[ STUDIO ]  [ TOUR ]
```

Default mode: STUDIO.

A standalone route `/tour/:slug` renders `TourPage.jsx` — fullscreen, no app nav, no tabs — for public sharing.

---

## Studio Mode

**Layout:** Two-panel, side-by-side.

**Left panel — Stop list:**
- Ordered list of all legs/stops in the current trip
- Each stop card shows:
  - Stop name (from/to)
  - Thumbnail strip of attached photos (max 4 visible, "+N" overflow)
  - Photo count badge
  - Cover-star icon (click to set as tour cover)
  - Empty state: "No photos yet — add some on the right"
- Clicking a stop card selects it and loads its photos in the right panel

**Right panel — Photo editor:**
- Selected stop name as header
- `PhotoUploader` component:
  - Drag-and-drop zone for file upload
  - `<input type="file" multiple accept="image/*">` fallback
  - URL input field ("Paste a photo link") — accepts any image URL or embeddable link
  - Both paths write to the same `Photo[]` shape
- `PhotoStrip` — horizontally scrollable list of attached photos:
  - Each photo: thumbnail + caption input beneath it + delete button
  - Drag to reorder (dnd-kit sortable, already in deps)
- If no stop selected: prompt to select a stop from the left

**Top bar:**
- Journey title input (editable, defaults to trip name)
- Share slug input (shown after first photo added, editable pre-publish)
- `PublishButton`:
  - Pre-publish: "Publish Journey" → sets `published: true`, generates slug, copies share link to clipboard
  - Post-publish: "Published ✓ — Copy Link" + "Unpublish" option

---

## Tour Mode

**Layout:** Split-screen fullscreen.

- Left ~45%: `TourMap` — Leaflet map
- Right ~55%: `PhotoStage` — photo display + caption
- Bottom: `TourControls` — scrub bar + playback controls

**TourMap:**
- Renders all stop pins using existing mode-color system
- Active stop pin has a CSS pulse animation (keyframe scale + opacity ring)
- Route polylines rendered same as `RouteMap` (flight arc, ground straight)
- On stop change: `map.flyTo(coords, zoom, { animate: true, duration: 1.2 })`
- Stops with no photos shown as dimmed pins, skipped in playback but visible

**PhotoStage:**
- Displays current stop's photos in sequence
- `AnimatePresence` + `motion.div` crossfade between photos (0.6s ease)
- Caption appears at bottom as an overlay on the photo
- Stop name + stop index ("Stop 2 of 7") shown at top of panel
- If stop has multiple photos: auto-advances after 4s per photo

**TourControls (bottom bar):**
- Play / Pause button
- Previous stop / Next stop buttons
- Scrub bar: one segment per stop, filled as tour progresses, click to jump
- Current stop label centered above scrub bar
- "Exit Tour" button (top right corner) → returns to Studio

**Playback logic:**
- Auto-play starts when Tour mode opens
- Sequence: fly map → show photos in order → advance to next stop
- Pause freezes both map and photo transitions
- Stops with 0 photos are skipped automatically
- Tour ends on last stop's last photo → shows "Journey Complete" overlay with "Replay" and "Share" CTAs

---

## Public Tour Page (`/tour/:slug`)

- Route: `/tour/:slug`
- Component: `TourPage.jsx` — standalone, no TripPlanner shell
- Data source: reads from localStorage by matching `trip.journey.shareSlug === slug`
- If no match: "Tour not found" empty state with link back to app
- Renders `TourView` directly in fullscreen (same components as Tour mode)
- Shows tour title + "Made with VenturePath" watermark at bottom left
- No edit controls, no Studio toggle

**Limitation (MVP):** Share link only works on the same device/browser since data is localStorage-only. A future backend sync would enable true cross-device sharing.

---

## Component File Map

```
src/
├── components/
│   └── journey/
│       ├── JourneyTab.jsx          # root, mode toggle
│       ├── studio/
│       │   ├── StudioView.jsx      # two-panel layout
│       │   ├── StopPhotoCard.jsx   # stop card with thumbnail strip + cover star
│       │   ├── PhotoUploader.jsx   # drag-drop + URL input
│       │   ├── PhotoStrip.jsx      # sortable horizontal thumbnails
│       │   └── PublishButton.jsx   # slug gen + publish action
│       └── tour/
│           ├── TourView.jsx        # fullscreen split-screen
│           ├── TourMap.jsx         # Leaflet map, flyTo, pulsing pin
│           ├── PhotoStage.jsx      # crossfade photos + caption overlay
│           └── TourControls.jsx    # scrub bar, play/pause, stop nav
├── pages/
│   └── TourPage.jsx                # standalone /tour/:slug page
└── store/
    └── useTripStore.jsx            # extended with photo + journey actions
```

---

## Edge Cases & Constraints

| Scenario | Behavior |
|---|---|
| Stop has no photos | Shown as dimmed pin on map, skipped in playback |
| Trip has no photos at all | Tour mode shows "Add photos in Studio to start your journey" |
| External URL fails to load | `onError` replaces with placeholder frame + caption only |
| base64 image is large | No size limit enforced in MVP — localStorage quota may warn; noted for v2 |
| Share link on different device | "Tour not found" — expected MVP limitation, noted in UI |
| Single photo per stop | No auto-advance within stop, just holds for 4s then moves to next stop |

---

## Out of Scope (v1)

- Backend sync / cross-device sharing
- Video support
- Music / ambient audio
- EXIF GPS auto-assignment
- Social feed of public tours (discovery)
- Comments or reactions on tours
- Export to video/PDF

---

## Apple Compliance Notes (HolyFlex rules do not apply — this is VenturePath)

N/A — VenturePath is not subject to APPLE_COMPLIANCE.md.

---

## Success Criteria

1. A user can attach photos (upload or URL) to any stop in under 30 seconds
2. Pressing "Tour" plays a map-animated slideshow hitting every stop with photos
3. A published journey link opens the tour fullscreen on the same device
4. Studio and Tour modes are reachable from the JOURNEY tab without leaving TripPlanner
