# SwipeDeck — Design Spec
**Date:** 2026-05-10  
**Status:** Approved

---

## Context

VenturePath already has a swipe card component (`src/components/swipe-card.tsx`) built for the Dirty Soda Lab recipe discovery flow. The goal is to generalize that pattern into a reusable `SwipeDeck` system that works across three VenturePath contexts:

1. **Expedition mode** — swiping full Pro-Path trips from VentureVault
2. **Spot mode** — swiping individual POIs/stops from NearbyDrawer or MustSee
3. **Filtered mode** — swiping a pre-filtered list of search results, each labeled with its filter-match reason

This makes discovery feel native to VenturePath rather than a one-off gimmick.

---

## Architecture

### `SwipeDeck` component
**Path:** `src/components/swipe/SwipeDeck.tsx`

Owns:
- Gesture detection (pointer events, 80px threshold — same as existing `swipe-card.tsx`)
- Stack visualization (3 cards visible, each offset by 8px y + 0.02 scale decrease)
- Swipe physics (rotation up to 15deg, fly-out animation via framer-motion)
- Right/left action routing (contextual, see Actions section)
- Soft-pass recycling (left-swiped cards go to `passed[]`, appended when main deck empties)
- Calls `useSwipePreferences.record()` on every swipe decision

Props:
```ts
interface SwipeDeckProps {
  mode: 'expedition' | 'spot' | 'filtered'
  cards: ExpeditionCardData[] | SpotCardData[] | FilteredCardData[]
  onClose: () => void
}
```

Entry points render `SwipeDeck` in a full-screen modal/sheet (reuse `POIDetailSheet` full-height pattern).

---

### Card face components
**Path:** `src/components/swipe/cards/`

**`ExpeditionCard.tsx`**
Displays: hero image, name, architect handle, difficulty badge, days, distance, rating, tags

**`SpotCard.tsx`**
Displays: hero image (Mapillary/OTM photo, fallback gradient Midnight→Ember), name, category icon, rating, distance from active leg, tags

**`FilteredResultCard.tsx`**
Same as SpotCard + a "Matches: food · budget · walkable" filter-reason chip at the bottom

All cards: missing hero image → gradient fallback using `#0E1012` → `#E67E22` (never a broken img).

---

### `useSwipePreferences` hook
**Path:** `src/hooks/useSwipePreferences.ts`

Persists to localStorage key `vp-swipe-prefs`.

```ts
interface SwipePref {
  itemId: string
  mode: 'expedition' | 'spot' | 'filtered'
  decision: 'right' | 'left'
  timestamp: number
  tags: string[]
}

// Exposed API
record(itemId, mode, decision, tags): void
getAffinityScore(tags: string[]): number  // 0–1 float
```

`getAffinityScore` computes tag overlap against right-swiped history weighted by recency. Entry points call this to pre-sort `cards` before passing to `SwipeDeck`.

---

### Wishlist
**Path:** localStorage key `vp-wishlist`

```ts
interface WishlistItem {
  id: string
  mode: 'expedition' | 'spot'
  item: ExpeditionCardData | SpotCardData
  savedAt: number
}
```

No backend for MVP. Append-only, no dedup required at this stage.

---

## Swipe Actions

### Right-swipe (contextual)

| Mode | Context | Action |
|---|---|---|
| expedition | Active squad | Nominate to Ledger Workbench (dispatch to `ExpeditionContext`) |
| expedition | Solo, active trip | Clone Pro-Path into new expedition (existing VentureVault clone flow) |
| expedition | No active trip | Bookmark to `vp-wishlist` |
| spot / filtered | Active trip | Nominate stop to current leg objectives (`ADD_OBJECTIVE` → `useTripStore`) |
| spot / filtered | No active trip | Bookmark to `vp-wishlist` |

### Left-swipe (all modes)
- Soft pass — card goes to `passed[]` inside `SwipeDeck`
- Records `decision: 'left'` + tags in `useSwipePreferences`
- Future deck orderings de-prioritize matching tags (lower affinity score = shown later)

### Squad-specific
- When squad size > 1 and right-swipe would nominate: check if item already vetoed by another member → show VP-2 veto animation if so
- Left-swipe in squad = personal pass only, not a squad veto

---

## Contextual Entry Points

| Location | Trigger | Mode |
|---|---|---|
| VentureVault | "Swipe Expeditions" button | `expedition` |
| NearbyDrawer | "Swipe Results" button | `spot` |
| MustSee | "Swipe Results" button | `spot` |
| Any search results list | "Swipe this list" CTA | `filtered` |

Each entry point:
1. Fetches/uses its existing data array
2. Sorts by `getAffinityScore(item.tags)` descending
3. Renders `<SwipeDeck mode={...} cards={sorted} onClose={...} />` in a full-screen sheet

---

## Empty & Error States

- **`cards` prop is empty** → branded empty state: Ember icon, "No Pioneers have charted this territory yet", CTA to broaden filters. Never a blank div.
- **Deck exhausted** → impossible by design (soft-pass recycling). Safety fallback: same empty state.
- **Right-swipe action fails** → non-blocking toast, card returns to top of deck for retry.
- **No hero image** → Midnight→Ember gradient fallback (never broken img).

---

## Design Tokens Used

- `#0E1012` Midnight — card backgrounds, gradient start
- `#E67E22` Ember — swipe-right indicator, gradient end, action chips
- `#D9C5B2` Sandstone — secondary text, tag labels
- Headings: Playfair Display
- Data/stats: JetBrains Mono
- Body: Inter

---

## Verification

- Swipe right in each mode × each context variant → correct action fires
- Swipe left → card reappears after deck cycles through
- Open deck a second time → affinity-sorted order differs from first open
- Squad right-swipe → item visible in Ledger Workbench
- Solo right-swipe (no trip) → `vp-wishlist` localStorage entry written
- Empty `cards` prop → branded empty state renders, no console errors
- No hero image available → gradient fallback renders, no broken img

---

## Files to Create

- `src/components/swipe/SwipeDeck.tsx`
- `src/components/swipe/cards/ExpeditionCard.tsx`
- `src/components/swipe/cards/SpotCard.tsx`
- `src/components/swipe/cards/FilteredResultCard.tsx`
- `src/hooks/useSwipePreferences.ts`

## Files to Modify

- `src/components/discovery/VentureVault.jsx` — add "Swipe Expeditions" entry point
- `src/components/nearby/NearbyDrawer.jsx` — add "Swipe Results" entry point
- `src/components/discovery/MustSee.jsx` — add "Swipe Results" entry point
