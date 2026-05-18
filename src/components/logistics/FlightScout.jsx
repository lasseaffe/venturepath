import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { filterExpeditionFlights } from '../../utils/flightEngine';
import { fetchDestinations } from '../../utils/destinationEngine';
import { searchLocations } from '../../utils/geocodeEngine';
import EmergencyRebook from './EmergencyRebook';

const PRIORITIES = [
  { id: 'CHEAPEST', label: 'Economy',  icon: '💰' },
  { id: 'FASTEST',  label: 'Speed',    icon: '⚡' },
  { id: 'GREENEST', label: 'Green',    icon: '🌿' },
];

function buildFlights(origin, destination) {
  const orig = origin.toUpperCase().slice(0, 3) || 'JFK';
  const dest = destination ? destination.slice(0, 3).toUpperCase() : 'BER';
  return [
    { id: 'f1', airline: 'Lufthansa',  route: `${orig} → ${destination || dest}`, price: 542,  duration: '7h 45m', co2: 120, type: 'Economy'  },
    { id: 'f2', airline: 'DirectJet',  route: `${orig} → ${destination || dest}`, price: 890,  duration: '2h 15m', co2: 210, type: 'Non-stop'  },
    { id: 'f3', airline: 'GreenFly',   route: `${orig} → ${destination || dest}`, price: 620,  duration: '4h 45m', co2: 85,  type: 'Eco'       },
  ];
}

function useLocationAutocomplete(query) {
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    if (!query.trim()) { setSuggestions([]); return; }
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchLocations(query, 5);
        setSuggestions(results.map(r => ({ id: String(r.id), name: r.name, address: r.address })));
      } catch {
        setSuggestions([]);
      }
      setSearching(false);
    }, 350);
    return () => clearTimeout(timer.current);
  }, [query]);

  return { suggestions, searching, clear: () => setSuggestions([]) };
}

export default function FlightScout({ destination = '', budgetLimit = 2000, suggestedOrigin = null, onApplyOrigin }) {
  const [priority, setPriority] = useState('CHEAPEST');
  const [showRebook, setShowRebook] = useState(false);
  const [origin, setOrigin] = useState('');
  const [dest, setDest] = useState(destination);
  const [searched, setSearched] = useState(false);

  const fromAC = useLocationAutocomplete(origin);
  const toAC = useLocationAutocomplete(dest);

  const flights = searched
    ? filterExpeditionFlights(buildFlights(origin, dest), priority, budgetLimit)
    : [];

  function handleInspireDestination() {
    const dests = fetchDestinations();
    const random = dests[Math.floor(Math.random() * dests.length)];
    setDest(random.name);
  }

  function handleSearch(e) {
    e.preventDefault();
    setSearched(true);
  }

  return (
    <>
      <AnimatePresence>
        {showRebook && <EmergencyRebook onClose={() => setShowRebook(false)} />}
      </AnimatePresence>

      <div className="tactical-panel p-5 space-y-4">
        {suggestedOrigin && (
          <div className="mb-3 rounded border border-[#E67E22]/40 bg-[#E67E22]/10 p-3 font-[JetBrains_Mono,monospace] text-xs text-[#D9C5B2]">
            <div className="mb-1 text-[10px] uppercase tracking-wider text-[#E67E22]">
              Origin near track start
            </div>
            <div>
              <span className="font-bold text-[#F2EDE8]">{suggestedOrigin.iata}</span>
              {' — '}{suggestedOrigin.name}, {suggestedOrigin.city} ({suggestedOrigin.distanceKm} km from track start)
            </div>
            <button
              onClick={() => onApplyOrigin?.(suggestedOrigin.iata)}
              className="mt-2 rounded bg-[#E67E22] px-3 py-1 text-[10px] uppercase tracking-wider text-[#0E1012]"
            >
              Use as origin
            </button>
          </div>
        )}

        <div className="flex items-center justify-between">
          <h2 className="label-tag">Flight Scout</h2>
          <button
            onClick={() => setShowRebook(true)}
            className="px-2.5 py-1 bg-red-900/30 border border-red-500/40 text-red-400 text-[9px] font-mono rounded hover:bg-red-900/50 transition-colors tracking-widest"
          >
            ⚠ SIMULATE CANCELLATION
          </button>
        </div>

        {/* Search form */}
        <form onSubmit={handleSearch} className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            {/* FROM field */}
            <div className="relative">
              <div className="text-[8px] font-mono text-[var(--text-muted)] tracking-widest mb-1">FROM</div>
              <input
                type="text"
                value={origin}
                onChange={e => setOrigin(e.target.value)}
                onBlur={() => setTimeout(fromAC.clear, 150)}
                placeholder="City or airport…"
                className="w-full bg-[#0E1012] border border-[#2a2f36] rounded px-3 py-2 text-sm text-white placeholder-slate-600 font-mono focus:outline-none focus:border-[#E67E22]/50"
              />
              {fromAC.searching && (
                <span className="absolute right-2 top-[30px] text-[9px] font-mono text-[var(--text-muted)]">…</span>
              )}
              <AnimatePresence>
                {fromAC.suggestions.length > 0 && (
                  <motion.ul
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="absolute z-20 w-full mt-0.5 rounded overflow-hidden shadow-lg"
                    style={{ background: '#141820', border: '1px solid #2a2f36' }}
                  >
                    {fromAC.suggestions.map(s => (
                      <li key={s.id}>
                        <button
                          type="button"
                          onMouseDown={() => { setOrigin(s.name); fromAC.clear(); }}
                          className="w-full text-left px-3 py-2 text-xs font-mono text-white hover:bg-[#E67E22]/10 transition-colors border-b border-white/5 last:border-0"
                        >
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

            {/* TO field */}
            <div className="relative">
              <div className="text-[8px] font-mono text-[var(--text-muted)] tracking-widest mb-1">TO</div>
              <div className="relative">
                <input
                  type="text"
                  value={dest}
                  onChange={e => setDest(e.target.value)}
                  onBlur={() => setTimeout(toAC.clear, 150)}
                  placeholder="Destination…"
                  className="w-full bg-[#0E1012] border border-[#2a2f36] rounded px-3 py-2 text-sm text-white placeholder-slate-600 font-mono focus:outline-none focus:border-[#E67E22]/50 pr-8"
                />
                <button
                  type="button"
                  onClick={handleInspireDestination}
                  title="Inspire Me — Surprise Destination"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#E67E22] text-xs hover:opacity-70 transition-opacity"
                >
                  ✦
                </button>
              </div>
              {toAC.searching && (
                <span className="absolute right-8 top-[30px] text-[9px] font-mono text-[var(--text-muted)]">…</span>
              )}
              <AnimatePresence>
                {toAC.suggestions.length > 0 && (
                  <motion.ul
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="absolute z-20 w-full mt-0.5 rounded overflow-hidden shadow-lg"
                    style={{ background: '#141820', border: '1px solid #2a2f36' }}
                  >
                    {toAC.suggestions.map(s => (
                      <li key={s.id}>
                        <button
                          type="button"
                          onMouseDown={() => { setDest(s.name); toAC.clear(); }}
                          className="w-full text-left px-3 py-2 text-xs font-mono text-white hover:bg-[#E67E22]/10 transition-colors border-b border-white/5 last:border-0"
                        >
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
          </div>
          <button
            type="submit"
            className="w-full py-2 rounded text-[10px] font-mono tracking-widest border border-[#E67E22]/50 text-[#E67E22] hover:bg-[#E67E22]/10 transition-colors"
          >
            SEARCH FLIGHTS
          </button>
        </form>

        {/* Priority toggle */}
        {searched && (
          <>
            <div className="flex gap-1.5">
              {PRIORITIES.map(p => (
                <button
                  key={p.id}
                  onClick={() => setPriority(p.id)}
                  className={`flex-1 py-1.5 text-[9px] font-mono tracking-widest rounded border transition-colors ${
                    priority === p.id
                      ? 'bg-[#E67E22] border-[#E67E22] text-[#0E1012] font-bold'
                      : 'bg-transparent border-[#2a2f36] text-[var(--text-muted)] hover:border-[#E67E22]/50 hover:text-[var(--text-secondary)]'
                  }`}
                >
                  {p.icon} {p.label}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              {flights.map(f => (
                <div
                  key={f.id}
                  className="bg-[#0E1012] rounded-lg p-3 border border-[#1e2328] hover:border-[#E67E22]/40 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-mono text-[var(--text-muted)] tracking-widest">{f.airline}</div>
                      <div className="text-white text-sm font-semibold font-mono mt-0.5">{f.route}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[#E67E22] text-lg font-mono font-bold">${f.price}</div>
                      <div className="text-[9px] text-[var(--text-muted)] font-mono">{f.type}</div>
                    </div>
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-[10px] font-mono text-[var(--text-muted)]">{f.duration}</span>
                    <span className={`text-[10px] font-mono ${f.co2 < 100 ? 'text-green-400' : f.co2 < 160 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {f.co2}kg CO₂
                    </span>
                    <a
                      href={`https://www.skyscanner.net/transport/flights/${encodeURIComponent(origin)}/${encodeURIComponent(dest)}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[9px] font-mono text-[var(--text-muted)] hover:text-[#E67E22] transition-colors tracking-widest"
                    >
                      SKYSCANNER →
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {!searched && (
          <div className="py-8 text-center">
            <div className="text-2xl mb-2">✈</div>
            <div className="text-[10px] font-mono text-[var(--text-muted)] tracking-widest">
              ENTER ORIGIN + DESTINATION TO SEARCH
            </div>
            <div className="text-[9px] font-mono text-[var(--text-muted)] mt-1">
              TIP: CLICK ✦ NEXT TO DESTINATION FOR A SURPRISE TRIP
            </div>
          </div>
        )}
      </div>
    </>
  );
}
