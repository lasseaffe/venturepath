# VenturePath — CHANGELOG

## [Unreleased] — 2026-05-12 — Fix: AppShell BottomNav Props

### AppShell Component (Fix)
- **`src/components/layout/AppShell.jsx`** — Made BottomNav configurable:
  - Added `activeBottomTab` prop (default: 'PLAN') and `onSelectBottomTab` handler to AppShell signature
  - Replaced hardcoded `activeBottomTab="PLAN"` and `onTabSelect={() => {}}` with dynamic prop passing
  - Allows parent components to control BottomNav state instead of hardcoding it
  - Git: 35754ca

## [Unreleased] — 2026-05-11 — Task 9: PublicTransport — 90s Polling, Cascade Detection, Buffer Display

### PublicTransport Component (Task 9)
- **`src/components/logistics/PublicTransport.jsx`** — Multi-leg route orchestration with real-time disruption awareness:
  - `useInterval(callback, delayMs)` — Custom hook for 90-second automatic polling of all confirmed legs
  - `runDisruptionCheck()` — Async callback that:
    - Filters to legs with `selectedOption?.tripId` (confirmed bookings only)
    - Calls `fetchAlerts(leg)` per DB-Rest leg to fetch live disruption data
    - Runs `checkCascade(withDisruption)` to propagate cascade risk to sibling legs based on arrival/departure buffer windows
    - Updates both `leg.disruption` (type/severity/delayMinutes/message) and `leg.cascadeRisk` per leg
    - Displays checking spinner ('⟳ CHECKING…') during fetch cycle
  - Route Summary redesigned:
    - Shows per-leg nodes: `from → [mode icon] → to` with mode-specific color (#E67E22 flight, #4a9eff train, #22a060 bus, #a855f7 tram)
    - Inline buffer time display: `+{minutes}m` between consecutive legs
    - Cascade risk indicators: Amber (#fbbf24) warning when sibling leg cascade detected; Red (#f87171) "MISSED ✕" when buffer is negative
    - Renders only when route has at least one city/leg
  - Button group: "+ ADD LEG" (flex-1) + "⚡ CHECK ROUTE" (manual trigger) for instant disruption polling
  - All leg updates flow through updateLeg callback, preserving LegCard integration
- Tests: 257 passing (2 pre-existing @xmldom/xmldom unrelated failures)

## [Unreleased] — 2026-05-11 — Task 2: transitEngine — Stop Resolution + Schedule Search

### transitEngine Module (Task 2)
- **`src/utils/transitEngine.js`** — New public transport utility module for DB-Rest API integration:
  - `resolveStop(lat, lng)` — Resolves nearest Hafas transit stop to coordinates; returns { id, name, location } or null
  - `searchConnections(fromId, toId, isoDate, mode)` — Fetches up to 3 journey options (train/bus/tram); filters by mode via product params
  - Returns normalized connection objects: carrier (line name or 'Walk'), departure, arrival, duration (human-readable format), price, co2 estimate, platform, realtime flag (tripId || departureDelay || currentTripPosition), tripId, and hafas stop IDs
  - `realtime: true` when DB provides live delay data or position updates; enables real-time UI indicators
  - Error handling: returns empty array on network failure; null on no results
  - Helper functions: `minsToHuman()` for human-readable durations, `co2ForMode()` for rough (duration-based) carbon footprint estimates per transport type
- **`src/utils/transitEngine.test.js`** — TDD-driven test suite (4 tests, all passing):
  - resolveStop: returns stop object with id/name, handles empty results gracefully
  - searchConnections: normalizes DB-Rest journeys to connection objects, handles network errors, extracts carrier/departure/arrival/realtime/tripId correctly
  - Mocked fetch calls to prevent external API hits during testing
- Public transport leg scheduling now pluggable into TripPlanner and TacticalMode route builders

## [Unreleased] — 2026-05-11 — Task 5: ActivityBlock Hover Reveal + ReportButton

### ActivityBlock Card Hover & Expand Reveal (Task 5)
- **`src/components/itinerary/KanbanBoard.jsx`** — ActivityBlock component updated:
  - BlockCardImage now accepts `visible={hovered || isExpanded}` prop and renders unconditionally outside the isExpanded wrapper; triggers reveal animation on hover or expand
  - Card header right side wrapped in flex div; ReportButton conditionally rendered when `hovered && !isGhost`
  - ReportButton receives cityId (block.id), cityName (block.title), country (""), and small prop
  - Two distinct reveal behaviors: hover shows ReportButton only; expand shows both BlockCardImage and BlockHub content

## [Unreleased] — 2026-05-10 — Code Quality Fixes

### Test Infrastructure & Documentation
- **`vitest.config.js`** — Changed test environment from 'jsdom' to 'node' to fix geocodeEngine tests; removed dependency on jsdom package
- **`src/utils/geocodeEngine.js`** — Added inline comment on searchLocations fetch URL documenting limit/filter trade-off: "fetch limit results; class filter may return fewer if some are non-travel OSM types"
- All 4 geocodeEngine utility tests pass: filterByAllowedClass checks (allowlist matching, removal, empty class pass-through, empty array)

## [Unreleased] — 2026-05-10 — Sentinel Triggers, Architect AI, After-Action

### SwipeDeck Card Types & Components (Tasks 2–5)
- `src/components/swipe/cards/types.ts`: ExpeditionCardData, SpotCardData, FilteredCardData interfaces
- ExpeditionCard: Pro-Path hero card (image + overlay + metadata + difficulty/days/distance + rating + tags)
- SpotCard: Discovery spot card (category + distance + rating + tags); fallback Midnight→Ember gradient
- FilteredResultCard: SpotCard overlay with match-reason chips (Ember bg, Midnight text, JetBrains Mono)
- All cards use VenturePath brand tokens: Midnight #0E1012, Ember #E67E22, Sandstone #D9C5B2
- Typography: Playfair Display headings, JetBrains Mono metadata, Inter body
- Image onError handlers gracefully fallback to gradient background

### Journey slideshow components
- GpxImporter: .gpx file input → parseGpx → matchGpxToPhotos → dispatch SET_JOURNEY_DATA + emit BREADCRUMB_UPDATED; shows match count report
- StatOverlay: ALT/HR/TEMP/TIME HUD over each photo; fetches altitude via elevationService when GPX alt is absent
- JourneySlideshow: left/right arrow navigation; emits PHOTO_ACTIVE on sentinelBus on each photo change; renders StatOverlay

### JourneyMap3D
- Mapbox GL JS 3D terrain map (dark-v11, pitch 45°)
- Breadcrumb trail with altitude gradient (Sandstone low → Ember high)
- Photo pin markers; clicking a pin emits PHOTO_ACTIVE to sync slideshow
- Listens to PHOTO_ACTIVE → flyTo photo coords; BREADCRUMB_UPDATED → redraws trail
- Graceful placeholder when VITE_MAPBOX_TOKEN is absent

### Added

### RolePackingPrompts
- Role-keyed advisory checklist inserted above item list in PackingManifest
- LEADER: permit status check, squad readiness summary
- SCOUT: power bank, local SIM, offline maps checkboxes
- MEDIC: first aid kit expiry date inputs, local emergency numbers
- Critical items pulse in Ember #E67E22 until checked

### CompassRing HUD
- Floating compass dial in TacticalMode pointing toward next confirmed Stop
- Shows bearing degrees, cardinal label (16-point), haversine distance to stop
- Tap to cycle to next Stop; graceful GPS-unavailable fallback
- Uses Tactical Amber #F2A900 (Tactical Mode exclusive token)

### BookingMatrix + CancellationSimulator + SimulatorNarrative
- BookingMatrix: single goal-text input dispatches searchMission, renders BookingPackage card (destination, duration, budget, flight, stay, transit, permits)
- CancellationSimulator: delay slider 0–48h, MISSED/TIGHT/SAFE badges per downstream leg, emits CANCELLATION_SIMULATED on sentinelBus
- SimulatorNarrative: "What should I do?" streams Claude recovery advice via /api/chat

### VaultHub + VaultIngest + MedicAccessBadge
- Document library grouped by type with empty-state expedition copy
- Paste Text tab and Upload File tab (PDF via pdfjs-dist, images via tesseract.js OCR)
- Extraction preview with low-confidence warning
- MedicAccessBadge: MEDIC/LEADER emergency access toggle persisted to localStorage tactical_vault key

### TicketDetailDrawer (Task 7)
- Bottom-sheet drawer for PassportVault ticket detail view
- Displays barcode (TicketBarcodeRenderer), reference code, validity dates, source
- Share with Squad: multi-select MOCK_SQUAD, confirm dispatch SHARE_TICKET action + emit TICKET_SHARED sentinel
- Manage sharing: per-Pioneer remove, Revoke All button
- Delete ticket: confirm dispatch DELETE_TICKET action, close drawer
- Midnight #0E1012 background, Ember #E67E22 primary interactive, Sandstone #D9C5B2 secondary text
- JetBrains Mono for metadata, Playfair Display for title
- framer-motion AnimatePresence for backdrop/drawer spring animation
- **`src/utils/sentinelBus.js`** — Lightweight pub/sub event bus (Map+Set, synchronous emit, unsubscribe fn)
- **`src/utils/weatherHazardMapper.js`** — Maps OpenWeatherMap API response to normalized Hazard objects (HIGH_WINDS, HEAVY_RAIN, EXTREME_HEAT) with affectedGearTags + affectedStopTypes
- **`src/utils/architectEngine.js`** — Rule-based insight engine; generates InsightCard data from bus events; Anthropic Haiku for pre-departure briefs (sessionStorage-cached)
- **`src/components/ui/InsightCard.jsx`** — Dismissible inline card with ⬡ ARCHITECT branding; tactical theme aware
- **`src/components/afteraction/AfterActionScreen.jsx`** — Two-phase post-expedition UI: Phase 1 expense settlement table + CSV export; Phase 2 VaultTemplate publish to localStorage

### Modified
- **`src/utils/safetyEngine.js`** — Hazards now include affectedGearTags + affectedStopTypes; emits HAZARD_UPDATED via sentinelBus
- **`src/utils/packingLogic.js`** — Added GEAR_TAGS library + getItemsByTag(tag) helper
- **`src/utils/weatherEngine.js`** — Added loadAndEmitWeatherHazards(coords) — OWM API call + sentinelBus emit
- **`src/store/useTripStore.jsx`** — Added AFTER-ACTION status, architect state slice, COMPLETE_EXPEDITION/ADD_INSIGHT/DISMISS_INSIGHT actions, DEPARTURE_IMMINENT emitter useEffect
- **`src/components/logistics/PackingManifest.jsx`** — Bus subscription → critical item elevation (red badge) + LOGISTICS InsightCards
- **`src/components/itinerary/ledger/LedgerWorkbench.jsx`** — Bus subscription → HIGH RISK stop badges + ITINERARY InsightCards
- **`src/components/itinerary/BudgetLoom.jsx`** — Bus subscription → insurance alert callout + LOGISTICS InsightCards
- **`src/components/social/PioneerChat.jsx`** — Architect bus messages mirrored to LOGS stream as type:'architect'
- **`src/components/trip/StopEditor.jsx`** — Stop Type selector (6 options); STOP_ADDED emit + buildInsights on save
- **`src/context/SquadGearContext.jsx`** — Emits SQUAD_WEIGHT_CHANGED via sentinelBus for over-encumbered members
- **`src/pages/TripPlanner.jsx`** — Weather hazards on mount; Complete Expedition button; AFTER-ACTION gate; OVERVIEW InsightCards

## [Unreleased] — 2026-05-10 — Dead Code Removal

### Changed
- **`src/utils/gpxParser.js`** — Refactored to remove dead code:
  - Removed `getParser()` function that tried to fallback to native `DOMParser` in a catch block
  - The try-catch was unreachable since `@xmldom/xmldom` is always imported successfully
  - Simplified to direct import and usage: `import { DOMParser } from '@xmldom/xmldom'`
  - All 8 existing tests pass; public API (`parseGpx`, `matchGpxToPhotos`) unchanged
  - **Commit:** `de92895 refactor(journey): simplify gpxParser — remove dead DOMParser fallback branch`

## [1.0.0] — 2026-05-10 — Smart Stop Editor: Routing, Proximity Autocomplete, Inspire Me Fix

### Added
- **`src/utils/routeCache.js`** — Session-lifetime in-memory Map cache for route queries. Key format: `"${fromLat},${fromLng}|${toLat},${toLng}"` (coords rounded to 4dp). Exports `makeCacheKey()`, `getCached()`, `setCached()`. Prevents duplicate ORS API calls for identical coordinate pairs.
- **`src/utils/routeEngine.js`** — Core routing orchestration layer. Exports:
  - `haversineKm(a, b)` — Great-circle distance calculation (6371km Earth radius)
  - `filterModes(distanceKm)` — Intelligently filters travel modes by distance (excludes Flight <1km, excludes Foot/Cycling >500km)
  - `parseOrsResponse(json, mode)` — Extracts duration (seconds→hours, 1dp) and distance (meters→km, 0dp) from OpenRouteService JSON
  - `fetchRoutes(fromCoords, toCoords)` — Orchestrates cache check, mode filtering, parallel ORS calls via Promise.all, flight estimation (km/800 + 1.5h), and result caching
  - Supports ORS profiles: `driving-car`, `foot-walking`, `cycling-regular`
  - Graceful fallback: if VITE_ORS_API_KEY not set, returns flight estimate only
- **`src/hooks/useSmartStop.js`** — Central intelligence hook for StopEditor. Manages:
  - `getVisitDurationSuggestion(placeType)` — Regex-based place type→visit duration mapping (Museum→2.5h, Restaurant→1.5h, Bar→2h, Park/Hiking→3h, Landmark→1.5h, Hotel→null for manual entry)
  - `useSmartStop(trip)` hook returns: fromQuery, toQuery, setFromQuery, setToQuery, fromResults, toResults, fromSearching, toSearching, pickFrom, pickTo, routes, loadingRoutes, visitDurationSuggestion
  - Resolves trip destination coords once on mount via geocodeLocation
  - Debounces autocomplete (400ms) with proximity ranking vs trip destination
  - Triggers route fetch on pickTo, pre-fills mode suggestions and duration hint
  - All callbacks wrapped in useCallback for stable references
- **Test suites** — Full coverage with 21 passing tests:
  - `src/utils/routeCache.test.js` (3 tests) — Cache get/set/key rounding behavior
  - `src/utils/routeEngine.test.js` (8 tests) — Haversine, mode filtering, ORS parsing, flight estimation
  - `src/utils/stopSearchEngine.test.js` (3 tests) — Proximity ranking closest-first, null-coord passthrough
  - `src/hooks/useSmartStop.test.js` (7 tests) — Visit duration suggestion mapping for all place types

### Changed
- **`src/utils/stopSearchEngine.js`** — Complete refactor:
  - Added `rankByProximity(results, refCoords)` — Haversine-based proximity sort vs reference coordinate
  - Updated `searchStops(query, nearCity='', destCoords=null)` signature; both Foursquare and Nominatim results now ranked by proximity to trip destination if destCoords provided
  - Results without coords sort to end (Infinity distance); null refCoords returns original array
- **`src/hooks/useNearbySearch.js`** — Fixed stale closure bug and simplified Inspire me:
  - Added `anchorRef` with useEffect sync to always read current anchor value
  - Rewrote `search` useCallback to read from `anchorRef.current` instead of closure; reduced deps to `[category]`
  - Removed entire AI override logic: `callInspireAI`, `ANTHROPIC_KEY`, `FALLBACK_KINDS`, `inspireLabel` state
  - Simplified `inspire()` to `await search(category)` — now respects selected category on current anchor, no AI surprise override
- **`src/components/nearby/NearbyDrawer.jsx`** — Removed `inspireLabel` reference; button text simplified to static `'✨ Inspire me'`
- **`src/components/trip/StopEditor.jsx`** — Complete refactor to use useSmartStop:
  - Added `MODE_META` object mapping modes to icon/label (car→🚗, flight→✈, train→🚆, boat→⛵, etc.)
  - Added `ModeRow` component rendering mode comparison table rows with icon, label, duration, distance (or "manual" fallback)
  - Added `SkeletonModeRow` for loading animation (3 skeleton rows while routes fetch)
  - Conditional mode UI: skeleton rows while `loadingRoutes`, mode comparison table when `routes.length > 0`, pill buttons fallback
  - `handleModeRowSelect(route)` pre-fills durationH and distanceKm when route has data
  - Duration field now uses `placeholder={smart.visitDurationSuggestion}`
  - All coordinate handling and autocomplete logic delegated to useSmartStop hook
- **`.env.example`** — Added VITE_ORS_API_KEY documentation with signup link and fallback behavior description

### Why This Fixes the Five UX Failures
1. **Non-proximity autocomplete** → `rankByProximity()` sorts results by haversine distance to trip destination; closest results appear first
2. **Inspire me ignoring category** → Removed stale closure bug; `inspire()` now reads anchor from ref and searches with currently selected category
3. **Static travel mode pills** → Mode comparison table with real route data; filterModes intelligently excludes irrelevant modes (Flight for same-city, Foot/Cycling for long-distance)
4. **Blank duration/distance** → getVisitDurationSuggestion provides placeholder for visit time; fetchRoutes pre-fills transit duration when user selects mode row
5. **No route data** → Integrated OpenRouteService with parallel mode fetching, session caching, and graceful fallback to flight estimation

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

### TripPlanner wiring (Tasks 15-16)
- VAULT tab: VaultHub document library accessible from TripPlanner
- BOOKING tab: BookingMatrix mission-goal search accessible from TripPlanner
- Journey view: GpxImporter + JourneySlideshow + JourneyMap3D integrated into Journey tab

## 2026-05-11 — Disruption-Aware Multi-Modal Transport Builder

### New files
- src/utils/transitEngine.js — DB-Rest stop resolution + journey search (train/bus/tram)
- src/utils/disruptionEngine.js — GTFS-RT alert fetch + cascade detection across consecutive legs
- src/utils/alternativeEngine.js — Rome2rio primary with DB-Rest journeys fallback

### Modified files
- src/utils/geocodeEngine.js — coordinate dedup in searchByFilter (3dp lat/lng), added searchBusStops + searchTramStops
- src/components/logistics/LegCard.jsx — MODE_CONFIG lookup, 4 mode buttons (flight/train/bus/tram), real DB-Rest schedule fetch, LIVE badge, selectedOption confirmation, disruption status bar, simulate all 4 modes
- src/components/logistics/EmergencyRebook.jsx — all-mode redesign: MODE_META, live alternatives from alternativeEngine, cascade banner, 45/60s countdown, squad voting preserved
- src/components/logistics/PublicTransport.jsx — useInterval 90s disruption polling, cascade detection + propagation, inline buffer time indicators, CHECK ROUTE button

### Env vars
- VITE_ROME2RIO_KEY added to .env.local (placeholder — get from rome2rio.com/developers, 1000 req/day free tier)
- DB-Rest + Nominatim remain keyless

### Test coverage
- geocodeEngine: 7 tests (dedup, bus/tram search, filterByAllowedClass)
- transitEngine: 4 tests (resolveStop, searchConnections)
- disruptionEngine: 9 tests (fetchAlerts, checkCascade + cascade propagation)
- alternativeEngine: 3 tests (Rome2rio success, 429 fallback, both-fail empty)

## 2026-05-18 — Gatherings: All 4 Phases Complete (Auth + Social + Public Discovery + Charters)

### New system
A full-stack **Gatherings** subsystem — event planning that lives inside expeditions and as standalone socials.

### New SQL migrations
- `supabase/migrations/20260518_gatherings_public.sql` — Phase 4: verification columns, charter columns, geo-discovery function (`discover_gatherings` via PostGIS `ST_DWithin`), `publish_as_charter` RPC, `clone_charter` RPC, public RLS policies

### New directories
- `src/lib/gatherings/` — `templates.js`, `api.js` (60+ functions), `useGatherings.js`, `tacticalCache.js`
- `src/components/gatherings/` — full component tree (10 components)
- `src/context/AuthContext.jsx` — Supabase Auth wrapper with profile management
- `src/pages/Auth.jsx`, `src/pages/Profile.jsx`, `src/pages/Events.jsx`

### New components
- `GatheringsHub` — list/create/filter hub (My Gatherings view)
- `GatheringCard` — accent-colored card with status dot and privacy badge
- `GatheringDetail` — 5-tab modal: OVERVIEW / CHAT / LEDGER / ARC / GEAR
- `GatheringChat` — Supabase Realtime threaded chat with @mention highlight and reply-to
- `GatheringLedger` — vote on time/location/menu/gear proposals; convener adopts → auto-applies to Gathering
- `ArcEditor` — drag-free agenda blocks (up▲/down▼) with role tagging
- `Beacon` — live day-of check-in: Arrived / En Route / Running Late / SOS; GPS-optional
- `CreateGatheringForm` — 2-step: TemplatePicker → details; sabbath-aware Sunday warning
- `TemplatePicker` — 7 templates: campfire, summit_push, basecamp_dinner, stargaze, trail_crew, ritual_sendoff, custom
- `PublicDiscovery` — geo-feed (PostGIS radius query, approximate coords for non-attendees, sabbath filter) + Charter library

### Cross-tool wiring
- `TacticalMode` — reads `readCachedGatherings()` / `nextCachedGathering()` from localStorage; SOS text extended with next Gathering coords
- `CommandRail` — Gatherings nav item (Flame icon) routes to Events page
- `StickyNav` — GATHERINGS step added to TripPlanner scroll nav
- `TripPlanner` — `section-gatherings` with `TripGatherings` component using `useTripGatherings(trip.id)`
- `App.jsx` — AuthProvider wrap; events/auth/profile view cases
- Cross-app streak emission: `gathering_hosted`, `gathering_attended` → HolyFlex `/api/streak/tick`

### Apple compliance
- All UI copy uses VP dialect: Gathering, Convener, Pioneer, Roster, Arc, Charter, Pinpoint, Beacon
- Public Gatherings tagged `// REQUIRES UGC POLICY LINK IN APP STORE METADATA`
- Beacon GPS usage tagged `// REQUIRES LOCATION USAGE DESCRIPTION IN APP STORE CONNECT`
- Tactical Mode files tagged `// TACTICAL-CRITICAL: this component must work offline`
- Empty state: "No Gatherings yet. Light one up — pick a Campfire, Stargaze, or Trail Crew template."
- Every view has ≥ 2 interactive elements
