# Stop Drawer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the cramped inline BlockHub card expansion with a 520px image-first slide-over drawer that opens when any stop block is clicked in kanban or timeline view.

**Architecture:** The existing `expandedId` state in `KanbanBoard` already drives which block is "selected" — we repurpose it to control drawer open/close. A new `StopDrawer` component renders fixed to the right edge of the viewport, fed the selected block and `onPatch`/`onClose` callbacks. The board dims behind a backdrop but remains fully visible. No new state, no new data fetching.

**Tech Stack:** React 18, Framer Motion (already installed), Tailwind CSS, existing `BlockHub` tab components, existing `BlockCardImage` + `CATEGORY_COLORS` (extracted to shared file)

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/components/itinerary/itineraryConstants.js` | **Create** | `CATEGORY_COLORS` map — single source of truth |
| `src/components/itinerary/StopDrawer.jsx` | **Create** | Full drawer UI: hero image, editable header, BlockHub tabs, footer |
| `src/components/itinerary/KanbanBoard.jsx` | **Modify** | Import from constants; render `StopDrawer`+backdrop at root; strip inline expansion from `ActivityBlock`; wire `onToggleExpand` into `TimelineView`/`TimelineBlock` |

---

## Task 1: Extract CATEGORY_COLORS to shared constants file

**Files:**
- Create: `src/components/itinerary/itineraryConstants.js`
- Modify: `src/components/itinerary/KanbanBoard.jsx` (import, remove local definition)

This avoids a circular import when `StopDrawer` needs the color map.

- [ ] **Step 1: Create the constants file**

Create `src/components/itinerary/itineraryConstants.js`:

```js
export const CATEGORY_COLORS = {
  transport:     { bg: 'rgba(59,130,246,0.14)',  border: 'rgba(59,130,246,0.4)',  text: '#60A5FA', dot: '#3B82F6' },
  logistics:     { bg: 'rgba(234,179,8,0.1)',    border: 'rgba(234,179,8,0.35)', text: '#FBBF24', dot: '#EAB308' },
  food:          { bg: 'rgba(34,197,94,0.1)',    border: 'rgba(34,197,94,0.35)', text: '#4ADE80', dot: '#22C55E' },
  activity:      { bg: 'rgba(230,126,34,0.12)', border: 'rgba(230,126,34,0.4)', text: '#E67E22', dot: '#E67E22' },
  rest:          { bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.2)', text: '#94A3B8', dot: '#64748B' },
  accommodation: { bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.35)', text: '#A78BFA', dot: '#7C3AED' },
  default:       { bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.2)', text: '#94A3B8', dot: '#64748B' },
};
```

- [ ] **Step 2: Update KanbanBoard.jsx to import from constants**

At the top of `KanbanBoard.jsx`, add:
```js
import { CATEGORY_COLORS } from './itineraryConstants';
```

Then delete the local `CATEGORY_COLORS` object (lines 68–76 in the current file).

- [ ] **Step 3: Verify the app still renders correctly**

Run `npm run dev` (port 3001). Open the ITINERARY tab. Confirm day columns render with correct category colors (blue for transport, green for food, orange for activity). No console errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/itinerary/itineraryConstants.js src/components/itinerary/KanbanBoard.jsx
git commit -m "refactor: extract CATEGORY_COLORS to itineraryConstants.js"
```

---

## Task 2: Create StopDrawer component

**Files:**
- Create: `src/components/itinerary/StopDrawer.jsx`

This is the core new component. It receives `block`, `onPatch`, `onClose`, `onRemove`, `tripName` as props.

- [ ] **Step 1: Create StopDrawer.jsx**

Create `src/components/itinerary/StopDrawer.jsx`:

```jsx
import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { CATEGORY_COLORS } from './itineraryConstants';
import { useDestinationImage } from '../../hooks/useDestinationImage';
import ImageAttribution from '../ui/ImageAttribution';
import BlockHub from './BlockHub';

const inputCls = "bg-[#0E1012] border border-[#2a2f36] rounded px-2 py-1 text-[11px] font-mono text-white focus:outline-none focus:border-[#E67E22] w-full";

function HeroZone({ block, tripName, onClose }) {
  const colors = CATEGORY_COLORS[block.category] ?? CATEGORY_COLORS.default;
  const { image, loading } = useDestinationImage(block.title || tripName, 'poi', 3);
  const [imgLoaded, setImgLoaded] = useState(false);

  return (
    <div
      className="relative shrink-0"
      style={{
        height: 200,
        background: image?.url && imgLoaded
          ? undefined
          : `linear-gradient(135deg, ${colors.dot}22, ${colors.dot}08)`,
      }}
    >
      {image?.url && (
        <img
          src={image.url}
          alt={block.title}
          onLoad={() => setImgLoaded(true)}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: imgLoaded ? 1 : 0, transition: 'opacity 300ms ease' }}
        />
      )}
      {/* Gradient overlay for text legibility */}
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(to bottom, rgba(14,16,18,0.2) 0%, rgba(14,16,18,0.75) 100%)' }}
      />

      {/* Close button — top left */}
      <button
        onClick={onClose}
        className="absolute top-3 left-3 z-10 w-7 h-7 flex items-center justify-center rounded font-mono text-white/70 hover:text-white hover:bg-black/40 transition-colors text-sm"
      >
        ✕
      </button>

      {/* Category badge + time — top right */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
        {block.time && (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded" style={{ background: 'rgba(0,0,0,0.6)', color: '#E67E22' }}>
            {block.time}
          </span>
        )}
        <span
          className="text-[9px] font-mono px-2 py-0.5 rounded tracking-widest uppercase"
          style={{ background: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}
        >
          {block.category}
        </span>
      </div>

      {/* Title overlay — bottom left */}
      <div className="absolute bottom-3 left-4 right-4 z-10">
        <p
          className="font-editorial text-xl text-white leading-tight"
          style={{ textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}
        >
          {block.title}
        </p>
      </div>

      {image?.author && (
        <div className="absolute bottom-1 right-2 z-10">
          <ImageAttribution attribution={image} />
        </div>
      )}
    </div>
  );
}

function EditableHeader({ block, onPatch }) {
  const [editing, setEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState(block.title);
  const inputRef = useRef(null);

  useEffect(() => {
    setTitleDraft(block.title);
    setEditing(false);
  }, [block.id]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function commitTitle() {
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== block.title) onPatch({ title: trimmed });
    setEditing(false);
  }

  return (
    <div className="px-4 py-3 flex flex-col gap-2 shrink-0" style={{ borderBottom: '1px solid #1e2328' }}>
      {/* Editable title */}
      {editing ? (
        <input
          ref={inputRef}
          value={titleDraft}
          onChange={e => setTitleDraft(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={e => { if (e.key === 'Enter') commitTitle(); if (e.key === 'Escape') setEditing(false); }}
          className="font-editorial text-lg text-white bg-transparent border-b border-[#E67E22] focus:outline-none w-full pb-0.5"
        />
      ) : (
        <div
          onClick={() => setEditing(true)}
          className="font-editorial text-lg text-white cursor-text hover:text-[#E67E22] transition-colors"
          title="Click to edit"
        >
          {block.title}
        </div>
      )}

      {/* Time / category / duration row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-[8px] font-mono tracking-widest text-[var(--text-muted)] uppercase">Time</span>
          <input
            defaultValue={block.time ?? ''}
            onBlur={e => onPatch({ time: e.target.value })}
            type="time"
            className={inputCls}
          />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[8px] font-mono tracking-widest text-[var(--text-muted)] uppercase">Category</span>
          <select
            defaultValue={block.category}
            onChange={e => onPatch({ category: e.target.value })}
            className={inputCls}
          >
            {Object.keys(CATEGORY_COLORS).filter(k => k !== 'default').map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[8px] font-mono tracking-widest text-[var(--text-muted)] uppercase">Duration (min)</span>
          <input
            defaultValue={block.duration ?? ''}
            onBlur={e => onPatch({ duration: e.target.value ? Number(e.target.value) : undefined })}
            type="number"
            className={inputCls}
          />
        </div>
      </div>
    </div>
  );
}

export default function StopDrawer({ block, onPatch, onClose, onRemove, tripName }) {
  const [activeTab, setActiveTab] = useState('DETAILS');

  // Reset tab when a different block is opened
  useEffect(() => { setActiveTab('DETAILS'); }, [block?.id]);

  // Escape key closes drawer
  useEffect(() => {
    function handler(e) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!block) return null;

  function handlePatch(patch) {
    onPatch(block.id, patch);
  }

  function handleDelete() {
    onRemove(block.id);
    onClose();
  }

  return (
    <motion.div
      initial={{ x: 520, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 520, opacity: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="fixed top-0 right-0 h-full z-50 flex flex-col overflow-hidden"
      style={{
        width: 520,
        background: '#0E1012',
        borderLeft: '1px solid #1e2328',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.6)',
      }}
    >
      {/* Hero */}
      <HeroZone block={block} tripName={tripName} onClose={onClose} />

      {/* Editable header */}
      <EditableHeader block={block} onPatch={handlePatch} />

      {/* Sticky tab bar + scrollable content */}
      <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
        <BlockHub
          block={block}
          onPatch={handlePatch}
          activeTab={activeTab}
          onTabChange={tab => { setActiveTab(tab); }}
        />
      </div>

      {/* Footer */}
      <div className="shrink-0 px-4 py-3" style={{ borderTop: '1px solid #1e2328' }}>
        <button
          onClick={handleDelete}
          className="w-full py-2 text-[10px] font-mono tracking-widest rounded border border-red-800/50 text-red-400 hover:bg-red-900/20 hover:border-red-700 transition-colors"
        >
          [DELETE STOP]
        </button>
      </div>
    </motion.div>
  );
}
```

- [ ] **Step 2: Verify the file has no import errors**

Run `npm run dev`. Check the terminal — no "Cannot find module" or "is not exported" errors from `StopDrawer.jsx`. (The component isn't rendered yet so no visual check needed.)

- [ ] **Step 3: Commit**

```bash
git add src/components/itinerary/StopDrawer.jsx
git commit -m "feat: add StopDrawer component — image-first 520px slide-over"
```

---

## Task 3: Wire StopDrawer into KanbanBoard

**Files:**
- Modify: `src/components/itinerary/KanbanBoard.jsx`

Three changes in this file:
1. Import `StopDrawer` and render it + backdrop at the `KanbanBoard` root
2. Strip inline `BlockHub` + `BlockCardImage` render from `ActivityBlock`
3. Pass `onToggleExpand` down to `TimelineView` → `TimelineBlock`

- [ ] **Step 1: Add StopDrawer import to KanbanBoard.jsx**

At the top of `KanbanBoard.jsx`, add alongside existing imports:

```js
import { AnimatePresence, motion } from 'framer-motion'; // already imported
import StopDrawer from './StopDrawer';
```

- [ ] **Step 2: Render drawer + backdrop at KanbanBoard root**

Find the closing `</div>` of the `KanbanBoard` return (currently wraps everything in `<div data-tour="itinerary" className="flex flex-col gap-3">`).

Replace that closing structure so the full return looks like:

```jsx
return (
  <>
    <div data-tour="itinerary" className="flex flex-col gap-3">
      {/* ... all existing children unchanged ... */}
    </div>

    {/* Drawer backdrop + slide-over */}
    <AnimatePresence>
      {expandedId && (() => {
        const expandedBlock = days.flatMap(d => d.blocks).find(b => b.id === expandedId);
        return expandedBlock ? (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
              onClick={() => setExpandedId(null)}
            />
            <StopDrawer
              key="drawer"
              block={expandedBlock}
              tripName={tripName}
              onPatch={patchBlock}
              onClose={() => setExpandedId(null)}
              onRemove={removeBlock}
            />
          </>
        ) : null;
      })()}
    </AnimatePresence>
  </>
);
```

Note: `setExpandedId` is the setter from `const [expandedId, setExpandedId] = useState(null)` — it's already in scope. `patchBlock` and `removeBlock` are already defined in `KanbanBoard`.

- [ ] **Step 3: Strip inline expansion from ActivityBlock**

In the `ActivityBlock` function (around line 1018), find and remove these two blocks inside the JSX return:

```jsx
// REMOVE this:
<BlockCardImage title={block.title} tripName={tripName} visible={hovered || isExpanded} />

// REMOVE this:
{isExpanded && (
  <>
    <BlockHub
      block={block}
      onPatch={patch => onPatch(block.id, patch)}
      activeTab={expandedTab}
      onTabChange={onTabChange}
    />
  </>
)}
```

Also remove the now-unused props from `ActivityBlock`'s function signature: `isExpanded`, `onToggleExpand`, `onPatch`, `onTabChange`, `expandedTab`, `tripName`. Keep only: `block`, `isGhost`, `isActive`, `onDragStart`, `onDragEnd`, `onRemove`.

The `onClick` on the outer `div` already calls `onToggleExpand(block.id)` — keep that. The drawer will handle the rest.

- [ ] **Step 4: Clean up unused props passed to ActivityBlock in KanbanView**

In the `KanbanView` component, find where `ActivityBlock` is rendered (around line 688). Remove these props that are no longer used by `ActivityBlock`:

```jsx
// Remove from ActivityBlock render call:
isExpanded={expandedId === block.id}
onToggleExpand={onToggleExpand}
onPatch={onPatch}
expandedTab={expandedTab}
onTabChange={onTabChange}
tripName={tripName}
```

Keep: `block`, `isGhost`, `isActive`, `onDragStart`, `onDragEnd`, `onRemove`.

Also clean up the `KanbanView` function signature — remove `expandedId`, `expandedTab`, `onToggleExpand`, `onPatch`, `onTabChange` from its props (they are no longer forwarded to `ActivityBlock`). Keep `activeStopId` since that's used for the map pin highlight.

- [ ] **Step 5: Verify drawer opens from kanban cards**

Run `npm run dev`. Open ITINERARY tab. Click any stop card. Confirm:
- Board dims with dark overlay
- Drawer slides in from the right at 520px width
- Hero image zone shows (gradient immediately, image crossfades in)
- Title, time, category, duration fields are visible and editable
- DETAILS / ITEMS / LINKS / CONTACTS tabs work
- Clicking backdrop closes drawer
- Pressing Escape closes drawer
- ✕ button closes drawer

- [ ] **Step 6: Commit**

```bash
git add src/components/itinerary/KanbanBoard.jsx
git commit -m "feat: wire StopDrawer into KanbanBoard — replaces inline expansion"
```

---

## Task 4: Wire onToggleExpand into TimelineView and TimelineBlock

**Files:**
- Modify: `src/components/itinerary/KanbanBoard.jsx` (TimelineView and TimelineBlock functions, both inside this file)

- [ ] **Step 1: Add onToggleExpand prop to TimelineView**

Find the `TimelineView` function signature (around line 749):

```jsx
function TimelineView({ days, onRemoveBlock }) {
```

Change to:

```jsx
function TimelineView({ days, onRemoveBlock, onToggleExpand }) {
```

- [ ] **Step 2: Pass onToggleExpand to each TimelineBlock**

Inside `TimelineView`, find where `TimelineBlock` is rendered:

```jsx
<TimelineBlock
  key={block.id}
  block={block}
  top={top}
  height={height}
  colors={colors}
  onRemove={() => onRemoveBlock(block.id)}
/>
```

Add the `onToggleExpand` prop:

```jsx
<TimelineBlock
  key={block.id}
  block={block}
  top={top}
  height={height}
  colors={colors}
  onRemove={() => onRemoveBlock(block.id)}
  onToggleExpand={onToggleExpand}
/>
```

- [ ] **Step 3: Add onClick to TimelineBlock**

Find the `TimelineBlock` function signature (around line 925):

```jsx
function TimelineBlock({ block, top, height, colors, onRemove }) {
```

Change to:

```jsx
function TimelineBlock({ block, top, height, colors, onRemove, onToggleExpand }) {
```

Find the outer `div` of `TimelineBlock` (the one with `className="absolute left-1 right-1 rounded overflow-hidden transition-all"`). Add `onClick`:

```jsx
onClick={() => onToggleExpand?.(block.id)}
```

Also change `cursor: 'pointer'` in its style (it's already there as `cursor: 'pointer'`) — no change needed there.

- [ ] **Step 4: Pass onToggleExpand when rendering TimelineView in KanbanBoard**

Find where `TimelineView` is rendered in the `KanbanBoard` return (around line 449):

```jsx
<TimelineView
  days={days}
  onRemoveBlock={removeBlock}
/>
```

Change to:

```jsx
<TimelineView
  days={days}
  onRemoveBlock={removeBlock}
  onToggleExpand={id => {
    setExpandedId(prev => prev === id ? null : id);
    setExpandedTab('DETAILS');
  }}
/>
```

- [ ] **Step 5: Verify drawer opens from timeline blocks**

Run `npm run dev`. Switch to TIMELINE view. Click any colored block. Confirm:
- Drawer slides in from the right
- Correct block title, time, category are shown
- All tabs work
- Closing the drawer works via backdrop, Escape, and ✕

- [ ] **Step 6: Commit**

```bash
git add src/components/itinerary/KanbanBoard.jsx
git commit -m "feat: timeline blocks now open StopDrawer on click"
```

---

## Task 5: Polish — DELETE STOP from drawer removes from correct day

**Files:**
- Modify: `src/components/itinerary/KanbanBoard.jsx` (verify `removeBlock` works correctly)

This is a verification + visual polish step, not a code change.

- [ ] **Step 1: Verify delete works end-to-end**

1. Open the ITINERARY tab in kanban view
2. Click a stop card — drawer opens
3. Click `[DELETE STOP]` in the drawer footer
4. Confirm: drawer closes, stop is removed from the day column
5. Confirm: no console errors

- [ ] **Step 2: Verify DELETE works from timeline view**

1. Switch to TIMELINE view
2. Click a timeline block — drawer opens
3. Click `[DELETE STOP]`
4. Confirm: drawer closes, block disappears from the timeline

- [ ] **Step 3: Commit final cleanup if any console warnings were fixed**

If no warnings, skip commit. If you fixed anything:

```bash
git add src/components/itinerary/KanbanBoard.jsx src/components/itinerary/StopDrawer.jsx
git commit -m "fix: stop drawer delete and edge case cleanup"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|---|---|
| Slide-over drawer, 520px, fixed right | Task 2 — StopDrawer `w-[520px] fixed right-0` |
| Framer Motion `x: 520→0`, 220ms easeOut | Task 2 — `motion.div` with transition |
| Backdrop `bg-black/40 backdrop-blur-[2px]` dims board | Task 3 Step 2 |
| Clicking backdrop closes drawer | Task 3 Step 2 — `onClick={() => setExpandedId(null)}` |
| Escape key closes drawer | Task 2 — `useEffect` keydown handler |
| ✕ button closes drawer | Task 2 — `HeroZone` close button |
| Hero image 200px, full width, crossfade 300ms | Task 2 — `HeroZone` with `opacity` transition |
| Category gradient fallback if no image | Task 2 — `background` on hero div |
| Title overlay bottom-left, Playfair Display | Task 2 — `font-editorial text-xl` |
| Category badge + time chip top-right | Task 2 — `HeroZone` top-right section |
| Editable header: title, time, category, duration | Task 2 — `EditableHeader` |
| Inline title edit: click → input, blur/Enter → patch | Task 2 — `editing` state in `EditableHeader` |
| Sticky tab bar + scrollable content | Task 2 — `BlockHub` in `flex-1 overflow-y-auto` |
| DETAILS/ITEMS/LINKS/CONTACTS tabs unchanged | Task 2 — `BlockHub` used verbatim |
| Tab resets to DETAILS on new block | Task 2 — `useEffect` on `block.id` |
| Footer `[DELETE STOP]` → remove + close | Task 2 — `handleDelete` fn |
| Remove inline BlockHub from ActivityBlock | Task 3 Step 3 |
| Remove BlockCardImage hover from ActivityBlock | Task 3 Step 3 |
| Timeline blocks get onClick → drawer | Task 4 |
| CATEGORY_COLORS extracted to shared file | Task 1 |

All spec requirements covered. No gaps.

**Placeholder scan:** No TBDs, TODOs, or vague steps. All code is complete.

**Type consistency:**
- `onPatch(block.id, patch)` — called as `patchBlock(blockId, patch)` in `KanbanBoard`. `StopDrawer` receives `onPatch` and calls `onPatch(block.id, patch)`. Matches `patchBlock` signature. ✓
- `onRemove(block.id)` — maps to `removeBlock(blockId)` in `KanbanBoard`. ✓
- `setExpandedId` — already in scope in `KanbanBoard`, same name throughout. ✓
- `expandedBlock` lookup uses `days.flatMap(d => d.blocks).find(b => b.id === expandedId)` — correct. ✓
