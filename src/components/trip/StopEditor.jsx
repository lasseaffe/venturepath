import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTripStore } from '../../store/useTripStore';
import { searchStops } from '../../utils/stopSearchEngine';
import NearbyDrawer from '../nearby/NearbyDrawer';

const MODES = [
  { value: 'flight', label: '✈ Flight' },
  { value: 'bus',    label: '🚌 Bus' },
  { value: 'foot',   label: '🥾 Foot' },
  { value: 'boat',   label: '⛵ Boat' },
  { value: 'car',    label: '🚗 Car' },
  { value: 'train',  label: '🚆 Train' },
];

function useLocationAutocomplete(query, tripDestination) {
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const debounce = useRef(null);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      setSearching(true);
      const res = await searchStops(query, tripDestination);
      setResults(res);
      setSearching(false);
    }, 400);
    return () => clearTimeout(debounce.current);
  }, [query, tripDestination]);

  return { results, searching, clear: () => setResults([]) };
}

function SuggestionList({ results, onPick }) {
  if (!results.length) return null;
  return (
    <ul
      className="absolute z-20 w-full mt-1 rounded-lg shadow-lg overflow-hidden"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      {results.map(r => (
        <li key={r.id}>
          <button
            type="button"
            onClick={() => onPick(r)}
            className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--surface-raised)]"
            style={{ color: 'var(--text-primary)' }}
          >
            <span className="font-medium">{r.name}</span>
            {r.address && r.address !== r.name && (
              <span className="block text-xs truncate" style={{ color: 'var(--text-muted)' }}>{r.address}</span>
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}

function EntryPicker({ legs, onSelect, onClose }) {
  const allPoints = legs.flatMap(l => [
    { label: l.from, sub: `From — ${l.to}` },
    { label: l.to,   sub: `To — ${l.from}` },
  ]);
  // deduplicate by label
  const seen = new Set();
  const unique = allPoints.filter(p => {
    if (seen.has(p.label)) return false;
    seen.add(p.label);
    return true;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.15 }}
      className="absolute z-30 w-full mt-1 rounded-lg shadow-xl overflow-hidden"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
        <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>PICK FROM TRIP</span>
        <button type="button" onClick={onClose} className="text-xs" style={{ color: 'var(--text-muted)' }}>✕</button>
      </div>
      {unique.length === 0 && (
        <p className="px-3 py-2 text-xs" style={{ color: 'var(--text-muted)' }}>No stops yet.</p>
      )}
      {unique.map(p => (
        <button
          key={p.label}
          type="button"
          onClick={() => onSelect(p.label)}
          className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--surface-raised)]"
          style={{ color: 'var(--text-primary)' }}
        >
          <span className="font-medium">{p.label}</span>
          <span className="block text-xs" style={{ color: 'var(--text-muted)' }}>{p.sub}</span>
        </button>
      ))}
    </motion.div>
  );
}

export default function StopEditor({ leg = null, defaultFrom = '', onClose }) {
  const { trip, legs, addLeg, updateLeg, removeLeg } = useTripStore();
  const isEdit = !!leg;

  const [from, setFrom] = useState(leg?.from ?? defaultFrom);
  const [to, setTo]     = useState(leg?.to ?? '');
  const [mode, setMode] = useState(leg?.mode ?? 'flight');
  const [durationH, setDurationH]     = useState(leg?.durationH ?? '');
  const [distanceKm, setDistanceKm]   = useState(leg?.distanceKm ?? '');
  const [coords, setCoords]           = useState(leg?.coords ?? null);

  // Separate query strings for autocomplete (decoupled from the committed value)
  const [fromQuery, setFromQuery] = useState('');
  const [toQuery, setToQuery]     = useState('');
  const [showEntryPicker, setShowEntryPicker] = useState(false);

  const fromAC = useLocationAutocomplete(fromQuery, trip.destination);
  const toAC   = useLocationAutocomplete(toQuery,   trip.destination);

  function pickFrom(r) {
    setFrom(r.name);
    if (r.coords) setCoords(r.coords);
    setFromQuery('');
    fromAC.clear();
  }

  function pickTo(r) {
    setTo(r.name);
    if (r.coords) setCoords(r.coords);
    setToQuery('');
    toAC.clear();
  }

  function handleFromChange(val) {
    setFrom(val);
    setFromQuery(val);
  }

  function handleToChange(val) {
    setTo(val);
    setToQuery(val);
  }

  function handleSubmit(e) {
    e.preventDefault();
    const data = {
      from: from.trim(),
      to: to.trim(),
      mode,
      durationH:  parseFloat(durationH) || 0,
      distanceKm: parseFloat(distanceKm) || 0,
      coords,
    };
    if (isEdit) {
      updateLeg({ ...data, id: leg.id, status: leg.status });
    } else {
      addLeg(data);
    }
    onClose();
  }

  function handleDelete() {
    if (isEdit) removeLeg(leg.id);
    onClose();
  }

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 260 }}
      className="fixed top-0 right-0 h-full z-40 w-80 shadow-2xl flex flex-col"
      style={{ background: 'var(--surface)', borderLeft: '1px solid var(--border)' }}
    >
      <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
        <h3 className="font-editorial text-base" style={{ color: 'var(--text-primary)' }}>
          {isEdit ? 'Edit stop' : 'Add a stop'}
        </h3>
        <button onClick={onClose} className="text-lg" style={{ color: 'var(--text-muted)' }}>✕</button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* From */}
          <div className="relative">
            <div className="flex items-center justify-between mb-1.5">
              <label className="label-tag">From</label>
              <button
                type="button"
                onClick={() => setShowEntryPicker(v => !v)}
                className="text-xs px-2 py-0.5 rounded"
                style={{ background: 'var(--surface-raised)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
              >
                Select entry
              </button>
            </div>
            <input
              type="text"
              value={from}
              onChange={e => handleFromChange(e.target.value)}
              onFocus={() => from && setFromQuery(from)}
              required
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
            {fromAC.searching && <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>searching…</div>}
            <AnimatePresence>
              {showEntryPicker && (
                <EntryPicker
                  legs={legs}
                  onSelect={name => { setFrom(name); setFromQuery(''); fromAC.clear(); setShowEntryPicker(false); }}
                  onClose={() => setShowEntryPicker(false)}
                />
              )}
            </AnimatePresence>
            {!showEntryPicker && <SuggestionList results={fromAC.results} onPick={pickFrom} />}
          </div>

          {/* Nearby search — anchor defaults to FROM location */}
          <NearbyDrawer
            anchor={from}
            onSelectPlace={name => {
              setTo(name);
              setToQuery('');
              toAC.clear();
            }}
          />

          {/* To */}
          <div className="relative">
            <label className="label-tag block mb-1.5">To</label>
            <input
              type="text"
              value={to}
              onChange={e => handleToChange(e.target.value)}
              onFocus={() => to && setToQuery(to)}
              required
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
            {toAC.searching && <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>searching…</div>}
            <SuggestionList results={toAC.results} onPick={pickTo} />
          </div>

          {/* Travel mode */}
          <div>
            <label className="label-tag block mb-1.5">Travel mode</label>
            <div className="flex flex-wrap gap-2">
              {MODES.map(m => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMode(m.value)}
                  className="px-2.5 py-1 rounded-full text-xs font-medium transition-colors"
                  style={{
                    background: mode === m.value ? 'var(--cta)' : 'var(--surface-raised)',
                    color: mode === m.value ? '#fff' : 'var(--text-secondary)',
                    border: `1px solid ${mode === m.value ? 'var(--cta)' : 'var(--border)'}`,
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Duration + Distance */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-tag block mb-1.5">Duration (h)</label>
              <input type="number" min="0" step="0.5" value={durationH} onChange={e => setDurationH(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              />
            </div>
            <div>
              <label className="label-tag block mb-1.5">Distance (km)</label>
              <input type="number" min="0" value={distanceKm} onChange={e => setDistanceKm(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              />
            </div>
          </div>

          {coords && (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              📍 {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
            </p>
          )}

          <div className="pt-2 space-y-2">
            <button type="submit"
              className="w-full py-2.5 rounded-lg text-sm font-semibold text-white"
              style={{ background: 'var(--cta)' }}
            >
              {isEdit ? 'Save changes' : 'Add stop'}
            </button>
            {isEdit && (
              <button type="button" onClick={handleDelete}
                className="w-full py-2 rounded-lg text-sm transition-colors"
                style={{ background: 'transparent', color: 'var(--status-alert)', border: '1px solid var(--status-alert)' }}
              >
                Remove stop
              </button>
            )}
          </div>
        </form>
      </div>
    </motion.div>
  );
}
