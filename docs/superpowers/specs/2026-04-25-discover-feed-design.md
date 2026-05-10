# Discover Feed — Design Spec
Date: 2026-04-25

## Summary
A `/discover` page with a vertical swipe card stack. First content type: Dirty Soda recipes. Built generically so future types (Talks, CFM Insights) slot in without rewriting the mechanic.

## Architecture

### Pages / Files
- `src/app/discover/page.tsx` — page shell, tab strip, card stack state
- `src/components/swipe-card.tsx` — reusable gesture + animation component
- `src/components/nav.tsx` — add Discover nav link

### No new dependencies
Swipe gesture uses native pointer events. Animation uses CSS transform + transition. Confetti is a pure CSS/JS particle burst (no library).

## SwipeCard Component
Props: `card: SodaCard`, `onSwipeRight: () => void`, `onSwipeLeft: () => void`, `onDoubleTap: () => void`, `zIndex: number`, `active: boolean`.

Gesture logic:
- PointerDown → track start X/Y
- PointerMove → apply `translateX` + slight `rotate` based on delta
- PointerUp → if |deltaX| > threshold (80px): commit swipe; else snap back
- Double-tap detected by timing two taps < 300ms apart

Visual feedback:
- Swipe right: green tint overlay + "AMEN ✓" stamp
- Swipe left: red tint overlay + "SKIP" stamp
- Double-tap: confetti burst from tap point, Amen counter increments

## Card Anatomy
```
┌─────────────────────────────┐
│  [gradient bg from recipe]  │
│                             │
│  Recipe Name (bold, large)  │
│  @creator · 42 Amens        │
│                             │
│  [ingredient tags row]      │
│                             │
│  [Amen btn]  [Save btn]     │
└─────────────────────────────┘
```

## Data Shape
```ts
interface SodaCard {
  id: string;
  name: string;
  creator: string;
  ingredients: string[];
  amens: number;
  saves: number;
  gradientFrom: string;
  gradientTo: string;
  description: string;
}
```
12 cards seeded inline. Shape is API-ready — replace array with fetch later.

## Tab Strip
Three tabs: **Soda Lab** (active), **Talks** (coming soon), **Insights** (coming soon). Tabs for future types are visible but locked with a "Coming soon" tooltip on tap.

## Nav Integration
Add `Discover` between `Communities` and `Learn` in `nav.tsx`. Icon: `Sparkles` from lucide-react.

## Design Language
Follows existing HolyFlex palette — warm cream backgrounds, forest green accents, caramel CTAs. Card gradients derived from ingredient color associations (cola = dark amber, citrus = yellow-green, cream = ivory).
