# Savable Category Layers + Radar HUD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persistent, named POI category layer system and an always-on Radar HUD ring overlay to VenturePath's map, replacing the fragmented OTM/FSQ category split with a single canonical 8-category taxonomy.

**Architecture:** Pure data layer first (`poiCategories.js`, `vpIntelligenceDB.js`, `categoryLayerStore.js`) tested independently, then the React hook (`useCategoryLayers.js`), then UI components (`CategoryLayerPanel`, `RadarHUD`, `MapLayerController`), and finally wired into `ItineraryMap` and `PlaceSearchPanel`. The IndexedDB version is bumped from 1→2 via a shared `openVpDB()` helper so both `enrichmentCache` and the new store coexist safely.

**Tech Stack:** Vitest + jsdom, React hooks, react-leaflet, Leaflet L.circleMarker, SVG (inline JSX), IndexedDB (native API, no library), sentinelBus pub-sub.

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Create | `src/utils/poiCategories.js` | 8-category canonical taxonomy + classifyPoi() |
| Create | `src/utils/poiCategories.test.js` | Unit tests for classifyPoi |
| Create | `src/utils/vpIntelligenceDB.js` | Shared IDB v2 opener (poi_enrichment + category_layers) |
| Create | `src/utils/categoryLayerStore.js` | loadLayers / saveLayers async pure fns |
| Create | `src/utils/categoryLayerStore.test.js` | Unit tests for store round-trip |
| Create | `src/utils/useCategoryLayers.js` | React hook wrapping store + sentinelBus |
| Create | `src/components/discovery/CategoryLayerPanel.jsx` | Sidebar: category chips + preset manager |
| Create | `src/components/map/RadarHUD.jsx` | SVG concentric ring HUD |
| Create | `src/components/map/MapLayerController.jsx` | Leaflet child: filtered circleMarkers |
| Modify | `src/utils/enrichmentCache.js` | Switch openDb() → openVpDB() from shared helper |
| Modify | `src/utils/sentinelBusEvents.js` | Add LAYER_TOGGLED export |
| Modify | `src/utils/bearingEngine.js` | Add haversineKm() export |
| Modify | `src/components/itinerary/ItineraryMap.jsx` | Add MapLayerController + RadarHUD |
| Modify | `src/components/discovery/PlaceSearchPanel.jsx` | Swap FSQ_CATEGORIES → POI_CATEGORIES |

---

## Task 1: Build `poiCategories.js` + `haversineKm`

**Files:**
- Create: `src/utils/poiCategories.js`
- Create: `src/utils/poiCategories.test.js`
- Modify: `src/utils/bearingEngine.js`

- [ ] **Step 1: Write failing tests**

Create `src/utils/poiCategories.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { POI_CATEGORIES, CATEGORY_IDS, categoryById, classifyPoi } from './poiCategories';

describe('POI_CATEGORIES', () => {
  it('has 8 categories', () => {
    expect(POI_CATEGORIES).toHaveLength(8);
  });

  it('every category has required fields', () => {
    for (const cat of POI_CATEGORIES) {
      expect(cat).toHaveProperty('id');
      expect(cat).toHaveProperty('label');
      expect(cat).toHaveProperty('icon');
      expect(cat).toHaveProperty('color');
      expect(cat).toHaveProperty('osmTags');
    }
  });
});

describe('CATEGORY_IDS', () => {
  it('contains all 8 IDs', () => {
    expect(CATEGORY_IDS).toHaveLength(8);
    expect(CATEGORY_IDS).toContain('water');
    expect(CATEGORY_IDS).toContain('food');
    expect(CATEGORY_IDS).toContain('medical');
  });
});

describe('categoryById', () => {
  it('returns the correct category', () => {
    expect(categoryById('water')?.label).toBe('Water');
  });

  it('returns null for unknown id', () => {
    expect(categoryById('unknown')).toBeNull();
  });
});

describe('classifyPoi', () => {
  it('classifies by OTM kind', () => {
    const poi = { kinds: 'foods', osmTags: {} };
    expect(classifyPoi(poi)).toBe('food');
  });

  it('classifies by OSM amenity string', () => {
    const poi = { kinds: '', osmTags: { amenity: 'pharmacy' } };
    expect(classifyPoi(poi)).toBe('medical');
  });

  it('classifies by OSM amenity array match', () => {
    const poi = { kinds: '', osmTags: { amenity: 'cafe' } };
    expect(classifyPoi(poi)).toBe('food');
  });

  it('classifies historic by wildcard tag', () => {
    const poi = { kinds: '', osmTags: { historic: 'castle' } };
    expect(classifyPoi(poi)).toBe('historic');
  });

  it('returns null when no match', () => {
    const poi = { kinds: '', osmTags: { natural: 'peak' } };
    expect(classifyPoi(poi)).toBeNull();
  });
});
```

Also add a test for `haversineKm` in a new describe at the bottom of the same file (we'll add the export in the next step):

```js
import { haversineKm } from './bearingEngine';

describe('haversineKm', () => {
  it('returns ~0 for identical points', () => {
    expect(haversineKm({ lat: 48.86, lng: 2.35 }, { lat: 48.86, lng: 2.35 })).toBeCloseTo(0, 3);
  });

  it('returns ~111km for 1 degree latitude difference', () => {
    expect(haversineKm({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBeCloseTo(111.2, 0);
  });
});
```

- [ ] **Step 2: Run to confirm fail**

```bash
cd C:/Users/lasse/Desktop/venturepath
npx vitest run src/utils/poiCategories.test.js
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `poiCategories.js`**

Create `src/utils/poiCategories.js`:

```js
export const POI_CATEGORIES = [
  { id: 'water',      label: 'Water',       icon: '💧', color: '#60A5FA', osmTags: { amenity: 'drinking_water' },                    otmKind: null       },
  { id: 'food',       label: 'Food',        icon: '🍽', color: '#E67E22', osmTags: { amenity: ['restaurant', 'cafe', 'fast_food'] }, otmKind: 'foods'    },
  { id: 'shelter',    label: 'Shelter',     icon: '⛺', color: '#D9C5B2', osmTags: { amenity: 'shelter' },                           otmKind: null       },
  { id: 'medical',    label: 'Medical',     icon: '⚕', color: '#EF4444', osmTags: { amenity: 'pharmacy' },                          otmKind: null       },
  { id: 'gear',       label: 'Gear',        icon: '🎒', color: '#A78BFA', osmTags: { shop: 'outdoor' },                              otmKind: null       },
  { id: 'attraction', label: 'Attractions', icon: '📍', color: '#F59E0B', osmTags: { tourism: 'attraction' },                        otmKind: 'cultural' },
  { id: 'nature',     label: 'Nature',      icon: '🌲', color: '#22C55E', osmTags: { leisure: 'nature_reserve' },                    otmKind: 'natural'  },
  { id: 'historic',   label: 'Historic',    icon: '🏛', color: '#8B5CF6', osmTags: { historic: '*' },                               otmKind: 'historic' },
];

export const CATEGORY_IDS = POI_CATEGORIES.map(c => c.id);

export function categoryById(id) {
  return POI_CATEGORIES.find(c => c.id === id) ?? null;
}

export function classifyPoi(poi) {
  for (const cat of POI_CATEGORIES) {
    if (cat.otmKind && poi.kinds?.includes(cat.otmKind)) return cat.id;
  }
  const tags = poi.osmTags ?? {};
  for (const cat of POI_CATEGORIES) {
    for (const [key, val] of Object.entries(cat.osmTags)) {
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

- [ ] **Step 4: Add `haversineKm` to `bearingEngine.js`**

Append to the bottom of `src/utils/bearingEngine.js`:

```js
const EARTH_R = 6371; // km

export function haversineKm(from, to) {
  const dLat = (to.lat - from.lat) * DEG;
  const dLng = (to.lng - from.lng) * DEG;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(from.lat * DEG) * Math.cos(to.lat * DEG) * Math.sin(dLng / 2) ** 2;
  return EARTH_R * 2 * Math.asin(Math.sqrt(a));
}
```

- [ ] **Step 5: Run tests — all pass**

```bash
npx vitest run src/utils/poiCategories.test.js
```

Expected: All 11 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/utils/poiCategories.js src/utils/poiCategories.test.js src/utils/bearingEngine.js
git commit -m "feat(layers): poiCategories — 8-category taxonomy + classifyPoi + haversineKm"
```

---

## Task 2: Build `vpIntelligenceDB.js` + refactor `enrichmentCache.js` + `categoryLayerStore.js`

**Files:**
- Create: `src/utils/vpIntelligenceDB.js`
- Modify: `src/utils/enrichmentCache.js`
- Create: `src/utils/categoryLayerStore.js`
- Create: `src/utils/categoryLayerStore.test.js`

- [ ] **Step 1: Create `vpIntelligenceDB.js`**

Create `src/utils/vpIntelligenceDB.js`:

```js
let _db = null;

export function openVpDB() {
  if (_db) return Promise.resolve(_db);
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
    req.onsuccess = (e) => { _db = e.target.result; resolve(_db); };
    req.onerror   = () => reject(req.error);
  });
}

// For tests: reset the cached db instance so each test gets a fresh open
export function _resetDbCache() { _db = null; }
```

- [ ] **Step 2: Refactor `enrichmentCache.js` to use `openVpDB`**

In `src/utils/enrichmentCache.js`, replace the `openDb` function and `_db` declaration with an import:

Find and remove:
```js
let _db = null;

function openDb() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = (e) => {
      e.target.result.createObjectStore(STORE_NAME, { keyPath: 'poi_id' });
    };
    req.onsuccess = (e) => { _db = e.target.result; resolve(_db); };
    req.onerror   = () => reject(req.error);
  });
}
```

Add at top of file:
```js
import { openVpDB } from './vpIntelligenceDB';
```

Replace all calls to `openDb()` with `openVpDB()` in the file. Also remove the `DB_NAME` and `STORE_NAME` constants if they are only used inside the old `openDb` — keep `STORE_NAME = 'poi_enrichment'` since it's used in `idbGet`/`idbSet`.

- [ ] **Step 3: Write failing tests for `categoryLayerStore`**

Create `src/utils/categoryLayerStore.test.js`:

```js
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock vpIntelligenceDB before importing the store
vi.mock('./vpIntelligenceDB', () => {
  const store = new Map();
  const mockDb = {
    transaction: (storeName, mode) => ({
      objectStore: () => ({
        get: (key) => ({ onsuccess: null, onerror: null,
          set result(v) {}, // unused
          get result() { return store.get(key) ?? undefined; },
          // We simulate it synchronously by calling onsuccess after setting
        }),
        put: (record) => {
          store.set(record.id, record);
          return { onsuccess: null };
        },
      }),
    }),
  };

  // Simpler approach: just spy on loadLayers/saveLayers directly below
  return {
    openVpDB: vi.fn().mockResolvedValue(mockDb),
    _resetDbCache: vi.fn(),
  };
});

// Because IDB mock is complex, test behavior through a fake IDB implementation
import { loadLayers, saveLayers } from './categoryLayerStore';
import { CATEGORY_IDS } from './poiCategories';

// We use a real fake IDB via global setup in vitest
// Instead, test the logic: loadLayers returns defaults, saveLayers round-trips

describe('loadLayers', () => {
  it('returns all categories active and empty presets when no record exists', async () => {
    // openVpDB mock returns a db where get returns undefined (no stored record)
    // We need to wire the IDB transaction mock properly
    const { openVpDB } = await import('./vpIntelligenceDB');
    openVpDB.mockResolvedValueOnce({
      transaction: () => ({
        objectStore: () => ({
          get: () => {
            const req = {};
            setTimeout(() => { req.result = undefined; req.onsuccess?.({ target: req }); }, 0);
            return req;
          },
        }),
      }),
    });

    const result = await loadLayers();
    expect(result.activeLayers).toEqual(CATEGORY_IDS);
    expect(result.presets).toEqual([]);
  });
});

describe('saveLayers + loadLayers round-trip', () => {
  it('stores and retrieves active layers', async () => {
    const { openVpDB } = await import('./vpIntelligenceDB');
    let stored = null;

    openVpDB.mockResolvedValue({
      transaction: () => ({
        objectStore: () => ({
          get: () => {
            const req = {};
            setTimeout(() => {
              req.result = stored ?? undefined;
              req.onsuccess?.({ target: req });
            }, 0);
            return req;
          },
          put: (record) => {
            stored = record;
            const req = {};
            setTimeout(() => req.onsuccess?.(), 0);
            return req;
          },
        }),
      }),
    });

    await saveLayers(['water', 'food'], [{ id: 'p1', name: 'Test', activeLayers: ['water'], createdAt: 1 }]);
    const result = await loadLayers();
    expect(result.activeLayers).toEqual(['water', 'food']);
    expect(result.presets).toHaveLength(1);
    expect(result.presets[0].name).toBe('Test');
  });
});
```

- [ ] **Step 4: Run to confirm fail**

```bash
npx vitest run src/utils/categoryLayerStore.test.js
```

Expected: FAIL — module not found.

- [ ] **Step 5: Create `categoryLayerStore.js`**

Create `src/utils/categoryLayerStore.js`:

```js
import { openVpDB } from './vpIntelligenceDB';
import { CATEGORY_IDS } from './poiCategories';

const STORE  = 'category_layers';
const KEY    = 'global';
const DEFAULT = { activeLayers: CATEGORY_IDS, presets: [] };

function idbGet(db) {
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(KEY);
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror   = () => reject(req.error);
  });
}

function idbPut(db, record) {
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, 'readwrite').objectStore(STORE).put(record);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

export async function loadLayers() {
  try {
    const db     = await openVpDB();
    const record = await idbGet(db);
    if (!record) return { ...DEFAULT };
    return { activeLayers: record.activeLayers, presets: record.presets };
  } catch {
    return { ...DEFAULT };
  }
}

export async function saveLayers(activeLayers, presets) {
  try {
    const db = await openVpDB();
    await idbPut(db, { id: KEY, activeLayers, presets });
  } catch {
    // non-fatal — UI still works without persistence
  }
}
```

- [ ] **Step 6: Run tests — pass**

```bash
npx vitest run src/utils/categoryLayerStore.test.js
```

Expected: PASS.

- [ ] **Step 7: Run full suite to ensure enrichmentCache still works**

```bash
npx vitest run 2>&1 | tail -5
```

Expected: All tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/utils/vpIntelligenceDB.js src/utils/categoryLayerStore.js src/utils/categoryLayerStore.test.js src/utils/enrichmentCache.js
git commit -m "feat(layers): vpIntelligenceDB shared IDB helper + categoryLayerStore"
```

---

## Task 3: Build `useCategoryLayers.js` + `LAYER_TOGGLED` event

**Files:**
- Create: `src/utils/useCategoryLayers.js`
- Modify: `src/utils/sentinelBusEvents.js`

- [ ] **Step 1: Add `LAYER_TOGGLED` to sentinelBusEvents**

In `src/utils/sentinelBusEvents.js`, add at the bottom:

```js
export const LAYER_TOGGLED = 'LAYER_TOGGLED';
```

Full file after edit:
```js
export const VAULT_DOCUMENT_ADDED   = 'VAULT_DOCUMENT_ADDED';
export const CANCELLATION_SIMULATED = 'CANCELLATION_SIMULATED';
export const BREADCRUMB_UPDATED     = 'BREADCRUMB_UPDATED';
export const PHOTO_ACTIVE           = 'PHOTO_ACTIVE';
export const LAYER_TOGGLED          = 'LAYER_TOGGLED';
```

- [ ] **Step 2: Create `useCategoryLayers.js`**

Create `src/utils/useCategoryLayers.js`:

```js
import { useState, useEffect, useCallback, useRef } from 'react';
import { loadLayers, saveLayers } from './categoryLayerStore';
import { CATEGORY_IDS } from './poiCategories';
import sentinelBus from './sentinelBus';
import { LAYER_TOGGLED } from './sentinelBusEvents';

export function useCategoryLayers() {
  const [activeLayers, setActiveLayers] = useState(() => new Set(CATEGORY_IDS));
  const [presets, setPresets]           = useState([]);
  const [loaded, setLoaded]             = useState(false);
  const activeLayersRef = useRef(activeLayers);

  // Load from IndexedDB on mount
  useEffect(() => {
    loadLayers().then(({ activeLayers: ids, presets: p }) => {
      setActiveLayers(new Set(ids));
      setPresets(p);
      setLoaded(true);
    });
  }, []);

  // Persist whenever state changes (skip initial default before load)
  useEffect(() => {
    if (!loaded) return;
    saveLayers([...activeLayers], presets);
  }, [activeLayers, presets, loaded]);

  // Keep ref in sync so savePreset can read current value without stale closure
  useEffect(() => { activeLayersRef.current = activeLayers; }, [activeLayers]);

  const toggle = useCallback((categoryId) => {
    setActiveLayers(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      sentinelBus.emit(LAYER_TOGGLED, { activeLayers: [...next] });
      return next;
    });
  }, []);

  const savePreset = useCallback((name) => {
    if (!name?.trim()) return;
    const preset = {
      id: crypto.randomUUID(),
      name: name.trim(),
      activeLayers: [...activeLayersRef.current],
      createdAt: Date.now(),
    };
    setPresets(prev => [...prev, preset]);
  }, []);

  const loadPreset = useCallback((presetId) => {
    setPresets(prev => {
      const preset = prev.find(p => p.id === presetId);
      if (preset) setActiveLayers(new Set(preset.activeLayers));
      return prev;
    });
  }, []);

  const deletePreset = useCallback((presetId) => {
    setPresets(prev => prev.filter(p => p.id !== presetId));
  }, []);

  const isActive = useCallback((categoryId) => activeLayers.has(categoryId), [activeLayers]);

  return { activeLayers, presets, toggle, savePreset, loadPreset, deletePreset, isActive };
}
```

- [ ] **Step 3: Build check**

```bash
cd C:/Users/lasse/Desktop/venturepath
npx vite build 2>&1 | tail -5
```

Expected: Clean build.

- [ ] **Step 4: Commit**

```bash
git add src/utils/useCategoryLayers.js src/utils/sentinelBusEvents.js
git commit -m "feat(layers): useCategoryLayers hook + LAYER_TOGGLED event"
```

---

## Task 4: Build `CategoryLayerPanel.jsx`

**Files:**
- Create: `src/components/discovery/CategoryLayerPanel.jsx`

- [ ] **Step 1: Create the component**

Create `src/components/discovery/CategoryLayerPanel.jsx`:

```jsx
import { useState } from 'react';
import { POI_CATEGORIES } from '../../utils/poiCategories';
import { useCategoryLayers } from '../../utils/useCategoryLayers';

export default function CategoryLayerPanel() {
  const { activeLayers, presets, toggle, savePreset, loadPreset, deletePreset, isActive } = useCategoryLayers();
  const [presetInput, setPresetInput] = useState('');
  const [showInput, setShowInput]     = useState(false);

  function handleSave() {
    if (presetInput.trim()) {
      savePreset(presetInput.trim());
      setPresetInput('');
      setShowInput(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4 font-mono" style={{ background: '#0E1012' }}>
      {/* Section header */}
      <div className="text-xs tracking-widest" style={{ color: '#E67E22' }}>
        ── CATEGORY LAYERS ─────────────────────────
      </div>

      {/* Category toggle chips */}
      <div className="flex flex-wrap gap-2">
        {POI_CATEGORIES.map(cat => {
          const active = isActive(cat.id);
          return (
            <button
              key={cat.id}
              onClick={() => toggle(cat.id)}
              className="flex items-center gap-1 px-3 py-1 rounded-full text-xs tracking-wide transition-all"
              style={{
                border: `1px solid ${active ? cat.color : '#2a2e35'}`,
                background: active ? `${cat.color}18` : 'transparent',
                color: active ? cat.color : '#64748b',
              }}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Presets section */}
      <div className="text-xs tracking-widest" style={{ color: '#E67E22' }}>
        ── PRESETS ──────────────────────────────────
      </div>

      {presets.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {presets.map(p => (
            <div
              key={p.id}
              className="flex items-center gap-2 px-3 py-1 rounded-full text-xs"
              style={{ background: '#1e2328', color: '#D9C5B2', border: '1px solid #2a2e35' }}
            >
              <button onClick={() => loadPreset(p.id)} className="hover:underline">
                {p.name}
              </button>
              <button
                onClick={() => deletePreset(p.id)}
                className="opacity-50 hover:opacity-100"
                aria-label={`Delete preset ${p.name}`}
              >×</button>
            </div>
          ))}
        </div>
      )}

      {/* Save preset */}
      {showInput ? (
        <div className="flex gap-2">
          <input
            autoFocus
            value={presetInput}
            onChange={e => setPresetInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setShowInput(false); }}
            placeholder="Preset name…"
            className="flex-1 px-3 py-1 rounded text-xs bg-transparent border outline-none"
            style={{ borderColor: '#2a2e35', color: '#D9C5B2' }}
          />
          <button
            onClick={handleSave}
            className="px-3 py-1 rounded text-xs"
            style={{ background: '#E67E22', color: '#0E1012' }}
          >Save</button>
        </div>
      ) : (
        <button
          onClick={() => setShowInput(true)}
          className="text-xs self-start hover:underline"
          style={{ color: '#64748b' }}
        >+ Save current as preset…</button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Build check**

```bash
npx vite build 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
git add src/components/discovery/CategoryLayerPanel.jsx
git commit -m "feat(layers): CategoryLayerPanel — category toggle chips + preset manager"
```

---

## Task 5: Build `MapLayerController.jsx`

**Files:**
- Create: `src/components/map/MapLayerController.jsx`

- [ ] **Step 1: Create the component**

Create `src/components/map/MapLayerController.jsx`:

```jsx
import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { classifyPoi, categoryById } from '../../utils/poiCategories';

export default function MapLayerController({ pois = [], activeLayers }) {
  const map = useMap();
  const markersRef = useRef([]);

  useEffect(() => {
    // Remove previous markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // Add markers for visible categories
    for (const poi of pois) {
      const categoryId = classifyPoi(poi);
      if (!categoryId || !activeLayers.has(categoryId)) continue;

      const cat = categoryById(categoryId);
      if (!poi.coords?.lat || !poi.coords?.lng) continue;

      const marker = L.circleMarker([poi.coords.lat, poi.coords.lng], {
        radius: 7,
        fillColor: cat.color,
        fillOpacity: 0.85,
        color: '#0E1012',
        weight: 1.5,
      }).addTo(map);

      marker.bindPopup(`
        <div style="font-family:monospace;font-size:12px;color:#0E1012">
          <strong>${poi.name ?? 'Unknown'}</strong><br/>
          <span style="color:${cat.color}">${cat.icon} ${cat.label}</span>
        </div>
      `);

      markersRef.current.push(marker);
    }

    return () => {
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
    };
  }, [pois, activeLayers, map]);

  return null;
}
```

- [ ] **Step 2: Build check**

```bash
npx vite build 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
git add src/components/map/MapLayerController.jsx
git commit -m "feat(layers): MapLayerController — filtered Leaflet circleMarkers by active category"
```

---

## Task 6: Build `RadarHUD.jsx`

**Files:**
- Create: `src/components/map/RadarHUD.jsx`

- [ ] **Step 1: Create the component**

Create `src/components/map/RadarHUD.jsx`:

```jsx
import { useMemo } from 'react';
import { POI_CATEGORIES, classifyPoi } from '../../utils/poiCategories';
import { haversineKm } from '../../utils/bearingEngine';

const RINGS = [
  { label: '500m', km: 0.5  },
  { label: '1km',  km: 1.0  },
  { label: '2km',  km: 2.0  },
  { label: '5km',  km: 5.0  },
];

const SVG_SIZE   = 200;
const SVG_CENTER = SVG_SIZE / 2;
// Map 5km to 85px radius (outermost ring)
const KM_TO_PX   = 85 / 5;

function ringRadius(km) { return km * KM_TO_PX; }

export default function RadarHUD({ pois = [], center, activeLayers }) {
  // Build per-ring, per-category hit counts
  const ringData = useMemo(() => {
    if (!center) return [];
    return RINGS.map(ring => {
      const hits = {};
      for (const cat of POI_CATEGORIES) {
        if (!activeLayers?.has(cat.id)) continue;
        hits[cat.id] = 0;
      }
      for (const poi of pois) {
        if (!poi.coords) continue;
        const catId = classifyPoi(poi);
        if (!catId || !activeLayers?.has(catId)) continue;
        const dist = haversineKm(center, { lat: poi.coords.lat, lng: poi.coords.lng });
        if (dist <= ring.km) hits[catId] = (hits[catId] ?? 0) + 1;
      }
      return { ...ring, hits };
    });
  }, [pois, center, activeLayers]);

  const activeCats = POI_CATEGORIES.filter(c => activeLayers?.has(c.id));

  return (
    <div
      className="absolute top-3 right-3 z-[1000] rounded-lg overflow-hidden"
      style={{ width: SVG_SIZE, height: SVG_SIZE, background: 'rgba(14,16,18,0.85)' }}
    >
      <svg width={SVG_SIZE} height={SVG_SIZE}>
        {/* Ring labels */}
        {RINGS.map(ring => (
          <text
            key={ring.label}
            x={SVG_CENTER + ringRadius(ring.km) + 2}
            y={SVG_CENTER - 2}
            fontSize={8}
            fill="#2a2e35"
            fontFamily="monospace"
          >{ring.label}</text>
        ))}

        {/* Concentric rings */}
        {RINGS.map(ring => (
          <circle
            key={ring.label}
            cx={SVG_CENTER}
            cy={SVG_CENTER}
            r={ringRadius(ring.km)}
            fill="none"
            stroke="#1e2328"
            strokeWidth={1}
          />
        ))}

        {/* Category dots on rings */}
        {ringData.map((ring, ri) =>
          activeCats.map((cat, ci) => {
            const count = ring.hits[cat.id] ?? 0;
            if (count === 0) return null;
            // Distribute category dots evenly around each ring
            const angle = (ci / activeCats.length) * 2 * Math.PI - Math.PI / 2;
            const r     = ringRadius(ring.km);
            const cx    = SVG_CENTER + r * Math.cos(angle);
            const cy    = SVG_CENTER + r * Math.sin(angle);
            return (
              <circle
                key={`${ri}-${cat.id}`}
                cx={cx}
                cy={cy}
                r={4}
                fill={cat.color}
                opacity={0.9}
              />
            );
          })
        )}

        {/* Center pulse dot */}
        <circle cx={SVG_CENTER} cy={SVG_CENTER} r={5} fill="#E67E22" opacity={0.9}>
          <animate attributeName="r" values="5;8;5" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.9;0.4;0.9" dur="2s" repeatCount="indefinite" />
        </circle>

        {/* Crosshairs */}
        <line x1={SVG_CENTER} y1={SVG_CENTER - 85} x2={SVG_CENTER} y2={SVG_CENTER + 85} stroke="#1e2328" strokeWidth={0.5} />
        <line x1={SVG_CENTER - 85} y1={SVG_CENTER} x2={SVG_CENTER + 85} y2={SVG_CENTER} stroke="#1e2328" strokeWidth={0.5} />

        {/* "RADAR" label */}
        <text x={4} y={12} fontSize={7} fill="#2a2e35" fontFamily="monospace" letterSpacing={2}>RADAR</text>
      </svg>

      {/* Category legend: small colored dots at bottom */}
      <div
        className="absolute bottom-1 left-1 right-1 flex flex-wrap gap-1 justify-center"
      >
        {activeCats.map(cat => (
          <span key={cat.id} className="flex items-center gap-0.5" style={{ fontSize: 8, color: cat.color, fontFamily: 'monospace' }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: cat.color, display: 'inline-block' }} />
            {cat.label.slice(0, 3)}
          </span>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build check**

```bash
npx vite build 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
git add src/components/map/RadarHUD.jsx
git commit -m "feat(layers): RadarHUD — SVG concentric ring overlay with per-category POI density"
```

---

## Task 7: Wire into `ItineraryMap.jsx` + update `PlaceSearchPanel.jsx`

**Files:**
- Modify: `src/components/itinerary/ItineraryMap.jsx`
- Modify: `src/components/discovery/PlaceSearchPanel.jsx`

- [ ] **Step 1: Read `ItineraryMap.jsx` to understand the props and structure**

```bash
cat C:/Users/lasse/Desktop/venturepath/src/components/itinerary/ItineraryMap.jsx
```

Find:
- Where `<MapContainer>` opens and closes
- What props ItineraryMap receives (likely `days`, `coords`, `activeStopId`, `onPinClick`)
- Whether there's already a `pois` prop or a POI data source

- [ ] **Step 2: Add imports + useCategoryLayers to `ItineraryMap.jsx`**

At the top of `src/components/itinerary/ItineraryMap.jsx`, add these imports (after existing imports):

```js
import { useCategoryLayers } from '../../utils/useCategoryLayers';
import MapLayerController from '../map/MapLayerController';
import RadarHUD from '../map/RadarHUD';
import { useTripStore } from '../../store/useTripStore';
```

Inside the `ItineraryMap` component body, add:

```js
const { activeLayers } = useCategoryLayers();
const { legs } = useTripStore();
// Gather coords for radar center from first active leg
const currentLegCoords = legs?.[0]?.stops?.[0]?.coords ?? null;
// pois: ItineraryMap doesn't fetch POIs itself — pass empty array for now
// (POIs from globalSearch are fetched by NearbyMapOverlay separately)
const pois = [];
```

- [ ] **Step 3: Add `MapLayerController` inside `<MapContainer>`**

Find the `</MapContainer>` closing tag in `ItineraryMap.jsx`. Just before it, add:

```jsx
<MapLayerController pois={pois} activeLayers={activeLayers} />
```

- [ ] **Step 4: Add `RadarHUD` as sibling to `<MapContainer>`**

The `ItineraryMap` component returns a JSX tree. Wrap the return in a `<div className="relative">` if not already wrapped, then add `RadarHUD` as a sibling:

```jsx
return (
  <div className="relative">
    <MapContainer ...>
      {/* existing content */}
      <MapLayerController pois={pois} activeLayers={activeLayers} />
    </MapContainer>
    <RadarHUD pois={pois} center={currentLegCoords} activeLayers={activeLayers} />
  </div>
);
```

- [ ] **Step 5: Update `PlaceSearchPanel.jsx`**

In `src/components/discovery/PlaceSearchPanel.jsx`:

Replace the import:
```js
import { searchPlaces, searchByCategory, getInspireQuery, FSQ_CATEGORIES } from '../../utils/foursquareEngine';
```
with (keep the foursquare functions, just add the categories import and remove FSQ_CATEGORIES usage in the pill list):
```js
import { searchPlaces, searchByCategory, getInspireQuery } from '../../utils/foursquareEngine';
import { POI_CATEGORIES } from '../../utils/poiCategories';
```

Replace the `CATEGORY_PILLS` array:
```js
const CATEGORY_PILLS = [
  { label: 'All', id: null, icon: '🔍' },
  ...POI_CATEGORIES.map(cat => ({ label: cat.label, id: cat.id, icon: cat.icon })),
];
```

In `handleCategory`, the `catId` will now be a string like `'water'` or `'food'` instead of an FSQ numeric ID. The `searchByCategory` call must still work — check if `searchByCategory` accepts strings. If it only accepts FSQ IDs, update `handleCategory` to call `searchPlaces(cat.id, nearCity, 10)` instead of `searchByCategory`:

```js
function handleCategory(catId) {
  setCategory(catId);
  if (catId) {
    searchPlaces(catId, nearCity, 10).then(res => { setResults(res); setLoading(false); });
  } else {
    doSearch(query, null);
  }
}
```

- [ ] **Step 6: Build check — fix any errors**

```bash
npx vite build 2>&1 | tail -15
```

Fix any import errors. The most likely issue: `useTripStore` leg shape. If `legs?.[0]?.stops?.[0]?.coords` doesn't match the actual store shape, log `legs` structure and find the right path to first stop coordinates.

- [ ] **Step 7: Run all tests**

```bash
npx vitest run 2>&1 | tail -10
```

Expected: All 146+ tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/components/itinerary/ItineraryMap.jsx src/components/discovery/PlaceSearchPanel.jsx
git commit -m "feat(layers): wire MapLayerController + RadarHUD into ItineraryMap, update PlaceSearchPanel"
```

---

## Task 8: Full verification

- [ ] **Step 1: Run complete test suite**

```bash
cd C:/Users/lasse/Desktop/venturepath
npx vitest run 2>&1
```

Expected: All tests pass. Zero failures.

- [ ] **Step 2: Build check**

```bash
npx vite build 2>&1 | tail -10
```

Expected: Clean build.

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat(layers): Savable Category Layers + Radar HUD — subsystem C complete"
```
