import { useSearchContext } from '../../context/SearchContext';
import { useAdaptiveSearch } from '../../hooks/useAdaptiveSearch';
import { POIDetailSheet } from './POIDetailSheet';

function SkeletonChips() {
  return (
    <div className="flex gap-2 flex-wrap mt-2">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-7 w-20 rounded-full animate-pulse" style={{ background: '#1a1c1f' }} />
      ))}
    </div>
  );
}

function InspireChip({ label, onClick }) {
  return (
    <button onClick={onClick}
            className="px-3 py-1 rounded-full text-xs font-mono font-semibold transition-opacity hover:opacity-80"
            style={{ background: 'rgba(230,126,34,0.15)', color: '#E67E22', border: '1px solid rgba(230,126,34,0.4)' }}>
      {label}
    </button>
  );
}

function ResultRow({ poi, onClick }) {
  return (
    <button onClick={onClick}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left hover:opacity-80 transition-opacity"
            style={{ background: '#0E1012' }}>
      <span className="font-mono text-sm text-white truncate">{poi.name}</span>
      <span className="label-tag ml-2 shrink-0">{poi.category}</span>
    </button>
  );
}

export function AdaptiveSearchBar() {
  const { strategy, destination, userRole, climate } = useSearchContext();

  const {
    query, setQuery,
    results, inspireResults,
    loading,
    handleFocus, handleBlur,
    detailPoi, detailActions,
    openDetail, closeDetail,
  } = useAdaptiveSearch(strategy, destination, userRole, climate);

  const showDropdown = results.length > 0;
  const fallbackChips = strategy.filterMask.map(f => f.split('=')[1]).filter(Boolean);

  return (
    <div className="relative w-full mb-4">
      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={strategy.placeholder}
        className="w-full px-4 py-2 rounded-lg font-mono text-sm outline-none"
        style={{
          background: '#0E1012',
          border: '1px solid #333',
          color: '#fff',
        }}
        onFocusCapture={e => { e.target.style.borderColor = '#E67E22'; }}
        onBlurCapture={e => { e.target.style.borderColor = '#333'; }}
      />

      {!query && (
        <div className="flex gap-2 flex-wrap mt-2 min-h-[28px]">
          {loading && <SkeletonChips />}
          {!loading && inspireResults.length > 0 && inspireResults.map(poi => (
            <InspireChip key={poi.id} label={poi.name}
                         onClick={() => openDetail(poi, strategy.resultActions)} />
          ))}
          {!loading && inspireResults.length === 0 && fallbackChips.map(chip => (
            <InspireChip key={chip} label={chip} onClick={() => setQuery(chip)} />
          ))}
        </div>
      )}

      {showDropdown && (
        <div className="absolute top-full left-0 right-0 z-30 mt-1 rounded-lg flex flex-col gap-1 p-2"
             style={{ background: '#111315', border: '1px solid #E67E2230', boxShadow: '0 8px 24px rgba(0,0,0,0.6)' }}>
          {results.map(poi => (
            <ResultRow key={poi.id} poi={poi}
                       onClick={() => openDetail(poi, strategy.resultActions)} />
          ))}
        </div>
      )}

      {detailPoi && (
        <POIDetailSheet poi={detailPoi} actions={detailActions} onClose={closeDetail} />
      )}
    </div>
  );
}
