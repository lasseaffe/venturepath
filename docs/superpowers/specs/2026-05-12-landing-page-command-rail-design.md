# Landing Page — Expedition Command Rail

**Date:** 2026-05-12  
**Status:** Approved  
**Scope:** LaunchDashboard.jsx + new CommandRail component

---

## Goal

Redesign the VenturePath landing page (`dashboard` view) to:
1. Replace the current always-wide left glass panel and the narrow Sidebar.jsx with a single **Expedition Command Rail** — a hover-expand sidebar inspired by What's Cooking's `app-nav.tsx` pattern
2. Surface all 6 major features as **interactive showcase cards** in a horizontal scroll row
3. Make the dashboard a genuine stepstone into every page — every card navigates on click

---

## Zone 1 — Command Rail (replaces left panel + Sidebar.jsx)

### Collapsed state — 64px wide

| Slot | Content |
|------|---------|
| Top | VP diamond logo mark (SVG, not wordmark) |
| Nav | Icon-only buttons, stacked vertically |
| Active indicator | 3px left border in Ember `#E67E22` on current view |
| Bottom | Theme cycle icon · Profile avatar circle (initials) |

### Expanded state — 280px wide, on hover

**Top — Brand + Nav**
- "VenturePath" wordmark (Playfair Display) + theme toggle button (right-aligned label, same pattern as WC)
- Nav groups with small uppercase group headers (JetBrains Mono, 10px, muted):
  - *Expedition* → Dashboard · Trip Planner
  - *Discover* → VentureVault · AR Ghost Tours
  - *Command* → Tactical Mode · Ledger Workbench · SOS
- Each item: icon (20px, Ember on active) + label + `→` on hover

**Middle — Active Trip** (below divider)
- Trip name, truncated, Playfair Display 14px, white
- `destination · Xd · Xkm` in JetBrains Mono, muted
- Status pill (PLANNING / ACTIVE / COMPLETE)

**Bottom — Squad** (below divider)
- Each member: avatar emoji + name + single-line weight bar (`X.X/Xkg`)
- Bar fill: Ember; overflow: `--status-alert` red

**Very bottom** (pinned to rail floor)
- Profile mini-card: name + `$X earnings` + "View →" link
- Sign out icon button

### Transition
- `width` transition: `0.35s cubic-bezier(0.4, 0, 0.2, 1)` — same easing as WC's `app-nav.tsx`
- Rail background: `rgba(0,0,0,0.25)` + `backdrop-filter: blur(14px)` floating over hero
- Labels fade in with `opacity` transition (delay ~80ms) to prevent text flash during collapse

### File
New component: `src/components/layout/CommandRail.jsx`  
Replaces: `src/components/layout/Sidebar.jsx` (retired) + the left panel JSX currently inside `LaunchDashboard.jsx`

---

## Zone 2 — Hero Strip (Active Trip Banner)

Pinned at top of right content area. Full width minus rail. Height: ~120px.

**Left → Right layout:**
- Label `YOUR EXPEDITION` (mono, 10px, muted)
- Trip name — Playfair Display, `clamp(1.5rem, 3vw, 2.5rem)`, white
- `destination · Xd · Xkm` — JetBrains Mono, muted
- Departure `→` Return dates
- Status pill

**Far right:**
- "Start Planning →" CTA — Ember `#E67E22`, pill shape, `font-semibold`

**Background:** `rgba(0,0,0,0.35)` glass over the hero image. No separate background color.

---

## Zone 3 — Feature Card Row (Horizontal Scroll)

Below the hero strip. Fills remaining viewport height. Single horizontal scroll row.

### Scroll container
- `overflow-x: auto`, hidden scrollbar (`scrollbar-width: none`)
- Right edge: `linear-gradient(to left, rgba(0,0,0,0.6), transparent)` fade as scroll hint
- `gap: 16px`, `padding: 24px`

### Card dimensions
- Resting: `240px × (remaining height - 48px)` — tall cards
- Hovered: `scale(1.03)` + `box-shadow: 0 20px 60px rgba(0,0,0,0.4)`

### Card anatomy — resting state
| Element | Spec |
|---------|------|
| Icon | Lucide, 32px, Ember `#E67E22` |
| Feature name | Playfair Display, 18px, white |
| Tagline | JetBrains Mono, 11px, `rgba(255,255,255,0.55)` |
| Status badge (where relevant) | `X members synced`, small pill |
| Background | `rgba(255,255,255,0.07)` + `backdrop-filter: blur(10px)` glass |
| Border | `1px solid rgba(255,255,255,0.1)` |

### Card anatomy — hover state (expand in place)
- Teaser list: 2–3 bullet points appear (fade in, `translateY(8px → 0)`)
- "Enter →" CTA button in Ember at card bottom
- Card border brightens to `rgba(230,126,34,0.4)` (Ember tint)

### Card anatomy — click
- Calls the appropriate navigation handler passed from `App.jsx`
- No intermediate screen — direct navigation

### The 6 cards

| # | Name | Icon | Handler | Squad badge | Teaser bullets |
|---|------|------|---------|-------------|----------------|
| 1 | Trip Planner | `Map` | `onEnterTrip()` | — | Plan legs & itinerary · Set transport per leg · Budget tracker |
| 2 | Squad Sync | `Users` | `onEnterTrip()` (squad tab) | "X members synced" | Live weight balance · Real-time manifest sync · Status badges |
| 3 | VentureVault | `BookOpen` | `onOpenVault()` | — | Browse 200+ Pro-Paths · Clone in 3 taps · Earn as Architect |
| 4 | Tactical Mode | `Crosshair` | cycles theme to tactical + `onEnterTrip()` | — | Offline-ready · SOS beacon · Emergency contacts |
| 5 | AR Ghost Tours | `Camera` | AR view (future) | — | Location-anchored history · GPS-tagged narratives · Walk the past |
| 6 | Ledger Workbench | `Scale` | `onEnterTrip()` (ledger tab) | — | Squad nominations · Vote + veto · Decision history |

---

## Background Layer (unchanged)

- `useDestinationImage` hero behind everything — rail and cards float as glass panels over it
- Ken Burns animation stays
- Gradient: `linear-gradient(to right, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.35) 50%, rgba(0,0,0,0.15) 100%)`
- Darker on left for rail legibility, lighter on right for card contrast

---

## What Gets Removed

| Removed | Replaced by |
|---------|-------------|
| Activity ticker bar | Squad status badge on Squad Sync card |
| Wide left glass panel (in `LaunchDashboard.jsx`) | CommandRail collapsed/expanded state |
| Narrow `Sidebar.jsx` icon bar | CommandRail collapsed state |
| Right panel trip stats grid | Hero Strip |
| Right panel featured trips horizontal scroll | Feature Card Row |
| Right panel CTA buttons | "Enter →" on each feature card + Hero Strip CTA |

---

## Component Map

```
LaunchDashboard.jsx  (refactored — orchestrates zones, passes handlers down)
├── CommandRail.jsx  (NEW — left rail, replaces Sidebar.jsx + left panel)
├── HeroStrip.jsx    (NEW — active trip banner, top of right area)
└── FeatureCardRow.jsx (NEW — horizontal scroll of 6 cards)
    └── FeatureCard.jsx  (NEW — individual card with hover/click behavior)
```

All new components live in `src/components/dashboard/`.

---

## Apple Compliance Notes

- **VP-1**: All VP vocabulary used throughout (Expedition, Squad, Architect, VentureVault, Tactical Mode, Ledger Workbench, Pro-Path)
- **VP-5**: Ember `#E67E22`, Midnight `#0E1012`, Sandstone `rgba(255,255,255,0.55)`, JetBrains Mono, Playfair Display — all present
- **RULE 2**: Every card has 2+ interactive elements (hover teaser + click navigation). No empty states — squad data from `useSquadGear`, trip data from `useTripStore`
- **RULE 3 — Differentiation**: The Command Rail + feature showcase pattern is specific to VP's expedition/mission-control identity. No generic travel app produces this layout.

---

## Out of Scope

- Changing routing architecture (state-based routing stays)
- Mobile layout (existing `BottomNav` handles mobile — not touched)
- TripPlanner internal tabs (squad tab, ledger tab navigation assumed to exist or be added separately)
- AR Ghost Tours implementation (card navigates to placeholder for now)
