# VenturePath — CHANGELOG

## [0.9.1] — 2026-05-10 — Environment Variable Documentation

### Added
- **`.env.example`** — Created with documented entries for all optional API keys: VITE_ORS_API_KEY, VITE_FSQ_API_KEY, VITE_OTM_API_KEY, VITE_ANTHROPIC_API_KEY. Each entry includes comment describing its purpose, fallback behavior if missing, and signup link where applicable.

## [0.9.0] — 2026-05-10 — Proximity Re-ranking for Stop Search

### Added
- **`rankByProximity(results, refCoords)`** — New exported function in `stopSearchEngine.js`. Sorts search results by distance from a reference coordinate (typically the trip destination). Results without coords sort to end (Infinity distance). Null refCoords returns original array unchanged.
- **`src/utils/stopSearchEngine.test.js`** — Comprehensive test suite (3 tests): verifies closest-first sorting, null-coords passthrough, and null-refCoords identity behavior.

### Changed
- **`searchStops(query, nearCity, destCoords = null)`** — New third parameter `destCoords` (backward compatible). Both Foursquare and Nominatim fallback results are now proximity-ranked if destCoords provided.
- **`stopSearchEngine.js`** — Now imports `haversineKm` from `routeEngine` for distance calculations.

## [0.8.0] — 2026-05-10 — LLM Issue Fixer Pipeline

### Added
- **`scripts/fix-issues.mjs`** — Reads pending issues from `pipeline/issues/queue.json`, applies fixes using Ollama (llama3.1:8b) or llama.cpp (fallback). Supports: `wrong_language` (rewrite POI desc via Wikipedia), `bad_poi` (regenerate or remove), `missing_image` (fetch from Wikipedia/Wikimedia Commons), `missing_pois` (re-geocode + OpenTripMap scrape), `wrong_location`/`wrong_city` (re-fetch entire city). Patches `public/data/inspire_all.json` in place. Archives resolved issues to `pipeline/issues/archive.json`. Non-automated types (e.g., "other") are skipped with status update.
  - LLM endpoints: Tries Ollama first (`:11434`), falls back to llama.cpp (`:8080`). 30s timeout per request, 0.3 temperature for stability.
  - Rate limiting: 200ms delay between POI detail fetches, 300ms between OpenTripMap kinds loops.
  - Safe removal: POIs with no Wikipedia data are removed; missing images retry Wikimedia Commons before failing.

## [0.7.0] — 2026-05-10 — Issue Receiver Express Server

### Added
- **`scripts/issue-receiver.mjs`** — Express server on port 3099. Receives user-submitted issue reports from the in-app report button and appends them to `pipeline/issues/queue.json`. Validates `cityId`, `type` (wrong_location, bad_poi, wrong_language, missing_image, missing_pois, other), and returns UUID. CORS enabled for Vite dev server at localhost:3001.
- **`express` dependency** — Added to `package.json` (^5.2.1).

## [0.6.0] — 2026-05-09 — Foursquare Integration + Feature Recovery

### Added
- **`.env`** — Foursquare API key wired via `VITE_FSQ_API_KEY`. Activates all existing `foursquareEngine.js` calls that were silently returning `[]`.
- **`foursquareEngine.js`** — Added `searchByCategory(categoryId, nearCity, limit)`, `getInspireQuery()`, `FSQ_CATEGORIES` constants, and a shared `mapPlace()` helper for consistent result shape.
- **`src/components/discovery/PlaceSearchPanel.jsx`** — New reusable Foursquare search drawer. Debounced text search, category filter pills (Hotels/Restaurants/Bars/Attractions/Cafés/Shopping), "✦ Inspire Me" random query, and "Add to Itinerary" per result.
- **`src/components/logistics/AccommodationSearch.jsx`** — New STAYS tab component. Hotel/Hostel/Apartment/Camping filters, live Foursquare results, "✦ Inspire Me", Booking.com deep-links.
- **`src/components/layout/Sidebar.jsx`** — Two new nav tabs: ✈ Flights, 🏨 Stays. New bottom actions: 💬 Squad Chat (wires PioneerChat), ⊕ Tactical HUD (wires TacticalMode). ✦ Inspire Me nav item opens global InspirePanel overlay.
- **`src/pages/TripPlanner.jsx`** — `inspireOpen` state wires InspirePanel globally. `FLIGHTS` and `STAYS` tabs added. All new Sidebar triggers threaded through.

### Fixed / Restored
- **`LocalFlavor.jsx`** — Now calls `fetchLocalFlavor(destination)` on mount with loading skeleton. Hardcoded Patagonia entries replaced with live Foursquare data.
- **`BasecampScout.jsx`** — Now calls `searchByCategory(hotels, destination)`. Shows real accommodation results with Booking.com links.
- **`MustSee.jsx`** — Now calls `searchByCategory(attractions, destination)`. Real tourist landmark results.
- **`FlightScout.jsx`** — Added From/To inputs. ✦ button on To field picks a random destination. Skyscanner deep-links added. Shows results only after search.
- **`PioneerChat`** — Was unreachable (setChatOpen never called). Now wired via Sidebar "Squad Chat" button.
- **`TacticalMode`** — Was unreachable. Now wired via Sidebar "⊕ Tactical HUD" button.
- **`TimelinePath`** — Was orphaned after v0.5.0 RouteMap migration. Restored to OVERVIEW tab below RouteMap.
- **`AppShell.jsx`** — Forwards `onOpenChat`, `onOpenInspire`, `onOpenTactical` props through to Sidebar.

## [0.5.0] — 2026-05-04 — Interactive Route Map

### Added
- **`src/components/itinerary/RouteMap.jsx`** — New Leaflet-based map component. Renders trip legs as numbered, mode-color-coded pins on a dark Stadia Maps (Alidade Smooth Dark) tile layer. Pins are connected by an orange dashed polyline. Includes a sidebar leg list; clicking a leg flies the map to that stop. Clicking a pin opens a popup with stop name, transport mode, duration, distance, and status.
- **`react-leaflet` + `leaflet`** — Installed as dependencies. Leaflet CSS imported in `main.jsx`.

### Changed
- **`src/pages/TripPlanner.jsx` OVERVIEW tab** — Replaced `TimelinePath` + `TransitMap` (left 3 columns) with `RouteMap`. PackingManifest stays in right column, unchanged. ITINERARY tab text-based `TransitMap` is unaffected.

## [0.4.0] — 2026-04-25 — Inspire Me Feature

### Added
- **`public/data/inspire_all.json`** — Hand-crafted seed data for 8 cities (Kyoto, Marrakech, Lisbon, Oaxaca, Tbilisi, Chiang Mai, Sarajevo, Cartagena). Each city has 5 POIs across landmark / food / activity / hidden_gem / transport_hub categories with times, durations, and field notes.
- **`src/hooks/useInspireData.js`** — Fetches `inspire_all.json` and exports `matchCity()` which fuzzy-matches a day label string (e.g. "Day 2 — Chiang Mai") to a city entry, falling back to a random city.
- **`src/components/inspire/InspirePanel.jsx`** — Slide-in panel (360px, right edge) with city hero image, tags, description, city-selector pills, POI cards. Clicking a POI card calls `onAddBlock()` to push it directly into the day.
- **`KanbanBoard.jsx`** — Wired `InspirePanel`: added `inspireDay` state, `addInspiredBlock()` function, `✦ INSPIRE` button in each day's action strip (purple accent), and panel open/close logic.
- **`scripts/scrape/sources.py`** — 23 destination seed entries with Wikipedia titles and Overpass bounding boxes (Asia, Europe, Africa, Americas).
- **`scripts/scrape/wikipedia_client.py`** — Fetches description (3 sentences) + hero image from Wikipedia REST API `/page/summary/`. No API key required.
- **`scripts/scrape/overpass_client.py`** — Queries Overpass API for up to 2 POIs per category (5 categories) using OSM tags. Maps `tourism`, `amenity`, `leisure`, `historic`, `public_transport` tags to the inspire schema.
- **`scripts/scrape/main.py`** — Orchestrator: iterates all destinations, merges Wikipedia + Overpass data, writes `public/data/inspire_all.json`, saves timestamped backup before overwriting.
- **`scripts/scrape/requirements.txt`** — `requests>=2.31.0` (only dependency — no API keys needed).
- **`run-scrape.bat`** — One-click Windows runner: installs deps, runs `py -m scripts.scrape.main`.

## [0.3.0] — 2026-04-25 — venture-path Migration

### Added (migrated from `venture-path/` — now deleted)
- **`src/components/itinerary/TimelinePath.jsx`** — Left-rail milestone timeline. Nodes cycle through `complete / active / pending` states with orange glow on active. Progress bar at bottom. Wired into OVERVIEW tab as a 4th column.
- **`src/components/logistics/FlightScout.jsx`** — Flight board with CHEAPEST / SPEED / GREEN priority toggle. Pulls from `flightEngine` mock data; CO₂ colour-coded (green/yellow/red). Wired into LOGISTICS tab.
- **`src/components/logistics/PackingEngine.jsx`** — Stowage checklist with progress bar, STOW / UNDO actions, and reminder date display. Wired into LOGISTICS tab alongside `PackingManifest`.
- **`src/components/logistics/VehicleSearch.jsx`** — Debounced vehicle search with fuel/energy cost breakdown via `logisticsEngine`. Shows refuel warning when range is insufficient. Wired into LOGISTICS tab.
- **`src/utils/flightEngine.js`** — Merged `flightEngine.js` + `flightScraper.js` from venture-path. Exports: `searchFlights()`, `filterExpeditionFlights()`, `calculateFlightImpact()`.
- **`src/utils/logisticsEngine.js`** — `calculateLegLogistics()` (EV kWh vs Gas MPG cost), `formatExpeditionCost()` (Intl currency formatter).
- **`src/utils/foursquareEngine.js`** — Foursquare Places API client. Reads `VITE_FSQ_API_KEY` from `.env`. Gracefully returns `[]` when key absent.

### Changed
- **`src/pages/TripPlanner.jsx`** — OVERVIEW tab: `TimelinePath` added as hidden-mobile left rail driven by live `legs` from `useTripStore`. LOGISTICS tab: expanded from single `PackingManifest` to 2-row grid (`PackingManifest + PackingEngine` top row, `FlightScout + VehicleSearch` bottom row).

### Removed
- `C:/Users/lasse/Desktop/venture-path/` — deleted after all unique assets migrated above.

---

## [0.2.0] — 2026-04-25 — SuperApp Phase 1

### Added
- **`src/store/useTripStore.jsx`** — Global trip state via React Context + useReducer. Actions: `CLONE_PATH`, `CLONE_COMPLETE`, `RESET_TRIP`, `SET_ROLE`, `UPDATE_LEG_STATUS`. `clonePath()` overwrites entire trip from VentureVault template and auto-completes after 3.5s.
- **`src/context/ExpeditionContext.jsx`** — Collaborative Ledger state. Majority-vote promotion to active path; majority-downvote triggers `rejected` status with shake animation + auto-removal.
- **`src/context/SquadGearContext.jsx`** — Squad gear sharing: 3 members (Lead/Scout/Medic), per-member max capacity, `REASSIGN` action, derived `overEncumbered` array.
- **`src/hooks/useSquadSync.js`** — Module-level mock WebSocket event bus. `broadcastClone()` / `broadcastActivity()` emit to all registered listener hooks. Ready for Supabase Realtime swap.
- **`src/components/dashboard/LaunchDashboard.jsx`** — New root view. Hero world-view background with Ken Burns zoom, glassmorphism left sidebar (Architect card, squad weight bars, legacy list), right mission panel, VentureVault horizontal scroll preview, floating Glass Dock.
- **`src/components/itinerary/ledger/LedgerWorkbench.jsx`** — dnd-kit dual-column drag-and-drop. Nomination Pool + Confirmed Path zones. Per-card upvote/downvote with 1s cool-down, `navigator.vibrate(50)`, shake animation, "Vetoed by Squad" tooltip on rejection.
- **`src/components/discovery/VentureVault.jsx`** — Pro-Path marketplace. 4 paths (Patagonia, Iceland, Swiss Alps, Mt. Fuji). Elite Pioneer gold badge, role-gated clone (LEADER executes; MEMBER gets approval toast), system override terminal overlay.
- **`src/components/social/ArchitectProfile.jsx`** — Creator dashboard. Stats grid, Golden Hour ($142) earnings balance, 30-day SVG sparkline, withdraw button, published paths table, badge gallery (5 badges, earned/locked states).
- **`src/components/social/PioneerChat.jsx`** — Dual-stream tactical chat. SQUAD/LOGS tabs, `/status` command, AI Scout weight-alert fragments (pulsing gold), auto-alerts for overEncumbered squad members, simulated scout replies.
- **`src/components/ui/TacticalMode.jsx`** — Amber-on-black offline HUD. Live clock, GPS coords, active leg, cached squad comms, SOS beacon (clipboard copy + vibrate pattern).
- **`IMPLEMENTATION_TODO.md`** — Full audit of planned vs. delivered features with priority order.

### Changed
- **`src/App.jsx`** — Full provider tree (`TripStore → SquadGear → Expedition`). `AppRouter` view state (dashboard / planner / profile / vault).
- **`src/pages/TripPlanner.jsx`** — Reads from `useTripStore`. Added 5th tab (VAULT). Floating Glass Dock nav. TACTICAL MODE button. PioneerChat overlay (slide-up panel). ArchitectProfile view. Editorial font for mission heading. `onBackToDashboard` prop.
- **`src/components/itinerary/TransitMap.jsx`** — Reads legs from global store with graceful fallback to hardcoded defaults when used outside provider.
- **`src/components/ui/LaunchSequence.jsx`** — framer-motion throughout. Clone-mode variant with 5 override terminal steps (`REMOTE OVERRIDE DETECTED…` → `SYNC COMPLETE.`). Squad leader overlay banner during clone. Animated progress bar.
- **`src/index.css`** — Added `@keyframes shake`, `pulse-gold`, `ken-burns`; `.glass-panel`, `.editorial-heading`, `.animate-shake`, `.animate-pulse-gold`, `.animate-ken-burns` utility classes.
- **`tailwind.config.js`** — New color tokens: `brand.golden-hour` (#F2C94C), `brand.sandstone` (#D9C5B2), `brand.midnight-silk` (#0F1115). Font families: `editorial` (Playfair Display), `sans` (Inter), `mono` (JetBrains Mono).
- **`index.html`** — Google Fonts preconnect + Playfair Display + Inter stylesheet.

### Dependencies Added
- `framer-motion` — Animations throughout (page transitions, stagger lists, chat messages, drag overlay)
- `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities` — Drag-and-drop in LedgerWorkbench

### Build
- Modules: 440 (was 25) | Bundle: 455 KB gzip: 140 KB | Errors: 0

---

## [0.1.0] — 2026-04-21 — Project Foundation

### Added
- Vite + React 19 + Tailwind CSS v3 scaffold
- Tactical Dark Mode design system (#0E1012, #E67E22, JetBrains Mono)
- `TripPlanner.jsx` — 4-tab orchestration (OVERVIEW, ITINERARY, LOGISTICS, DISCOVERY)
- `TransitMap.jsx` — Vertical route timeline, expand/collapse, mode icons
- `LegGuide.jsx` — Tab-per-leg, objectives, hazards, field notes, checklist
- `PackingManifest.jsx` — Climate-driven packing list, category filter, weight total
- `KanbanBoard.jsx` — Day-by-day timeline itinerary blocks
- `MustSee.jsx`, `LocalFlavor.jsx`, `BasecampScout.jsx` — Discovery components
- `LaunchSequence.jsx` — 5-step terminal boot animation
- `packingLogic.js`, `weatherEngine.js`, `destinationEngine.js` — Utility engines
- Agent logs: head_chef, architect, artisan, aesthetic-lead, motion-designer
