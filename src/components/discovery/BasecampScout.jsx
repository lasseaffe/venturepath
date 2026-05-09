import { useState, useEffect, useCallback } from 'react';
import { searchByCategory, searchPlaces, getInspireQuery, FSQ_CATEGORIES } from '../../utils/foursquareEngine';

const ACCOM_QUERIES = ['boutique hotel', 'hostel', 'guesthouse', 'eco lodge', 'bed and breakfast'];

export default function BasecampScout({ destination = 'Patagonia' }) {
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inspireLabel, setInspireLabel] = useState(null);

  const load = useCallback(async (inspireTerm = null) => {
    setLoading(true);
    const results = inspireTerm
      ? await searchPlaces(inspireTerm, destination, 6)
      : await searchByCategory(FSQ_CATEGORIES.hotels, destination, 6);
    setPlaces(results);
    setLoading(false);
  }, [destination]);

  useEffect(() => { load(); }, [load]);

  function handleInspire() {
    const q = ACCOM_QUERIES[Math.floor(Math.random() * ACCOM_QUERIES.length)];
    setInspireLabel(q);
    load(q);
  }

  return (
    <div className="tactical-panel p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="label-tag">Stays — {destination}</h2>
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
            <div key={i} className="bg-[#0E1012] rounded-lg p-3 flex items-center justify-between gap-3 animate-pulse">
              <div className="space-y-1.5 flex-1">
                <div className="h-4 rounded bg-[#1a1e22] w-2/3" />
                <div className="h-3 rounded bg-[#1a1e22] w-1/3" />
              </div>
              <div className="w-16 h-5 rounded bg-[#1a1e22]" />
            </div>
          ))}
        </div>
      ) : places.length === 0 ? (
        <div className="py-6 text-center text-[10px] font-mono text-slate-600 tracking-widest">
          NO RESULTS — TRY INSPIRE ME
        </div>
      ) : (
        <div className="space-y-3">
          {places.map(p => (
            <div key={p.id} className="bg-[#0E1012] rounded-lg p-3 flex items-center justify-between gap-3 border border-[#1e2328] hover:border-[#E67E22]/30 transition-colors">
              <div>
                <div className="text-white text-sm font-semibold">{p.name}</div>
                <div className="flex gap-2 mt-1 text-xs text-slate-400 font-mono flex-wrap">
                  <span>{p.type}</span>
                  {p.address && <><span>·</span><span className="truncate max-w-[160px]">{p.address}</span></>}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                {p.rating && (
                  <span className="text-[#E67E22] text-xs font-mono">★ {p.rating}</span>
                )}
                <a
                  href={`https://www.booking.com/search.html?ss=${encodeURIComponent(p.name + ' ' + destination)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[9px] font-mono px-2 py-0.5 rounded border border-[#2a2f36] text-slate-400 hover:text-[#E67E22] hover:border-[#E67E22]/40 transition-colors tracking-widest"
                >
                  BOOK →
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
