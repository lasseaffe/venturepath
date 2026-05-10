import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { generatePackingList, groupByCategory, CATEGORIES } from '../../utils/packingLogic';
import { fetchForecast, classifyClimate } from '../../utils/weatherEngine';

// POI tags the user can toggle to add gear
const AVAILABLE_TAGS = ['Hiking', 'Dinner', 'Swimming', 'Camping', 'Photography', 'Cultural'];

const CATEGORY_ICONS = {
  'Base Camp': '🏕',
  'Navigation': '🧭',
  'Shelter & Sleep': '⛺',
  'Food & Water': '🥾',
  'Medical': '🩺',
  'Clothing': '👕',
  'Tech & Power': '🔋',
};

const ALL_CATEGORIES = Object.values(CATEGORIES);

export default function BentoPacker({ coords, climate: climateProp, days = 7, hasChildren = false }) {
  const [activeTags, setActiveTags] = useState(['Hiking']);
  const [checked, setChecked] = useState({});
  const [forecast, setForecast] = useState(null);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [customItems, setCustomItems] = useState([]);
  const [addingTo, setAddingTo] = useState(null); // category key
  const [draftLabel, setDraftLabel] = useState('');

  // Fetch real weather when coords available
  useEffect(() => {
    if (!coords) return;
    setLoadingWeather(true);
    fetchForecast(coords, days)
      .then(f => setForecast(f))
      .finally(() => setLoadingWeather(false));
  }, [coords, days]);

  const resolvedClimate = useMemo(() => {
    if (climateProp) return climateProp;
    if (forecast) return classifyClimate(forecast);
    return 'temperate';
  }, [climateProp, forecast]);

  const { items } = useMemo(
    () => generatePackingList({ climate: resolvedClimate, days, hasChildren, poiTags: activeTags }),
    [resolvedClimate, days, hasChildren, activeTags]
  );

  const grouped = useMemo(() => {
    const base = groupByCategory(items);
    for (const ci of customItems) {
      if (!base[ci.category]) base[ci.category] = [];
      if (!base[ci.category].find(i => i.id === ci.id)) base[ci.category].push(ci);
    }
    return base;
  }, [items, customItems]);

  function toggleTag(tag) {
    setActiveTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  }

  function toggleItem(id) {
    setChecked(prev => ({ ...prev, [id]: !prev[id] }));
  }

  function deleteItem(id) {
    setCustomItems(prev => prev.filter(i => i.id !== id));
    setChecked(prev => { const next = { ...prev }; delete next[id]; return next; });
  }

  function commitAdd(category) {
    const label = draftLabel.trim();
    if (!label) { setAddingTo(null); return; }
    const id = `custom_${Date.now()}`;
    setCustomItems(prev => [...prev, { id, label, category, weight: 0, custom: true }]);
    setDraftLabel('');
    setAddingTo(null);
  }

  const totalItems = items.length + customItems.length;
  const checkedCount = Object.values(checked).filter(Boolean).length;
  const pct = totalItems ? Math.round((checkedCount / totalItems) * 100) : 0;

  return (
    <div className="tactical-panel p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="label-tag">Bento Packer</div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
            Climate: <span className="text-[#E67E22]">{resolvedClimate}</span>
            {loadingWeather && <span className="text-slate-600 ml-2">fetching weather…</span>}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-mono text-slate-500">{checkedCount}/{totalItems} packed</div>
          <div className="w-24 h-1.5 bg-[#1a1f24] rounded-full mt-1 overflow-hidden">
            <motion.div
              className="h-full bg-[#E2725B] rounded-full"
              animate={{ width: `${pct}%` }}
              transition={{ type: 'spring', stiffness: 80 }}
            />
          </div>
        </div>
      </div>

      {/* Weather strip */}
      {forecast && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {forecast.slice(0, 5).map((d, i) => (
            <div key={i} className="shrink-0 text-center bg-[#0E1012] rounded px-3 py-2 border border-[#1e2328] min-w-[64px]">
              <div className="text-lg">{d.icon}</div>
              <div className="text-[9px] font-mono text-slate-500 mt-1">{d.date.split(',')[0]}</div>
              <div className="text-[10px] font-mono text-white">{d.tempC}°C</div>
            </div>
          ))}
        </div>
      )}

      {/* POI tag toggles */}
      <div className="space-y-1.5">
        <div className="text-[9px] font-mono text-slate-500 tracking-widest">TRIP ACTIVITIES</div>
        <div className="flex flex-wrap gap-1.5">
          {AVAILABLE_TAGS.map(tag => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`px-2.5 py-1 text-[10px] font-mono rounded border transition-colors ${
                activeTags.includes(tag)
                  ? 'bg-[#E2725B]/20 border-[#E2725B] text-[#E2725B]'
                  : 'bg-transparent border-[#2a2f36] text-slate-500 hover:border-[#E67E22]/50 hover:text-slate-300'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Bento grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(grouped).map(([category, catItems]) => {
          const allChecked = catItems.every(i => checked[i.id]);
          const someChecked = catItems.some(i => checked[i.id]);
          return (
            <motion.div
              key={category}
              layout
              className={`rounded-lg p-3 border transition-colors ${
                allChecked
                  ? 'bg-[#E2725B]/10 border-[#E2725B]/60'
                  : someChecked
                  ? 'bg-[#E2725B]/5 border-[#E2725B]/20'
                  : 'bg-[#1a1f24] border-[#1e2328]'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-base">{CATEGORY_ICONS[category] ?? '📦'}</span>
                <span className="text-[9px] font-mono text-slate-400 tracking-widest leading-tight">{category.toUpperCase()}</span>
                {allChecked && <span className="ml-auto text-[#E2725B] text-xs">✓</span>}
              </div>
              <div className="space-y-1.5">
                {catItems.map(item => (
                  <div key={item.id} className="flex items-start gap-2 group">
                    <input
                      type="checkbox"
                      checked={!!checked[item.id]}
                      onChange={() => toggleItem(item.id)}
                      className="mt-0.5 accent-[#E2725B] shrink-0"
                    />
                    <span className={`text-[10px] font-mono leading-tight flex-1 transition-colors ${
                      checked[item.id] ? 'text-slate-600 line-through' : item.critical ? 'text-white' : 'text-slate-400'
                    }`}>
                      {item.label}
                      {item.critical && !checked[item.id] && (
                        <span className="ml-1 text-red-400 text-[8px]">●</span>
                      )}
                    </span>
                    {item.custom && (
                      <button
                        onClick={() => deleteItem(item.id)}
                        className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 text-[10px] font-mono leading-none transition-opacity shrink-0"
                        title="Remove"
                      >×</button>
                    )}
                  </div>
                ))}
              </div>
              {addingTo === category ? (
                <div className="mt-2 flex gap-1">
                  <input
                    autoFocus
                    value={draftLabel}
                    onChange={e => setDraftLabel(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') commitAdd(category); if (e.key === 'Escape') { setAddingTo(null); setDraftLabel(''); } }}
                    placeholder="Item name…"
                    className="flex-1 bg-[#0E1012] border border-[#E2725B]/40 rounded px-2 py-0.5 text-[10px] font-mono text-white placeholder-slate-600 focus:outline-none focus:border-[#E2725B]"
                  />
                  <button onClick={() => commitAdd(category)} className="text-[10px] font-mono text-[#E2725B] hover:text-white transition-colors px-1">✓</button>
                  <button onClick={() => { setAddingTo(null); setDraftLabel(''); }} className="text-[10px] font-mono text-slate-600 hover:text-white transition-colors px-1">✕</button>
                </div>
              ) : (
                <button
                  onClick={() => setAddingTo(category)}
                  className="mt-2 text-[9px] font-mono text-slate-600 hover:text-[#E2725B] transition-colors"
                >+ add item</button>
              )}
              <div className="mt-1 text-[9px] font-mono text-slate-600">
                {catItems.filter(i => checked[i.id]).length}/{catItems.length}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
