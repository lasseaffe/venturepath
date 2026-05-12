// src/components/logistics/PackingChecklist.jsx
import { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useDraggable } from '@dnd-kit/core';
import { groupByCategory } from '../../utils/packingLogic';
import { useDragCtx } from './bag/DragContext';

const ALL_CATEGORIES = ['Shelter & Sleep', 'Food & Water', 'Clothing', 'Medical', 'Navigation', 'Base Camp', 'Tech & Power'];

const BACKPACK_ZONE_TO_CATS = {
  main:         ['Shelter & Sleep', 'Food & Water', 'Clothing'],
  top_lid:      ['Medical', 'Navigation'],
  front_pocket: ['Base Camp'],
  hip_belt:     ['Tech & Power'],
  side_pocket:  [],
};

function buildZoneToCats(bagType) {
  if (!bagType?.defaultZoneForCategory) return BACKPACK_ZONE_TO_CATS;
  const map = {};
  ALL_CATEGORIES.forEach(cat => {
    const zoneId = bagType.defaultZoneForCategory(cat);
    if (!map[zoneId]) map[zoneId] = [];
    map[zoneId].push(cat);
  });
  return map;
}

function DraggableItem({ item, packed, onToggle, highlighted }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: item.id });
  const { mobileSelected, handleMobileTap } = useDragCtx();
  const isMobileSelected = mobileSelected === item.id;

  function handleToggle(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    onToggle(item.id, rect);
    window.dispatchEvent(new CustomEvent('onboarding:action', { detail: { id: 'gear-checked' } }));
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '5px 0',
        paddingLeft: highlighted ? 4 : 0,
        opacity: isDragging ? 0.4 : 1,
        borderLeft: isMobileSelected
          ? '2px solid #E67E22'
          : highlighted
          ? '2px solid rgba(230,126,34,0.5)'
          : '2px solid transparent',
        background: highlighted ? 'rgba(230,126,34,0.05)' : 'transparent',
        transition: 'border-color 0.15s, opacity 0.15s, background 0.15s',
      }}
    >
      {/* Drag handle — desktop only */}
      <span
        {...listeners} {...attributes}
        style={{ color: '#444', fontSize: 12, cursor: 'grab', userSelect: 'none', touchAction: 'none', lineHeight: 1, padding: '2px 3px' }}
        className="hidden sm:inline"
        onClick={e => e.stopPropagation()}
      >⠿</span>

      {/* Mobile tap-select */}
      <span
        onClick={() => handleMobileTap(item.id)}
        style={{ color: isMobileSelected ? '#E67E22' : '#444', fontSize: 12, cursor: 'pointer', userSelect: 'none', lineHeight: 1 }}
        className="sm:hidden"
      >⠿</span>

      <div
        onClick={handleToggle}
        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
          packed[item.id] ? 'bg-[#E67E22] border-[#E67E22]' : 'border-[#4a5568] hover:border-[#E67E22]'
        }`}
      >
        {packed[item.id] && <span className="text-white text-[10px]">✓</span>}
      </div>

      <span
        onClick={handleToggle}
        className={`text-sm flex-1 transition-colors cursor-pointer ${
          packed[item.id] ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-secondary)]'
        }`}
      >
        {item.label}
        {item.critical && !packed[item.id] && (
          <span className="ml-2 text-[9px] text-red-400 font-mono">CRITICAL</span>
        )}
      </span>
      <span className="text-xs text-[var(--text-muted)] font-mono">{item.weight ?? 0}kg</span>
    </div>
  );
}

export default function PackingChecklist({
  items,
  unassignedItems,
  packed,
  onToggle,
  highlightedZone,
  hoveredZone,
  overweightBag,
  activeBagType,
  activeBagLabel,
  zoneMap,
}) {
  const zoneToCats = useMemo(() => buildZoneToCats(activeBagType), [activeBagType]);

  const [collapsed, setCollapsed] = useState({});
  const [flashing, setFlashing]   = useState([]);
  const [sortMode, setSortMode]   = useState('category');
  const collapsedRef = useRef(collapsed);
  collapsedRef.current = collapsed;
  const hoverExpandedRef = useRef({});

  useEffect(() => {
    if (!highlightedZone) return;
    const cats = zoneToCats[highlightedZone] ?? [];
    if (!cats.length) return;
    setCollapsed(prev => {
      const next = { ...prev };
      cats.forEach(c => { next[c] = false; });
      return next;
    });
    setFlashing(cats);
    const t = setTimeout(() => setFlashing([]), 1500);
    return () => clearTimeout(t);
  }, [highlightedZone, zoneToCats]);

  useEffect(() => {
    if (!hoveredZone) {
      const snapshot = hoverExpandedRef.current;
      if (Object.keys(snapshot).length) {
        hoverExpandedRef.current = {};
        setCollapsed(prev => ({ ...prev, ...snapshot }));
      }
      return;
    }
    const cats = zoneToCats[hoveredZone] ?? [];
    if (!cats.length) return;
    const toExpand = cats.filter(c => collapsedRef.current[c] !== false);
    if (!toExpand.length) return;
    const snapshot = {};
    toExpand.forEach(c => { snapshot[c] = collapsedRef.current[c]; });
    hoverExpandedRef.current = snapshot;
    setCollapsed(prev => {
      const next = { ...prev };
      toExpand.forEach(c => { next[c] = false; });
      return next;
    });
  }, [hoveredZone, zoneToCats]);

  const grouped      = groupByCategory(items);
  const packedCount  = items.filter(i => packed[i.id]).length;
  const pct          = items.length ? Math.round((packedCount / items.length) * 100) : 0;
  const zoneLabel    = (id) => activeBagType?.zones?.[id]?.label ?? id.replace(/_/g, ' ');
  const hoveredCats  = hoveredZone ? (zoneToCats[hoveredZone] ?? []) : [];

  function toggleCollapse(cat) { setCollapsed(prev => ({ ...prev, [cat]: !prev[cat] })); }

  return (
    <div data-tour="packing" className="flex flex-col h-full">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-3">
        <span className="label-tag">Gear Manifest</span>
        <div className="flex items-center gap-2">
          {/* Sort mode toggle */}
          {['category', 'zone'].map(mode => (
            <button
              key={mode}
              onClick={() => setSortMode(mode)}
              style={{
                fontSize: 7, fontFamily: 'JetBrains Mono, monospace',
                padding: '2px 6px', borderRadius: 2,
                background: sortMode === mode ? 'rgba(230,126,34,0.12)' : 'none',
                border: `1px solid ${sortMode === mode ? '#E67E22' : '#2a2f36'}`,
                color: sortMode === mode ? '#E67E22' : '#4a5568',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              {mode === 'category' ? 'BY CAT' : 'BY ZONE'}
            </button>
          ))}
          <span className="text-[10px] font-mono text-[var(--text-secondary)]">
            {packedCount}/{items.length} · {pct}%
          </span>
        </div>
      </div>

      {/* ── Progress bar ── */}
      <div className="h-1 bg-[#1e2328] rounded-full overflow-hidden mb-3">
        <motion.div
          className="h-full bg-[#E67E22] rounded-full"
          animate={{ width: `${pct}%` }}
          transition={{ type: 'spring', stiffness: 80 }}
        />
      </div>

      {/* ── Zone hover indicator ── */}
      {hoveredZone && (
        <div style={{
          marginBottom: 8, padding: '5px 8px',
          background: 'rgba(230,126,34,0.07)',
          border: '1px solid rgba(230,126,34,0.28)',
          borderRadius: 3, display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ color: '#E67E22', fontSize: 7, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.1em' }}>
            ▸ {zoneLabel(hoveredZone).toUpperCase()}
          </span>
          {hoveredCats.length > 0 && (
            <span style={{ color: '#D9C5B2', fontSize: 7, fontFamily: 'JetBrains Mono, monospace', opacity: 0.5 }}>
              {hoveredCats.join(' · ')}
            </span>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-4 pr-1">

        {/* ══ Zone view ══ */}
        {sortMode === 'zone' && (
          Object.keys(zoneMap ?? {}).length > 0
            ? Object.entries(zoneMap ?? {}).map(([zoneId, zoneItems]) => {
                const zPacked = zoneItems.filter(i => packed[i.id]).length;
                return (
                  <div key={zoneId}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span className="label-tag">{zoneLabel(zoneId)}</span>
                      <span style={{ color: '#4a5568', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}>
                        {zPacked}/{zoneItems.length}
                      </span>
                    </div>
                    {zoneItems.map(item => (
                      <DraggableItem key={item.id} item={item} packed={packed} onToggle={onToggle} />
                    ))}
                  </div>
                );
              })
            : (
              <div style={{ color: '#4a5568', fontSize: 9, fontFamily: 'JetBrains Mono, monospace', textAlign: 'center', marginTop: 24 }}>
                No items assigned to zones yet
              </div>
            )
        )}

        {/* ══ Category view ══ */}
        {sortMode === 'category' && Object.entries(grouped).map(([cat, catItems]) => {
          const catPacked          = catItems.filter(i => packed[i.id]).length;
          const isCollapsed        = collapsed[cat];
          const isHoverHighlighted = hoveredZone && (zoneToCats[hoveredZone] ?? []).includes(cat);
          const isClickFlashing    = flashing.includes(cat);
          return (
            <div key={cat}>
              <button
                onClick={() => toggleCollapse(cat)}
                className="w-full flex items-center gap-2 mb-1 group"
                style={isHoverHighlighted ? {
                  outline: '1px solid #E67E22', borderRadius: 4,
                  background: 'rgba(230,126,34,0.08)', padding: '0 4px',
                } : isClickFlashing ? {
                  outline: '1px solid #E67E22', borderRadius: 4,
                  boxShadow: '0 0 8px rgba(230,126,34,0.35)',
                } : {}}
              >
                <span className="label-tag text-left group-hover:text-white transition-colors">{cat}</span>
                <span className="text-[var(--text-muted)] text-[10px] font-mono">{catPacked}/{catItems.length}</span>
                <span className="ml-auto text-[var(--text-muted)] text-[10px] font-mono">{isCollapsed ? '▸' : '▾'}</span>
              </button>
              {!isCollapsed && (
                <div className="space-y-1">
                  {catItems.map(item => (
                    <DraggableItem key={item.id} item={item} packed={packed} onToggle={onToggle} />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* ══ Unassigned gear ══ */}
        {unassignedItems?.length > 0 && (
          <div style={{ marginTop: 12, paddingTop: 8, borderTop: '1px solid #1c2124' }}>
            <div style={{ color: '#666', fontSize: 7, fontFamily: 'JetBrains Mono, monospace', letterSpacing: 1, marginBottom: 6 }}>
              UNASSIGNED GEAR
            </div>
            {unassignedItems.map(item => (
              <DraggableItem
                key={item.id} item={item} packed={packed} onToggle={onToggle}
                highlighted={hoveredCats.includes(item.category)}
              />
            ))}
          </div>
        )}

        {/* Drop zone hint */}
        <div style={{
          marginTop: 8,
          border: '1px dashed #E67E2240', borderRadius: 3,
          padding: '5px 8px', textAlign: 'center',
          color: '#E67E2260', fontSize: 7,
          fontFamily: 'JetBrains Mono, monospace',
        }}>
          DRAG ITEMS HERE FROM OTHER BAGS
        </div>

        {/* Weight warning */}
        {overweightBag && activeBagType && (
          <div style={{
            marginTop: 8,
            background: '#F2A90015', border: '1px solid #F2A900',
            borderRadius: 3, padding: '5px 8px',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{ color: '#F2A900', fontSize: 14 }}>⚠</span>
            <span style={{ color: '#F2A900', fontSize: 7, fontFamily: 'JetBrains Mono, monospace' }}>
              {activeBagType.weightLimitNote
                ? `Exceeds ${activeBagType.weightLimitNote.toLowerCase()}`
                : `${activeBagLabel ?? activeBagType.label} may be overpacked`}
            </span>
          </div>
        )}

      </div>
    </div>
  );
}
