// src/components/logistics/BagHud.jsx
import { useState } from 'react';
import Bag2D from './bag/Bag2D';
import Bag3DModel from './bag/Bag3DModel';
import { SKINS, SKIN_IDS } from './bag/bagSkins';

const VIEW_MODES = [
  { id: '2d',      label: '2D' },
  { id: '3dmodel', label: '3D MODEL' },
];

export default function BagHud({ bag, bagType, zoneMap, packed, onZoneClick, onZoneHover, onRemove }) {
  const [viewMode, setViewMode] = useState(
    () => {
      const stored = localStorage.getItem(`bagHud_viewMode_${bag.id}`);
      return (stored === '3d' || !stored) ? '2d' : stored;
    }
  );
  const [activeSkin, setActiveSkin] = useState(
    () => localStorage.getItem(`bagHud_skin_${bag.id}`) ?? bag.skinId ?? 'tactical'
  );

  const changeView = (v) => { localStorage.setItem(`bagHud_viewMode_${bag.id}`, v); setViewMode(v); };
  const changeSkin = (s) => { localStorage.setItem(`bagHud_skin_${bag.id}`, s); setActiveSkin(s); };

  const skin = SKINS[activeSkin] ?? SKINS.tactical;

  // Compute weight from zoneMap items
  const allItems = Object.values(zoneMap).flat();
  const stowedWeight = allItems.reduce((s, i) => s + (packed[i.id] ? (i.weight ?? 0) : 0), 0);
  const totalWeight  = allItems.reduce((s, i) => s + (i.weight ?? 0), 0);

  return (
    <div className="flex flex-col" style={{ height: 480 }}>

      {/* Top bar: skin selector + remove button */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[8px] font-mono text-slate-500 tracking-widest">SKIN</span>
        {SKIN_IDS.map(id => (
          <button
            key={id}
            title={SKINS[id].label}
            onClick={() => changeSkin(id)}
            style={{
              width: 18, height: 18, borderRadius: '50%',
              background: SKINS[id].chipColor,
              border: `2px solid ${activeSkin === id ? SKINS[id].chipBorder : '#2a2f36'}`,
              cursor: 'pointer', transition: 'border-color 0.15s', padding: 0,
            }}
          />
        ))}
        <span className="text-[8px] font-mono text-slate-600 ml-1">{skin.label}</span>

        {onRemove && (
          <button
            onClick={onRemove}
            style={{
              marginLeft: 'auto',
              background: 'none', border: '1px solid #c0392b', color: '#c0392b',
              fontFamily: 'JetBrains Mono, monospace', fontSize: 7,
              padding: '3px 8px', borderRadius: 3, cursor: 'pointer',
            }}
          >
            ✕ REMOVE BAG
          </button>
        )}
      </div>

      {/* View mode tabs */}
      <div className="flex gap-1.5 mb-3">
        {VIEW_MODES.map(m => (
          <button
            key={m.id}
            onClick={() => changeView(m.id)}
            className={`text-[9px] font-mono px-2 py-0.5 rounded border transition-colors ${
              viewMode === m.id
                ? 'border-[#E67E22] text-[#E67E22] bg-[#E67E22]/10'
                : 'border-[#2a2f36] text-slate-500 hover:border-slate-500'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Bag view */}
      <div className="flex-1 flex items-center justify-center">
        {viewMode === '2d' && (
          <Bag2D
            bagType={bagType}
            zoneMap={zoneMap}
            packed={packed}
            activeSkin={activeSkin}
            onZoneClick={onZoneClick}
            onZoneHover={onZoneHover}
          />
        )}
        {viewMode === '3dmodel' && (
          <Bag3DModel bagType={bagType} activeSkin={activeSkin} />
        )}
      </div>

      {/* Weight summary */}
      <div className="mt-3 text-[9px] font-mono text-slate-500 text-center">
        {stowedWeight.toFixed(2)} kg stowed
        &nbsp;/&nbsp;
        {totalWeight.toFixed(2)} kg total
        {bagType.weightLimitKg && (
          <span className="ml-2" style={{ color: totalWeight > bagType.weightLimitKg * 0.9 ? '#F2A900' : '#4a5568' }}>
            (limit {bagType.weightLimitKg} kg)
          </span>
        )}
      </div>
    </div>
  );
}
