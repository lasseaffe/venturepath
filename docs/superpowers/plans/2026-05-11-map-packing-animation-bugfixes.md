# Map, Packing & Animation Bug Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 5 regressions: map z-index bleed, stop-map world-level zoom, bag card size/destination, missing backpack animations, and card hero image caching.

**Architecture:** All changes are surgical edits to existing files — no new files, no structural refactoring. Each task is independently testable in the browser at `localhost:5173` (or whichever Vite port is running).

**Tech Stack:** Vite + React, react-leaflet (Leaflet v1.9), Framer Motion, Zustand (`useTripStore`), sessionStorage for client-side cache.

---

## File Map

| File | What changes |
|---|---|
| `src/components/itinerary/ItineraryMap.jsx` | overflow:hidden on outer wrapper; fitBounds on mount in MapController |
| `src/components/logistics/bag/Bag2D.jsx` | Import + render `BagAnim_backpack` inside `AnimatedBackpack` |
| `src/components/logistics/PackingHudScreen.jsx` | Pull `trip.destination` from `useTripStore`, pass to `BagHud` |
| `src/components/logistics/BagHud.jsx` | Accept `destination` prop; display it; reduce height 480→340 |
| `src/hooks/useDestinationImage.js` | Add sessionStorage cache keyed by `"type:query"` |

---

## Task 1: Fix map overflow (ItineraryMap outer wrapper)

**Files:**
- Modify: `src/components/itinerary/ItineraryMap.jsx:72`

**Why this works:** The inner map container already has `overflow: hidden` and `isolation: isolate`, but the outermost wrapper div (line 72) only has `position: relative; isolation: isolate`. Leaflet's high z-index tile panes bleed through to sibling DOM elements because the outer wrapper doesn't clip them.

- [ ] **Step 1: Open `ItineraryMap.jsx` and find the outer wrapper (line 72)**

  Currently reads:
  ```jsx
  <div style={{ marginTop: '16px', position: 'relative', isolation: 'isolate' }}>
  ```

- [ ] **Step 2: Add `overflow: 'hidden'` to that wrapper**

  Replace with:
  ```jsx
  <div style={{ marginTop: '16px', position: 'relative', isolation: 'isolate', overflow: 'hidden' }}>
  ```

- [ ] **Step 3: Verify in browser**

  - Navigate to TripPlanner → ITINERARY tab
  - The map renders inside its box; content below (budget section, etc.) is not obscured
  - Pan the map to the edges — tiles clip at the border, don't bleed outside

- [ ] **Step 4: Commit**

  ```bash
  git add src/components/itinerary/ItineraryMap.jsx
  git commit -m "fix(map): add overflow:hidden to ItineraryMap outer wrapper to prevent Leaflet z-index bleed"
  ```

---

## Task 2: Auto-fit stop map to city level on mount

**Files:**
- Modify: `src/components/itinerary/ItineraryMap.jsx:40-50` (MapController)

**Why this works:** `MapController` currently only fires `map.flyTo` when `activeStopId` changes. On first render, the map always shows the world at zoom 2. We add a separate mount-only effect that calls `map.fitBounds` across all resolved coords.

- [ ] **Step 1: Add `useRef` import if not already present (it's already imported in the file — skip if so)**

  Confirm line 1 reads:
  ```js
  import { useEffect, useRef } from 'react';
  ```

- [ ] **Step 2: Replace the `MapController` function (lines 40–51) with the version below**

  Current:
  ```jsx
  function MapController({ activeStopId, coords, markerRefs }) {
    const map = useMap();
    useEffect(() => {
      if (!activeStopId) return;
      const latLng = coords[activeStopId];
      if (!latLng) return;
      map.flyTo(latLng, 14, { duration: 1.0 });
      const markerRef = markerRefs.current.get(activeStopId);
      if (markerRef) markerRef.openPopup();
    }, [activeStopId, coords, map, markerRefs]);
    return null;
  }
  ```

  Replace with:
  ```jsx
  function MapController({ activeStopId, coords, markerRefs }) {
    const map = useMap();
    const fittedRef = useRef(false);

    // One-time fit to all resolved stops on mount
    useEffect(() => {
      if (fittedRef.current) return;
      const points = Object.values(coords).filter(Array.isArray);
      if (points.length === 0) return;
      fittedRef.current = true;
      if (points.length === 1) {
        map.setView(points[0], 13);
      } else {
        const L = map.options.crs?.constructor ?? window.L;
        const bounds = points.reduce(
          (b, p) => b.extend(p),
          window.L.latLngBounds(points[0], points[0])
        );
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
      }
    }, [coords, map]);

    // Fly to active stop when selected
    useEffect(() => {
      if (!activeStopId) return;
      const latLng = coords[activeStopId];
      if (!latLng) return;
      map.flyTo(latLng, 14, { duration: 1.0 });
      const markerRef = markerRefs.current.get(activeStopId);
      if (markerRef) markerRef.openPopup();
    }, [activeStopId, coords, map, markerRefs]);

    return null;
  }
  ```

  **Note:** `window.L` is available because react-leaflet loads Leaflet globally. The `fittedRef` prevents re-fitting when `coords` updates with more resolved locations (which would fight the user's manual pan/zoom).

- [ ] **Step 3: Verify in browser**

  - Navigate to TripPlanner → ITINERARY tab
  - The stop map should open at city/region level showing the expedition stops, NOT the whole world
  - Clicking a pin should fly to that stop at zoom 14
  - If no stops have coords yet, the map stays at world view (expected)

- [ ] **Step 4: Commit**

  ```bash
  git add src/components/itinerary/ItineraryMap.jsx
  git commit -m "fix(map): auto-fit stop map to city level on mount using fitBounds"
  ```

---

## Task 3: Restore backpack animation layer in Bag2D

**Files:**
- Modify: `src/components/logistics/bag/Bag2D.jsx:1-8` (imports)
- Modify: `src/components/logistics/bag/Bag2D.jsx:711-715` (inside AnimatedBackpack SVG)

**Why this works:** `BagAnim_backpack.jsx` exports an animation overlay component with interface `{hoveredZone, highlightedZone, accentColor, activeSkin}`. It was never imported. `AnimatedBackpack` has all required state already (`hoveredZone`, `activeSkin`, `p.accent`) — it just needs the import and a single JSX line inside the SVG.

- [ ] **Step 1: Add the import at line 8 of `Bag2D.jsx`**

  Current imports block (lines 1–8):
  ```js
  // src/components/logistics/bag/Bag2D.jsx
  import { useState } from 'react';
  import { SKINS } from './bagSkins';
  import BagAnim_handbag  from './BagAnim_handbag';
  import BagAnim_duffel   from './BagAnim_duffel';
  import BagAnim_suitcase from './BagAnim_suitcase';
  import BagAnim_carryon  from './BagAnim_carryon';
  import BagAnim_daypack  from './BagAnim_daypack';
  ```

  Add one line after `BagAnim_daypack`:
  ```js
  import BagAnim_backpack from './BagAnim_backpack';
  ```

- [ ] **Step 2: Render the animation layer inside `AnimatedBackpack`'s SVG**

  Find the HIGHLIGHT SHEEN comment near the end of the `AnimatedBackpack` return (around line 711). Currently:
  ```jsx
      {/* ══ HIGHLIGHT SHEEN ══ */}
      <ellipse cx="185" cy="72" rx="28" ry="16"
        fill="rgba(255,255,255,0.06)" transform="rotate(-20, 185, 72)"/>
    </svg>
  ```

  Replace with:
  ```jsx
      {/* ══ ANIMATION LAYER ══ */}
      <BagAnim_backpack
        hoveredZone={hoveredZone}
        highlightedZone={null}
        accentColor={p.accent}
        activeSkin={activeSkin}
      />

      {/* ══ HIGHLIGHT SHEEN ══ */}
      <ellipse cx="185" cy="72" rx="28" ry="16"
        fill="rgba(255,255,255,0.06)" transform="rotate(-20, 185, 72)"/>
    </svg>
  ```

- [ ] **Step 3: Verify in browser**

  - Navigate to TripPlanner → LOGISTICS tab → add a backpack bag
  - In 2D view: hover over each zone (TOP LID, MAIN, FRONT POCKET, SIDE POCKET, HIP BELT)
  - Each zone should animate: top lid slides up, front pocket illuminates, etc.
  - Other bag types (duffel, suitcase) should still animate correctly — verify one

- [ ] **Step 4: Commit**

  ```bash
  git add src/components/logistics/bag/Bag2D.jsx
  git commit -m "fix(packing): restore BagAnim_backpack import and render in AnimatedBackpack"
  ```

---

## Task 4: Show trip destination on bag card + reduce card height

**Files:**
- Modify: `src/components/logistics/PackingHudScreen.jsx:1-12` (imports + component body)
- Modify: `src/components/logistics/BagHud.jsx:12,34-65` (prop + top bar + height)

**Why this works:** `useTripStore` already exposes `trip.destination` (e.g. `"Torres del Paine, Chile"`). `PackingHudScreen` wraps `BagHud` but passes no destination. `BagHud` has no prop for it. We thread it through in two small edits.

- [ ] **Step 1: Add `useTripStore` import to `PackingHudScreen.jsx`**

  Current line 2:
  ```js
  import { useState, useMemo, useRef, useCallback } from 'react';
  ```

  Add after line 11 (`import PackingChecklist`):
  ```js
  import { useTripStore } from '../../store/useTripStore';
  ```

- [ ] **Step 2: Read destination from store inside `PackingHudScreen`**

  `PackingHudScreen` starts (line 13):
  ```jsx
  export default function PackingHudScreen({
    climate = 'temperate',
    days = 7,
    hasChildren = false,
    poiTags = [],
  }) {
    const [bags, setBags] = useState([]);
  ```

  Add the store read as the first line inside the component body:
  ```jsx
  export default function PackingHudScreen({
    climate = 'temperate',
    days = 7,
    hasChildren = false,
    poiTags = [],
  }) {
    const destination = useTripStore(s => s.trip?.destination ?? '');
    const [bags, setBags] = useState([]);
  ```

- [ ] **Step 3: Pass `destination` to `BagHud`**

  Find the `<BagHud` usage in `PackingHudScreen`. It currently reads something like:
  ```jsx
  <BagHud
    bag={activeBag}
    bagType={activeBagType}
    zoneMap={zoneMap}
    packed={packedForActiveBag}
    onZoneClick={...}
    onZoneHover={...}
    onRemove={...}
    bagRef={bagRef}
    highlightedZone={highlightedZone}
    hoveredZone={hoveredZone}
  />
  ```

  Add `destination={destination}` as a prop:
  ```jsx
  <BagHud
    bag={activeBag}
    bagType={activeBagType}
    zoneMap={zoneMap}
    packed={packedForActiveBag}
    onZoneClick={...}
    onZoneHover={...}
    onRemove={...}
    bagRef={bagRef}
    highlightedZone={highlightedZone}
    hoveredZone={hoveredZone}
    destination={destination}
  />
  ```

- [ ] **Step 4: Accept `destination` in `BagHud` and reduce height**

  Current `BagHud` function signature (line 12):
  ```jsx
  export default function BagHud({ bag, bagType, zoneMap, packed, onZoneClick, onZoneHover, onRemove }) {
  ```

  Replace with:
  ```jsx
  export default function BagHud({ bag, bagType, zoneMap, packed, onZoneClick, onZoneHover, onRemove, destination }) {
  ```

  Current outer container (line 34):
  ```jsx
  <div className="flex flex-col" style={{ height: 480 }}>
  ```

  Replace with:
  ```jsx
  <div className="flex flex-col" style={{ height: 340 }}>
  ```

- [ ] **Step 5: Display destination in the top bar of `BagHud`**

  The top bar currently ends with the REMOVE BAG button. Find the closing `</div>` of the top bar section (after the `onRemove` button block). Add a destination label before the closing tag of the top bar `<div>`:

  Current top bar closing (inside the `{onRemove && ...}` block, right before the closing `</div>` of the top bar):
  ```jsx
        {onRemove && (
          <button
            onClick={onRemove}
            style={{
              marginLeft: 'auto',
              background: 'none', border: '1px solid #c0392b', color: '#c0392b',
              fontFamily: 'JetBrains Mono, monospace', fontSize: 7,
              padding: '3px 8px', borderRadius: 3, cursor: 'pointer',
            }}
          >
            ✕ REMOVE BAG
          </button>
        )}
      </div>
  ```

  Replace with:
  ```jsx
        {destination && (
          <span style={{
            marginLeft: onRemove ? 8 : 'auto',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 7,
            color: '#4b5563',
            letterSpacing: '0.08em',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: 140,
          }}>
            {destination}
          </span>
        )}
        {onRemove && (
          <button
            onClick={onRemove}
            style={{
              marginLeft: destination ? 4 : 'auto',
              background: 'none', border: '1px solid #c0392b', color: '#c0392b',
              fontFamily: 'JetBrains Mono, monospace', fontSize: 7,
              padding: '3px 8px', borderRadius: 3, cursor: 'pointer',
            }}
          >
            ✕ REMOVE BAG
          </button>
        )}
      </div>
  ```

- [ ] **Step 6: Verify in browser**

  - Navigate to TripPlanner → LOGISTICS tab → add a bag
  - The bag card should be visibly smaller (340px vs the previous tall card)
  - The destination "Torres del Paine, Chile" should appear as a small grey mono label in the top bar
  - The 2D/3D view toggle and skin selector should still work

- [ ] **Step 7: Commit**

  ```bash
  git add src/components/logistics/PackingHudScreen.jsx src/components/logistics/BagHud.jsx
  git commit -m "fix(packing): show trip destination on bag card, reduce BagHud height to 340px"
  ```

---

## Task 5: Add sessionStorage cache to useDestinationImage

**Files:**
- Modify: `src/hooks/useDestinationImage.js`

**Why this works:** The hook currently fires a fresh fetch on every mount. Navigating between tabs unmounts/remounts components, causing repeated API calls that often return empty results (rate-limited or scraper cold-start). Adding sessionStorage caching means the first successful fetch is reused for the duration of the browser session.

- [ ] **Step 1: Replace the full content of `useDestinationImage.js`**

  ```js
  // src/hooks/useDestinationImage.js
  import { useState, useEffect } from 'react';

  function sessionKey(type, query) {
    return `destimg:${type}:${query.trim().toLowerCase()}`;
  }

  export function useDestinationImage(query, type = 'city', index = 0) {
    const [images,  setImages]  = useState(() => {
      const q = query?.trim();
      if (!q) return null;
      try {
        const cached = sessionStorage.getItem(sessionKey(type, q));
        return cached ? JSON.parse(cached) : null;
      } catch {
        return null;
      }
    });
    const [loading, setLoading] = useState(false);
    const [error,   setError]   = useState(false);

    useEffect(() => {
      const q = query?.trim();
      if (!q) return;

      // Already have data (from sessionStorage init or prior fetch)
      if (images !== null) return;

      let cancelled = false;
      setLoading(true);
      setError(false);

      fetch(`/api/destination-images?q=${encodeURIComponent(q)}&type=${type}&count=5`)
        .then(r => r.json())
        .then(data => {
          if (cancelled) return;
          const imgs = data.images ?? [];
          setImages(imgs);
          setLoading(false);
          if (imgs.length > 0) {
            try {
              sessionStorage.setItem(sessionKey(type, q), JSON.stringify(imgs));
            } catch {
              // sessionStorage full — not critical
            }
          }
        })
        .catch(() => {
          if (!cancelled) {
            setError(true);
            setLoading(false);
          }
        });

      return () => { cancelled = true; };
    // Intentionally omit `images` from deps — we only want to fetch when images is null on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [query, type]);

    const image = images?.length > 0 ? images[index % images.length] : null;
    return { image, loading, error };
  }
  ```

- [ ] **Step 2: Verify in browser**

  - Navigate to TripPlanner → ITINERARY tab (Kanban view)
  - Day column headers should show destination images (after first load)
  - Switch to OVERVIEW tab and back to ITINERARY — images should still be there without a loading flash
  - Open DevTools → Application → Session Storage — confirm entries like `destimg:city:punta arenas` are present after load

- [ ] **Step 3: Verify ExpeditionSelectScreen**

  - Open the expedition select/new trip screen
  - Destination image should load and persist when navigating away and back

- [ ] **Step 4: Commit**

  ```bash
  git add src/hooks/useDestinationImage.js
  git commit -m "fix(images): add sessionStorage cache to useDestinationImage to survive tab remounts"
  ```

---

## Self-Review Against Spec

| Spec requirement | Task that covers it |
|---|---|
| overflow:hidden on ItineraryMap outer wrapper | Task 1 |
| fitBounds city-level default zoom | Task 2 |
| BagAnim_backpack import + render in AnimatedBackpack | Task 3 |
| destination from useTripStore in PackingHudScreen | Task 4 |
| destination prop in BagHud | Task 4 |
| BagHud height 480→340 | Task 4 |
| sessionStorage cache in useDestinationImage | Task 5 |
| ProPathCard hero — documented as gradient fallback (no code change) | N/A — by design |

All spec requirements covered. No placeholders. Types consistent across tasks.
