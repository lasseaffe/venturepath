import { useMemo } from 'react';
import { POI_CATEGORIES, classifyPoi } from '../../utils/poiCategories';
import { haversineKm } from '../../utils/bearingEngine';

const RINGS = [
  { label: '500m', km: 0.5  },
  { label: '1km',  km: 1.0  },
  { label: '2km',  km: 2.0  },
  { label: '5km',  km: 5.0  },
];

const SVG_SIZE   = 200;
const SVG_CENTER = SVG_SIZE / 2;
// Map 5km to 85px radius (outermost ring)
const KM_TO_PX   = 85 / 5;

function ringRadius(km) { return km * KM_TO_PX; }

export default function RadarHUD({ pois = [], center, activeLayers }) {
  // Build per-ring, per-category hit counts
  const ringData = useMemo(() => {
    if (!center) return [];
    return RINGS.map(ring => {
      const hits = {};
      for (const cat of POI_CATEGORIES) {
        if (!activeLayers?.has(cat.id)) continue;
        hits[cat.id] = 0;
      }
      for (const poi of pois) {
        if (!poi.coords) continue;
        const catId = classifyPoi(poi);
        if (!catId || !activeLayers?.has(catId)) continue;
        const dist = haversineKm(center, { lat: poi.coords.lat, lng: poi.coords.lng });
        if (dist <= ring.km) hits[catId] = (hits[catId] ?? 0) + 1;
      }
      return { ...ring, hits };
    });
  }, [pois, center, activeLayers]);

  const activeCats = POI_CATEGORIES.filter(c => activeLayers?.has(c.id));

  return (
    <div
      className="absolute top-3 right-3 z-[1000] rounded-lg overflow-hidden"
      style={{ width: SVG_SIZE, height: SVG_SIZE, background: 'rgba(14,16,18,0.85)' }}
    >
      <svg width={SVG_SIZE} height={SVG_SIZE}>
        {/* Ring labels */}
        {RINGS.map(ring => (
          <text
            key={ring.label}
            x={SVG_CENTER + ringRadius(ring.km) + 2}
            y={SVG_CENTER - 2}
            fontSize={8}
            fill="#2a2e35"
            fontFamily="monospace"
          >{ring.label}</text>
        ))}

        {/* Concentric rings */}
        {RINGS.map(ring => (
          <circle
            key={ring.label}
            cx={SVG_CENTER}
            cy={SVG_CENTER}
            r={ringRadius(ring.km)}
            fill="none"
            stroke="#1e2328"
            strokeWidth={1}
          />
        ))}

        {/* Category dots on rings */}
        {ringData.map((ring, ri) =>
          activeCats.map((cat, ci) => {
            const count = ring.hits[cat.id] ?? 0;
            if (count === 0) return null;
            const angle = (ci / activeCats.length) * 2 * Math.PI - Math.PI / 2;
            const r     = ringRadius(ring.km);
            const cx    = SVG_CENTER + r * Math.cos(angle);
            const cy    = SVG_CENTER + r * Math.sin(angle);
            return (
              <circle
                key={`${ri}-${cat.id}`}
                cx={cx}
                cy={cy}
                r={4}
                fill={cat.color}
                opacity={0.9}
              />
            );
          })
        )}

        {/* Center pulse dot */}
        <circle cx={SVG_CENTER} cy={SVG_CENTER} r={5} fill="#E67E22" opacity={0.9}>
          <animate attributeName="r" values="5;8;5" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.9;0.4;0.9" dur="2s" repeatCount="indefinite" />
        </circle>

        {/* Crosshairs */}
        <line x1={SVG_CENTER} y1={SVG_CENTER - 85} x2={SVG_CENTER} y2={SVG_CENTER + 85} stroke="#1e2328" strokeWidth={0.5} />
        <line x1={SVG_CENTER - 85} y1={SVG_CENTER} x2={SVG_CENTER + 85} y2={SVG_CENTER} stroke="#1e2328" strokeWidth={0.5} />

        {/* "RADAR" label */}
        <text x={4} y={12} fontSize={7} fill="#2a2e35" fontFamily="monospace" letterSpacing={2}>RADAR</text>
      </svg>

      {/* Category legend */}
      <div className="absolute bottom-1 left-1 right-1 flex flex-wrap gap-1 justify-center">
        {activeCats.map(cat => (
          <span key={cat.id} className="flex items-center gap-0.5" style={{ fontSize: 8, color: cat.color, fontFamily: 'monospace' }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: cat.color, display: 'inline-block' }} />
            {cat.label.slice(0, 3)}
          </span>
        ))}
      </div>
    </div>
  );
}
