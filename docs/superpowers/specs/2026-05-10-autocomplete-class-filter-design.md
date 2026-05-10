# Autocomplete Class Filter — Design Spec
_Date: 2026-05-10_

## Problem

The "Add a stop" dialog's FROM and TO autocomplete fields return Stolpersteine (memorial stones) and other ultra-granular OSM objects when a user types a partial location query (e.g., "landungs" → intending Landungsbrücken).

**Root cause:** When no OTM API key is configured, `searchStops` falls through to raw Nominatim. Nominatim's `/search` endpoint matches on any field — including the street address of OSM objects. Stolpersteine located *at* Landungsbrücken have that string in their address, so they rank in results. The `class` field returned by Nominatim is currently read but never used to filter.

## Decision

Use a **class allowlist** in `searchLocations` (`geocodeEngine.js`). The `class` field is already present in every Nominatim response — this is purely a post-processing filter, no API parameter changes needed.

## Allowlist

| OSM class | Reason included |
|---|---|
| `place` | Cities, towns, suburbs, neighborhoods |
| `highway` | Streets, roads |
| `railway` | Train / tram stations |
| `amenity` | Cafes, hospitals, transit stops |
| `tourism` | Attractions, hotels, viewpoints — major historic sites carry this tag too |
| `natural` | Mountains, lakes, beaches |
| `shop` | Stores |
| `leisure` | Parks, recreation areas |
| `aeroway` | Airports |

`historic` is excluded. Major historically notable places (castles, cathedrals) are almost universally also tagged `tourism=attraction` in OSM, so they still surface. What gets cut is `historic=memorial` (Stolpersteine, plaques, boundary stones) — items with no travel-routing value.

## Scope

**One file changed:** `src/utils/geocodeEngine.js` — `searchLocations` function only.

No changes to `stopSearchEngine.js`, `useSmartStop.js`, `StopEditor.jsx`, or any other file. Both FROM and TO fields use the same engine and receive the same filter — no field-level divergence.

## Out of scope

- FROM vs TO semantic differentiation (rejected — user wants both fields equivalent)
- Importance-score threshold (fragile, undocumented across Nominatim versions)
- OTM/Foursquare key configuration
