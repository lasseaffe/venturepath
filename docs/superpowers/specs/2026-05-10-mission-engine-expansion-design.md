# VenturePath — Mission Engine Expansion Design
**Date:** 2026-05-10
**Scope:** Five interconnected systems completing the VenturePath Super App vision — Vault Document Hub, Unified Booking Matrix + Cancellation Simulator, Compass Ring HUD, Role-Based Packing Prompts, and 3D Journey Line + Stat Overlays.

---

## Overview

This spec covers the features identified as gaps when comparing the "VenturePath Unified Tactical Travel Ecosystem" vision document against the existing codebase. All five systems share a single Mission JSON spine and communicate through the existing `sentinelBus.js` event bus.

Architecture decision: **Option B — Single Mission JSON + reactive modules.** The existing `useTripStore` and `sentinelBus` are extended rather than replaced. Modules stay decoupled but share one data spine.

---

## 1. Shared Data Spine Extensions

### `useTripStore` additions

Three new top-level keys added to the mission object:

```json
{
  "vault": {
    "documents": [
      {
        "id": "doc_1",
        "type": "flight|hotel|permit|insurance|medical",
        "raw": "...",
        "extracted": {
          "confirmation": "ABC123",
          "dates": { "start": "ISO-8601", "end": "ISO-8601" },
          "origin": "LIS",
          "destination": "BCN",
          "carrier": "TAP Air Portugal",
          "price": 180
        },
        "leg_id": "L1",
        "medic_emergency_access": false
      }
    ]
  },
  "booking": {
    "what_if_scenarios": [
      {
        "id": "scenario_1",
        "trigger_leg": "L1",
        "delay_hours": 12,
        "cascading_impacts": [
          { "leg_id": "L2", "status": "MISSED|TIGHT|SAFE", "buffer_hours": 1.5 }
        ]
      }
    ]
  },
  "journey": {
    "breadcrumbs": [
      { "lat": 38.7, "lng": -9.1, "alt": 120, "timestamp": "ISO-8601" }
    ],
    "gpx_imported": false,
    "photos": [
      {
        "url": "img_01.jpg",
        "coords": [38.7, -9.1],
        "timestamp": "ISO-8601",
        "heart_rate": null,
        "altitude": null
      }
    ]
  }
}
```

### New `sentinelBus` event types

| Event | Payload | Emitted by |
|---|---|---|
| `VAULT_DOCUMENT_ADDED` | `{ doc, suggestedLegIndex }` | VaultIngest |
| `CANCELLATION_SIMULATED` | `{ scenario }` | CancellationSimulator |
| `BREADCRUMB_UPDATED` | `{ breadcrumbs }` | GpxImporter / GPS watcher |
| `PHOTO_ACTIVE` | `{ photo }` | JourneySlideshow |

---

## 2. Vault Document Hub

### Purpose
Two ingestion paths (paste raw text, upload PDF/image) that extract booking data and auto-create a Leg. Replaces the email-forwarding approach with a simpler client-side alternative.

### Components

**`VaultHub.jsx`**
Main document library view. Lists all stored documents grouped by type. Each card shows: doc type icon, extracted summary, linked Leg badge, "View Raw" toggle.

**`VaultIngest.jsx`**
Modal with two tabs:
- **Paste Text** — textarea for raw booking confirmation text
- **Upload File** — accepts PDF (parsed via `pdfjs-dist`) or image (parsed via `tesseract.js` OCR)

Both paths feed into `vaultExtractor.js`.

**`vaultExtractor.js`**
Pure extraction logic. Runs regex patterns against raw text to pull: confirmation number, dates, origin/destination, carrier/hotel name, price. Returns a structured `VaultDocument` object. No external API — fully client-side.

Key regex targets:
- Confirmation: `/confirmation[:\s#]+([A-Z0-9]{4,12})/i`
- Dates: ISO-8601 and common formats (`DD Mon YYYY`, `MM/DD/YYYY`)
- Price: `/(?:total|amount|price)[:\s]+[€$£]?([\d,]+\.?\d{0,2})/i`
- Airports: IATA 3-letter codes in context of "from/to/departs/arrives"

**`MedicAccessBadge.jsx`**
Small toggle on each document card. Visible only to squad members with the `Medic` role. When toggled on, the document is written to `localStorage` under `tactical_vault` key for offline access. TacticalMode reads `tactical_vault` directly with no network call.

### Flow
1. User opens VaultIngest → pastes text or uploads file
2. `vaultExtractor.js` parses → preview shown with extracted fields highlighted in Ember #E67E22
3. User confirms → document saved to `useTripStore.vault.documents`
4. `sentinelBus.emit('VAULT_DOCUMENT_ADDED', { doc, suggestedLegIndex })` fires
5. TripPlanner receives event → offers one-tap "Create Leg from this booking" prompt

### Error handling
If extraction confidence is low (fewer than 3 fields extracted), show a warning banner: "We couldn't read all the details — please review the fields below." All extracted fields are editable before confirm.

---

## 3. Unified Booking Matrix + Cancellation Simulator

### Purpose
A whole-trip mission search returning flights + stay + transit together, paired with an AI-assisted delay ripple simulator.

### Components

**`BookingMatrix.jsx`**
Single "Mission Goal" search input (e.g. "3 days in Lisbon, budget €800"). Returns a `BookingPackage` card showing: best flight option, recommended stay, ground transit summary, permit flags. Uses:
- Amadeus free tier — flight search
- Nominatim — geocoding
- OpenStreetMap Overpass — transit stops
- Static `permitRegistry.json` — destination-keyed permit requirements

**`bookingEngine.js`**
Orchestrates parallel API calls, normalizes results into a `BookingPackage` object, calculates total cost, flags permit requirements by destination. Exports `searchMission(goalText)` — parses natural language goal into structured params before API calls: destination extracted via Nominatim geocode on the first noun phrase, duration via `/(\d+)\s*days?/i`, budget via `/[€$£]?([\d,]+)/` in context of "budget/under/max".

**`CancellationSimulator.jsx`**
"What If" panel accessible from any Leg card via a clock icon. UI:
- Delay slider: 0–48 hours in 1h increments
- Timeline view: all downstream legs shown with MISSED / TIGHT / SAFE badges (red / amber / green)
- Updates in real time as slider moves (rule engine is synchronous, no debounce needed)
- "What should I do?" button below timeline

**`simulatorEngine.js`**
Pure rule-based logic. Takes current itinerary + delay hours, walks each downstream leg, shifts timestamps, calculates buffer windows.

```js
// ImpactResult shape
{ leg_id, original_start, shifted_start, buffer_hours, status }
// status: 'MISSED' (buffer < 0), 'TIGHT' (0–2h), 'SAFE' (>2h)
```

**`SimulatorNarrative.jsx`**
Rendered below the timeline when user clicks "What should I do?". Sends `ImpactResult[]` to existing `/api/chat` route with a structured system prompt instructing Claude to act as a travel recovery advisor. Streams the response using the existing streaming pattern in the codebase.

### Sentinel integration
On simulation, `sentinelBus.emit('CANCELLATION_SIMULATED', { scenario })` fires. Sentinel picks it up and adds risk flags to affected legs in KanbanBoard (same pattern as `HAZARD_UPDATED`).

### Flow
1. User opens CancellationSimulator on Leg L1
2. Moves slider to 12h → `simulatorEngine.js` runs → timeline re-renders instantly
3. User clicks "What should I do?" → SimulatorNarrative streams Claude's recovery plan
4. sentinelBus fires → KanbanBoard flags affected legs

---

## 4. Compass Ring HUD + Role-Based Packing Prompts

### Compass Ring HUD

**`CompassRing.jsx`**
Floating overlay inside TacticalMode. Positioned in the bottom-center thumb zone. Shows:
- Rotating dial pointing toward the next confirmed Stop's coordinates
- Bearing in degrees + cardinal label (e.g. "NNE")
- Distance remaining (haversine from current GPS position)
- Stop name in JetBrains Mono

Updates via `navigator.geolocation.watchPosition` with a 5-second interval. Tap the ring to cycle to the next Stop. Rendered only when `navigator.geolocation` is available — graceful degradation to a static "GPS unavailable" placeholder otherwise.

**`compassEngine.js`**
Pure geometry, no external dependency.
```js
bearing(from, to)      // returns 0–360 degrees
cardinalLabel(degrees) // returns "N", "NNE", "NE", etc. (16-point compass)
haversineKm(a, b)      // reuses pattern from routeEngine.js
```

### Role-Based Packing Prompts

**`RolePackingPrompts.jsx`**
Advisory panel inserted above the item list in `PackingManifest.jsx`. Reads current user's squad role from `SquadGearContext`. Renders a role-specific checklist:

| Role | Prompts |
|---|---|
| Scout | Power bank charged?, Local SIM acquired?, Offline maps downloaded? |
| Medic | First aid kit expiry dates (date input per item), Local emergency numbers for destination |
| Lead | Permit status check, Squad readiness summary (reads `SquadGearContext` member ready-states) |
| (none) | Panel hidden |

**`rolePackingConfig.js`**
Static config mapping roles to prompt arrays. Each prompt has: `label`, `type` (`checkbox` or `date`), `critical` boolean (critical items pulse in Ember #E67E22).

### Integration
- `CompassRing` imported into `TacticalMode.jsx`, rendered conditionally on GPS availability
- `RolePackingPrompts` inserted as one line in `PackingManifest.jsx` above existing item list — zero structural change

---

## 5. 3D Journey Line + Stat Overlays

### Purpose
Post-trip storytelling: Mapbox GL JS 3D map synchronized with photo slideshow, with altitude and biometric overlays per photo.

### Dependencies
- `mapbox-gl` — free tier, 50k map loads/month. Style: `mapbox://styles/mapbox/dark-v11`. Terrain tiles: free.
- `pdfjs-dist` — already needed by VaultIngest
- No new paid services

### Components

**`JourneyMap3D.jsx`**
Mapbox GL JS map with pitch 45° for 3D terrain. Two layers:
- **Breadcrumb trail** — `line` layer from `useTripStore.journey.breadcrumbs`. Color gradient keyed to altitude: low → Sandstone #D9C5B2, high → Ember #E67E22.
- **Photo pins** — circle markers at each photo's coords. Active photo pin pulses (CSS keyframe animation, same pattern as existing pulse animations). Clicking a pin seeks slideshow to that photo.

Listens to `sentinelBus.on('PHOTO_ACTIVE')` → `map.flyTo({ center: photo.coords, zoom: 14, pitch: 45 })`.

**`JourneySlideshow.jsx`**
Left-pane photo viewer with arrow navigation. On photo change: `sentinelBus.emit('PHOTO_ACTIVE', { photo })`. Renders `StatOverlay` as an absolute-positioned HUD over each photo.

**`StatOverlay.jsx`**
HUD over slideshow photo. Four data points in JetBrains Mono:
- **Altitude** — from `photo.altitude` (GPX) or `elevationService.js` lookup
- **Heart rate** — from `photo.heart_rate` (GPX) or "—"
- **Temperature** — from `weatherEngine.js` cached data for destination + date, or "—"
- **Timestamp** — always available from photo metadata

**`GpxImporter.jsx`**
File input accepting `.gpx`. Parses client-side via `gpxParser.js`. Matches track points to photos by nearest timestamp within a 5-minute window. Writes results to `useTripStore.journey`. Shows match count: "Matched 14 of 20 photos to GPX track."

**`gpxParser.js`**
Pure XML parsing using browser's built-in `DOMParser`. No external dependency. Extracts `<trkpt>` elements:
- `lat`, `lon` attributes
- `<ele>` — altitude in meters
- `<extensions><gpxtpx:hr>` — heart rate (Garmin/Strava/Polar standard)
- `time` — ISO-8601 timestamp

**`elevationService.js`**
Wraps Open-Elevation API (`api.open-elevation.com/api/v1/lookup`). Batches coords into single requests (max 512 per call). Caches results in `sessionStorage` to avoid repeat calls for the same coords.

### Flow
1. User opens Journey view post-trip
2. Optional: imports `.gpx` → `gpxParser.js` matches track points to photos by timestamp
3. Slideshow plays → active photo changes → map flies to coords + stat overlay updates
4. Breadcrumb trail always visible; segment near active photo highlights in Ember #E67E22

---

## Build Sequence

1. Data spine extensions (`useTripStore`, `sentinelBus` new events)
2. `compassEngine.js`, `rolePackingConfig.js`, `gpxParser.js`, `simulatorEngine.js`, `vaultExtractor.js` — pure logic, no React, fully testable
3. `VaultHub` + `VaultIngest` + `MedicAccessBadge`
4. `RolePackingPrompts` (bolt-on to PackingManifest)
5. `CompassRing` (bolt-on to TacticalMode)
6. `BookingMatrix` + `bookingEngine`
7. `CancellationSimulator` + `simulatorEngine` + `SimulatorNarrative`
8. `GpxImporter` + `gpxParser` + `elevationService`
9. `JourneyMap3D` + `JourneySlideshow` + `StatOverlay`

---

## Apple Compliance Checklist

**UNIQUENESS:** Vault ingestion with OCR + auto-Leg creation, Cancellation Simulator with Claude recovery narration, and 3D breadcrumb trail with GPX biometric overlays are not reproducible by generic travel apps without VenturePath's expedition + squad + tactical identity.

**BRAND FIDELITY:** Midnight #0E1012 backgrounds, Ember #E67E22 highlights and altitude gradient, Sandstone #D9C5B2 low-altitude trail color, JetBrains Mono for all stat/data overlays, Playfair Display for section headings. Tactical Amber #F2A900 preserved exclusively for TacticalMode (CompassRing).

**FUNCTIONALITY DEPTH:** Each view has 3+ distinct user actions beyond read — VaultHub (ingest, confirm, create leg, toggle medic access), CancellationSimulator (set delay, read impacts, request AI narration, dismiss), JourneySlideshow (navigate photos, import GPX, click map pins, read stats).
