import { useState } from 'react';
import { useTripStore } from '../../store/useTripStore';

// Fallback legs when used outside store context
const FALLBACK_LEGS = [
  { id: 1, from: 'Home Base', to: 'Gateway City', mode: 'flight', durationH: 11, distanceKm: 8400, status: 'confirmed' },
  { id: 2, from: 'Gateway City', to: 'Trailhead Camp', mode: 'bus', durationH: 6, distanceKm: 320, status: 'confirmed' },
  { id: 3, from: 'Trailhead Camp', to: 'Summit Approach', mode: 'foot', durationH: 8, distanceKm: 22, status: 'pending' },
  { id: 4, from: 'Summit Approach', to: 'Base Camp Alpha', mode: 'foot', durationH: 5, distanceKm: 12, status: 'pending' },
  { id: 5, from: 'Base Camp Alpha', to: 'Home Base', mode: 'flight', durationH: 13, distanceKm: 9100, status: 'pending' },
];

const MODE_CONFIG = {
  flight: { icon: '✈', color: '#E67E22', label: 'Flight' },
  bus: { icon: '🚌', color: '#3b82f6', label: 'Overland' },
  foot: { icon: '⛰', color: '#22c55e', label: 'On Foot' },
  boat: { icon: '⛵', color: '#06b6d4', label: 'Boat' },
};

const STATUS_BADGE = {
  confirmed: 'bg-green-900/50 text-green-400 border border-green-700',
  pending: 'bg-yellow-900/40 text-yellow-400 border border-yellow-700',
  cancelled: 'bg-red-900/40 text-red-400 border border-red-700',
};

export default function TransitMap({ legs: legsProp }) {
  let storeLegs;
  try {
    storeLegs = useTripStore().legs;
  } catch {
    storeLegs = null;
  }
  const legs = legsProp ?? storeLegs ?? FALLBACK_LEGS;
  const [selected, setSelected] = useState(null);

  const totalKm = legs.reduce((s, l) => s + l.distanceKm, 0);
  const totalH = legs.reduce((s, l) => s + l.durationH, 0);

  return (
    <div className="tactical-panel p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="label-tag">Transit Map</h2>
        <div className="flex gap-4 text-xs text-[var(--text-secondary)] font-mono">
          <span>{totalKm.toLocaleString()} km</span>
          <span>{totalH}h total</span>
        </div>
      </div>

      {/* Route line */}
      <div className="relative">
        {legs.map((leg, i) => {
          const cfg = MODE_CONFIG[leg.mode] ?? MODE_CONFIG.foot;
          const isSelected = selected === leg.id;

          return (
            <div key={leg.id}>
              {/* Node */}
              <button
                onClick={() => setSelected(isSelected ? null : leg.id)}
                className={`w-full text-left flex items-start gap-3 p-3 rounded-lg transition-colors ${
                  isSelected ? 'bg-[#1e2830]' : 'hover:bg-[#1a1f24]'
                }`}
              >
                <div className="flex flex-col items-center mt-1 shrink-0">
                  <div
                    className="w-3 h-3 rounded-full border-2"
                    style={{ borderColor: cfg.color, background: isSelected ? cfg.color : 'transparent' }}
                  />
                  {i < legs.length - 1 && (
                    <div className="w-px flex-1 min-h-[32px]" style={{ background: cfg.color, opacity: 0.3 }} />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-white truncate">{leg.from}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${STATUS_BADGE[leg.status]}`}>
                      {leg.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-[var(--text-secondary)]">
                    <span style={{ color: cfg.color }}>{cfg.icon}</span>
                    <span>{cfg.label}</span>
                    <span>·</span>
                    <span>{leg.durationH}h</span>
                    <span>·</span>
                    <span>{leg.distanceKm.toLocaleString()} km</span>
                  </div>

                  {isSelected && (
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <Stat label="Destination" value={leg.to} />
                      <Stat label="Mode" value={cfg.label} />
                      <Stat label="Distance" value={`${leg.distanceKm.toLocaleString()} km`} />
                      <Stat label="Duration" value={`${leg.durationH}h`} />
                    </div>
                  )}
                </div>
              </button>

              {/* Last node */}
              {i === legs.length - 1 && (
                <div className="flex items-center gap-3 px-3 pt-1">
                  <div className="w-3 h-3 rounded-full border-2 border-[#E67E22] bg-[#E67E22] ml-0" />
                  <span className="text-sm font-semibold text-white">{leg.to}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-[#0E1012] rounded p-2">
      <div className="label-tag text-[10px] mb-0.5">{label}</div>
      <div className="text-white font-mono">{value}</div>
    </div>
  );
}
