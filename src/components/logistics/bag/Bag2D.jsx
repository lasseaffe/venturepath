// src/components/logistics/bag/Bag2D.jsx
import { motion } from 'framer-motion';

const ZONE_PATHS = {
  main:         { x: 20,  y: 80,  w: 160, h: 130, label: 'Main' },
  top_lid:      { x: 30,  y: 10,  w: 140, h: 60,  label: 'Top Lid' },
  hip_belt:     { x: 10,  y: 220, w: 180, h: 40,  label: 'Hip Belt' },
  side_pocket:  { x: 160, y: 90,  w: 30,  h: 80,  label: 'Side' },
  front_pocket: { x: 40,  y: 150, w: 80,  h: 50,  label: 'Front' },
};

const CAT_COLORS = {
  'Base Camp':      '#5C4033',
  'Navigation':     '#2E4057',
  'Shelter & Sleep':'#3B5E3A',
  'Food & Water':   '#5E4B1A',
  'Medical':        '#5C2020',
  'Clothing':       '#3A3A5C',
  'Tech & Power':   '#1A4040',
};

export default function Bag2D({ zoneMap, packed, zoneMode }) {
  if (zoneMode === 'category') {
    const categories = Object.keys(zoneMap);
    const sliceH = categories.length ? Math.floor(260 / categories.length) : 260;
    return (
      <svg viewBox="0 0 200 280" className="w-full h-full" style={{ maxHeight: 340 }}>
        <BagOutline />
        {categories.map((cat, i) => {
          const items = zoneMap[cat] ?? [];
          const packedInZone = items.filter(it => packed[it.id]).length;
          const fillPct = items.length ? packedInZone / items.length : 0;
          const y = 10 + i * sliceH;
          return (
            <g key={cat}>
              <rect x="20" y={y} width="160" height={sliceH - 4} rx="4"
                fill={CAT_COLORS[cat] ?? '#2a2f36'} opacity="0.5" />
              <rect x="20" y={y} width={160 * fillPct} height={sliceH - 4} rx="4"
                fill="#E67E22" opacity="0.7" />
              <text x="100" y={y + sliceH / 2} textAnchor="middle" dominantBaseline="middle"
                fill="#D9C5B2" fontSize="7" fontFamily="JetBrains Mono, monospace">
                {cat.toUpperCase()}
              </text>
            </g>
          );
        })}
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 200 280" className="w-full h-full" style={{ maxHeight: 340 }}>
      <BagOutline />
      {Object.entries(ZONE_PATHS).map(([zoneId, z]) => {
        const items = zoneMap[zoneId] ?? [];
        const packedInZone = items.filter(it => packed[it.id]).length;
        const fillPct = items.length ? packedInZone / items.length : 0;
        return (
          <g key={zoneId}>
            <rect x={z.x} y={z.y} width={z.w} height={z.h} rx="4"
              fill="#1e2328" stroke="#2a2f36" strokeWidth="1" />
            <motion.rect
              x={z.x} y={z.y} rx="4"
              height={z.h}
              fill="#E67E22"
              opacity={0.6}
              initial={{ width: 0 }}
              animate={{ width: z.w * fillPct }}
              transition={{ type: 'spring', stiffness: 60 }}
            />
            <text x={z.x + z.w / 2} y={z.y + z.h / 2}
              textAnchor="middle" dominantBaseline="middle"
              fill="#D9C5B2" fontSize="6" fontFamily="JetBrains Mono, monospace">
              {z.label.toUpperCase()}
            </text>
            <text x={z.x + z.w - 4} y={z.y + 8}
              textAnchor="end"
              fill="#E67E22" fontSize="6" fontFamily="JetBrains Mono, monospace">
              {packedInZone}/{items.length}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function BagOutline() {
  return (
    <>
      <path d="M70 10 Q100 0 130 10" stroke="#4a5568" strokeWidth="3" fill="none" />
      <rect x="15" y="8" width="170" height="264" rx="16"
        fill="#0E1012" stroke="#E67E22" strokeWidth="1.5" />
    </>
  );
}
