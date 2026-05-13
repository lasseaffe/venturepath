# VenturePath Moodboard Log

> Newest entries on top. Every design change (tokens, fonts, components, modes, voice, motion, icons) must be logged here in the same task, with both `### Changed` and `### Ideas / next steps`.

## 2026-05-13 — Curated Expeditions Foundation (Spec 0)

### Changed
- **Vocabulary**: `components/vault/` (personal tickets/passport docs) renamed to `components/dossier/`. `VentureVault` (marketplace, in `components/discovery/`) keeps the brand word. Display copy "PassportVault" → "Passport Dossier" in `PassportDossier.jsx` and `DocumentManifest.jsx`. New `Dossier` entry in `moodboard.config.js` vocabulary list.
- **Routing**: introduced hybrid react-router. `/explore`, `/explore/:theme`, `/expedition/:slug` route to lazy stub pages; all legacy state-views render under a catch-all and behave identically.
- **Schema**: `pro_paths` gains `slug`, `gpx_storage_path`, `theme_category` (movie/historical/thematic/city/geographical), `tags text[]`, `provenance jsonb`, `safety_meta jsonb`, `narrative_blocks jsonb`. New tables `pro_path_waypoints` + `pro_path_attempts`. RLS enabled on all three. Storage bucket `gpx` added with `pro_paths.is_curated`-gated public read.

### Ideas / next steps
- Spec 1 — Discovery surface: replace `VentureVault.jsx` SEO canonical URLs (`https://venturepath.app/vault/...` at [VentureVault.jsx:56](C:/Users/lasse/Desktop/venturepath/src/components/discovery/VentureVault.jsx#L56) and `:74`) to `/explore` and `/expedition/:slug`. Rename `DepartingSoonStrip`'s `onOpenVault` prop when navigation is rewritten.
- Spec 3 — seed first 10 routes (Camino, Wild Atlantic Way, Iceland Ring, Romantic Road, Via Francigena, Route 66, Cabot Trail, Garden Route SA, Grand Tour Switzerland, Tulip Route) — all tourism-board / Overpass / NPS sources.
- Audit dev-only logs that still reference "Vault" in places we missed (run grep after Spec 1).

## 2026-05-12 — Phase 2 Camping: Spruce token + CampLens

### Changed
- Added Spruce `#3A6B5C` token — camp/wild stay accent color for CampLens, camp waypoint pins, PackingEngine camp gear rows
- Added `--spruce` CSS variable to all three themes in `index.css`
- Added `Wild Pitch` to VP-1 vocabulary contract (Apple 4.3 compliance — differentiates from generic "wild camping")
- `CampLens` component uses Spruce as brand color for camp intelligence header and row indicators

### Ideas / next steps
- Phase 3: terrain-colored trail icons (Spruce for forest legs, Sandstone for desert legs)
- Consider using Spruce as CalendarStrip node color for camp nights
- Squad sleep arrangement dnd-kit UI (deferred from Phase 2 — needs squad data in store first)

## 2026-05-11 — Bootstrap: in-app living moodboard system

### Changed
- Created `src/pages/Moodboard.jsx` view + `src/pages/moodboard/` folder with 11 section files: Identity, Color, Typography, Spacing & Radii, Components, Patterns & Modes, Voice & Tone, Do/Don't, Iconography, Motion, Change Log.
- Added `moodboard.config.js` — single source for editorial content. Includes the full VP-1 vocabulary contract (Architect / Pioneer / Expedition / Leg / Ledger Workbench / VentureVault / Pro-Path / Squad / Tactical Mode / Launch Sequence / Basecamp) required for Apple 4.3 compliance.
- Added `lib/readCssVar.js` — runtime resolver to hex; swatches read live from `index.css` and repaint on theme change via MutationObserver on `data-theme`.
- Added `lib/parseMoodboardLog.js` + Vite `?raw` import of this file → Change Log section renders the top 5 entries inline.
- Added `'moodboard'` view to `App.jsx`; wired `onOpenMoodboard` through `TripPlanner` → `SettingsPanel`.
- Added "Design Moodboard" button to the DISPLAY tab of `SettingsPanel.jsx`, above the New Expedition Wizard.
- Added `scripts/check-moodboard-drift.mjs` + `moodboard:check` npm script.
- The Do/Don't section uses hand-coded JSX previews (rather than HTML strings) so VP doesn't need a sanitizer dependency.

### Ideas / next steps
- Moodboard is only reachable via Trip → Settings → Moodboard. Consider exposing it from the LaunchDashboard sidebar too so the moodboard is reachable pre-expedition.
- Iconography section uses emoji glyphs because that's what the actual sidebar uses. Long-term, consider migrating to lucide-react fully and revisit this section.
- The Change Log preview uses Vite's `?raw` import — this means the moodboard.log.md content is bundled at build time. For a true "live" log, switch to a fetch at runtime once VP gains an API surface for it.
- PatternsAndModes only shows the theme cycle. The Day mode is rarely tested in practice — add a "freeze theme" mode that locks tactical for testing the SOS beacon flow.
- VP's brand constants (Midnight, Ember, Golden Hour, Sandstone, Tactical Amber) are duplicated between Tailwind config and CSS vars. The drift check only inspects index.css — add a Tailwind config pass too.
