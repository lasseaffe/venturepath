# Card Images & Hero Redesign

**Date:** 2026-05-11  
**Status:** Approved  
**Scope:** VenturePath — `LaunchDashboard.jsx`, `KanbanBoard.jsx`

---

## Problem

Four related UI regressions affecting destination imagery:

1. `LaunchDashboard` hero ignores the active expedition's destination — always falls back to a hardcoded Torres del Paine image or generic default.
2. `PlannerHero` in the Itinerary board is 260px tall with 0.55 opacity — undersized and washed out.
3. Day-column header image strips are only 48px — barely a sliver.
4. Block card images always render (when expanded) using a destination image; the `ReportButton` is buried inside the image container and disappears when no image loads.

---

## Design

### 1. `LaunchDashboard.jsx` — dynamic hero per expedition

- Remove the static `HERO_IMAGES` dictionary.
- Import `useDestinationImage` and call `useDestinationImage(trip.destination, 'city', 0)`.
- Replace the hardcoded `heroImg` variable with `image?.url`.
- The existing base gradient already handles the null/loading case — no further changes needed.

### 2. `KanbanBoard.jsx` — four edits

#### A. `PlannerHero`
- Height: `260` → `360`
- Image opacity: `0.55` → `0.70`

#### B. `DayColumnHeaderImage`
- Height: `48` → `90` in three places: container div, loading skeleton div, empty fallback div.

#### C. `BlockCardImage` — add `visible` prop, remove `ReportButton`
- Add a `visible: boolean` prop.
- Wrap the image content in a div with `height: visible ? 120 : 0` and `transition: height 0.2s ease; overflow: hidden`.
- The hook still fetches on mount so the image is preloaded when hover triggers.
- Remove `ReportButton` from inside this component entirely.

#### D. `ActivityBlock` — widen reveal condition, add `ReportButton` to header
- Change render condition for `BlockCardImage` from `isExpanded` to `hovered || isExpanded`.
- Pass `visible={hovered || isExpanded}` prop.
- In the existing header row (right side, after the category badge), render `<ReportButton ... small />` conditionally on `hovered && !isGhost`.
- `ReportButton` receives `cityId={block.id}`, `cityName={block.title}`, `country=""`.
- No image props on the header-level `ReportButton` (image reporting remains inside `BlockCardImage` via `ImageAttribution`; the card-level button handles POI/title issues).

---

## Files Changed

| File | Change |
|---|---|
| `src/components/dashboard/LaunchDashboard.jsx` | Remove `HERO_IMAGES`, add `useDestinationImage` |
| `src/components/itinerary/KanbanBoard.jsx` | 4 targeted edits (PlannerHero, DayColumnHeaderImage, BlockCardImage, ActivityBlock) |

---

## Out of Scope

- No changes to `useDestinationImage` hook (sessionStorage logic is correct — empty arrays are not cached).
- No changes to `ReportButton` internals.
- No animation changes to day-column or PlannerHero images.
