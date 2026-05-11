import { useState } from 'react';
import LegCard from './LegCard';

let _id = 0;
function newLeg(mode = null, from = '', to = '') {
  return { id: `leg-${++_id}`, mode, from, to, searched: false };
}

export default function PublicTransport({ destination = '' }) {
  const [legs, setLegs] = useState([newLeg('flight', '', destination)]);

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

  // Build route summary nodes
  const summaryNodes = [];
  legs.forEach((leg, i) => {
    if (i === 0 && leg.from) summaryNodes.push({ type: 'city', label: leg.from });
    if (leg.mode) {
      summaryNodes.push({
        type: 'connector',
        label: leg.mode === 'flight' ? '──✈──' : '──🚂──',
        mode: leg.mode,
      });
    }
    if (leg.to) summaryNodes.push({ type: 'city', label: leg.to });
  });

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

      <button
        onClick={addLeg}
        className="w-full py-3 rounded-lg border border-dashed border-[#2a2f36] text-[9px] font-mono text-slate-600 tracking-widest hover:border-slate-500 hover:text-slate-400 transition-colors"
      >
        + ADD LEG
      </button>

      {summaryNodes.length > 0 && (
        <div className="bg-[#0d0f12] border border-[#1a1f24] rounded-lg px-4 py-3">
          <div className="text-[8px] font-mono text-slate-600 tracking-widest mb-2">ROUTE SUMMARY</div>
          <div className="flex flex-wrap items-center gap-1 text-[10px] font-mono">
            {summaryNodes.map((node, i) => (
              <span
                key={i}
                style={{
                  color: node.type === 'connector'
                    ? (node.mode === 'flight' ? '#E67E22' : '#4a9eff')
                    : '#ffffff',
                }}
              >
                {node.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
