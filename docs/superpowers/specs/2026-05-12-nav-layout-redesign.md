# VenturePath Nav & Layout Redesign
**Date:** 2026-05-12  
**Status:** Approved

---

## Overview

Restructure VenturePath's navigation from a bottom-nav + icon-only sidebar pattern to a desktop-first layout with a persistent top bar, a labeled left sidebar, and an infinite-scroll TripPlanner with a sticky section nav. Bottom nav is retained for mobile only.

---

## 1. Top Bar

**Component:** `src/components/layout/TopBar.jsx` (new)

- Fixed 48px height, full width, always above sidebar and content
- Background: `#0E1012`, bottom border: `1px solid var(--border)`
- **Left:** VenturePath diamond logo — clicking navigates to dashboard (`onBackToDashboard`)
- **Right (left to right):** `⭐ Premium` pill, profile icon button, settings icon button, notification bell with red dot badge
- Premium pill: Ember `#E67E22` outlined style (not filled)
- Typography: JetBrains Mono for any text
- Hidden on mobile (`md:flex hidden` or equivalent)

---

## 2. Left Sidebar (Desktop)

**Component:** `src/components/layout/Sidebar.jsx` (rewrite)

- Width: 200px, full height below the top bar
- Background: `var(--nav-bg)`, right border: `1px solid var(--border)`
- Hidden on mobile (`< 768px`)
- Each nav item: icon (20px) + label, full-width button, 40px tall

**Nav items in order:**

| Icon | Label | Callback prop |
|---|---|---|
| ◈ | Dashboard | `onBackToDashboard` |
| ⊞ | My Expeditions | `onOpenExpeditions` |
| ⬡ | VentureVault | `onOpenVault` |
| ✦ | Inspire | `onOpenInspire` |
| 👤 | Architect | `onOpenProfile` |
| ⊛ | Tactical | `onOpenTactical` |
| ⚙ | Settings | `onOpenSettings` |
| 🌙/☀️/⊕ | Theme | `onCycleTheme` (internal) |

**Active state:** 2px Ember left border + `rgba(230,126,34,0.08)` background  
**Inactive:** `rgba(255,255,255,0.45)` text  
**Hover:** full white text, `rgba(255,255,255,0.06)` background  
**Theme toggler** sits at bottom, separated by a spacer (`flex: 1`)

---

## 3. AppShell Restructure

**Component:** `src/components/layout/AppShell.jsx` (modify)

Current structure:
```
[PlanSubNav?]
[main content]
[BottomNav]
```

New structure:
```
[TopBar]                          ← new, full width
[Sidebar (desktop)] + [main col]  ← flex row
                       [StickyNav inside main col]
                       [scrollable content]
[BottomNav (mobile only)]
```

- TopBar and BottomNav are both rendered inside AppShell
- BottomNav gets `display: none` at `768px+` breakpoint (CSS class or inline style)
- Sidebar receives all nav callbacks from AppShell props (same props as today, extended)
- AppShell passes `activeSection` down to StickyNav for highlight

---

## 4. Sticky Section Nav (TripPlanner)

**Component:** `src/components/layout/StickyNav.jsx` (new, replaces PlanSubNav)

- Sticky positioned at top of the scrollable `<main>` area (below TopBar)
- Same visual style as current PlanSubNav (JetBrains Mono, Ember active underline)
- Sections in order: Overview · Itinerary · Logistics · Stays · Transport · Vault
- Clicking a label smooth-scrolls to the corresponding section anchor
- Active label driven by `activeSection` prop (string), not by tab click state

**IntersectionObserver setup (in TripPlanner):**
- Each section gets a `ref` and `id`: `section-overview`, `section-itinerary`, etc.
- Observer threshold: `0.2` (section is "active" when 20% is visible from top)
- `rootMargin: '-48px 0px 0px 0px'` to account for sticky nav height
- Fires `setActiveSection(id)` when a section enters
- `tab` state variable is removed; `activeSection` replaces it for highlight only — all sections are always rendered

---

## 5. TripPlanner Scroll Layout

**Component:** `src/pages/TripPlanner.jsx` (modify)

- Remove `tab` state and all `if (tab === 'X') return <Component />` conditional rendering
- All sections render unconditionally, stacked vertically in a single scrollable column
- Each section wrapped in:
  ```jsx
  <section id="section-overview" ref={overviewRef} style={{ scrollMarginTop: 48 }}>
    ...
  </section>
  ```
- `scrollMarginTop: 48` accounts for the sticky nav so anchored scrolling lands correctly
- Section order matches StickyNav label order

**Data fetching:** Discovery data (OSM attractions/food) currently fetches only when `tab === 'DISCOVERY'`. Replace with an `IntersectionObserver` on the discovery section ref — fetch once when the section first enters the viewport (`{ threshold: 0.05 }`), guarded by a `fetched` ref flag.

---

## 6. Mobile Behaviour

- TopBar: hidden (`display: none` below 768px)
- Sidebar: hidden below 768px
- BottomNav: visible below 768px, hidden above
- StickyNav: visible on all screen sizes (it's inside the content column)
- No behaviour changes to BottomNav itself

---

## Files to Create
- `src/components/layout/TopBar.jsx`
- `src/components/layout/StickyNav.jsx`

## Files to Modify
- `src/components/layout/AppShell.jsx`
- `src/components/layout/Sidebar.jsx`
- `src/components/layout/BottomNav.jsx` (add mobile-only hide class)
- `src/pages/TripPlanner.jsx`
- `src/App.jsx` (pass new TopBar/Sidebar props through)
- `src/components/trip/ExpeditionSelectScreen.jsx` (use new Sidebar)
- `src/components/dashboard/LaunchDashboard.jsx` (use new AppShell with TopBar)
