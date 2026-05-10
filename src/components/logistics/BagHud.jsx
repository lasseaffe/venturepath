// src/components/logistics/BagHud.jsx
import Bag2D from './bag/Bag2D';
import Bag3D from './bag/Bag3D';
import Bag3DModel from './bag/Bag3DModel';
import { buildZoneMap } from './bag/bagZones';

const VIEW_MODES = [
  { id: '2d',      label: '2D' },
  { id: '3d',      label: '3D' },
  { id: '3dmodel', label: '3D MODEL' },
];

const ZONE_MODES = [
  { id: 'literal',  label: 'Zones' },
  { id: 'category', label: 'Category' },
  { id: 'priority', label: 'Priority' },
];

export default function BagHud({ items, packed, viewMode, zoneMode, onViewMode, onZoneMode }) {
  const zoneMap = buildZoneMap(items, zoneMode);

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-4 mb-3 flex-wrap">
        <ModeBar label="VIEW" modes={VIEW_MODES} active={viewMode} onChange={onViewMode} />
        <ModeBar label="ZONES" modes={ZONE_MODES} active={zoneMode} onChange={onZoneMode} />
      </div>

      <div className="flex-1 flex items-center justify-center">
        {viewMode === '2d'      && <Bag2D zoneMap={zoneMap} packed={packed} zoneMode={zoneMode} />}
        {viewMode === '3d'      && <Bag3D zoneMap={zoneMap} packed={packed} zoneMode={zoneMode} />}
        {viewMode === '3dmodel' && <Bag3DModel zoneMap={zoneMap} packed={packed} zoneMode={zoneMode} />}
      </div>

      <div className="mt-3 text-[9px] font-mono text-slate-500 text-center">
        {items.reduce((s, i) => s + (packed[i.id] ? i.weight : 0), 0).toFixed(2)} kg stowed
        &nbsp;/&nbsp;
        {items.reduce((s, i) => s + i.weight, 0).toFixed(2)} kg total
      </div>
    </div>
  );
}

function ModeBar({ label, modes, active, onChange }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[8px] font-mono text-slate-500 tracking-widest">{label}</span>
      {modes.map(m => (
        <button
          key={m.id}
          onClick={() => onChange(m.id)}
          className={`text-[9px] font-mono px-2 py-0.5 rounded border transition-colors ${
            active === m.id
              ? 'border-[#E67E22] text-[#E67E22] bg-[#E67E22]/10'
              : 'border-[#2a2f36] text-slate-500 hover:border-slate-500'
          }`}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
