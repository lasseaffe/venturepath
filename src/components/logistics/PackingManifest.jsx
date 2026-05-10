import { useState, useMemo, useEffect } from 'react';
import { generatePackingList, groupByCategory, getItemsByTag } from '../../utils/packingLogic';
import sentinelBus from '../../utils/sentinelBus.js';
import { buildInsights } from '../../utils/architectEngine.js';
import InsightCard from '../ui/InsightCard.jsx';
import { useTripStore } from '../../store/useTripStore.jsx';

export default function PackingManifest({ climate = 'temperate', days = 7, hasChildren = false }) {
  const { addInsight, architect } = useTripStore();
  const [criticalIds, setCriticalIds] = useState(new Set());
  const [packed, setPacked] = useState({});
  const [filter, setFilter] = useState('ALL');
  const [customItems, setCustomItems] = useState([]);
  const [addingTo, setAddingTo] = useState(null);
  const [draftLabel, setDraftLabel] = useState('');

  useEffect(() => {
    const unsub = sentinelBus.on('HAZARD_UPDATED', ({ hazards }) => {
      const ids = new Set();
      hazards.forEach(h => {
        (h.affectedGearTags ?? []).forEach(tag => {
          getItemsByTag(tag).forEach(id => ids.add(id));
        });
      });
      setCriticalIds(ids);
      buildInsights('HAZARD_UPDATED', { hazards }, {}).forEach(insight => addInsight(insight));
    });
    return unsub;
  }, [addInsight]);

  const { items, totalWeight: engineWeight } = useMemo(
    () => generatePackingList({ climate, days, hasChildren }),
    [climate, days, hasChildren]
  );

  const grouped = useMemo(() => {
    const base = groupByCategory(items);
    for (const ci of customItems) {
      if (!base[ci.category]) base[ci.category] = [];
      if (!base[ci.category].find(i => i.id === ci.id)) base[ci.category].push(ci);
    }
    return base;
  }, [items, customItems]);

  const totalWeight = engineWeight;
  const categories = ['ALL', ...Object.keys(grouped)];

  const visibleGroups = filter === 'ALL'
    ? grouped
    : { [filter]: grouped[filter] ?? [] };

  const allItems = [...items, ...customItems];
  const packedCount = Object.values(packed).filter(Boolean).length;

  const toggle = (id) => setPacked(prev => ({ ...prev, [id]: !prev[id] }));

  const deleteCustom = (id) => {
    setCustomItems(prev => prev.filter(i => i.id !== id));
    setPacked(prev => { const next = { ...prev }; delete next[id]; return next; });
  };

  const commitAdd = (cat) => {
    const label = draftLabel.trim();
    if (!label) { setAddingTo(null); return; }
    const id = `custom_${Date.now()}`;
    setCustomItems(prev => [...prev, { id, label, category: cat, weight: 0, custom: true }]);
    setDraftLabel('');
    setAddingTo(null);
  };

  const toggleCategory = (cat) => {
    const catItems = grouped[cat] ?? [];
    const allPacked = catItems.every(i => packed[i.id]);
    setPacked(prev => {
      const next = { ...prev };
      catItems.forEach(i => { next[i.id] = !allPacked; });
      return next;
    });
  };

  return (
    <div className="tactical-panel p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="label-tag">Packing Manifest</h2>
        <div className="flex gap-3 text-xs font-mono text-slate-400">
          <span>{packedCount}/{allItems.length} packed</span>
          <span>·</span>
          <span>{totalWeight} kg</span>
        </div>
      </div>

      {/* Progress */}
      <div className="h-1.5 bg-[#1e2328] rounded-full overflow-hidden">
        <div
          className="h-full bg-[#E67E22] rounded-full transition-all duration-300"
          style={{ width: `${allItems.length ? (packedCount / allItems.length) * 100 : 0}%` }}
        />
      </div>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`shrink-0 text-[10px] font-mono tracking-widest px-3 py-1 rounded border transition-colors ${
              filter === cat
                ? 'border-[#E67E22] text-[#E67E22] bg-[#E67E22]/10'
                : 'border-[#2a2f36] text-slate-400 hover:border-slate-500'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Insight cards from Sentinel */}
      {architect.insights
        .filter(i => i.targetTab === 'LOGISTICS')
        .slice(0, 3)
        .map(insight => <InsightCard key={insight.id} insight={insight} />)
      }

      {/* Item groups */}
      <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
        {Object.entries(visibleGroups).map(([cat, catItems]) => (
          <div key={cat}>
            <button
              onClick={() => toggleCategory(cat)}
              className="label-tag flex items-center gap-2 hover:text-white transition-colors mb-2"
            >
              <span>{cat}</span>
              <span className="text-slate-500 font-normal normal-case tracking-normal">
                ({catItems.filter(i => packed[i.id]).length}/{catItems.length})
              </span>
            </button>
            <div className="space-y-1">
              {[...catItems].sort((a, b) => {
                const aC = criticalIds.has(a.id) ? 0 : 1;
                const bC = criticalIds.has(b.id) ? 0 : 1;
                return aC - bC;
              }).map(item => (
                <div key={item.id} className="flex items-center gap-3 cursor-pointer group py-1">
                  <div
                    onClick={() => toggle(item.id)}
                    className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                      packed[item.id]
                        ? 'bg-[#E67E22] border-[#E67E22]'
                        : 'border-[#4a5568] group-hover:border-[#E67E22]'
                    }`}
                  >
                    {packed[item.id] && <span className="text-white text-[10px]">✓</span>}
                  </div>
                  <span className={`text-sm flex-1 transition-colors ${packed[item.id] ? 'line-through text-slate-600' : 'text-slate-300'}`}>
                    {item.label}
                    {item.critical && !packed[item.id] && (
                      <span className="ml-2 text-[9px] text-red-400 font-mono">CRITICAL</span>
                    )}
                    {criticalIds.has(item.id) && (
                      <span className="ml-2 text-xs font-bold text-red-500 uppercase tracking-wide">Critical</span>
                    )}
                  </span>
                  {item.custom ? (
                    <button
                      onClick={() => deleteCustom(item.id)}
                      className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 text-sm font-mono transition-opacity"
                      title="Remove"
                    >×</button>
                  ) : (
                    <span className="text-xs text-slate-600 font-mono">{item.weight}kg</span>
                  )}
                </div>
              ))}
            </div>
            {addingTo === cat ? (
              <div className="flex gap-1 mt-2">
                <input
                  autoFocus
                  value={draftLabel}
                  onChange={e => setDraftLabel(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') commitAdd(cat); if (e.key === 'Escape') { setAddingTo(null); setDraftLabel(''); } }}
                  placeholder="Item name…"
                  className="flex-1 bg-[#0E1012] border border-[#E67E22]/40 rounded px-2 py-1 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-[#E67E22]"
                />
                <button onClick={() => commitAdd(cat)} className="text-xs font-mono text-[#E67E22] hover:text-white transition-colors px-1">✓</button>
                <button onClick={() => { setAddingTo(null); setDraftLabel(''); }} className="text-xs font-mono text-slate-600 hover:text-white transition-colors px-1">✕</button>
              </div>
            ) : (
              <button
                onClick={() => setAddingTo(cat)}
                className="mt-1 text-[10px] font-mono text-slate-600 hover:text-[#E67E22] transition-colors"
              >+ add item</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
