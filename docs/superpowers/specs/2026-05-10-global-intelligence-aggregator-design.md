# GlobalIntelligence Aggregator — Design Spec
**Date:** 2026-05-10  
**Status:** Approved  
**Subsystem:** A of 4 (GlobalIntelligence → Legacy Slideshow → Savable Layers → TrendObserver)

---

## 1. Purpose

Replace the current pattern of components calling `overpassEngine`, `otmEngine`, and `searchRanker` directly with a single orchestration layer — `globalIntelligence.js` — that fans out to all data sources in parallel, merges and deduplicates results, scores them by mission context, and returns a unified POI + route shape.

Two new data sources are added:
- **WikiData** — fact sheets (description, image, type label) for every POI
- **Waymarked Trails** — official hiking/cycling/MTB routes as GPX geometries

WikiData enrichment is lazy + two-layer cached (IndexedDB offline + Supabase for cross-session persistence).

---

## 2. Architecture

```
Component
    ↓  { query, coords, section, missionType, userRole, radiusM, includeRoutes }
globalIntelligence.js
    ├── overpassEngine.js      (existing — OSM tactical layer POIs)
    ├── otmEngine.js           (existing — attraction POIs with ratings)
    ├── wikidataEngine.js      (NEW — fact sheets, images, QIDs)
    └── waymarkedEngine.js     (NEW — hiking/cycling routes as GPX)
         ↓
    merge + deduplicate (50m proximity rule — OTM wins over OSM)
         ↓
    searchRanker.js            (modified — add section multipliers)
         ↓
    { pois: EnrichedPOI[], routes: WaymarkedRoute[] }

On POI tap → enrichmentCache.js
    ├── IndexedDB (vp_intelligence / poi_enrichment)
    ├── Supabase (poi_enrichment table)
    └── wikidataEngine.js (fallback fetch)
```

---

## 3. New Files

### `src/utils/wikidataEngine.js`

Two-step WikiData lookup: name → QID via `wbsearchentities`, then QID → properties via `wbgetentities`.

**Fetched properties:**
- `P18` — image URL (Wikimedia Commons)
- `P31` — instance of (e.g., "Gothic cathedral", "national park")
- English `description` field

**Exported API:**
```js
wikidataFetch(name, coords) → Promise<{
  qid: string,
  description: string,
  instance_of: string,
  image_url: string | null,
} | null>
```

**Constraints:**
- 3s `AbortSignal` timeout per request
- Returns `null` on any error — WikiData enrichment is strictly additive
- Max 1 request per 200ms (internal debounce) to respect WikiData rate limits
- Never throws

---

### `src/utils/waymarkedEngine.js`

Queries Waymarked Trails API for routes near a coordinate. GPX geometry is fetched lazily (only when user selects a route).

**Endpoints used:**
- List: `GET https://hiking.waymarkedtrails.org/api/v1/list/search?bbox=...&limit=10`
- GPX: `GET .../details/{id}/gpx` — parsed with existing `gpxParser.js`

**Exported API:**
```js
waymarkedRoutes(lat, lng, type = 'hiking', radiusM = 10000) → Promise<[{
  id: string,
  name: string,
  type: 'hiking' | 'cycling' | 'mtb',
  difficulty: string,        // Waymarked's own scale: easy / moderate / demanding / expert
  distance_km: number,
  ascent_m: number,
  geometry: LatLng[],        // populated only after fetchRouteGeometry() call
  bbox: { minLat, maxLat, minLng, maxLng },
}]>

fetchRouteGeometry(routeId, type) → Promise<LatLng[]>
```

**Import into Leg shape:**
```js
{
  title: route.name,
  distance_km: route.distance_km,
  ascent_m: route.ascent_m,
  difficulty: route.difficulty,
  geometry: route.geometry,
  source: 'waymarked',
}
```
Passed to the existing `KanbanBoard` leg-add flow unchanged.

**Map display:** Routes render as colored polylines on `ItineraryMap` / `RouteMap`. Color by type: hiking=#E67E22, cycling=#60A5FA, mtb=#A78BFA. Tappable to show metadata + "Import as Leg" CTA.

---

### `src/utils/enrichmentCache.js`

Two-layer cache for WikiData fact sheets.

**Read path (on POI tap):**
1. Check IndexedDB `poi_enrichment` store — if hit and `fetched_at` < 30 days, return
2. Check Supabase `poi_enrichment` — if hit, write to IndexedDB, return
3. Call `wikidataEngine.js` — write to IndexedDB + upsert to Supabase

**Write path:**
```js
enrichmentCache.get(poi_id) → Promise<enrichment | null>
enrichmentCache.set(poi_id, enrichment) → Promise<void>
```

**IndexedDB:** Database `vp_intelligence`, store `poi_enrichment`, keyPath `poi_id`.  
Uses native `indexedDB` API — no extra library.

**Supabase upsert:** `ON CONFLICT (poi_id) DO UPDATE SET ... WHERE fetched_at < excluded.fetched_at` — fresh records are never overwritten by a stale client.

**POI ID scheme (stable, matches existing engines):**
- OSM: `osm_{node_id}`
- OTM: `otm_{xid}`
- WikiData fallback: `wikidata_{qid}`

---

### `src/utils/globalIntelligence.js`

Single orchestration entry point for all POI + route queries.

**Exported API:**
```js
globalSearch({
  query,          // string
  coords,         // { lat, lng }
  section,        // 'planner' | 'logistics' | 'tactical' | 'discovery'
  missionType,    // 'alpine' | 'city' | 'leisure' | 'tactical'
  userRole,       // 'MEDIC' | 'NAVIGATOR' | 'QUARTERMASTER' | 'LEADER' | 'MEMBER'
  radiusM,        // default 5000
  includeRoutes,  // boolean, default false
}) → Promise<{
  pois: EnrichedPOI[],
  routes: WaymarkedRoute[],
}>
```

**Fan-out:** `Promise.allSettled` across overpassEngine + otmEngine + waymarkedEngine (if `includeRoutes`). A source failure never blocks other results.

**Merge + deduplication:** POIs within 50m of each other are collapsed — OTM result wins (richer metadata), absorbs OSM tags into `osmTags` field.

**WikiData enrichment:** NOT fired during search. Components call `enrichmentCache.get(poi_id)` on tap.

---

## 4. Modified Files

### `src/utils/searchRanker.js`

Add `section` to the context object with a multiplier table:

| section | boosted tags | multiplier |
|---|---|---|
| `tactical` | `amenity=pharmacy`, `amenity=drinking_water`, `amenity=shelter` | +0.5 / +0.4 / +0.3 |
| `logistics` | `shop=outdoor`, `shop=supermarket`, `shop=hardware` | +0.4 / +0.3 / +0.3 |
| `discovery` | `tourism=attraction`, `tourism=viewpoint`, `leisure=nature_reserve` | +0.5 / +0.4 / +0.3 |
| `planner` | neutral — existing vibe/role scoring only | — |

Existing `tripType` and `userRole` scoring is preserved unchanged.

### `src/context/ExpeditionContext.jsx`

Add to state:
```js
const [activeSection, setActiveSection] = useState('planner');
```
Add to context value: `{ ...existing, activeSection, setActiveSection }`

### `src/components/layout/Sidebar.jsx`

Add `setActiveSection` call on tab change:
```js
const sectionMap = {
  'OVERVIEW':   'planner',
  'ITINERARY':  'planner',
  'LOGISTICS':  'logistics',
  'DISCOVERY':  'discovery',
};
onClick={() => { setActiveTab(tab); setActiveSection(sectionMap[tab]); }}
```

### `src/components/ui/TacticalMode.jsx`

Set `activeSection = 'tactical'` on mount, restore previous value on unmount.

---

## 5. Supabase Schema

```sql
CREATE TABLE poi_enrichment (
  poi_id        TEXT PRIMARY KEY,
  wikidata_qid  TEXT,
  description   TEXT,
  image_url     TEXT,
  instance_of   TEXT,
  fetched_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Upsert pattern used by enrichmentCache:
INSERT INTO poi_enrichment (poi_id, wikidata_qid, description, image_url, instance_of, fetched_at)
VALUES (...)
ON CONFLICT (poi_id) DO UPDATE
  SET wikidata_qid = excluded.wikidata_qid,
      description  = excluded.description,
      image_url    = excluded.image_url,
      instance_of  = excluded.instance_of,
      fetched_at   = excluded.fetched_at
  WHERE poi_enrichment.fetched_at < excluded.fetched_at - INTERVAL '30 days';
```

RLS: `SELECT` open to all authenticated users. `INSERT/UPDATE` restricted to service role (upserts go through Supabase client with anon key — RLS policy needed: allow insert if `auth.uid() IS NOT NULL`).

---

## 6. Data Flow Summary

```
User searches "water" in LOGISTICS tab
    → activeSection = 'logistics' (from ExpeditionContext)
    → globalSearch({ query: 'water', section: 'logistics', ... })
    → overpassEngine: [shop=outdoor, shop=supermarket, amenity=drinking_water]
    → otmEngine: [outdoor gear store, supermarket]
    → merge: deduplicate by 50m proximity
    → searchRanker: boost shop=outdoor (+0.4), shop=supermarket (+0.3)
    → return: outdoor shops first, supermarkets second, drinking fountains third
    → UI: "Add to Stowage list" CTA on each result

User taps "Outdoor Gear Co" POI
    → enrichmentCache.get('osm_123456')
    → IndexedDB miss → Supabase miss → wikidataFetch('Outdoor Gear Co', coords)
    → { description: 'Outdoor equipment retailer', instance_of: 'retail store', image_url: null }
    → write to IndexedDB + upsert to Supabase
    → render fact sheet in POI detail panel
```

---

## 7. Out of Scope (this spec)

- Wikivoyage city itinerary parsing (belongs in TrendObserver spec)
- Savable Category Layers / IndexedDB subscription model (Spec C)
- Legacy Slideshow WikiData fact slides (Spec B — consumes enrichmentCache)
- StorageManager / LRU cache eviction (Spec C)
- Google Trends RSS integration (Spec D)
