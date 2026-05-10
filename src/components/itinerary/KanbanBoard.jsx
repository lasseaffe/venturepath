import { useState, useRef, useCallback, useEffect } from 'react';
import CulinaryAnchorBlock from './CulinaryAnchorBlock';
import InspirePanel from '../inspire/InspirePanel';
import ItineraryMap from './ItineraryMap';
import { useExpedition } from '../../context/ExpeditionContext';
import { geocodeLocation } from '../../utils/geocodeEngine';
import { wikidataFetch } from '../../utils/wikidataEngine';

const LEDGER_DND_KEY = 'application/vp-ledger-item';

// ── Constants ──────────────────────────────────────────────────────────────────

const DAY_START_H  = 5;           // 05:00
const DAY_END_H    = 23;          // 23:00
const DAY_START_MIN = DAY_START_H * 60;
const DAY_END_MIN   = DAY_END_H   * 60;
const TOTAL_MIN     = DAY_END_MIN - DAY_START_MIN;
const PX_PER_MIN    = 1.8;        // px per minute in timeline mode
const TIMELINE_H    = TOTAL_MIN * PX_PER_MIN;
const MIN_BLOCK_H   = 28;         // minimum card height px

// ── Default seed data ─────────────────────────────────────────────────────────

const SEED_DAYS = [
  {
    id: 1,
    label: 'Day 1 — Punta Arenas',
    blocks: [
      { id: 'b1',  time: '08:00', title: 'Airport pickup',               category: 'transport', icon: '✈',  duration: 60,  notes: 'Driver: Carlos (+56 9 1234)' },
      { id: 'b2',  time: '10:00', title: 'Permit collection — CONAF',    category: 'logistics', icon: '📋', duration: 45,  notes: 'Bring passport + booking ref' },
      { id: 'b3',  time: '13:00', title: "Lunch — Sotito's",             category: 'food',      icon: '🍽', duration: 90,  notes: 'Try the king crab' },
      { id: 'b4',  time: '15:30', title: 'Gear check & resupply',        category: 'logistics', icon: '🎒', duration: 120 },
      { id: 'b5',  time: '19:00', title: 'Briefing at hostel',           category: 'activity',  icon: '📍', duration: 60 },
    ],
  },
  {
    id: 2,
    label: 'Day 2 — Transfer & Trailhead',
    blocks: [
      { id: 'b6',  time: '06:00', title: 'Bus to Puerto Natales',        category: 'transport', icon: '🚌', duration: 180 },
      { id: 'b7',  time: '10:30', title: 'Catamaran to park entrance',   category: 'transport', icon: '⛵', duration: 90 },
      { id: 'b8',  time: '14:00', title: 'Hike to Refugio Chileno',      category: 'activity',  icon: '⛰', duration: 270, notes: 'River crossing at km 8' },
      { id: 'b9',  time: '20:00', title: 'Camp setup + dinner',          category: 'food',      icon: '🏕', duration: 60 },
    ],
  },
  {
    id: 3,
    label: 'Day 3 — Scout Day',
    blocks: [
      { id: 'b10', time: '05:30', title: 'Pre-dawn summit attempt',      category: 'activity',  icon: '🌄', duration: 180, notes: 'Turn-around: 09:00 absolute' },
      { id: 'b11', time: '11:00', title: 'Photography — Mirador Torres', category: 'activity',  icon: '📷', duration: 120 },
      { id: 'b12', time: '15:00', title: 'Rest + acclimatize',           category: 'rest',      icon: '💤', duration: 180 },
    ],
  },
  {
    id: 4,
    label: 'Day 4 — Summit Push',
    blocks: [],
  },
];

const CATEGORY_COLORS = {
  transport:     { bg: 'rgba(59,130,246,0.14)',  border: 'rgba(59,130,246,0.4)',  text: '#60A5FA', dot: '#3B82F6' },
  logistics:     { bg: 'rgba(234,179,8,0.1)',    border: 'rgba(234,179,8,0.35)', text: '#FBBF24', dot: '#EAB308' },
  food:          { bg: 'rgba(34,197,94,0.1)',    border: 'rgba(34,197,94,0.35)', text: '#4ADE80', dot: '#22C55E' },
  activity:      { bg: 'rgba(230,126,34,0.12)', border: 'rgba(230,126,34,0.4)', text: '#E67E22', dot: '#E67E22' },
  rest:          { bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.2)', text: '#94A3B8', dot: '#64748B' },
  accommodation: { bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.35)', text: '#A78BFA', dot: '#7C3AED' },
  default:       { bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.2)', text: '#94A3B8', dot: '#64748B' },
};

function makeId() {
  return 'b' + Math.random().toString(36).slice(2, 9);
}

function timeToMin(t) {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function formatMin(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function dayStats(blocks) {
  const timed = blocks.filter(b => b.duration);
  const totalMin = timed.reduce((s, b) => s + (b.duration || 0), 0);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return {
    total: h ? `${h}h${m ? `${m}m` : ''}` : m ? `${m}m` : null,
    count: blocks.length,
  };
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function KanbanBoard({ initialDays = SEED_DAYS, tripName = 'Operation Patagonia' }) {
  const { removeFromPath } = useExpedition();
  const [days,         setDays]         = useState(initialDays);
  const [viewMode,     setViewMode]     = useState('kanban'); // 'kanban' | 'timeline'
  const [ghostId,      setGhostId]      = useState(null);
  const [dropIndicator,setDropIndicator]= useState(null); // { dayId, index }
  const [editingId,    setEditingId]    = useState(null);
  const [editDraft,    setEditDraft]    = useState({});
  const [addingTo,     setAddingTo]     = useState(null);
  const [newDraft,     setNewDraft]     = useState({ title: '', time: '', category: 'activity', icon: '📍', duration: '', notes: '' });
  const [culinaryAnchor, setCulinaryAnchor] = useState(null); // injected recipe from What's Cooking
  const [inspireDay,    setInspireDay]    = useState(null);  // day object whose Inspire panel is open
  const [activeStopId,  setActiveStopId]  = useState(null);
  const [coordsVersion, setCoordsVersion] = useState(0);
  const coordsRef = useRef(new Map()); // blockId → [lat, lng] | false (failed)

  // Read ?culinary= payload on mount and strip it from the URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get('culinary');
    if (!encoded) return;
    try {
      const recipe = JSON.parse(atob(encoded));
      setCulinaryAnchor(recipe);
      // Clean the URL so refreshing doesn't re-inject
      params.delete('culinary');
      const clean = params.toString() ? `?${params.toString()}` : window.location.pathname;
      window.history.replaceState({}, '', clean);
    } catch {
      // malformed payload — ignore
    }
  }, []);

  // Geocode all blocks that don't have coordinates yet
  useEffect(() => {
    const allBlocks = days.flatMap(d => d.blocks);
    const pending = allBlocks.filter(b => !coordsRef.current.has(b.id));
    if (pending.length === 0) return;
    let cancelled = false;
    pending.forEach((block, i) => {
      setTimeout(async () => {
        if (cancelled) return;
        const result = await geocodeLocation(block.title);
        coordsRef.current.set(block.id, result ? [result.lat, result.lng] : false);
        if (!cancelled) setCoordsVersion(v => v + 1);
      }, i * 300);
    });
    return () => { cancelled = true; };
  }, [days]);

  // Scroll the active card into view when activeStopId changes
  useEffect(() => {
    if (!activeStopId) return;
    const el = document.querySelector(`[data-block-id="${activeStopId}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [activeStopId]);

  const dragState  = useRef(null);
  const columnRefs = useRef(new Map());

  // ── Mutations ────────────────────────────────────────────────────────────────

  const updateBlock = useCallback((blockId, updates) => {
    setDays(prev => prev.map(day => ({
      ...day,
      blocks: day.blocks.map(b => b.id === blockId ? { ...b, ...updates } : b),
    })));
  }, []);

  function removeBlock(blockId) {
    setDays(prev => prev.map(day => ({
      ...day,
      blocks: day.blocks.filter(b => b.id !== blockId),
    })));
  }

  function addBlock(dayId) {
    if (!newDraft.title.trim()) return;
    const block = {
      id: makeId(),
      ...newDraft,
      duration: newDraft.duration ? Number(newDraft.duration) : undefined,
    };
    setDays(prev => prev.map(d => d.id === dayId ? { ...d, blocks: [...d.blocks, block] } : d));
    setNewDraft({ title: '', time: '', category: 'activity', icon: '📍', duration: '', notes: '' });
    setAddingTo(null);
  }

  function addInspiredBlock(dayId, blockData) {
    const block = { id: makeId(), ...blockData };
    setDays(prev => prev.map(d => d.id === dayId ? { ...d, blocks: [...d.blocks, block] } : d));
  }

  function addDay() {
    const maxId = Math.max(0, ...days.map(d => d.id));
    setDays(prev => [...prev, { id: maxId + 1, label: `Day ${maxId + 1}`, blocks: [] }]);
  }

  function removeDay(dayId) {
    if (days.length <= 1) return;
    setDays(prev => {
      const filtered = prev.filter(d => d.id !== dayId);
      return filtered.map((d, i) => ({ ...d, label: d.label.replace(/^Day \d+/, `Day ${i + 1}`) }));
    });
  }

  function autoSortDay(dayId) {
    setDays(prev => prev.map(day => {
      if (day.id !== dayId) return day;
      const sorted = [...day.blocks].sort((a, b) => {
        if (!a.time && !b.time) return 0;
        if (!a.time) return 1;
        if (!b.time) return -1;
        return a.time.localeCompare(b.time);
      });
      return { ...day, blocks: sorted };
    }));
  }

  // ── Drag & drop (kanban mode) ─────────────────────────────────────────────────

  function handleDragStart(e, dayId, blockId) {
    dragState.current = { sourceDayId: dayId, blockId };
    requestAnimationFrame(() => setGhostId(blockId));
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragEnd() {
    setGhostId(null);
    setDropIndicator(null);
    dragState.current = null;
  }

  function getDropIndex(e, dayId) {
    const col = columnRefs.current.get(dayId);
    if (!col) return 0;
    const cards = Array.from(col.querySelectorAll('[data-block-id]'));
    for (let i = 0; i < cards.length; i++) {
      const rect = cards[i].getBoundingClientRect();
      if (e.clientY < rect.top + rect.height / 2) return i;
    }
    return cards.length;
  }

  function handleDragOver(e, dayId) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropIndicator({ dayId, index: getDropIndex(e, dayId) });
  }

  function handleDragLeave(e) {
    if (!e.currentTarget.contains(e.relatedTarget)) setDropIndicator(null);
  }

  function handleDrop(e, targetDayId) {
    e.preventDefault();

    // ── Ledger Active Path drop ───────────────────────────────────────────────
    const ledgerRaw = e.dataTransfer.getData(LEDGER_DND_KEY);
    if (ledgerRaw) {
      try {
        const item = JSON.parse(ledgerRaw);
        const insertIdx = getDropIndex(e, targetDayId);
        const block = {
          id:       `ledger-${item.id}-${Date.now()}`,
          title:    item.name,
          category: 'activity',
          icon:     '📍',
          time:     '',
          duration: undefined,
          notes:    item.type ?? '',
        };
        setDays(prev => prev.map(d => {
          if (d.id !== targetDayId) return d;
          const nb = [...d.blocks];
          nb.splice(Math.min(insertIdx, nb.length), 0, block);
          return { ...d, blocks: nb };
        }));
        removeFromPath(item.id);
      } catch { /* malformed */ }
      setDropIndicator(null);
      return;
    }

    // ── Internal kanban drag ──────────────────────────────────────────────────
    const ds = dragState.current;
    if (!ds) return;
    const insertIdx = getDropIndex(e, targetDayId);

    setDays(prev => {
      const srcDay = prev.find(d => d.id === ds.sourceDayId);
      if (!srcDay) return prev;
      const block = srcDay.blocks.find(b => b.id === ds.blockId);
      if (!block) return prev;
      const without = prev.map(d =>
        d.id === ds.sourceDayId ? { ...d, blocks: d.blocks.filter(b => b.id !== ds.blockId) } : d
      );
      return without.map(d => {
        if (d.id !== targetDayId) return d;
        const nb = [...d.blocks];
        nb.splice(Math.min(insertIdx, nb.length), 0, block);
        return { ...d, blocks: nb };
      });
    });
    setGhostId(null);
    setDropIndicator(null);
    dragState.current = null;
  }

  // ── Inline edit ───────────────────────────────────────────────────────────────

  function startEdit(block) {
    setEditingId(block.id);
    setEditDraft({ ...block });
  }

  function commitEdit() {
    if (!editDraft.title?.trim()) return;
    updateBlock(editingId, editDraft);
    setEditingId(null);
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  // Build plain object from ref for prop comparison (coordsVersion forces re-read)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const coords = Object.fromEntries(
    [...coordsRef.current.entries()].filter(([, v]) => Array.isArray(v))
  );

  return (
    <div className="flex flex-col gap-3">

      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between">
        <div className="label-tag">Spatial Itinerary Grid — {tripName}</div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div
            className="flex items-center rounded border overflow-hidden"
            style={{ borderColor: '#1e2328' }}
          >
            {['kanban', 'timeline'].map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className="px-3 py-1 text-[10px] font-mono tracking-widest transition-colors"
                style={{
                  background: viewMode === mode ? '#E67E22' : 'transparent',
                  color:      viewMode === mode ? '#0E1012' : '#4b5563',
                }}
              >
                {mode === 'kanban' ? 'KANBAN' : 'TIMELINE'}
              </button>
            ))}
          </div>
          <button
            onClick={addDay}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono border border-dashed border-[#2a2f36] text-slate-400 hover:border-[#E67E22] hover:text-[#E67E22] rounded transition-colors tracking-widest"
          >
            + ADD DAY
          </button>
        </div>
      </div>

      {/* ── Culinary Anchor (injected from What's Cooking) ── */}
      {culinaryAnchor && (
        <CulinaryAnchorBlock
          recipe={culinaryAnchor}
          destination={tripName}
          onDismiss={() => setCulinaryAnchor(null)}
        />
      )}

      {/* ── Inspire panel (always mounted, slides in/out) ── */}
      <InspirePanel
        open={!!inspireDay}
        dayLabel={inspireDay?.label ?? ''}
        onClose={() => setInspireDay(null)}
        onAddBlock={blockData => {
          if (inspireDay) addInspiredBlock(inspireDay.id, blockData);
        }}
      />

      {/* ── Board ── */}
      {viewMode === 'kanban'
        ? (
          <KanbanView
            days={days}
            ghostId={ghostId}
            dropIndicator={dropIndicator}
            editingId={editingId}
            editDraft={editDraft}
            addingTo={addingTo}
            newDraft={newDraft}
            columnRefs={columnRefs}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onAddDay={addDay}
            onRemoveDay={removeDay}
            onAutoSort={autoSortDay}
            onStartEdit={startEdit}
            onCommitEdit={commitEdit}
            onCancelEdit={() => setEditingId(null)}
            onEditDraftChange={setEditDraft}
            onSetAddingTo={(id) => {
              setAddingTo(id);
              setNewDraft({ title: '', time: '', category: 'activity', icon: '📍', duration: '', notes: '' });
            }}
            onCancelAdd={() => setAddingTo(null)}
            onNewDraftChange={setNewDraft}
            onAddBlock={addBlock}
            onRemoveBlock={removeBlock}
            onInspire={day => setInspireDay(day)}
            activeStopId={activeStopId}
            onCardClick={id => setActiveStopId(prev => prev === id ? null : id)}
          />
        )
        : (
          <TimelineView
            days={days}
            editingId={editingId}
            editDraft={editDraft}
            onStartEdit={startEdit}
            onCommitEdit={commitEdit}
            onCancelEdit={() => setEditingId(null)}
            onEditDraftChange={setEditDraft}
            onRemoveBlock={removeBlock}
          />
        )
      }

      <ItineraryMap
        days={days}
        coords={coords}
        activeStopId={activeStopId}
        onPinClick={id => setActiveStopId(prev => prev === id ? null : id)}
      />
    </div>
  );
}

// ── Kanban view ───────────────────────────────────────────────────────────────

function KanbanView({
  days, ghostId, dropIndicator, editingId, editDraft, addingTo, newDraft,
  columnRefs, onDragStart, onDragEnd, onDragOver, onDragLeave, onDrop,
  onAddDay, onRemoveDay, onAutoSort,
  onStartEdit, onCommitEdit, onCancelEdit, onEditDraftChange,
  onSetAddingTo, onCancelAdd, onNewDraftChange, onAddBlock, onRemoveBlock,
  onInspire, activeStopId, onCardClick,
}) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-3" style={{ minHeight: '480px' }}>
      {days.map(day => {
        const isTarget = dropIndicator?.dayId === day.id;
        const stats = dayStats(day.blocks);
        return (
          <div
            key={day.id}
            className="shrink-0 flex flex-col rounded-lg overflow-hidden transition-all duration-150"
            style={{
              width: '262px',
              background: '#111316',
              border: `1px solid ${isTarget ? '#E67E22' : '#1e2328'}`,
              boxShadow: isTarget ? '0 0 0 1px rgba(230,126,34,0.4), 0 4px 20px rgba(230,126,34,0.1)' : 'none',
            }}
          >
            {/* Header */}
            <div className="px-3 py-2.5 shrink-0" style={{ background: '#0E1012', borderBottom: '1px solid #1e2328' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-5 h-5 flex items-center justify-center text-[10px] font-mono font-bold rotate-45 shrink-0"
                    style={{ background: '#E67E22', color: '#0E1012' }}
                  >
                    <span style={{ transform: 'rotate(-45deg)', display: 'block' }}>{day.id}</span>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-white tracking-wider truncate uppercase">
                    {day.label}
                  </span>
                </div>
                {stats.total && (
                  <span className="text-[9px] font-mono shrink-0" style={{ color: '#E67E22' }}>
                    {stats.total}
                  </span>
                )}
              </div>
              {/* Mini category strip */}
              {day.blocks.length > 0 && (
                <div className="flex gap-0.5 mt-2 flex-wrap">
                  {day.blocks.map(b => {
                    const c = CATEGORY_COLORS[b.category] ?? CATEGORY_COLORS.default;
                    return (
                      <div
                        key={b.id}
                        className="w-2 h-2 rounded-sm"
                        title={b.title}
                        style={{ background: c.dot, opacity: 0.8 }}
                      />
                    );
                  })}
                </div>
              )}
            </div>

            {/* Action strip */}
            <div className="flex items-center gap-1 px-2 py-1.5 shrink-0" style={{ borderBottom: '1px solid #1a1e23', background: '#0c0e10' }}>
              <button
                onClick={() => onAutoSort(day.id)}
                className="text-[9px] font-mono px-2 py-1 rounded border border-[#1e2328] text-slate-500 hover:text-slate-300 hover:border-[#2a2f36] transition-colors tracking-widest"
              >
                SORT
              </button>
              <button
                onClick={() => onSetAddingTo(day.id)}
                className="text-[9px] font-mono px-2 py-1 rounded border border-[#E67E22]/40 text-[#E67E22] hover:bg-[#E67E22]/10 transition-colors tracking-widest"
              >
                + ADD
              </button>
              <button
                onClick={() => onInspire(day)}
                className="text-[9px] font-mono px-2 py-1 rounded border transition-colors tracking-widest"
                style={{ borderColor: '#A78BFA44', color: '#A78BFA' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(167,139,250,0.1)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                title="Get destination inspiration for this day"
              >
                ✦ INSPIRE
              </button>
              {days.length > 1 && (
                <button
                  onClick={() => onRemoveDay(day.id)}
                  className="text-[9px] font-mono px-2 py-1 rounded border border-transparent text-slate-600 hover:text-red-400 hover:border-red-800/40 transition-colors tracking-widest ml-auto"
                >
                  DEL
                </button>
              )}
            </div>

            {/* Drop zone */}
            <div
              ref={el => el ? columnRefs.current.set(day.id, el) : columnRefs.current.delete(day.id)}
              onDragOver={e => onDragOver(e, day.id)}
              onDragLeave={onDragLeave}
              onDrop={e => onDrop(e, day.id)}
              className="flex-1 overflow-y-auto p-2 flex flex-col gap-1.5"
              style={{ minHeight: '160px', maxHeight: 'calc(100vh - 420px)' }}
            >
              {day.blocks.length === 0 && !isTarget && (
                <div
                  className="flex flex-col items-center justify-center gap-2 py-10 rounded border border-dashed text-center"
                  style={{ borderColor: '#1e2328', color: '#374151' }}
                >
                  <span className="text-2xl opacity-30">◻</span>
                  <p className="text-[10px] font-mono tracking-widest">EMPTY SLOT</p>
                </div>
              )}

              {day.blocks.map((block, idx) => (
                <div key={block.id}>
                  {isTarget && dropIndicator.index === idx && <DropLine />}
                  {editingId === block.id ? (
                    <EditCard
                      draft={editDraft}
                      onChange={onEditDraftChange}
                      onCommit={onCommitEdit}
                      onCancel={onCancelEdit}
                    />
                  ) : (
                    <ActivityBlock
                      block={block}
                      isGhost={ghostId === block.id}
                      isActive={activeStopId === block.id}
                      onDragStart={e => onDragStart(e, day.id, block.id)}
                      onDragEnd={onDragEnd}
                      onEdit={() => onStartEdit(block)}
                      onRemove={() => onRemoveBlock(block.id)}
                      onCardClick={() => onCardClick(block.id)}
                    />
                  )}
                </div>
              ))}

              {isTarget && dropIndicator.index === day.blocks.length && <DropLine />}

              {isTarget && day.blocks.length === 0 && (
                <div
                  className="flex-1 rounded border border-dashed flex items-center justify-center py-6"
                  style={{ borderColor: '#E67E22', background: 'rgba(230,126,34,0.04)' }}
                >
                  <p className="text-[10px] font-mono text-[#E67E22] tracking-widest">DROP HERE</p>
                </div>
              )}

              {addingTo === day.id && (
                <AddCard
                  draft={newDraft}
                  onChange={onNewDraftChange}
                  onAdd={() => onAddBlock(day.id)}
                  onCancel={onCancelAdd}
                />
              )}
            </div>
          </div>
        );
      })}

      {/* Ghost add-day column */}
      <div className="shrink-0 flex items-start pt-10">
        <button
          onClick={onAddDay}
          className="flex flex-col items-center gap-3 px-8 py-6 rounded-lg border border-dashed border-[#1e2328] text-slate-600 hover:border-[#E67E22]/50 hover:text-[#E67E22]/70 transition-all"
          style={{ width: '140px' }}
        >
          <div className="w-8 h-8 border border-dashed border-current rotate-45 flex items-center justify-center">
            <span className="text-lg font-bold" style={{ transform: 'rotate(-45deg)', display: 'block' }}>+</span>
          </div>
          <span className="text-[9px] font-mono tracking-widest">ADD DAY</span>
        </button>
      </div>
    </div>
  );
}

// ── Timeline view ─────────────────────────────────────────────────────────────

function TimelineView({ days, editingId, editDraft, onStartEdit, onCommitEdit, onCancelEdit, onEditDraftChange, onRemoveBlock }) {
  // Build ruler hours
  const hours = [];
  for (let h = DAY_START_H; h <= DAY_END_H; h++) hours.push(h);

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex" style={{ minWidth: `${days.length * 240 + 52}px` }}>

        {/* ── Time ruler ── */}
        <div className="shrink-0 select-none" style={{ width: '44px', paddingTop: '52px' }}>
          <div className="relative" style={{ height: `${TIMELINE_H}px` }}>
            {hours.map(h => (
              <div
                key={h}
                className="absolute right-0 flex items-center"
                style={{ top: `${(h * 60 - DAY_START_MIN) * PX_PER_MIN - 6}px`, width: '100%' }}
              >
                <span
                  className="text-[9px] font-mono pr-2 text-right w-full"
                  style={{ color: h % 6 === 0 ? '#6b7280' : '#374151' }}
                >
                  {String(h).padStart(2, '0')}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Day columns ── */}
        <div className="flex gap-3 flex-1">
          {days.map(day => {
            const stats = dayStats(day.blocks);
            // Separate timed and untimed blocks
            const timed   = day.blocks.filter(b => b.time);
            const untimed = day.blocks.filter(b => !b.time);

            return (
              <div key={day.id} className="shrink-0 flex flex-col" style={{ width: '224px' }}>
                {/* Column header */}
                <div
                  className="rounded-t-lg px-3 py-2 mb-0 shrink-0"
                  style={{ background: '#0E1012', border: '1px solid #1e2328', borderBottom: 'none' }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-4 h-4 flex items-center justify-center text-[9px] font-mono font-bold rotate-45 shrink-0"
                        style={{ background: '#E67E22', color: '#0E1012' }}
                      >
                        <span style={{ transform: 'rotate(-45deg)', display: 'block' }}>{day.id}</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-white tracking-wide truncate uppercase">
                        {day.label}
                      </span>
                    </div>
                    {stats.total && (
                      <span className="text-[9px] font-mono shrink-0" style={{ color: '#E67E22' }}>
                        {stats.total}
                      </span>
                    )}
                  </div>
                </div>

                {/* Timeline column body */}
                <div
                  className="relative rounded-b-lg"
                  style={{
                    height: `${TIMELINE_H}px`,
                    background: '#0d0f11',
                    border: '1px solid #1e2328',
                    overflow: 'hidden',
                  }}
                >
                  {/* Hour grid lines */}
                  {hours.map(h => (
                    <div
                      key={h}
                      className="absolute left-0 right-0"
                      style={{
                        top: `${(h * 60 - DAY_START_MIN) * PX_PER_MIN}px`,
                        height: '1px',
                        background: h % 6 === 0 ? '#1e2328' : '#141618',
                      }}
                    />
                  ))}

                  {/* Half-hour ticks */}
                  {hours.slice(0, -1).map(h => (
                    <div
                      key={`${h}-30`}
                      className="absolute left-0"
                      style={{
                        top: `${(h * 60 + 30 - DAY_START_MIN) * PX_PER_MIN}px`,
                        width: '8px',
                        height: '1px',
                        background: '#1e2328',
                      }}
                    />
                  ))}

                  {/* Current-hour highlight band */}
                  <NowLine />

                  {/* Timed blocks — absolutely positioned */}
                  {timed.map(block => {
                    const startMin = timeToMin(block.time);
                    if (startMin === null) return null;
                    const top    = (startMin - DAY_START_MIN) * PX_PER_MIN;
                    const height = Math.max(block.duration ? block.duration * PX_PER_MIN : MIN_BLOCK_H, MIN_BLOCK_H);
                    const colors = CATEGORY_COLORS[block.category] ?? CATEGORY_COLORS.default;

                    return (
                      <TimelineBlock
                        key={block.id}
                        block={block}
                        top={top}
                        height={height}
                        colors={colors}
                        isEditing={editingId === block.id}
                        editDraft={editDraft}
                        onStartEdit={() => onStartEdit(block)}
                        onCommitEdit={onCommitEdit}
                        onCancelEdit={onCancelEdit}
                        onEditDraftChange={onEditDraftChange}
                        onRemove={() => onRemoveBlock(block.id)}
                      />
                    );
                  })}
                </div>

                {/* Untimed blocks below */}
                {untimed.length > 0 && (
                  <div
                    className="mt-2 rounded-lg p-2 flex flex-col gap-1"
                    style={{ background: '#111316', border: '1px solid #1e2328' }}
                  >
                    <div className="label-tag text-[8px] mb-1">UNSCHEDULED</div>
                    {untimed.map(block => {
                      const colors = CATEGORY_COLORS[block.category] ?? CATEGORY_COLORS.default;
                      return (
                        <div
                          key={block.id}
                          className="flex items-center gap-2 px-2 py-1 rounded"
                          style={{ background: colors.bg, border: `1px solid ${colors.border}` }}
                        >
                          <span className="text-sm">{block.icon}</span>
                          <span className="text-[10px] font-mono text-white truncate flex-1">{block.title}</span>
                          <button
                            onClick={() => onStartEdit(block)}
                            className="text-[8px] font-mono text-slate-500 hover:text-slate-300 transition-colors tracking-widest shrink-0"
                          >
                            EDIT
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Now line (current time indicator) ────────────────────────────────────────

function NowLine() {
  const now  = new Date();
  const min  = now.getHours() * 60 + now.getMinutes();
  if (min < DAY_START_MIN || min > DAY_END_MIN) return null;
  const top  = (min - DAY_START_MIN) * PX_PER_MIN;
  return (
    <div
      className="absolute left-0 right-0 z-10 flex items-center"
      style={{ top: `${top}px`, pointerEvents: 'none' }}
    >
      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#E67E22' }} />
      <div className="flex-1 h-px" style={{ background: 'rgba(230,126,34,0.5)' }} />
    </div>
  );
}

// ── Timeline block ────────────────────────────────────────────────────────────

function TimelineBlock({ block, top, height, colors, isEditing, editDraft, onStartEdit, onCommitEdit, onCancelEdit, onEditDraftChange, onRemove }) {
  const [hovered, setHovered] = useState(false);

  if (isEditing) {
    return (
      <div
        className="absolute left-1 right-1 z-20 rounded"
        style={{ top: `${top}px` }}
      >
        <EditCard
          draft={editDraft}
          onChange={onEditDraftChange}
          onCommit={onCommitEdit}
          onCancel={onCancelEdit}
        />
      </div>
    );
  }

  return (
    <div
      className="absolute left-1 right-1 rounded overflow-hidden transition-all"
      style={{
        top:    `${top}px`,
        height: `${height}px`,
        background: hovered ? colors.bg.replace('0.1', '0.2').replace('0.12', '0.22').replace('0.14', '0.24') : colors.bg,
        border: `1px solid ${colors.border}`,
        zIndex: hovered ? 10 : 1,
        cursor: 'pointer',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onStartEdit}
    >
      <div className="flex items-start gap-1 px-1.5 pt-1 h-full">
        {/* Left accent bar */}
        <div className="w-0.5 rounded-full shrink-0 self-stretch" style={{ background: colors.dot, opacity: 0.7 }} />

        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[9px] font-mono" style={{ color: colors.text }}>
              {block.time}
            </span>
            {hovered && (
              <button
                onClick={e => { e.stopPropagation(); onRemove(); }}
                className="text-[8px] text-slate-600 hover:text-red-400 transition-colors shrink-0"
              >
                ✕
              </button>
            )}
          </div>
          <p
            className="font-mono font-semibold leading-tight mt-0.5"
            style={{ fontSize: height < 36 ? '9px' : '10px', color: '#e2e8f0' }}
          >
            {block.title}
          </p>
          {height >= 52 && block.notes && (
            <p className="text-[9px] mt-0.5 leading-tight" style={{ color: '#4b5563' }}>
              {block.notes}
            </p>
          )}
          {height >= 44 && block.duration && (
            <p className="text-[8px] font-mono mt-auto pt-1" style={{ color: '#374151' }}>
              {block.duration >= 60
                ? `${Math.floor(block.duration / 60)}h${block.duration % 60 ? `${block.duration % 60}m` : ''}`
                : `${block.duration}m`}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Drop line ─────────────────────────────────────────────────────────────────

function DropLine() {
  return (
    <div className="flex items-center gap-1.5 px-1 my-0.5">
      <div className="w-1.5 h-1.5 rotate-45 shrink-0" style={{ background: '#E67E22' }} />
      <div className="flex-1 h-px" style={{ background: '#E67E22' }} />
      <div className="w-1.5 h-1.5 rotate-45 shrink-0" style={{ background: '#E67E22' }} />
    </div>
  );
}

// ── Activity block (kanban card) ──────────────────────────────────────────────

function ActivityBlock({ block, isGhost, isActive, onDragStart, onDragEnd, onEdit, onRemove, onCardClick }) {
  const [hovered, setHovered] = useState(false);
  const colors = CATEGORY_COLORS[block.category] ?? CATEGORY_COLORS.default;

  return (
    <div
      data-block-id={block.id}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onCardClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="rounded-lg cursor-grab active:cursor-grabbing transition-all select-none overflow-hidden"
      style={{
        background: hovered && !isGhost ? '#1a1e24' : '#141619',
        border: `1px solid ${hovered && !isGhost ? '#2a2f36' : '#1e2328'}`,
        opacity: isGhost ? 0.3 : 1,
        transform: hovered && !isGhost ? 'translateY(-1px)' : 'none',
        boxShadow: isActive
          ? '0 0 0 2px #E67E22, 0 0 12px rgba(230,126,34,0.4)'
          : hovered && !isGhost ? '0 4px 12px rgba(0,0,0,0.4)' : 'none',
        cursor: 'pointer',
        transition: 'opacity 0.15s ease, border-color 0.12s, transform 0.12s, box-shadow 0.12s',
      }}
    >
      <div className="flex items-center justify-between px-2.5 pt-2 pb-1">
        <div className="flex items-center gap-1.5">
          <span className="text-sm leading-none">{block.icon}</span>
          {block.time && (
            <span className="text-[10px] font-mono" style={{ color: '#E67E22' }}>{block.time}</span>
          )}
        </div>
        <span
          className="text-[8px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded"
          style={{ background: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}
        >
          {block.category}
        </span>
      </div>

      <div className="px-2.5 pb-2">
        <p className="text-xs font-semibold text-white leading-tight">{block.title}</p>
        {block.notes && (
          <p className="text-[10px] mt-1 leading-relaxed" style={{ color: '#4b5563' }}>{block.notes}</p>
        )}
        {block.duration && (
          <p className="text-[9px] font-mono mt-1.5" style={{ color: '#374151' }}>
            {block.duration >= 60
              ? `${Math.floor(block.duration / 60)}h${block.duration % 60 ? `${block.duration % 60}m` : ''}`
              : `${block.duration}m`}
          </p>
        )}
      </div>

      {hovered && !isGhost && (
        <div className="flex items-center gap-1 px-2 pb-2" style={{ borderTop: '1px solid #1e2328' }}>
          <button
            onClick={e => { e.stopPropagation(); onEdit(); }}
            className="text-[9px] font-mono px-2 py-0.5 rounded border border-[#2a2f36] text-slate-400 hover:text-white hover:border-[#3a3f46] transition-colors tracking-widest"
          >
            EDIT
          </button>
          <button
            onClick={e => { e.stopPropagation(); onRemove(); }}
            className="text-[9px] font-mono px-2 py-0.5 rounded border border-transparent text-slate-600 hover:text-red-400 hover:border-red-800/40 transition-colors tracking-widest ml-auto"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

// ── Edit card ─────────────────────────────────────────────────────────────────

function EditCard({ draft, onChange, onCommit, onCancel }) {
  return (
    <div
      className="rounded-lg p-3 flex flex-col gap-2"
      style={{ background: '#1a1e24', border: '1px solid #E67E22', boxShadow: '0 0 0 1px rgba(230,126,34,0.2)' }}
    >
      <div className="grid grid-cols-2 gap-1.5">
        <input
          value={draft.time ?? ''}
          onChange={e => onChange(p => ({ ...p, time: e.target.value }))}
          type="time"
          className="bg-[#0E1012] border border-[#2a2f36] rounded px-2 py-1 text-[11px] font-mono text-white focus:outline-none focus:border-[#E67E22]"
        />
        <select
          value={draft.category ?? 'activity'}
          onChange={e => onChange(p => ({ ...p, category: e.target.value }))}
          className="bg-[#0E1012] border border-[#2a2f36] rounded px-2 py-1 text-[11px] font-mono text-slate-300 focus:outline-none focus:border-[#E67E22]"
        >
          {Object.keys(CATEGORY_COLORS).filter(k => k !== 'default').map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
      <input
        value={draft.title ?? ''}
        onChange={e => onChange(p => ({ ...p, title: e.target.value }))}
        placeholder="Activity name…"
        className="bg-[#0E1012] border border-[#2a2f36] rounded px-2 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-[#E67E22] w-full"
        autoFocus
      />
      <div className="grid grid-cols-2 gap-1.5">
        <input
          value={draft.icon ?? ''}
          onChange={e => onChange(p => ({ ...p, icon: e.target.value }))}
          placeholder="Icon 📍"
          className="bg-[#0E1012] border border-[#2a2f36] rounded px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-[#E67E22]"
        />
        <input
          value={draft.duration ?? ''}
          onChange={e => onChange(p => ({ ...p, duration: e.target.value }))}
          placeholder="Duration (min)"
          type="number"
          className="bg-[#0E1012] border border-[#2a2f36] rounded px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-[#E67E22]"
        />
      </div>
      <input
        value={draft.notes ?? ''}
        onChange={e => onChange(p => ({ ...p, notes: e.target.value }))}
        placeholder="Field notes…"
        className="bg-[#0E1012] border border-[#2a2f36] rounded px-2 py-1 text-[11px] text-slate-400 font-mono focus:outline-none focus:border-[#E67E22] w-full"
      />
      <div className="flex gap-2">
        <button
          onClick={onCommit}
          disabled={!draft.title?.trim()}
          className="flex-1 py-1 text-[10px] font-mono font-bold tracking-widest rounded transition-colors disabled:opacity-40"
          style={{ background: '#E67E22', color: '#0E1012' }}
        >
          CONFIRM
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1 text-[10px] font-mono tracking-widest rounded border border-[#2a2f36] text-slate-500 hover:text-slate-300 transition-colors"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

// ── Add card ──────────────────────────────────────────────────────────────────

const ACTIVITY_SUGGESTIONS = [
  'Airport pickup', 'Hotel check-in', 'City walk', 'Museum visit',
  'Local lunch', 'Rooftop dinner', 'Sunset viewpoint', 'Market exploration',
  'Cooking class', 'Day hike', 'Boat tour', 'Cycling route',
  'Coffee & planning', 'Beach time', 'Night market', 'Cultural show',
  'Photography walk', 'Bus transfer', 'Train departure', 'Border crossing',
  'Gear check', 'Camp setup', 'Ferry crossing', 'Cave exploration',
  'Snorkelling', 'Scuba diving', 'Rock climbing', 'Kayaking',
  'Wine tasting', 'Brewery tour', 'Jazz bar', 'Rooftop cocktails',
  'Temple visit', 'Monastery tour', 'Art gallery', 'Street art walk',
];

const INSTANCE_OF_CATEGORY = [
  [['restaurant', 'café', 'bar', 'brewery', 'winery', 'food'], 'food'],
  [['train station', 'railway', 'airport', 'ferry', 'bus station', 'port', 'transit'], 'transport'],
  [['hotel', 'hostel', 'guesthouse', 'inn', 'resort', 'accommodation'], 'rest'],
  [['museum', 'gallery', 'church', 'cathedral', 'mosque', 'temple', 'monument', 'landmark', 'palace', 'castle', 'square', 'bridge', 'harbour', 'market', 'park', 'beach', 'mountain'], 'activity'],
];

function inferCategoryFromInstanceOf(instanceOf) {
  if (!instanceOf) return null;
  const lower = instanceOf.toLowerCase();
  for (const [keywords, cat] of INSTANCE_OF_CATEGORY) {
    if (keywords.some(k => lower.includes(k))) return cat;
  }
  return null;
}

function AddCard({ draft, onChange, onAdd, onCancel }) {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [wdHint, setWdHint] = useState(null); // { description, instance_of }
  const wdTimerRef = useRef(null);

  function handleTitleChange(e) {
    const val = e.target.value;
    onChange(p => ({ ...p, title: val }));

    // Local static suggestions
    if (val.trim().length >= 1) {
      const filtered = ACTIVITY_SUGGESTIONS.filter(s =>
        s.toLowerCase().includes(val.toLowerCase())
      ).slice(0, 5);
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
      setWdHint(null);
    }

    // Wikidata smart autofill — debounced 500ms, triggers at ≥3 chars
    clearTimeout(wdTimerRef.current);
    if (val.trim().length >= 3) {
      wdTimerRef.current = setTimeout(async () => {
        const result = await wikidataFetch(val.trim());
        if (!result) { setWdHint(null); return; }
        setWdHint(result);
        const inferredCat = inferCategoryFromInstanceOf(result.instance_of);
        if (inferredCat) onChange(p => ({ ...p, category: inferredCat }));
      }, 500);
    } else {
      setWdHint(null);
    }
  }

  function pickSuggestion(s) {
    onChange(p => ({ ...p, title: s }));
    setSuggestions([]);
    setShowSuggestions(false);
  }

  function handleInspireRandom() {
    const s = ACTIVITY_SUGGESTIONS[Math.floor(Math.random() * ACTIVITY_SUGGESTIONS.length)];
    onChange(p => ({ ...p, title: s }));
    setShowSuggestions(false);
  }

  return (
    <div
      className="rounded-lg p-3 flex flex-col gap-2 mt-1"
      style={{ background: '#141619', border: '1px dashed #2a2f36' }}
    >
      <div className="flex items-center justify-between">
        <div className="label-tag text-[9px]">NEW BLOCK</div>
        <button
          type="button"
          onClick={handleInspireRandom}
          className="text-[8px] font-mono px-2 py-0.5 rounded border border-[#E67E22]/40 text-[#E67E22] hover:bg-[#E67E22]/10 transition-colors tracking-widest"
        >
          ✦ INSPIRE ME
        </button>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <input
          value={draft.time}
          onChange={e => onChange(p => ({ ...p, time: e.target.value }))}
          type="time"
          className="bg-[#0E1012] border border-[#2a2f36] rounded px-2 py-1 text-[11px] font-mono text-white focus:outline-none focus:border-[#E67E22]"
        />
        <select
          value={draft.category}
          onChange={e => onChange(p => ({ ...p, category: e.target.value }))}
          className="bg-[#0E1012] border border-[#2a2f36] rounded px-2 py-1 text-[11px] font-mono text-slate-300 focus:outline-none focus:border-[#E67E22]"
        >
          {Object.keys(CATEGORY_COLORS).filter(k => k !== 'default').map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
      <div className="relative">
        <input
          value={draft.title}
          onChange={handleTitleChange}
          onKeyDown={e => {
            if (e.key === 'Enter' && !showSuggestions) onAdd();
            if (e.key === 'Escape') setShowSuggestions(false);
          }}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          placeholder="Activity name…"
          className="bg-[#0E1012] border border-[#2a2f36] rounded px-2 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-[#E67E22] w-full"
          autoFocus
        />
        {showSuggestions && (
          <div
            className="absolute z-10 left-0 right-0 top-full mt-0.5 rounded border overflow-hidden"
            style={{ background: '#111316', borderColor: '#2a2f36' }}
          >
            {suggestions.map(s => (
              <button
                key={s}
                type="button"
                onMouseDown={() => pickSuggestion(s)}
                className="w-full text-left px-2.5 py-1.5 text-[11px] font-mono text-slate-300 hover:text-[#E67E22] hover:bg-[#E67E22]/5 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
      {wdHint?.description && (
        <div
          className="rounded px-2 py-1.5 text-[10px] font-mono leading-relaxed"
          style={{ background: '#0c0e10', border: '1px solid #1e2328', color: '#6b7280' }}
        >
          <span style={{ color: '#E67E22' }}>✦ </span>
          {wdHint.description}
          {wdHint.instance_of && (
            <span className="ml-2 text-[8px] tracking-widest uppercase" style={{ color: '#374151' }}>
              [{wdHint.instance_of}]
            </span>
          )}
        </div>
      )}
      <div className="grid grid-cols-2 gap-1.5">
        <input
          value={draft.icon}
          onChange={e => onChange(p => ({ ...p, icon: e.target.value }))}
          placeholder="Icon 📍"
          className="bg-[#0E1012] border border-[#2a2f36] rounded px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-[#E67E22]"
        />
        <input
          value={draft.duration}
          onChange={e => onChange(p => ({ ...p, duration: e.target.value }))}
          placeholder="Min"
          type="number"
          className="bg-[#0E1012] border border-[#2a2f36] rounded px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-[#E67E22]"
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={onAdd}
          disabled={!draft.title.trim()}
          className="flex-1 py-1 text-[10px] font-mono font-bold tracking-widest rounded transition-colors disabled:opacity-40"
          style={{ background: '#E67E22', color: '#0E1012' }}
        >
          + ADD BLOCK
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1 text-[10px] font-mono tracking-widest rounded border border-[#2a2f36] text-slate-500 hover:text-slate-300 transition-colors"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
