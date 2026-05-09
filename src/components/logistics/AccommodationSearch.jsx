import { useState, useRef, useCallback } from 'react';
import { searchByCategory, searchPlaces, getInspireQuery, FSQ_CATEGORIES } from '../../utils/foursquareEngine';
import { useTripStore } from '../../store/useTripStore';

const TYPE_FILTERS = [
  { label: 'Hotel',     query: 'hotel',        catId: FSQ_CATEGORIES.hotels },
  { label: 'Hostel',    query: 'hostel',        catId: null },
  { label: 'Apartment', query: 'apartment stay',catId: null },
  { label: 'Camping',   query: 'campsite',      catId: null },
];

export default function AccommodationSearch() {
  const { trip } = useTripStore();
  const destination = trip?.destination ?? '';
  const [activeType, setActiveType] = useState(TYPE_FILTERS[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [inspireLabel, setInspireLabel] = useState(null);
  const debounceRef = useRef(null);

  const doSearch = useCallback(async (q, type) => {
    setLoading(true);
    setInspireLabel(null);
    setSearched(true);
    const near = q || destination;
    const res = type.catId
      ? await searchByCategory(type.catId, near, 8)
      : await searchPlaces(type.query, near, 8);
    setResults(res);
    setLoading(false);
  }, [destination]);

  function handleTypeChange(type) {
    setActiveType(type);
    doSearch(searchQuery, type);
  }

  function handleQueryChange(e) {
    const val = e.target.value;
    setSearchQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val, activeType), 350);
  }

  function handleInspire() {
    const q = getInspireQuery('stay') + ' accommodation';
    setInspireLabel(q);
    setLoading(true);
    setSearched(true);
    searchPlaces(q, destination, 8).then(res => {
      setResults(res);
      setLoading(false);
    });
  }

  return (
    <div className="tactical-panel p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="label-tag">Stays{destination ? ` — ${destination}` : ''}</h2>
        <button
          onClick={handleInspire}
          className="text-[9px] font-mono px-2.5 py-1 rounded border border-[#E67E22]/40 text-[#E67E22] hover:bg-[#E67E22]/10 transition-colors tracking-widest"
        >
          ✦ INSPIRE ME
        </button>
      </div>

      {/* Type filter */}
      <div className="flex gap-1.5 flex-wrap">
        {TYPE_FILTERS.map(t => (
          <button
            key={t.label}
            onClick={() => handleTypeChange(t)}
            className="text-[9px] font-mono px-2.5 py-1 rounded border transition-colors tracking-widest"
            style={{
              background: activeType.label === t.label ? 'rgba(230,126,34,0.15)' : 'transparent',
              borderColor: activeType.label === t.label ? 'rgba(230,126,34,0.5)' : '#2a2f36',
              color: activeType.label === t.label ? '#E67E22' : '#64748b',
            }}
          >
            {t.label.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Search input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={searchQuery}
          onChange={handleQueryChange}
          placeholder={`Search ${activeType.label.toLowerCase()}s near ${destination || 'city'}…`}
          className="flex-1 bg-[#0E1012] border border-[#2a2f36] rounded px-3 py-2 text-sm text-white placeholder-slate-600 font-mono focus:outline-none focus:border-[#E67E22]/50"
        />
        <button
          onClick={() => doSearch(searchQuery, activeType)}
          className="px-3 py-2 rounded border border-[#E67E22]/50 text-[#E67E22] text-[10px] font-mono hover:bg-[#E67E22]/10 transition-colors tracking-widest"
        >
          SEARCH
        </button>
      </div>

      {inspireLabel && (
        <div className="text-[9px] font-mono text-slate-500 tracking-widest">
          SHOWING: «{inspireLabel}» NEAR {(destination || 'ANYWHERE').toUpperCase()}
        </div>
      )}

      {/* Results */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-[#0E1012] rounded-lg p-3 flex items-center justify-between gap-3 animate-pulse">
              <div className="space-y-1.5 flex-1">
                <div className="h-4 rounded bg-[#1a1e22] w-2/3" />
                <div className="h-3 rounded bg-[#1a1e22] w-1/3" />
              </div>
              <div className="w-14 h-5 rounded bg-[#1a1e22]" />
            </div>
          ))}
        </div>
      ) : !searched ? (
        <div className="py-8 text-center text-[10px] font-mono text-slate-600 tracking-widest">
          SEARCH FOR STAYS OR HIT ✦ INSPIRE ME
        </div>
      ) : results.length === 0 ? (
        <div className="py-8 text-center text-[10px] font-mono text-slate-600 tracking-widest">
          NO RESULTS — TRY A DIFFERENT QUERY
        </div>
      ) : (
        <div className="space-y-2">
          {results.map(p => (
            <div
              key={p.id}
              className="bg-[#0E1012] rounded-lg p-3 flex items-center justify-between gap-3 border border-[#1e2328] hover:border-[#E67E22]/30 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm font-semibold">{p.name}</div>
                <div className="text-xs text-slate-400 mt-0.5 truncate">{p.address}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[8px] font-mono text-slate-500">{p.type}</span>
                  {p.rating && (
                    <span className="text-[9px] font-mono text-[#E67E22]">★ {p.rating}</span>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <a
                  href={`https://www.booking.com/search.html?ss=${encodeURIComponent(p.name + ' ' + destination)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[9px] font-mono px-2 py-0.5 rounded border border-[#2a2f36] text-slate-400 hover:text-[#E67E22] hover:border-[#E67E22]/40 transition-colors tracking-widest"
                >
                  BOOKING →
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
