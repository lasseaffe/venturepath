# Hero Image Crop Editor + Static Photo Library

**Date:** 2026-05-12  
**Status:** Approved  
**Scope:** VenturePath — `TripPlanner` hero image section

---

## Problem

1. Several `DESTINATION_HEROES` entries in `destinationEngine.js` contain wrong or broken Pexels photo IDs (Hamburg image 1 shows an Indian building; image 2 is a 404).
2. The hero's `objectPosition` is hardcoded to `center 40%` — there is no way to control what part of a photo is visible without editing source code.
3. There is no in-app way to swap a destination's photos.

---

## Goals

- Replace the bad Hamburg photos with 10 verified shots (Pexels + Unsplash).
- Let Architects drag-to-pan any hero image to choose the visible crop area.
- Let Architects swap images via an in-hero photo picker backed by a static library.
- Make the static library expandable over time via a dev script, without changing app code.

---

## Out of Scope

- Live Pexels/Unsplash API calls at runtime.
- Syncing crop positions to Supabase (follow-up).
- Zoom/scale control (CSS `background-size` variant) — pan-only for now.

---

## Architecture

### 1. Static Photo Library (`destinationEngine.js`)

Replace the flat `string[]` per destination with a typed object array:

```js
// New shape
export const DESTINATION_HEROES = {
  hamburg: [
    {
      url: 'https://images.pexels.com/photos/XXXXXXX/...',
      source: 'pexels',   // 'pexels' | 'unsplash'
      credit: 'Photographer Name',
      tags: ['speicherstadt', 'canal', 'warehouse'],
    },
    // …9 more entries
  ],
  // other destinations…
};
```

**Backward compatibility:** `TripHeroImage` auto-coerces legacy `string` entries:
```js
const normalize = entry => typeof entry === 'string' ? { url: entry, source: 'pexels', credit: '', tags: [] } : entry;
const candidates = (DESTINATION_HEROES[key] ?? DESTINATION_HEROES.default).map(normalize);
```

**Hamburg seed:** 10 entries curated from both Pexels and Unsplash during implementation, covering: Speicherstadt, Elbphilharmonie, Landungsbrücken, Rathaus, Alster, Reeperbahn at night, HafenCity, Fischmarkt, Planten un Blomen, Hamburg skyline.

**Dev script:** `scripts/fetch-destination-photos.js`  
Usage: `node scripts/fetch-destination-photos.js --destination "tokyo" --count 10`  
Output: prints candidate objects (url, source, credit, tags) for manual copy-paste into `destinationEngine.js`. Calls Pexels and Unsplash search APIs with the destination name. Not run at app startup — developer-only tool.

### 2. Crop State (`useTripStore`)

Add to the store:

```js
// State
heroImagePositions: {},   // { [imageUrl]: { x: number, y: number } }

// Action
setHeroImagePosition: (url, x, y) => set(state => ({
  heroImagePositions: { ...state.heroImagePositions, [url]: { x, y } }
})),
```

Default position when no entry exists: `{ x: 50, y: 40 }` (matching current hardcoded `center 40%`).

### 3. `TripHeroImage` — Edit Mode

**New state inside the component:**
- `editing: boolean` — dashed border, drag cursor, toolbar visible
- `searching: boolean` — editing + search panel expanded below
- `draftPosition: { x, y }` — local position while dragging, not yet committed
- `searchQuery: string` — text input value (pre-filled with destination name)

**Edit mode activation:** Pencil icon appears on hover (top-right, same styling as existing dot indicators). Click enters `editing = true`.

**Drag mechanic:**
```
onMouseDown → record (startMouseX, startMouseY, startX, startY)
onMouseMove → delta = (currentMouse - startMouse) / imageSize * 100
            → draftPosition = clamp(startPos + delta, 0, 100)
            → apply to img objectPosition live
onMouseUp   → stop tracking
```

**Toolbar (visible when `editing`):**
- Cancel — revert `draftPosition` to stored position, exit editing
- 🔍 Change photo — toggle `searching`
- Save — `setHeroImagePosition(url, draftX, draftY)`, exit editing

**Accessibility:** pencil button has `aria-label="Adjust image position"`, toolbar buttons have standard aria labels, drag region has `role="img"` + `aria-label`.

### 4. In-Hero Photo Picker

Renders below the toolbar when `searching = true`. Same width as the hero.

**Layout:**
```
[ Hamburg...  ] [search input]  ← pre-filled with city name, live-filters library
[ thumb ] [ thumb ] [ thumb ] [ thumb ] [ thumb ] → scrollable horizontal strip
  Pexels         Unsplash        Pexels
```

**Filter logic:**
```js
const results = candidates.filter(p =>
  !searchQuery ||
  p.tags.some(t => t.includes(q)) ||
  p.credit.toLowerCase().includes(q) ||
  p.source.includes(q)
);
```

**Selecting a photo:**
- Swaps `imgSrc` to the selected photo's URL
- Resets `draftPosition` to `{ x: 50, y: 40 }`
- Collapses `searching` back to `editing` so the Architect can immediately pan the new image

**Attribution chip:** small `Pexels` / `Unsplash` pill overlaid on each thumbnail bottom-left.

---

## File Changes

| File | Change |
|---|---|
| `src/utils/destinationEngine.js` | Expand `DESTINATION_HEROES` entries to object shape; replace Hamburg array with 10 verified entries |
| `src/store/useTripStore.js` | Add `heroImagePositions` state + `setHeroImagePosition` action |
| `src/pages/TripPlanner.jsx` | Update `TripHeroImage` with edit mode, drag mechanic, toolbar, search panel |
| `scripts/fetch-destination-photos.js` | New dev-only script for expanding the library |

---

## Edge Cases

- **No library entries for destination:** falls back to `DESTINATION_HEROES.default`; search panel shows default photos.
- **Image fails to load:** existing `onError` fallback applies; edit mode is disabled on broken images.
- **Touch devices:** drag uses `onTouchStart/Move/End` equivalents with `e.touches[0]`.
- **Single-image destinations:** pencil icon still shows for crop control; "Change photo" only appears if library has ≥ 2 entries for that destination.
