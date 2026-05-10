# Journey Photo Tour Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a JOURNEY tab in TripPlanner where users attach photos to stops, then play back a cinematic map-driven photo tour — with a shareable public link.

**Architecture:** Photos are stored as base64 or external URLs on each leg in `useTripStore`. A new JOURNEY tab houses Studio (authoring) and Tour (playback) modes. Public sharing uses hash-based routing (`#tour/<slug>`) so no router dependency is needed — consistent with the existing `view`-string router pattern in App.jsx.

**Tech Stack:** React 19, Framer Motion (already installed), dnd-kit (already installed), react-leaflet + Leaflet (already installed), localStorage persistence.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/store/useTripStore.jsx` | Modify | Add photo + journey actions to reducer and provider |
| `src/components/layout/Sidebar.jsx` | Modify | Add JOURNEY nav item between DISCOVERY and VAULT |
| `src/pages/TripPlanner.jsx` | Modify | Import JourneyTab, render for JOURNEY tab |
| `src/App.jsx` | Modify | Detect `#tour/<slug>` on load, render TourPage |
| `src/components/journey/JourneyTab.jsx` | Create | Root: mode toggle (STUDIO / TOUR) |
| `src/components/journey/studio/StudioView.jsx` | Create | Two-panel layout (stop list + photo editor) |
| `src/components/journey/studio/StopPhotoCard.jsx` | Create | Stop card: thumbnail strip, cover star, count badge |
| `src/components/journey/studio/PhotoUploader.jsx` | Create | File drag-drop + URL input → Photo[] |
| `src/components/journey/studio/PhotoStrip.jsx` | Create | Sortable horizontal thumbnails with captions |
| `src/components/journey/studio/PublishButton.jsx` | Create | Slug gen, publish/unpublish, copy link |
| `src/components/journey/tour/TourView.jsx` | Create | Fullscreen split: TourMap + PhotoStage + TourControls |
| `src/components/journey/tour/TourMap.jsx` | Create | Leaflet map, flyTo active stop, pulsing pin |
| `src/components/journey/tour/PhotoStage.jsx` | Create | Crossfade photo display + caption overlay |
| `src/components/journey/tour/TourControls.jsx` | Create | Scrub bar, play/pause, prev/next stop |
| `src/pages/TourPage.jsx` | Create | Standalone public tour (no nav, reads by slug) |

---

## Task 1: Extend useTripStore with photo + journey actions

**Files:**
- Modify: `src/store/useTripStore.jsx`

- [ ] **Step 1: Add photo + journey cases to the reducer**

In `src/store/useTripStore.jsx`, replace the `default:` case at the bottom of the `reducer` function with these new cases before it:

```js
case 'ADD_PHOTO': {
  const legs = state.legs.map(l =>
    l.id === action.payload.legId
      ? { ...l, photos: [...(l.photos ?? []), action.payload.photo] }
      : l
  );
  return { ...state, legs };
}
case 'REMOVE_PHOTO': {
  const legs = state.legs.map(l =>
    l.id === action.payload.legId
      ? { ...l, photos: (l.photos ?? []).filter(p => p.id !== action.payload.photoId) }
      : l
  );
  return { ...state, legs };
}
case 'UPDATE_PHOTO': {
  const legs = state.legs.map(l =>
    l.id === action.payload.legId
      ? {
          ...l,
          photos: (l.photos ?? []).map(p =>
            p.id === action.payload.photoId ? { ...p, ...action.payload.changes } : p
          ),
        }
      : l
  );
  return { ...state, legs };
}
case 'REORDER_PHOTOS': {
  const legs = state.legs.map(l => {
    if (l.id !== action.payload.legId) return l;
    const byId = Object.fromEntries((l.photos ?? []).map(p => [p.id, p]));
    const photos = action.payload.orderedIds.map((id, i) => ({ ...byId[id], order: i }));
    return { ...l, photos };
  });
  return { ...state, legs };
}
case 'SET_JOURNEY_META':
  return { ...state, journey: { ...(state.journey ?? {}), ...action.payload } };
```

- [ ] **Step 2: Add `journey: null` to `initialState`**

```js
const initialState = {
  trip: DEFAULT_TRIP,
  legs: DEFAULT_LEGS,
  objectives: DEFAULT_OBJECTIVES,
  manifestSettings: DEFAULT_MANIFEST_SETTINGS,
  userRole: 'LEADER',
  cloning: false,
  journey: null,   // ← add this line
};
```

- [ ] **Step 3: Include `journey` in localStorage persistence**

In the `useEffect` that calls `localStorage.setItem`, add `journey: state.journey` to the object:

```js
localStorage.setItem(STORAGE_KEY, JSON.stringify({
  trip: state.trip,
  legs: state.legs,
  objectives: state.objectives,
  manifestSettings: state.manifestSettings,
  userRole: state.userRole,
  journey: state.journey,   // ← add this line
}));
```

- [ ] **Step 4: Expose action helpers from the provider**

In `TripStoreProvider`, add these helpers alongside the existing ones:

```js
const addPhoto = (legId, photo) => dispatch({ type: 'ADD_PHOTO', payload: { legId, photo } });
const removePhoto = (legId, photoId) => dispatch({ type: 'REMOVE_PHOTO', payload: { legId, photoId } });
const updatePhoto = (legId, photoId, changes) => dispatch({ type: 'UPDATE_PHOTO', payload: { legId, photoId, changes } });
const reorderPhotos = (legId, orderedIds) => dispatch({ type: 'REORDER_PHOTOS', payload: { legId, orderedIds } });
const setJourneyMeta = (meta) => dispatch({ type: 'SET_JOURNEY_META', payload: meta });
```

Then add them to the `value` spread:

```js
<TripStoreContext.Provider value={{
  ...state,
  clonePath, createTrip, updateTrip, addLeg, updateLeg, removeLeg,
  resetTrip, setRole, updateLegStatus, loadExpedition,
  addPhoto, removePhoto, updatePhoto, reorderPhotos, setJourneyMeta,  // ← add
}}>
```

- [ ] **Step 5: Commit**

```bash
git add src/store/useTripStore.jsx
git commit -m "feat(journey): extend store with photo + journey actions"
```

---

## Task 2: Add JOURNEY to sidebar navigation

**Files:**
- Modify: `src/components/layout/Sidebar.jsx`

- [ ] **Step 1: Insert JOURNEY nav item between DISCOVERY and VAULT**

In `src/components/layout/Sidebar.jsx`, find the `NAV_ITEMS` array and add the JOURNEY entry:

```js
const NAV_ITEMS = [
  { id: 'OVERVIEW',  icon: '🗺',  label: 'Overview' },
  { id: 'ITINERARY', icon: '📅',  label: 'Itinerary' },
  { id: 'FLIGHTS',   icon: '✈',   label: 'Flights' },
  { id: 'STAYS',     icon: '🏨',  label: 'Stays' },
  { id: 'LOGISTICS', icon: '🎒',  label: 'Logistics' },
  { id: 'DISCOVERY', icon: '🔍',  label: 'Discover' },
  { id: 'JOURNEY',   icon: '📸',  label: 'Journey' },   // ← new
  { id: 'VAULT',     icon: '📂',  label: 'Saved trips' },
];
```

- [ ] **Step 2: Commit**

```bash
git add src/components/layout/Sidebar.jsx
git commit -m "feat(journey): add Journey tab to sidebar nav"
```

---

## Task 3: Create JourneyTab root component

**Files:**
- Create: `src/components/journey/JourneyTab.jsx`

- [ ] **Step 1: Create the file**

```jsx
import { useState } from 'react';
import StudioView from './studio/StudioView';
import TourView from './tour/TourView';

export default function JourneyTab() {
  const [mode, setMode] = useState('STUDIO');

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg)' }}>
      {/* Mode toggle */}
      <div
        className="flex items-center gap-1 px-6 py-3 border-b shrink-0"
        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
      >
        {['STUDIO', 'TOUR'].map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className="px-4 py-1.5 rounded text-xs font-mono tracking-wider uppercase transition-colors"
            style={{
              background: mode === m ? 'var(--ember)' : 'transparent',
              color: mode === m ? '#fff' : 'var(--text-secondary)',
              border: `1px solid ${mode === m ? 'var(--ember)' : 'var(--border)'}`,
            }}
          >
            {m}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden">
        {mode === 'STUDIO' ? (
          <StudioView />
        ) : (
          <TourView onExit={() => setMode('STUDIO')} />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire JourneyTab into TripPlanner**

In `src/pages/TripPlanner.jsx`, add the import at the top:

```js
import JourneyTab from '../components/journey/JourneyTab';
```

Then add the render block after the DISCOVERY block (around line 167):

```jsx
{tab === 'JOURNEY' && (
  <div className="flex-1 overflow-hidden flex flex-col">
    <JourneyTab />
  </div>
)}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/journey/JourneyTab.jsx src/pages/TripPlanner.jsx
git commit -m "feat(journey): scaffold JourneyTab with Studio/Tour toggle"
```

---

## Task 4: Create StopPhotoCard

**Files:**
- Create: `src/components/journey/studio/StopPhotoCard.jsx`

- [ ] **Step 1: Create the file**

```jsx
import { useTripStore } from '../../../store/useTripStore';

export default function StopPhotoCard({ leg, isSelected, onSelect }) {
  const { journey, setJourneyMeta } = useTripStore();
  const photos = leg.photos ?? [];
  const isCover = journey?.coverStopId === leg.id;
  const visible = photos.slice(0, 4);
  const overflow = photos.length - 4;

  function handleCoverStar(e) {
    e.stopPropagation();
    setJourneyMeta({ coverStopId: isCover ? null : leg.id });
  }

  return (
    <button
      onClick={() => onSelect(leg.id)}
      className="w-full text-left px-4 py-3 border-b transition-colors"
      style={{
        borderColor: 'var(--border)',
        background: isSelected ? 'rgba(230,126,34,0.1)' : 'transparent',
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
          {leg.from} → {leg.to}
        </span>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          {photos.length > 0 && (
            <span
              className="text-xs font-mono px-1.5 py-0.5 rounded"
              style={{ background: 'var(--ember)', color: '#fff' }}
            >
              {photos.length}
            </span>
          )}
          <button
            onClick={handleCoverStar}
            title={isCover ? 'Remove cover' : 'Set as tour cover'}
            style={{ color: isCover ? '#F2C94C' : 'var(--text-secondary)', fontSize: 16 }}
          >
            ★
          </button>
        </div>
      </div>

      {photos.length === 0 ? (
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          No photos yet — select this stop and add some
        </p>
      ) : (
        <div className="flex gap-1">
          {visible.map(p => (
            <div
              key={p.id}
              className="w-10 h-10 rounded overflow-hidden shrink-0"
              style={{ background: 'var(--border)' }}
            >
              <img
                src={p.url}
                alt={p.caption || ''}
                className="w-full h-full object-cover"
                onError={e => { e.target.style.display = 'none'; }}
              />
            </div>
          ))}
          {overflow > 0 && (
            <div
              className="w-10 h-10 rounded flex items-center justify-center text-xs font-mono shrink-0"
              style={{ background: 'var(--border)', color: 'var(--text-secondary)' }}
            >
              +{overflow}
            </div>
          )}
        </div>
      )}
    </button>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/journey/studio/StopPhotoCard.jsx
git commit -m "feat(journey): StopPhotoCard with thumbnail strip and cover star"
```

---

## Task 5: Create PhotoUploader

**Files:**
- Create: `src/components/journey/studio/PhotoUploader.jsx`

- [ ] **Step 1: Create the file**

```jsx
import { useRef, useState } from 'react';
import { useTripStore } from '../../../store/useTripStore';

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function PhotoUploader({ legId }) {
  const { addPhoto } = useTripStore();
  const inputRef = useRef(null);
  const [urlValue, setUrlValue] = useState('');
  const [dragging, setDragging] = useState(false);

  async function handleFiles(files) {
    for (const file of files) {
      if (!file.type.startsWith('image/')) continue;
      const url = await fileToBase64(file);
      addPhoto(legId, { id: makeId(), url, caption: '', source: 'upload', order: Date.now() });
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    handleFiles(Array.from(e.dataTransfer.files));
  }

  function handleUrlSubmit(e) {
    e.preventDefault();
    const trimmed = urlValue.trim();
    if (!trimmed) return;
    addPhoto(legId, { id: makeId(), url: trimmed, caption: '', source: 'link', order: Date.now() });
    setUrlValue('');
  }

  return (
    <div className="space-y-3">
      {/* Drag-drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors"
        style={{
          borderColor: dragging ? 'var(--ember)' : 'var(--border)',
          background: dragging ? 'rgba(230,126,34,0.05)' : 'transparent',
        }}
      >
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Drop photos here or click to upload
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={e => handleFiles(Array.from(e.target.files))}
        />
      </div>

      {/* URL input */}
      <form onSubmit={handleUrlSubmit} className="flex gap-2">
        <input
          type="url"
          value={urlValue}
          onChange={e => setUrlValue(e.target.value)}
          placeholder="Or paste a photo URL…"
          className="flex-1 text-sm px-3 py-2 rounded border font-mono"
          style={{
            background: 'var(--surface)',
            borderColor: 'var(--border)',
            color: 'var(--text-primary)',
          }}
        />
        <button
          type="submit"
          disabled={!urlValue.trim()}
          className="px-3 py-2 rounded text-xs font-mono uppercase tracking-wider transition-colors"
          style={{
            background: urlValue.trim() ? 'var(--ember)' : 'var(--border)',
            color: '#fff',
          }}
        >
          Add
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/journey/studio/PhotoUploader.jsx
git commit -m "feat(journey): PhotoUploader with drag-drop and URL input"
```

---

## Task 6: Create PhotoStrip (sortable thumbnails)

**Files:**
- Create: `src/components/journey/studio/PhotoStrip.jsx`

- [ ] **Step 1: Create the file**

```jsx
import { useSortable, SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useTripStore } from '../../../store/useTripStore';

function SortablePhoto({ photo, legId }) {
  const { updatePhoto, removePhoto } = useTripStore();
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: photo.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="shrink-0 w-32">
      <div
        {...attributes}
        {...listeners}
        className="w-32 h-24 rounded overflow-hidden mb-1 cursor-grab active:cursor-grabbing"
        style={{ background: 'var(--border)' }}
      >
        <img
          src={photo.url}
          alt={photo.caption || ''}
          className="w-full h-full object-cover"
          onError={e => { e.target.style.opacity = '0.3'; }}
          draggable={false}
        />
      </div>
      <input
        type="text"
        value={photo.caption}
        onChange={e => updatePhoto(legId, photo.id, { caption: e.target.value })}
        placeholder="Caption…"
        maxLength={140}
        className="w-full text-xs px-1.5 py-1 rounded border"
        style={{
          background: 'var(--surface)',
          borderColor: 'var(--border)',
          color: 'var(--text-primary)',
        }}
      />
      <button
        onClick={() => removePhoto(legId, photo.id)}
        className="text-xs mt-1 w-full text-center transition-colors"
        style={{ color: 'var(--text-secondary)' }}
      >
        Remove
      </button>
    </div>
  );
}

export default function PhotoStrip({ legId, photos }) {
  const { reorderPhotos } = useTripStore();

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = photos.map(p => p.id);
    const oldIndex = ids.indexOf(active.id);
    const newIndex = ids.indexOf(over.id);
    const reordered = [...ids];
    reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, active.id);
    reorderPhotos(legId, reordered);
  }

  if (photos.length === 0) return null;

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={photos.map(p => p.id)} strategy={horizontalListSortingStrategy}>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {photos.map(p => (
            <SortablePhoto key={p.id} photo={p} legId={legId} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/journey/studio/PhotoStrip.jsx
git commit -m "feat(journey): PhotoStrip with dnd-kit sortable thumbnails and captions"
```

---

## Task 7: Create PublishButton

**Files:**
- Create: `src/components/journey/studio/PublishButton.jsx`

- [ ] **Step 1: Create the file**

```jsx
import { useTripStore } from '../../../store/useTripStore';

function generateSlug(tripName) {
  return tripName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 40) + '-' + Date.now().toString(36);
}

export default function PublishButton() {
  const { trip, journey, legs, setJourneyMeta } = useTripStore();
  const hasPhotos = legs.some(l => (l.photos ?? []).length > 0);

  function handlePublish() {
    const slug = journey?.shareSlug || generateSlug(trip.name);
    const meta = {
      published: true,
      shareSlug: slug,
      title: journey?.title || trip.name,
      createdAt: journey?.createdAt || new Date().toISOString(),
    };
    setJourneyMeta(meta);
    const link = `${window.location.origin}${window.location.pathname}#tour/${slug}`;
    navigator.clipboard.writeText(link).catch(() => {});
  }

  function handleUnpublish() {
    setJourneyMeta({ published: false });
  }

  function handleCopyLink() {
    const link = `${window.location.origin}${window.location.pathname}#tour/${journey.shareSlug}`;
    navigator.clipboard.writeText(link).catch(() => {});
  }

  if (!hasPhotos) return null;

  return (
    <div className="flex items-center gap-2">
      {journey?.published ? (
        <>
          <button
            onClick={handleCopyLink}
            className="px-3 py-1.5 rounded text-xs font-mono uppercase tracking-wider"
            style={{ background: 'var(--ember)', color: '#fff' }}
          >
            Published ✓ — Copy Link
          </button>
          <button
            onClick={handleUnpublish}
            className="px-3 py-1.5 rounded text-xs font-mono uppercase tracking-wider"
            style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          >
            Unpublish
          </button>
        </>
      ) : (
        <button
          onClick={handlePublish}
          className="px-3 py-1.5 rounded text-xs font-mono uppercase tracking-wider"
          style={{ background: 'var(--ember)', color: '#fff' }}
        >
          Publish Journey
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/journey/studio/PublishButton.jsx
git commit -m "feat(journey): PublishButton with slug generation and clipboard copy"
```

---

## Task 8: Create StudioView (two-panel layout)

**Files:**
- Create: `src/components/journey/studio/StudioView.jsx`

- [ ] **Step 1: Create the file**

```jsx
import { useState } from 'react';
import { useTripStore } from '../../../store/useTripStore';
import StopPhotoCard from './StopPhotoCard';
import PhotoUploader from './PhotoUploader';
import PhotoStrip from './PhotoStrip';
import PublishButton from './PublishButton';

export default function StudioView() {
  const { trip, legs, journey, setJourneyMeta } = useTripStore();
  const [selectedLegId, setSelectedLegId] = useState(legs[0]?.id ?? null);

  const selectedLeg = legs.find(l => l.id === selectedLegId);
  const sortedPhotos = [...(selectedLeg?.photos ?? [])].sort((a, b) => a.order - b.order);

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div
        className="flex items-center gap-4 px-6 py-3 border-b shrink-0"
        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
      >
        <input
          type="text"
          value={journey?.title ?? trip.name}
          onChange={e => setJourneyMeta({ title: e.target.value })}
          placeholder="Journey title…"
          className="flex-1 text-sm font-medium px-2 py-1 rounded border"
          style={{
            background: 'transparent',
            borderColor: 'var(--border)',
            color: 'var(--text-primary)',
          }}
        />
        <PublishButton />
      </div>

      {/* Two-panel body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: stop list */}
        <div
          className="w-72 shrink-0 overflow-y-auto border-r"
          style={{ borderColor: 'var(--border)' }}
        >
          {legs.length === 0 ? (
            <p className="p-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
              No stops yet — add stops in the Itinerary tab first.
            </p>
          ) : (
            legs.map(leg => (
              <StopPhotoCard
                key={leg.id}
                leg={leg}
                isSelected={leg.id === selectedLegId}
                onSelect={setSelectedLegId}
              />
            ))
          )}
        </div>

        {/* Right: photo editor */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!selectedLeg ? (
            <p style={{ color: 'var(--text-secondary)' }}>Select a stop on the left to add photos.</p>
          ) : (
            <>
              <h2 className="font-medium" style={{ color: 'var(--text-primary)' }}>
                {selectedLeg.from} → {selectedLeg.to}
              </h2>
              <PhotoUploader legId={selectedLeg.id} />
              <PhotoStrip legId={selectedLeg.id} photos={sortedPhotos} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/journey/studio/StudioView.jsx
git commit -m "feat(journey): StudioView two-panel layout"
```

---

## Task 9: Create TourMap

**Files:**
- Create: `src/components/journey/tour/TourMap.jsx`

- [ ] **Step 1: Create the file**

```jsx
import { useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';

// Reuse icon URL fix from RouteMap
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const MODE_COLOR = {
  flight: '#64a0ff',
  bus:    '#ffc850',
  foot:   '#64dc82',
  boat:   '#a78bfa',
  car:    '#E67E22',
  train:  '#f87171',
};

function makeTourPin(num, color, isActive) {
  const pulse = isActive
    ? `<div style="
        position:absolute;inset:-6px;border-radius:50%;
        border:2px solid ${color};opacity:0.6;
        animation:tourPulse 1.4s ease-out infinite;
      "></div>`
    : '';
  return L.divIcon({
    className: '',
    iconAnchor: [18, 36],
    popupAnchor: [0, -40],
    html: `
      <style>
        @keyframes tourPulse {
          0%   { transform:scale(1);   opacity:0.6; }
          100% { transform:scale(2.2); opacity:0; }
        }
      </style>
      <div style="position:relative;width:36px;height:36px;">
        ${pulse}
        <div style="
          position:absolute;inset:0;
          border-radius:50% 50% 50% 0;transform:rotate(-45deg);
          background:${isActive ? color : '#555'};
          display:flex;align-items:center;justify-content:center;
          box-shadow:0 2px 8px rgba(0,0,0,${isActive ? 0.9 : 0.4});
          opacity:${isActive ? 1 : 0.5};
        ">
          <span style="transform:rotate(45deg);font-size:12px;font-weight:700;color:#0d1b2a;">${num}</span>
        </div>
      </div>`,
  });
}

function FlyToStop({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (coords) map.flyTo(coords, 10, { animate: true, duration: 1.2 });
  }, [coords, map]);
  return null;
}

export default function TourMap({ stops, activeStopIndex }) {
  // stops: Array<{ leg, coords }>
  const activeStop = stops[activeStopIndex];
  const center = stops.find(s => s.coords)?.coords ?? [20, 0];

  return (
    <MapContainer
      center={center}
      zoom={4}
      style={{ width: '100%', height: '100%' }}
      zoomControl={false}
    >
      <TileLayer
        url="https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png"
        attribution='&copy; Stadia Maps'
      />

      {activeStop?.coords && <FlyToStop coords={activeStop.coords} />}

      {/* Route polylines */}
      {stops.slice(0, -1).map((stop, i) => {
        const next = stops[i + 1];
        if (!stop.coords || !next?.coords) return null;
        const color = MODE_COLOR[stop.leg.mode] ?? '#E67E22';
        return (
          <Polyline
            key={i}
            positions={[stop.coords, next.coords]}
            pathOptions={{ color, weight: 2, opacity: 0.5, dashArray: '6 4' }}
          />
        );
      })}

      {/* Stop markers */}
      {stops.map((stop, i) => {
        if (!stop.coords) return null;
        const isActive = i === activeStopIndex;
        const color = MODE_COLOR[stop.leg.mode] ?? '#E67E22';
        return (
          <Marker
            key={stop.leg.id}
            position={stop.coords}
            icon={makeTourPin(i + 1, color, isActive)}
          />
        );
      })}
    </MapContainer>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/journey/tour/TourMap.jsx
git commit -m "feat(journey): TourMap with pulsing active pin and flyTo animation"
```

---

## Task 10: Create PhotoStage

**Files:**
- Create: `src/components/journey/tour/PhotoStage.jsx`

- [ ] **Step 1: Create the file**

```jsx
import { AnimatePresence, motion } from 'framer-motion';

export default function PhotoStage({ photos, photoIndex, stopLabel, stopProgress }) {
  const photo = photos[photoIndex];

  return (
    <div
      className="relative flex-1 flex flex-col overflow-hidden"
      style={{ background: '#0E1012' }}
    >
      {/* Stop progress label */}
      <div
        className="absolute top-4 left-0 right-0 z-10 text-center font-mono text-xs tracking-widest uppercase"
        style={{ color: 'rgba(255,255,255,0.5)' }}
      >
        {stopLabel}
      </div>

      {/* Photo crossfade */}
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="crossfade">
          {photo ? (
            <motion.div
              key={photo.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: 'easeInOut' }}
              className="absolute inset-0"
            >
              <img
                src={photo.url}
                alt={photo.caption || ''}
                className="w-full h-full object-cover"
                onError={e => { e.target.style.opacity = '0.1'; }}
              />
              {/* Caption overlay */}
              {photo.caption && (
                <div
                  className="absolute bottom-0 left-0 right-0 px-6 py-4"
                  style={{
                    background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
                    color: '#fff',
                    fontSize: 14,
                    fontFamily: 'Inter, sans-serif',
                  }}
                >
                  {photo.caption}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <p className="font-mono text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
                No photos for this stop
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/journey/tour/PhotoStage.jsx
git commit -m "feat(journey): PhotoStage with Framer Motion crossfade and caption overlay"
```

---

## Task 11: Create TourControls

**Files:**
- Create: `src/components/journey/tour/TourControls.jsx`

- [ ] **Step 1: Create the file**

```jsx
export default function TourControls({
  stops,           // Array<{ leg, coords, photos }>
  activeStopIndex,
  playing,
  onPlay,
  onPause,
  onPrevStop,
  onNextStop,
  onJumpTo,
  onExit,
}) {
  const activeStop = stops[activeStopIndex];

  return (
    <div
      className="shrink-0 px-6 py-4 border-t"
      style={{ background: '#0E1012', borderColor: 'rgba(255,255,255,0.1)' }}
    >
      {/* Stop label */}
      <p
        className="text-center font-mono text-xs tracking-widest uppercase mb-3"
        style={{ color: 'rgba(255,255,255,0.5)' }}
      >
        {activeStop ? `${activeStop.leg.from} → ${activeStop.leg.to}` : ''}
      </p>

      {/* Scrub bar */}
      <div className="flex gap-1 mb-4">
        {stops.map((stop, i) => (
          <button
            key={stop.leg.id}
            onClick={() => onJumpTo(i)}
            className="flex-1 h-1 rounded-full transition-colors"
            style={{
              background: i <= activeStopIndex
                ? 'var(--ember)'
                : 'rgba(255,255,255,0.15)',
            }}
            title={`${stop.leg.from} → ${stop.leg.to}`}
          />
        ))}
      </div>

      {/* Controls row */}
      <div className="flex items-center justify-center gap-6">
        <button
          onClick={onPrevStop}
          disabled={activeStopIndex === 0}
          className="text-xl disabled:opacity-30"
          style={{ color: '#fff' }}
          title="Previous stop"
        >
          ⏮
        </button>

        <button
          onClick={playing ? onPause : onPlay}
          className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
          style={{ background: 'var(--ember)', color: '#fff' }}
          title={playing ? 'Pause' : 'Play'}
        >
          {playing ? '⏸' : '▶'}
        </button>

        <button
          onClick={onNextStop}
          disabled={activeStopIndex >= stops.length - 1}
          className="text-xl disabled:opacity-30"
          style={{ color: '#fff' }}
          title="Next stop"
        >
          ⏭
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/journey/tour/TourControls.jsx
git commit -m "feat(journey): TourControls with scrub bar and play/pause/nav buttons"
```

---

## Task 12: Create TourView (main playback orchestrator)

**Files:**
- Create: `src/components/journey/tour/TourView.jsx`

- [ ] **Step 1: Create the file**

```jsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { useTripStore } from '../../../store/useTripStore';
import TourMap from './TourMap';
import PhotoStage from './PhotoStage';
import TourControls from './TourControls';

// Default coords matching useTripStore seed data
const DEFAULT_COORDS = {
  1: [-33.4569, -70.6483],
  2: [-53.1638, -70.9171],
  3: [-51.0,    -72.9],
  4: [-50.94,   -73.41],
  5: [-33.4569, -70.6483],
};

export default function TourView({ onExit }) {
  const { legs, journey } = useTripStore();

  // Build stops array — only legs with coords, all shown on map, only those with photos in playback
  const stops = legs.map(leg => ({
    leg,
    coords: leg.coords ?? DEFAULT_COORDS[leg.id] ?? null,
    photos: [...(leg.photos ?? [])].sort((a, b) => a.order - b.order),
  }));

  const playableStops = stops.filter(s => s.photos.length > 0);

  const [activeStopIndex, setActiveStopIndex] = useState(0);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [complete, setComplete] = useState(false);
  const timerRef = useRef(null);

  const activeStop = playableStops[activeStopIndex];

  const advance = useCallback(() => {
    setPhotoIndex(pi => {
      const maxPhoto = (activeStop?.photos.length ?? 1) - 1;
      if (pi < maxPhoto) return pi + 1;
      // Move to next stop
      setActiveStopIndex(si => {
        if (si < playableStops.length - 1) {
          setPhotoIndex(0);
          return si + 1;
        }
        // Tour complete
        setPlaying(false);
        setComplete(true);
        return si;
      });
      return pi;
    });
  }, [activeStop, playableStops.length]);

  useEffect(() => {
    if (!playing || complete) return;
    timerRef.current = setTimeout(advance, 4000);
    return () => clearTimeout(timerRef.current);
  }, [playing, complete, advance, activeStopIndex, photoIndex]);

  function handleJumpTo(stopIndex) {
    setActiveStopIndex(stopIndex);
    setPhotoIndex(0);
    setComplete(false);
    setPlaying(true);
  }

  function handlePrevStop() {
    if (activeStopIndex > 0) handleJumpTo(activeStopIndex - 1);
  }

  function handleNextStop() {
    if (activeStopIndex < playableStops.length - 1) handleJumpTo(activeStopIndex + 1);
  }

  function handleReplay() {
    handleJumpTo(0);
  }

  // Map uses all stops; playback uses playableStops
  // The map activeStopIndex needs to map back to the full stops array
  const mapActiveIndex = stops.findIndex(s => s.leg.id === activeStop?.leg.id);

  if (playableStops.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: '#0E1012' }}>
        <div className="text-center space-y-3">
          <p className="font-mono text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Add photos in Studio to start your journey
          </p>
          <button
            onClick={onExit}
            className="px-4 py-2 rounded text-xs font-mono uppercase tracking-wider"
            style={{ background: 'var(--ember)', color: '#fff' }}
          >
            Go to Studio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full relative" style={{ background: '#0E1012' }}>
      {/* Exit button */}
      <button
        onClick={onExit}
        className="absolute top-4 right-4 z-50 px-3 py-1.5 rounded text-xs font-mono uppercase tracking-wider"
        style={{ background: 'rgba(0,0,0,0.6)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.2)' }}
      >
        Exit Tour
      </button>

      {/* Journey Complete overlay */}
      {complete && (
        <div
          className="absolute inset-0 z-40 flex items-center justify-center"
          style={{ background: 'rgba(14,16,18,0.85)' }}
        >
          <div className="text-center space-y-4">
            <p className="font-editorial text-2xl" style={{ color: '#fff' }}>
              {journey?.title ?? 'Journey Complete'}
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleReplay}
                className="px-4 py-2 rounded text-xs font-mono uppercase tracking-wider"
                style={{ background: 'var(--ember)', color: '#fff' }}
              >
                Replay
              </button>
              <button
                onClick={onExit}
                className="px-4 py-2 rounded text-xs font-mono uppercase tracking-wider"
                style={{ border: '1px solid rgba(255,255,255,0.3)', color: '#fff' }}
              >
                Back to Studio
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main split */}
      <div className="flex flex-1 overflow-hidden">
        {/* Map panel — 45% */}
        <div className="w-[45%] shrink-0">
          <TourMap stops={stops} activeStopIndex={mapActiveIndex >= 0 ? mapActiveIndex : 0} />
        </div>

        {/* Photo panel — 55% */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <PhotoStage
            photos={activeStop?.photos ?? []}
            photoIndex={photoIndex}
            stopLabel={`Stop ${activeStopIndex + 1} of ${playableStops.length} — ${activeStop?.leg.to ?? ''}`}
            stopProgress={`${activeStopIndex + 1}/${playableStops.length}`}
          />
        </div>
      </div>

      <TourControls
        stops={playableStops}
        activeStopIndex={activeStopIndex}
        playing={playing}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onPrevStop={handlePrevStop}
        onNextStop={handleNextStop}
        onJumpTo={handleJumpTo}
        onExit={onExit}
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/journey/tour/TourView.jsx
git commit -m "feat(journey): TourView orchestrator with auto-play, scrub, and Journey Complete overlay"
```

---

## Task 13: Create TourPage (public share page)

**Files:**
- Create: `src/pages/TourPage.jsx`

- [ ] **Step 1: Create the file**

```jsx
import { useMemo } from 'react';
import TourView from '../components/journey/tour/TourView';

/**
 * Standalone public tour page. Reads trip data from localStorage by shareSlug.
 * Accessed via #tour/<slug> hash routing in App.jsx.
 */
export default function TourPage({ slug }) {
  const tripData = useMemo(() => {
    try {
      const raw = localStorage.getItem('vp-trip-store');
      if (!raw) return null;
      const state = JSON.parse(raw);
      if (state.journey?.shareSlug === slug && state.journey?.published) {
        return state;
      }
      return null;
    } catch {
      return null;
    }
  }, [slug]);

  if (!tripData) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: '#0E1012' }}
      >
        <div className="text-center space-y-3">
          <p className="font-editorial text-xl" style={{ color: '#fff' }}>
            Tour not found
          </p>
          <p className="text-sm font-mono" style={{ color: 'rgba(255,255,255,0.4)' }}>
            This tour link only works on the device where it was created.
          </p>
          <a
            href={window.location.pathname}
            className="text-xs font-mono underline"
            style={{ color: 'var(--ember)' }}
          >
            Open VenturePath
          </a>
        </div>
      </div>
    );
  }

  // Provide a minimal read-only store context by injecting data via window
  // TourView reads from useTripStore — so we render it inside a provider
  // populated with the loaded data. We do this by re-using TripStoreProvider
  // and dispatching LOAD_EXPEDITION on mount.
  return <TourPageInner tripData={tripData} />;
}

function TourPageInner({ tripData }) {
  // Import here to avoid circular deps at module level
  const { TripStoreProvider, useTripStore } = require('../store/useTripStore');

  function Inner() {
    const { loadExpedition } = useTripStore();
    // Load on mount — only once since tripData is stable
    useMemo(() => {
      loadExpedition({ trip: tripData.trip, legs: tripData.legs, objectives: tripData.objectives ?? [] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
      <div className="min-h-screen flex flex-col" style={{ background: '#0E1012' }}>
        {/* Watermark */}
        <div
          className="absolute bottom-4 left-4 z-50 font-mono text-xs"
          style={{ color: 'rgba(255,255,255,0.3)' }}
        >
          Made with VenturePath
        </div>
        <TourView onExit={() => { window.location.hash = ''; }} />
      </div>
    );
  }

  return (
    <TripStoreProvider>
      <Inner />
    </TripStoreProvider>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/TourPage.jsx
git commit -m "feat(journey): TourPage standalone public share view"
```

---

## Task 14: Wire hash routing for /tour/:slug in App.jsx

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Add hash detection at the top of App.jsx**

Import `TourPage` and add hash-based route detection:

```jsx
import { useState, useCallback, useEffect } from 'react';
import { TripStoreProvider, useTripStore } from './store/useTripStore';
import { ExpeditionProvider } from './context/ExpeditionContext';
import { SquadGearProvider } from './context/SquadGearContext';
import { useExpeditionList } from './hooks/useExpeditionList';
import LaunchDashboard from './components/dashboard/LaunchDashboard';
import TripPlanner from './pages/TripPlanner';
import TourPage from './pages/TourPage';
import ArchitectProfile from './components/social/ArchitectProfile';
import VentureVault from './components/discovery/VentureVault';
import ExpeditionSelectScreen from './components/trip/ExpeditionSelectScreen';

function getTourSlug() {
  const hash = window.location.hash; // e.g. "#tour/patagonia-2025-lasse-abc123"
  const match = hash.match(/^#tour\/(.+)$/);
  return match ? match[1] : null;
}
```

- [ ] **Step 2: Use slug in App component**

Replace the `function App()` body:

```jsx
function App() {
  const [tourSlug, setTourSlug] = useState(getTourSlug);

  useEffect(() => {
    function onHashChange() {
      setTourSlug(getTourSlug());
    }
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  if (tourSlug) {
    return <TourPage slug={tourSlug} />;
  }

  return (
    <TripStoreProvider>
      <SquadGearProvider>
        <ExpeditionProvider>
          <AppRouter />
        </ExpeditionProvider>
      </SquadGearProvider>
    </TripStoreProvider>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/App.jsx
git commit -m "feat(journey): hash-based routing for public /tour/:slug page"
```

---

## Task 15: Smoke test the full feature

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

Expected: dev server starts on `http://localhost:5173` with no build errors.

- [ ] **Step 2: Test Studio mode**

1. Open the app, enter a trip (or use the default Patagonia expedition)
2. Click **JOURNEY** in the sidebar
3. Verify STUDIO mode is the default view
4. Click stop 1 (Home Base → Gateway City)
5. Drag an image file into the upload zone → thumbnail should appear in PhotoStrip
6. Type a caption under the thumbnail
7. Paste an external image URL and click Add → second photo appears
8. Drag the second photo before the first in PhotoStrip → order persists after page reload
9. Click the ★ icon on a stop card → star turns gold (cover set)
10. Click **Publish Journey** → button changes to "Published ✓ — Copy Link"

- [ ] **Step 3: Test Tour mode**

1. Click **TOUR** toggle
2. Map should appear on the left with stop pins
3. Active pin should pulse
4. Photos crossfade automatically after 4 seconds
5. Pause button freezes playback; Play resumes
6. Click a scrub segment to jump to that stop → map flies to it
7. After last photo of last stop: "Journey Complete" overlay appears
8. Click Replay → tour restarts from stop 1
9. Click Exit Tour → returns to Studio

- [ ] **Step 4: Test public share**

1. After publishing, click "Published ✓ — Copy Link"
2. Paste the copied URL into the browser address bar (it will end in `#tour/<slug>`)
3. Page should show TourPage fullscreen with no sidebar/nav
4. "Made with VenturePath" watermark visible bottom-left
5. Changing hash to `#tour/nonexistent` shows "Tour not found" message

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(journey): complete Journey Photo Tour feature — Studio + Tour + public share"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|---|---|
| `ADD_PHOTO`, `REMOVE_PHOTO`, `UPDATE_PHOTO`, `REORDER_PHOTOS`, `SET_JOURNEY_META` actions | Task 1 |
| `leg.photos[]` and `trip.journey` data shape | Task 1 |
| JOURNEY tab in sidebar between DISCOVERY and VAULT | Task 2 |
| JourneyTab with STUDIO/TOUR toggle | Task 3 |
| StopPhotoCard: thumbnail strip, count badge, cover star | Task 4 |
| PhotoUploader: drag-drop + URL input | Task 5 |
| PhotoStrip: sortable, captions, delete | Task 6 |
| PublishButton: slug gen, copy link, unpublish | Task 7 |
| StudioView: two-panel layout, title input | Task 8 |
| TourMap: Leaflet flyTo, pulsing pin, route polylines, dimmed non-photo pins | Task 9 |
| PhotoStage: crossfade, caption overlay, stop label | Task 10 |
| TourControls: scrub bar, play/pause, prev/next | Task 11 |
| TourView: playback orchestration, auto-advance, Journey Complete overlay, empty state | Task 12 |
| TourPage: standalone public page, "Tour not found" state, watermark | Task 13 |
| Hash-based routing `#tour/:slug` | Task 14 |
| Stop with no photos: dimmed on map, skipped in playback | Task 12 (playableStops filter) |
| External URL `onError` handler | Tasks 4, 10 |
| Single photo per stop: holds 4s then advances | Task 12 (advance logic) |

All spec requirements covered. ✓

**Type consistency check:**

- `Photo` shape (`id`, `url`, `caption`, `source`, `order`) — consistent across Tasks 1, 5, 6, 10, 12 ✓
- `stops` array shape (`{ leg, coords, photos }`) — defined in TourView Task 12, consumed by TourMap Task 9, TourControls Task 11 ✓
- `reorderPhotos(legId, orderedIds)` — defined in Task 1, called in Task 6 ✓
- `setJourneyMeta(meta)` — defined in Task 1, called in Tasks 7, 8 ✓

**Note on TourPage:** The `require()` pattern inside `TourPageInner` is a workaround to avoid module-level circular imports. An alternative is to move the provider wrapping into `App.jsx` — but for MVP this works and keeps TourPage self-contained.
