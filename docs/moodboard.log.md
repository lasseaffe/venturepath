# VenturePath Moodboard Log

> Newest entries on top. Every design change (tokens, fonts, components, modes, voice, motion, icons) must be logged here in the same task, with both `### Changed` and `### Ideas / next steps`.

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
