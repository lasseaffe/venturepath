# Itinerary Map Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an interactive Leaflet map below the KanbanBoard where clicking a stop card flies to its pin and clicking a pin highlights and scrolls to the matching card.

**Architecture:** All coordination state (`activeStopId`, `coords`) lives in `KanbanBoard`. A new `ItineraryMap` component renders below the board and receives props — no new context or store. Geocoding fires staggered per block via the existing `geocodeEngine`, results cached in a ref.

**Tech Stack:** React (useState, useRef, useEffect, useCallback), react-leaflet (MapContainer, TileLayer, Marker, Popup, useMap), Leaflet (L.divIcon), geocodeEngine (Nominatim)

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/components/itinerary/ItineraryMap.jsx` | Leaflet map, pins, fly-to, pin-click handler |
| Modify | `src/components/itinerary/KanbanBoard.jsx` | activeStopId state, coords ref, geocoding effect, card click, scroll effect, render ItineraryMap |

---

## Task 1: Create ItineraryMap component (no sync yet)

**Files:**
- Create: `src/components/itinerary/ItineraryMap.jsx`

- [ ] **Step 1: Create the file with static map, no pins**

```jsx
// src/components/itinerary/ItineraryMap.jsx
import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const CATEGORY_COLORS = {
  transport: '#3B82F6',
  logistics: '#EAB308',
  food:      '#22C55E',
  activity:  '#E67E22',
  rest:      '#64748B',
  default:   '#64748B',
};

function makePin(num, color, isActive) {
  return L.divIcon({
    className: '',
    iconAnchor: [18, 36],
    popupAnchor: [0, -40],
    html: `
      <div style="
        width:36px;height:36px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);
        background:${color};display:flex;align-items:center;justify-content:center;
        box-shadow:0 2px 8px rgba(0,0,0,${isActive ? 0.9 : 0.5});
        border:${isActive ? '2px solid #fff' : 'none'};
        transition:all 0.2s;
      ">
        <span style="transform:rotate(45deg);font-size:13px;font-weight:700;color:#0d1b2a;">${num}</span>
      </div>`,
  });
}

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

export default function ItineraryMap({ days, coords, activeStopId, onPinClick }) {
  const markerRefs = useRef(new Map());

  // Flatten all blocks with a sequential global number
  const allBlocks = [];
  let num = 1;
  for (const day of days) {
    for (const block of day.blocks) {
      allBlocks.push({ block, num, day });
      num++;
    }
  }

  // Blocks that have resolved coordinates
  const mappable = allBlocks.filter(({ block }) => Array.isArray(coords[block.id]));

  const hasAny = mappable.length > 0;

  return (
    <div style={{ marginTop: '16px' }}>
      <div
        className="label-tag mb-2"
        style={{ color: '#4b5563', fontSize: '10px', fontFamily: 'monospace', letterSpacing: '0.1em' }}
      >
        STOP MAP
      </div>
      <div
        style={{
          height: '380px',
          borderRadius: '8px',
          overflow: 'hidden',
          border: '1px solid #1e2328',
          background: '#0E1012',
          position: 'relative',
        }}
      >
        {!hasAny && (
          <div
            style={{
              position: 'absolute', inset: 0, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              color: '#374151', fontFamily: 'monospace', fontSize: '11px',
              letterSpacing: '0.1em', zIndex: 1000, pointerEvents: 'none',
            }}
          >
            RESOLVING LOCATIONS…
          </div>
        )}
        <MapContainer
          center={[20, 0]}
          zoom={2}
          style={{ height: '100%', width: '100%', background: '#0E1012' }}
          zoomControl={true}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          />
          <MapController
            activeStopId={activeStopId}
            coords={coords}
            markerRefs={markerRefs}
          />
          {mappable.map(({ block, num: n }) => {
            const latLng = coords[block.id];
            const color = CATEGORY_COLORS[block.category] ?? CATEGORY_COLORS.default;
            const isActive = block.id === activeStopId;
            return (
              <Marker
                key={block.id}
                position={latLng}
                icon={makePin(n, color, isActive)}
                ref={el => {
                  if (el) markerRefs.current.set(block.id, el);
                  else markerRefs.current.delete(block.id);
                }}
                eventHandlers={{ click: () => onPinClick(block.id) }}
              >
                <Popup>
                  <div style={{ fontFamily: 'monospace', fontSize: '12px', color: '#0d1b2a', minWidth: '120px' }}>
                    <div style={{ fontWeight: 700 }}>{block.icon} {block.title}</div>
                    {block.time && <div style={{ color: '#6b7280', marginTop: '2px' }}>{block.time}</div>}
                    {block.notes && <div style={{ color: '#6b7280', marginTop: '2px' }}>{block.notes}</div>}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify the file was saved correctly**

```bash
# In the venturepath directory
ls src/components/itinerary/ItineraryMap.jsx
```
Expected: file exists, no error.

- [ ] **Step 3: Commit**

```bash
git add src/components/itinerary/ItineraryMap.jsx
git commit -m "feat: add ItineraryMap component (static, no sync yet)"
```

---

## Task 2: Add geocoding state to KanbanBoard

**Files:**
- Modify: `src/components/itinerary/KanbanBoard.jsx`

`★ Insight ─────────────────────────────────────`
- `coordsRef` is a ref (not state) so geocode results don't cause re-renders on every fetch. Only `coordsVersion` (a counter state) triggers a re-render, and only when new results arrive.
- The 300ms stagger uses `setTimeout` inside the geocoding loop to stay within Nominatim's 1 req/s rate limit.
`─────────────────────────────────────────────────`

- [ ] **Step 1: Add import for geocodeLocation at the top of KanbanBoard.jsx**

Find this line (already near the top of the file):
```js
import { useExpedition } from '../../context/ExpeditionContext';
```

Add immediately after it:
```js
import { geocodeLocation } from '../../utils/geocodeEngine';
```

- [ ] **Step 2: Add activeStopId state and coords ref inside the KanbanBoard component**

Find this block inside `export default function KanbanBoard`:
```js
  const [inspireDay,    setInspireDay]    = useState(null);  // day object whose Inspire panel is open
```

Add immediately after it:
```js
  const [activeStopId,  setActiveStopId]  = useState(null);
  const [coordsVersion, setCoordsVersion] = useState(0);
  const coordsRef = useRef(new Map()); // blockId → [lat, lng] | false (failed)
```

- [ ] **Step 3: Add geocoding effect inside KanbanBoard, after the culinary payload effect**

Find this closing brace of the culinary useEffect:
```js
  }, []);
```
(It is the one that ends with `window.history.replaceState(...)` logic — line ~125.)

Add this new effect immediately after it:
```js
  // Geocode all blocks that don't have coordinates yet
  useEffect(() => {
    const allBlocks = days.flatMap(d => d.blocks);
    const pending = allBlocks.filter(b => !coordsRef.current.has(b.id));
    if (pending.length === 0) return;
    let cancelled = false;
    pending.forEach((block, i) => {
      setTimeout(async () => {
        if (cancelled) return;
        const result = await geocodeLocation(block.title);
        coordsRef.current.set(block.id, result ? [result.lat, result.lng] : false);
        if (!cancelled) setCoordsVersion(v => v + 1);
      }, i * 300);
    });
    return () => { cancelled = true; };
  }, [days]);
```

- [ ] **Step 4: Add scroll-to-card effect inside KanbanBoard, after the geocoding effect**

```js
  // Scroll the active card into view when activeStopId changes
  useEffect(() => {
    if (!activeStopId) return;
    const el = document.querySelector(`[data-block-id="${activeStopId}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [activeStopId]);
```

- [ ] **Step 5: Build the coords plain object for prop passing**

Find this line inside the `return (` of KanbanBoard (just before the JSX starts, after the `return (`):
```js
    <div className="flex flex-col gap-3">
```

Add this computed value immediately before that `return (` statement (after the scroll effect, before `return`):
```js
  // Build plain object from ref for prop comparison (coordsVersion forces re-read)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const coords = Object.fromEntries(
    [...coordsRef.current.entries()].filter(([, v]) => Array.isArray(v))
  );
```

(The `coordsVersion` dependency is intentionally unused in the expression — its only job is to trigger a re-render when new geocode results arrive. The eslint comment suppresses the exhaustive-deps warning.)

- [ ] **Step 6: Commit**

```bash
git add src/components/itinerary/KanbanBoard.jsx
git commit -m "feat: add geocoding state and activeStopId to KanbanBoard"
```

---

## Task 3: Wire card clicks and active highlight

**Files:**
- Modify: `src/components/itinerary/KanbanBoard.jsx`

- [ ] **Step 1: Pass activeStopId and onCardClick to KanbanView**

Find the `<KanbanView` JSX block in KanbanBoard's render. It currently ends with:
```jsx
            onInspire={day => setInspireDay(day)}
```

Add two more props:
```jsx
            onInspire={day => setInspireDay(day)}
            activeStopId={activeStopId}
            onCardClick={id => setActiveStopId(prev => prev === id ? null : id)}
```

- [ ] **Step 2: Accept the new props in KanbanView's function signature**

Find:
```js
function KanbanView({
  days, ghostId, dropIndicator, editingId, editDraft, addingTo, newDraft,
  columnRefs, onDragStart, onDragEnd, onDragOver, onDragLeave, onDrop,
  onAddDay, onRemoveDay, onAutoSort,
  onStartEdit, onCommitEdit, onCancelEdit, onEditDraftChange,
  onSetAddingTo, onCancelAdd, onNewDraftChange, onAddBlock, onRemoveBlock,
  onInspire,
}) {
```

Replace with:
```js
function KanbanView({
  days, ghostId, dropIndicator, editingId, editDraft, addingTo, newDraft,
  columnRefs, onDragStart, onDragEnd, onDragOver, onDragLeave, onDrop,
  onAddDay, onRemoveDay, onAutoSort,
  onStartEdit, onCommitEdit, onCancelEdit, onEditDraftChange,
  onSetAddingTo, onCancelAdd, onNewDraftChange, onAddBlock, onRemoveBlock,
  onInspire, activeStopId, onCardClick,
}) {
```

- [ ] **Step 3: Pass activeStopId and onCardClick down to ActivityBlock**

Find this JSX inside KanbanView's map (around line 528):
```jsx
                    <ActivityBlock
                      block={block}
                      isGhost={ghostId === block.id}
                      onDragStart={e => onDragStart(e, day.id, block.id)}
                      onDragEnd={onDragEnd}
                      onEdit={() => onStartEdit(block)}
                      onRemove={() => onRemoveBlock(block.id)}
                    />
```

Replace with:
```jsx
                    <ActivityBlock
                      block={block}
                      isGhost={ghostId === block.id}
                      isActive={activeStopId === block.id}
                      onDragStart={e => onDragStart(e, day.id, block.id)}
                      onDragEnd={onDragEnd}
                      onEdit={() => onStartEdit(block)}
                      onRemove={() => onRemoveBlock(block.id)}
                      onCardClick={() => onCardClick(block.id)}
                    />
```

- [ ] **Step 4: Find the ActivityBlock function and add isActive + onCardClick props**

Search for `function ActivityBlock` in KanbanBoard.jsx. It will look something like:
```js
function ActivityBlock({ block, isGhost, onDragStart, onDragEnd, onEdit, onRemove }) {
```

Replace with:
```js
function ActivityBlock({ block, isGhost, isActive, onDragStart, onDragEnd, onEdit, onRemove, onCardClick }) {
```

- [ ] **Step 5: Add data-block-id attribute and active highlight + click handler to the ActivityBlock root div**

Inside `ActivityBlock`, find its outermost returned `<div` — it will have `draggable` and `onDragStart` on it. It currently has an inline `style` prop.

Add `data-block-id`, `onClick`, and the active glow to that style:

Find the existing style object on the ActivityBlock root div. It will contain properties like `background`, `border`, `opacity`. Add the active glow and click handler:

```jsx
      onClick={onCardClick}
      data-block-id={block.id}
```

And merge into its existing `style` prop:
```js
      style={{
        // ... existing style properties (keep them all) ...
        boxShadow: isActive
          ? '0 0 0 2px #E67E22, 0 0 12px rgba(230,126,34,0.4)'
          : undefined,
        cursor: 'pointer',
      }}
```

> **How to find the exact element:** Look for the `<div` inside ActivityBlock that has `draggable={true}` and `onDragStart`. That is the card root. Add the three new attributes to it. Preserve all existing style properties — only add `boxShadow` and `cursor`.

- [ ] **Step 6: Verify in the browser that clicking a card highlights it**

Start the dev server (`npm run dev`). Go to the ITINERARY tab. Click a stop card — its border should glow orange. Clicking the same card again should clear it.

- [ ] **Step 7: Commit**

```bash
git add src/components/itinerary/KanbanBoard.jsx
git commit -m "feat: card click toggles activeStopId with glow highlight"
```

---

## Task 4: Render ItineraryMap below the board and wire pin clicks

**Files:**
- Modify: `src/components/itinerary/KanbanBoard.jsx`

- [ ] **Step 1: Import ItineraryMap**

At the top of KanbanBoard.jsx, add:
```js
import ItineraryMap from './ItineraryMap';
```

- [ ] **Step 2: Render ItineraryMap below the board grid**

Find the closing `</div>` of the KanbanBoard return — the one that wraps the entire component output:
```jsx
    </div>
  );
}
```

Just before that outer closing `</div>`, add:
```jsx
      <ItineraryMap
        days={days}
        coords={coords}
        activeStopId={activeStopId}
        onPinClick={id => setActiveStopId(prev => prev === id ? null : id)}
      />
```

So the full end of the return looks like:
```jsx
      {/* ── Board ── */}
      {viewMode === 'kanban' ? (
        <KanbanView … />
      ) : (
        <TimelineView … />
      )}

      <ItineraryMap
        days={days}
        coords={coords}
        activeStopId={activeStopId}
        onPinClick={id => setActiveStopId(prev => prev === id ? null : id)}
      />
    </div>
  );
}
```

- [ ] **Step 3: Verify full bidirectional sync in the browser**

Start dev server (`npm run dev`). On the ITINERARY tab:

1. Wait ~3 seconds for geocoding to resolve (Nominatim is slow on first load).
2. Click a stop card → map should fly to that location and open the pin popup.
3. Click a different map pin → the corresponding card should get the orange glow and scroll into view.
4. Click the same card or pin again → selection should clear.
5. Check the browser console — no unhandled errors expected.

- [ ] **Step 4: Commit**

```bash
git add src/components/itinerary/KanbanBoard.jsx
git commit -m "feat: wire ItineraryMap below KanbanBoard with bidirectional pin-card sync"
```

---

## Self-Review Against Spec

**Spec requirement → Task coverage:**

| Spec requirement | Task |
|---|---|
| Map below KanbanBoard on ITINERARY tab | Task 4, Step 2 |
| Click card → fly to pin + open popup | Task 2 (activeStopId), Task 4 (MapController in ItineraryMap) |
| Click pin → highlight card + scroll into view | Task 3 (isActive glow), Task 2 (scroll effect) |
| Auto-geocode by title using geocodeEngine | Task 2 (geocoding effect) |
| 300ms stagger for Nominatim rate limit | Task 2, Step 3 |
| Failed geocodes skipped silently | Task 2 (sentinel `false`), Task 1 (filter Array.isArray) |
| "Resolving locations…" when no coords | Task 1 (hasAny check) |
| CartoDB DarkMatter tile layer | Task 1 |
| Pin colored by category | Task 1 (CATEGORY_COLORS) |
| Pin numbered sequentially across days | Task 1 (num counter) |
| Active pin: white border + stronger shadow | Task 1 (makePin isActive param) |
| Active card: orange glow | Task 3, Step 5 |
| Toggle: clicking same card/pin clears | Task 3 Step 1 and Task 4 Step 2 (prev === id check) |
| Map height 380px, border-radius 8px | Task 1 |

All spec requirements covered. No placeholders found.
