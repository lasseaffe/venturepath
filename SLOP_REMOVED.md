# VenturePath — Slop Removal Log
> Append-only. Each entry: what was removed, why, where, and what shape the gap is.
> Use this log to design real replacements later.

---

## [2026-05-11 Session] VentureVault empty-state map emoji

### `src/components/discovery/VentureVault.jsx:91`
- **Removed:** `<div className="text-4xl mb-3">🗺</div>` — large map emoji as empty-state hero icon
- **Reason:** emoji-as-icon slop — giant emoji in empty state is the single most universal AI default pattern
- **Page context:** `/vault` — VentureVault empty state when no Pro-Paths match filters
- **Suggested replacement direction:** A minimal compass rose SVG from lucide (`Compass` icon at 32px, strokeWidth=1), or a single Ember-colored horizontal rule + "VAULT EMPTY" mono label
- **Current state in code:** replaced with `NO RESULTS` / `No expeditions match your filters.` mono text labels

---

## [2026-05-11 Session] TrendBadge fire emoji

### `src/components/inspire/TrendBadge.jsx:19`
- **Removed:** `🔥 TRENDING` — fire emoji prefix on trend badge
- **Reason:** emoji-as-icon in interactive element — fire emoji is the universal AI "popular content" shorthand
- **Page context:** Inspire panel Pro-Path cards — trending badge overlaid on content
- **Suggested replacement direction:** Keep the `↑ TRENDING` arrow-text version that replaced it, or use a Lucide `TrendingUp` icon at 8px if the badge width allows
- **Current state in code:** replaced with `↑ TRENDING` (ASCII arrow, same mono styling)

---

## [2026-05-11 Session] LedgerWorkbench photo placeholder emojis

### `src/components/itinerary/ledger/LedgerWorkbench.jsx:118, 336`
- **Removed:** `📍` emoji used as placeholder for expedition photos in two slots: the full-size nomination card image area (line 118) and the compact row image thumb (line 336)
- **Reason:** emoji-as-icon slop — pin emoji conveys "location" not "photo placeholder"; misleading and generic
- **Page context:** Ledger Workbench nomination cards — the image slot where Architects upload expedition photos
- **Suggested replacement direction:** Real expedition photography from the user's gallery, or Unsplash/Pexels landscape. The slot size (full card top: ~120px, thumb: 32×32) is set. Photography brief: landscape/mountain/travel — warm golden-hour tones matching Ember accent
- **Current state in code:** honest text placeholder `PHOTO` (full slot) and `IMG` (thumb), mono font, muted color

---

## [2026-05-11 Session] HolyFlex community-section + lds-news-section in VP src

### `src/components/community-section.tsx`, `src/components/lds-news-section.tsx`
- **Removed (as active code — files still exist but unimported):** Two Next.js components (`import Link from "next/link"`) with gospel/LDS content placed in the VenturePath Vite+React directory
- **Reason:** Project contamination — these components belong to HolyFlex (Next.js, LDS platform) and were never imported by any VP component; they would cause build errors if imported
- **Page context:** Not rendered anywhere in VP; orphaned files
- **Suggested replacement direction:** Delete files if user confirms they are copies; if they represent work in progress for VP community features, they need a full rewrite in Vite+React with VP expedition vocabulary
- **Current state in code:** Files exist at VP src root, unused, safely ignored by Vite

---

## [2026-05-11 Session] Inter font overrides on body text

### Multiple files — `LaunchDashboard.jsx`, `PhotoStage.jsx`, `ExpeditionCard.tsx`, `SpotCard.tsx`, `SwipeDeck.tsx`
- **Removed:** `fontFamily: 'Inter, sans-serif'` inline overrides on body-level text (paragraph text, tags, labels, buttons)
- **Reason:** Fighting the declared body font (JetBrains Mono per moodboard); Inter is the "default sans-serif fallback" pattern that erases VP's mono identity
- **Page context:** Scattered across swipe cards, deck close buttons, empty state text — wherever body copy touched AI-generated components
- **Suggested replacement direction:** No replacement needed — body inherits JetBrains Mono from `body` CSS rule automatically
- **Current state in code:** `fontFamily` prop removed; text falls through to body monospace

---

## [2026-05-11 Session] CulinaryAnchorBlock fire + pin emoji data labels

### `src/components/itinerary/CulinaryAnchorBlock.jsx:111, 114`
- **Removed:** `🔥 {recipe.calories} kcal` and `📍 {destination}` — emoji prefixes on stat labels
- **Reason:** emoji-as-icon in data context — adds no semantic value, clashes with mono data aesthetic
- **Page context:** Culinary block within itinerary — calorie count and destination label
- **Suggested replacement direction:** Plain mono label `{recipe.calories} kcal` / `{destination}` — data is self-explanatory; if icon needed, Lucide `Flame` at 10px or `MapPin` at 10px, strokeWidth=1.5, muted color
- **Current state in code:** Not yet replaced — emoji still present (log created before edit; will fix in next pass if needed)

---

## [2026-05-11 Session-2] Transport emoji in RouteMap / BookingMatrix

### `src/components/itinerary/RouteMap.jsx:25,177,268,300` · `src/components/booking/BookingMatrix.jsx:64`
- **Removed:** `MODE_ICON` map using `✈ 🚌 🥾 ⛵` + fallback `📍` on each leg row; `🧭 Find nearby` button prefix; `✈ Flight` label in BookingMatrix
- **Reason:** emoji-as-icon on functional data labels — clashes with mono editorial aesthetic; emoji render at variable sizes across OS
- **Page context:** RouteMap leg sidebar (mode badge per leg), BookingMatrix flight card header
- **Suggested replacement direction:** `MODE_ICON` replaced with `{ flight: 'AIR', bus: 'BUS', foot: 'FOOT', boat: 'SEA' }` mono abbreviations. If icon wanted: Lucide `Plane` / `Bus` / `Footprints` / `Sailboat` at 10px strokeWidth=1.5, color `var(--text-muted)`
- **Current state in code:** Mono abbreviation labels. Fallback `📍` → `LEG`. `🧭` stripped from button copy.

---

## [2026-05-11 Session-2] Slate Tailwind gray scale (212 → 0)

### Multiple VP components
- **Removed:** 212 instances of `text-slate-{100–700}`, `bg-slate-{700–900}`, `border-slate-{600–800}` across all VP components
- **Reason:** Tailwind default gray scale fights the VP token system (`--text-primary`, `--text-secondary`, `--text-muted`, `--surface`, `--bg`, `--border`) — these bypass theming so Day/Tactical/Nomad mode transitions wouldn't propagate correctly
- **Page context:** Pervasive — every component that used gray text, gray backgrounds, or gray borders
- **Suggested replacement direction:** No replacement decision needed — these are mechanical token substitutions, already replaced with VP semantic vars
- **Current state in code:** All replaced with `var(--text-primary)`, `var(--text-secondary)`, `var(--text-muted)`, `var(--surface)`, `var(--bg)`, `var(--border)`

---

## [2026-05-11 Session-2] TacticalMode bg-black

### `src/components/ui/TacticalMode.jsx:48`
- **Removed:** `className="... bg-black ..."` on root container
- **Reason:** Pure `#000000` is harsher than the VP-3 spec which calls for `#0A0A0A` near-black in Tactical Mode; `bg-black` also bypasses the token system
- **Page context:** TacticalMode root surface — the emergency console
- **Suggested replacement direction:** Already replaced with `style={{ background: '#0A0A0A', color: '#F2A900' }}` per VP-3 spec
- **Current state in code:** Token-correct near-black with Tactical Amber text

---

## [2026-05-11 Session-5] REPLACEMENTS IMPLEMENTED — Slop → Brand-conforming design

### CulinaryAnchorBlock — full Ember retokening + emoji removal
- **Replaced:** all `rgba(34,197,94,x)` green fills → `rgba(230,126,34,x)` Ember equivalents; `#22C55E`/`#4ADE80` → `#E67E22` throughout
- **Replaced:** `<span className="text-lg">🍳</span>` header emoji removed entirely (bare header div)
- **Replaced:** meta row `⏱ {totalTime} min total` → `{totalTime} MIN` (mono-caps, no emoji); `{recipe.calories} kcal` → `{recipe.calories} KCAL`
- **Replaced:** destination span → uppercase mono; shopping list label, bullet `▸`, checkbox checked state, dietary tag pills all retokened to Ember
- **File:** `src/components/itinerary/CulinaryAnchorBlock.jsx`

### VentureVault — Ember ruled line empty state
- **Replaced:** plain `NO RESULTS` + `No expeditions match your filters.` mono block
- **Replacement:** Ember horizontal ruled line (`── VAULT EMPTY ──`) using two `rgba(230,126,34,0.35)` hairlines flanking `#E67E22` mono label in 9px / `0.25em` tracking; CLEAR FILTERS button with `hover:border-[#E67E22]/50`
- **File:** `src/components/discovery/VentureVault.jsx` (~line 89–98)

### LedgerWorkbench — Mountain SVG photo slot
- **Replaced:** plain `PHOTO` text placeholder (font-mono muted)
- **Replacement:** 64×64 slot with `rgba(230,126,34,0.06)` fill + `1px solid rgba(230,126,34,0.15)` border; inline Mountain SVG (`stroke="rgba(230,126,34,0.4)"`, 22×22); `PHOTO` mono label at 7px / `rgba(230,126,34,0.3)`
- **Note:** 32×32 `IMG` thumb in dropdown suggestions left unchanged — too small to design
- **File:** `src/components/itinerary/ledger/LedgerWorkbench.jsx` (~line 118)
