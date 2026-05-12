import { useState, useEffect, useRef } from 'react';
import { useTripStore } from '../../store/useTripStore';
import { fetchElevations } from '../../utils/elevationService';

const SURFACE = {
  foot:   { color: '#8B6914', label: 'TRAIL' },
  bus:    { color: '#D9C5B2', label: 'PAVED' },
  flight: { color: '#3B82F6', label: 'AIR' },
  boat:   { color: '#3B82F6', label: 'WATER' },
};

const MODE_BAND = {
  flight: { color: '#E67E22', opacity: 0.06 },
  foot:   { color: '#64dc82', opacity: 0.04 },
  bus:    { color: '#64a0ff', opacity: 0.05 },
  train:  { color: '#64a0ff', opacity: 0.05 },
  boat:   { color: '#64a0ff', opacity: 0.05 },
  drive:  { color: '#D9C5B2', opacity: 0.04 },
};
const DEFAULT_SURFACE = { color: '#D9C5B2', label: 'PAVED' };

const GROUND_MODES = new Set(['foot', 'bus']);

// Interpolate n evenly-spaced points between two lat/lng coords
function sampleSegment([lat1, lng1], [lat2, lng2], n = 4) {
  return Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1);
    return { lat: lat1 + (lat2 - lat1) * t, lng: lng1 + (lng2 - lng1) * t };
  });
}

// Normalise elevation array to SVG Y coords (top = low Y = high elevation)
function normalize(values, height) {
  const valid = values.filter(v => v !== null);
  if (!valid.length) return values.map(() => height / 2);
  const min = Math.min(...valid);
  const max = Math.max(...valid);
  const range = max - min || 1;
  return values.map(v => v === null ? height / 2 : height - ((v - min) / range) * (height * 0.75) - height * 0.1);
}

const SVG_W = 600;
const SVG_H = 80;

// Deterministic RNG seeded by destination string
function seededRng(seed) {
  let s = typeof seed === 'string'
    ? seed.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
    : seed;
  return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
}

// Build SVG mountain silhouette path for given viewbox width/height
function buildSilhouette(w, h, seed, peakHeightRatio = 0.65) {
  const rng = seededRng(seed);
  const peakCount = 7;
  const peaks = Array.from({ length: peakCount }, (_, i) => ({
    x: (i / (peakCount - 1)) * w,
    y: h - rng() * h * peakHeightRatio - h * 0.1,
  }));
  const pts = [{ x: 0, y: h }, ...peaks, { x: w, y: h }];
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const next = pts[i + 1];
    const cpx1 = prev.x + (curr.x - prev.x) * 0.5;
    const cpy1 = prev.y;
    const cpx2 = curr.x - (next.x - curr.x) * 0.2;
    const cpy2 = curr.y;
    d += ` C${cpx1},${cpy1} ${cpx2},${cpy2} ${curr.x},${curr.y}`;
  }
  d += ` L${pts[pts.length - 1].x},${pts[pts.length - 1].y} Z`;
  return d;
}

export default function ElevationStrip() {
  const { legs, trip } = useTripStore();
  const destinationSeed = trip?.destination ?? 'default';
  const [profile, setProfile] = useState(null); // { points, segments }
  const [hoverX, setHoverX] = useState(null);
  const svgRef = useRef(null);

  useEffect(() => {
    const groundLegs = legs.filter(l => l.coords && GROUND_MODES.has(l.mode));
    if (groundLegs.length < 2) { setProfile(null); return; }

    let cancelled = false;
    async function load() {
      // Build sample points and track which leg each belongs to
      const allPoints = [];
      const segmentMeta = []; // { mode, startIdx, endIdx }

      for (let i = 0; i < groundLegs.length - 1; i++) {
        const from = groundLegs[i].coords;
        const to   = groundLegs[i + 1].coords;
        if (!from || !to) continue;
        const samples = sampleSegment(from, to, 6);
        const start = allPoints.length;
        allPoints.push(...samples);
        segmentMeta.push({ mode: groundLegs[i].mode, startIdx: start, endIdx: allPoints.length - 1 });
      }

      if (!allPoints.length) return;
      const elevations = await fetchElevations(allPoints);
      if (cancelled) return;

      const yCoords = normalize(elevations, SVG_H - 12);
      const xStep = SVG_W / (allPoints.length - 1);
      const pts = yCoords.map((y, i) => ({ x: i * xStep, y, elev: elevations[i] }));

      setProfile({ pts, segmentMeta, xStep });
    }

    load();
    return () => { cancelled = true; };
  }, [legs]);

  // When no ground-leg data, show a synthetic placeholder from trip.days
  const { legs: allLegs } = useTripStore();
  const hasGroundLegs = allLegs.some(l => l.coords && GROUND_MODES.has(l.mode));

  function handleMouseMove(e) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const rawX = ((e.clientX - rect.left) / rect.width) * SVG_W;
    setHoverX(Math.max(0, Math.min(SVG_W, rawX)));
  }

  // Build SVG path string
  function buildPath(pts) {
    if (!pts?.length) return '';
    return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  }

  function buildFillPath(pts) {
    if (!pts?.length) return '';
    const top = buildPath(pts);
    return `${top} L${pts[pts.length - 1].x.toFixed(1)},${SVG_H} L0,${SVG_H} Z`;
  }

  // Find nearest point to hoverX
  function nearestPoint(pts, x) {
    if (!pts?.length) return null;
    return pts.reduce((best, p) => Math.abs(p.x - x) < Math.abs(best.x - x) ? p : best);
  }

  const hoverPt = hoverX !== null && profile ? nearestPoint(profile.pts, hoverX) : null;

  if (!hasGroundLegs && !profile) {
    return (
      <div
        className="tactical-panel"
        style={{ padding: '12px 16px' }}
      >
        <div className="label-tag" style={{ marginBottom: 8 }}>ELEVATION PROFILE</div>
        <PlaceholderStrip />
      </div>
    );
  }

  return (
    <div className="tactical-panel" style={{ padding: '12px 16px' }}>
      <div className="label-tag" style={{ marginBottom: 8 }}>ELEVATION PROFILE</div>

      <div
        style={{ position: 'relative', cursor: 'crosshair' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverX(null)}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          preserveAspectRatio="none"
          style={{ width: '100%', height: 80, display: 'block' }}
        >
          <defs>
            <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0d1b2a" />
              <stop offset="100%" stopColor="#0E1012" />
            </linearGradient>

            <linearGradient id="elevGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#E67E22" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#E67E22" stopOpacity="0.03" />
            </linearGradient>
          </defs>

          {/* Layer 1: sky */}
          <rect x={0} y={0} width={SVG_W} height={SVG_H} fill="url(#skyGrad)" />

          {/* Layer 2a: distant mountain silhouette */}
          <path
            d={buildSilhouette(SVG_W, SVG_H, destinationSeed + '_far', 0.7)}
            fill="#1a2535"
            opacity={0.6}
          />

          {/* Layer 2b: near mountain silhouette */}
          <path
            d={buildSilhouette(SVG_W, SVG_H, destinationSeed + '_near', 0.45)}
            fill="#1a1f26"
            opacity={0.8}
          />

          {/* Layer 3: transport-mode tint bands — only when profile available */}
          {profile && profile.segmentMeta.map((seg, i) => {
            const band = MODE_BAND[seg.mode];
            if (!band) return null;
            const x1 = profile.pts[seg.startIdx]?.x ?? 0;
            const x2 = profile.pts[seg.endIdx]?.x ?? SVG_W;
            return (
              <rect
                key={`band-${i}`}
                x={x1} y={0}
                width={x2 - x1} height={SVG_H}
                fill={band.color}
                opacity={band.opacity}
              />
            );
          })}

          {profile ? (
            <>
              <path d={buildFillPath(profile.pts)} fill="url(#elevGrad)" />
              <path d={buildPath(profile.pts)} stroke="#E67E22" strokeWidth="1.5" fill="none" />

              {/* Surface baseline segments */}
              {profile.segmentMeta.map((seg, i) => {
                const s = SURFACE[seg.mode] ?? DEFAULT_SURFACE;
                const x1 = profile.pts[seg.startIdx]?.x ?? 0;
                const x2 = profile.pts[seg.endIdx]?.x ?? SVG_W;
                return (
                  <rect
                    key={i}
                    x={x1} y={SVG_H - 4}
                    width={x2 - x1} height={3}
                    fill={s.color}
                    rx={1}
                  />
                );
              })}
            </>
          ) : (
            <PlaceholderSVG />
          )}

          {/* Hover indicator */}
          {hoverPt && (
            <>
              <line
                x1={hoverPt.x} y1={0}
                x2={hoverPt.x} y2={SVG_H}
                stroke="#E67E22" strokeWidth={1}
                strokeDasharray="3 2" opacity={0.6}
              />
              <circle cx={hoverPt.x} cy={hoverPt.y} r={3.5} fill="#E67E22" />
              {hoverPt.elev !== null && (
                <>
                  <rect
                    x={Math.min(hoverPt.x + 6, SVG_W - 90)} y={hoverPt.y - 10}
                    width={82} height={16}
                    rx={2} fill="rgba(14,16,18,0.92)"
                    stroke="#2a2f36" strokeWidth={1}
                  />
                  <text
                    x={Math.min(hoverPt.x + 47, SVG_W - 49)} y={hoverPt.y + 2}
                    textAnchor="middle"
                    fontSize={8} fill="#F2EDE8"
                    fontFamily="'JetBrains Mono', monospace"
                  >
                    {hoverPt.elev != null ? `${Math.round(hoverPt.elev)} m` : '—'}
                  </text>
                </>
              )}
            </>
          )}
        </svg>
      </div>

      {/* X-axis labels + destination name */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: '#484440', letterSpacing: '0.04em' }}>START</span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: '#484440', letterSpacing: '0.04em' }}>MID</span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: '#484440', letterSpacing: '0.04em' }}>END</span>
      </div>
      {(legs[legs.length - 1]?.to?.label || trip?.destination) && (
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 7, color: '#8A8680', letterSpacing: '0.06em', marginTop: 2 }}>
          {(legs[legs.length - 1]?.to?.label || trip?.destination || '').toUpperCase()}
        </div>
      )}

      {/* Surface legend */}
      <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
        {Object.entries(SURFACE).filter(([m]) => GROUND_MODES.has(m)).map(([, s]) => (
          <span key={s.label} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: '#8A8680', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 10, height: 3, background: s.color, borderRadius: 1, display: 'inline-block' }} />
            {s.label}
          </span>
        ))}
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: '#484440', marginLeft: 'auto' }}>hover to inspect</span>
      </div>
    </div>
  );
}

// Shown when no ground leg coordinate data is available yet
function PlaceholderStrip() {
  return (
    <>
      <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        preserveAspectRatio="none"
        style={{ width: '100%', height: 80, display: 'block', opacity: 0.4 }}
      >
        <PlaceholderSVG />
      </svg>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#484440', letterSpacing: '0.06em', marginTop: 4 }}>
        ADD GROUND LEGS WITH COORDINATES TO SEE ELEVATION DATA
      </div>
    </>
  );
}

function PlaceholderSVG() {
  const pts = [
    { x: 0, y: 60 }, { x: 80, y: 50 }, { x: 160, y: 35 }, { x: 240, y: 28 },
    { x: 320, y: 20 }, { x: 380, y: 15 }, { x: 440, y: 22 }, { x: 500, y: 30 }, { x: 600, y: 38 },
  ];
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const fill = `${line} L600,${SVG_H} L0,${SVG_H} Z`;
  return (
    <>
      <defs>
        <linearGradient id="elevGradPh" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E67E22" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#E67E22" stopOpacity="0.03" />
        </linearGradient>
      </defs>
      <path d={fill} fill="url(#elevGradPh)" />
      <path d={line} stroke="#E67E22" strokeWidth="1.5" fill="none" />
      <rect x={0}   y={SVG_H - 4} width={200} height={3} fill="#D9C5B2" rx={1} />
      <rect x={200} y={SVG_H - 4} width={160} height={3} fill="#8B6914" rx={1} />
      <rect x={360} y={SVG_H - 4} width={140} height={3} fill="#5C9A6A" rx={1} />
      <rect x={500} y={SVG_H - 4} width={100} height={3} fill="#D9C5B2" rx={1} />
    </>
  );
}
