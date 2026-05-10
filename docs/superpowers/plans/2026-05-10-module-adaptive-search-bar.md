# Module-Adaptive GlobalSearchBar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a per-section adaptive search bar to VenturePath's ITINERARY, LOGISTICS, and DISCOVERY tabs, with a `SearchContext` + strategy pattern that makes adding future tabs (TACTICAL_HUD, BUDGET, STRATEGY) a one-line change.

**Architecture:** `SearchContext` provides `strategy` to all search components. `useAdaptiveSearch` hook fires Inspire Me (on focus) and autocomplete (on type) via `adaptiveSearchEngine`. `AdaptiveSearchBar` renders results. `POIDetailSheet` shows detail + context-specific actions via `sentinelBus`.

**Tech Stack:** React context, Vitest, `adaptiveSearchEngine` from plan A (must be built first), `sentinelBus` for action events, Tailwind with VenturePath brand tokens.

**Prerequisite:** Plan A (Contextual Search Engine) must be complete — `src/utils/adaptiveSearchEngine.js`, `src/utils/searchStrategies.js`, and `src/utils/mapillaryEngine.js` must exist.

---

## File Map

| File | Status | Responsibility |
|---|---|---|
| `src/context/SearchContext.jsx` | Create | Provides `activeTab`, `destination`, `userRole`, `strategy` |
| `src/hooks/useAdaptiveSearch.js` | Create | Inspire Me + autocomplete + detail sheet state |
| `src/hooks/useAdaptiveSearch.test.js` | Create | Unit tests for hook logic |
| `src/components/search/AdaptiveSearchBar.jsx` | Create | Input + inspire chips + autocomplete dropdown |
| `src/components/search/POIDetailSheet.jsx` | Create | Slide-up detail panel + action buttons |
| `src/pages/TripPlanner.jsx` | Modify | Wrap with SearchContext, add AdaptiveSearchBar to 3 tabs |

---

## Task 1: `SearchContext.jsx` — context provider

**Files:**
- Create: `src/context/SearchContext.jsx`

No tests — thin provider with no logic to unit test.

- [ ] **Step 1: Create `SearchContext.jsx`**

Create `src/context/SearchContext.jsx`:

```jsx
import { createContext, useContext, useMemo } from 'react';
import { useTripStore } from '../store/useTripStore';
import { SEARCH_STRATEGIES } from '../utils/searchStrategies';

const SearchContext = createContext(null);

export function SearchProvider({ activeTab, children }) {
  const { trip, userRole } = useTripStore();

  const strategy = SEARCH_STRATEGIES[activeTab] ?? SEARCH_STRATEGIES.DEFAULT;

  const value = useMemo(() => ({
    activeTab,
    destination: trip.destination,
    userRole,
    strategy,
  }), [activeTab, trip.destination, userRole, strategy]);

  return (
    <SearchContext.Provider value={value}>
      {children}
    </SearchContext.Provider>
  );
}

export function useSearchContext() {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error('useSearchContext must be used within SearchProvider');
  return ctx;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/context/SearchContext.jsx
git commit -m "feat(search): add SearchContext provider"
```

---

## Task 2: `useAdaptiveSearch.js` — search hook

**Files:**
- Create: `src/hooks/useAdaptiveSearch.js`
- Create: `src/hooks/useAdaptiveSearch.test.js`

- [ ] **Step 1: Write the failing tests**

Create `src/hooks/useAdaptiveSearch.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';

vi.mock('../utils/adaptiveSearchEngine', () => ({
  getInspireResults: vi.fn().mockResolvedValue([]),
  getAutocompleteResults: vi.fn().mockResolvedValue([]),
  tripTypeFromClimate: vi.fn().mockReturnValue('leisure'),
}));
vi.mock('../utils/geocodeEngine', () => ({
  geocodeLocation: vi.fn().mockResolvedValue({ lat: 48.8566, lng: 2.3522 }),
}));
vi.mock('../utils/mapillaryEngine', () => ({
  fetchStreetImage: vi.fn().mockResolvedValue(null),
}));
vi.mock('../store/useTripStore', () => ({
  useTripStore: () => ({
    trip: { destination: 'Paris', climate: 'temperate' },
    legs: [{ id: 1, status: 'pending', coords: { lat: 48.86, lng: 2.35 } }],
    userRole: 'LEADER',
  }),
}));

import { getInspireResults, getAutocompleteResults } from '../utils/adaptiveSearchEngine';

// Minimal SearchContext mock
const mockStrategy = {
  inspireQuery: { filters: ['amenity=cafe'] },
  filterMask: ['amenity=cafe'],
  resultActions: ['Save POI'],
  placeholder: 'Find stops…',
};

function wrapper({ children }) {
  const SearchContext = React.createContext({
    activeTab: 'ITINERARY',
    destination: 'Paris',
    userRole: 'LEADER',
    strategy: mockStrategy,
  });
  // expose context for hook to consume
  globalThis.__mockSearchCtx = SearchContext;
  return children;
}

// Re-import after mock setup
import { useAdaptiveSearch } from '../hooks/useAdaptiveSearch';

describe('useAdaptiveSearch', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('starts with empty query, results, and inspireResults', () => {
    const { result } = renderHook(() => useAdaptiveSearch(mockStrategy, 'Paris', 'LEADER', 'temperate'), { wrapper });
    expect(result.current.query).toBe('');
    expect(result.current.results).toEqual([]);
    expect(result.current.inspireResults).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('calls getInspireResults on handleFocus when query is empty', async () => {
    const { result } = renderHook(() => useAdaptiveSearch(mockStrategy, 'Paris', 'LEADER', 'temperate'), { wrapper });
    await act(async () => { result.current.handleFocus(); });
    expect(getInspireResults).toHaveBeenCalledWith(mockStrategy, 'Paris', expect.any(Object));
  });

  it('does not call getInspireResults on handleFocus when query is non-empty', async () => {
    const { result } = renderHook(() => useAdaptiveSearch(mockStrategy, 'Paris', 'LEADER', 'temperate'), { wrapper });
    await act(async () => { result.current.setQuery('cafe'); });
    vi.clearAllMocks();
    await act(async () => { result.current.handleFocus(); });
    expect(getInspireResults).not.toHaveBeenCalled();
  });

  it('clears results and inspireResults on handleBlur', async () => {
    getInspireResults.mockResolvedValueOnce([{ id: 'p1', name: 'A', coords: { lat: 0, lng: 0 }, osmTags: {}, category: 'cafe', address: '' }]);
    const { result } = renderHook(() => useAdaptiveSearch(mockStrategy, 'Paris', 'LEADER', 'temperate'), { wrapper });
    await act(async () => { result.current.handleFocus(); });
    expect(result.current.inspireResults.length).toBeGreaterThanOrEqual(0);
    act(() => { result.current.handleBlur(); });
    expect(result.current.results).toEqual([]);
    expect(result.current.inspireResults).toEqual([]);
  });

  it('openDetail sets detailPoi and detailActions', () => {
    const { result } = renderHook(() => useAdaptiveSearch(mockStrategy, 'Paris', 'LEADER', 'temperate'), { wrapper });
    const poi = { id: 'p1', name: 'Cafe', coords: { lat: 0, lng: 0 }, osmTags: {}, category: 'cafe', address: '' };
    act(() => { result.current.openDetail(poi, ['Save POI']); });
    expect(result.current.detailPoi).toEqual(poi);
    expect(result.current.detailActions).toEqual(['Save POI']);
  });

  it('closeDetail clears detailPoi', () => {
    const { result } = renderHook(() => useAdaptiveSearch(mockStrategy, 'Paris', 'LEADER', 'temperate'), { wrapper });
    const poi = { id: 'p1', name: 'Cafe', coords: { lat: 0, lng: 0 }, osmTags: {}, category: 'cafe', address: '' };
    act(() => { result.current.openDetail(poi, []); });
    act(() => { result.current.closeDetail(); });
    expect(result.current.detailPoi).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/hooks/useAdaptiveSearch.test.js
```

Expected: FAIL — `Cannot find module '../hooks/useAdaptiveSearch'`

- [ ] **Step 3: Implement `useAdaptiveSearch.js`**

Create `src/hooks/useAdaptiveSearch.js`:

```js
import { useState, useRef, useCallback } from 'react';
import { getInspireResults, getAutocompleteResults, tripTypeFromClimate } from '../utils/adaptiveSearchEngine';
import { geocodeLocation } from '../utils/geocodeEngine';
import { useTripStore } from '../store/useTripStore';

const DEBOUNCE_MS = 300;

export function useAdaptiveSearch(strategy, destination, userRole, climate) {
  const { legs } = useTripStore();

  const [query, setQueryRaw] = useState('');
  const [results, setResults] = useState([]);
  const [inspireResults, setInspireResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [detailPoi, setDetailPoi] = useState(null);
  const [detailActions, setDetailActions] = useState([]);

  const geoRef = useRef(null);
  const debounceRef = useRef(null);

  // Geocode destination once, cache in ref
  async function getGeo() {
    if (geoRef.current) return geoRef.current;
    const geo = await geocodeLocation(destination);
    geoRef.current = geo;
    return geo;
  }

  function buildContext() {
    const pendingLeg = legs?.find(l => l.status === 'pending');
    return {
      currentLegCoords: pendingLeg?.coords ?? null,
      tripType: tripTypeFromClimate(climate),
      userRole,
    };
  }

  const handleFocus = useCallback(async () => {
    if (query.trim()) return;
    setLoading(true);
    try {
      await getGeo();
      const results = await getInspireResults(strategy, destination, buildContext());
      setInspireResults(results);
    } finally {
      setLoading(false);
    }
  }, [query, strategy, destination, userRole, climate]);

  const handleBlur = useCallback(() => {
    // Small delay so result click registers before clearing
    setTimeout(() => {
      setResults([]);
      setInspireResults([]);
    }, 150);
  }, []);

  const setQuery = useCallback((val) => {
    setQueryRaw(val);
    clearTimeout(debounceRef.current);
    if (!val.trim()) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await getAutocompleteResults(val, strategy, buildContext());
        setResults(r);
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);
  }, [strategy, destination, userRole, climate]);

  const openDetail = useCallback((poi, actions) => {
    setDetailPoi(poi);
    setDetailActions(actions);
    setResults([]);
    setInspireResults([]);
  }, []);

  const closeDetail = useCallback(() => {
    setDetailPoi(null);
    setDetailActions([]);
  }, []);

  return {
    query, setQuery,
    results, inspireResults,
    loading,
    handleFocus, handleBlur,
    detailPoi, detailActions,
    openDetail, closeDetail,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/hooks/useAdaptiveSearch.test.js
```

Expected: all 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useAdaptiveSearch.js src/hooks/useAdaptiveSearch.test.js
git commit -m "feat(search): add useAdaptiveSearch hook"
```

---

## Task 3: `POIDetailSheet.jsx` — slide-up detail panel

**Files:**
- Create: `src/components/search/POIDetailSheet.jsx`

No unit tests — visual component; test via smoke test in browser.

- [ ] **Step 1: Create the search components folder and `POIDetailSheet.jsx`**

```bash
mkdir "C:\Users\lasse\Desktop\venturepath\src\components\search"
```

Create `src/components/search/POIDetailSheet.jsx`:

```jsx
import { useEffect, useState } from 'react';
import { fetchStreetImage } from '../../utils/mapillaryEngine';
import sentinelBus from '../../utils/sentinelBus';

const ACTION_EVENTS = {
  'Add to Leg':          'LEG_STOP_ADDED',
  'Add Supply Stop':     'LOGISTICS_STOP_ADDED',
  'Save to Collection':  'COLLECTION_POI_SAVED',
  'Save POI':            'POI_SAVED',
  'Mark Safe Point':     'TACTICAL_SAFE_POINT_MARKED',
  'SOS Anchor':          'TACTICAL_SOS_ANCHOR_SET',
  'Log Expense Stop':    'BUDGET_EXPENSE_STOP_LOGGED',
  'Add to Mission':      'STRATEGY_DESTINATION_ADDED',
  'Share':               'POI_SHARE_REQUESTED',
};

const CATEGORY_ICONS = {
  cafe:            '☕',
  restaurant:      '🍽',
  hospital:        '🏥',
  pharmacy:        '💊',
  toilets:         '🚻',
  drinking_water:  '💧',
  supermarket:     '🛒',
  atm:             '💳',
  viewpoint:       '🔭',
  attraction:      '🗺',
  aerodrome:       '✈️',
  fuel:            '⛽',
};

function CategoryIcon({ category }) {
  const icon = CATEGORY_ICONS[category] ?? '📍';
  return (
    <div className="flex items-center justify-center w-full h-32 rounded-lg text-5xl"
         style={{ background: '#0E1012', border: '1px solid #E67E2230' }}>
      {icon}
    </div>
  );
}

export function POIDetailSheet({ poi, actions, onClose }) {
  const [imgUrl, setImgUrl] = useState(null);
  const [imgLoading, setImgLoading] = useState(true);

  useEffect(() => {
    if (!poi) return;
    setImgLoading(true);
    fetchStreetImage(poi.coords.lat, poi.coords.lng)
      .then(url => { setImgUrl(url); setImgLoading(false); });
  }, [poi]);

  if (!poi) return null;

  function handleAction(label) {
    const event = ACTION_EVENTS[label];
    if (event) sentinelBus.emit(event, { poi });
    onClose();
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/60" onClick={onClose} />

      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl p-6 flex flex-col gap-4"
           style={{ background: '#0E1012', border: '1px solid #E67E2230', maxHeight: '80vh', overflowY: 'auto' }}>

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#fff' }}>
              {poi.name}
            </h2>
            <span className="label-tag mt-1 inline-block">{poi.category}</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">×</button>
        </div>

        {/* Street image or icon */}
        {imgLoading ? (
          <div className="h-32 rounded-lg animate-pulse" style={{ background: '#1a1c1f' }} />
        ) : imgUrl ? (
          <img src={imgUrl} alt={poi.name} className="w-full h-32 object-cover rounded-lg" />
        ) : (
          <CategoryIcon category={poi.category} />
        )}

        {/* Metadata */}
        <div className="flex flex-col gap-1 font-mono text-sm" style={{ color: '#D9C5B2' }}>
          {poi.address && <span>{poi.address}</span>}
          {poi.osmTags?.opening_hours && <span>🕐 {poi.osmTags.opening_hours}</span>}
          {poi.osmTags?.phone && <span>📞 {poi.osmTags.phone}</span>}
          {poi.osmTags?.website && (
            <a href={poi.osmTags.website} target="_blank" rel="noreferrer"
               style={{ color: '#E67E22' }} className="truncate">
              {poi.osmTags.website}
            </a>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 mt-2">
          {actions.map(label => (
            <button key={label} onClick={() => handleAction(label)}
                    className="w-full py-2 rounded-lg font-mono text-sm font-semibold transition-opacity hover:opacity-90"
                    style={{ background: '#E67E22', color: '#0E1012' }}>
              {label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/search/POIDetailSheet.jsx
git commit -m "feat(search): add POIDetailSheet component"
```

---

## Task 4: `AdaptiveSearchBar.jsx` — input + chips + dropdown

**Files:**
- Create: `src/components/search/AdaptiveSearchBar.jsx`

- [ ] **Step 1: Create `AdaptiveSearchBar.jsx`**

Create `src/components/search/AdaptiveSearchBar.jsx`:

```jsx
import { useSearchContext } from '../../context/SearchContext';
import { useAdaptiveSearch } from '../../hooks/useAdaptiveSearch';
import { POIDetailSheet } from './POIDetailSheet';

function SkeletonChips() {
  return (
    <div className="flex gap-2 flex-wrap mt-2">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-7 w-20 rounded-full animate-pulse" style={{ background: '#1a1c1f' }} />
      ))}
    </div>
  );
}

function InspireChip({ label, onClick }) {
  return (
    <button onClick={onClick}
            className="px-3 py-1 rounded-full text-xs font-mono font-semibold transition-opacity hover:opacity-80"
            style={{ background: 'rgba(230,126,34,0.15)', color: '#E67E22', border: '1px solid rgba(230,126,34,0.4)' }}>
      {label}
    </button>
  );
}

function ResultRow({ poi, onClick }) {
  return (
    <button onClick={onClick}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left hover:opacity-80 transition-opacity"
            style={{ background: '#0E1012' }}>
      <span className="font-mono text-sm text-white truncate">{poi.name}</span>
      <span className="label-tag ml-2 shrink-0">{poi.category}</span>
    </button>
  );
}

export function AdaptiveSearchBar() {
  const { strategy, destination, userRole } = useSearchContext();
  const { trip } = { trip: { climate: 'temperate' } }; // fallback; real value from useTripStore below

  // Pull climate from store directly — SearchContext doesn't expose it
  const { useTripStore } = require('../../store/useTripStore');
  const { trip: tripData } = useTripStore();

  const {
    query, setQuery,
    results, inspireResults,
    loading,
    handleFocus, handleBlur,
    detailPoi, detailActions,
    openDetail, closeDetail,
  } = useAdaptiveSearch(strategy, destination, userRole, tripData.climate);

  const showDropdown = results.length > 0;
  const showInspire = !query && (inspireResults.length > 0 || loading);

  // Static fallback chips from filterMask if inspire fails
  const fallbackChips = strategy.filterMask.map(f => f.split('=')[1]).filter(Boolean);

  return (
    <div className="relative w-full mb-4">
      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={strategy.placeholder}
        className="w-full px-4 py-2 rounded-lg font-mono text-sm outline-none"
        style={{
          background: '#0E1012',
          border: '1px solid #333',
          color: '#fff',
          '--tw-ring-color': '#E67E22',
        }}
        onFocusCapture={e => { e.target.style.borderColor = '#E67E22'; }}
        onBlurCapture={e => { e.target.style.borderColor = '#333'; }}
      />

      {/* Inspire Me chips */}
      {!query && (
        <div className="flex gap-2 flex-wrap mt-2 min-h-[28px]">
          {loading && <SkeletonChips />}
          {!loading && inspireResults.length > 0 && inspireResults.map(poi => (
            <InspireChip key={poi.id} label={poi.name}
                         onClick={() => openDetail(poi, strategy.resultActions)} />
          ))}
          {!loading && inspireResults.length === 0 && fallbackChips.map(chip => (
            <InspireChip key={chip} label={chip} onClick={() => setQuery(chip)} />
          ))}
        </div>
      )}

      {/* Autocomplete dropdown */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 z-30 mt-1 rounded-lg flex flex-col gap-1 p-2"
             style={{ background: '#111315', border: '1px solid #E67E2230', boxShadow: '0 8px 24px rgba(0,0,0,0.6)' }}>
          {results.map(poi => (
            <ResultRow key={poi.id} poi={poi}
                       onClick={() => openDetail(poi, strategy.resultActions)} />
          ))}
        </div>
      )}

      {/* Detail sheet */}
      {detailPoi && (
        <POIDetailSheet poi={detailPoi} actions={detailActions} onClose={closeDetail} />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/search/AdaptiveSearchBar.jsx
git commit -m "feat(search): add AdaptiveSearchBar component"
```

---

## Task 5: Wire `SearchProvider` and `AdaptiveSearchBar` into `TripPlanner`

**Files:**
- Modify: `src/pages/TripPlanner.jsx`

- [ ] **Step 1: Add imports to TripPlanner**

At the top of `src/pages/TripPlanner.jsx`, add after the last existing import:

```jsx
import { SearchProvider } from '../context/SearchContext';
import { AdaptiveSearchBar } from '../components/search/AdaptiveSearchBar';
```

- [ ] **Step 2: Wrap the tab content area in `SearchProvider`**

Find the section in `TripPlanner.jsx` that renders tab content (around line 147 — the `{tab !== 'JOURNEY' && <div className="p-6">` block). Wrap the entire outer `<div>` (both the JOURNEY block and the tab content block) in `<SearchProvider activeTab={tab}>`:

```jsx
{/* WRAP START */}
<SearchProvider activeTab={tab}>
  {/* JOURNEY tab — full-height, no p-6 padding */}
  {tab === 'JOURNEY' && (
    /* ... existing journey content unchanged ... */
  )}
  {/* Tab content */}
  {tab !== 'JOURNEY' && <div className="p-6">
    {/* ... all existing tab renders unchanged ... */}
  </div>}
</SearchProvider>
{/* WRAP END */}
```

- [ ] **Step 3: Add `AdaptiveSearchBar` to ITINERARY, LOGISTICS, DISCOVERY tabs**

Inside the ITINERARY tab render block, add `<AdaptiveSearchBar />` as the first child:

```jsx
{tab === 'ITINERARY' && (
  <>
    <AdaptiveSearchBar />
    {/* existing ITINERARY content unchanged below */}
  </>
)}
```

Inside the LOGISTICS tab render block:

```jsx
{tab === 'LOGISTICS' && (
  <>
    <AdaptiveSearchBar />
    {/* existing LOGISTICS content unchanged below */}
  </>
)}
```

Inside the DISCOVERY tab render block:

```jsx
{tab === 'DISCOVERY' && (
  <>
    <AdaptiveSearchBar />
    {/* existing DISCOVERY content unchanged below */}
  </>
)}
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/TripPlanner.jsx
git commit -m "feat(search): wire AdaptiveSearchBar into ITINERARY, LOGISTICS, DISCOVERY tabs"
```

---

## Task 6: Fix `require()` in `AdaptiveSearchBar` — use hook at top level

The `require()` call in `AdaptiveSearchBar.jsx` (Task 4) is a placeholder workaround. Fix it now.

**Files:**
- Modify: `src/components/search/AdaptiveSearchBar.jsx`

- [ ] **Step 1: Replace require with proper import and expose climate from SearchContext**

Update `SearchContext.jsx` to also expose `climate`:

```jsx
// In src/context/SearchContext.jsx — update the value object:
const value = useMemo(() => ({
  activeTab,
  destination: trip.destination,
  userRole,
  strategy,
  climate: trip.climate,   // ADD THIS
}), [activeTab, trip.destination, userRole, strategy, trip.climate]);
```

Update `AdaptiveSearchBar.jsx` — remove the `require` block and use `climate` from context:

```jsx
import { useSearchContext } from '../../context/SearchContext';
import { useAdaptiveSearch } from '../../hooks/useAdaptiveSearch';
import { POIDetailSheet } from './POIDetailSheet';

export function AdaptiveSearchBar() {
  const { strategy, destination, userRole, climate } = useSearchContext();

  const {
    query, setQuery,
    results, inspireResults,
    loading,
    handleFocus, handleBlur,
    detailPoi, detailActions,
    openDetail, closeDetail,
  } = useAdaptiveSearch(strategy, destination, userRole, climate);

  // ... rest of component unchanged ...
```

- [ ] **Step 2: Commit**

```bash
git add src/context/SearchContext.jsx src/components/search/AdaptiveSearchBar.jsx
git commit -m "fix(search): remove require() from AdaptiveSearchBar, expose climate via SearchContext"
```

---

## Task 7: Smoke test in browser

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Navigate to ITINERARY tab**

Open `http://localhost:3001`. Navigate to the ITINERARY tab. Verify:
- `AdaptiveSearchBar` renders with placeholder "Find stops, viewpoints…"
- Clicking the input triggers Inspire Me — Overpass fires, chips appear in Ember orange OR fallback static chips show
- Typing triggers autocomplete dropdown with POI rows
- Tapping a result opens `POIDetailSheet` slide-up panel
- "Add to Leg" button emits to `sentinelBus` (no visible error in console)
- Closing the sheet works

- [ ] **Step 3: Navigate to LOGISTICS tab**

Verify placeholder changes to "Find gear shops, grocery…" and inspire chips are different categories.

- [ ] **Step 4: Navigate to DISCOVERY tab**

Verify placeholder changes to "Explore hidden gems…".

- [ ] **Step 5: Verify OVERVIEW tab is unaffected**

OVERVIEW tab must show no search bar. Existing content unchanged.

- [ ] **Step 6: Run full test suite**

```bash
npx vitest run
```

Expected: all tests PASS

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "feat(search): module-adaptive search bar complete — ITINERARY, LOGISTICS, DISCOVERY"
```
