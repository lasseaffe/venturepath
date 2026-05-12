# Stays Map Pins + Discovery Real Data + Maps — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace broken OTM/Foursquare geo queries with Nominatim+Overpass (free, accurate), add a split-panel map to the STAYS tab, and add a shared top map to the DISCOVERY tab with real destination-aware pins.

**Architecture:** A single `osmEngine.js` module handles all geo queries (geocode → bounding box → Overpass QL). The STAYS tab gains a right-side Leaflet map panel with two-way card↔pin binding. The DISCOVERY tab gains a shared `DiscoveryMap` component at the top fed by parallel OSM attraction + food fetches in TripPlanner. VibeCheck replaces hardcoded fake social data with real OSM category counts.

**Tech Stack:** React 18, Leaflet 1.9.4, react-leaflet 5.0.0, Nominatim API (free), Overpass API (free), CartoDB dark tiles (free)

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/utils/osmEngine.js` | **CREATE** | Nominatim geocode + Overpass query + named convenience fns + module cache |
| `src/utils/foursquareEngine.js` | **KEEP** (stub imports) | Do not delete — ScoutPinsLayer, BasecampScout, PlaceSearchPanel still reference it; stub the exports used by components we're NOT touching |
| `src/utils/vibeCheckEngine.js` | **REPLACE** | Delete hardcoded data; re-export `generateVibes(city)` using osmEngine |
| `src/components/logistics/AccommodationSearch.jsx` | **MODIFY** | Wire osmEngine, add split-panel Leaflet map, two-way selection binding |
| `src/components/discovery/DiscoveryMap.jsx` | **CREATE** | Shared Leaflet map for Discovery tab, attraction + food pins |
| `src/components/discovery/MustSee.jsx` | **MODIFY** | Accept `attractions` + `selectedId` + `onSelect` props; remove OTM call |
| `src/components/discovery/LocalFlavor.jsx` | **MODIFY** | Accept `food` + `selectedId` + `onSelect` props; remove OTM call |
| `src/components/discovery/VibeCheck.jsx` | **MODIFY** | Use real vibes from vibeCheckEngine; remove fake source labels |
| `src/pages/TripPlanner.jsx` | **MODIFY** | Discovery tab: parallel OSM fetch, state for selectedId + categories, render DiscoveryMap |

---

## Task 1: Build `osmEngine.js`

**Files:**
- Create: `src/utils/osmEngine.js`
- Create: `src/utils/osmEngine.test.js`

- [ ] **Step 1: Write failing tests**

Create `src/utils/osmEngine.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock fetch globally
global.fetch = vi.fn()

describe('osmEngine', () => {
  beforeEach(() => vi.clearAllMocks())

  it('geocodeCity returns lat/lon/bbox for a valid city', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { lat: '48.8566', lon: '2.3522', boundingbox: ['48.8155', '48.9022', '2.2242', '2.4699'] }
      ]
    })
    const { geocodeCity } = await import('./osmEngine.js')
    const result = await geocodeCity('Paris')
    expect(result.lat).toBeCloseTo(48.8566)
    expect(result.lon).toBeCloseTo(2.3522)
    expect(result.bbox).toHaveLength(4)
  })

  it('geocodeCity returns null for unknown city', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => [] })
    const { geocodeCity } = await import('./osmEngine.js')
    const result = await geocodeCity('xyzunknowncity')
    expect(result).toBeNull()
  })

  it('searchAccommodation returns shaped place objects', async () => {
    // geocode call
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { lat: '48.8566', lon: '2.3522', boundingbox: ['48.8155', '48.9022', '2.2242', '2.4699'] }
      ]
    })
    // overpass call
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        elements: [
          { type: 'node', id: 1, lat: 48.86, lon: 2.35, tags: { name: 'Hotel Lumière', tourism: 'hotel', stars: '4' } },
          { type: 'node', id: 2, lat: 48.87, lon: 2.36, tags: { name: 'Hostel Central', tourism: 'hostel' } }
        ]
      })
    })
    const { searchAccommodation } = await import('./osmEngine.js')
    const results = await searchAccommodation('Paris', 'all')
    expect(results).toHaveLength(2)
    expect(results[0]).toMatchObject({ id: '1', name: 'Hotel Lumière', lat: 48.86, lon: 2.35 })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd C:\Users\lasse\Desktop\venturepath
npx vitest run src/utils/osmEngine.test.js
```

Expected: FAIL — `osmEngine.js` does not exist yet.

- [ ] **Step 3: Create `src/utils/osmEngine.js`**

```js
const NOMINATIM = 'https://nominatim.openstreetmap.org'
const OVERPASS  = 'https://overpass-api.de/api/interpreter'
const UA        = 'VenturePath/1.0 (contact@venturepath.app)'

// Module-level cache: key = `${city}:${type}` → results array
const _cache = new Map()

export async function geocodeCity(city) {
  const url = `${NOMINATIM}/search?q=${encodeURIComponent(city)}&format=json&limit=1`
  const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'en' } })
  if (!res.ok) return null
  const data = await res.json()
  if (!data.length) return null
  const { lat, lon, boundingbox } = data[0]
  return { lat: parseFloat(lat), lon: parseFloat(lon), bbox: boundingbox.map(parseFloat) }
}

async function _overpass(bbox, tagFilter, limit = 30) {
  const [s, n, w, e] = [bbox[0], bbox[1], bbox[2], bbox[3]]
  const body = `[out:json][timeout:25];(node[${tagFilter}](${s},${w},${n},${e}););out body ${limit};`
  const res = await fetch(OVERPASS, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(body)}`
  })
  if (!res.ok) return []
  const data = await res.json()
  return (data.elements ?? []).map(el => ({
    id:   String(el.id),
    name: el.tags?.name ?? el.tags?.['name:en'] ?? 'Unnamed',
    lat:  el.lat,
    lon:  el.lon,
    tags: el.tags ?? {}
  })).filter(p => p.lat && p.lon && p.name !== 'Unnamed')
}

const ACCOM_TAGS = {
  hotel:     'tourism=hotel',
  hostel:    'tourism=hostel',
  apartment: 'tourism=apartment',
  camping:   'tourism=camp_site',
  all:       'tourism~"hotel|hostel|apartment|camp_site"'
}

const ATTRACTION_TAGS = {
  historic:   'historic',
  cultural:   'tourism~"museum|artwork|gallery"',
  natural:    'natural~"peak|waterfall|cave_entrance"',
  religion:   'amenity=place_of_worship',
  viewpoints: 'tourism=viewpoint',
  all:        'tourism~"attraction|museum|viewpoint"'
}

const FOOD_TAGS = {
  restaurants: 'amenity=restaurant',
  cafes:       'amenity=cafe',
  bars:        'amenity=bar',
  markets:     'amenity=marketplace',
  street_food: 'amenity=fast_food',
  all:         'amenity~"restaurant|cafe|bar|marketplace|fast_food"'
}

async function _cached(key, fn) {
  if (_cache.has(key)) return _cache.get(key)
  const result = await fn()
  _cache.set(key, result)
  return result
}

export async function searchAccommodation(city, type = 'all') {
  return _cached(`accom:${city}:${type}`, async () => {
    const geo = await geocodeCity(city)
    if (!geo) return []
    return _overpass(geo.bbox, ACCOM_TAGS[type] ?? ACCOM_TAGS.all, 40)
  })
}

export async function searchAttractions(city, category = 'all') {
  return _cached(`attr:${city}:${category}`, async () => {
    const geo = await geocodeCity(city)
    if (!geo) return []
    return _overpass(geo.bbox, ATTRACTION_TAGS[category] ?? ATTRACTION_TAGS.all, 40)
  })
}

export async function searchFood(city, category = 'all') {
  return _cached(`food:${city}:${category}`, async () => {
    const geo = await geocodeCity(city)
    if (!geo) return []
    return _overpass(geo.bbox, FOOD_TAGS[category] ?? FOOD_TAGS.all, 40)
  })
}

// Returns top vibes by count of OSM category nodes in bbox
export async function generateVibes(city) {
  const geo = await geocodeCity(city)
  if (!geo) return []

  const categories = [
    { tag: 'Hiking Trails',     emoji: '🥾', filter: 'route=hiking' },
    { tag: 'Street Food',       emoji: '🍜', filter: 'amenity=fast_food' },
    { tag: 'Historic Sites',    emoji: '🏛️', filter: 'historic=yes' },
    { tag: 'Viewpoints',        emoji: '🔭', filter: 'tourism=viewpoint' },
    { tag: 'Cafés',             emoji: '☕', filter: 'amenity=cafe' },
    { tag: 'Night Markets',     emoji: '🌙', filter: 'amenity=marketplace' },
    { tag: 'Museums',           emoji: '🖼️', filter: 'tourism=museum' },
    { tag: 'Parks & Nature',    emoji: '🌿', filter: 'leisure=park' },
    { tag: 'Local Bars',        emoji: '🍻', filter: 'amenity=bar' },
  ]

  const counts = await Promise.all(
    categories.map(async c => {
      const results = await _overpass(geo.bbox, c.filter, 50)
      return { ...c, score: results.length, results }
    })
  )

  return counts
    .filter(c => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 7)
    .map(c => ({ tag: c.tag, emoji: c.emoji, score: c.score, source: 'OpenStreetMap', results: c.results }))
}

export function clearCache() { _cache.clear() }
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/utils/osmEngine.test.js
```

Expected: 3 passing.

- [ ] **Step 5: Commit**

```bash
git -C C:\Users\lasse\Desktop\venturepath add src/utils/osmEngine.js src/utils/osmEngine.test.js
git -C C:\Users\lasse\Desktop\venturepath commit -m "feat(osm): add osmEngine with Nominatim geocode + Overpass query"
```

---

## Task 2: Replace `vibeCheckEngine.js`

**Files:**
- Modify: `src/utils/vibeCheckEngine.js`

- [ ] **Step 1: Overwrite `vibeCheckEngine.js` with OSM-backed implementation**

Replace the entire file content with:

```js
import { generateVibes } from './osmEngine.js'

// Thin re-export — consumers use fetchVibes(city) same as before
export async function fetchVibes(city) {
  return generateVibes(city)
}
```

- [ ] **Step 2: Commit**

```bash
git -C C:\Users\lasse\Desktop\venturepath add src/utils/vibeCheckEngine.js
git -C C:\Users\lasse\Desktop\venturepath commit -m "feat(vibes): replace hardcoded destination vibes with live OSM counts"
```

---

## Task 3: Update `VibeCheck.jsx` to use real data

**Files:**
- Modify: `src/components/discovery/VibeCheck.jsx`

- [ ] **Step 1: Read the current file**

Open `src/components/discovery/VibeCheck.jsx` and note:
- `fetchVibes(destinationId)` is already called on mount (line ~21)
- Vibes are rendered with `.source` label (fake "Instagram"/"TikTok") — remove this
- `VIBE_TO_ACTIVITY` maps vibe tags to hardcoded activity blocks — replace with real OSM results from vibe

- [ ] **Step 2: Update VibeCheck to render real vibe data**

Find the vibe card render block (where `.source` is displayed) and change it so source shows `OpenStreetMap` badge instead of social platform. Find the activity generation logic and replace hardcoded `VIBE_TO_ACTIVITY` lookup:

Replace any block like:
```jsx
<span className="text-xs text-gray-500">{vibe.source}</span>
```
with:
```jsx
<span className="text-xs font-mono text-[#D9C5B2]">OSM</span>
```

Find the `VIBE_TO_ACTIVITY` usage and replace generated activities with the real results from the vibe object. The `generateVibes` result now includes `results: [{ id, name, lat, lon }]` on each vibe. Replace hardcoded activity blocks with:

```jsx
// When user clicks "Generate Itinerary from N Vibes":
const activities = selectedVibes.flatMap(vibe =>
  (vibe.results ?? []).slice(0, 3).map(place => ({
    id: place.id,
    name: place.name,
    time: '10:00',
    duration: '90 min',
    category: vibe.tag,
    emoji: vibe.emoji
  }))
)
setGeneratedActivities(activities)
```

Remove the `VIBE_TO_ACTIVITY` import/constant entirely.

- [ ] **Step 3: Start dev server and verify Vibe-Check loads real data for a destination**

```bash
cd C:\Users\lasse\Desktop\venturepath && npm run dev
```

Open `http://localhost:3001`, navigate to a trip → DISCOVERY tab → confirm VibeCheck shows real category counts and "OSM" source badge.

- [ ] **Step 4: Commit**

```bash
git -C C:\Users\lasse\Desktop\venturepath add src/components/discovery/VibeCheck.jsx
git -C C:\Users\lasse\Desktop\venturepath commit -m "feat(vibes): render real OSM vibe counts, remove fake social sources"
```

---

## Task 4: Update MustSee to accept props (remove OTM)

**Files:**
- Modify: `src/components/discovery/MustSee.jsx`

- [ ] **Step 1: Rewrite MustSee to accept props instead of fetching internally**

Replace the entire component with a prop-driven version. The parent (TripPlanner) will supply data:

```jsx
import React, { useState } from 'react'

const CATEGORIES = ['ALL', 'HISTORIC', 'CULTURAL', 'NATURAL', 'RELIGION', 'VIEWPOINTS']
const CAT_MAP = {
  ALL: 'all', HISTORIC: 'historic', CULTURAL: 'cultural',
  NATURAL: 'natural', RELIGION: 'religion', VIEWPOINTS: 'viewpoints'
}

export default function MustSee({ attractions = [], loading = false, onCategoryChange, selectedId, onSelect }) {
  const [activeTab, setActiveTab] = useState('ALL')

  function handleTab(tab) {
    setActiveTab(tab)
    onCategoryChange?.(CAT_MAP[tab])
  }

  return (
    <div className="bg-[#0E1012] border border-[#1a1d20] rounded p-4 font-mono">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs text-[#D9C5B2] uppercase tracking-widest">Must-See</p>
        </div>
      </div>

      {/* Category filters */}
      <div className="flex gap-2 flex-wrap mb-3">
        {CATEGORIES.map(c => (
          <button
            key={c}
            onClick={() => handleTab(c)}
            className={`text-xs px-2 py-1 rounded border transition-colors ${
              activeTab === c
                ? 'bg-[#E67E22] border-[#E67E22] text-black'
                : 'border-[#333] text-[#D9C5B2] hover:border-[#E67E22]'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Results */}
      {loading && <p className="text-xs text-[#D9C5B2] animate-pulse">Scanning OpenStreetMap…</p>}
      {!loading && attractions.length === 0 && (
        <p className="text-xs text-[#555]">No attractions found for this destination.</p>
      )}
      <ul className="space-y-2 max-h-64 overflow-y-auto">
        {attractions.map(place => (
          <li
            key={place.id}
            onClick={() => onSelect?.(place.id)}
            className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors ${
              selectedId === place.id
                ? 'border-l-2 border-[#E67E22] bg-[#111]'
                : 'hover:bg-[#111]'
            }`}
          >
            <div className="w-8 h-8 bg-[#1a1d20] rounded flex items-center justify-center text-sm">🏛️</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">{place.name}</p>
              <p className="text-xs text-[#D9C5B2]">
                {place.tags?.historic ?? place.tags?.tourism ?? place.tags?.natural ?? 'Attraction'}
                {place.tags?.stars ? ` · ${'★'.repeat(parseInt(place.tags.stars))}` : ''}
              </p>
            </div>
            <button
              onClick={e => { e.stopPropagation(); /* future: add to itinerary */ }}
              className="text-xs text-[#E67E22] border border-[#E67E22] px-2 py-0.5 rounded hover:bg-[#E67E22] hover:text-black transition-colors"
            >
              + ADD
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git -C C:\Users\lasse\Desktop\venturepath add src/components/discovery/MustSee.jsx
git -C C:\Users\lasse\Desktop\venturepath commit -m "refactor(must-see): accept props, remove OTM fetch"
```

---

## Task 5: Update LocalFlavor to accept props (remove OTM)

**Files:**
- Modify: `src/components/discovery/LocalFlavor.jsx`

- [ ] **Step 1: Rewrite LocalFlavor to accept props**

```jsx
import React, { useState } from 'react'

const CATEGORIES = ['ALL', 'RESTAURANTS', 'CAFÉS', 'BARS', 'MARKETS', 'STREET FOOD']
const CAT_MAP = {
  ALL: 'all', RESTAURANTS: 'restaurants', 'CAFÉS': 'cafes',
  BARS: 'bars', MARKETS: 'markets', 'STREET FOOD': 'street_food'
}
const EMOJI_MAP = {
  restaurant: '🍽️', cafe: '☕', bar: '🍻',
  marketplace: '🛒', fast_food: '🌮'
}

export default function LocalFlavor({ food = [], loading = false, onCategoryChange, selectedId, onSelect }) {
  const [activeTab, setActiveTab] = useState('ALL')

  function handleTab(tab) {
    setActiveTab(tab)
    onCategoryChange?.(CAT_MAP[tab])
  }

  return (
    <div className="bg-[#0E1012] border border-[#1a1d20] rounded p-4 font-mono">
      <div className="mb-3">
        <p className="text-xs text-[#D9C5B2] uppercase tracking-widest">Local Flavor</p>
      </div>

      {/* Category filters */}
      <div className="flex gap-2 flex-wrap mb-3">
        {CATEGORIES.map(c => (
          <button
            key={c}
            onClick={() => handleTab(c)}
            className={`text-xs px-2 py-1 rounded border transition-colors ${
              activeTab === c
                ? 'bg-[#E67E22] border-[#E67E22] text-black'
                : 'border-[#333] text-[#D9C5B2] hover:border-[#E67E22]'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {loading && <p className="text-xs text-[#D9C5B2] animate-pulse">Scanning OpenStreetMap…</p>}
      {!loading && food.length === 0 && (
        <p className="text-xs text-[#555]">No dining spots found for this destination.</p>
      )}
      <ul className="space-y-2 max-h-64 overflow-y-auto">
        {food.map(place => {
          const amenity = place.tags?.amenity ?? 'restaurant'
          return (
            <li
              key={place.id}
              onClick={() => onSelect?.(place.id)}
              className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors ${
                selectedId === place.id
                  ? 'border-l-2 border-[#E67E22] bg-[#111]'
                  : 'hover:bg-[#111]'
              }`}
            >
              <div className="w-8 h-8 bg-[#1a1d20] rounded flex items-center justify-center text-sm">
                {EMOJI_MAP[amenity] ?? '🍽️'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{place.name}</p>
                <p className="text-xs text-[#E67E22] capitalize">{amenity.replace('_', ' ')}</p>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git -C C:\Users\lasse\Desktop\venturepath add src/components/discovery/LocalFlavor.jsx
git -C C:\Users\lasse\Desktop\venturepath commit -m "refactor(local-flavor): accept props, remove OTM fetch"
```

---

## Task 6: Create `DiscoveryMap.jsx`

**Files:**
- Create: `src/components/discovery/DiscoveryMap.jsx`

- [ ] **Step 1: Create the shared discovery map component**

```jsx
import React, { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

const TILES = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
const ATTR  = '© <a href="https://openstreetmap.org">OpenStreetMap</a> © <a href="https://carto.com">CARTO</a>'

function FitBounds({ pins }) {
  const map = useMap()
  useEffect(() => {
    const all = pins.filter(p => p.lat && p.lon)
    if (all.length === 0) return
    const lats = all.map(p => p.lat)
    const lons = all.map(p => p.lon)
    map.fitBounds(
      [[Math.min(...lats), Math.min(...lons)], [Math.max(...lats), Math.max(...lons)]],
      { padding: [32, 32], maxZoom: 15 }
    )
  }, [pins, map])
  return null
}

function PanTo({ selectedId, pins }) {
  const map = useMap()
  useEffect(() => {
    if (!selectedId) return
    const pin = pins.find(p => p.id === selectedId)
    if (pin) map.panTo([pin.lat, pin.lon], { animate: true })
  }, [selectedId, pins, map])
  return null
}

export default function DiscoveryMap({ attractionPins = [], foodPins = [], selectedId, onPinClick }) {
  const allPins = [...attractionPins, ...foodPins]
  const defaultCenter = [48.8566, 2.3522] // fallback Paris

  return (
    <div className="w-full rounded overflow-hidden border border-[#1a1d20]" style={{ height: 280 }}>
      <MapContainer
        center={defaultCenter}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer url={TILES} attribution={ATTR} />
        <FitBounds pins={allPins} />
        <PanTo selectedId={selectedId} pins={allPins} />

        {attractionPins.map(pin => (
          <CircleMarker
            key={`attr-${pin.id}`}
            center={[pin.lat, pin.lon]}
            radius={selectedId === pin.id ? 9 : 6}
            pathOptions={{
              color: selectedId === pin.id ? '#fff' : '#E67E22',
              fillColor: '#E67E22',
              fillOpacity: 0.9,
              weight: selectedId === pin.id ? 2 : 1
            }}
            eventHandlers={{ click: () => onPinClick?.(pin.id, 'attraction') }}
          >
            <Popup className="font-mono text-xs">
              <strong>{pin.name}</strong><br />
              {pin.tags?.historic ?? pin.tags?.tourism ?? 'Attraction'}
            </Popup>
          </CircleMarker>
        ))}

        {foodPins.map(pin => (
          <CircleMarker
            key={`food-${pin.id}`}
            center={[pin.lat, pin.lon]}
            radius={selectedId === pin.id ? 9 : 6}
            pathOptions={{
              color: selectedId === pin.id ? '#fff' : '#D9C5B2',
              fillColor: '#D9C5B2',
              fillOpacity: 0.9,
              weight: selectedId === pin.id ? 2 : 1
            }}
            eventHandlers={{ click: () => onPinClick?.(pin.id, 'food') }}
          >
            <Popup className="font-mono text-xs">
              <strong>{pin.name}</strong><br />
              {pin.tags?.amenity ?? 'Food & Drink'}
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git -C C:\Users\lasse\Desktop\venturepath add src/components/discovery/DiscoveryMap.jsx
git -C C:\Users\lasse\Desktop\venturepath commit -m "feat(discovery-map): shared Leaflet map with attraction + food pins"
```

---

## Task 7: Wire Discovery tab in TripPlanner

**Files:**
- Modify: `src/pages/TripPlanner.jsx`

- [ ] **Step 1: Add OSM imports and Discovery state**

At the top of `TripPlanner.jsx`, add:

```js
import { searchAttractions, searchFood } from '../utils/osmEngine.js'
import DiscoveryMap from '../components/discovery/DiscoveryMap.jsx'
```

Inside the component, after existing state declarations, add:

```js
const [attractions, setAttractions]           = useState([])
const [food, setFood]                         = useState([])
const [attractionsLoading, setAttractionsLoading] = useState(false)
const [foodLoading, setFoodLoading]           = useState(false)
const [attractionCategory, setAttractionCategory] = useState('all')
const [foodCategory, setFoodCategory]         = useState('all')
const [selectedDiscoveryId, setSelectedDiscoveryId] = useState(null)
```

- [ ] **Step 2: Add Discovery data loading effect**

Add this `useEffect` after the existing ones (before the return):

```js
useEffect(() => {
  if (tab !== 'DISCOVERY' || !trip?.destination) return
  const city = trip.destination.split(',')[0].trim()

  setAttractionsLoading(true)
  searchAttractions(city, attractionCategory)
    .then(setAttractions)
    .finally(() => setAttractionsLoading(false))
}, [tab, trip?.destination, attractionCategory])

useEffect(() => {
  if (tab !== 'DISCOVERY' || !trip?.destination) return
  const city = trip.destination.split(',')[0].trim()

  setFoodLoading(true)
  searchFood(city, foodCategory)
    .then(setFood)
    .finally(() => setFoodLoading(false))
}, [tab, trip?.destination, foodCategory])
```

- [ ] **Step 3: Add pin-click scroll handler**

Add this function inside the component:

```js
function handleDiscoveryPinClick(id, section) {
  setSelectedDiscoveryId(id)
  // Scroll card into view
  const el = document.getElementById(`discovery-card-${id}`)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
}
```

- [ ] **Step 4: Update the Discovery tab JSX**

Find the `{tab === 'DISCOVERY' && ...}` block (currently lines ~201-209) and replace it:

```jsx
{tab === 'DISCOVERY' && (
  <div className="space-y-4">
    <DiscoveryMap
      attractionPins={attractions}
      foodPins={food}
      selectedId={selectedDiscoveryId}
      onPinClick={handleDiscoveryPinClick}
    />
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <VibeCheck destinationId={destinationId} tripName={trip.name} />
      <ARGhostTours destinationId={destinationId} center={mapCenter} />
      <MustSee
        attractions={attractions}
        loading={attractionsLoading}
        selectedId={selectedDiscoveryId}
        onCategoryChange={setAttractionCategory}
        onSelect={id => { setSelectedDiscoveryId(id); document.getElementById(`discovery-card-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }) }}
      />
      <LocalFlavor
        food={food}
        loading={foodLoading}
        selectedId={selectedDiscoveryId}
        onCategoryChange={setFoodCategory}
        onSelect={id => { setSelectedDiscoveryId(id) }}
      />
      <BasecampScout destination={trip.destination} />
    </div>
  </div>
)}
```

- [ ] **Step 5: Commit**

```bash
git -C C:\Users\lasse\Desktop\venturepath add src/pages/TripPlanner.jsx
git -C C:\Users\lasse\Desktop\venturepath commit -m "feat(discovery): wire OSM data + DiscoveryMap into TripPlanner"
```

---

## Task 8: Add split-panel map to AccommodationSearch (STAYS tab)

**Files:**
- Modify: `src/components/logistics/AccommodationSearch.jsx`

- [ ] **Step 1: Add imports**

At the top of `AccommodationSearch.jsx`, replace the `foursquareEngine` import:

```js
// Remove:
// import { searchByCategory, searchPlaces, getInspireQuery, FSQ_CATEGORIES } from '../../utils/foursquareEngine.js'

// Add:
import { searchAccommodation } from '../../utils/osmEngine.js'
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
```

- [ ] **Step 2: Add FitBounds + PanTo helpers inside the file**

Add these above the component function:

```jsx
const TILES = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
const ATTR  = '© <a href="https://openstreetmap.org">OpenStreetMap</a> © <a href="https://carto.com">CARTO</a>'

function FitBounds({ pins }) {
  const map = useMap()
  useEffect(() => {
    const valid = pins.filter(p => p.lat && p.lon)
    if (!valid.length) return
    const lats = valid.map(p => p.lat)
    const lons = valid.map(p => p.lon)
    map.fitBounds(
      [[Math.min(...lats), Math.min(...lons)], [Math.max(...lats), Math.max(...lons)]],
      { padding: [32, 32], maxZoom: 16 }
    )
  }, [pins, map])
  return null
}

function PanTo({ selectedId, pins }) {
  const map = useMap()
  useEffect(() => {
    if (!selectedId) return
    const pin = pins.find(p => p.id === selectedId)
    if (pin) map.panTo([pin.lat, pin.lon], { animate: true })
  }, [selectedId, pins, map])
  return null
}
```

- [ ] **Step 3: Replace state and search logic**

Inside the component, replace existing state + fetch logic with:

```js
const [results, setResults]       = useState([])
const [loading, setLoading]       = useState(false)
const [activeType, setActiveType] = useState('all')
const [selectedId, setSelectedId] = useState(null)

async function runSearch() {
  if (!destination) return
  setLoading(true)
  const city = destination.split(',')[0].trim()
  const data = await searchAccommodation(city, activeType)
  setResults(data)
  setSelectedId(null)
  setLoading(false)
}

// Re-run when type filter changes and results already loaded
useEffect(() => {
  if (results.length > 0) runSearch()
}, [activeType])
```

- [ ] **Step 4: Replace the JSX return**

Replace the component's return with a split-panel layout:

```jsx
return (
  <div className="bg-[#0E1012] border border-[#1a1d20] rounded p-4 font-mono">
    <p className="text-xs text-[#D9C5B2] uppercase tracking-widest mb-3">Stays — {destination}</p>

    {/* Type filter buttons */}
    <div className="flex gap-2 mb-3 flex-wrap">
      {['all', 'hotel', 'hostel', 'apartment', 'camping'].map(t => (
        <button
          key={t}
          onClick={() => setActiveType(t)}
          className={`text-xs px-3 py-1 rounded border transition-colors ${
            activeType === t
              ? 'bg-[#E67E22] border-[#E67E22] text-black'
              : 'border-[#333] text-[#D9C5B2] hover:border-[#E67E22]'
          }`}
        >
          {t.toUpperCase()}
        </button>
      ))}
    </div>

    {/* Search button */}
    <button
      onClick={runSearch}
      disabled={loading}
      className="w-full mb-4 py-2 text-xs font-bold tracking-widest bg-[#E67E22] text-black rounded hover:bg-[#cf6d17] disabled:opacity-50 transition-colors"
    >
      {loading ? 'SEARCHING…' : 'SEARCH STAYS'}
    </button>

    {/* Split panel — only shown after results */}
    {results.length > 0 && (
      <div className="flex gap-3" style={{ minHeight: 320 }}>
        {/* Left: result list */}
        <ul className="flex-1 space-y-2 overflow-y-auto pr-1" style={{ maxHeight: 400 }}>
          {results.map(place => (
            <li
              key={place.id}
              id={`stay-card-${place.id}`}
              onClick={() => setSelectedId(place.id)}
              className={`p-2 rounded cursor-pointer transition-colors ${
                selectedId === place.id
                  ? 'border-l-2 border-[#E67E22] bg-[#111]'
                  : 'hover:bg-[#111] border-l-2 border-transparent'
              }`}
            >
              <p className="text-sm text-white truncate">{place.name}</p>
              <p className="text-xs text-[#D9C5B2] capitalize">
                {place.tags?.tourism ?? 'Accommodation'}
                {place.tags?.stars ? ` · ${'★'.repeat(parseInt(place.tags.stars))}` : ''}
              </p>
            </li>
          ))}
        </ul>

        {/* Right: Leaflet map */}
        <div className="rounded overflow-hidden border border-[#1a1d20]" style={{ width: '55%', minHeight: 320 }}>
          <MapContainer
            center={[results[0].lat, results[0].lon]}
            zoom={14}
            style={{ height: '100%', width: '100%', minHeight: 320 }}
            zoomControl={false}
          >
            <TileLayer url={TILES} attribution={ATTR} />
            <FitBounds pins={results} />
            <PanTo selectedId={selectedId} pins={results} />
            {results.map(place => (
              <CircleMarker
                key={place.id}
                center={[place.lat, place.lon]}
                radius={selectedId === place.id ? 10 : 7}
                pathOptions={{
                  color: selectedId === place.id ? '#fff' : '#E67E22',
                  fillColor: '#E67E22',
                  fillOpacity: 0.9,
                  weight: selectedId === place.id ? 2 : 1
                }}
                eventHandlers={{
                  click: () => {
                    setSelectedId(place.id)
                    document.getElementById(`stay-card-${place.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
                  }
                }}
              >
                <Popup className="font-mono text-xs">
                  <strong>{place.name}</strong><br />
                  {place.tags?.tourism ?? 'Accommodation'}
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
      </div>
    )}

    {!loading && results.length === 0 && (
      <p className="text-xs text-[#555] text-center py-4">Search for stays above to see results on map.</p>
    )}
  </div>
)
```

- [ ] **Step 5: Start dev server and test STAYS tab**

```bash
cd C:\Users\lasse\Desktop\venturepath && npm run dev
```

- Open a trip → STAYS tab
- Click SEARCH STAYS → verify results appear with a map panel on the right
- Click a result card → verify map pans to pin and pin highlights
- Click a map pin → verify corresponding card highlights and scrolls into view

- [ ] **Step 6: Commit**

```bash
git -C C:\Users\lasse\Desktop\venturepath add src/components/logistics/AccommodationSearch.jsx
git -C C:\Users\lasse\Desktop\venturepath commit -m "feat(stays): split-panel map with two-way card↔pin selection"
```

---

## Task 9: Verify Discovery tab end-to-end

- [ ] **Step 1: Open a trip with a real city (e.g., "Lille, France") → DISCOVERY tab**

Confirm:
- DiscoveryMap renders at top with Ember (orange) attraction pins and Sandstone (beige) food pins
- Must-See list shows real Lille attractions (not Accra results)
- Local Flavor list shows real Lille dining spots
- Category filter buttons in Must-See/LocalFlavor update both list AND map pins
- Clicking a card pans the map to that pin
- Clicking a pin highlights the corresponding card

- [ ] **Step 2: Test with a second city (e.g., "Paris, France") to confirm geocoding is destination-correct**

- [ ] **Step 3: Commit final verification**

```bash
git -C C:\Users\lasse\Desktop\venturepath commit --allow-empty -m "chore: verify stays+discovery OSM integration end-to-end"
```

---

## Pre-Flight Checks

Before starting implementation:

- [ ] Confirm `react-leaflet` is installed: `grep react-leaflet C:\Users\lasse\Desktop\venturepath\package.json`
- [ ] Confirm `leaflet` CSS is accessible (already imported in RouteMap — safe)
- [ ] Check `foursquareEngine.js` imports in `BasecampScout.jsx`, `PlaceSearchPanel.jsx`, `ScoutPinsLayer.jsx` — these are **not** touched by this plan; do not remove `foursquareEngine.js`
- [ ] Confirm `VITE_OTM_API_KEY` is NOT required by any file we're touching after this plan (it was only used by foursquareEngine, which we're abandoning for these components)
