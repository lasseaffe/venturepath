import { useState, useEffect, useCallback } from 'react';
import { searchByCategory, searchPlaces, getInspireQuery, FSQ_CATEGORIES } from '../../utils/foursquareEngine';

export default function MustSee({ destination = 'Patagonia' }) {
  const [spots, setSpots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inspireLabel, setInspireLabel] = useState(null);

  const load = useCallback(async (query = null) => {
    setLoading(true);
    const results = query
      ? await searchPlaces(query, destination, 6)
      : await searchByCategory(FSQ_CATEGORIES.attractions, destination, 6);
    setSpots(results);
    setLoading(false);
  }, [destination]);

  useEffect(() => { load(); }, [load]);

  function handleInspire() {
    const q = getInspireQuery('discovery');
    setInspireLabel(q);
    load(q);
  }

  return (
    <div className="tactical-panel p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="label-tag">Must-See — {destination}</h2>
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
              <div className="w-6 h-5 rounded bg-[#1a1e22]" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 rounded bg-[#1a1e22] w-2/3" />
                <div className="h-3 rounded bg-[#1a1e22] w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : spots.length === 0 ? (
        <div className="py-6 text-center text-[10px] font-mono text-slate-600 tracking-widest">
          NO RESULTS — TRY INSPIRE ME
        </div>
      ) : (
        <div className="space-y-3">
          {spots.map((s, idx) => (
            <div key={s.id} className="flex gap-3 items-start">
              <span className="text-[#E67E22] font-mono text-sm mt-0.5 shrink-0">
                {String(idx + 1).padStart(2, '0')}
              </span>
              <div>
                <div className="text-white text-sm font-semibold">{s.name}</div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {s.type}
                  {s.rating && ` · ${'★'.repeat(Math.round(Number(s.rating)))}`}
                </div>
                {s.address && (
                  <div className="text-xs text-slate-500 mt-1 italic">{s.address}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
