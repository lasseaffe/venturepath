import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { filterExpeditionFlights } from '../../utils/flightEngine';
import { searchAirports, searchStations, searchTransportHubs, searchBusStops, searchTramStops } from '../../utils/geocodeEngine';
import EmergencyRebook from './EmergencyRebook';

const MODE_CONFIG = {
  flight: { label: 'FLIGHT', icon: '✈',  accent: '#E67E22', simulate: '⚠ SIMULATE CANCELLATION', placeholder: 'Airport…'  },
  train:  { label: 'TRAIN',  icon: '🚂', accent: '#4a9eff', simulate: '⚠ SIMULATE DISRUPTION',  placeholder: 'Station…'  },
  bus:    { label: 'BUS',    icon: '🚌', accent: '#22a060', simulate: '⚠ SIMULATE DISRUPTION',  placeholder: 'Bus stop…' },
  tram:   { label: 'TRAM',   icon: '🚃', accent: '#a855f7', simulate: '⚠ SIMULATE DISRUPTION',  placeholder: 'Tram stop…' },
};

const FLIGHT_PRIORITIES = [
  { id: 'CHEAPEST', label: 'Economy', icon: '💰' },
  { id: 'FASTEST',  label: 'Speed',   icon: '⚡' },
  { id: 'GREENEST', label: 'Green',   icon: '🌿' },
];

const TRAIN_PRIORITIES = [
  { id: 'CHEAPEST', label: 'Economy', icon: '💰' },
  { id: 'FASTEST',  label: 'Direct',  icon: '⚡' },
  { id: 'GREENEST', label: 'Green',   icon: '🌿' },
];

function buildFlights(origin, dest) {
  const o = origin.toUpperCase().slice(0, 3) || 'JFK';
  const d = (dest || 'BER').slice(0, 3).toUpperCase();
  return [
    { id: 'f1', carrier: 'Lufthansa',  route: `${o} → ${dest || d}`, price: 542,  duration: '7h 45m', co2: 120, label: 'Economy'  },
    { id: 'f2', carrier: 'DirectJet',  route: `${o} → ${dest || d}`, price: 890,  duration: '2h 15m', co2: 210, label: 'Non-stop' },
    { id: 'f3', carrier: 'GreenFly',   route: `${o} → ${dest || d}`, price: 620,  duration: '4h 45m', co2: 85,  label: 'Eco'      },
  ];
}

function buildTrains(origin, dest) {
  const o = origin || 'Hamburg Hbf';
  const d = dest || 'Unknown';
  return [
    { id: 't1', carrier: 'Deutsche Bahn', route: `${o} → ${d}`, price: 89,  duration: '4h 02m', co2: 12, label: 'ICE Direct'    },
    { id: 't2', carrier: 'Eurostar',      route: `${o} → ${d}`, price: 55,  duration: '6h 30m', co2: 8,  label: 'Economy Saver' },
    { id: 't3', carrier: 'Thalys',        route: `${o} → ${d}`, price: 120, duration: '3h 15m', co2: 10, label: 'Premium'       },
  ];
}

function useTransportAutocomplete(query, mode) {
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    if (!query.trim()) { setSuggestions([]); return; }
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setSearching(true);
      try {
        let results;
        if      (mode === 'flight') results = await searchAirports(query, 5);
        else if (mode === 'train')  results = await searchStations(query, 5);
        else if (mode === 'bus')    results = await searchBusStops(query, 5);
        else if (mode === 'tram')   results = await searchTramStops(query, 5);
        else                        results = await searchTransportHubs(query, 6);
        setSuggestions(results);
      } catch {
        setSuggestions([]);
      }
      setSearching(false);
    }, 350);
    return () => clearTimeout(timer.current);
  }, [query, mode]);

  return { suggestions, searching, clear: () => setSuggestions([]) };
}

function AutocompleteField({ label, value, field, ac, mode, onUpdate, legId }) {
  return (
    <div className="relative">
      <div className="text-[8px] font-mono text-[var(--text-muted)] tracking-widest mb-1">{label}</div>
      <input
        type="text"
        value={value}
        onChange={e => onUpdate(legId, { [field]: e.target.value, searched: false })}
        onBlur={() => setTimeout(ac.clear, 150)}
        placeholder={MODE_CONFIG[mode]?.placeholder ?? 'Stop…'}
        className="w-full bg-[#0E1012] border border-[#2a2f36] rounded px-3 py-2 text-sm text-white placeholder-slate-600 font-mono focus:outline-none"
      />
      {ac.searching && (
        <span className="absolute right-2 top-[30px] text-[9px] font-mono text-[var(--text-muted)]">…</span>
      )}
      <AnimatePresence>
        {ac.suggestions.length > 0 && (
          <motion.ul
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute z-20 w-full mt-0.5 rounded overflow-hidden shadow-lg"
            style={{ background: '#141820', border: '1px solid #2a2f36' }}
          >
            {ac.suggestions.map(s => (
              <li key={s.id}>
                <button
                  type="button"
                  onMouseDown={() => {
                    const snap = s.transportType === 'flight' ? 'flight'
                               : s.transportType === 'train'  ? 'train'
                               : mode;
                    onUpdate(legId, { [field]: s.name, ...(snap !== mode ? { mode: snap } : {}) });
                    ac.clear();
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-mono text-white hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                >
                  <span className="mr-1.5">
                    {MODE_CONFIG[s.transportType]?.icon ?? ''}
                  </span>
                  {s.name}
                  {s.address !== s.name && (
                    <span className="block text-[9px] text-[var(--text-muted)] truncate">{s.address}</span>
                  )}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function LegCard({ leg, index, onUpdate, onRemove }) {
  const { id, mode, from, to, searched } = leg;
  const [priority, setPriority]         = useState('CHEAPEST');
  const [showSimulate, setShowSimulate] = useState(false);

  const fromAC = useTransportAutocomplete(from, mode);
  const toAC   = useTransportAutocomplete(to,   mode);

  const cfg = MODE_CONFIG[mode] ?? MODE_CONFIG.flight;
  const accent = cfg.accent;

  const isTrain = mode === 'train';
  const priorities = isTrain ? TRAIN_PRIORITIES : FLIGHT_PRIORITIES;

  const results = searched
    ? (isTrain
        ? buildTrains(from, to)
        : filterExpeditionFlights(buildFlights(from, to), priority, 9999))
    : [];

  const simulateCls = mode === 'flight'
    ? 'bg-red-900/30 border-red-500/40 text-red-400 hover:bg-red-900/50'
    : mode === 'bus'
    ? 'bg-green-900/30 border-green-500/40 text-green-400 hover:bg-green-900/50'
    : mode === 'tram'
    ? 'bg-purple-900/30 border-purple-500/40 text-purple-400 hover:bg-purple-900/50'
    : 'bg-blue-900/30 border-blue-500/40 text-blue-400 hover:bg-blue-900/50';

  return (
    <>
      <AnimatePresence>
        {showSimulate && (
          <EmergencyRebook
            mode={mode}
            cancelledFlight={`${from || '?'} → ${to || '?'}`}
            onClose={() => setShowSimulate(false)}
          />
        )}
      </AnimatePresence>

      <div
        className="rounded-lg border border-[#2a2f36] bg-[#111318] p-4 space-y-3"
        style={{ borderLeftColor: mode ? accent : '#2a2f36', borderLeftWidth: 2 }}
      >
        {/* Header: leg index + mode toggle + simulate + remove */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-[8px] font-mono text-[var(--text-muted)] tracking-widest">LEG {index + 1}</span>
            <div className="flex border border-[#2a2f36] rounded overflow-hidden text-[9px] font-mono">
              {Object.entries(MODE_CONFIG).map(([m, c]) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => onUpdate(id, { mode: m, searched: false })}
                  className={`px-2.5 py-1.5 transition-colors ${
                    mode === m
                      ? 'font-bold text-[#0E1012]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                  }`}
                  style={mode === m ? { background: c.accent } : {}}
                >
                  {c.icon} {c.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSimulate(true)}
              className={`px-2.5 py-1 border text-[9px] font-mono rounded transition-colors tracking-widest ${simulateCls}`}
            >
              {cfg.simulate}
            </button>
            {onRemove && (
              <button
                type="button"
                onClick={() => onRemove(id)}
                className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] text-xs font-mono transition-colors"
                title="Remove leg"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* FROM / TO inputs */}
        <form
          onSubmit={e => { e.preventDefault(); onUpdate(id, { searched: true }); }}
          className="space-y-2"
        >
          <div className="grid grid-cols-2 gap-2">
            <AutocompleteField label="FROM" value={from} field="from" ac={fromAC} mode={mode} onUpdate={onUpdate} legId={id} />
            <AutocompleteField label="TO"   value={to}   field="to"   ac={toAC}   mode={mode} onUpdate={onUpdate} legId={id} />
          </div>
          <button
            type="submit"
            className="w-full py-2 rounded text-[10px] font-mono tracking-widest border transition-colors"
            style={{ borderColor: `${accent}80`, color: accent }}
          >
            SEARCH {cfg.label}
          </button>
        </form>

        {/* Priority tabs + results */}
        {searched && (
          <>
            <div className="flex gap-1.5">
              {priorities.map(p => (
                <button
                  key={p.id}
                  onClick={() => setPriority(p.id)}
                  className={`flex-1 py-1.5 text-[9px] font-mono tracking-widest rounded border transition-colors ${
                    priority === p.id ? 'font-bold text-[#0E1012]' : 'bg-transparent border-[#2a2f36] text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                  }`}
                  style={priority === p.id ? { background: accent, borderColor: accent } : {}}
                >
                  {p.icon} {p.label}
                </button>
              ))}
            </div>
            <div className="space-y-2">
              {results.map(r => (
                <div
                  key={r.id}
                  className="bg-[#0E1012] rounded-lg p-3 border border-[#1e2328] transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-mono text-[var(--text-muted)] tracking-widest">{r.carrier}</div>
                      <div className="text-white text-sm font-semibold font-mono mt-0.5">{r.route}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-mono font-bold" style={{ color: accent }}>${r.price}</div>
                      <div className="text-[9px] text-[var(--text-muted)] font-mono">{r.label}</div>
                    </div>
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-[10px] font-mono text-[var(--text-muted)]">{r.duration}</span>
                    <span className={`text-[10px] font-mono ${r.co2 < 20 ? 'text-green-400' : r.co2 < 100 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {r.co2}kg CO₂
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {!searched && (
          <div className="py-6 text-center">
            <div className="text-xl mb-1" style={{ color: `${accent}66` }}>
              {cfg.icon}
            </div>
            <div className="text-[9px] font-mono text-[var(--text-muted)] tracking-widest">
              {mode ? 'ENTER ORIGIN + DESTINATION TO SEARCH' : 'SELECT MODE TO BEGIN'}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
