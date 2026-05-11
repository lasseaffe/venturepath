import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { filterExpeditionFlights } from '../../utils/flightEngine';
import { searchAirports, searchStations, searchTransportHubs } from '../../utils/geocodeEngine';
import EmergencyRebook from './EmergencyRebook';

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
        if (mode === 'flight')     results = await searchAirports(query, 5);
        else if (mode === 'train') results = await searchStations(query, 5);
        else                       results = await searchTransportHubs(query, 6);
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
      <div className="text-[8px] font-mono text-slate-500 tracking-widest mb-1">{label}</div>
      <input
        type="text"
        value={value}
        onChange={e => onUpdate(legId, { [field]: e.target.value, searched: false })}
        onBlur={() => setTimeout(ac.clear, 150)}
        placeholder={mode === 'train' ? 'Station…' : mode === 'flight' ? 'Airport…' : 'Airport or station…'}
        className="w-full bg-[#0E1012] border border-[#2a2f36] rounded px-3 py-2 text-sm text-white placeholder-slate-600 font-mono focus:outline-none"
      />
      {ac.searching && (
        <span className="absolute right-2 top-[30px] text-[9px] font-mono text-slate-500">…</span>
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
                    {s.transportType === 'flight' ? '✈' : s.transportType === 'train' ? '🚂' : ''}
                  </span>
                  {s.name}
                  {s.address !== s.name && (
                    <span className="block text-[9px] text-slate-500 truncate">{s.address}</span>
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

  const isFlight = mode === 'flight';
  const isTrain  = mode === 'train';
  const accent   = isTrain ? '#4a9eff' : '#E67E22';

  const priorities = isTrain ? TRAIN_PRIORITIES : FLIGHT_PRIORITIES;

  const results = searched
    ? (isTrain
        ? buildTrains(from, to)
        : filterExpeditionFlights(buildFlights(from, to), priority, 9999))
    : [];

  const simulateLabel = isTrain ? '⚠ SIMULATE DISRUPTION' : '⚠ SIMULATE CANCELLATION';
  const simulateCls   = isTrain
    ? 'bg-blue-900/30 border-blue-500/40 text-blue-400 hover:bg-blue-900/50'
    : 'bg-red-900/30 border-red-500/40 text-red-400 hover:bg-red-900/50';

  return (
    <>
      <AnimatePresence>
        {showSimulate && (
          <EmergencyRebook
            mode={isTrain ? 'train' : 'flight'}
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
            <span className="text-[8px] font-mono text-slate-600 tracking-widest">LEG {index + 1}</span>
            <div className="flex border border-[#2a2f36] rounded overflow-hidden text-[9px] font-mono">
              <button
                type="button"
                onClick={() => onUpdate(id, { mode: 'flight', searched: false })}
                className={`px-3 py-1.5 transition-colors ${isFlight ? 'bg-[#E67E22] text-[#0E1012] font-bold' : 'text-slate-500 hover:text-slate-300'}`}
              >
                ✈ FLIGHT
              </button>
              <button
                type="button"
                onClick={() => onUpdate(id, { mode: 'train', searched: false })}
                className={`px-3 py-1.5 transition-colors ${isTrain ? 'bg-[#1a4a7a] text-[#4a9eff] font-bold' : 'text-slate-500 hover:text-slate-300'}`}
              >
                🚂 TRAIN
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSimulate(true)}
              className={`px-2.5 py-1 border text-[9px] font-mono rounded transition-colors tracking-widest ${simulateCls}`}
            >
              {simulateLabel}
            </button>
            {onRemove && (
              <button
                type="button"
                onClick={() => onRemove(id)}
                className="text-slate-600 hover:text-slate-400 text-xs font-mono transition-colors"
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
            {isTrain ? 'SEARCH TRAINS' : 'SEARCH FLIGHTS'}
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
                    priority === p.id ? 'font-bold text-[#0E1012]' : 'bg-transparent border-[#2a2f36] text-slate-500 hover:text-slate-300'
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
                      <div className="text-[10px] font-mono text-slate-500 tracking-widest">{r.carrier}</div>
                      <div className="text-white text-sm font-semibold font-mono mt-0.5">{r.route}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-mono font-bold" style={{ color: accent }}>${r.price}</div>
                      <div className="text-[9px] text-slate-600 font-mono">{r.label}</div>
                    </div>
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-[10px] font-mono text-slate-600">{r.duration}</span>
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
              {isTrain ? '🚂' : '✈'}
            </div>
            <div className="text-[9px] font-mono text-slate-700 tracking-widest">
              {mode ? 'ENTER ORIGIN + DESTINATION TO SEARCH' : 'SELECT MODE TO BEGIN'}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
