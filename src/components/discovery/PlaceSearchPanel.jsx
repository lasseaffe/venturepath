import { useState, useRef, useCallback } from 'react';
import { searchPlaces, searchByCategory, getInspireQuery } from '../../utils/foursquareEngine';
import { POI_CATEGORIES } from '../../utils/poiCategories';

export default function PlaceSearchPanel({ open, nearCity = '', onClose, onAddToItinerary }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [inspireLabel, setInspireLabel] = useState(null);
  const debounceRef = useRef(null);

  const doSearch = useCallback(async (q, catId) => {
    setLoading(true);
    setInspireLabel(null);
    const res = catId
      ? await searchByCategory(catId, nearCity, 10)
      : await searchPlaces(q || 'popular', nearCity, 10);
    setResults(res);
    setLoading(false);
  }, [nearCity]);

  function handleQueryChange(e) {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val, category), 350);
  }

  function handleCategory(catId) {
    setCategory(catId);
    doSearch(query, catId);
  }

  function handleInspire() {
    const q = getInspireQuery('discovery');
    setQuery('');
    setCategory(null);
    setInspireLabel(q);
    setLoading(true);
    searchPlaces(q, nearCity, 10).then(res => {
      setResults(res);
      setLoading(false);
    });
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 40,
          background: 'rgba(0,0,0,0.55)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 0.2s ease',
        }}
      />

      {/* Drawer */}
      <div
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0,
          width: '400px', zIndex: 50,
          background: '#0E1012',
          borderLeft: '1px solid #1e2328',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div className="px-4 py-3 flex items-center justify-between shrink-0" style={{ borderBottom: '1px solid #1e2328', background: '#0c0e10' }}>
          <div>
            <div className="text-[9px] font-mono tracking-[0.2em] text-[#E67E22] uppercase">Discover Places</div>
            <div className="text-[11px] font-mono font-bold text-white tracking-wider mt-0.5 uppercase">
              {nearCity || 'Anywhere'}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleInspire}
              className="text-[9px] font-mono px-2.5 py-1 rounded border border-[#E67E22]/40 text-[#E67E22] hover:bg-[#E67E22]/10 transition-colors tracking-widest"
            >
              ✦ INSPIRE ME
            </button>
            <button
              onClick={onClose}
              className="w-6 h-6 flex items-center justify-center rounded border border-[#2a2f36] text-slate-500 hover:text-white hover:border-[#3a3f46] transition-colors text-sm"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Search input */}
        <div className="px-4 py-3 shrink-0" style={{ borderBottom: '1px solid #1e2328' }}>
          <input
            type="text"
            value={query}
            onChange={handleQueryChange}
            placeholder="Search for a place…"
            className="w-full bg-[#111316] border border-[#2a2f36] rounded px-3 py-2 text-sm text-white placeholder-slate-600 font-mono focus:outline-none focus:border-[#E67E22]/50"
          />
        </div>

        {/* Category pills */}
        <div className="px-4 py-2 flex gap-1.5 flex-wrap shrink-0" style={{ borderBottom: '1px solid #1e2328' }}>
          {/* All pill */}
          <button
            onClick={() => handleCategory(null)}
            className="text-[8px] font-mono px-2 py-1 rounded border transition-colors tracking-widest"
            style={{
              background: category === null ? 'rgba(230,126,34,0.15)' : 'transparent',
              borderColor: category === null ? 'rgba(230,126,34,0.5)' : '#1e2328',
              color: category === null ? '#E67E22' : '#4b5563',
            }}
          >
            🔍 ALL
          </button>
          {POI_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => handleCategory(cat.id)}
              className="text-[8px] font-mono px-2 py-1 rounded border transition-colors tracking-widest"
              style={{
                background: category === cat.id ? `${cat.color}26` : 'transparent',
                borderColor: category === cat.id ? `${cat.color}80` : '#1e2328',
                color: category === cat.id ? cat.color : '#4b5563',
              }}
            >
              {cat.icon} {cat.label.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {inspireLabel && (
            <div className="text-[9px] font-mono text-slate-500 tracking-widest mb-3">
              SHOWING: «{inspireLabel}» NEAR {(nearCity || 'ANYWHERE').toUpperCase()}
            </div>
          )}

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="rounded-lg p-3 border border-[#1e2328] animate-pulse">
                  <div className="h-4 rounded bg-[#1a1e22] w-2/3 mb-2" />
                  <div className="h-3 rounded bg-[#1a1e22] w-1/2" />
                </div>
              ))}
            </div>
          ) : results.length === 0 ? (
            <div className="py-12 text-center">
              <div className="text-2xl mb-3">✦</div>
              <div className="text-[10px] font-mono text-slate-600 tracking-widest">
                SEARCH OR HIT INSPIRE ME
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {results.map(p => (
                <div
                  key={p.id}
                  className="rounded-lg p-3 border border-[#1e2328] group transition-all"
                  style={{ background: '#111316' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#E67E22'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#1e2328'; }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-mono font-bold text-white">{p.name}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5 truncate">{p.address}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[8px] font-mono px-1.5 py-0.5 rounded" style={{ background: 'rgba(230,126,34,0.15)', color: '#E67E22', border: '1px solid rgba(230,126,34,0.3)' }}>
                          {p.type.toUpperCase()}
                        </span>
                        {p.rating && (
                          <span className="text-[9px] font-mono text-[#E67E22]">★ {p.rating}</span>
                        )}
                      </div>
                    </div>
                    {onAddToItinerary && (
                      <button
                        onClick={() => onAddToItinerary(p)}
                        className="shrink-0 text-[8px] font-mono px-2 py-1 rounded border border-[#2a2f36] text-slate-500 hover:text-[#E67E22] hover:border-[#E67E22]/40 transition-colors tracking-widest opacity-0 group-hover:opacity-100"
                      >
                        + ADD
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
