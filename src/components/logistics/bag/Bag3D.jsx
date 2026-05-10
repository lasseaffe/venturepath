// src/components/logistics/bag/Bag3D.jsx
import { motion } from 'framer-motion';

const FIXED_LAYERS = [
  { id: 'top_lid',      label: 'TOP LID',    color: '#1a2535' },
  { id: 'main',         label: 'MAIN',       color: '#0E1012' },
  { id: 'front_pocket', label: 'FRONT',      color: '#151b22' },
  { id: 'hip_belt',     label: 'HIP BELT',   color: '#0a0d10' },
  { id: 'side_pocket',  label: 'SIDE',       color: '#1a1f24' },
];

const CAT_LAYER_COLORS = [
  '#1a2535','#0E1012','#151b22','#0a0d10','#1a1f24','#1e2810','#1a1030',
];

export default function Bag3D({ zoneMap, packed, zoneMode }) {
  const layers = zoneMode === 'category'
    ? Object.keys(zoneMap).map((cat, i) => ({
        id: cat, label: cat.toUpperCase(), color: CAT_LAYER_COLORS[i % CAT_LAYER_COLORS.length],
      }))
    : FIXED_LAYERS;

  return (
    <div className="flex flex-col items-center justify-center h-full"
      style={{ perspective: '600px' }}>
      <div style={{ transform: 'rotateX(30deg)', transformStyle: 'preserve-3d' }}
        className="w-48 space-y-1">
        <div className="w-20 h-3 mx-auto rounded-full border border-[#E67E22]/40 bg-[#0E1012]" />
        {layers.map((layer, i) => {
          const items = zoneMap[layer.id] ?? [];
          const packedInZone = items.filter(it => packed[it.id]).length;
          const fillPct = items.length ? packedInZone / items.length : 0;
          return (
            <div key={layer.id} className="relative rounded overflow-hidden border border-[#2a2f36]"
              style={{
                background: layer.color,
                height: 36 + (i === 1 ? 24 : 0),
                transform: `translateZ(${(layers.length - i) * 2}px)`,
              }}>
              <motion.div
                className="absolute left-0 top-0 bottom-0 bg-[#E67E22]"
                style={{ opacity: 0.55 }}
                initial={{ width: '0%' }}
                animate={{ width: `${fillPct * 100}%` }}
                transition={{ type: 'spring', stiffness: 60 }}
              />
              <div className="absolute inset-0 flex items-center justify-between px-2">
                <span className="text-[8px] font-mono text-[#D9C5B2] z-10">
                  {layer.label}
                </span>
                <span className="text-[8px] font-mono text-[#E67E22] z-10">
                  {packedInZone}/{items.length}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
