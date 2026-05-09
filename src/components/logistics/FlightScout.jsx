import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { filterExpeditionFlights } from '../../utils/flightEngine';
import { fetchDestinations } from '../../utils/destinationEngine';
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

export default function FlightScout({ destination = '', budgetLimit = 2000 }) {
  const [priority, setPriority] = useState('CHEAPEST');
  const [showRebook, setShowRebook] = useState(false);
  const [origin, setOrigin] = useState('');
  const [dest, setDest] = useState(destination);
  const [searched, setSearched] = useState(false);

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
            <div>
              <div className="text-[8px] font-mono text-slate-500 tracking-widest mb-1">FROM</div>
              <input
                type="text"
                value={origin}
                onChange={e => setOrigin(e.target.value)}
                placeholder="City or airport…"
                className="w-full bg-[#0E1012] border border-[#2a2f36] rounded px-3 py-2 text-sm text-white placeholder-slate-600 font-mono focus:outline-none focus:border-[#E67E22]/50"
              />
            </div>
            <div>
              <div className="text-[8px] font-mono text-slate-500 tracking-widest mb-1">TO</div>
              <div className="relative">
                <input
                  type="text"
                  value={dest}
                  onChange={e => setDest(e.target.value)}
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
                      : 'bg-transparent border-[#2a2f36] text-slate-500 hover:border-[#E67E22]/50 hover:text-slate-300'
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
                      <div className="text-[10px] font-mono text-slate-500 tracking-widest">{f.airline}</div>
                      <div className="text-white text-sm font-semibold font-mono mt-0.5">{f.route}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[#E67E22] text-lg font-mono font-bold">${f.price}</div>
                      <div className="text-[9px] text-slate-600 font-mono">{f.type}</div>
                    </div>
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-[10px] font-mono text-slate-600">{f.duration}</span>
                    <span className={`text-[10px] font-mono ${f.co2 < 100 ? 'text-green-400' : f.co2 < 160 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {f.co2}kg CO₂
                    </span>
                    <a
                      href={`https://www.skyscanner.net/transport/flights/${encodeURIComponent(origin)}/${encodeURIComponent(dest)}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[9px] font-mono text-slate-500 hover:text-[#E67E22] transition-colors tracking-widest"
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
            <div className="text-[10px] font-mono text-slate-600 tracking-widest">
              ENTER ORIGIN + DESTINATION TO SEARCH
            </div>
            <div className="text-[9px] font-mono text-slate-700 mt-1">
              TIP: CLICK ✦ NEXT TO DESTINATION FOR A SURPRISE TRIP
            </div>
          </div>
        )}
      </div>
    </>
  );
}
