import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { findAlternatives } from '../../utils/alternativeEngine';

const MODE_META = {
  flight: { header: 'SERVICE DISRUPTED',  accent: '#E67E22', icon: '✈' },
  train:  { header: 'SERVICE DISRUPTED',  accent: '#4a9eff', icon: '🚂' },
  bus:    { header: 'ROUTE DIVERSION',    accent: '#22a060', icon: '🚌' },
  tram:   { header: 'SERVICE DISRUPTION', accent: '#a855f7', icon: '🚃' },
};

const SQUAD = [
  { id: 'lead',  label: 'Lead',  icon: '🧗' },
  { id: 'scout', label: 'Scout', icon: '🗺' },
  { id: 'medic', label: 'Medic', icon: '🩺' },
];

const PRIORITIES = [
  { badge: 'FASTEST ROUTE',   icon: '⚡' },
  { badge: 'ECONOMY OPTION',  icon: '💰' },
  { badge: 'GREENEST OPTION', icon: '🌿' },
];

export default function EmergencyRebook({ onClose, route, mode, fromCoords, toCoords, cascadeRisk }) {
  const meta        = MODE_META[mode] ?? MODE_META.train;
  const isCascade   = !!cascadeRisk;
  const initialTime = isCascade && cascadeRisk.severity === 'red' ? 45 : 60;

  const [alts, setAlts]               = useState([]);
  const [altsLoading, setAltsLoading] = useState(true);
  const [altsError, setAltsError]     = useState(false);
  const [selected, setSelected]       = useState(null);
  const [votes, setVotes]             = useState({ 0: [], 1: [], 2: [] });
  const [confirmed, setConfirmed]     = useState(false);
  const [timeLeft, setTimeLeft]       = useState(initialTime);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!fromCoords || !toCoords) { setAltsLoading(false); return; }
    findAlternatives(fromCoords, toCoords, new Date().toISOString())
      .then(results => { setAlts(results.slice(0, 3)); setAltsLoading(false); })
      .catch(() => { setAltsError(true); setAltsLoading(false); });
  }, []);

  useEffect(() => {
    if (confirmed || altsLoading) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          const bestIdx = [0, 1, 2].reduce((best, i) => (votes[i]?.length ?? 0) > (votes[best]?.length ?? 0) ? i : best, 0);
          setSelected(bestIdx);
          setConfirmed(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [altsLoading, confirmed]);

  const groupFavorite = [0, 1, 2].reduce(
    (best, i) => (votes[i]?.length ?? 0) > (votes[best]?.length ?? 0) ? i : best, 0
  );

  const cards = alts.length > 0
    ? alts.map((a, i) => ({ ...a, ...PRIORITIES[i] }))
    : PRIORITIES.map((p, i) => ({ ...p, id: `placeholder-${i}`, label: '—', duration: '—', price: null, co2: 0 }));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: 'rgba(10,10,14,0.97)' }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          <span className="text-lg">{meta.icon}</span>
          <div>
            <div className="text-[10px] font-mono tracking-widest" style={{ color: meta.accent }}>⚠ {meta.header}</div>
            <div className="text-[9px] font-mono text-[var(--text-muted)]">{route}</div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {!confirmed && (
            <div className="text-right">
              <div className="text-[8px] font-mono text-[var(--text-muted)] tracking-widest">AUTO-SELECT IN</div>
              <div className="text-2xl font-mono font-bold" style={{ color: meta.accent }}>{timeLeft}s</div>
            </div>
          )}
          <button onClick={onClose} className="text-[9px] font-mono text-[var(--text-muted)] hover:text-white tracking-widest">✕ CLOSE</button>
        </div>
      </div>

      {/* Progress bar */}
      {!confirmed && (
        <div className="h-0.5 w-full" style={{ background: '#1e2328' }}>
          <motion.div
            className="h-full"
            style={{ background: meta.accent }}
            initial={{ width: '100%' }}
            animate={{ width: `${(timeLeft / initialTime) * 100}%` }}
            transition={{ duration: 1, ease: 'linear' }}
          />
        </div>
      )}

      <div className="flex-1 overflow-auto px-6 py-4">
        {/* Cascade banner */}
        {isCascade && (
          <div className="mb-4 px-4 py-2 rounded border border-amber-500/40 bg-amber-900/20 text-[9px] font-mono text-amber-300 tracking-widest">
            ↑ CASCADE — upstream disruption caused this missed connection
            {cascadeRisk.remainingMinutes < 0 && ` (${Math.abs(cascadeRisk.remainingMinutes)}m overrun)`}
          </div>
        )}

        <div className="text-center mb-4">
          <div className="text-white font-mono text-sm">AI found {alts.length || '…'} alternatives</div>
          <div className="text-[9px] font-mono text-[var(--text-muted)] tracking-widest mt-0.5">SQUAD FLASH VOTE — SELECT YOUR PREFERENCE</div>
        </div>

        {altsError && (
          <div className="text-center text-[9px] font-mono text-red-400 tracking-widest mb-4">
            LIVE ALTERNATIVES UNAVAILABLE — squad vote disabled, manual rebook required
          </div>
        )}

        {/* Alternative cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {cards.map((card, cardIdx) => (
            <div
              key={card.id ?? cardIdx}
              className={`rounded-lg border p-4 transition-colors ${
                selected === cardIdx ? '' : 'border-[#2a2f36]'
              } ${cardIdx === groupFavorite && !altsLoading ? 'ring-1 ring-inset' : ''}`}
              style={{
                background: '#0e1118',
                ...(selected === cardIdx ? { borderColor: meta.accent, borderWidth: 1, borderStyle: 'solid' } : {}),
              }}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="text-[8px] font-mono tracking-widest text-[var(--text-muted)]">{card.badge}</div>
                  {cardIdx === groupFavorite && !altsLoading && (
                    <div className="text-[7px] font-mono tracking-widest mt-0.5" style={{ color: meta.accent }}>★ GROUP FAVOURITE</div>
                  )}
                </div>
                <span className="text-xl">{card.icon}</span>
              </div>

              {altsLoading ? (
                <div className="space-y-2 animate-pulse">
                  <div className="h-4 bg-white/10 rounded w-3/4" />
                  <div className="h-3 bg-white/10 rounded w-1/2" />
                  <div className="h-6 bg-white/10 rounded w-1/3" />
                </div>
              ) : (
                <>
                  <div className="text-white font-mono text-sm font-semibold mb-1">{card.label}</div>
                  <div className="text-[10px] font-mono text-[var(--text-muted)]">{card.duration}</div>
                  <div className="text-lg font-mono font-bold mt-1" style={{ color: meta.accent }}>
                    {card.price != null ? `€${card.price}` : '—'}
                  </div>
                </>
              )}

              {/* Squad vote buttons */}
              <div className="mt-3 space-y-1">
                {SQUAD.map(member => {
                  const hasVoted = votes[cardIdx]?.includes(member.id);
                  return (
                    <button
                      key={member.id}
                      type="button"
                      disabled={altsLoading || altsError}
                      onClick={() => {
                        setVotes(prev => {
                          const cleared = {
                            0: prev[0].filter(v => v !== member.id),
                            1: prev[1].filter(v => v !== member.id),
                            2: prev[2].filter(v => v !== member.id),
                          };
                          return { ...cleared, [cardIdx]: hasVoted ? cleared[cardIdx] : [...cleared[cardIdx], member.id] };
                        });
                      }}
                      className={`w-full text-left px-2 py-1 rounded text-[9px] font-mono transition-colors border ${
                        hasVoted ? 'border-white/30 bg-white/10 text-white' : 'border-white/10 text-[var(--text-muted)] hover:bg-white/5'
                      }`}
                    >
                      {member.icon} {member.label}{hasVoted && ' ✓'}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Confirm */}
        {(confirmed || selected !== null) && !altsLoading && (
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={onClose}
              className="px-8 py-2 rounded font-mono text-sm font-bold tracking-widest text-[#0E1012] transition-colors"
              style={{ background: meta.accent }}
            >
              CONFIRM REBOOK
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
