// src/components/swipe/SwipeDeck.tsx
"use client";

import { useRef, useState, useEffect } from 'react';
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

  // Refs to avoid stale closures in memoized callbacks
  const activeCardRef = useRef<AnyCard | null>(null);
  const tripRef = useRef(trip);
  const legsRef = useRef(legs);
  const poolRef = useRef(pool);

  activeCardRef.current = activeCard;
  tripRef.current = trip;
  legsRef.current = legs;
  poolRef.current = pool;

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
        const hasSquad = legsRef.current.length > 0;
        const hasTrip = !!tripRef.current?.name;
        if (hasSquad) {
          const alreadyVetoed = poolRef.current.find(p => p.id === card.id && p.status === 'rejected');
          if (alreadyVetoed) {
            showToast('This expedition was vetoed by your Squad.');
            return false;
          }
          nominate({ id: card.id, name: card.name, type: 'Expedition', thumb: card.imageUrl ?? '' });
          showToast(`"${card.name}" nominated to Ledger Workbench`);
        } else if (hasTrip) {
          clonePath(card.proPath);
          showToast(`Cloning "${card.name}" into your Expedition...`);
        } else {
          appendToWishlist(card, 'expedition');
          showToast(`"${card.name}" saved to Wishlist`);
        }
        return true;
      }

      if ((mode === 'spot' || mode === 'filtered') && !isExpedition(card)) {
        const hasTrip = !!tripRef.current?.name;
        if (hasTrip && legsRef.current.length > 0) {
          const activeLegId = legsRef.current[legsRef.current.length - 1].id;
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

  const onPointerDown = (e: React.PointerEvent) => {
    startX.current = e.clientX;
    deltaX.current = 0;
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
  };

  const onPointerCancel = () => {
    deltaX.current = 0;
    setDrag(0);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!(e.currentTarget as HTMLDivElement).hasPointerCapture(e.pointerId)) return;
    deltaX.current = e.clientX - startX.current;
    setDrag(deltaX.current);
  };

  const onPointerUp = () => {
    const dx = deltaX.current;
    deltaX.current = 0;
    if (Math.abs(dx) > SWIPE_THRESHOLD) {
      const dir = dx > 0 ? 'right' : 'left';
      if (dir === 'right') {
        const card = activeCardRef.current;
        if (!card) { setDrag(0); return; }
        const ok = resolveRightAction(card);
        if (!ok) { setDrag(0); return; }
        // action succeeded — now animate
        record(card.id, mode, 'right', card.tags);
        setFlying('right');
        setTimeout(() => {
          setDrag(0);
          setFlying(null);
          setDeck(d => d.slice(1));
        }, 320);
      } else {
        const card = activeCardRef.current;
        if (!card) { setDrag(0); return; }
        record(card.id, mode, 'left', card.tags);
        setPassed(p => [...p, card]);
        setFlying('left');
        setTimeout(() => {
          setDrag(0);
          setFlying(null);
          setDeck(d => d.slice(1));
        }, 320);
      }
    } else {
      setDrag(0);
    }
  };

  const rotate = Math.max(-15, Math.min(15, drag * 0.07));
  const swipeRightVisible = drag > 30 || flying === 'right';
  const swipeLeftVisible = drag < -30 || flying === 'left';

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#0E1012' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4">
        <p className="text-xs uppercase tracking-widest" style={{ color: '#D9C5B2', fontFamily: 'JetBrains Mono, monospace' }}>
          {mode === 'expedition' ? 'Swipe Expeditions' : mode === 'filtered' ? 'Swipe Results' : 'Swipe Spots'}
        </p>
        <button onClick={onClose} className="text-sm" style={{ color: '#E67E22',  }}>✕ Close</button>
      </div>

      {/* Deck area */}
      <div className="flex-1 relative mx-6 mb-6">
        {deck.length === 0 && passed.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <span className="text-5xl" style={{ color: '#E67E22' }}>🧭</span>
            <p className="text-lg font-bold text-center" style={{ color: '#fff', fontFamily: 'Playfair Display, serif' }}>
              No Pioneers have charted this territory yet
            </p>
            <p className="text-sm text-center" style={{ color: '#D9C5B2',  }}>
              Try broadening your filters to discover more Expeditions
            </p>
            <button onClick={onClose} className="mt-4 px-6 py-2 rounded-full text-sm font-semibold" style={{ background: '#E67E22', color: '#0E1012',  }}>
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
                onPointerCancel={isActive ? onPointerCancel : undefined}
              >
                {isActive && swipeRightVisible && (
                  <div className="absolute inset-0 rounded-3xl z-20 flex items-start justify-start p-6 pointer-events-none" style={{ background: 'rgba(230,126,34,0.18)' }}>
                    <span className="border-4 rounded-xl px-4 py-2 text-2xl font-black rotate-[-20deg]" style={{ borderColor: '#E67E22', color: '#E67E22', fontFamily: 'Playfair Display, serif' }}>
                      {mode === 'expedition' ? 'NOMINATE ✓' : 'ADD STOP ✓'}
                    </span>
                  </div>
                )}
                {isActive && swipeLeftVisible && (
                  <div className="absolute inset-0 rounded-3xl z-20 flex items-start justify-end p-6 pointer-events-none" style={{ background: 'rgba(14,16,18,0.5)' }}>
                    <span className="border-4 rounded-xl px-4 py-2 text-2xl font-black rotate-[20deg]" style={{ borderColor: '#D9C5B2', color: '#D9C5B2', fontFamily: 'Playfair Display, serif' }}>PASS</span>
                  </div>
                )}

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

      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 px-5 py-2 rounded-full text-sm z-[100]" style={{ background: '#E67E22', color: '#0E1012', fontFamily: 'JetBrains Mono, monospace' }}>
          {toast}
        </div>
      )}

      {deck.length > 0 && (
        <p className="text-center text-xs pb-4" style={{ color: '#D9C5B2', fontFamily: 'JetBrains Mono, monospace' }}>
          {`← pass · ${mode === 'expedition' ? 'nominate' : 'add stop'} →`}
        </p>
      )}
    </div>
  );
}
