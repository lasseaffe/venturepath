# SwipeDeck Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a reusable `SwipeDeck` component with three card modes (expedition, spot, filtered) wired to contextual right-swipe actions and a preference-learning soft-pass system.

**Architecture:** A single `SwipeDeck` component ports the gesture physics from the existing `swipe-card.tsx`, renders mode-specific card faces via three sub-components, and routes right-swipe actions based on `mode` × squad/trip context. A `useSwipePreferences` hook persists swipe history to localStorage and exposes an affinity score used by entry points to pre-sort cards.

**Tech Stack:** React, TypeScript, framer-motion (already installed), localStorage, existing `ExpeditionContext` + `useTripStore` stores.

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Create | `src/hooks/useSwipePreferences.ts` | Persist swipe history, compute affinity scores |
| Create | `src/components/swipe/cards/types.ts` | Shared card data type definitions |
| Create | `src/components/swipe/cards/ExpeditionCard.tsx` | Full-trip card face |
| Create | `src/components/swipe/cards/SpotCard.tsx` | POI/stop card face |
| Create | `src/components/swipe/cards/FilteredResultCard.tsx` | Filtered result card face (extends SpotCard) |
| Create | `src/components/swipe/SwipeDeck.tsx` | Main deck: gesture engine + action router |
| Modify | `src/store/useTripStore.jsx` | Add `APPEND_OBJECTIVE_ITEM` action |
| Modify | `src/components/discovery/VentureVault.jsx` | Add "Swipe Expeditions" entry point |
| Modify | `src/components/nearby/NearbyDrawer.jsx` | Add "Swipe Results" entry point |
| Modify | `src/components/discovery/MustSee.jsx` | Add "Swipe Results" entry point |

---

## Task 1: `useSwipePreferences` hook

**Files:**
- Create: `src/hooks/useSwipePreferences.ts`

- [ ] **Step 1: Create the hook**

```typescript
// src/hooks/useSwipePreferences.ts
const STORAGE_KEY = 'vp-swipe-prefs';
const DECAY = 0.95; // recency weight per day

export type SwipeMode = 'expedition' | 'spot' | 'filtered';
export type SwipeDecision = 'right' | 'left';

interface SwipePref {
  itemId: string;
  mode: SwipeMode;
  decision: SwipeDecision;
  timestamp: number;
  tags: string[];
}

function load(): SwipePref[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function save(prefs: SwipePref[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch { /* storage full */ }
}

export function useSwipePreferences() {
  function record(itemId: string, mode: SwipeMode, decision: SwipeDecision, tags: string[]): void {
    const prefs = load();
    prefs.push({ itemId, mode, decision, timestamp: Date.now(), tags });
    save(prefs);
  }

  function getAffinityScore(tags: string[]): number {
    if (!tags.length) return 0;
    const prefs = load();
    const now = Date.now();
    let score = 0;
    let weight = 0;
    for (const p of prefs) {
      const ageMs = now - p.timestamp;
      const ageDays = ageMs / 86_400_000;
      const recency = Math.pow(DECAY, ageDays);
      const overlap = p.tags.filter(t => tags.includes(t)).length / tags.length;
      const direction = p.decision === 'right' ? 1 : -0.5;
      score += recency * overlap * direction;
      weight += recency * overlap;
    }
    if (weight === 0) return 0;
    return Math.max(0, Math.min(1, (score / weight + 1) / 2));
  }

  return { record, getAffinityScore };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useSwipePreferences.ts
git commit -m "feat(swipe): add useSwipePreferences hook with affinity scoring"
```

---

## Task 2: Shared card type definitions

**Files:**
- Create: `src/components/swipe/cards/types.ts`

- [ ] **Step 1: Create types**

```typescript
// src/components/swipe/cards/types.ts
export interface ExpeditionCardData {
  id: string;
  name: string;
  architect: string;
  difficulty: string;
  days: number;
  distanceKm: string;
  rating: number;
  tags: string[];
  imageUrl?: string;
  // full Pro-Path data for clone action
  proPath: object;
}

export interface SpotCardData {
  id: string;
  name: string;
  category: string;
  rating: number | null;
  distanceFromLegKm?: number;
  tags: string[];
  imageUrl?: string;
}

export interface FilteredCardData extends SpotCardData {
  matchReasons: string[];
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/swipe/cards/types.ts
git commit -m "feat(swipe): add shared card data types"
```

---

## Task 3: `ExpeditionCard` component

**Files:**
- Create: `src/components/swipe/cards/ExpeditionCard.tsx`

- [ ] **Step 1: Create component**

```tsx
// src/components/swipe/cards/ExpeditionCard.tsx
import type { ExpeditionCardData } from './types';

const FALLBACK_GRADIENT = 'linear-gradient(160deg, #0E1012 0%, #E67E22 100%)';

interface Props { data: ExpeditionCardData }

export function ExpeditionCard({ data }: Props) {
  return (
    <div className="w-full h-full rounded-3xl overflow-hidden flex flex-col shadow-2xl relative">
      {/* Hero image */}
      <div className="flex-1 relative">
        {data.imageUrl ? (
          <img
            src={data.imageUrl}
            alt={data.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
              (e.currentTarget.nextSibling as HTMLElement).style.display = 'block';
            }}
          />
        ) : null}
        <div
          className="absolute inset-0"
          style={{ background: FALLBACK_GRADIENT, display: data.imageUrl ? 'none' : 'block' }}
        />
        {/* Gradient overlay for legibility */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(14,16,18,0.92) 0%, transparent 50%)' }} />
      </div>

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 px-6 pb-6 pt-4">
        <p className="text-xs uppercase tracking-widest mb-1" style={{ color: '#D9C5B2', fontFamily: 'JetBrains Mono, monospace' }}>
          {data.difficulty} · {data.days}d · {data.distanceKm}
        </p>
        <h2 className="text-2xl font-bold leading-tight mb-1" style={{ color: '#fff', fontFamily: 'Playfair Display, serif' }}>
          {data.name}
        </h2>
        <p className="text-sm mb-3" style={{ color: '#D9C5B2', fontFamily: 'Inter, sans-serif' }}>
          Architected by {data.architect} · ★ {data.rating}
        </p>
        <div className="flex flex-wrap gap-2">
          {data.tags.map(tag => (
            <span key={tag} className="px-2 py-0.5 rounded-full text-xs" style={{ background: 'rgba(230,126,34,0.2)', color: '#E67E22', fontFamily: 'Inter, sans-serif' }}>
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/swipe/cards/ExpeditionCard.tsx
git commit -m "feat(swipe): add ExpeditionCard face component"
```

---

## Task 4: `SpotCard` component

**Files:**
- Create: `src/components/swipe/cards/SpotCard.tsx`

- [ ] **Step 1: Create component**

```tsx
// src/components/swipe/cards/SpotCard.tsx
import type { SpotCardData } from './types';

const FALLBACK_GRADIENT = 'linear-gradient(160deg, #0E1012 0%, #E67E22 100%)';

interface Props { data: SpotCardData }

export function SpotCard({ data }: Props) {
  return (
    <div className="w-full h-full rounded-3xl overflow-hidden flex flex-col shadow-2xl relative">
      {/* Hero image */}
      <div className="flex-1 relative">
        {data.imageUrl ? (
          <img
            src={data.imageUrl}
            alt={data.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
              (e.currentTarget.nextSibling as HTMLElement).style.display = 'block';
            }}
          />
        ) : null}
        <div
          className="absolute inset-0"
          style={{ background: FALLBACK_GRADIENT, display: data.imageUrl ? 'none' : 'block' }}
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(14,16,18,0.92) 0%, transparent 50%)' }} />
      </div>

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 px-6 pb-6 pt-4">
        <p className="text-xs uppercase tracking-widest mb-1" style={{ color: '#D9C5B2', fontFamily: 'JetBrains Mono, monospace' }}>
          {data.category}{data.distanceFromLegKm != null ? ` · ${data.distanceFromLegKm.toFixed(1)} km from leg` : ''}
        </p>
        <h2 className="text-2xl font-bold leading-tight mb-1" style={{ color: '#fff', fontFamily: 'Playfair Display, serif' }}>
          {data.name}
        </h2>
        {data.rating != null && (
          <p className="text-sm mb-3" style={{ color: '#D9C5B2', fontFamily: 'Inter, sans-serif' }}>★ {data.rating}</p>
        )}
        <div className="flex flex-wrap gap-2">
          {data.tags.map(tag => (
            <span key={tag} className="px-2 py-0.5 rounded-full text-xs" style={{ background: 'rgba(230,126,34,0.2)', color: '#E67E22', fontFamily: 'Inter, sans-serif' }}>
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/swipe/cards/SpotCard.tsx
git commit -m "feat(swipe): add SpotCard face component"
```

---

## Task 5: `FilteredResultCard` component

**Files:**
- Create: `src/components/swipe/cards/FilteredResultCard.tsx`

- [ ] **Step 1: Create component**

```tsx
// src/components/swipe/cards/FilteredResultCard.tsx
import { SpotCard } from './SpotCard';
import type { FilteredCardData } from './types';

interface Props { data: FilteredCardData }

export function FilteredResultCard({ data }: Props) {
  return (
    <div className="w-full h-full relative">
      <SpotCard data={data} />
      {/* Match reasons chip row pinned above bottom content */}
      <div className="absolute bottom-0 left-0 right-0 px-6 pb-2 flex flex-wrap gap-1" style={{ paddingBottom: '9rem' }}>
        {data.matchReasons.map(reason => (
          <span key={reason} className="px-2 py-0.5 rounded text-xs font-semibold" style={{ background: '#E67E22', color: '#0E1012', fontFamily: 'JetBrains Mono, monospace' }}>
            ✓ {reason}
          </span>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/swipe/cards/FilteredResultCard.tsx
git commit -m "feat(swipe): add FilteredResultCard with match-reason chips"
```

---

## Task 6: Add `APPEND_OBJECTIVE_ITEM` to `useTripStore`

**Files:**
- Modify: `src/store/useTripStore.jsx`

The objectives array is `{ legId: number, items: string[] }[]`. We need an action that appends a text string to a leg's items, creating the entry if it doesn't exist.

- [ ] **Step 1: Add the reducer case**

In `src/store/useTripStore.jsx`, inside the `reducer` function, after the `ADD_PHOTO` case (around line 119), add:

```javascript
case 'APPEND_OBJECTIVE_ITEM': {
  // action.payload = { legId: number, item: string }
  const exists = state.objectives.find(o => o.legId === action.payload.legId);
  const objectives = exists
    ? state.objectives.map(o =>
        o.legId === action.payload.legId
          ? { ...o, items: [...o.items, action.payload.item] }
          : o
      )
    : [...state.objectives, { legId: action.payload.legId, items: [action.payload.item] }];
  return { ...state, objectives };
}
```

- [ ] **Step 2: Expose via the store's returned API**

Find where `useTripStore` exposes its actions (search for `appendObjectiveItem` or the return object). Add:

```javascript
const appendObjectiveItem = useCallback(
  (legId, item) => dispatch({ type: 'APPEND_OBJECTIVE_ITEM', payload: { legId, item } }),
  []
);
```

And include `appendObjectiveItem` in the returned value.

- [ ] **Step 3: Commit**

```bash
git add src/store/useTripStore.jsx
git commit -m "feat(store): add APPEND_OBJECTIVE_ITEM reducer action"
```

---

## Task 7: `SwipeDeck` component

**Files:**
- Create: `src/components/swipe/SwipeDeck.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/swipe/SwipeDeck.tsx
"use client";

import { useRef, useState, useCallback, useEffect } from 'react';
import { useExpedition } from '../../context/ExpeditionContext';
import { useTripStore } from '../../store/useTripStore';
import { useSwipePreferences } from '../../hooks/useSwipePreferences';
import { ExpeditionCard } from './cards/ExpeditionCard';
import { SpotCard } from './cards/SpotCard';
import { FilteredResultCard } from './cards/FilteredResultCard';
import type { ExpeditionCardData, SpotCardData, FilteredCardData } from './cards/types';

type SwipeMode = 'expedition' | 'spot' | 'filtered';
type AnyCard = ExpeditionCardData | SpotCardData | FilteredCardData;

interface SwipeDeckProps {
  mode: SwipeMode;
  cards: AnyCard[];
  onClose: () => void;
}

const SWIPE_THRESHOLD = 80;

function isFiltered(card: AnyCard): card is FilteredCardData {
  return 'matchReasons' in card;
}
function isExpedition(card: AnyCard): card is ExpeditionCardData {
  return 'architect' in card;
}

export function SwipeDeck({ mode, cards, onClose }: SwipeDeckProps) {
  const [deck, setDeck] = useState<AnyCard[]>(cards);
  const [passed, setPassed] = useState<AnyCard[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const { nominate, pool } = useExpedition();
  const { trip, legs, clonePath, appendObjectiveItem } = useTripStore();
  const { record } = useSwipePreferences();

  const startX = useRef(0);
  const deltaX = useRef(0);
  const [drag, setDrag] = useState(0);
  const [flying, setFlying] = useState<'left' | 'right' | null>(null);

  const activeCard = deck[0] ?? null;

  // Recycle passed cards when deck empties
  useEffect(() => {
    if (deck.length === 0 && passed.length > 0) {
      setDeck(passed);
      setPassed([]);
    }
  }, [deck.length, passed.length]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  function resolveRightAction(card: AnyCard): boolean {
    try {
      if (mode === 'expedition' && isExpedition(card)) {
        const hasSquad = legs.length > 0; // squad present heuristic: trip has legs
        const hasTrip = !!trip?.name;
        if (hasSquad) {
          // Nominate to Ledger Workbench
          const alreadyVetoed = pool.find(p => p.id === card.id && p.status === 'rejected');
          if (alreadyVetoed) {
            showToast('This expedition was vetoed by your Squad.');
            return false;
          }
          nominate({ id: card.id, name: card.name, type: 'Expedition', thumb: card.imageUrl ?? '' });
          showToast(`"${card.name}" nominated to Ledger Workbench`);
        } else if (hasTrip) {
          clonePath(card.proPath as Parameters<typeof clonePath>[0]);
          showToast(`Cloning "${card.name}" into your Expedition...`);
        } else {
          appendToWishlist(card, 'expedition');
          showToast(`"${card.name}" saved to Wishlist`);
        }
        return true;
      }

      if ((mode === 'spot' || mode === 'filtered') && !isExpedition(card)) {
        const hasTrip = !!trip?.name;
        if (hasTrip && legs.length > 0) {
          const activeLegId = legs[legs.length - 1].id;
          appendObjectiveItem(activeLegId, card.name);
          showToast(`"${card.name}" added to Leg objectives`);
        } else {
          appendToWishlist(card, 'spot');
          showToast(`"${card.name}" saved to Wishlist`);
        }
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }

  function appendToWishlist(card: AnyCard, cardMode: 'expedition' | 'spot') {
    try {
      const list = JSON.parse(localStorage.getItem('vp-wishlist') ?? '[]');
      list.push({ id: card.id, mode: cardMode, item: card, savedAt: Date.now() });
      localStorage.setItem('vp-wishlist', JSON.stringify(list));
    } catch { /* storage full */ }
  }

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    startX.current = e.clientX;
    deltaX.current = 0;
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!(e.currentTarget as HTMLDivElement).hasPointerCapture(e.pointerId)) return;
    deltaX.current = e.clientX - startX.current;
    setDrag(deltaX.current);
  }, []);

  const onPointerUp = useCallback(() => {
    const dx = deltaX.current;
    if (Math.abs(dx) > SWIPE_THRESHOLD) {
      const dir = dx > 0 ? 'right' : 'left';
      setFlying(dir);
      setTimeout(() => {
        setDrag(0);
        setFlying(null);
        if (!activeCard) return;
        if (dir === 'right') {
          const ok = resolveRightAction(activeCard);
          if (!ok) {
            // Return card to top on failure
            setDeck(d => d); // state already unchanged, toast shown
            return;
          }
          record(activeCard.id, mode, 'right', activeCard.tags);
          setDeck(d => d.slice(1));
        } else {
          record(activeCard.id, mode, 'left', activeCard.tags);
          setPassed(p => [...p, activeCard]);
          setDeck(d => d.slice(1));
        }
      }, 320);
    } else {
      setDrag(0);
    }
    deltaX.current = 0;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCard, mode]);

  const rotate = drag * 0.07;
  const swipeRightVisible = drag > 30 || flying === 'right';
  const swipeLeftVisible = drag < -30 || flying === 'left';

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#0E1012' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4">
        <p className="text-xs uppercase tracking-widest" style={{ color: '#D9C5B2', fontFamily: 'JetBrains Mono, monospace' }}>
          {mode === 'expedition' ? 'Swipe Expeditions' : mode === 'filtered' ? 'Swipe Results' : 'Swipe Spots'}
        </p>
        <button onClick={onClose} className="text-sm" style={{ color: '#E67E22', fontFamily: 'Inter, sans-serif' }}>✕ Close</button>
      </div>

      {/* Deck area */}
      <div className="flex-1 relative mx-6 mb-6">
        {deck.length === 0 && passed.length === 0 ? (
          // Empty state
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <span className="text-5xl" style={{ color: '#E67E22' }}>🧭</span>
            <p className="text-lg font-bold text-center" style={{ color: '#fff', fontFamily: 'Playfair Display, serif' }}>
              No Pioneers have charted this territory yet
            </p>
            <p className="text-sm text-center" style={{ color: '#D9C5B2', fontFamily: 'Inter, sans-serif' }}>
              Try broadening your filters to discover more Expeditions
            </p>
            <button onClick={onClose} className="mt-4 px-6 py-2 rounded-full text-sm font-semibold" style={{ background: '#E67E22', color: '#0E1012', fontFamily: 'Inter, sans-serif' }}>
              Broaden Filters
            </button>
          </div>
        ) : (
          deck.slice(0, 3).map((card, i) => {
            const isActive = i === 0;
            const stackOffset = i * 8;
            let transform = `translateY(${stackOffset}px) scale(${1 - i * 0.02})`;
            if (isActive) {
              transform = `translateX(${drag}px) rotate(${rotate}deg)`;
              if (flying === 'right') transform = 'translateX(120%) rotate(15deg)';
              if (flying === 'left') transform = 'translateX(-120%) rotate(-15deg)';
            }

            return (
              <div
                key={card.id}
                className="absolute inset-0"
                style={{
                  zIndex: 10 - i,
                  transform,
                  transition: flying || !isActive ? 'transform 0.32s cubic-bezier(0.25,1,0.5,1)' : 'none',
                  cursor: isActive ? 'grab' : 'default',
                  touchAction: 'none',
                }}
                onPointerDown={isActive ? onPointerDown : undefined}
                onPointerMove={isActive ? onPointerMove : undefined}
                onPointerUp={isActive ? onPointerUp : undefined}
              >
                {/* Swipe overlays */}
                {isActive && swipeRightVisible && (
                  <div className="absolute inset-0 rounded-3xl z-20 flex items-start justify-start p-6 pointer-events-none" style={{ background: 'rgba(230,126,34,0.18)' }}>
                    <span className="border-4 rounded-xl px-4 py-2 text-2xl font-black rotate-[-20deg]" style={{ borderColor: '#E67E22', color: '#E67E22', fontFamily: 'Playfair Display, serif' }}>
                      {mode === 'expedition' ? 'NOMINATE ✓' : 'ADD STOP ✓'}
                    </span>
                  </div>
                )}
                {isActive && swipeLeftVisible && (
                  <div className="absolute inset-0 rounded-3xl z-20 flex items-start justify-end p-6 pointer-events-none" style={{ background: 'rgba(180,60,60,0.14)' }}>
                    <span className="border-4 rounded-xl px-4 py-2 text-2xl font-black rotate-[20deg]" style={{ borderColor: '#B03A3A', color: '#B03A3A', fontFamily: 'Playfair Display, serif' }}>PASS</span>
                  </div>
                )}

                {/* Card face */}
                {isExpedition(card) ? (
                  <ExpeditionCard data={card} />
                ) : isFiltered(card) ? (
                  <FilteredResultCard data={card} />
                ) : (
                  <SpotCard data={card as SpotCardData} />
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 px-5 py-2 rounded-full text-sm z-[100]" style={{ background: '#E67E22', color: '#0E1012', fontFamily: 'JetBrains Mono, monospace' }}>
          {toast}
        </div>
      )}

      {/* Swipe hint */}
      {deck.length > 0 && (
        <p className="text-center text-xs pb-4" style={{ color: '#D9C5B2', fontFamily: 'JetBrains Mono, monospace' }}>
          ← pass · nominate →
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/swipe/SwipeDeck.tsx
git commit -m "feat(swipe): add SwipeDeck component with gesture engine and contextual action routing"
```

---

## Task 8: Wire entry point — VentureVault

**Files:**
- Modify: `src/components/discovery/VentureVault.jsx`

- [ ] **Step 1: Add imports and state at top of component**

At the top of `VentureVault.jsx`, add:

```javascript
import { useState } from 'react'; // already imported
import { SwipeDeck } from '../swipe/SwipeDeck';
import { useSwipePreferences } from '../../hooks/useSwipePreferences';
```

Inside the component function, add:

```javascript
const [swipeOpen, setSwipeOpen] = useState(false);
const { getAffinityScore } = useSwipePreferences();
```

- [ ] **Step 2: Build the card data array and add trigger button**

Before the return statement, add:

```javascript
const expeditionCards = PRO_PATHS
  .map(p => ({
    id: p.id,
    name: p.name,
    architect: p.architect,
    difficulty: p.difficulty,
    days: p.days,
    distanceKm: p.distance,
    rating: p.rating,
    tags: [p.difficulty, `${p.days}d`, `squad ${p.squadSize}`],
    imageUrl: undefined,
    proPath: p,
  }))
  .sort((a, b) => getAffinityScore(b.tags) - getAffinityScore(a.tags));
```

- [ ] **Step 3: Add button and SwipeDeck render**

Inside the component's JSX, add a "Swipe Expeditions" button near the top of the VentureVault panel (before the grid of Pro-Path cards):

```jsx
<button
  onClick={() => setSwipeOpen(true)}
  className="mb-4 px-4 py-2 rounded-full text-sm font-semibold"
  style={{ background: '#E67E22', color: '#0E1012', fontFamily: 'Inter, sans-serif' }}
>
  Swipe Expeditions
</button>

{swipeOpen && (
  <SwipeDeck
    mode="expedition"
    cards={expeditionCards}
    onClose={() => setSwipeOpen(false)}
  />
)}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/discovery/VentureVault.jsx
git commit -m "feat(swipe): wire SwipeDeck entry point in VentureVault"
```

---

## Task 9: Wire entry point — NearbyDrawer

**Files:**
- Modify: `src/components/nearby/NearbyDrawer.jsx`

- [ ] **Step 1: Add imports and state**

```javascript
import { SwipeDeck } from '../swipe/SwipeDeck';
import { useSwipePreferences } from '../../hooks/useSwipePreferences';
```

Inside component:

```javascript
const [swipeOpen, setSwipeOpen] = useState(false);
const { getAffinityScore } = useSwipePreferences();
```

- [ ] **Step 2: Build spotCards array**

Before the return:

```javascript
const spotCards = (results ?? [])
  .map(r => ({
    id: r.id ?? r.name,
    name: r.name,
    category: r.type ?? r.kindLabel ?? category,
    rating: r.rating ?? null,
    distanceFromLegKm: undefined,
    tags: [r.type ?? category, sortBy].filter(Boolean),
    imageUrl: r.preview ?? undefined,
  }))
  .sort((a, b) => getAffinityScore(b.tags) - getAffinityScore(a.tags));
```

- [ ] **Step 3: Add button and SwipeDeck render**

Inside the open drawer JSX (after the results list):

```jsx
{results && results.length > 0 && (
  <button
    onClick={() => setSwipeOpen(true)}
    className="w-full mt-2 py-2 rounded-lg text-xs font-mono"
    style={{ background: 'transparent', color: 'var(--accent)', border: '1px dashed var(--accent)' }}
  >
    ⟷ Swipe Results
  </button>
)}

{swipeOpen && (
  <SwipeDeck
    mode="spot"
    cards={spotCards}
    onClose={() => setSwipeOpen(false)}
  />
)}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/nearby/NearbyDrawer.jsx
git commit -m "feat(swipe): wire SwipeDeck entry point in NearbyDrawer"
```

---

## Task 10: Wire entry point — MustSee

**Files:**
- Modify: `src/components/discovery/MustSee.jsx`

- [ ] **Step 1: Read MustSee.jsx to understand its result data shape**

Open `src/components/discovery/MustSee.jsx` and find the array of results/items it renders. Note the field names (name, type/kindLabel, rating, etc.) — they may differ slightly from NearbyDrawer.

- [ ] **Step 2: Add imports and state**

```javascript
import { SwipeDeck } from '../swipe/SwipeDeck';
import { useSwipePreferences } from '../../hooks/useSwipePreferences';
```

Inside component:

```javascript
const [swipeOpen, setSwipeOpen] = useState(false);
const { getAffinityScore } = useSwipePreferences();
```

- [ ] **Step 3: Build spotCards from MustSee items and add trigger**

Map MustSee items to `SpotCardData` (same shape as Task 9 Step 2). Add a "Swipe Results" button and `<SwipeDeck>` render using the same pattern as Task 9 Step 3 with `mode="spot"`.

- [ ] **Step 4: Commit**

```bash
git add src/components/discovery/MustSee.jsx
git commit -m "feat(swipe): wire SwipeDeck entry point in MustSee"
```

---

## Verification Checklist

- [ ] Swipe right: expedition mode + squad active (legs exist) → item appears in Ledger Workbench pool
- [ ] Swipe right: expedition mode + no trip → `vp-wishlist` in localStorage has new entry
- [ ] Swipe right: spot mode + active trip → objective item added to last leg's items
- [ ] Swipe left → card reappears after deck cycles through all cards
- [ ] Open VentureVault swipe deck twice → second open order differs from first (affinity-driven)
- [ ] Pass `cards={[]}` to SwipeDeck → branded empty state renders, no blank div, no console errors
- [ ] Remove imageUrl from a card data object → gradient fallback renders, no broken `<img>`
- [ ] No raw Tailwind color defaults (`gray-500`, `black`, `white`) in any new file
- [ ] `APPEND_OBJECTIVE_ITEM` action: leg with no existing objectives entry gets a new one created
