import { useState, useRef, useEffect, useCallback } from 'react';
import LegCard from './LegCard';
import { fetchAlerts, checkCascade } from '../../utils/disruptionEngine';

let _id = 0;
function newLeg(mode = null, from = '', to = '') {
  return { id: `leg-${++_id}`, mode, from, to, searched: false };
}

function useInterval(callback, delayMs) {
  const savedCallback = useRef(callback);
  useEffect(() => { savedCallback.current = callback; }, [callback]);
  useEffect(() => {
    if (delayMs === null) return;
    const id = setInterval(() => savedCallback.current(), delayMs);
    return () => clearInterval(id);
  }, [delayMs]);
}

export default function PublicTransport({ destination = '' }) {
  const [legs, setLegs] = useState([newLeg('flight', '', destination)]);
  const [checking, setChecking] = useState(false);

  function updateLeg(id, patch) {
    setLegs(prev => prev.map(l => l.id === id ? { ...l, ...patch } : l));
  }

  function removeLeg(id) {
    setLegs(prev => prev.length > 1 ? prev.filter(l => l.id !== id) : prev);
  }

  function addLeg() {
    const last = legs[legs.length - 1];
    setLegs(prev => [...prev, newLeg(null, last?.to ?? '', '')]);
  }

  const runDisruptionCheck = useCallback(async () => {
    const confirmed = legs.filter(l => l.selectedOption?.tripId);
    if (confirmed.length === 0) return;
    setChecking(true);
    const updates = await Promise.all(
      confirmed.map(async l => ({ id: l.id, disruption: await fetchAlerts(l) }))
    );
    setLegs(prev => {
      const withDisruption = prev.map(l => {
        const u = updates.find(x => x.id === l.id);
        return u ? { ...l, disruption: u.disruption } : l;
      });
      const cascadeResults = checkCascade(withDisruption);
      return withDisruption.map(l => ({
        ...l,
        cascadeRisk: cascadeResults.find(r => r.legId === l.id) ?? null,
      }));
    });
    setChecking(false);
  }, [legs]);

  useInterval(runDisruptionCheck, 90_000);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="label-tag">Public Transport</h2>
      </div>

      {legs.map((leg, i) => (
        <LegCard
          key={leg.id}
          leg={leg}
          index={i}
          onUpdate={updateLeg}
          onRemove={legs.length > 1 ? removeLeg : null}
        />
      ))}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={addLeg}
          className="flex-1 py-2 rounded text-[9px] font-mono tracking-widest border border-dashed border-[#2a2f36] text-[var(--text-muted)] hover:border-white/20 hover:text-[var(--text-secondary)] transition-colors"
        >
          + ADD LEG
        </button>
        <button
          type="button"
          onClick={runDisruptionCheck}
          disabled={checking}
          className="px-4 py-2 rounded text-[9px] font-mono tracking-widest border border-[#2a2f36] text-[var(--text-muted)] hover:border-white/20 hover:text-[var(--text-secondary)] transition-colors disabled:opacity-40"
        >
          {checking ? '⟳ CHECKING…' : '⚡ CHECK ROUTE'}
        </button>
      </div>

      {legs.some(l => l.from || l.to) && (
        <div className="bg-[#0d0f12] border border-[#1a1f24] rounded-lg px-4 py-3">
          <div className="text-[8px] font-mono text-[var(--text-muted)] tracking-widest mb-2">ROUTE SUMMARY</div>
          <div className="flex items-center flex-wrap gap-1 text-[10px] font-mono">
            {legs.map((leg, i) => {
              const mc = { flight: '#E67E22', train: '#4a9eff', bus: '#22a060', tram: '#a855f7' }[leg.mode] ?? '#2a2f36';
              const modeIcon = { flight: '✈', train: '🚂', bus: '🚌', tram: '🚃' }[leg.mode] ?? '?';
              const nextLeg = legs[i + 1];
              const buffer = (leg.selectedOption?.arrival && nextLeg?.selectedOption?.departure)
                ? Math.round((new Date(nextLeg.selectedOption.departure) - new Date(leg.selectedOption.arrival)) / 60000)
                : null;
              const cr = nextLeg?.cascadeRisk;
              return (
                <span key={leg.id} className="flex items-center gap-1">
                  <span style={{ color: '#ffffff' }}>{leg.from || '—'}</span>
                  <span style={{ color: `${mc}99` }}>──{modeIcon}──</span>
                  <span style={{ color: '#ffffff' }}>{leg.to || '—'}</span>
                  {buffer !== null && (
                    <span
                      className="text-[8px] font-mono px-1 rounded"
                      style={{
                        color: cr?.severity === 'red' ? '#f87171' : cr?.severity === 'amber' ? '#fbbf24' : 'var(--text-muted)',
                      }}
                    >
                      {cr?.severity === 'red' ? 'MISSED ✕' : `+${buffer}m${cr ? ' ⚠' : ''}`}
                    </span>
                  )}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
