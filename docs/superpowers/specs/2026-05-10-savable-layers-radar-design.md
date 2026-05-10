# Savable Category Layers + Radar HUD — Design Spec
**Date:** 2026-05-10
**Status:** Approved
**Subsystem:** C of 4 (GlobalIntelligence → Legacy Slideshow → Savable Layers → TrendObserver)

---

## 1. Purpose

Give Architects persistent, named layer presets for POI category visibility on the map, and an always-on Radar HUD that shows nearby POI density per category at configurable range rings. Both systems share a single canonical category taxonomy that replaces the fragmented OTM/filterMask split.

---

## 2. Architecture

```
poiCategories.js              NEW — canonical category definitions (8 types)
categoryLayerStore.js         NEW — IndexedDB persistence (vp_intelligence/category_layers)
useCategoryLayers.js          NEW — React hook: activeLayers Set + preset CRUD
CategoryLayerPanel.jsx        NEW — sidebar toggle chips + named preset manager
RadarHUD.jsx                  NEW — always-on SVG ring overlay, top-right corner of map
MapLayerController.jsx        NEW — Leaflet child: filtered POI markers by activeLayers

Modified:
  src/components/itinerary/ItineraryMap.jsx  Add MapLayerController + RadarHUD
  src/components/discovery/PlaceSearchPanel.jsx  Use POI_CATEGORIES instead of OTM_CATEGORIES
  src/utils/sentinelBusEvents.js  Add LAYER_TOGGLED constant
```

---

## 3. New Files

### `src/utils/poiCategories.js`

Canonical category definitions. Consumed by: layerStore, RadarHUD, MapLayerController, PlaceSearchPanel.

```js
export const POI_CATEGORIES = [
  { id: 'water',      label: 'Water',       icon: '💧', color: '#60A5FA', osmTags: { amenity: 'drinking_water' },             otmKind: null       },
  { id: 'food',       label: 'Food',        icon: '🍽', color: '#E67E22', osmTags: { amenity: ['restaurant','cafe','fast_food'] }, otmKind: 'foods' },
  { id: 'shelter',    label: 'Shelter',     icon: '⛺', color: '#D9C5B2', osmTags: { amenity: 'shelter' },                    otmKind: null       },
  { id: 'medical',    label: 'Medical',     icon: '⚕', color: '#EF4444', osmTags: { amenity: 'pharmacy' },                   otmKind: null       },
  { id: 'gear',       label: 'Gear',        icon: '🎒', color: '#A78BFA', osmTags: { shop: 'outdoor' },                       otmKind: null       },
  { id: 'attraction', label: 'Attractions', icon: '📍', color: '#F59E0B', osmTags: { tourism: 'attraction' },                 otmKind: 'cultural' },
  { id: 'nature',     label: 'Nature',      icon: '🌲', color: '#22C55E', osmTags: { leisure: 'nature_reserve' },             otmKind: 'natural'  },
  { id: 'historic',   label: 'Historic',    icon: '🏛', color: '#8B5CF6', osmTags: { historic: '*' },                        otmKind: 'historic' },
];

export const CATEGORY_IDS = POI_CATEGORIES.map(c => c.id);

export function categoryById(id) {
  return POI_CATEGORIES.find(c => c.id === id) ?? null;
}

// Map a POI from globalSearch to a category ID, or null if no match
export function classifyPoi(poi) {
  // Check OTM kind first
  for (const cat of POI_CATEGORIES) {
    if (cat.otmKind && poi.kinds?.includes(cat.otmKind)) return cat.id;
  }
  // Check OSM amenity/shop/tourism/leisure/historic tags
  const tags = poi.osmTags ?? {};
  for (const cat of POI_CATEGORIES) {
    const spec = cat.osmTags;
    for (const [key, val] of Object.entries(spec)) {
      if (key in tags) {
        if (val === '*') return cat.id;
        const vals = Array.isArray(val) ? val : [val];
        if (vals.includes(tags[key])) return cat.id;
      }
    }
  }
  return null;
}
```

**Default active layers:** all 8 categories active on first load.

---

### `src/utils/categoryLayerStore.js`

Pure async functions — no React, fully testable with jsdom. Uses the existing `vp_intelligence` IndexedDB opened by `enrichmentCache.js`. Adds a second store `category_layers`.

```js
// Store record shape:
// { id: 'global', activeLayers: string[], presets: Preset[] }
// Preset: { id: string (uuid), name: string, activeLayers: string[], createdAt: number }

export async function loadLayers()
// → { activeLayers: string[], presets: Preset[] }
// Returns default (all categories active, empty presets) if no record exists.

export async function saveLayers(activeLayers, presets)
// → void. Upserts the 'global' record.
```

**IndexedDB setup:** Opens `vp_intelligence` v2 (bumps version from v1 used by enrichmentCache), adds `category_layers` object store with keyPath `id` in the `onupgradeneeded` handler. Must not break existing `poi_enrichment` store.

---

### `src/utils/useCategoryLayers.js`

React hook. Loads from IndexedDB on mount, persists to IndexedDB on every change.

```js
export function useCategoryLayers() {
  return {
    activeLayers: Set<string>,
    presets: Preset[],
    toggle: (categoryId: string) => void,
    savePreset: (name: string) => void,
    loadPreset: (presetId: string) => void,
    deletePreset: (presetId: string) => void,
    isActive: (categoryId: string) => boolean,
  };
}
```

- `toggle`: adds if not present, removes if present. Persists immediately.
- `savePreset`: creates `{ id: crypto.randomUUID(), name, activeLayers: [...activeLayers], createdAt: Date.now() }`.
- `loadPreset`: replaces `activeLayers` with the preset's layers. Persists.
- `deletePreset`: removes from presets array. Persists.
- Emits `LAYER_TOGGLED` on `sentinelBus` after every `toggle` call.

---

### `src/components/discovery/CategoryLayerPanel.jsx`

Sidebar panel. Receives no props — reads from `useCategoryLayers()` directly.

**Layout:**
```
── CATEGORY LAYERS ─────────────────────────
[💧 Water] [🍽 Food] [⛺ Shelter] [⚕ Medical]
[🎒 Gear]  [📍 Attract] [🌲 Nature] [🏛 Historic]

── PRESETS ──────────────────────────────────
[Alpine Survival ×]  [Urban Explorer ×]
[+ Save current as preset…]  [input + Save]
─────────────────────────────────────────────
```

- Active category chips: Ember `#E67E22` border + icon; inactive: dim Sandstone border
- Toggle on click → `toggle(id)`
- Preset chips: Sandstone with `×` delete button
- "Save current" input: JetBrains Mono text field → `savePreset(name)` on Enter

---

### `src/components/map/RadarHUD.jsx`

Always-on corner overlay. Positioned absolute top-right within the map container, 200×200px SVG, z-index 1000.

**Data flow:**
- Center: `currentLegCoords` from `useTripStore` (or map center if null)
- POIs: passed as prop from parent (`ItineraryMap` already has POIs in scope)
- Active layers: `useCategoryLayers().activeLayers`

**Rendering:**
- 4 concentric SVG rings at 500m / 1km / 2km / 5km radii (scaled to SVG px)
- Ring labels in JetBrains Mono: "500m", "1km", "2km", "5km"
- Ring stroke: `#1e2328` (subtle dark)
- For each active category: count POIs in each ring using haversine distance
- If count > 0 in a ring: render a colored dot (category color) on the ring at bearing 0-359° (distributed evenly if multiple categories)
- Center: Ember pulsing dot (current position indicator)
- Background: `rgba(14,16,18,0.85)` rounded square

**Haversine helper:** inline or import from `bearingEngine.js` (`computeBearing` already exists — add `haversineKm` export).

---

### `src/components/map/MapLayerController.jsx`

Leaflet child component (must be inside `<MapContainer>`). Renders filtered POI markers.

```jsx
// Props: pois: EnrichedPOI[], activeLayers: Set<string>
// For each POI: classifyPoi(poi) → categoryId
// If categoryId is in activeLayers → render L.circleMarker with category color
// If not → skip
// Markers are re-rendered when activeLayers or pois changes
```

Uses `useMap()` from react-leaflet. Manages marker lifecycle via `useEffect` — removes old markers, adds new ones. Uses `L.circleMarker` (not `L.marker`) to avoid icon default issues.

---

## 4. Modified Files

### `src/utils/sentinelBusEvents.js`

Add:
```js
export const LAYER_TOGGLED = 'LAYER_TOGGLED';
```

### `src/components/itinerary/ItineraryMap.jsx`

Add inside `<MapContainer>`:
```jsx
<MapLayerController pois={pois} activeLayers={activeLayers} />
```

Add outside `<MapContainer>` (absolute positioned sibling):
```jsx
<RadarHUD pois={pois} center={currentLegCoords} />
```

Pass `activeLayers` from `useCategoryLayers()` called at the `ItineraryMap` level.

### `src/components/discovery/PlaceSearchPanel.jsx`

Replace OTM_CATEGORIES import with POI_CATEGORIES from `poiCategories.js`. Update chip rendering to use `cat.id`, `cat.label`, `cat.icon`, `cat.color`.

---

## 5. Data Flow

```
User toggles "Water" category
  → useCategoryLayers.toggle('water')
  → activeLayers updated (Set)
  → categoryLayerStore.saveLayers persists to IndexedDB
  → sentinelBus.emit(LAYER_TOGGLED, { activeLayers })
  → MapLayerController re-renders (activeLayers in deps)
  → RadarHUD re-renders (activeLayers in deps)
  → Water markers appear/disappear on map
  → Water ring dots appear/disappear on radar

User saves preset "Alpine Survival"
  → useCategoryLayers.savePreset('Alpine Survival')
  → presets updated, persisted to IndexedDB
  → CategoryLayerPanel shows new preset chip
```

---

## 6. IndexedDB Version Bump

`enrichmentCache.js` currently opens `vp_intelligence` at version 1 with store `poi_enrichment`. The `categoryLayerStore.js` must open at version 2 and add `category_layers` in `onupgradeneeded` without touching `poi_enrichment`.

Both files should call `openDB()` — a shared helper that handles versioning:

```js
// src/utils/vpIntelligenceDB.js  — NEW shared IDB helper
export function openVpDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('vp_intelligence', 2);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('poi_enrichment')) {
        db.createObjectStore('poi_enrichment', { keyPath: 'poi_id' });
      }
      if (!db.objectStoreNames.contains('category_layers')) {
        db.createObjectStore('category_layers', { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
```

`enrichmentCache.js` is updated to use `openVpDB()` instead of its inline `open()` call.

---

## 7. Out of Scope (this spec)

- POI fetching from `globalSearch` inside the layer manager (it uses whatever POIs are already in scope in `ItineraryMap`)
- Server-side preset sync (Supabase) — IndexedDB only for now
- Per-leg layer overrides (all presets are global)
- Radar HUD click-through to POI detail
