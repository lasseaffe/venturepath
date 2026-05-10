# VenturePath — Contextual Search Engine Design Spec
**Date:** 2026-05-10  
**Status:** Approved for implementation

---

## Overview

The backend engine layer that powers the Module-Adaptive GlobalSearchBar (spec B). Adds Photon autocomplete, Overpass API amenity queries, and a weighted SearchRanker to VenturePath's existing OTM + Nominatim stack. OTM is preserved for DISCOVERY. Overpass fills amenity gaps (water, toilets, shops, hospitals). Photon handles search-as-you-type with Nominatim fallback. A `searchRanker` re-orders all results by proximity × trip vibe × user role.

---

## Architecture

### Engine hierarchy

```
adaptiveSearchEngine.js          ← orchestration only, no direct API calls
├── photonEngine.js              ← autocomplete (Photon → Nominatim fallback)
├── overpassEngine.js            ← amenity POI queries + localStorage cache
├── searchRanker.js              ← weighted scoring (proximity × vibe × role)
├── mapillaryEngine.js           ← street-level imagery for detail sheet
└── [existing] otmEngine.js      ← untouched, used only by DISCOVERY tab
└── [existing] geocodeEngine.js  ← untouched, used as Photon fallback
└── [existing] routeEngine.js    ← haversineKm reused by searchRanker
```

### Shared POI shape

All engines normalize to this shape before returning:

```js
{
  id: string,          // OSM node ID or OTM xid — prevents duplicates on merge
  name: string,
  address: string,
  coords: { lat, lng },
  osmTags: object,     // raw OSM tags — used by searchRanker for vibe/role scoring
  category: string,   // human-readable: 'cafe', 'hospital', 'viewpoint', etc.
  _score: number,     // attached by searchRanker, absent before ranking
}
```

---

## Files to Create

```
src/utils/photonEngine.js
src/utils/overpassEngine.js
src/utils/searchRanker.js
src/utils/mapillaryEngine.js
src/utils/adaptiveSearchEngine.js
```

**.env additions:**
```
VITE_MAPILLARY_TOKEN=<token>
```

---

## `photonEngine.js`

**Responsibility:** Text → geocoded POI candidates for search-as-you-type.

```js
photonAutocomplete(query, filterMask) → Promise<POI[]>
```

### Behavior

1. Fires `GET https://photon.komoot.io/api/?q={query}&limit=7&osm_tag={tag}` for each tag in `filterMask`
2. Results merged and deduplicated by OSM id
3. Each result normalized to shared POI shape
4. If Photon returns 0 results OR times out (>4s) → falls back to `geocodeEngine.searchLocations(query, 7)`
5. Fallback results normalized to POI shape with `osmTags: {}`

### filterMask → Photon osm_tag mapping

Photon uses colon syntax: `shop=supermarket` → `osm_tag=shop:supermarket`. The engine handles this conversion internally.

### No caching

Photon is fast (<300ms typical). Caching at this layer adds complexity without meaningful benefit. Debounce (300ms) lives in `useAdaptiveSearch`, not here.

### Error handling

- Network failure → return `[]`, no throw
- Partial Photon success (some tags fail) → merge whatever succeeded, no error surface

---

## `overpassEngine.js`

**Responsibility:** Amenity POI queries anchored to a destination — the data source for Inspire Me results.

```js
overpassRadius(lat, lng, filters, radiusM = 5000) → Promise<POI[]>
```

### Query construction

Takes `filters` array from strategy `inspireQuery` (e.g. `['amenity=drinking_water', 'amenity=toilets']`) and builds a union Overpass QL query:

```
[out:json][timeout:5];
(
  node[amenity=drinking_water](around:5000,{lat},{lng});
  node[amenity=toilets](around:5000,{lat},{lng});
);
out body;
```

Fires against `https://overpass-api.de/api/interpreter` (public instance, no key required).

### localStorage cache

- **Key:** `vp_overpass_${destination}_${filters.sort().join('+')}`
- **Value:** `{ results: POI[], cachedAt: number }`
- **TTL:** 24h — on read: if `Date.now() - cachedAt > 86_400_000` → discard, re-fetch
- **Write:** after every successful fetch, regardless of result count
- **Size guard:** if `localStorage` throws `QuotaExceededError` → catch silently, skip write, return results anyway

### Timeout behavior

Overpass public instance can be slow. If no response within 5s → return `[]` silently. `AdaptiveSearchBar` handles this via static fallback chips (defined in spec B) — no error shown to user.

### Response normalization

OSM node → POI shape:
- `id`: `osm_${node.id}`
- `name`: `node.tags.name ?? node.tags['name:en'] ?? category`
- `address`: constructed from `addr:street`, `addr:housenumber` tags if present
- `osmTags`: full `node.tags` object (passed to searchRanker)
- `category`: derived from the matched filter key (e.g. `amenity=drinking_water` → `'drinking_water'`)

---

## `searchRanker.js`

**Responsibility:** Re-order any POI array by weighted score across three dimensions.

```js
rankResults(pois, context) → POI[]
```

Where `context`:
```js
{
  currentLegCoords: { lat, lng } | null,  // coords of nearest active leg anchor
  tripType: string,                        // from useTripStore().trip.climate or trip type
  userRole: string,                        // from useTripStore().userRole
}
```

### Formula

```
S = (R_dist × 0.3) + (R_vibe × 0.4) + (R_role × 0.3)
```

Maximum score: 1.0. Each component scores 0.0–1.0 before weighting.

### `R_dist` — Proximity score

Uses `haversineKm` from existing `routeEngine.js`.

```js
R_dist = 1 - (distKm / maxDistKm)  // normalized across the result set
```

If `currentLegCoords` is null → `R_dist = 0.5` for all POIs (neutral, doesn't penalize).

### `R_vibe` — Trip type match

`R_vibe = 1.0` if any of the POI's `osmTags` match the boost table entry, else `0.0`.

| `tripType` | Boosted OSM tags |
|---|---|
| `alpine` | `shop=outdoor`, `sport=climbing`, `natural=peak` |
| `leisure` | `amenity=cafe`, `tourism=attraction`, `leisure=park` |
| `tactical` | `shop=hardware`, `amenity=hospital`, `amenity=drinking_water` |
| `city` | `amenity=restaurant`, `tourism=museum`, `shop=*` |
| _(default)_ | no match → `R_vibe = 0.0` |

`shop=*` wildcard: matches if `osmTags.shop` exists with any value.

### `R_role` — User role match

`R_role = 1.0` if POI's `osmTags` match the role boost table, else `0.0`.

| `userRole` | Boosted OSM tags |
|---|---|
| `MEDIC` | `amenity=pharmacy`, `amenity=hospital` |
| `NAVIGATOR` | `amenity=fuel`, `highway=motorway_junction` |
| `QUARTERMASTER` | `shop=supermarket`, `shop=outdoor` |
| `LEADER` | `tourism=viewpoint`, `tourism=attraction` |
| _(default / MEMBER)_ | `R_role = 0.0` |

### Output

Each POI gets `_score` attached. Array returned sorted descending by `_score`. Original array not mutated.

### Unit testability

`searchRanker.js` has zero side effects and zero async calls — pure function. Existing test pattern (`*.test.js`) applies directly.

---

## `mapillaryEngine.js`

**Responsibility:** Fetch nearest street-level image thumbnail for a POI's coordinates.

```js
fetchStreetImage(lat, lng) → Promise<string | null>
```

### API call

```
GET https://graph.mapillary.com/images
  ?fields=id,thumb_256_url
  &closeto={lng},{lat}
  &radius=100
  &limit=1
  &access_token={VITE_MAPILLARY_TOKEN}
```

Returns `thumb_256_url` string if a result exists within 100m, `null` otherwise.

### Fallback conditions (all return `null`)

- `VITE_MAPILLARY_TOKEN` not set
- Network failure
- API returns 0 results
- Response takes >4s

No error thrown in any case — detail sheet handles `null` with category icon fallback (defined in spec B).

### No caching

Called only when a detail sheet opens for a specific POI. Low frequency; per-POI uniqueness makes caching impractical.

---

## `adaptiveSearchEngine.js`

**Responsibility:** Orchestration only. `useAdaptiveSearch` calls this — not individual engines.

```js
getInspireResults(strategy, destination, context) → Promise<POI[]>
getAutocompleteResults(query, strategy, context) → Promise<POI[]>
```

### `getInspireResults`

1. Geocodes `destination` → `{ lat, lng }` via `geocodeEngine.geocodeLocation()` (caller caches result in ref)
2. Fires `overpassEngine.overpassRadius(lat, lng, strategy.inspireQuery.filters)`
3. If `strategy` is `DISCOVERY` AND `VITE_OTM_API_KEY` present → also fires `otmEngine.otmRadius()`, merges results, deduplicates by `id`
4. Passes merged array through `searchRanker.rankResults(pois, context)`
5. Returns top 8 by `_score`

### `getAutocompleteResults`

1. Fires `photonEngine.photonAutocomplete(query, strategy.filterMask)`
2. Passes through `searchRanker.rankResults(pois, context)`
3. Returns top 10 by `_score`

### No API calls in this file

Pure orchestration — imports engines, calls them, merges, ranks. Each engine remains independently swappable (e.g. swap Overpass for a self-hosted instance by changing one import).

---

## Integration with Spec B

`useAdaptiveSearch` (spec B) calls:
- `adaptiveSearchEngine.getInspireResults()` on input focus
- `adaptiveSearchEngine.getAutocompleteResults()` on debounced query change
- `mapillaryEngine.fetchStreetImage()` when detail sheet opens

`context` object passed to both engine calls:
```js
{
  currentLegCoords: legs.find(l => l.status === 'pending')?.coords ?? null,
  tripType: trip.climate,   // 'temperate' | 'alpine' | 'tropical' etc — mapped to ranker keys
  userRole,
}
```

---

## tripType → ranker key mapping

`useTripStore` uses `trip.climate` values (`temperate`, `alpine`, `tropical`, `arid`). The ranker uses semantic trip types. Mapping lives in `adaptiveSearchEngine.js`:

| `trip.climate` | ranker `tripType` |
|---|---|
| `alpine` | `alpine` |
| `temperate` | `leisure` |
| `tropical` | `leisure` |
| `arid` | `tactical` |
| _(anything else)_ | `city` |

---

## Out of Scope (lower priority specs)

- Offline/Blackout mode — local MiniSearch index, FlatGeobuf/SQLite download, Protomaps tiles
- Tactical Collections — "Save All [Category]" layer persistence
- Vibe Cloud / Inspire Me map pin clusters
- Regional Pack download tiers (Essential / Standard / Full Tactical)

---

## Apple Compliance Checkpoints

**UNIQUENESS:** SearchRanker's role-weighted scoring (MEDIC boosts pharmacies, QUARTERMASTER boosts supermarkets) is impossible to produce without VenturePath's Squad role model. No generic travel app has this axis.

**BRAND FIDELITY:** Engine layer is non-visual — compliance lives in spec B's rendering. This spec ensures the data arriving at the UI is rich enough to support Ember-colored inspire chips, JetBrains Mono category tags, and Mapillary imagery in the detail sheet.

**FUNCTIONALITY DEPTH:** Each search interaction surfaces: autocomplete candidates, Inspire Me POIs, ranked results with three scoring dimensions, street imagery, and 1-3 context-specific actions. The engine layer makes all of this possible in a single focus event.
