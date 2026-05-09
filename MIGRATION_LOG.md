# venture-path → venturepath Migration Log
Date: 2026-04-25

## What was venture-path?
A separate Vite + React travel planner at `C:\Users\lasse\Desktop\venture-path\`.
It had a different editorial/serif aesthetic (Playfair Display, light backgrounds).
`venturepath` (no hyphen) is the canonical project going forward — it has the more
advanced feature set (KanbanBoard, LedgerWorkbench, VentureVault, squad system, etc.).

---

## Files unique to venture-path (all migrated below)

| # | Original path in venture-path | Destination in venturepath | Notes |
|---|---|---|---|
| 1 | `src/components/itinerary/TimelinePath.jsx` | `src/components/itinerary/TimelinePath.jsx` | Restyled to dark tactical theme |
| 2 | `src/components/logistics/FlightScout.jsx` | `src/components/logistics/FlightScout.jsx` | Restyled; now imports flightEngine |
| 3 | `src/components/logistics/PackingEngine.jsx` | `src/components/logistics/PackingEngine.jsx` | Restyled to tactical-panel |
| 4 | `src/components/logistics/VehicleSearch.jsx` | `src/components/logistics/VehicleSearch.jsx` | Restyled; now imports logisticsEngine |
| 5 | `src/utils/flightEngine.js` | `src/utils/flightEngine.js` | Merged with flightScraper.js |
| 6 | `src/utils/flightScraper.js` | (merged into flightEngine.js) | Combined — same export namespace |
| 7 | `src/utils/foursquareEngine.js` | `src/utils/foursquareEngine.js` | Reads VITE_FSQ_API_KEY from .env |
| 8 | `src/utils/logisticsEngine.js` | `src/utils/logisticsEngine.js` | Verbatim, ESM-compatible |

## Files NOT migrated (already exist in venturepath or superseded)

| File | Reason |
|---|---|
| `src/app.jsx` | venturepath has a more advanced `App.jsx` |
| `src/pages/TripPlanner.jsx` | venturepath version is the superset |
| `src/components/discovery/*.jsx` | All three exist in venturepath |
| `src/components/itinerary/LegGuide.jsx` | Exists in venturepath |
| `src/components/itinerary/TransitMap.jsx` | Exists in venturepath |
| `src/components/logistics/PackingManifest.jsx` | Exists in venturepath |
| `src/components/social/PioneerChat.jsx` | Exists in venturepath |
| `src/components/ui/LaunchSequence.jsx` | Exists in venturepath |
| `src/context/TripContext.jsx` | venturepath uses useTripStore (more advanced) |
| `src/utils/destinationEngine.js` | Exists in venturepath |
| `src/utils/packingLogic.js` | Exists in venturepath |
| `src/utils/weatherEngine.js` | Exists in venturepath |

## Integration changes made to venturepath

### TripPlanner.jsx
- Added imports: TimelinePath, FlightScout, VehicleSearch, PackingEngine
- OVERVIEW tab: TimelinePath added as a 4th column (hidden on mobile), driven by live `legs` from useTripStore
- LOGISTICS tab: Expanded from single PackingManifest to full grid:
  - Row 1: PackingManifest (2/3 width) + PackingEngine (1/3 width)
  - Row 2: FlightScout + VehicleSearch (equal halves)

## What was deleted
`C:\Users\lasse\Desktop\venture-path\` — entire directory removed after migration.
