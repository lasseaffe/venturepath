# Smart Stop Editor — Design Spec
Date: 2026-05-10

## Problem Statement

The "Add a stop" panel (StopEditor) has five distinct UX failures:

1. Autocomplete results are not biased toward the trip destination — global results appear before local ones.
2. "Inspire me" in NearbyDrawer ignores the selected category and overrides it with an AI suggestion that often returns empty.
3. Travel mode is a static pill list — Flight appears even for stops within the same city.
4. Duration is a blank manual field — no data-backed suggestion for how long a place typically takes.
5. Distance is a blank manual field — no route data to pre-fill it.

---

## Architecture

Three layers of new code, one refactored component.

### `src/utils/routeCache.js` (new)
In-memory Map, session lifetime. Key: `"${fromLat},${fromLng}|${toLat},${toLng}"` (coords rounded to 4dp). Exports `getCached(key)` and `setCached(key, value)`. No localStorage — avoids stale coord drift as users edit stop names mid-session.

### `src/utils/routeEngine.js` (new)
Wraps OpenRouteService API (`VITE_ORS_API_KEY` env var). Core export:

```js
fetchRoutes(fromCoords, toCoords, modes[]) → Promise<{ mode, durationH, distanceKm }[]>
```

- Supported ORS modes: `car`, `foot`, `cycling` (mapped from app's `car / foot / bus` — displayed in UI as "Bus / Cycle" to be honest about the approximation)
- Flight: great-circle haversine distance ÷ 800 km/h cruise speed
- Train / Boat: returned as `{ mode, durationH: null, distanceKm: null }` (manual)
- Calls ORS in parallel via `Promise.all` for all viable ground modes
- Checks route cache before fetching; stores result on miss
- If `VITE_ORS_API_KEY` is not set: skips ORS, returns flight estimate only, rest manual
- On ORS failure: returns `null` for that mode (UI falls back to plain pill)

**Mode filtering** (pre-fetch, based on straight-line distance):
- < 1 km: exclude Flight, deprioritize Car
- > 500 km: deprioritize Foot, Cycling
- Always exclude modes that make no geographic sense before hitting the API

### `src/hooks/useSmartStop.js` (new)
Owns all stop-editor intelligence. Accepts `{ trip, legs }`. Internal state: `fromCoords`, `toCoords`, `toPlaceType`, `routes`, `loadingRoutes`, `visitDurationSuggestion`.

Responsibilities:
- Resolves trip destination coords once on mount (geocodeEngine)
- Provides `fromResults` and `toResults` — proximity-ranked autocomplete (haversine sort against trip destination coords)
- On `pickTo(place)`: stores coords + place type, triggers route fetch
- On `pickFrom(place)`: stores coords, triggers route fetch if `toCoords` already set
- Exports `routes` array for mode comparison UI
- Exports `visitDurationSuggestion` (string, e.g. `"~2.5h"`) for Duration field placeholder
- Exports stable `inspire(category)` — triggers NearbyDrawer search using the *currently selected* category on the current anchor (no AI override, no category change)

### `src/components/trip/StopEditor.jsx` (refactored)
Becomes a thin UI shell. All data and logic come from `useSmartStop`. Key UI changes:

- **Mode section**: when `routes` is populated, renders a **mode comparison table** instead of pills. Each row: `[icon] Label · Xh Ym · NNN km` — tapping pre-fills duration + distance and sets mode. Manual modes (Train, Boat) still appear as plain pills below the table. If routes are loading: skeleton rows. If routes failed: plain pills + subtle "route data unavailable" note.
- **Duration field**: `placeholder` set to `visitDurationSuggestion` when available. User can type to override.
- **Distance field**: pre-filled when user selects a mode row from the comparison table. Editable.
- **Inspire me** (inside NearbyDrawer): triggers search on current anchor + current category. No category override, no AI call. Shows a brief pulse animation on the results area to indicate refresh.

---

## Data Flow

```
User types in From field
  → useSmartStop.fromResults (proximity-ranked via haversine vs trip destination coords)
  → User picks suggestion → fromCoords stored

User types in To field
  → useSmartStop.toResults (same proximity ranking)
  → User picks suggestion → toCoords + toPlaceType stored
    → routeEngine.fetchRoutes(fromCoords, toCoords, filteredModes)
      → check routeCache → hit: instant / miss: ORS parallel fetch + cache store
    → visitDurationSuggestion derived from toPlaceType lookup table

StopEditor renders:
  → Mode comparison table (from routes[])
  → Duration field with placeholder from visitDurationSuggestion
  → Distance field pre-filled on mode row selection
```

---

## Visit Duration Lookup Table

| Place type (Foursquare category / Nominatim type) | Suggested stay |
|---|---|
| Museum, gallery, exhibition | 2.5h |
| Restaurant, café | 1.5h |
| Bar, nightclub | 2h |
| Park, nature reserve | 3h |
| Hiking trail | ORS foot duration if available, else 3h |
| Historic site, landmark, monument | 1.5h |
| Hotel, hostel, accommodation | — (not autofilled) |
| Generic / unknown | — (not autofilled) |

Shown as `placeholder` text only — never hard-set. User override is always one keystroke away.

---

## Inspire Me Fix

**Root cause**: `inspire()` in `useNearbySearch` calls `search(parsed.kinds)` but `search` captures `anchor` in a stale closure at the time `inspire` was called.

**Fix**: `search` is rewritten to accept an explicit anchor parameter, or `inspire` reads anchor from a ref rather than closure. Additionally, Inspire me behaviour changes:

- **Before**: AI picks a category, overrides the selected pill, searches with AI-chosen kinds
- **After**: reads the currently selected category pill, searches with it on current anchor, shows pulse animation on results. No AI call. No category change.

This makes Inspire me a "search this now" affordance rather than a "surprise me" AI feature.

---

## Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| `VITE_ORS_API_KEY` | Optional | OpenRouteService routing. Without it: ORS skipped, manual fields only. |
| `VITE_FSQ_API_KEY` | Existing | Foursquare Places autocomplete |
| `VITE_ANTHROPIC_API_KEY` | Existing | Inspire me AI (now unused by Inspire me, kept for other features) |

---

## Files Changed / Created

| File | Action |
|---|---|
| `src/utils/routeCache.js` | Create |
| `src/utils/routeEngine.js` | Create |
| `src/hooks/useSmartStop.js` | Create |
| `src/hooks/useNearbySearch.js` | Modify (Inspire me fix, stable search ref) |
| `src/components/trip/StopEditor.jsx` | Refactor (use useSmartStop, mode comparison table) |
| `src/utils/stopSearchEngine.js` | Modify (proximity re-ranking after results) |
| `.env.example` | Modify (add VITE_ORS_API_KEY) |

---

## Out of Scope

- Persistent route cache across sessions (localStorage) — deferred, adds invalidation complexity
- Train / boat routing data — no free API with adequate coverage
- Real-time transit (bus schedules) — requires GTFS feed, out of scope
- Map visualization of the fetched route polyline — deferred to RouteMap component work
