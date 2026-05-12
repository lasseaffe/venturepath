# Stop Drawer — Design Spec
**Date:** 2026-05-12
**Status:** Approved

---

## Problem

Clicking a stop block in the itinerary (kanban or timeline) currently expands `BlockHub` inline inside the narrow 262px card column. The image loads on hover only, editing fields are cramped, and timeline blocks have no click behaviour at all. Pioneers cannot comfortably view, edit, or build out stop details from within the board.

---

## Goal

When a Pioneer clicks any stop block (kanban card or timeline block), a 520px slide-over drawer opens from the right side of the screen. The drawer is image-first, fully editable, and non-blocking — the board behind dims but remains visible. Closing the drawer returns full attention to the board.

---

## Architecture

### State

No new state is introduced. The existing `expandedId` + `patchBlock` in `KanbanBoard` drives everything:

- `expandedId !== null` → drawer is open, showing that block
- `expandedId === null` → drawer is closed
- `onToggleExpand(id)` → sets `expandedId` (same handler as today)
- `onPatch(blockId, patch)` → updates block in `days` state (same as today)

### Component tree

```
KanbanBoard
  ├── KanbanView
  │   └── ActivityBlock  (onClick → onToggleExpand, removes inline BlockHub expansion)
  ├── TimelineView
  │   └── TimelineBlock  (onClick → onToggleExpand, NEW)
  ├── DrawerBackdrop     (NEW — fixed inset-0 z-40, shown when expandedId !== null)
  └── StopDrawer         (NEW — fixed right-0 top-0 h-full w-[520px] z-50)
        ├── HeroImage
        ├── EditableHeader
        ├── BlockHub       (existing, tabs unchanged)
        └── DrawerFooter
```

### Key constraint

`StopDrawer` and `DrawerBackdrop` are rendered at the `KanbanBoard` root, not inside any card or column. This avoids all overflow/z-index clipping issues from the scrollable card columns.

---

## Drawer Layout (top → bottom)

### 1. Hero image zone — 200px tall

- `BlockCardImage` rendered at full 520px drawer width
- Stop **title** overlaid at bottom-left in Playfair Display, white, `text-xl`, with a `text-shadow` for legibility
- **Category badge** + **time chip** float top-right over the image
- **Close button** (`✕`) top-left, always visible
- If image fails or is loading: category-color gradient fill (same pattern as LocalFlavor thumbnails), no layout shift

### 2. Editable header strip

Always visible below the image, outside any tab. Contains:

| Field | Control | Patch key |
|---|---|---|
| Title | Inline input (full width, Playfair Display style) | `title` |
| Time | `<input type="time">` | `time` |
| Category | `<select>` | `category` |
| Duration | `<input type="number">` (minutes) | `duration` |

- Single-click title → activates input. Blur or Enter → `onPatch({ title })` → returns to display
- Time, category, duration are always inputs (no display/edit toggle needed)

### 3. Tab bar — sticky

`DETAILS · ITEMS · LINKS · CONTACTS` — existing `BlockHub` tabs, visually unchanged. Sticky so it doesn't scroll away. Tab switch is instant (no animation); content area scrolls to top on tab change.

### 4. Tab content — scrollable

Existing `DetailsTab`, `ItemsTab`, `LinksTab`, `ContactsTab` components used verbatim. No internal changes.

### 5. Footer

Single destructive action: `[DELETE STOP]` in red mono font, full width, calls `onRemoveBlock(block.id)` then `onClose()`.

---

## Motion & Interaction

### Drawer open
- Trigger: `onToggleExpand(id)` called from kanban card or timeline block click
- `motion.div` animates `x: 520 → 0`, `opacity: 0 → 1`, 220ms `easeOut`
- Backdrop animates `opacity: 0 → 1`, 180ms, simultaneously

### Drawer close
- Triggers: backdrop click, `✕` button, `Escape` key
- `x: 0 → 520`, `opacity: 1 → 0`, 180ms `easeIn`
- Backdrop fades out simultaneously
- `Escape` handler: `useEffect` in `StopDrawer` listening `keydown`, cleaned up on unmount

### Backdrop
- `fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]`
- Board remains visible and **not** pointer-blocked — `pointer-events: none` on backdrop except the click-to-close area
- Actually: backdrop IS pointer-events-auto (clicking it closes drawer), but board interaction blocked while drawer open is acceptable UX

### Image crossfade
- Hero zone shows category-color gradient immediately (no layout shift)
- When image resolves: `opacity: 0 → 1` on `<img>`, 300ms ease

### Inline title edit
- Display: `<div onClick={startEdit}>` in Playfair Display
- Edit: `<input>` same font, full width, `onBlur` / `onKeyDown Enter` → `onPatch({ title })` → `setEditing(false)`

---

## Timeline blocks — click to open drawer

`TimelineBlock` currently has no click handler. Add:

```jsx
onClick={() => onToggleExpand(block.id)}
```

`onToggleExpand` is passed down: `TimelineView` receives it as a prop from `KanbanBoard`, passes it to each `TimelineBlock`. No other changes to `TimelineView` or `TimelineBlock` internals.

---

## What does NOT change

- `BlockHub` tab components (`DetailsTab`, `ItemsTab`, `LinksTab`, `ContactsTab`) — zero changes
- `patchBlock` / `updateBlock` logic in `KanbanBoard` — zero changes
- `ActivityBlock` drag-and-drop behaviour — zero changes
- The `expandedId` state variable name and setter — zero changes
- All existing `onPatch`, `onRemoveBlock` callbacks — zero changes

The only thing removed from `ActivityBlock` is the inline `BlockHub` render and the `BlockCardImage` render (both move into `StopDrawer`). The hover-image on the card is removed entirely.

---

## Files to create / modify

| File | Action |
|---|---|
| `src/components/itinerary/StopDrawer.jsx` | **Create** — new component |
| `src/components/itinerary/KanbanBoard.jsx` | **Modify** — render `StopDrawer` + `DrawerBackdrop` at root; remove inline `BlockHub` + `BlockCardImage` from `ActivityBlock`; pass `onToggleExpand` to `TimelineView` |
| `src/components/itinerary/TimelineBlock` (inside KanbanBoard.jsx) | **Modify** — add `onClick` + `onToggleExpand` prop |

---

## Out of scope

- Persisting itinerary to Supabase (separate task)
- Multi-stop selection
- Drawer resize handle
- Mobile layout (drawer becomes bottom sheet — future task)
