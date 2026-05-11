import { useState, useEffect, useRef, useCallback } from 'react';
import { useDestinationImage } from '../../../hooks/useDestinationImage';
import ImageAttribution from '../../ui/ImageAttribution';
import ReportButton from '../../inspire/ReportButton';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion, AnimatePresence } from 'framer-motion';
import { useExpedition } from '../../../context/ExpeditionContext';
import { searchPlaces } from '../../../utils/foursquareEngine';
import { useTripStore } from '../../../store/useTripStore';
import InspirePanel from '../../inspire/InspirePanel';

// ── Current user (in real app this comes from auth) ───────────────────────────
const CURRENT_MEMBER = 'lead';

// ── Draggable card ────────────────────────────────────────────────────────────

const LEDGER_DND_KEY = 'application/vp-ledger-item';

function LedgerCard({ item, zone, onVote }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const [shaking, setShaking] = useState(false);
  const { image: scraped } = useDestinationImage(item.thumb ? null : item.name, 'poi', 1);
  const [cooldown, setCooldown] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const cooldownTimer = useRef(null);

  const ups   = Object.values(item.votes).filter(v => v === 'up').length;
  const downs = Object.values(item.votes).filter(v => v === 'down').length;
  const total = Object.keys(item.votes).length;

  const isRejected = item.status === 'rejected';

  useEffect(() => {
    if (isRejected) {
      setShaking(true);
      setShowTooltip(true);
      const t = setTimeout(() => {
        setShaking(false);
        setShowTooltip(false);
      }, 1200);
      return () => clearTimeout(t);
    }
  }, [isRejected]);

  const handleDownvote = () => {
    if (cooldown) return;
    setCooldown(true);
    if (navigator.vibrate) navigator.vibrate(50);
    onVote(item.id, CURRENT_MEMBER, 'down');
    cooldownTimer.current = setTimeout(() => setCooldown(false), 1000);
    window.dispatchEvent(new CustomEvent('onboarding:action', { detail: { id: 'vote-cast' } }));
  };

  const handleUpvote = () => {
    setShaking(false);
    onVote(item.id, CURRENT_MEMBER, 'up');
    window.dispatchEvent(new CustomEvent('onboarding:action', { detail: { id: 'vote-cast' } }));
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : isRejected ? 0.4 : 1,
  };

  const borderColor = isRejected
    ? 'border-red-500/50'
    : zone === 'path'
    ? 'border-[#F2C94C]/50'
    : 'border-white/10';

  function handleNativeDragStart(e) {
    if (zone !== 'path') return;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData(LEDGER_DND_KEY, JSON.stringify({
      id: item.id, name: item.name, type: item.type, thumb: item.thumb ?? null,
    }));
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      draggable={zone === 'path'}
      onDragStart={zone === 'path' ? handleNativeDragStart : undefined}
      {...attributes}
      {...listeners}
      className={`relative glass-panel p-3 mb-2 border ${borderColor} transition-colors cursor-grab active:cursor-grabbing ${shaking ? 'animate-shake' : ''}`}
    >
      {showTooltip && (
        <div className="absolute -top-7 left-1/2 -translate-x-1/2 text-[10px] bg-red-900 text-red-300 px-2 py-0.5 rounded font-mono whitespace-nowrap z-10">
          Vetoed by Squad
        </div>
      )}
      <div className="flex items-center gap-3">
        <div className="relative w-16 h-16 rounded-lg shrink-0 overflow-hidden">
          {(item.thumb || scraped?.url) ? (
            <img
              src={item.thumb ?? scraped?.url}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-white/5 flex items-center justify-center text-slate-600 text-xl">📍</div>
          )}
          {!item.thumb && scraped?.author && (
            <ImageAttribution attribution={scraped} />
          )}
          {!item.thumb && scraped?.url && (
            <div className="absolute top-0.5 right-0.5" style={{ zIndex: 15 }}>
              <ReportButton
                cityId={item.name}
                cityName={item.name}
                country=""
                poiId={item.id}
                small
                imageUrl={scraped.url}
                imageAttribution={scraped}
              />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-white text-sm font-semibold truncate">{item.name}</div>
          <div className="text-xs text-slate-400 font-mono mt-0.5">{item.type}</div>
          {zone === 'pool' && (
            <div className="text-[10px] text-slate-500 font-mono mt-1">
              {ups} vote{ups !== 1 ? 's' : ''}
            </div>
          )}
        </div>
        {/* Voting buttons (pool only) */}
        {zone === 'pool' && (
          <div className="flex gap-1 shrink-0" onPointerDown={e => e.stopPropagation()}>
            <button
              onClick={handleUpvote}
              className="px-2 py-1 text-[10px] font-mono rounded border border-green-700/50 text-green-400 hover:bg-green-900/30 transition-colors cursor-pointer"
            >
              ↑
            </button>
            <button
              onClick={handleDownvote}
              disabled={cooldown}
              className={`px-2 py-1 text-[10px] font-mono rounded border transition-colors cursor-pointer ${
                cooldown
                  ? 'border-red-800/30 text-red-800 cursor-not-allowed'
                  : 'border-red-700/50 text-red-400 hover:bg-red-900/30'
              }`}
            >
              ↓
            </button>
          </div>
        )}
        {/* Confirmed badge */}
        {zone === 'path' && (
          <span className="text-[10px] font-mono text-[#F2C94C] border border-[#F2C94C]/40 px-2 py-0.5 rounded">
            CONFIRMED
          </span>
        )}
      </div>
    </div>
  );
}

// ── Droppable zone ─────────────────────────────────────────────────────────────

function DropZone({ id, title, items, zone, onVote, isOver }) {
  return (
    <div className={`flex-1 min-h-[300px] rounded-xl p-4 border-2 transition-colors ${
      isOver ? 'border-[#F2C94C]/60 bg-[#F2C94C]/5' : 'border-white/10'
    }`}>
      <div className="label-tag mb-3">{title}</div>
      <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
        <AnimatePresence>
          {items.map(item => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
            >
              <LedgerCard item={item} zone={zone} onVote={onVote} />
            </motion.div>
          ))}
        </AnimatePresence>
        {items.length === 0 && (
          <div className="text-center text-slate-600 text-xs font-mono py-8">
            {zone === 'pool' ? 'Use "+ Nominate a spot" below to add ideas' : 'Drag confirmed items here, or vote ↑ to confirm from pool'}
          </div>
        )}
      </SortableContext>
    </div>
  );
}

const SPOT_TYPES = ['Viewpoint', 'Activity', 'Local Flavor', 'Food', 'Accommodation', 'Other'];

const FSQ_API_KEY = import.meta.env.VITE_FSQ_API_KEY ?? '';

async function fetchPlacesWithPhotos(query, nearCity, limit = 6) {
  if (!FSQ_API_KEY) return [];
  try {
    const near = nearCity ? `&near=${encodeURIComponent(nearCity)}` : '';
    const resp = await fetch(
      `https://api.foursquare.com/v3/places/search?query=${encodeURIComponent(query)}${near}&limit=${limit}&sort=RATING&fields=fsq_id,name,categories,location,rating,photos`,
      { headers: { accept: 'application/json', Authorization: FSQ_API_KEY } }
    );
    const data = await resp.json();
    return (data.results ?? []).map(p => ({
      id:      p.fsq_id,
      name:    p.name,
      type:    p.categories?.[0]?.name ?? 'Place',
      address: p.location?.formatted_address ?? p.location?.locality ?? '',
      rating:  p.rating ? (p.rating / 2).toFixed(1) : null,
      thumb:   p.photos?.[0] ? `${p.photos[0].prefix}100x100${p.photos[0].suffix}` : null,
    }));
  } catch {
    return [];
  }
}

function AddToPoolForm({ onAdd, destination, onOpenInspire }) {
  const [open, setOpen]       = useState(false);
  const [name, setName]       = useState('');
  const [type, setType]       = useState('Activity');
  const [suggestions, setSugs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const debounceRef           = useRef(null);

  const fetchSuggestions = useCallback(async (query) => {
    if (!query.trim() || query.length < 2) { setSugs([]); return; }
    setLoading(true);
    const results = await fetchPlacesWithPhotos(query, destination);
    setSugs(results);
    setLoading(false);
  }, [destination]);

  function handleNameChange(e) {
    const val = e.target.value;
    setName(val);
    setSelected(null);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 350);
  }

  function pickSuggestion(place) {
    setSelected(place);
    setName(place.name);
    setType(SPOT_TYPES.includes(place.type) ? place.type : 'Activity');
    setSugs([]);
  }

  function submit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd({
      id:    `n-${Date.now()}`,
      name:  name.trim(),
      type,
      thumb: selected?.thumb ?? null,
    });
    setName(''); setType('Activity'); setSelected(null); setSugs([]);
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full py-2 text-xs font-mono rounded-lg transition-colors"
        style={{ color: 'var(--accent)', border: '1px dashed var(--accent)', background: 'transparent' }}
      >
        + Nominate a spot
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-2 mt-2 p-3 rounded-lg border border-white/10 bg-white/5">
      {/* Inspire Me — opens the full InspirePanel drawer */}
      <button
        type="button"
        onClick={onOpenInspire}
        className="w-full py-1.5 text-[10px] font-mono rounded border transition-colors"
        style={{ color: 'var(--accent)', borderColor: 'var(--accent)', background: 'transparent' }}
      >
        ✦ INSPIRE ME
      </button>

      {/* Name input + autocomplete */}
      <div className="relative">
        <div className="flex items-center gap-1.5 rounded border border-white/10 bg-[#0E1012] px-2 py-1.5">
          {selected?.thumb && (
            <img src={selected.thumb} alt="" className="w-6 h-6 rounded object-cover shrink-0" />
          )}
          <input
            autoFocus
            type="text"
            value={name}
            onChange={handleNameChange}
            placeholder="Spot name…"
            className="flex-1 text-sm bg-transparent text-white outline-none"
          />
          {loading && <span className="text-[10px] text-slate-500 font-mono shrink-0">…</span>}
        </div>

        {/* Dropdown suggestions */}
        {suggestions.length > 0 && (
          <div className="absolute z-20 top-full left-0 right-0 mt-1 rounded-lg border border-white/10 bg-[#0E1012] shadow-xl overflow-hidden">
            {suggestions.map(place => (
              <button
                key={place.id}
                type="button"
                onClick={() => pickSuggestion(place)}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/5 text-left transition-colors"
              >
                {place.thumb ? (
                  <img src={place.thumb} alt="" className="w-8 h-8 rounded object-cover shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded bg-white/5 shrink-0 flex items-center justify-center text-slate-600 text-xs">📍</div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-white text-xs font-semibold truncate">{place.name}</div>
                  <div className="text-[10px] text-slate-500 font-mono truncate">{place.type}{place.rating ? ` · ★ ${place.rating}` : ''}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <select
        value={type}
        onChange={e => setType(e.target.value)}
        className="w-full px-2 py-1.5 rounded text-sm bg-[#0E1012] border border-white/10 text-slate-300 outline-none"
      >
        {SPOT_TYPES.map(t => <option key={t}>{t}</option>)}
      </select>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => { setOpen(false); setSugs([]); setSelected(null); setName(''); }}
          className="flex-1 py-1 text-xs rounded border border-white/10 text-slate-400"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex-1 py-1 text-xs rounded font-semibold text-white"
          style={{ background: 'var(--accent)' }}
        >
          Add
        </button>
      </div>
    </form>
  );
}

// ── Main workbench ─────────────────────────────────────────────────────────────

export default function LedgerWorkbench() {
  const { pool, activePath, vote, nominate, removeRejected, moveToPath } = useExpedition();
  const { trip } = useTripStore();
  const [activeId, setActiveId] = useState(null);
  const [overId, setOverId] = useState(null);
  const [inspireOpen, setInspireOpen] = useState(false);

  function handleInspireAdd(block) {
    nominate({
      id:    `i-${Date.now()}`,
      name:  block.title,
      type:  block.category === 'food' ? 'Food' : block.category === 'transport' ? 'Accommodation' : 'Activity',
      thumb: null,
    });
    setInspireOpen(false);
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  // Auto-remove rejected items after animation
  useEffect(() => {
    const rejected = pool.filter(i => i.status === 'rejected');
    if (rejected.length === 0) return;
    const timers = rejected.map(item =>
      setTimeout(() => removeRejected(item.id), 1300)
    );
    return () => timers.forEach(clearTimeout);
  }, [pool, removeRejected]);

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveId(null);
    setOverId(null);
    if (!over) return;
    const inPool = pool.find(i => i.id === active.id);
    if (inPool && over.id === 'active-path-zone') {
      moveToPath(active.id);
    }
  };

  const activeItem = [...pool, ...activePath].find(i => i.id === activeId);

  return (
    <div data-tour="ledger" className="tactical-panel p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <h2 className="label-tag">Expedition Ledger</h2>
        <span className="text-[10px] font-mono text-slate-500">
          {activePath.length} confirmed · {pool.length} pending
        </span>
      </div>
      <p className="text-xs text-slate-500 mb-4 leading-relaxed">
        Nominate spots your squad might visit. Vote ↑ or ↓ — majority vote confirms a spot and moves it to{' '}
        <span className="text-[#F2C94C] font-mono">The Active Path</span>. Drag confirmed items across to lock them in.
      </p>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={({ active }) => setActiveId(active.id)}
        onDragOver={({ over }) => setOverId(over?.id ?? null)}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4">
          {/* Nomination Pool */}
          <div className="flex-1 flex flex-col gap-3">
            <DropZone
              id="pool-zone"
              title="Nomination Pool — vote to confirm"
              items={pool}
              zone="pool"
              onVote={vote}
              isOver={overId === 'pool-zone'}
            />
            <AddToPoolForm onAdd={nominate} destination={trip?.destination ?? ''} onOpenInspire={() => setInspireOpen(true)} />
          </div>

          {/* Active Path */}
          <DropZone
            id="active-path-zone"
            title="The Active Path — confirmed stops"
            items={activePath}
            zone="path"
            onVote={vote}
            isOver={overId === 'active-path-zone'}
          />
        </div>

        <DragOverlay>
          {activeItem && (
            <div className="glass-panel p-3 border border-[#F2C94C]/60 shadow-xl">
              <div className="text-white text-sm font-semibold">{activeItem.name}</div>
              <div className="text-xs text-slate-400 font-mono">{activeItem.type}</div>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <InspirePanel
        open={inspireOpen}
        dayLabel={trip?.destination ?? ''}
        onClose={() => setInspireOpen(false)}
        onAddBlock={handleInspireAdd}
      />
    </div>
  );
}
