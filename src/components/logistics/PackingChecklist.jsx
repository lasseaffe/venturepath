// src/components/logistics/PackingChecklist.jsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import { groupByCategory } from '../../utils/packingLogic';

export default function PackingChecklist({ items, packed, onToggle }) {
  const [collapsed, setCollapsed] = useState({});
  const grouped = groupByCategory(items);

  const packedCount = Object.values(packed).filter(Boolean).length;
  const pct = items.length ? Math.round((packedCount / items.length) * 100) : 0;

  function handleToggle(item, e) {
    const rect = e.currentTarget.getBoundingClientRect();
    onToggle(item.id, rect);
  }

  function toggleCollapse(cat) {
    setCollapsed(prev => ({ ...prev, [cat]: !prev[cat] }));
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <span className="label-tag">Gear Manifest</span>
        <span className="text-[10px] font-mono text-slate-400">
          {packedCount}/{items.length} · {pct}%
        </span>
      </div>

      <div className="h-1 bg-[#1e2328] rounded-full overflow-hidden mb-4">
        <motion.div
          className="h-full bg-[#E67E22] rounded-full"
          animate={{ width: `${pct}%` }}
          transition={{ type: 'spring', stiffness: 80 }}
        />
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {Object.entries(grouped).map(([cat, catItems]) => {
          const catPacked = catItems.filter(i => packed[i.id]).length;
          const isCollapsed = collapsed[cat];
          return (
            <div key={cat}>
              <button
                onClick={() => toggleCollapse(cat)}
                className="w-full flex items-center gap-2 mb-1 group"
              >
                <span className="label-tag text-left group-hover:text-white transition-colors">
                  {cat}
                </span>
                <span className="text-slate-500 text-[10px] font-mono">
                  {catPacked}/{catItems.length}
                </span>
                <span className="ml-auto text-slate-600 text-[10px] font-mono">
                  {isCollapsed ? '▸' : '▾'}
                </span>
              </button>

              {!isCollapsed && (
                <div className="space-y-1">
                  {catItems.map(item => (
                    <label
                      key={item.id}
                      onClick={(e) => handleToggle(item, e)}
                      className="flex items-center gap-3 cursor-pointer group py-1"
                    >
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                          packed[item.id]
                            ? 'bg-[#E67E22] border-[#E67E22]'
                            : 'border-[#4a5568] group-hover:border-[#E67E22]'
                        }`}
                      >
                        {packed[item.id] && (
                          <span className="text-white text-[10px]">✓</span>
                        )}
                      </div>
                      <span className={`text-sm flex-1 transition-colors ${
                        packed[item.id] ? 'line-through text-slate-600' : 'text-slate-300'
                      }`}>
                        {item.label}
                        {item.critical && !packed[item.id] && (
                          <span className="ml-2 text-[9px] text-red-400 font-mono">CRITICAL</span>
                        )}
                      </span>
                      <span className="text-xs text-slate-600 font-mono">{item.weight}kg</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
