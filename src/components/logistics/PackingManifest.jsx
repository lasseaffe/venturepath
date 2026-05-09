import { useState, useMemo } from 'react';
import { generatePackingList, groupByCategory } from '../../utils/packingLogic';

export default function PackingManifest({ climate = 'temperate', days = 7, hasChildren = false }) {
  const [packed, setPacked] = useState({});
  const [filter, setFilter] = useState('ALL');

  const { items, totalWeight } = useMemo(
    () => generatePackingList({ climate, days, hasChildren }),
    [climate, days, hasChildren]
  );

  const grouped = useMemo(() => groupByCategory(items), [items]);
  const categories = ['ALL', ...Object.keys(grouped)];

  const visibleGroups = filter === 'ALL'
    ? grouped
    : { [filter]: grouped[filter] ?? [] };

  const packedCount = Object.values(packed).filter(Boolean).length;

  const toggle = (id) => setPacked(prev => ({ ...prev, [id]: !prev[id] }));
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
          <span>{packedCount}/{items.length} packed</span>
          <span>·</span>
          <span>{totalWeight} kg</span>
        </div>
      </div>

      {/* Progress */}
      <div className="h-1.5 bg-[#1e2328] rounded-full overflow-hidden">
        <div
          className="h-full bg-[#E67E22] rounded-full transition-all duration-300"
          style={{ width: `${(packedCount / items.length) * 100}%` }}
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
              {catItems.map(item => (
                <label key={item.id} className="flex items-center gap-3 cursor-pointer group py-1">
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
                  </span>
                  <span className="text-xs text-slate-600 font-mono">{item.weight}kg</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
