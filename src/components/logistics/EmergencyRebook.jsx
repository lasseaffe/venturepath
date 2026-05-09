import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SQUAD = [
  { id: 'lead',  name: 'Lead',  avatar: '🧗' },
  { id: 'scout', name: 'Scout', avatar: '🗺' },
  { id: 'medic', name: 'Medic', avatar: '🩺' },
];

const ALTERNATIVES = [
  {
    id: 'alt1',
    priority: 'FASTEST',
    label: 'Fastest Route',
    icon: '⚡',
    airline: 'DirectJet',
    route: 'JFK → SCL',
    price: 890,
    duration: '2h 15m connection',
    departs: 'Today 18:40',
    co2: 210,
    type: 'Non-stop rebooking',
  },
  {
    id: 'alt2',
    priority: 'CHEAPEST',
    label: 'Economy Option',
    icon: '💰',
    airline: 'Lufthansa',
    route: 'JFK → FRA → SCL',
    price: 420,
    duration: '14h 20m',
    departs: 'Tomorrow 06:15',
    co2: 145,
    type: 'Lowest cost',
  },
  {
    id: 'alt3',
    priority: 'COMFORTABLE',
    label: 'Most Comfortable',
    icon: '🛋',
    airline: 'LATAM Premium',
    route: 'JFK → MIA → SCL',
    price: 1240,
    duration: '11h 00m',
    departs: 'Today 21:55',
    co2: 190,
    type: 'Business class upgrade',
  },
];

const COUNTDOWN_SECS = 60;

export default function EmergencyRebook({ onClose, cancelledFlight = 'LH 504 JFK→SCL' }) {
  const [votes, setVotes] = useState(
    Object.fromEntries(SQUAD.map(m => [m.id, null]))
  );
  const [timeLeft, setTimeLeft] = useState(COUNTDOWN_SECS);
  const [selected, setSelected] = useState(null);

  // Countdown
  useEffect(() => {
    if (selected) return;
    const timer = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timer);
          // Auto-select Group Favorite
          const winner = getGroupFavorite(votes);
          setSelected(winner ?? ALTERNATIVES[0].id);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [selected, votes]);

  function castVote(memberId, altId) {
    setVotes(prev => ({ ...prev, [memberId]: altId }));
  }

  function getGroupFavorite(currentVotes) {
    const tally = {};
    for (const v of Object.values(currentVotes)) {
      if (v) tally[v] = (tally[v] ?? 0) + 1;
    }
    const sorted = Object.entries(tally).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] ?? null;
  }

  const groupFavorite = getGroupFavorite(votes);

  const tallyFor = (altId) =>
    Object.values(votes).filter(v => v === altId).length;

  const pct = Math.round(((COUNTDOWN_SECS - timeLeft) / COUNTDOWN_SECS) * 100);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-[#080a0c]/95 backdrop-blur-sm flex flex-col"
    >
      {/* Alert header */}
      <div className="bg-red-900/40 border-b border-red-500/40 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-red-400 text-xl animate-pulse">⚠</span>
          <div>
            <div className="text-red-300 font-mono font-bold tracking-widest text-sm">FLIGHT CANCELLED</div>
            <div className="text-red-400/70 font-mono text-[10px] mt-0.5">{cancelledFlight} — disruption detected</div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {!selected && (
            <div className="text-center">
              <div className="text-[9px] font-mono text-slate-500 tracking-widest">AUTO-SELECT IN</div>
              <div className={`font-mono text-2xl font-bold ${timeLeft <= 10 ? 'text-red-400 animate-pulse' : 'text-[#F2C94C]'}`}>
                {timeLeft}s
              </div>
            </div>
          )}
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white transition-colors font-mono text-xs"
          >
            ✕ CLOSE
          </button>
        </div>
      </div>

      {/* Countdown bar */}
      {!selected && (
        <div className="h-0.5 bg-[#1a1f24]">
          <motion.div
            className="h-full bg-red-500"
            animate={{ width: `${100 - pct}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6">
        <AnimatePresence mode="wait">
          {selected ? (
            <motion.div
              key="confirmed"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center h-full text-center py-16"
            >
              <div className="text-5xl mb-4">✅</div>
              <div className="text-white font-editorial text-2xl mb-2">Rebooking Confirmed</div>
              <div className="text-slate-400 font-mono text-sm">
                {ALTERNATIVES.find(a => a.id === selected)?.label} selected
              </div>
              <div className="mt-6 bg-[#1a1f24] rounded-lg p-4 border border-[#E67E22]/30 max-w-sm w-full">
                {(() => {
                  const alt = ALTERNATIVES.find(a => a.id === selected);
                  return (
                    <>
                      <div className="text-white font-mono font-bold">{alt.airline}</div>
                      <div className="text-slate-300 font-mono text-sm mt-1">{alt.route}</div>
                      <div className="text-[#E67E22] font-mono text-lg font-bold mt-2">${alt.price}</div>
                      <div className="text-slate-500 font-mono text-[10px] mt-1">{alt.departs} · {alt.duration}</div>
                    </>
                  );
                })()}
              </div>
              <button
                onClick={onClose}
                className="mt-6 px-8 py-3 bg-[#E67E22] text-[#0E1012] font-mono font-bold rounded hover:bg-[#F2C94C] transition-colors"
              >
                CONFIRM & CLOSE
              </button>
            </motion.div>
          ) : (
            <motion.div key="voting" className="max-w-4xl mx-auto space-y-6">
              <div className="text-center">
                <div className="text-white font-editorial text-xl mb-1">AI found 3 alternatives</div>
                <div className="text-slate-500 font-mono text-[10px] tracking-widest">SQUAD FLASH VOTE — SELECT YOUR PREFERENCE</div>
              </div>

              {/* Alternative cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {ALTERNATIVES.map(alt => {
                  const tally = tallyFor(alt.id);
                  const isFavorite = groupFavorite === alt.id && tally > 0;
                  return (
                    <motion.div
                      key={alt.id}
                      layout
                      className={`rounded-lg p-4 border-2 transition-colors relative ${
                        isFavorite
                          ? 'border-[#E2725B] bg-[#E2725B]/10'
                          : 'border-[#2a2f36] bg-[#1a1f24]'
                      }`}
                    >
                      {isFavorite && (
                        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-[#E2725B] text-[#0E1012] text-[9px] font-mono font-bold px-2 py-0.5 rounded-full tracking-widest">
                          GROUP FAVORITE
                        </div>
                      )}
                      <div className="flex items-start justify-between mb-3">
                        <span className="text-xl">{alt.icon}</span>
                        <span className="text-[9px] font-mono text-slate-500 tracking-widest">{alt.label.toUpperCase()}</span>
                      </div>
                      <div className="text-white font-mono font-bold text-sm">{alt.airline}</div>
                      <div className="text-slate-300 font-mono text-xs mt-0.5">{alt.route}</div>
                      <div className="text-[#E67E22] font-mono text-xl font-bold mt-2">${alt.price}</div>
                      <div className="text-[9px] font-mono text-slate-500 mt-0.5">{alt.departs}</div>
                      <div className="text-[9px] font-mono text-slate-600 mt-0.5">{alt.duration} · {alt.co2}kg CO₂</div>

                      {/* Tally */}
                      <div className="flex gap-1 mt-3">
                        {Array.from({ length: tally }).map((_, i) => (
                          <span key={i} className="text-sm">
                            {SQUAD.find(m => votes[m.id] === alt.id)?.avatar ?? '👤'}
                          </span>
                        ))}
                      </div>

                      {/* Squad vote buttons */}
                      <div className="mt-3 space-y-1.5">
                        {SQUAD.map(member => (
                          <button
                            key={member.id}
                            onClick={() => castVote(member.id, alt.id)}
                            className={`w-full py-1.5 text-[10px] font-mono rounded border transition-colors flex items-center justify-center gap-1.5 ${
                              votes[member.id] === alt.id
                                ? 'bg-[#E67E22] border-[#E67E22] text-[#0E1012] font-bold'
                                : votes[member.id] !== null
                                ? 'border-[#1e2328] text-slate-600 bg-[#0E1012]'
                                : 'border-[#2a2f36] text-slate-400 hover:border-[#E67E22]/50 hover:text-slate-200'
                            }`}
                          >
                            {member.avatar} {member.name}
                            {votes[member.id] === alt.id && ' ✓'}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Manual confirm */}
              {groupFavorite && (
                <div className="text-center">
                  <button
                    onClick={() => setSelected(groupFavorite)}
                    className="px-8 py-3 bg-[#E2725B] text-white font-mono font-bold rounded hover:bg-[#E67E22] transition-colors"
                  >
                    CONFIRM GROUP FAVORITE
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
