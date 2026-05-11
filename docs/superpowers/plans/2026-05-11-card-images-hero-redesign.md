# Card Images & Hero Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix four destination-image regressions: dynamic hero on LaunchDashboard, bigger PlannerHero and day-column strips, and block cards that reveal images on hover/expand with a card-level ReportButton.

**Architecture:** Two files touched, four isolated edits. No new files, no new hooks, no new dependencies. The `useDestinationImage` hook and `ReportButton` component are already wired — this is purely about wiring them to the right places and adjusting sizes.

**Tech Stack:** React 18, Vite, Vitest + @testing-library/react (installed, no test script yet — use `npx vitest run`)

---

## File Map

| File | What changes |
|---|---|
| `src/components/dashboard/LaunchDashboard.jsx` | Remove `HERO_IMAGES`, add `useDestinationImage` hook call |
| `src/components/itinerary/KanbanBoard.jsx` | 4 edits: PlannerHero size, DayColumnHeaderImage size, BlockCardImage `visible` prop, ActivityBlock hover condition + header ReportButton |

---

### Task 1: LaunchDashboard — dynamic hero image

**Files:**
- Modify: `src/components/dashboard/LaunchDashboard.jsx:1-32`

- [ ] **Step 1: Add the `useDestinationImage` import**

Open `src/components/dashboard/LaunchDashboard.jsx`. After line 7 (the `useLabels` import), add:

```jsx
import { useDestinationImage } from '../../hooks/useDestinationImage';
```

- [ ] **Step 2: Remove the static `HERO_IMAGES` dict**

Delete these lines (lines 9-12):

```jsx
const HERO_IMAGES = {
  'Torres del Paine, Chile': 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1600&q=80',
  default: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1600&q=80',
};
```

- [ ] **Step 3: Replace `heroImg` with the hook**

Find and replace this line inside the component body:

```jsx
const heroImg = HERO_IMAGES[trip.destination] ?? HERO_IMAGES.default;
```

Replace with:

```jsx
const { image: heroImage } = useDestinationImage(trip.destination, 'city', 0);
```

- [ ] **Step 4: Update the hero `backgroundImage` binding**

Find this JSX (inside the `{/* Hero background */}` div):

```jsx
<div
  className="absolute inset-0 animate-ken-burns bg-cover bg-center"
  style={{ backgroundImage: `url(${heroImg})` }}
/>
```

Replace with:

```jsx
<div
  className="absolute inset-0 animate-ken-burns bg-cover bg-center"
  style={heroImage?.url ? { backgroundImage: `url(${heroImage.url})` } : {}}
/>
```

The existing base gradient div below it already acts as the fallback — no other changes needed.

- [ ] **Step 5: Verify manually**

Start the dev server (`npm run dev`, port 3001). Open the Home/Dashboard screen. The hero background should now show a Lille (or whatever the active expedition is) photo instead of the Patagonia mountain default. On first load it fetches from the API — subsequent loads use sessionStorage cache.

- [ ] **Step 6: Commit**

```bash
git add src/components/dashboard/LaunchDashboard.jsx
git commit -m "feat(dashboard): dynamic hero image per expedition destination"
```

---

### Task 2: PlannerHero — taller, more opaque

**Files:**
- Modify: `src/components/itinerary/KanbanBoard.jsx:513-560`

- [ ] **Step 1: Increase PlannerHero height**

Find (inside `function PlannerHero`):

```jsx
<div style={{ position: 'relative', width: '100%', height: 260, overflow: 'hidden', flexShrink: 0, borderRadius: '8px 8px 0 0' }}>
```

Change `height: 260` to `height: 360`:

```jsx
<div style={{ position: 'relative', width: '100%', height: 360, overflow: 'hidden', flexShrink: 0, borderRadius: '8px 8px 0 0' }}>
```

- [ ] **Step 2: Increase image opacity**

Find (inside the same `PlannerHero` function):

```jsx
            opacity: 0.55,
```

Change to:

```jsx
            opacity: 0.70,
```

- [ ] **Step 3: Verify manually**

Navigate to the Itinerary tab. The "Active Expedition" hero banner above the day columns should now be noticeably taller and the destination photo should be more visible.

- [ ] **Step 4: Commit**

```bash
git add src/components/itinerary/KanbanBoard.jsx
git commit -m "feat(itinerary): taller PlannerHero with higher image opacity"
```

---

### Task 3: DayColumnHeaderImage — taller strips

**Files:**
- Modify: `src/components/itinerary/KanbanBoard.jsx:484-508`

The function `DayColumnHeaderImage` has three hardcoded `48` height values that all need to become `90`.

- [ ] **Step 1: Update the loading skeleton height**

Find:

```jsx
    return (
      <div className="w-full animate-pulse" style={{ height: 48, background: '#1a2030' }} />
    );
```

Replace with:

```jsx
    return (
      <div className="w-full animate-pulse" style={{ height: 90, background: '#1a2030' }} />
    );
```

- [ ] **Step 2: Update the empty fallback height**

Find:

```jsx
      <div style={{ width: '100%', height: 48, flexShrink: 0, background: 'linear-gradient(90deg, #111316 0%, #1a1f26 100%)', borderBottom: '1px solid #1e2328' }} />
```

Replace with:

```jsx
      <div style={{ width: '100%', height: 90, flexShrink: 0, background: 'linear-gradient(90deg, #111316 0%, #1a1f26 100%)', borderBottom: '1px solid #1e2328' }} />
```

- [ ] **Step 3: Update the image container height**

Find:

```jsx
  return (
    <div className="relative overflow-hidden shrink-0" style={{ height: 48 }}>
```

Replace with:

```jsx
  return (
    <div className="relative overflow-hidden shrink-0" style={{ height: 90 }}>
```

- [ ] **Step 4: Verify manually**

Kanban view should show noticeably taller photo strips at the top of each day column. Day columns without a scraped image show a dark gradient strip instead.

- [ ] **Step 5: Commit**

```bash
git add src/components/itinerary/KanbanBoard.jsx
git commit -m "feat(itinerary): taller day-column destination image strips (48→90px)"
```

---

### Task 4: BlockCardImage — reveal on hover/expand, remove internal ReportButton

**Files:**
- Modify: `src/components/itinerary/KanbanBoard.jsx:997-1030` (BlockCardImage function)

- [ ] **Step 1: Add `visible` prop and height-transition wrapper**

Find the entire `BlockCardImage` function and replace it with:

```jsx
function BlockCardImage({ title, tripName, visible }) {
  const query = title || tripName;
  const { image, loading } = useDestinationImage(query, 'poi', 3);

  return (
    <div style={{ height: visible ? 120 : 0, overflow: 'hidden', transition: 'height 0.2s ease', position: 'relative', flexShrink: 0 }}>
      {loading && visible && (
        <div className="w-full animate-pulse" style={{ height: 120, background: '#1a2030' }} />
      )}
      {image?.url && (
        <>
          <img src={image.url} alt={title} className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(14,16,18,0.05) 0%, rgba(14,16,18,0.45) 100%)' }} />
          {image.author && <ImageAttribution attribution={image} />}
        </>
      )}
    </div>
  );
}
```

Key changes vs original:
- `visible` prop controls the container height (0 when hidden, 120 when shown)
- `transition: height 0.2s ease` gives the smooth reveal
- `ReportButton` is gone — it moves to the card header in Task 5

- [ ] **Step 2: Verify the component compiles**

```bash
cd /c/Users/lasse/Desktop/venturepath && npx eslint src/components/itinerary/KanbanBoard.jsx --max-warnings=0
```

Expected: no errors about `BlockCardImage`. (Existing lint suppressions may still fire — that's OK.)

- [ ] **Step 3: Commit**

```bash
git add src/components/itinerary/KanbanBoard.jsx
git commit -m "refactor(itinerary): BlockCardImage reveal on hover/expand via visible prop"
```

---

### Task 5: ActivityBlock — wire hover reveal + header ReportButton

**Files:**
- Modify: `src/components/itinerary/KanbanBoard.jsx` (ActivityBlock function, ~lines 1032-1105)

- [ ] **Step 1: Add `visible` prop to `BlockCardImage` call**

Inside `ActivityBlock`'s return, find the `isExpanded` block at the bottom:

```jsx
      {isExpanded && (
        <>
          <BlockCardImage title={block.title} tripName={tripName} />
          <BlockHub
```

Replace with (remove the conditional wrapper — `BlockCardImage` now handles its own visibility):

```jsx
      <BlockCardImage title={block.title} tripName={tripName} visible={hovered || isExpanded} />
      {isExpanded && (
        <>
          <BlockHub
```

- [ ] **Step 2: Add ReportButton import guard**

`ReportButton` is already imported at the top of `KanbanBoard.jsx` (line 13). No import change needed.

- [ ] **Step 3: Add ReportButton to the card header row**

Find the header row inside `ActivityBlock`:

```jsx
      <div className="flex items-center justify-between px-2.5 pt-2 pb-1">
        <div className="flex items-center gap-1.5">
          <CategoryIcon category={block.category} color={colors.text} size={14} />
          {block.time && (
            <span className="text-[10px] font-mono" style={{ color: '#E67E22' }}>{block.time}</span>
          )}
        </div>
        <span
          className="text-[8px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded"
          style={{ background: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}
        >
          {block.category}
        </span>
      </div>
```

Replace the right side `<span>` + closing `</div>` with a flex wrapper that includes `ReportButton`:

```jsx
      <div className="flex items-center justify-between px-2.5 pt-2 pb-1">
        <div className="flex items-center gap-1.5">
          <CategoryIcon category={block.category} color={colors.text} size={14} />
          {block.time && (
            <span className="text-[10px] font-mono" style={{ color: '#E67E22' }}>{block.time}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="text-[8px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded"
            style={{ background: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}
          >
            {block.category}
          </span>
          {hovered && !isGhost && (
            <ReportButton
              cityId={block.id}
              cityName={block.title}
              country=""
              small
            />
          )}
        </div>
      </div>
```

- [ ] **Step 4: Verify manually**

In the Kanban board, hover a block card. You should see:
- The ⚠ report button appear in the top-right of the card header (next to the category tag)
- If the block has a scraped image, the image strip should smoothly expand below the card body

Expand a card (click to expand). The image strip should remain visible.

- [ ] **Step 5: Lint check**

```bash
cd /c/Users/lasse/Desktop/venturepath && npx eslint src/components/itinerary/KanbanBoard.jsx --max-warnings=0
```

- [ ] **Step 6: Commit**

```bash
git add src/components/itinerary/KanbanBoard.jsx
git commit -m "feat(itinerary): block card image reveals on hover/expand, ReportButton in card header"
```

---

## Self-Review

**Spec coverage:**
- ✅ LaunchDashboard hero dynamic → Task 1
- ✅ PlannerHero taller + more opaque → Task 2
- ✅ DayColumnHeaderImage taller → Task 3
- ✅ BlockCardImage hover/expand reveal → Tasks 4 + 5
- ✅ ReportButton at card top-right → Task 5
- ✅ Category icon stays in default card state (CategoryIcon already in header, untouched)

**Placeholder scan:** No TBDs, all code blocks complete.

**Type consistency:** `visible` prop used as `visible={hovered || isExpanded}` in Task 5 matches `visible` destructured in Task 4. `heroImage` (renamed from `heroImg`) used consistently through Task 1.
