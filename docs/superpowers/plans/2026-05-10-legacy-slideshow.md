# Legacy Slideshow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the minimal `JourneySlideshow.jsx` with a split-screen Legacy HUD that interleaves photo, fact, stat, and breadcrumb slides with a rotating Leaflet mini-map.

**Architecture:** Pure logic (`slideDeck.js`, `bearingEngine.js`) is built and tested first, then React components layer on top. `useSlideDeck` hook wires store → pure logic → playback state. `LegacySlideshow` composes the split-screen shell. `JourneyTab` swaps the old component for the new one.

**Tech Stack:** Vitest + jsdom (existing), React + react-leaflet (existing), Tailwind + CSS vars (existing), `enrichmentCache.js` (Task 4 from Subsystem A), `sentinelBus` (existing).

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Create | `src/utils/slideDeck.js` | Pure fn: photos + breadcrumbs + legs → Slide[] |
| Create | `src/utils/slideDeck.test.js` | Unit tests for slide deck builder |
| Create | `src/utils/bearingEngine.js` | Derive compass bearing per photo |
| Create | `src/utils/bearingEngine.test.js` | Unit tests for bearing derivation |
| Create | `src/components/journey/legacy/useSlideDeck.js` | Hook: store → slides + playback state |
| Create | `src/components/journey/legacy/SlideRenderer.jsx` | Renders one slide by type |
| Create | `src/components/journey/legacy/SlideshowMiniMap.jsx` | Rotating Leaflet mini-map |
| Create | `src/components/journey/legacy/SlideshowControls.jsx` | Prev/next/play/pause + keyboard |
| Create | `src/components/journey/legacy/LegacySlideshow.jsx` | Split-screen shell |
| Modify | `src/components/journey/JourneyTab.jsx` | Swap JourneySlideshow → LegacySlideshow |

---

## Task 1: Build `bearingEngine.js`

**Files:**
- Create: `src/utils/bearingEngine.js`
- Create: `src/utils/bearingEngine.test.js`

- [ ] **Step 1: Write failing tests**

Create `src/utils/bearingEngine.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { computeBearing, deriveBearing } from './bearingEngine';

describe('computeBearing', () => {
  it('returns 0 for due north', () => {
    const from = { lat: 0, lng: 0 };
    const to   = { lat: 1, lng: 0 };
    expect(computeBearing(from, to)).toBeCloseTo(0, 0);
  });

  it('returns 90 for due east', () => {
    const from = { lat: 0, lng: 0 };
    const to   = { lat: 0, lng: 1 };
    expect(computeBearing(from, to)).toBeCloseTo(90, 0);
  });

  it('returns 180 for due south', () => {
    const from = { lat: 1, lng: 0 };
    const to   = { lat: 0, lng: 0 };
    expect(computeBearing(from, to)).toBeCloseTo(180, 0);
  });

  it('returns 270 for due west', () => {
    const from = { lat: 0, lng: 1 };
    const to   = { lat: 0, lng: 0 };
    expect(computeBearing(from, to)).toBeCloseTo(270, 0);
  });
});

describe('deriveBearing', () => {
  it('returns photo.bearing when present', () => {
    const photo = { bearing: 135, timestamp: '2026-01-01T10:00:00Z', coords: [0, 0] };
    expect(deriveBearing(photo, [])).toBe(135);
  });

  it('derives bearing from bracketing breadcrumbs when no photo.bearing', () => {
    const photo = { timestamp: '2026-01-01T10:30:00Z', coords: [0, 0] };
    const breadcrumbs = [
      { timestamp: '2026-01-01T10:00:00Z', lat: 0, lng: 0 },
      { timestamp: '2026-01-01T11:00:00Z', lat: 1, lng: 0 },
    ];
    const bearing = deriveBearing(photo, breadcrumbs);
    expect(bearing).toBeCloseTo(0, 0); // heading north
  });

  it('returns 0 when no bearing and no breadcrumbs', () => {
    const photo = { timestamp: '2026-01-01T10:00:00Z', coords: [0, 0] };
    expect(deriveBearing(photo, [])).toBe(0);
  });
});
```

- [ ] **Step 2: Run to confirm fail**

```bash
cd C:/Users/lasse/Desktop/venturepath
npx vitest run src/utils/bearingEngine.test.js
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `bearingEngine.js`**

Create `src/utils/bearingEngine.js`:

```js
const DEG = Math.PI / 180;

export function computeBearing(from, to) {
  const lat1 = from.lat * DEG;
  const lat2 = to.lat * DEG;
  const dLng = (to.lng - from.lng) * DEG;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (Math.atan2(y, x) / DEG + 360) % 360;
}

// Binary search: find index i such that breadcrumbs[i].timestamp <= ts < breadcrumbs[i+1].timestamp
function findBracket(breadcrumbs, ts) {
  let lo = 0;
  let hi = breadcrumbs.length - 2;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (breadcrumbs[mid].timestamp <= ts && breadcrumbs[mid + 1].timestamp > ts) return mid;
    if (breadcrumbs[mid].timestamp < ts) lo = mid + 1;
    else hi = mid - 1;
  }
  return -1;
}

export function deriveBearing(photo, breadcrumbs) {
  if (photo.bearing != null) return photo.bearing;

  if (breadcrumbs.length >= 2 && photo.timestamp) {
    const sorted = [...breadcrumbs].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    const i = findBracket(sorted, photo.timestamp);
    if (i >= 0) {
      return computeBearing(
        { lat: sorted[i].lat,     lng: sorted[i].lng },
        { lat: sorted[i + 1].lat, lng: sorted[i + 1].lng },
      );
    }
  }

  return 0;
}
```

- [ ] **Step 4: Run tests — all pass**

```bash
npx vitest run src/utils/bearingEngine.test.js
```

Expected: All 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/bearingEngine.js src/utils/bearingEngine.test.js
git commit -m "feat(slideshow): bearingEngine — EXIF/breadcrumb/north-up bearing derivation"
```

---

## Task 2: Build `slideDeck.js`

**Files:**
- Create: `src/utils/slideDeck.js`
- Create: `src/utils/slideDeck.test.js`

- [ ] **Step 1: Write failing tests**

Create `src/utils/slideDeck.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { buildSlideDeck } from './slideDeck';

const makePhoto = (id, timestamp, coords = [48.86, 2.35]) => ({
  id, url: `https://example.com/${id}.jpg`, timestamp, coords,
});

const makeBreadcrumb = (timestamp, lat, lng) => ({ timestamp, lat, lng });

describe('buildSlideDeck', () => {
  it('returns empty array for no photos', () => {
    expect(buildSlideDeck([], [], [])).toEqual([]);
  });

  it('wraps each photo in a photo slide', () => {
    const photos = [makePhoto('p1', '2026-01-01T10:00:00Z')];
    const slides = buildSlideDeck(photos, [], []);
    expect(slides[0]).toMatchObject({ type: 'photo', photo: photos[0] });
  });

  it('inserts a fact slide after every 5 photo slides', () => {
    const photos = Array.from({ length: 6 }, (_, i) =>
      makePhoto(`p${i}`, `2026-01-01T10:0${i}:00Z`)
    );
    const slides = buildSlideDeck(photos, [], []);
    const factSlides = slides.filter(s => s.type === 'fact');
    expect(factSlides).toHaveLength(1);
    // fact slide is at index 5 (after 5 photo slides)
    expect(slides[5].type).toBe('fact');
  });

  it('inserts a breadcrumb slide when photo gap exceeds 120 minutes', () => {
    const photos = [
      makePhoto('p1', '2026-01-01T08:00:00Z'),
      makePhoto('p2', '2026-01-01T11:00:00Z'), // 3hr gap
    ];
    const breadcrumbs = [
      makeBreadcrumb('2026-01-01T09:00:00Z', 48.87, 2.36),
    ];
    const slides = buildSlideDeck(photos, breadcrumbs, []);
    const breadcrumbSlides = slides.filter(s => s.type === 'breadcrumb');
    expect(breadcrumbSlides).toHaveLength(1);
    expect(breadcrumbSlides[0].gap_minutes).toBeGreaterThan(120);
  });

  it('does NOT insert breadcrumb slide when gap is under 120 minutes', () => {
    const photos = [
      makePhoto('p1', '2026-01-01T10:00:00Z'),
      makePhoto('p2', '2026-01-01T11:00:00Z'), // 60min gap
    ];
    const slides = buildSlideDeck(photos, [], []);
    expect(slides.filter(s => s.type === 'breadcrumb')).toHaveLength(0);
  });

  it('sorts photos by timestamp before building', () => {
    const photos = [
      makePhoto('p2', '2026-01-01T11:00:00Z'),
      makePhoto('p1', '2026-01-01T10:00:00Z'),
    ];
    const slides = buildSlideDeck(photos, [], []);
    const photoSlides = slides.filter(s => s.type === 'photo');
    expect(photoSlides[0].photo.id).toBe('p1');
    expect(photoSlides[1].photo.id).toBe('p2');
  });

  it('each photo slide has a bearing field', () => {
    const photos = [makePhoto('p1', '2026-01-01T10:00:00Z')];
    const slides = buildSlideDeck(photos, [], []);
    expect(slides[0]).toHaveProperty('bearing');
    expect(typeof slides[0].bearing).toBe('number');
  });
});
```

- [ ] **Step 2: Run to confirm fail**

```bash
npx vitest run src/utils/slideDeck.test.js
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `slideDeck.js`**

Create `src/utils/slideDeck.js`:

```js
import { deriveBearing } from './bearingEngine';

const GAP_THRESHOLD_MS  = 120 * 60 * 1000; // 2 hours
const FACT_EVERY        = 5;               // insert fact slide after every 5 photo slides

function gapMinutes(a, b) {
  return (new Date(b.timestamp) - new Date(a.timestamp)) / 60000;
}

function breadcrumbsInWindow(breadcrumbs, fromTs, toTs) {
  return breadcrumbs.filter(b => b.timestamp > fromTs && b.timestamp < toTs);
}

function makeBreadcrumbSlide(photoA, photoB, breadcrumbs) {
  const inWindow = breadcrumbsInWindow(breadcrumbs, photoA.timestamp, photoB.timestamp);
  const landmarks = inWindow.slice(0, 3).map(b => b.name ?? `${b.lat.toFixed(3)}, ${b.lng.toFixed(3)}`);
  return {
    type:        'breadcrumb',
    landmarks,
    gap_minutes: Math.round(gapMinutes(photoA, photoB)),
    from_time:   photoA.timestamp,
    to_time:     photoB.timestamp,
    coords:      inWindow[0] ? { lat: inWindow[0].lat, lng: inWindow[0].lng } : null,
  };
}

function makeFactSlide(photo, photoIndex) {
  const coords = photo.coords
    ? { lat: photo.coords[0], lng: photo.coords[1] }
    : null;
  return {
    type:      'fact',
    poi_id:    `fact_${photoIndex}`,
    poi_name:  photo.location ?? 'Nearby Point of Interest',
    coords,
    legIndex:  0,
  };
}

export function buildSlideDeck(photos, breadcrumbs = [], _legs = []) {
  if (!photos.length) return [];

  const sorted = [...photos].sort((a, b) =>
    new Date(a.timestamp) - new Date(b.timestamp)
  );

  const slides = [];
  let photoCount = 0;

  for (let i = 0; i < sorted.length; i++) {
    const photo = sorted[i];
    const prev  = sorted[i - 1];

    // Breadcrumb gap slide
    if (prev) {
      const ms = new Date(photo.timestamp) - new Date(prev.timestamp);
      if (ms > GAP_THRESHOLD_MS) {
        slides.push(makeBreadcrumbSlide(prev, photo, breadcrumbs));
      }
    }

    // Photo slide
    slides.push({
      type:    'photo',
      photo,
      bearing: deriveBearing(photo, breadcrumbs),
      coords:  photo.coords ? { lat: photo.coords[0], lng: photo.coords[1] } : null,
    });
    photoCount++;

    // Fact slide every FACT_EVERY photos
    if (photoCount % FACT_EVERY === 0) {
      slides.push(makeFactSlide(photo, photoCount));
    }
  }

  return slides;
}
```

- [ ] **Step 4: Run tests — all pass**

```bash
npx vitest run src/utils/slideDeck.test.js
```

Expected: All 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/slideDeck.js src/utils/slideDeck.test.js
git commit -m "feat(slideshow): slideDeck — photo/fact/breadcrumb/stat slide sequence builder"
```

---

## Task 3: Build `useSlideDeck.js` hook

**Files:**
- Create: `src/components/journey/legacy/useSlideDeck.js`

- [ ] **Step 1: Create the legacy directory and hook**

```bash
mkdir -p C:/Users/lasse/Desktop/venturepath/src/components/journey/legacy
```

Create `src/components/journey/legacy/useSlideDeck.js`:

```js
import { useState, useEffect, useCallback } from 'react';
import { useTripStore } from '../../../store/useTripStore';
import { buildSlideDeck } from '../../../utils/slideDeck';
import sentinelBus from '../../../utils/sentinelBus';
import { PHOTO_ACTIVE } from '../../../utils/sentinelBusEvents';

const AUTOPLAY_MS = 4000;

export function useSlideDeck() {
  const { journeyData, legs } = useTripStore();
  const photos      = journeyData?.photos      ?? [];
  const breadcrumbs = journeyData?.breadcrumbs ?? [];

  const slides = buildSlideDeck(photos, breadcrumbs, legs);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [playing, setPlaying] = useState(false);

  const clamp = (i) => Math.max(0, Math.min(i, slides.length - 1));

  const goTo = useCallback((i) => {
    const idx = clamp(i);
    setCurrentIndex(idx);
    const slide = slides[idx];
    if (slide?.type === 'photo') {
      sentinelBus.emit(PHOTO_ACTIVE, { photo: slide.photo });
    }
  }, [slides]);

  const goNext = useCallback(() => goTo(currentIndex + 1), [currentIndex, goTo]);
  const goPrev = useCallback(() => goTo(currentIndex - 1), [currentIndex, goTo]);

  // Auto-advance
  useEffect(() => {
    if (!playing || slides.length === 0) return;
    const id = setInterval(() => {
      setCurrentIndex(i => {
        const next = i + 1 >= slides.length ? 0 : i + 1;
        const slide = slides[next];
        if (slide?.type === 'photo') sentinelBus.emit(PHOTO_ACTIVE, { photo: slide.photo });
        return next;
      });
    }, AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [playing, slides]);

  // Reset index when slide deck changes (new photos added)
  useEffect(() => {
    setCurrentIndex(0);
  }, [slides.length]);

  const currentSlide = slides[currentIndex] ?? null;

  return { slides, currentIndex, currentSlide, goNext, goPrev, goTo, playing, setPlaying };
}
```

- [ ] **Step 2: Build check**

```bash
cd C:/Users/lasse/Desktop/venturepath
npx vite build 2>&1 | tail -5
```

Expected: builds successfully (no new errors).

- [ ] **Step 3: Commit**

```bash
git add src/components/journey/legacy/useSlideDeck.js
git commit -m "feat(slideshow): useSlideDeck hook — store→slides+playback state"
```

---

## Task 4: Build `SlideshowControls.jsx`

**Files:**
- Create: `src/components/journey/legacy/SlideshowControls.jsx`

- [ ] **Step 1: Create the component**

Create `src/components/journey/legacy/SlideshowControls.jsx`:

```jsx
import { useEffect } from 'react';

const TYPE_LABELS = {
  photo:       'PHOTO',
  fact:        'FACT',
  stat:        'STAT',
  breadcrumb:  'BREADCRUMB',
};

export default function SlideshowControls({ currentIndex, total, slideType, playing, onPrev, onNext, onTogglePlay }) {
  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'ArrowLeft')  { e.preventDefault(); onPrev(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); onNext(); }
      if (e.key === ' ')          { e.preventDefault(); onTogglePlay(); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onPrev, onNext, onTogglePlay]);

  return (
    <div
      className="flex items-center justify-between px-4 py-2 shrink-0"
      style={{ background: '#0c0e10', borderTop: '1px solid #1e2328' }}
    >
      <button
        onClick={onPrev}
        aria-label="Previous slide"
        className="w-8 h-8 flex items-center justify-center rounded font-mono text-lg hover:bg-white/10 transition-colors"
        style={{ color: '#D9C5B2' }}
      >‹</button>

      <button
        onClick={onTogglePlay}
        aria-label={playing ? 'Pause' : 'Play'}
        className="px-4 py-1 rounded font-mono text-xs tracking-widest uppercase transition-colors hover:bg-white/10"
        style={{ color: '#E67E22', border: '1px solid #E67E22' }}
      >
        {playing ? '‖ PAUSE' : '▶ PLAY'}
      </button>

      <button
        onClick={onNext}
        aria-label="Next slide"
        className="w-8 h-8 flex items-center justify-center rounded font-mono text-lg hover:bg-white/10 transition-colors"
        style={{ color: '#D9C5B2' }}
      >›</button>

      <div className="flex items-center gap-3 ml-4">
        <span className="font-mono text-xs" style={{ color: '#D9C5B2' }}>
          {total > 0 ? `${currentIndex + 1} / ${total}` : '— / —'}
        </span>
        <span
          className="font-mono text-xs tracking-widest px-2 py-0.5 rounded"
          style={{ background: '#1e2328', color: '#E67E22' }}
        >
          {TYPE_LABELS[slideType] ?? 'SLIDE'}
        </span>
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
git add src/components/journey/legacy/SlideshowControls.jsx
git commit -m "feat(slideshow): SlideshowControls — prev/next/play/pause + keyboard shortcuts"
```

---

## Task 5: Build `SlideshowMiniMap.jsx`

**Files:**
- Create: `src/components/journey/legacy/SlideshowMiniMap.jsx`

- [ ] **Step 1: Create the component**

Create `src/components/journey/legacy/SlideshowMiniMap.jsx`:

```jsx
import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;

function makeEmberMarker() {
  return L.divIcon({
    className: '',
    iconAnchor: [10, 10],
    html: `<div style="
      width:20px;height:20px;border-radius:50%;
      background:#E67E22;border:2px solid #fff;
      box-shadow:0 0 0 4px rgba(230,126,34,0.3);
    "></div>`,
  });
}

function MapController({ coords, bearing }) {
  const map = useMap();
  const markerRef = useRef(null);

  useEffect(() => {
    if (!coords) return;
    map.flyTo([coords.lat, coords.lng], map.getZoom(), { duration: 0.5 });

    if (markerRef.current) {
      markerRef.current.setLatLng([coords.lat, coords.lng]);
    } else {
      markerRef.current = L.marker([coords.lat, coords.lng], {
        icon: makeEmberMarker(),
        zIndexOffset: 1000,
      }).addTo(map);
    }
  }, [coords, map]);

  return null;
}

export default function SlideshowMiniMap({ coords, bearing }) {
  const defaultCenter = coords ? [coords.lat, coords.lng] : [48.86, 2.35];

  return (
    <div
      className="relative w-full h-full overflow-hidden rounded-r"
      style={{
        transition: 'transform 0.5s ease',
        transform: `rotate(${bearing ?? 0}deg)`,
      }}
    >
      <MapContainer
        center={defaultCenter}
        zoom={13}
        style={{ width: '100%', height: '100%' }}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution=""
        />
        <MapController coords={coords} bearing={bearing} />
      </MapContainer>

      {/* North indicator — counter-rotates to stay upright */}
      <div
        className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full font-mono text-xs font-bold z-[1000]"
        style={{
          background: '#0E1012',
          color: '#E67E22',
          border: '1px solid #E67E22',
          transform: `rotate(${-(bearing ?? 0)}deg)`,
          transition: 'transform 0.5s ease',
        }}
      >N</div>
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
git add src/components/journey/legacy/SlideshowMiniMap.jsx
git commit -m "feat(slideshow): SlideshowMiniMap — rotating Leaflet mini-map with Ember marker"
```

---

## Task 6: Build `SlideRenderer.jsx`

**Files:**
- Create: `src/components/journey/legacy/SlideRenderer.jsx`

- [ ] **Step 1: Create the component**

Create `src/components/journey/legacy/SlideRenderer.jsx`:

```jsx
import { useState, useEffect } from 'react';
import StatOverlay from '../StatOverlay';
import * as enrichmentCache from '../../../utils/enrichmentCache';

// ── PhotoSlide ────────────────────────────────────────────────────────────────
function PhotoSlide({ slide }) {
  return (
    <div className="relative w-full h-full bg-black">
      <img
        src={slide.photo.url}
        alt=""
        className="w-full h-full object-cover"
      />
      <StatOverlay photo={slide.photo} />
    </div>
  );
}

// ── FactSlide ─────────────────────────────────────────────────────────────────
function FactSlide({ slide }) {
  const [enrichment, setEnrichment] = useState(null);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    setLoading(true);
    enrichmentCache.get(slide.poi_id).then(data => {
      setEnrichment(data);
      setLoading(false);
    });
  }, [slide.poi_id]);

  return (
    <div
      className="w-full h-full flex flex-col justify-center px-8 py-6"
      style={{ background: '#0E1012' }}
    >
      <div className="font-mono text-xs tracking-widest mb-3" style={{ color: '#E67E22' }}>
        ── HISTORICAL CONTEXT ──────────────────
      </div>

      {loading ? (
        <div className="space-y-2">
          <div className="h-4 rounded animate-pulse" style={{ background: '#1e2328', width: '70%' }} />
          <div className="h-4 rounded animate-pulse" style={{ background: '#1e2328', width: '90%' }} />
          <div className="h-4 rounded animate-pulse" style={{ background: '#1e2328', width: '60%' }} />
        </div>
      ) : enrichment ? (
        <div className="flex gap-6">
          {enrichment.image_url && (
            <img
              src={enrichment.image_url}
              alt=""
              className="w-24 h-24 object-cover rounded shrink-0"
              style={{ border: '1px solid #1e2328' }}
            />
          )}
          <div className="flex flex-col gap-2">
            <div style={{ fontFamily: 'Playfair Display, serif', color: '#fff', fontSize: '1.1rem', fontWeight: 600 }}>
              {slide.poi_name}
            </div>
            <div className="font-mono text-xs px-2 py-0.5 rounded self-start" style={{ background: '#1e2328', color: '#E67E22' }}>
              {enrichment.instance_of}
            </div>
            <div className="text-sm leading-relaxed" style={{ color: '#D9C5B2' }}>
              {enrichment.description}
            </div>
          </div>
        </div>
      ) : (
        <div className="font-mono text-sm" style={{ color: '#D9C5B2' }}>
          {slide.poi_name} — no historical data available.
        </div>
      )}
    </div>
  );
}

// ── StatSlide ─────────────────────────────────────────────────────────────────
function StatSlide({ slide }) {
  const rows = [
    { label: 'LEG',      value: slide.leg_label   ?? '—' },
    { label: 'DISTANCE', value: slide.distance_km != null ? `${slide.distance_km} km` : '—' },
    { label: 'ASCENT',   value: slide.ascent_m    != null ? `${slide.ascent_m} m`    : '—' },
    { label: 'PHOTOS',   value: slide.photo_count != null ? String(slide.photo_count) : '—' },
  ];

  return (
    <div
      className="w-full h-full flex flex-col justify-center px-8 py-6 font-mono"
      style={{ background: '#0E1012' }}
    >
      <div className="text-xs tracking-widest mb-4" style={{ color: '#E67E22' }}>
        ── LEG COMPLETE ────────────────────────
      </div>
      <div className="space-y-3">
        {rows.map(r => (
          <div key={r.label} className="flex items-baseline gap-4">
            <span className="text-xs tracking-widest w-20 shrink-0" style={{ color: '#E67E22' }}>{r.label}</span>
            <span className="text-lg font-bold" style={{ color: '#fff' }}>{r.value}</span>
          </div>
        ))}
      </div>
      <div className="text-xs tracking-widest mt-4" style={{ color: '#1e2328' }}>
        ────────────────────────────────────────
      </div>
    </div>
  );
}

// ── BreadcrumbSlide ───────────────────────────────────────────────────────────
function BreadcrumbSlide({ slide }) {
  return (
    <div
      className="w-full h-full flex flex-col justify-center px-8 py-6 font-mono"
      style={{ background: '#0E1012' }}
    >
      <div className="text-xs tracking-widest mb-4" style={{ color: '#E67E22' }}>
        ── YOU PASSED THROUGH HERE ─────────────
      </div>
      <div className="space-y-2 mb-4">
        {slide.landmarks.length > 0 ? slide.landmarks.map((l, i) => (
          <div key={i} className="flex items-center gap-3">
            <span style={{ color: '#E67E22' }}>▸</span>
            <span className="text-sm" style={{ color: '#D9C5B2' }}>{l}</span>
          </div>
        )) : (
          <div className="text-sm" style={{ color: '#D9C5B2' }}>No landmarks recorded in this window.</div>
        )}
      </div>
      <div className="text-xs" style={{ color: '#64748b' }}>
        GAP: {slide.gap_minutes}m undocumented
      </div>
    </div>
  );
}

// ── SlideRenderer (dispatcher) ────────────────────────────────────────────────
export default function SlideRenderer({ slide }) {
  if (!slide) return null;
  switch (slide.type) {
    case 'photo':       return <PhotoSlide slide={slide} />;
    case 'fact':        return <FactSlide  slide={slide} />;
    case 'stat':        return <StatSlide  slide={slide} />;
    case 'breadcrumb':  return <BreadcrumbSlide slide={slide} />;
    default:            return null;
  }
}
```

- [ ] **Step 2: Build check**

```bash
npx vite build 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
git add src/components/journey/legacy/SlideRenderer.jsx
git commit -m "feat(slideshow): SlideRenderer — photo/fact/stat/breadcrumb slide types"
```

---

## Task 7: Build `LegacySlideshow.jsx` + wire `JourneyTab.jsx`

**Files:**
- Create: `src/components/journey/legacy/LegacySlideshow.jsx`
- Modify: `src/components/journey/JourneyTab.jsx`

- [ ] **Step 1: Create `LegacySlideshow.jsx`**

Create `src/components/journey/legacy/LegacySlideshow.jsx`:

```jsx
import { useSlideDeck } from './useSlideDeck';
import SlideRenderer from './SlideRenderer';
import SlideshowMiniMap from './SlideshowMiniMap';
import SlideshowControls from './SlideshowControls';

export default function LegacySlideshow() {
  const { slides, currentIndex, currentSlide, goNext, goPrev, playing, setPlaying } = useSlideDeck();

  if (slides.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-3 rounded border"
        style={{ height: 320, background: '#0E1012', borderColor: '#1e2328' }}
      >
        <div className="font-mono text-xs tracking-widest" style={{ color: '#E67E22' }}>
          ── LEGACY ARCHIVE EMPTY ──
        </div>
        <div className="text-sm" style={{ color: '#D9C5B2' }}>
          No photos in this expedition yet.
        </div>
        <div className="font-mono text-xs" style={{ color: '#64748b' }}>
          Add photos in STUDIO to generate the Legacy Slideshow.
        </div>
      </div>
    );
  }

  const coords  = currentSlide?.coords  ?? null;
  const bearing = currentSlide?.bearing ?? 0;

  return (
    <div
      className="flex flex-col rounded overflow-hidden border"
      style={{ background: '#0E1012', borderColor: '#1e2328', height: 400 }}
    >
      {/* Split-screen: slide left, map right */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: slide content ~60% */}
        <div className="flex-1 relative overflow-hidden">
          <SlideRenderer slide={currentSlide} />
        </div>

        {/* Right: rotating mini-map ~40% */}
        <div className="w-2/5 shrink-0 border-l" style={{ borderColor: '#1e2328' }}>
          <SlideshowMiniMap coords={coords} bearing={bearing} />
        </div>
      </div>

      {/* Controls bar */}
      <SlideshowControls
        currentIndex={currentIndex}
        total={slides.length}
        slideType={currentSlide?.type}
        playing={playing}
        onPrev={goPrev}
        onNext={goNext}
        onTogglePlay={() => setPlaying(p => !p)}
      />
    </div>
  );
}
```

- [ ] **Step 2: Modify `JourneyTab.jsx`**

In `src/components/journey/JourneyTab.jsx`:

Replace:
```jsx
import JourneySlideshow from './JourneySlideshow';
```
With:
```jsx
import LegacySlideshow from './legacy/LegacySlideshow';
```

Replace:
```jsx
<JourneySlideshow photos={photos} />
```
With:
```jsx
<LegacySlideshow />
```

Remove the `photos` and `breadcrumbs` destructures from `journeyData` if they are no longer used elsewhere in the file (check first — `breadcrumbs` is also passed to `JourneyMap3D`, so keep that one).

- [ ] **Step 3: Build check**

```bash
npx vite build 2>&1 | tail -5
```

Expected: clean build, no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/journey/legacy/LegacySlideshow.jsx src/components/journey/JourneyTab.jsx
git commit -m "feat(slideshow): LegacySlideshow shell + wire into JourneyTab"
```

---

## Task 8: Full test suite + final verification

- [ ] **Step 1: Run all tests**

```bash
cd C:/Users/lasse/Desktop/venturepath
npx vitest run 2>&1
```

Expected: All existing tests pass + new bearingEngine + slideDeck tests pass. Zero failures.

- [ ] **Step 2: Build check**

```bash
npx vite build 2>&1 | tail -10
```

Expected: Clean build.

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat(slideshow): Legacy Slideshow — subsystem B complete"
```
