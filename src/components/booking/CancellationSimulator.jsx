// src/components/booking/CancellationSimulator.jsx
import { useState, useMemo } from 'react';
import { simulateDelay } from '../../utils/simulatorEngine';
import sentinelBus from '../../utils/sentinelBus';
import { CANCELLATION_SIMULATED } from '../../utils/sentinelBusEvents';
import SimulatorNarrative from './SimulatorNarrative';

const STATUS_COLORS = { MISSED: 'text-red-400 border-red-400/40', TIGHT: 'text-amber-400 border-amber-400/40', SAFE: 'text-green-400 border-green-400/40' };

export default function CancellationSimulator({ leg, legs, onClose }) {
  const [delayHours, setDelayHours] = useState(0);

  const impacts = useMemo(() => {
    if (delayHours === 0) return [];
    const legsWithTimes = legs.map((l, i) => ({
      ...l,
      startISO: l.startISO ?? `2026-11-${12 + i}T08:00:00Z`,
      endISO: l.endISO ?? `2026-11-${12 + i}T10:00:00Z`,
    }));
    const results = simulateDelay(legsWithTimes, leg.id, delayHours);
    sentinelBus.emit(CANCELLATION_SIMULATED, { scenario: { trigger_leg: leg.id, delay_hours: delayHours, cascading_impacts: results } });
    return results;
  }, [delayHours, leg.id, legs]);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-[#0E1012] border border-[#E67E22]/30 rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-playfair text-white text-lg">What If?</h3>
          <button onClick={onClose} className="text-[#D9C5B2] font-mono text-sm">✕ Close</button>
        </div>

        <p className="text-[#D9C5B2] font-mono text-xs mb-4">
          Leg: {leg.from} → {leg.to}
        </p>

        <div className="mb-4">
          <label className="text-[#E67E22] font-mono text-xs mb-2 block">Delay: {delayHours}h</label>
          <input
            type="range" min={0} max={48} step={1}
            value={delayHours}
            onChange={e => setDelayHours(Number(e.target.value))}
            className="w-full accent-[#E67E22]"
          />
        </div>

        {impacts.length === 0 && delayHours === 0 && (
          <p className="text-[#D9C5B2] font-mono text-xs text-center py-4">Move the slider to simulate a delay.</p>
        )}

        {impacts.length > 0 && (
          <div className="space-y-2 mb-4">
            {impacts.map(impact => (
              <div key={impact.leg_id} className={`border rounded p-2 flex justify-between font-mono text-xs ${STATUS_COLORS[impact.status]}`}>
                <span>Leg {impact.leg_id}</span>
                <span>{impact.status} · {impact.buffer_hours}h buffer</span>
              </div>
            ))}
          </div>
        )}

        {delayHours > 0 && <SimulatorNarrative impacts={impacts} triggerLeg={leg} />}
      </div>
    </div>
  );
}
