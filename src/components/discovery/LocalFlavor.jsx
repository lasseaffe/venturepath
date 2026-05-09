import { useState, useEffect, useCallback } from 'react';
import { fetchLocalFlavor, searchPlaces, getInspireQuery } from '../../utils/foursquareEngine';

const CAT_COLOR = {
  'Restaurant':    '#E67E22',
  'Bar':           '#3b82f6',
  'Café':          '#a855f7',
  'Local Eatery':  '#E67E22',
  'Food':          '#E67E22',
  'Drink':         '#3b82f6',
  'Culture':       '#a855f7',
  'Market':        '#22c55e',
};

function colorFor(type) {
  return CAT_COLOR[type] ?? '#64748b';
}

export default function LocalFlavor({ destination = 'Patagonia' }) {
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inspireLabel, setInspireLabel] = useState(null);

  const load = useCallback(async (query = null) => {
    setLoading(true);
    const results = query
      ? await searchPlaces(query, destination, 6)
      : await fetchLocalFlavor(destination);
    setPlaces(results);
    setLoading(false);
  }, [destination]);

  useEffect(() => { load(); }, [load]);

  function handleInspire() {
    const q = getInspireQuery('food');
    setInspireLabel(q);
    load(q);
  }

  return (
    <div className="tactical-panel p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="label-tag">Local Flavor — {destination}</h2>
        <button
          onClick={handleInspire}
          className="text-[9px] font-mono px-2.5 py-1 rounded border border-[#E67E22]/40 text-[#E67E22] hover:bg-[#E67E22]/10 transition-colors tracking-widest"
        >
          ✦ INSPIRE ME
        </button>
      </div>

      {inspireLabel && (
        <div className="text-[9px] font-mono text-slate-500 tracking-widest">
          SHOWING: «{inspireLabel}» NEAR {destination.toUpperCase()}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="w-16 h-5 rounded bg-[#1a1e22]" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 rounded bg-[#1a1e22] w-3/4" />
                <div className="h-3 rounded bg-[#1a1e22] w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : places.length === 0 ? (
        <div className="py-6 text-center text-[10px] font-mono text-slate-600 tracking-widest">
          NO RESULTS — TRY INSPIRE ME
        </div>
      ) : (
        <div className="space-y-3">
          {places.map(p => {
            const color = colorFor(p.type);
            return (
              <div key={p.id} className="flex gap-3">
                <span
                  className="text-[10px] font-mono tracking-widest px-2 py-0.5 rounded self-start mt-0.5 shrink-0"
                  style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}
                >
                  {p.type}
                </span>
                <div>
                  <div className="text-white text-sm font-semibold">{p.name}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{p.address}</div>
                  {p.rating && (
                    <div className="text-[10px] font-mono text-[#E67E22] mt-0.5">{'★'.repeat(Math.round(p.rating))} {p.rating}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
