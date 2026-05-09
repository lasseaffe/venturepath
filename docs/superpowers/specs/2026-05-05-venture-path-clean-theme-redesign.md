# VenturePath — "Modern Nomad" Default Theme Redesign

**Date:** 2026-05-05  
**Approach:** A — CSS Theme Layer (two themes, one codebase)  
**Visual reference:** Modern Nomad / Oat & Umber aesthetic (warm oat backgrounds, Burnt Sienna CTAs, Slate Teal accents, bold condensed hero type)

---

## Context

VenturePath's current design is a dark, militaristic "tactical" aesthetic: near-black backgrounds, amber/orange accents, monospace uppercase labels everywhere, and military terminology ("Mission", "Squad", "Tactical"). This works as a power-user mode but alienates casual travelers and reads as niche rather than professional.

The goal is to add a warm, clean default theme inspired by premium outdoor/travel brands (think REI co-op app meets Notion) while preserving the tactical experience as a switchable mode — activated automatically when the user enters TacticalMode.

---

## Design System

### Color Tokens (CSS custom properties)

| Token | Default (Modern Nomad) | Tactical |
|---|---|---|
| `--bg` | `#E6DFD3` (Warm Oat) | `#0E1012` |
| `--surface` | `#FFFFFF` | `#111316` |
| `--surface-raised` | `#F5F0E8` | `#1a1f24` |
| `--border` | `#D4C9BA` | `#2a2f36` |
| `--nav-bg` | `#B4844A` (Deep Camel) | `#0F1115` |
| `--nav-text` | `#FFFFFF` | `#e2e8f0` |
| `--accent` | `#5C8A8A` (Slate Teal) | `#E67E22` |
| `--cta` | `#B05C33` (Burnt Sienna) | `#E67E22` |
| `--text-primary` | `#4B443C` (Espresso Gray) | `#FFFFFF` |
| `--text-secondary` | `#7A6E64` | `#94a3b8` |
| `--text-muted` | `#A89C8F` | `#4b5563` |
| `--status-ok` | `#5C8A8A` | `#64dc82` |
| `--status-warn` | `#B05C33` | `#ffc850` |
| `--status-alert` | `#C0392B` | `#ff6b6b` |

### Typography

| Use | Default theme | Tactical theme |
|---|---|---|
| Hero/trip name | Playfair Display, serif, bold | Playfair Display (unchanged) |
| Body | Inter, 16px, `#4B443C` | Inter, 16px, white |
| Labels/tags | Inter, 11px, sentence-case, `--text-muted` | Monospace, 10px, UPPERCASE, 0.15em spacing |
| Nav items | Inter, 14px, medium | Mono, 12px, uppercase |
| CTAs | Inter, 15px, semibold | Inter, 14px, semibold |

Key change: **remove `.label-tag` monospace uppercase styling** from default theme. Labels become small, sentence-case Inter.

### Spacing & Shape

- Card border-radius: `12px` (default) vs `4px` (tactical)
- Card shadow: `0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.05)` (default) vs border-only (tactical)
- Section padding: `24px` (default) vs `16px` (tactical)
- Remove all rotated diamond (`rotate-45`) decorations from default theme

---

## Architecture

### Theme Switching

**File: `src/context/ThemeContext.jsx`** (new)
- `ThemeProvider` wraps the app
- Stores `theme: 'default' | 'tactical'` in `localStorage`
- Applies `data-theme="default"` or `data-theme="tactical"` on `<html>`
- `useTacticalMode()` hook auto-switches to `'tactical'` when TacticalMode is active

**File: `src/index.css`**
- Define all `--token` values under `[data-theme="default"]` and `[data-theme="tactical"]`
- Existing hardcoded hex values (`bg-[#0E1012]`, `text-[#E67E22]`, etc.) in Tailwind classes get replaced by `bg-[var(--bg)]` etc. over time — or kept as-is inside tactical-only components

### Labels / Terminology

**File: `src/hooks/useLabels.js`** (new)
- Returns an object of UI strings based on current theme
- Default: `{ trip: 'Trip', group: 'Travel party', profile: 'Profile', saved: 'Saved trips', ... }`
- Tactical: `{ trip: 'Mission', group: 'Squad', profile: 'Architect', saved: 'Vault', ... }`
- Components call `const { trip } = useLabels()` instead of hardcoding "Mission"

### Navigation

Replace the current top-tabs + floating dock with a **left sidebar**:

**File: `src/components/layout/Sidebar.jsx`** (new)
```
┌──────┬──────────────────────────────┐
│  VP  │  Patagonia Trip              │
├──────┼──────────────────────────────┤
│  🗺  │  Overview                    │
│  📅  │  Itinerary                   │
│  🎒  │  Logistics                   │
│  🔍  │  Discover                    │
│  📂  │  Saved Trips                 │
│      │                              │
│  👤  │  Profile          (bottom)   │
│  ⚙  │  Settings         (bottom)   │
└──────┴──────────────────────────────┘
```
- Desktop: 220px wide, icon + label
- Mobile: collapses to icon-only rail (48px), tap to expand
- Active item: `--accent` left border + tinted background
- In tactical theme: sidebar becomes dark, monospace labels, amber active state
- Remove `FloatingDock` component from default theme (keep for tactical only)

**File: `src/pages/TripPlanner.jsx`**
- Wrap content in new `<AppShell>` layout component
- `<AppShell>` renders `<Sidebar>` + `<main>` with correct padding

---

## Component Changes

### LaunchDashboard
- Hero background: keep ken-burns, but overlay with warm gradient (`#B4844A` → transparent)
- Replace "ENTER EXPEDITION" CTA → "Start Planning" (Burnt Sienna `#B05C33` pill button, full-width on mobile)
- Activity ticker: remove "LIVE" monospace badge → subtle teal dot indicator
- Squad status panel → "Your travel party" — same layout, plain labels

### TripPlanner Header
- Remove rotated diamond logo mark (default theme only)
- Trip name: Playfair Display bold, `#4B443C`, 24px
- Status badge: rounded pill, teal bg, white text, sentence-case
- "Tactical Mode" button: hidden in default, replaced by subtle gear icon that switches theme

### Cards (KanbanBoard, PackingManifest, etc.)
- Background: `#FFFFFF`, shadow, 12px radius
- Remove all monospace uppercase category labels
- Category color dots kept but subdued (same hue, lower saturation)
- Drag handles: visible only on hover

### RouteMap
- Switch to light map tiles (`https://{s}.tile.openstreetmap.org/...` or Stadia light)
- Route colors: keep semantic meaning, adjust saturation to work on light bg
- Legend sidebar: white card, shadow, `#4B443C` text

---

## Terminology Mapping

| Current (Tactical) | Default Theme |
|---|---|
| Mission | Trip |
| Squad | Travel party |
| Architect | Profile / You |
| Pioneer | Traveler |
| Expedition | Adventure / Journey |
| Vault | Saved trips |
| TACTICAL MODE | (hidden — gear icon activates it) |
| LIVE | (teal dot, no text) |
| CONFIRMED | Confirmed |
| PENDING | Pending |
| Add Leg | Add stop |
| Launch Dashboard | Home |

---

## Files to Create

| File | Purpose |
|---|---|
| `src/context/ThemeContext.jsx` | Theme state, localStorage persistence, `data-theme` on `<html>` |
| `src/hooks/useLabels.js` | Terminology map, returns strings based on theme |
| `src/components/layout/Sidebar.jsx` | New sidebar nav (replaces top tabs + floating dock) |
| `src/components/layout/AppShell.jsx` | Layout wrapper: sidebar + main content |

## Files to Modify

| File | Change |
|---|---|
| `src/index.css` | Add CSS custom property blocks for both themes |
| `tailwind.config.js` | Add CSS-var-based color aliases (`accent: 'var(--accent)'` etc.) |
| `src/main.jsx` | Wrap app in `ThemeProvider` |
| `src/pages/TripPlanner.jsx` | Use `AppShell`, remove tab nav + floating dock import |
| `src/components/dashboard/LaunchDashboard.jsx` | New CTA text, gradient, remove LIVE badge |
| `src/components/ui/TacticalMode.jsx` | Auto-switch theme to `'tactical'` on mount, restore on unmount |
| `src/App.jsx` | Remove/relocate FloatingDock, wire new layout |

## Files to Leave Untouched

- All tactical-only logic (SafetyPulse, SOS beacon, GPS coords)
- `TacticalMode.jsx` internals (colors stay hardcoded amber/black — it's self-contained)
- Business logic in `src/utils/`, `src/store/`, `src/hooks/`

---

## Verification

1. **Theme toggle:** Open app → default warm theme loads. Click gear icon → tactical dark theme activates. Reload → preference persists.
2. **TacticalMode auto-switch:** Enter TacticalMode → theme automatically switches to tactical. Exit → reverts to default.
3. **Sidebar navigation:** All 5 tabs accessible from sidebar. Mobile: collapses to icon rail. Active state visible.
4. **Terminology:** Dashboard shows "Start Planning", "Your travel party", "Saved trips". Tactical mode shows "Enter Mission", "Squad", "Vault".
5. **No regressions:** KanbanBoard drag/drop, RouteMap rendering, PackingManifest checkboxes all still functional.
6. **Light map tiles:** RouteMap shows light-mode map in default theme, dark tiles in tactical.
