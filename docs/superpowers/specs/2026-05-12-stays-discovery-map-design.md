# Design: Stays Map Pins + Discovery Real Data + Maps
**Date:** 2026-05-12  
**Status:** Approved  
**Scope:** VenturePath — STAYS tab + DISCOVERY tab (Must-See, Local Flavor, Vibe-Check)

---

## Problem Statement

1. **Stays (STAYS tab):** Clicking an accommodation result shows no map — user cannot spatially orient results.
2. **Discovery (Must-See, Local Flavor):** Results are geo-incorrect (Accra results appearing for Lille) due to broken destination-passing to OpenTripMap. Data is partially hardcoded.
3. **Vibe-Check:** Trending vibes are hardcoded per a handful of cities; scores and sources are fabricated ("Instagram", "TikTok").
4. **Discovery map:** No map companion exists for Must-See or Local Flavor.

---

## Decisions

| Question | Decision |
|---|---|
| Stays map layout | Split panel — list left, map right, activates on first result |
| Discovery map | One shared map at top of Discovery tab, color-coded pins for all sections |
| Data source | Nominatim (geocoding) + Overpass API (OSM queries) — both free, no API key |
| Keep OTM? | No — replace entirely |
| Map library | Leaflet (already installed: react-leaflet 5.0.0) |
| Tile layer | CartoDB dark (matches existing VP aesthetic) |

---

## Architecture

### New: `src/utils/osmEngine.js`

Single module replacing `foursquareEngine.js` for all geo queries.

**Exports:**

```js
geocodeCity(cityName)
// → { lat, lon, bbox: [minLat, maxLat, minLon, maxLon] }
// Calls: https://nominatim.openstreetmap.org/search?q=<city>&format=json&limit=1

overpassQuery(bbox, tagFilter, limit)
// → [{ id, name, lat, lon, tags }]
// Calls: https://overpass-api.de/api/interpreter
// tagFilter: Overpass QL node/way filter string

searchAccommodation(city, type)
// type: 'hotel' | 'hostel' | 'apartment' | 'camping'
// OSM tags: tourism=hotel|hostel|apartment|camp_site

searchAttractions(city, category)
// category: 'all' | 'historic' | 'cultural' | 'natural' | 'religion' | 'viewpoints'
// OSM tag map:
//   historic   → historic=*
//   cultural   → tourism=museum OR tourism=artwork OR tourism=gallery
//   natural    → natural=peak OR natural=waterfall OR natural=cave_entrance
//   religion   → amenity=place_of_worship
//   viewpoints → tourism=viewpoint
//   all        → tourism=attraction OR tourism=museum OR historic=* OR tourism=viewpoint

searchFood(city, category)
// category: 'all' | 'restaurants' | 'cafes' | 'bars' | 'markets' | 'street_food'
// OSM tag map:
//   restaurants  → amenity=restaurant
//   cafes        → amenity=cafe
//   bars         → amenity=bar
//   markets      → amenity=marketplace
//   street_food  → amenity=fast_food
//   all          → all of the above (union)

generateVibes(city)
// Fetches counts of major POI categories in city bbox
// Returns top 7 by count as vibe objects:
// { tag, label, score (= OSM count), source: 'OpenStreetMap', emoji }
```

**Caching:** Module-level `Map<`${city}:${type}`, results>` — cleared on city change.

**Rate limit compliance:** Nominatim requires `User-Agent` header and max 1 req/sec. Add 1s debounce on city changes.

---

## STAYS Tab — Split Panel

**File:** `src/components/logistics/AccommodationSearch.jsx`

**Layout change:**
- Before first search: full-width search UI (unchanged)
- After results load: two-column flex layout
  - Left: scrollable result list (existing cards, ~45% width)
  - Right: Leaflet `<MapContainer>` (~55% width, same height as list, `overflow: hidden`)

**State additions:**
```js
const [selectedId, setSelectedId] = useState(null)
const [resultCoords, setResultCoords] = useState([]) // [{ id, name, lat, lon }]
```

**Pin behavior:**
- All result pins: Ember `#E67E22` teardrop divIcon (reuse `makePin` from RouteMap or inline)
- Selected pin: white border, 1.3× scale, map pans to it
- Clicking card → `setSelectedId(result.id)` → map pans, pin pulses
- Clicking pin → `setSelectedId(pin.id)` → card scrolls into view + 300ms Ember left-border flash

**Map setup:**
- `fitBounds(resultCoords)` on results load
- CartoDB dark tiles: `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`
- Attribution: `© OpenStreetMap contributors © CARTO`

**Data wiring:**
- Extract `destination` from active expedition leg (already available as prop or context)
- Pass to `osmEngine.searchAccommodation(destination, activeType)` on search
- Map returned `{ id, name, lat, lon }` to result cards

---

## DISCOVERY Tab — Shared Top Map

**File:** `src/pages/TripPlanner.jsx` (Discovery tab render) + individual components

**Map placement:**
- New `<DiscoveryMap>` component rendered at top of Discovery tab content
- Height: 280px, full content width
- Sits above Vibe-Check, Must-See, Local Flavor sections

**DiscoveryMap component:** `src/components/discovery/DiscoveryMap.jsx`
```
Props: { attractionPins, foodPins, onPinClick }
attractionPins: [{ id, name, lat, lon, category }]  // Ember #E67E22
foodPins:       [{ id, name, lat, lon, category }]  // Sandstone #D9C5B2
```
- Pin hover → popup: name + category
- Pin click → `onPinClick(id, section)` → parent scrolls to card + highlights it

**Data loading:**
- Discovery tab mounts → parallel calls:
  - `osmEngine.searchAttractions(city, 'all')` → `attractionPins`
  - `osmEngine.searchFood(city, 'all')` → `foodPins`
- Stored in Discovery tab state, passed to both `<DiscoveryMap>` and child components
- Category filter button clicks → re-call with specific category → update both list AND map pins

**Card ↔ Pin two-way binding:**
- `selectedDiscoveryId` state at Discovery tab level
- Card hover/click → sets id → map pans + pulses pin
- Pin click → sets id → card scrolls into view + Ember border flash

---

## Must-See — Real Data

**File:** `src/components/discovery/MustSee.jsx`

- Remove: `DESTINATION_POIS` hardcoded object, OTM API call
- Replace with: receives `attractions` prop (already fetched by Discovery tab)
- Category filter buttons update Discovery tab's `attractionCategory` state → re-fetch + re-render
- Each result card shows: name, OSM category label, star rating (OSM `stars` tag or default 3.0), "ADD TO ITINERARY" CTA

---

## Local Flavor — Real Data

**File:** `src/components/discovery/LocalFlavor.jsx`

- Remove: OTM API call
- Replace with: receives `food` prop (already fetched by Discovery tab)
- Category filter buttons update Discovery tab's `foodCategory` state → re-fetch + re-render
- Each result card shows: name, amenity type label, OSM rating if present, "ADD TO ITINERARY" CTA

---

## Vibe-Check — Real Data (Stop Slop)

**File:** `src/components/discovery/VibeCheck.jsx`  
**File:** `src/utils/vibeCheckEngine.js`

- Remove: `DESTINATION_VIBES` hardcoded object, fake scores, fake sources
- Replace with: `osmEngine.generateVibes(city)` — real OSM category counts
- Vibe display: tag label + real count as score + source = "OpenStreetMap"
- `VIBE_TO_ACTIVITY` mapping: instead of hardcoded time blocks, each vibe maps to an OSM category → "Generate Itinerary" fetches real results from that category and presents them as activity cards
- Social source labels ("Instagram", "TikTok", "Reddit") → removed entirely; replace with OSM category icon

---

## Files Changed

| File | Change |
|---|---|
| `src/utils/osmEngine.js` | **NEW** — Nominatim + Overpass wrapper |
| `src/utils/foursquareEngine.js` | **DELETE** (or keep stub if imported elsewhere) |
| `src/utils/vibeCheckEngine.js` | **REPLACE** hardcoded data with `osmEngine.generateVibes` |
| `src/components/logistics/AccommodationSearch.jsx` | Split panel layout + map + pin wiring |
| `src/components/discovery/DiscoveryMap.jsx` | **NEW** — shared top map for Discovery tab |
| `src/components/discovery/MustSee.jsx` | Remove hardcoded data, accept props |
| `src/components/discovery/LocalFlavor.jsx` | Remove OTM call, accept props |
| `src/components/discovery/VibeCheck.jsx` | Remove fake vibes, use real OSM counts |
| `src/pages/TripPlanner.jsx` | Wire Discovery tab data loading, pass props down |

---

## Out of Scope

- AR Ghost Tours (separate feature, has its own hardcoded POIs — leave for next task)
- BasecampScout (alternative stays — not shown in screenshots, defer)
- Booking links (OTM provided these; OSM does not — "BOOKING →" buttons become "VIEW ON MAP" or removed)

---

## Non-Goals

- No server-side proxy
- No Mapbox (Leaflet only)
- No new API keys required
- No changes to RouteMap or ItineraryMap
