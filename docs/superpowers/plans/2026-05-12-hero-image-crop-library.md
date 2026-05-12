# Hero Image Crop Editor + Static Photo Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace wrong/broken Hamburg hero photos, add a drag-to-pan crop editor, and add an in-hero photo picker backed by a static curated library.

**Architecture:** `destinationEngine.js` entries migrate from flat `string[]` to typed objects `{ url, source, credit, tags }`. A new `heroImagePositions` slice in the React Context store (keyed by image URL) persists crop positions to `localStorage`. `TripHeroImage` gains an edit mode with drag-to-pan and an expandable photo picker that filters the static library client-side.

**Tech Stack:** React (JSX), useReducer/Context, CSS objectPosition for crop, Node.js (dev script only)

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/utils/destinationEngine.js` | Modify | Migrate Hamburg array to object shape; add `normalizeHero` export |
| `src/store/useTripStore.jsx` | Modify | Add `heroImagePositions` state, `SET_HERO_IMAGE_POSITION` reducer case, `setHeroImagePosition` action |
| `src/store/__tests__/useTripStore.heroPos.test.jsx` | Create | Tests for the new store slice |
| `src/pages/TripPlanner.jsx` | Modify | Update `TripHeroImage` — normalized candidates, edit mode, drag, toolbar, photo picker |
| `scripts/fetch-destination-photos.js` | Create | Dev-only script to fetch candidate photos from Pexels + Unsplash for library expansion |

---

## Task 1: Dev script to pull candidate photos

**Files:**
- Create: `scripts/fetch-destination-photos.js`

This script is run once per destination by a developer to get candidate URLs. It requires `PEXELS_API_KEY` and `UNSPLASH_ACCESS_KEY` environment variables. Output is printed to stdout for manual copy-paste into `destinationEngine.js`.

- [ ] **Step 1: Create the script**

```js
// scripts/fetch-destination-photos.js
// Usage: node scripts/fetch-destination-photos.js --destination "hamburg" --count 10
// Env:   PEXELS_API_KEY, UNSPLASH_ACCESS_KEY

const args = process.argv.slice(2);
const dest = args[args.indexOf('--destination') + 1] ?? 'hamburg';
const count = parseInt(args[args.indexOf('--count') + 1] ?? '10', 10);

const PEXELS_KEY = process.env.PEXELS_API_KEY;
const UNSPLASH_KEY = process.env.UNSPLASH_ACCESS_KEY;

async function fetchPexels(query, perPage) {
  if (!PEXELS_KEY) { console.warn('No PEXELS_API_KEY — skipping Pexels'); return []; }
  const res = await fetch(
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=landscape`,
    { headers: { Authorization: PEXELS_KEY } }
  );
  const json = await res.json();
  return (json.photos ?? []).map(p => ({
    url: p.src.original + '?auto=compress&cs=tinysrgb&w=2560',
    source: 'pexels',
    credit: p.photographer,
    tags: query.toLowerCase().split(' '),
    preview: p.src.medium,
  }));
}

async function fetchUnsplash(query, perPage) {
  if (!UNSPLASH_KEY) { console.warn('No UNSPLASH_ACCESS_KEY — skipping Unsplash'); return []; }
  const res = await fetch(
    `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=landscape`,
    { headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` } }
  );
  const json = await res.json();
  return (json.results ?? []).map(p => ({
    url: p.urls.raw + '&w=2560&q=80&fm=jpg',
    source: 'unsplash',
    credit: p.user.name,
    tags: (p.tags ?? []).map(t => t.title?.toLowerCase()).filter(Boolean),
    preview: p.urls.small,
  }));
}

const queries = [
  dest,
  `${dest} waterfront`,
  `${dest} landmark`,
  `${dest} architecture`,
  `${dest} skyline`,
];

(async () => {
  const half = Math.ceil(count / 2);
  const results = [];
  for (const q of queries.slice(0, 3)) {
    results.push(...await fetchPexels(q, Math.ceil(half / 3)));
    results.push(...await fetchUnsplash(q, Math.ceil(half / 3)));
  }
  const unique = results.filter((r, i, a) => a.findIndex(x => x.url === r.url) === i).slice(0, count);
  console.log('\n// Paste verified entries into DESTINATION_HEROES["' + dest + '"]:');
  console.log('// Open each preview URL to verify it shows ' + dest + ' before committing.\n');
  unique.forEach(r => {
    console.log(`// preview: ${r.preview}`);
    console.log(`{ url: '${r.url}', source: '${r.source}', credit: '${r.credit}', tags: ${JSON.stringify(r.tags)} },`);
  });
})();
```

- [ ] **Step 2: Run for Hamburg, capture output**

```bash
cd C:\Users\lasse\Desktop\venturepath
PEXELS_API_KEY=<your-key> UNSPLASH_ACCESS_KEY=<your-key> node scripts/fetch-destination-photos.js --destination "hamburg" --count 12
```

Open each `preview:` URL printed in the output. For each one that clearly shows Hamburg (Speicherstadt canals, Elbphilharmonie, Landungsbrücken, HafenCity, Rathaus, Alster), copy its object line. You want at least 8 verified entries.

- [ ] **Step 3: Commit the script**

```bash
git add scripts/fetch-destination-photos.js
git commit -m "chore: add fetch-destination-photos dev script for static library expansion"
```

---

## Task 2: Migrate destinationEngine.js to object shape + replace Hamburg photos

**Files:**
- Modify: `src/utils/destinationEngine.js`

- [ ] **Step 1: Add `normalizeHero` export at top of `DESTINATION_HEROES` block**

Find the comment line `// Curated high-resolution hero images per destination` (line ~61) and insert the normalizer before the `export const DESTINATION_HEROES` line:

```js
// Normalize a hero entry — accepts legacy string or new object shape.
export function normalizeHero(entry) {
  if (typeof entry === 'string') {
    return { url: entry, source: 'pexels', credit: '', tags: [] };
  }
  return entry;
}
```

- [ ] **Step 2: Replace the Hamburg entry with verified object-shape photos**

Replace the entire `hamburg:` array (currently 5 string URLs, lines ~72–78) with the 8–12 entries you verified in Task 1, Step 2. The shape must match exactly:

```js
hamburg: [
  { url: 'https://images.pexels.com/photos/XXXXXXX/pexels-photo-XXXXXXX.jpeg?auto=compress&cs=tinysrgb&w=2560', source: 'pexels', credit: 'Photographer Name', tags: ['speicherstadt', 'canal', 'warehouse'] },
  { url: 'https://images.pexels.com/photos/YYYYYYY/pexels-photo-YYYYYYY.jpeg?auto=compress&cs=tinysrgb&w=2560', source: 'pexels', credit: 'Photographer Name', tags: ['elbphilharmonie', 'concert hall'] },
  // … 6–10 more verified Hamburg entries
],
```

All other destinations (`patagonia`, `svalbard`, etc.) remain as `string[]` — `normalizeHero` handles them at read time.

- [ ] **Step 3: Verify the page still loads**

```bash
npm run dev
```

Open http://localhost:3002 (or 3001 — whichever is VP), navigate to TripPlanner, change destination to Hamburg, confirm the hero shows a real Hamburg image (not the Indian building or a blank).

- [ ] **Step 4: Commit**

```bash
git add src/utils/destinationEngine.js
git commit -m "fix(hero): replace wrong/broken Hamburg photos with verified entries"
```

---

## Task 3: Add `heroImagePositions` to useTripStore

**Files:**
- Modify: `src/store/useTripStore.jsx`
- Create: `src/store/__tests__/useTripStore.heroPos.test.jsx`

- [ ] **Step 1: Write the failing test first**

```jsx
// src/store/__tests__/useTripStore.heroPos.test.jsx
import { renderHook, act } from '@testing-library/react';
import { TripStoreProvider, useTripStore } from '../useTripStore';

const wrapper = ({ children }) => <TripStoreProvider>{children}</TripStoreProvider>;

describe('heroImagePositions store slice', () => {
  it('initialises with empty positions map', () => {
    const { result } = renderHook(() => useTripStore(), { wrapper });
    expect(result.current.heroImagePositions).toEqual({});
  });

  it('setHeroImagePosition stores x/y keyed by url', () => {
    const { result } = renderHook(() => useTripStore(), { wrapper });
    act(() => {
      result.current.setHeroImagePosition('https://example.com/photo.jpg', 35, 60);
    });
    expect(result.current.heroImagePositions['https://example.com/photo.jpg']).toEqual({ x: 35, y: 60 });
  });

  it('setHeroImagePosition overwrites existing position for same url', () => {
    const { result } = renderHook(() => useTripStore(), { wrapper });
    act(() => {
      result.current.setHeroImagePosition('https://example.com/photo.jpg', 35, 60);
      result.current.setHeroImagePosition('https://example.com/photo.jpg', 10, 20);
    });
    expect(result.current.heroImagePositions['https://example.com/photo.jpg']).toEqual({ x: 10, y: 20 });
  });

  it('setHeroImagePosition does not affect other urls', () => {
    const { result } = renderHook(() => useTripStore(), { wrapper });
    act(() => {
      result.current.setHeroImagePosition('https://example.com/a.jpg', 10, 20);
      result.current.setHeroImagePosition('https://example.com/b.jpg', 70, 30);
    });
    expect(result.current.heroImagePositions['https://example.com/a.jpg']).toEqual({ x: 10, y: 20 });
    expect(result.current.heroImagePositions['https://example.com/b.jpg']).toEqual({ x: 70, y: 30 });
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd C:\Users\lasse\Desktop\venturepath
npx vitest run src/store/__tests__/useTripStore.heroPos.test.jsx
```

Expected: FAIL — `setHeroImagePosition is not a function` (or similar).

- [ ] **Step 3: Add `heroImagePositions` to `initialState`**

In `useTripStore.jsx`, find `const initialState = {` (line ~36) and add the new field:

```js
const initialState = {
  trip: DEFAULT_TRIP,
  legs: DEFAULT_LEGS,
  objectives: DEFAULT_OBJECTIVES,
  manifestSettings: DEFAULT_MANIFEST_SETTINGS,
  userRole: 'LEADER',
  cloning: false,
  stays: [],
  pois: [],
  alerts: [],
  budget: { total: 0, items: [] },
  dayLoops: [],
  heroImagePositions: {},   // { [imageUrl]: { x: number, y: number } }
};
```

- [ ] **Step 4: Add the reducer case**

Find the `default: return state;` line near the bottom of the `reducer` function (line ~222) and insert before it:

```js
case 'SET_HERO_IMAGE_POSITION': {
  const { url, x, y } = action.payload;
  return {
    ...state,
    heroImagePositions: { ...state.heroImagePositions, [url]: { x, y } },
  };
}
```

- [ ] **Step 5: Add the action creator and expose it**

Inside `TripStoreProvider`, after the existing `setTripPlanningMode` line (~line 301), add:

```js
const setHeroImagePosition = (url, x, y) =>
  dispatch({ type: 'SET_HERO_IMAGE_POSITION', payload: { url, x, y } });
```

Then add `setHeroImagePosition` to the context value spread (the big object starting line ~304):

```js
<TripStoreContext.Provider value={{
  ...state,
  dispatch,
  clonePath, createTrip, updateTrip, addLeg, updateLeg, removeLeg, resetTrip,
  setRole, updateLegStatus, loadExpedition, replaceLegs, addStay, removeStay,
  addPoi, removePoi, addAlert, clearAlerts, addBudgetItem,
  addDayLoop, addStopToDayLoop, removeStopFromDayLoop, setAutoLegs,
  setDayLoopMode, removeDayLoop, setTripPlanningMode,
  setHeroImagePosition,
}}>
```

- [ ] **Step 6: Add `heroImagePositions` to the localStorage persistence effect**

Find the `localStorage.setItem` call inside the `useEffect` (line ~250). Add `heroImagePositions` to the saved object:

```js
localStorage.setItem(STORAGE_KEY, JSON.stringify({
  trip: state.trip,
  legs: state.legs,
  objectives: state.objectives,
  manifestSettings: state.manifestSettings,
  userRole: state.userRole,
  stays: state.stays,
  pois: state.pois,
  alerts: state.alerts,
  budget: state.budget,
  dayLoops: state.dayLoops,
  heroImagePositions: state.heroImagePositions,
}));
```

- [ ] **Step 7: Run tests to confirm they pass**

```bash
npx vitest run src/store/__tests__/useTripStore.heroPos.test.jsx
```

Expected: 4 tests PASS.

- [ ] **Step 8: Commit**

```bash
git add src/store/useTripStore.jsx src/store/__tests__/useTripStore.heroPos.test.jsx
git commit -m "feat(store): add heroImagePositions slice with setHeroImagePosition action"
```

---

## Task 4: Migrate TripHeroImage to normalized candidates + read crop from store

**Files:**
- Modify: `src/pages/TripPlanner.jsx` (the `TripHeroImage` function, lines 48–173)

This task only updates how candidates are read and how `objectPosition` is computed. No edit UI yet.

- [ ] **Step 1: Import `normalizeHero` and `useTripStore` inside `TripHeroImage`**

`TripHeroImage` currently reads `DESTINATION_HEROES` directly. Add `normalizeHero` to the import at the top of the file:

```js
import { DESTINATION_CENTERS, DESTINATION_HEROES, normalizeHero } from '../utils/destinationEngine';
```

- [ ] **Step 2: Read `heroImagePositions` and `setHeroImagePosition` from the store inside `TripHeroImage`**

At the top of the `TripHeroImage` function body (after the existing state declarations), add:

```js
const { heroImagePositions, setHeroImagePosition } = useTripStore();
```

- [ ] **Step 3: Normalize `candidates` and derive `imgSrc` from `.url`**

Replace the existing candidate lines:

```js
// BEFORE
const candidates = heroImageUrl
  ? [heroImageUrl]
  : (DESTINATION_HEROES[key] ?? DESTINATION_HEROES.default);
const total = candidates.length;
const imgSrc = candidates[imgIndex];
```

With:

```js
// AFTER
const candidates = heroImageUrl
  ? [normalizeHero(heroImageUrl)]
  : (DESTINATION_HEROES[key] ?? DESTINATION_HEROES.default).map(normalizeHero);
const total = candidates.length;
const imgSrc = candidates[imgIndex].url;
const savedPos = heroImagePositions[imgSrc] ?? { x: 50, y: 40 };
```

- [ ] **Step 4: Update `objectPosition` on the `<img>` to use `savedPos`**

Find the `<img>` element's style (line ~107). Change:

```js
// BEFORE
objectPosition: 'center 40%',
```

To:

```js
// AFTER
objectPosition: `${savedPos.x}% ${savedPos.y}%`,
```

- [ ] **Step 5: Fix the dot indicator key** — it currently uses index `i` as key but clicking dots uses `candidates[i]`, which is now an object. The dots still work fine by index; just update the aria-label to use `candidates[i].credit` when available:

```jsx
// In the dot indicators map:
aria-label={candidates[i].credit ? `Photo by ${candidates[i].credit}` : `Photo ${i + 1}`}
```

- [ ] **Step 6: Verify in browser**

Open TripPlanner. Hero should render with position `50% 40%` (same as before). Navigate between photos — position changes per photo since `savedPos` re-reads from `heroImagePositions` for each `imgSrc`.

- [ ] **Step 7: Commit**

```bash
git add src/pages/TripPlanner.jsx
git commit -m "refactor(hero): normalize DESTINATION_HEROES entries; read objectPosition from store"
```

---

## Task 5: Add edit mode and drag-to-pan

**Files:**
- Modify: `src/pages/TripPlanner.jsx` (`TripHeroImage` function)

- [ ] **Step 1: Add edit mode state variables**

Inside `TripHeroImage`, after the existing state declarations (`bleedOpacity`, `imgIndex`, `hovered`), add:

```js
const [editing, setEditing] = useState(false);
const [draftPos, setDraftPos] = useState(null);   // { x, y } while dragging; null at rest
const dragOrigin = useRef(null);                   // { mouseX, mouseY, startX, startY }
```

- [ ] **Step 2: Add drag event handlers**

Add these three functions inside `TripHeroImage` (after the `next` function):

```js
function startDrag(e) {
  if (!editing) return;
  e.preventDefault();
  const pos = draftPos ?? savedPos;
  dragOrigin.current = { mouseX: e.clientX, mouseY: e.clientY, startX: pos.x, startY: pos.y };
  window.addEventListener('mousemove', onDrag);
  window.addEventListener('mouseup', stopDrag);
}

function onDrag(e) {
  if (!dragOrigin.current || !heroRef.current) return;
  const rect = heroRef.current.getBoundingClientRect();
  const dx = ((e.clientX - dragOrigin.current.mouseX) / rect.width) * 100;
  const dy = ((e.clientY - dragOrigin.current.mouseY) / rect.height) * 100;
  const x = Math.max(0, Math.min(100, dragOrigin.current.startX - dx));
  const y = Math.max(0, Math.min(100, dragOrigin.current.startY - dy));
  setDraftPos({ x, y });
}

function stopDrag() {
  dragOrigin.current = null;
  window.removeEventListener('mousemove', onDrag);
  window.removeEventListener('mouseup', stopDrag);
}
```

- [ ] **Step 3: Derive the displayed position**

Add this line immediately after the `savedPos` line from Task 4:

```js
const displayPos = draftPos ?? savedPos;
```

Then update the `<img>` `objectPosition` to use `displayPos`:

```js
objectPosition: `${displayPos.x}% ${displayPos.y}%`,
```

- [ ] **Step 4: Add drag listeners to the `<img>` and change cursor in edit mode**

Update the `<img>` element:

```jsx
<img
  key={imgSrc}
  src={imgSrc}
  alt={city}
  onMouseDown={startDrag}
  style={{
    width: '100%', height: '100%', objectFit: 'cover',
    objectPosition: `${displayPos.x}% ${displayPos.y}%`,
    display: 'block', transition: editing ? 'none' : 'opacity 0.3s ease',
    cursor: editing ? (dragOrigin.current ? 'grabbing' : 'grab') : 'default',
    userSelect: 'none',
  }}
/>
```

- [ ] **Step 5: Add the pencil icon button**

Inside the hero `<div>` (after the destination label block, before the closing `</div>`), add the pencil button:

```jsx
{/* Pencil — enter edit mode */}
{!editing && (
  <button
    onClick={e => { e.stopPropagation(); setDraftPos(savedPos); setEditing(true); }}
    aria-label="Adjust image position"
    style={{
      position: 'absolute', top: 10, right: 10, zIndex: 12,
      width: 30, height: 30, borderRadius: 7,
      background: 'rgba(14,16,18,0.65)', backdropFilter: 'blur(6px)',
      border: '1px solid rgba(217,197,178,0.2)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer', opacity: hovered ? 1 : 0,
      transition: 'opacity 0.18s ease',
      color: '#D9C5B2',
    }}
  >
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M9.5 2.5l2 2L4 12H2v-2L9.5 2.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  </button>
)}
```

- [ ] **Step 6: Add the dashed edit border overlay**

Inside the hero `<div>`, after the pencil button, add:

```jsx
{/* Edit mode border */}
{editing && (
  <div style={{
    position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 11,
    border: '2px dashed rgba(230,126,34,0.7)', borderRadius: 0,
    boxSizing: 'border-box',
  }} />
)}
```

- [ ] **Step 7: Add the edit toolbar**

After the hero `<div>` closing tag (the div with `position: relative, height: 340`), add the toolbar as a sibling element — it renders below the hero when editing:

```jsx
{editing && (
  <div style={{
    display: 'flex', gap: 8, padding: '8px 14px',
    background: 'rgba(14,16,18,0.95)', borderBottom: '1px solid rgba(217,197,178,0.1)',
    alignItems: 'center',
  }}>
    <button
      onClick={() => { setEditing(false); setDraftPos(null); }}
      style={{ background: 'transparent', border: '1px solid rgba(217,197,178,0.2)', borderRadius: 6, padding: '4px 12px', color: '#888', cursor: 'pointer', fontSize: '0.72rem', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '.04em' }}
    >
      Cancel
    </button>
    <div style={{ flex: 1 }} />
    <button
      onClick={() => { /* search toggle — added in Task 6 */ }}
      style={{ background: 'transparent', border: '1px solid #E67E22', borderRadius: 6, padding: '4px 12px', color: '#E67E22', cursor: 'pointer', fontSize: '0.72rem', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '.04em' }}
    >
      🔍 Change photo
    </button>
    <button
      onClick={() => {
        const p = draftPos ?? savedPos;
        setHeroImagePosition(imgSrc, p.x, p.y);
        setEditing(false);
        setDraftPos(null);
      }}
      style={{ background: '#E67E22', border: 'none', borderRadius: 6, padding: '4px 14px', color: '#fff', cursor: 'pointer', fontSize: '0.72rem', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '.04em', fontWeight: 600 }}
    >
      Save
    </button>
  </div>
)}
```

- [ ] **Step 8: Verify in browser**

Hover the hero → pencil appears. Click it → dashed border, cursor changes to grab. Drag the image → it repositions live. Click Save → position persists when you switch photos and come back. Click Cancel → reverts to saved position.

- [ ] **Step 9: Commit**

```bash
git add src/pages/TripPlanner.jsx
git commit -m "feat(hero): add drag-to-pan edit mode with pencil trigger and save/cancel toolbar"
```

---

## Task 6: Add in-hero photo picker

**Files:**
- Modify: `src/pages/TripPlanner.jsx` (`TripHeroImage` function)

- [ ] **Step 1: Add `searching` and `searchQuery` state**

Inside `TripHeroImage`, add after the `editing` / `draftPos` / `dragOrigin` declarations:

```js
const [searching, setSearching] = useState(false);
const [searchQuery, setSearchQuery] = useState('');
```

- [ ] **Step 2: Initialize `searchQuery` with city name when entering search**

Update the "Change photo" toolbar button's `onClick`:

```js
onClick={() => {
  setSearchQuery(city.toLowerCase());
  setSearching(s => !s);
}}
```

- [ ] **Step 3: Build the filtered results list**

Add this derived value inside `TripHeroImage` (before the return statement):

```js
const allPhotos = (DESTINATION_HEROES[key] ?? DESTINATION_HEROES.default).map(normalizeHero);
const pickerResults = searchQuery.trim() === ''
  ? allPhotos
  : allPhotos.filter(p => {
      const q = searchQuery.toLowerCase();
      return p.tags.some(t => t.includes(q))
        || p.credit.toLowerCase().includes(q)
        || p.source.includes(q);
    });
```

- [ ] **Step 4: Add the search panel JSX**

After the toolbar JSX (from Task 5 Step 7), add the search panel as another sibling — it renders below the toolbar when `searching` is true:

```jsx
{editing && searching && (
  <div style={{ background: 'rgba(10,9,8,0.97)', borderBottom: '1px solid rgba(217,197,178,0.08)' }}>
    {/* Search input row */}
    <div style={{ display: 'flex', gap: 8, padding: '8px 14px 6px' }}>
      <input
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
        placeholder={`Search ${city} photos…`}
        style={{
          flex: 1, background: '#1c1a17', border: '1px solid rgba(217,197,178,0.15)',
          borderRadius: 6, padding: '5px 10px', color: '#D9C5B2',
          fontFamily: "'JetBrains Mono', monospace", fontSize: '0.72rem',
          outline: 'none',
        }}
      />
    </div>
    {/* Thumbnail strip */}
    <div style={{ display: 'flex', gap: 8, padding: '0 14px 10px', overflowX: 'auto' }}>
      {pickerResults.length === 0 && (
        <span style={{ color: '#555', fontSize: '0.7rem', fontFamily: "'JetBrains Mono', monospace", padding: '8px 0' }}>
          No photos match "{searchQuery}"
        </span>
      )}
      {pickerResults.map((photo, i) => (
        <div
          key={photo.url}
          onClick={() => {
            setImgIndex(candidates.findIndex(c => c.url === photo.url));
            setDraftPos({ x: 50, y: 40 });
            setSearching(false);
          }}
          style={{ position: 'relative', flexShrink: 0, cursor: 'pointer' }}
        >
          <img
            src={photo.url + (photo.url.includes('pexels') ? '&w=200&h=120&fit=crop' : '&w=200&h=120&fit=crop')}
            alt={photo.credit || `Photo ${i + 1}`}
            style={{
              width: 90, height: 58, objectFit: 'cover', borderRadius: 5, display: 'block',
              border: photo.url === imgSrc ? '2px solid #E67E22' : '2px solid transparent',
              transition: 'border-color 0.15s ease',
            }}
          />
          {/* Source attribution chip */}
          <span style={{
            position: 'absolute', bottom: 3, left: 3,
            background: 'rgba(0,0,0,0.65)', borderRadius: 3,
            padding: '1px 4px', fontSize: '0.55rem',
            fontFamily: "'JetBrains Mono', monospace", color: '#D9C5B2',
            letterSpacing: '.04em', textTransform: 'uppercase',
          }}>
            {photo.source}
          </span>
        </div>
      ))}
    </div>
  </div>
)}
```

- [ ] **Step 5: Handle the case where the selected photo isn't in `candidates`**

When the user clicks a photo in the picker, we call `setImgIndex(candidates.findIndex(...))`. If the photo isn't currently in the slideshow candidates (e.g. it's a default photo shown when library is small), the findIndex returns `-1`. Guard this:

```js
onClick={() => {
  const idx = candidates.findIndex(c => c.url === photo.url);
  if (idx >= 0) setImgIndex(idx);
  setDraftPos({ x: 50, y: 40 });
  setSearching(false);
}}
```

Note: if the destination's library only has the photos already in `candidates`, this is always fine. In the future when library entries grow, this would need a "swap into rotation" feature — but that's out of scope.

- [ ] **Step 6: Verify in browser**

Enter edit mode → click "Change photo" → search panel expands with Hamburg photos. Search "canal" → filters to Speicherstadt shots. Click a thumbnail → hero swaps to that image, position resets to center. The new image is now pannable. Click Save → position committed.

- [ ] **Step 7: Commit**

```bash
git add src/pages/TripPlanner.jsx
git commit -m "feat(hero): add inline photo picker with static library search and source attribution"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** Dev script ✓ · Hamburg seed ✓ · normalizeHero coercion ✓ · store slice ✓ · drag-to-pan ✓ · toolbar ✓ · photo picker ✓ · attribution chips ✓
- [x] **Placeholders:** No TBDs. Task 2 Step 2 requires human photo verification — this is intentional, not a placeholder.
- [x] **Type consistency:** `normalizeHero` return shape `{ url, source, credit, tags }` used consistently in Tasks 4, 5, 6. `savedPos`/`draftPos`/`displayPos` all `{ x, y }`. `setHeroImagePosition(url, x, y)` matches reducer `{ url, x, y }` payload.
- [x] **Edge cases covered:** Single-image destinations ✓ · broken images unchanged ✓ · touch (note: only mouse events implemented — touch can be a follow-up) · picker photo not in candidates ✓
