import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { filterExpeditionFlights } from '../../utils/flightEngine';
import { searchAirports, searchStations, searchTransportHubs, searchBusStops, searchTramStops } from '../../utils/geocodeEngine';
import { resolveStop, searchConnections } from '../../utils/transitEngine';
import EmergencyRebook from './EmergencyRebook';

const MODE_CONFIG = {
  flight: { label: 'FLIGHT', icon: '✈',  accent: '#E67E22', simulate: '⚠ SIMULATE CANCELLATION', placeholder: 'Airport…'        },
  train:  { label: 'TRAIN',  icon: '🚂', accent: '#4a9eff', simulate: '⚠ SIMULATE DISRUPTION',  placeholder: 'Station…'        },
  bus:    { label: 'BUS',    icon: '🚌', accent: '#22a060', simulate: '⚠ SIMULATE DISRUPTION',  placeholder: 'Bus stop…'       },
  ferry:  { label: 'FERRY',  icon: '⛴',  accent: '#0ea5e9', simulate: '⚠ SIMULATE DISRUPTION',  placeholder: 'Port or terminal…' },
  drive:  { label: 'DRIVE',  icon: '🚗', accent: '#D9C5B2', simulate: '⚠ SIMULATE DISRUPTION',  placeholder: 'City or address…'  },
  tram:   { label: 'TRAM',   icon: '🚃', accent: '#a855f7', simulate: '⚠ SIMULATE DISRUPTION',  placeholder: 'Tram stop…'      },
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
  const [highlighted, setHighlighted] = useState(-1);

  function handleKeyDown(e) {
    if (!ac.suggestions.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlighted(h => Math.min(h + 1, ac.suggestions.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setHighlighted(h => Math.max(h - 1, 0)); }
    if (e.key === 'Enter' && highlighted >= 0) {
      e.preventDefault();
      const s = ac.suggestions[highlighted];
      const snap = s.transportType === 'flight' ? 'flight' : s.transportType === 'train' ? 'train' : mode;
      const coordKey = field === 'from' ? 'fromCoords' : 'toCoords';
      onUpdate(legId, { [field]: s.name, [coordKey]: s.coords ?? null, ...(snap !== mode ? { mode: snap } : {}) });
      ac.clear();
      setHighlighted(-1);
    }
    if (e.key === 'Escape') { ac.clear(); setHighlighted(-1); }
  }

  return (
    <div className="relative">
      <div className="text-[8px] font-mono text-[var(--text-muted)] tracking-widest mb-1">{label}</div>
      <input
        type="text"
        value={value}
        onChange={e => { onUpdate(legId, { [field]: e.target.value, searched: false }); setHighlighted(-1); }}
        onBlur={() => setTimeout(() => { ac.clear(); setHighlighted(-1); }, 150)}
        onKeyDown={handleKeyDown}
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
            className="absolute z-20 w-full mt-0.5 rounded shadow-lg"
            style={{ background: '#141820', border: '1px solid #2a2f36', maxHeight: 160, overflowY: 'auto' }}
          >
            {ac.suggestions.map((s, i) => (
              <li key={s.id}>
                <button
                  type="button"
                  onMouseDown={() => {
                    const snap = s.transportType === 'flight' ? 'flight'
                               : s.transportType === 'train'  ? 'train'
                               : mode;
                    const coordKey = field === 'from' ? 'fromCoords' : 'toCoords';
                    onUpdate(legId, {
                      [field]: s.name,
                      [coordKey]: s.coords ?? null,
                      ...(snap !== mode ? { mode: snap } : {}),
                    });
                    ac.clear();
                    setHighlighted(-1);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-mono text-white transition-colors border-b border-white/5 last:border-0"
                  style={{ background: i === highlighted ? 'rgba(255,255,255,0.07)' : 'transparent' }}
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
  const { id, mode, from, to, searched, disruption = null, cascadeRisk = null, fromCoords = null, toCoords = null } = leg;
  const [priority, setPriority]           = useState('CHEAPEST');
  const [showSimulate, setShowSimulate]   = useState(false);
  const [loadingResults, setLoadingResults] = useState(false);
  const [liveResults, setLiveResults]       = useState([]);

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
            mode={mode ?? 'train'}
            route={`${from || '?'} → ${to || '?'}`}
            fromCoords={fromCoords}
            toCoords={toCoords}
            cascadeRisk={cascadeRisk}
            onClose={() => {
              setShowSimulate(false);
              onUpdate(id, { disruption: null });
            }}
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
              onClick={() => {
                const delays = {
                  flight: null,
                  train:  20 + Math.floor(Math.random() * 70),
                  bus:    10 + Math.floor(Math.random() * 30),
                  tram:   10 + Math.floor(Math.random() * 30),
                };
                const typesByMode = {
                  flight: ['cancellation'],
                  train:  ['delay', 'cancellation', 'strike', 'construction'],
                  bus:    ['delay', 'diversion'],
                  tram:   ['delay', 'diversion'],
                };
                const types     = typesByMode[mode] ?? ['delay'];
                const type      = types[Math.floor(Math.random() * types.length)];
                const delayMins = delays[mode] ?? 30;
                const severity  = delayMins >= 60 ? 'critical' : delayMins >= 20 ? 'medium' : 'low';
                onUpdate(id, {
                  disruption: {
                    type,
                    severity,
                    delayMinutes: delayMins,
                    message: `Simulated ${type} (+${delayMins ?? '∞'}m)`,
                    source: 'simulated',
                  },
                });
                setShowSimulate(true);
              }}
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

        {/* Disruption / cascade status bar */}
        {(disruption || cascadeRisk) && (
          <div
            className="rounded px-3 py-1.5 text-[9px] font-mono tracking-widest flex items-center gap-2"
            style={
              (cascadeRisk?.severity === 'red' || disruption?.severity === 'critical')
                ? { background: 'rgba(127,29,29,0.4)', borderLeft: '3px solid #f87171', color: '#fca5a5' }
                : { background: 'rgba(120,53,15,0.4)', borderLeft: '3px solid #fbbf24', color: '#fde68a' }
            }
          >
            {disruption && <span>⚠ {disruption.message}</span>}
            {cascadeRisk && (
              <span className="ml-1">
                {cascadeRisk.severity === 'red'
                  ? '— CONNECTION MISSED'
                  : `— connection buffer: ${cascadeRisk.remainingMinutes}m remaining`}
              </span>
            )}
          </div>
        )}

        {/* FROM / TO inputs */}
        <form
          onSubmit={async e => {
            e.preventDefault();
            onUpdate(id, { searched: true });
            setLiveResults([]);

            if (mode !== 'flight') {
              setLoadingResults(true);
              try {
                const [fromStop, toStop] = await Promise.all([
                  resolveStop(leg.fromCoords?.lat, leg.fromCoords?.lng),
                  resolveStop(leg.toCoords?.lat,   leg.toCoords?.lng),
                ]);
                if (fromStop && toStop) {
                  const connections = await searchConnections(
                    fromStop.id, toStop.id, new Date().toISOString(), mode
                  );
                  setLiveResults(connections);
                  onUpdate(id, { stopFromId: fromStop.id, stopToId: toStop.id });
                }
              } catch {
                // fall through to mock results
              }
              setLoadingResults(false);
            }
          }}
          className="space-y-2"
        >
          <div className="flex flex-col gap-2">
            <AutocompleteField label="TO — DESTINATION" value={to}   field="to"   ac={toAC}   mode={mode} onUpdate={onUpdate} legId={id} />
            <AutocompleteField label="FROM — ORIGIN"    value={from} field="from" ac={fromAC} mode={mode} onUpdate={onUpdate} legId={id} />
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

            {/* Loading skeleton */}
            {loadingResults && (
              <div className="space-y-2">
                {[0, 1, 2].map(i => (
                  <div key={i} className="bg-[#0E1012] rounded-lg p-3 border border-[#1e2328] animate-pulse">
                    <div className="h-3 bg-white/5 rounded w-1/3 mb-2" />
                    <div className="h-4 bg-white/10 rounded w-2/3 mb-3" />
                    <div className="flex justify-between">
                      <div className="h-3 bg-white/5 rounded w-16" />
                      <div className="h-3 bg-white/5 rounded w-16" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Results area (hidden while loading) */}
            {!loadingResults && (
              <div className="space-y-2">
                {/* LIVE DATA UNAVAILABLE notice */}
                {liveResults.length === 0 && mode !== 'flight' && (
                  <div className="text-[9px] font-mono text-amber-500/70 border border-amber-900/40 rounded px-2 py-1 mb-2">
                    LIVE DATA UNAVAILABLE — showing cached options
                  </div>
                )}

                {/* Live results (train/bus/tram with real data) */}
                {liveResults.length > 0 && mode !== 'flight'
                  ? liveResults.map(r => (
                    <div
                      key={r.id}
                      onClick={() => onUpdate(id, { selectedOption: r })}
                      className={`bg-[#0E1012] rounded-lg p-3 border transition-colors cursor-pointer ${
                        leg.selectedOption?.id === r.id
                          ? 'border-[var(--accent)]'
                          : 'border-[#1e2328] hover:border-white/20'
                      }`}
                      style={leg.selectedOption?.id === r.id ? { borderColor: `${accent}80` } : {}}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-[10px] font-mono text-[var(--text-muted)] tracking-widest flex items-center gap-2">
                            {r.carrier}
                            {r.realtime && (
                              <span className="text-[8px] text-green-400 font-mono">● LIVE</span>
                            )}
                          </div>
                          <div className="text-white text-sm font-semibold font-mono mt-0.5">
                            {new Date(r.departure).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                            {' → '}
                            {new Date(r.arrival).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                        <div className="text-right">
                          {r.price != null
                            ? <div className="text-lg font-mono font-bold" style={{ color: accent }}>€{r.price}</div>
                            : <div className="text-xs font-mono text-[var(--text-muted)]">price n/a</div>
                          }
                          <div className="text-[9px] text-[var(--text-muted)] font-mono">{r.duration}</div>
                        </div>
                      </div>
                      <div className="flex justify-between mt-2">
                        <span className="text-[10px] font-mono text-[var(--text-muted)]">{r.platform ? `Platform ${r.platform}` : ''}</span>
                        <span className={`text-[10px] font-mono ${r.co2 < 20 ? 'text-green-400' : r.co2 < 100 ? 'text-yellow-400' : 'text-red-400'}`}>
                          {r.co2}kg CO₂
                        </span>
                      </div>
                    </div>
                  ))
                  /* Mock results (flight mode or live fetch fallback) */
                  : results.map(r => (
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
                  ))
                }
              </div>
            )}
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
