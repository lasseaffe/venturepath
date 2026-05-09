# Nearby Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Find nearby" panel to VenturePath — accessible from the StopEditor form and from map pin popups — that searches OpenTripMap POIs by category, sorts results, and includes an AI-powered "Inspire me" suggestion.

**Architecture:** Two independent presentational components (`NearbyDrawer` inside StopEditor, `NearbyMapOverlay` floating on the map) share a single `useNearbySearch` hook that owns all OTM + AI logic. A new `otmEngine.js` utility wraps the OpenTripMap API. The map layout overflow bug is fixed as part of the RouteMap changes.

**Tech Stack:** React (JSX), Vite, Framer Motion, react-leaflet/Leaflet, OpenTripMap REST API v0.1, Anthropic API (direct fetch, claude-haiku-4-5-20251001), CSS custom properties (var(--accent) etc.)

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/utils/otmEngine.js` | Create | OTM geocode + radius search + place normalisation |
| `src/hooks/useNearbySearch.js` | Create | Shared state + search + AI inspire logic |
| `src/components/nearby/NearbyResultCard.jsx` | Create | Single result row — used by both drawer and overlay |
| `src/components/nearby/NearbyDrawer.jsx` | Create | Inline expansion inside StopEditor |
| `src/components/nearby/NearbyMapOverlay.jsx` | Create | Floating card on the map |
| `src/components/trip/StopEditor.jsx` | Modify | Add "Find nearby" button + render NearbyDrawer |
| `src/components/itinerary/RouteMap.jsx` | Modify | Fix layout overflow + add compass button + render NearbyMapOverlay |

---

## Task 1: OTM Engine utility

**Files:**
- Create: `src/utils/otmEngine.js`

- [ ] **Step 1: Create `otmEngine.js`**

```js
// src/utils/otmEngine.js
const OTM_BASE = 'https://api.opentripmap.com/0.1/en';
const OTM_KEY  = import.meta.env.VITE_OTM_API_KEY ?? '';

export const OTM_CATEGORIES = [
  { label: 'All',         kinds: 'cultural,historic,foods,natural,sport' },
  { label: 'Cafés',       kinds: 'cafe,foods' },
  { label: 'Restaurants', kinds: 'restaurants,foods' },
  { label: 'Bars',        kinds: 'bar' },
  { label: 'Attractions', kinds: 'cultural,museums,theatres_and_entertainments' },
  { label: 'Nature',      kinds: 'natural,parks' },
  { label: 'Historic',    kinds: 'historic,architecture,religion' },
];

// Geocode a city/place name string → { lat, lon } or null
export async function otmGeocode(cityName) {
  if (!OTM_KEY || !cityName?.trim()) return null;
  try {
    const q = encodeURIComponent(cityName.trim());
    const res = await fetch(
      `${OTM_BASE}/places/geoname?name=${q}&apikey=${OTM_KEY}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.lat || !data.lon) return null;
    return { lat: data.lat, lon: data.lon };
  } catch {
    return null;
  }
}

// Search POIs by radius around a point
export async function otmRadius(lat, lon, kinds, limit = 12) {
  if (!OTM_KEY) return [];
  try {
    const url = new URL(`${OTM_BASE}/places/radius`);
    url.searchParams.set('radius', '5000');
    url.searchParams.set('lon', lon);
    url.searchParams.set('lat', lat);
    url.searchParams.set('kinds', kinds);
    url.searchParams.set('limit', limit);
    url.searchParams.set('rate', '2');
    url.searchParams.set('format', 'json');
    url.searchParams.set('apikey', OTM_KEY);
    const res = await fetch(url.toString());
    if (!res.ok) return [];
    const data = await res.json();
    return (Array.isArray(data) ? data : []).map(mapOtmPlace).filter(Boolean);
  } catch {
    return [];
  }
}

// Normalise a raw OTM place object
export function mapOtmPlace(raw) {
  if (!raw?.name?.trim()) return null;
  return {
    id:      raw.xid ?? raw.osm ?? String(Math.random()),
    name:    raw.name.trim(),
    type:    (raw.kinds ?? '').split(',')[0].replace(/_/g, ' ') || 'Place',
    rating:  typeof raw.rate === 'number' ? raw.rate : null, // 0–3
    address: raw.point
      ? `${raw.point.lat?.toFixed(4)}, ${raw.point.lon?.toFixed(4)}`
      : '',
    coords:  raw.point
      ? { lat: raw.point.lat, lng: raw.point.lon }
      : null,
    kinds:   raw.kinds ?? '',
  };
}

// Foursquare swap path — uncomment when billing is resolved
// export async function fsqSearchByCategory(categoryId, near, limit = 12) { ... }
// export async function fsqSearchPlaces(query, near, limit = 12) { ... }
```

- [ ] **Step 2: Verify OTM_KEY is in `.env`**

Open `C:\Users\lasse\Desktop\venturepath\.env` and confirm `VITE_OTM_API_KEY=<your_key>` exists. If not, add it (free key from opentripmap.io/register).

- [ ] **Step 3: Commit**

```bash
git -C "C:\Users\lasse\Desktop\venturepath" add src/utils/otmEngine.js
git -C "C:\Users\lasse\Desktop\venturepath" commit -m "feat: add otmEngine utility (geocode + radius search)"
```

---

## Task 2: `useNearbySearch` hook

**Files:**
- Create: `src/hooks/useNearbySearch.js`

- [ ] **Step 1: Create the hook**

```js
// src/hooks/useNearbySearch.js
import { useState, useEffect, useRef, useCallback } from 'react';
import { otmGeocode, otmRadius, OTM_CATEGORIES } from '../utils/otmEngine';

const ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY ?? '';

// OTM_KIND_MAP fallback for when AI call fails
const FALLBACK_KINDS = OTM_CATEGORIES.filter(c => c.label !== 'All');

function sortPlaces(places, sortBy) {
  const copy = [...places];
  if (sortBy === 'rating') {
    return copy.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1));
  }
  // 'name'
  return copy.sort((a, b) => a.name.localeCompare(b.name));
}

export function useNearbySearch(defaultAnchor = '') {
  const [anchor, setAnchorRaw]  = useState(defaultAnchor);
  const [category, setCategory] = useState(OTM_CATEGORIES[0].kinds); // 'All'
  const [sortBy, setSortBy]     = useState('rating');
  const [rawResults, setRaw]    = useState([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [inspireLabel, setInspireLabel] = useState(null);

  // Cache geocode result for current anchor
  const geoCache = useRef({});

  async function resolveGeo(name) {
    if (geoCache.current[name]) return geoCache.current[name];
    const geo = await otmGeocode(name);
    if (geo) geoCache.current[name] = geo;
    return geo;
  }

  const search = useCallback(async (kindsOverride) => {
    const loc = anchor.trim();
    if (!loc) return;
    setLoading(true);
    setError(null);
    try {
      const geo = await resolveGeo(loc);
      if (!geo) { setError('Could not find location'); setLoading(false); return; }
      const kinds = kindsOverride ?? category;
      const places = await otmRadius(geo.lat, geo.lon, kinds, 12);
      setRaw(places);
    } catch {
      setError('Search failed');
    } finally {
      setLoading(false);
    }
  }, [anchor, category]);

  // Re-search when anchor or category changes (but not on first mount if anchor is empty)
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) { mounted.current = true; if (!anchor.trim()) return; }
    setRaw([]);
    setInspireLabel(null);
    search();
  }, [anchor, category]);

  function setAnchor(val) {
    setAnchorRaw(val);
    geoCache.current = {}; // clear cache on anchor change
  }

  // Calls whichever AI backend is configured:
  //   VITE_LOCAL_LLM_URL  → local runner (Ollama/LM Studio, OpenAI-compat /v1/chat/completions)
  //   VITE_ANTHROPIC_API_KEY → Anthropic cloud
  //   neither              → random fallback
  async function callInspireAI(prompt) {
    const localUrl = import.meta.env.VITE_LOCAL_LLM_URL;
    const localModel = import.meta.env.VITE_LOCAL_LLM_MODEL ?? 'llama3';

    if (localUrl) {
      const res = await fetch(`${localUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          model: localModel,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 64,
          stream: false,
        }),
      });
      if (!res.ok) throw new Error('Local LLM request failed');
      const data = await res.json();
      return data.choices?.[0]?.message?.content ?? '';
    }

    if (ANTHROPIC_KEY) {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': ANTHROPIC_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
          'anthropic-dangerous-direct-browser-calls': 'true',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 64,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      if (!res.ok) throw new Error('Anthropic request failed');
      const data = await res.json();
      return data.content?.[0]?.text ?? '';
    }

    throw new Error('No AI backend configured');
  }

  async function inspire() {
    setLoading(true);
    setError(null);
    try {
      const prompt = `You are a local travel expert. The user is in "${anchor.trim()}". Suggest one OpenTripMap kinds string (comma-separated values only from: cultural, historic, foods, restaurants, cafe, bar, natural, parks, museums, theatres_and_entertainments, sport, architecture) and a short display label (max 3 words). Reply with valid JSON only, no markdown: {"kinds":"...","label":"..."}`;
      const text = await callInspireAI(prompt);
      const parsed = JSON.parse(text);
      if (!parsed.kinds) throw new Error('Bad AI response');
      setInspireLabel(parsed.label);
      setCategory(parsed.kinds);
      await search(parsed.kinds);
    } catch {
      // fallback: pick random category
      const pick = FALLBACK_KINDS[Math.floor(Math.random() * FALLBACK_KINDS.length)];
      setInspireLabel(pick.label);
      setCategory(pick.kinds);
      await search(pick.kinds);
    } finally {
      setLoading(false);
    }
  }

  const results = sortPlaces(rawResults, sortBy);

  return {
    anchor, setAnchor,
    category, setCategory,
    sortBy, setSortBy,
    results,
    loading, error,
    inspireLabel,
    inspire,
    search,
  };
}
```

- [ ] **Step 2: Configure AI backend in `.env`**

Choose one option (or neither — random fallback will be used):

**Option A — Local LLM (Ollama, LM Studio, anything with OpenAI-compat `/v1/chat/completions`):**
```
VITE_LOCAL_LLM_URL=http://localhost:11434
VITE_LOCAL_LLM_MODEL=llama3
```
For Ollama the default port is 11434. For LM Studio it's typically 1234.

**Option B — Anthropic cloud:**
```
VITE_ANTHROPIC_API_KEY=sk-ant-...
```

If both are set, local LLM takes priority. If neither is set, "Inspire me" falls back to a random category pick.

- [ ] **Step 3: Commit**

```bash
git -C "C:\Users\lasse\Desktop\venturepath" add src/hooks/useNearbySearch.js
git -C "C:\Users\lasse\Desktop\venturepath" commit -m "feat: add useNearbySearch hook (OTM + AI inspire)"
```

---

## Task 3: `NearbyResultCard` component

**Files:**
- Create: `src/components/nearby/NearbyResultCard.jsx`

- [ ] **Step 1: Create the component**

```jsx
// src/components/nearby/NearbyResultCard.jsx

function ratingStars(rating) {
  if (rating === null) return '—';
  const filled = Math.round(rating); // 0–3
  return '★'.repeat(filled) + '☆'.repeat(3 - filled);
}

export default function NearbyResultCard({ place, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect?.(place)}
      className="w-full text-left p-2.5 rounded-lg transition-colors"
      style={{
        background: 'var(--surface-raised)',
        border: '1px solid var(--border)',
        cursor: onSelect ? 'pointer' : 'default',
      }}
      onMouseEnter={e => { if (onSelect) e.currentTarget.style.borderColor = 'var(--accent)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className="text-sm font-medium leading-snug"
          style={{ color: 'var(--text-primary)' }}
        >
          {place.name}
        </span>
        <span
          className="shrink-0 text-xs font-mono"
          style={{ color: '#E67E22' }}
        >
          {ratingStars(place.rating)}
        </span>
      </div>
      <div className="flex items-center gap-2 mt-1">
        <span
          className="text-[10px] px-1.5 py-0.5 rounded font-mono capitalize"
          style={{ background: 'var(--surface)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
        >
          {place.type}
        </span>
        {place.address && (
          <span className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>
            {place.address}
          </span>
        )}
      </div>
    </button>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git -C "C:\Users\lasse\Desktop\venturepath" add src/components/nearby/NearbyResultCard.jsx
git -C "C:\Users\lasse\Desktop\venturepath" commit -m "feat: add NearbyResultCard component"
```

---

## Task 4: `NearbyDrawer` component

**Files:**
- Create: `src/components/nearby/NearbyDrawer.jsx`

- [ ] **Step 1: Create the component**

```jsx
// src/components/nearby/NearbyDrawer.jsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNearbySearch } from '../../hooks/useNearbySearch';
import { OTM_CATEGORIES } from '../../utils/otmEngine';
import NearbyResultCard from './NearbyResultCard';

export default function NearbyDrawer({ anchor: defaultAnchor, onSelectPlace }) {
  const [open, setOpen] = useState(false);
  const [editingAnchor, setEditingAnchor] = useState(false);
  const [anchorInput, setAnchorInput] = useState('');

  const {
    anchor, setAnchor,
    category, setCategory,
    sortBy, setSortBy,
    results, loading, error,
    inspireLabel, inspire,
  } = useNearbySearch(defaultAnchor);

  function toggleOpen() {
    setOpen(v => !v);
  }

  function commitAnchor() {
    if (anchorInput.trim()) setAnchor(anchorInput.trim());
    setEditingAnchor(false);
  }

  return (
    <div className="mt-2">
      {/* Trigger button */}
      <button
        type="button"
        onClick={toggleOpen}
        className="w-full py-2 rounded-lg text-xs font-mono transition-colors"
        style={{
          background: 'transparent',
          color: 'var(--accent)',
          border: '1px dashed var(--accent)',
        }}
      >
        {open ? '▲ Close nearby' : '🔍 Find nearby'}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            className="overflow-hidden"
          >
            <div className="pt-3 space-y-3">

              {/* Anchor row */}
              <div className="flex items-center gap-2">
                {editingAnchor ? (
                  <input
                    autoFocus
                    value={anchorInput}
                    onChange={e => setAnchorInput(e.target.value)}
                    onBlur={commitAnchor}
                    onKeyDown={e => { if (e.key === 'Enter') commitAnchor(); if (e.key === 'Escape') setEditingAnchor(false); }}
                    className="flex-1 px-2 py-1 rounded text-xs outline-none"
                    style={{ background: 'var(--surface-raised)', border: '1px solid var(--accent)', color: 'var(--text-primary)' }}
                    placeholder="Enter city or place…"
                  />
                ) : (
                  <>
                    <span className="flex-1 text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                      📍 {anchor || 'No location set'}
                    </span>
                    <button
                      type="button"
                      onClick={() => { setAnchorInput(anchor); setEditingAnchor(true); }}
                      className="text-[10px] px-1.5 py-0.5 rounded"
                      style={{ background: 'var(--surface-raised)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                    >
                      change
                    </button>
                  </>
                )}
              </div>

              {/* Category chips */}
              <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                {OTM_CATEGORIES.map(cat => (
                  <button
                    key={cat.kinds}
                    type="button"
                    onClick={() => setCategory(cat.kinds)}
                    className="shrink-0 px-2.5 py-1 rounded-full text-xs font-medium transition-colors"
                    style={{
                      background: category === cat.kinds ? 'var(--cta)' : 'var(--surface-raised)',
                      color: category === cat.kinds ? '#fff' : 'var(--text-secondary)',
                      border: `1px solid ${category === cat.kinds ? 'var(--cta)' : 'var(--border)'}`,
                    }}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Sort row */}
              <div className="flex items-center justify-end gap-2">
                <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>SORT:</span>
                {[{ value: 'rating', label: 'Rating ↓' }, { value: 'name', label: 'Name A–Z' }].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSortBy(opt.value)}
                    className="text-[10px] px-2 py-0.5 rounded font-mono transition-colors"
                    style={{
                      background: sortBy === opt.value ? 'var(--accent)' : 'var(--surface-raised)',
                      color: sortBy === opt.value ? '#fff' : 'var(--text-muted)',
                      border: `1px solid ${sortBy === opt.value ? 'var(--accent)' : 'var(--border)'}`,
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Inspire me */}
              <button
                type="button"
                onClick={inspire}
                disabled={loading}
                className="w-full py-2 rounded-lg text-xs font-semibold text-white transition-opacity"
                style={{ background: 'var(--cta)', opacity: loading ? 0.6 : 1 }}
              >
                {loading ? 'Searching…' : inspireLabel ? `✨ ${inspireLabel}` : '✨ Inspire me'}
              </button>

              {/* Results */}
              {error && (
                <p className="text-xs text-center py-2" style={{ color: 'var(--status-alert)' }}>{error}</p>
              )}
              {!loading && !error && results.length === 0 && anchor && (
                <p className="text-xs text-center py-2" style={{ color: 'var(--text-muted)' }}>No places found nearby.</p>
              )}
              <div className="space-y-2 overflow-y-auto" style={{ maxHeight: 240 }}>
                {results.map(place => (
                  <NearbyResultCard
                    key={place.id}
                    place={place}
                    onSelect={p => { onSelectPlace(p.name); setOpen(false); }}
                  />
                ))}
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git -C "C:\Users\lasse\Desktop\venturepath" add src/components/nearby/NearbyDrawer.jsx
git -C "C:\Users\lasse\Desktop\venturepath" commit -m "feat: add NearbyDrawer component"
```

---

## Task 5: Wire NearbyDrawer into StopEditor

**Files:**
- Modify: `src/components/trip/StopEditor.jsx`

- [ ] **Step 1: Import NearbyDrawer at the top of StopEditor.jsx**

After the existing imports, add:
```jsx
import NearbyDrawer from '../nearby/NearbyDrawer';
```

- [ ] **Step 2: Render NearbyDrawer below the FROM field group**

In `StopEditor.jsx`, find the closing `</div>` of the FROM field group (the `<div className="relative">` block that ends around line 224 with `{!showEntryPicker && <SuggestionList ... />}`). Add `NearbyDrawer` immediately after that closing `</div>`:

```jsx
          </div>
          {/* Nearby search — anchor defaults to FROM location */}
          <NearbyDrawer
            anchor={from}
            onSelectPlace={name => {
              setTo(name);
              setToQuery('');
              toAC.clear();
            }}
          />
```

- [ ] **Step 3: Start the dev server and verify**

```bash
cd "C:\Users\lasse\Desktop\venturepath" && npm run dev
```

Open http://localhost:5173, go to the Itinerary tab, click "+ Add Stop". Verify:
- "Find nearby" dashed button appears below the FROM field
- Clicking it expands the drawer with category chips, sort, and Inspire me button
- Selecting a result fills the TO field and collapses the drawer

- [ ] **Step 4: Commit**

```bash
git -C "C:\Users\lasse\Desktop\venturepath" add src/components/trip/StopEditor.jsx
git -C "C:\Users\lasse\Desktop\venturepath" commit -m "feat: wire NearbyDrawer into StopEditor"
```

---

## Task 6: Fix map layout overflow in RouteMap

**Files:**
- Modify: `src/components/itinerary/RouteMap.jsx`

- [ ] **Step 1: Add overflow:hidden and editorOpen-aware map margin**

In `RouteMap.jsx`, the component already tracks `editorOpen` state. Find the outer wrapper `<div>` at line 149:

```jsx
    <div className={`tactical-panel flex overflow-hidden ${className}`} style={{ height: 460 }}>
```

It already has `overflow-hidden` — good. Now find the map container `<div className="flex-1 relative">` (around line 218) and replace it with:

```jsx
      <div className="flex-1 relative" style={{ marginRight: editorOpen ? 320 : 0, transition: 'margin 0.3s ease', minWidth: 0 }}>
```

- [ ] **Step 2: Verify the fix**

With the dev server running, open the Itinerary tab. Click a stop to open the editor. Verify the map tile area shrinks to the left of the editor instead of being overlaid.

- [ ] **Step 3: Commit**

```bash
git -C "C:\Users\lasse\Desktop\venturepath" add src/components/itinerary/RouteMap.jsx
git -C "C:\Users\lasse\Desktop\venturepath" commit -m "fix: map no longer overlays StopEditor panel"
```

---

## Task 7: `NearbyMapOverlay` component

**Files:**
- Create: `src/components/nearby/NearbyMapOverlay.jsx`

- [ ] **Step 1: Create the component**

```jsx
// src/components/nearby/NearbyMapOverlay.jsx
import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { useNearbySearch } from '../../hooks/useNearbySearch';
import { OTM_CATEGORIES } from '../../utils/otmEngine';
import NearbyResultCard from './NearbyResultCard';

export default function NearbyMapOverlay({ anchor: defaultAnchor, onClose }) {
  const map = useMap();
  const markerRef = useRef(null);

  const {
    anchor, setAnchor,
    category, setCategory,
    sortBy, setSortBy,
    results, loading, error,
    inspireLabel, inspire,
  } = useNearbySearch(defaultAnchor);

  // Clean up highlight marker on unmount or overlay close
  useEffect(() => {
    return () => {
      if (markerRef.current) {
        map.removeLayer(markerRef.current);
        markerRef.current = null;
      }
    };
  }, [map]);

  function handleSelectPlace(place) {
    // Remove previous highlight marker
    if (markerRef.current) {
      map.removeLayer(markerRef.current);
      markerRef.current = null;
    }
    if (!place.coords) return;

    // Drop a temporary orange circle marker
    const marker = L.circleMarker([place.coords.lat, place.coords.lng], {
      radius: 8,
      color: '#E67E22',
      fillColor: '#E67E22',
      fillOpacity: 0.8,
      weight: 2,
    }).addTo(map);

    marker.bindPopup(`<span style="font-family:monospace;font-size:12px">${place.name}</span>`).openPopup();
    markerRef.current = marker;
    map.flyTo([place.coords.lat, place.coords.lng], 14, { duration: 0.8 });

    // Auto-remove after 8 seconds
    setTimeout(() => {
      if (markerRef.current === marker) {
        map.removeLayer(marker);
        markerRef.current = null;
      }
    }, 8000);
  }

  // Render outside the Leaflet canvas using a portal-like absolute div
  return (
    <div
      style={{
        position: 'absolute',
        top: 12,
        right: 12,
        width: 288,
        zIndex: 1000,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: 480,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b"
        style={{ borderColor: 'var(--border)' }}
      >
        <span className="text-xs font-mono font-semibold" style={{ color: 'var(--text-muted)' }}>
          🧭 NEARBY · {anchor}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-sm"
          style={{ color: 'var(--text-muted)' }}
        >
          ✕
        </button>
      </div>

      <div className="p-3 space-y-3 overflow-y-auto flex-1">

        {/* Category chips */}
        <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {OTM_CATEGORIES.map(cat => (
            <button
              key={cat.kinds}
              type="button"
              onClick={() => setCategory(cat.kinds)}
              className="shrink-0 px-2.5 py-1 rounded-full text-xs font-medium transition-colors"
              style={{
                background: category === cat.kinds ? 'var(--cta)' : 'var(--surface-raised)',
                color: category === cat.kinds ? '#fff' : 'var(--text-secondary)',
                border: `1px solid ${category === cat.kinds ? 'var(--cta)' : 'var(--border)'}`,
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Sort row */}
        <div className="flex items-center justify-end gap-2">
          <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>SORT:</span>
          {[{ value: 'rating', label: 'Rating ↓' }, { value: 'name', label: 'Name A–Z' }].map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setSortBy(opt.value)}
              className="text-[10px] px-2 py-0.5 rounded font-mono transition-colors"
              style={{
                background: sortBy === opt.value ? 'var(--accent)' : 'var(--surface-raised)',
                color: sortBy === opt.value ? '#fff' : 'var(--text-muted)',
                border: `1px solid ${sortBy === opt.value ? 'var(--accent)' : 'var(--border)'}`,
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Inspire me */}
        <button
          type="button"
          onClick={inspire}
          disabled={loading}
          className="w-full py-2 rounded-lg text-xs font-semibold text-white transition-opacity"
          style={{ background: 'var(--cta)', opacity: loading ? 0.6 : 1 }}
        >
          {loading ? 'Searching…' : inspireLabel ? `✨ ${inspireLabel}` : '✨ Inspire me'}
        </button>

        {/* Results */}
        {error && (
          <p className="text-xs text-center py-2" style={{ color: 'var(--status-alert)' }}>{error}</p>
        )}
        {!loading && !error && results.length === 0 && (
          <p className="text-xs text-center py-2" style={{ color: 'var(--text-muted)' }}>No places found.</p>
        )}
        <div className="space-y-2">
          {results.map(place => (
            <NearbyResultCard
              key={place.id}
              place={place}
              onSelect={handleSelectPlace}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git -C "C:\Users\lasse\Desktop\venturepath" add src/components/nearby/NearbyMapOverlay.jsx
git -C "C:\Users\lasse\Desktop\venturepath" commit -m "feat: add NearbyMapOverlay component"
```

---

## Task 8: Wire NearbyMapOverlay into RouteMap

**Files:**
- Modify: `src/components/itinerary/RouteMap.jsx`

- [ ] **Step 1: Add imports at top of RouteMap.jsx**

After the existing imports, add:
```jsx
import NearbyMapOverlay from '../nearby/NearbyMapOverlay';
```

- [ ] **Step 2: Add nearbyAnchorLeg state**

Inside the `RouteMap` component, alongside the existing `useState` declarations (around line 105), add:
```jsx
  const [nearbyAnchorLeg, setNearbyAnchorLeg] = useState(null);
```

- [ ] **Step 3: Add "Find nearby" button to the existing Popup**

Find the Leaflet `<Popup>` block (around line 264). It currently ends with the status badge div. Add the compass button directly after that badge div, before `</div></Popup>`:

```jsx
                    <button
                      onClick={e => { e.stopPropagation(); setNearbyAnchorLeg(l); }}
                      style={{
                        marginTop: 8,
                        background: 'transparent',
                        border: '1px solid #E67E22',
                        color: '#E67E22',
                        borderRadius: 4,
                        padding: '2px 8px',
                        fontSize: 11,
                        cursor: 'pointer',
                        fontFamily: 'monospace',
                        width: '100%',
                      }}
                    >
                      🧭 Find nearby
                    </button>
```

- [ ] **Step 4: Render NearbyMapOverlay inside the map container**

Find the map `<div className="flex-1 relative" ...>` added in Task 6. Inside that div, after the `</MapContainer>` closing tag, add:

```jsx
        {nearbyAnchorLeg && (
          <NearbyMapOverlay
            anchor={nearbyAnchorLeg.from}
            onClose={() => setNearbyAnchorLeg(null)}
          />
        )}
```

- [ ] **Step 5: Verify end-to-end**

With the dev server running:
1. Open the Itinerary tab with at least one stop on the map
2. Click a map pin — verify the popup now shows "🧭 Find nearby" button
3. Click it — verify the NearbyMapOverlay appears top-right of the map
4. Select a result — verify an orange circle marker drops on the map and auto-removes after 8 seconds
5. Click ✕ — verify the overlay closes

- [ ] **Step 6: Commit**

```bash
git -C "C:\Users\lasse\Desktop\venturepath" add src/components/itinerary/RouteMap.jsx
git -C "C:\Users\lasse\Desktop\venturepath" commit -m "feat: wire NearbyMapOverlay into RouteMap popup"
```

---

## Self-Review Checklist

- [x] `otmEngine.js` — geocode, radius search, place normalisation, FSQ commented path
- [x] `useNearbySearch` — anchor, category, sort, results, loading, error, inspire, search
- [x] `NearbyResultCard` — renders for both drawer (onSelect fills TO) and overlay (onSelect drops marker)
- [x] `NearbyDrawer` — trigger button, anchor change, category chips, sort, inspire, results scroll
- [x] StopEditor wired — NearbyDrawer receives `from` as anchor, `onSelectPlace` fills `to`
- [x] Map layout fix — `marginRight: editorOpen ? 320 : 0` on map inner div
- [x] `NearbyMapOverlay` — absolute positioned, same filter/sort/inspire UI, circle marker on select, 8s auto-remove
- [x] RouteMap wired — `nearbyAnchorLeg` state, compass button in Popup, overlay rendered in map container
- [x] All type names consistent: `Place { id, name, type, rating, address, coords, kinds }` used across all tasks
- [x] `OTM_CATEGORIES` array defined once in `otmEngine.js`, imported everywhere — no duplication
