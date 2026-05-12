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

// Data coordinate space — distorted to fill width (correct for a line graph)
const DATA_W = 600;
const DATA_H = 80;

// Mountain coordinate space — natural aspect ratio so peaks look like peaks
const MTN_W = 600;
const MTN_H = 180;

// Rendered height of the strip in pixels
const STRIP_H = 80;

function sampleSegment([lat1, lng1], [lat2, lng2], n = 4) {
  return Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1);
    return { lat: lat1 + (lat2 - lat1) * t, lng: lng1 + (lng2 - lng1) * t };
  });
}

function normalize(values, height) {
  const valid = values.filter(v => v !== null);
  if (!valid.length) return values.map(() => height / 2);
  const min = Math.min(...valid);
  const max = Math.max(...valid);
  const range = max - min || 1;
  return values.map(v => v === null ? height / 2 : height - ((v - min) / range) * (height * 0.75) - height * 0.1);
}

function seededRng(seed) {
  let s = typeof seed === 'string'
    ? seed.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
    : seed;
  return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
}

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
  const [profile, setProfile] = useState(null);
  const [hoverX, setHoverX] = useState(null);
  const dataLayerRef = useRef(null);

  useEffect(() => {
    const groundLegs = legs.filter(l => l.coords && GROUND_MODES.has(l.mode));
    if (groundLegs.length < 2) { setProfile(null); return; }

    let cancelled = false;
    async function load() {
      const allPoints = [];
      const segmentMeta = [];

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

      const yCoords = normalize(elevations, DATA_H - 12);
      const xStep = DATA_W / (allPoints.length - 1);
      const pts = yCoords.map((y, i) => ({ x: i * xStep, y, elev: elevations[i] }));

      setProfile({ pts, segmentMeta, xStep });
    }

    load();
    return () => { cancelled = true; };
  }, [legs]);

  const hasGroundLegs = legs.some(l => l.coords && GROUND_MODES.has(l.mode));

  function handleMouseMove(e) {
    // hoverX is in DATA coordinate space — map from the inner data SVG's bounding rect
    const rect = dataLayerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const rawX = ((e.clientX - rect.left) / rect.width) * DATA_W;
    setHoverX(Math.max(0, Math.min(DATA_W, rawX)));
  }

  function buildPath(pts) {
    if (!pts?.length) return '';
    return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  }

  function buildFillPath(pts) {
    if (!pts?.length) return '';
    return `${buildPath(pts)} L${pts[pts.length - 1].x.toFixed(1)},${DATA_H} L0,${DATA_H} Z`;
  }

  function nearestPoint(pts, x) {
    if (!pts?.length) return null;
    return pts.reduce((best, p) => Math.abs(p.x - x) < Math.abs(best.x - x) ? p : best);
  }

  const hoverPt = hoverX !== null && profile ? nearestPoint(profile.pts, hoverX) : null;

  if (!hasGroundLegs && !profile) {
    return (
      <div className="tactical-panel" style={{ padding: '12px 16px' }}>
        <div className="label-tag" style={{ marginBottom: 8 }}>ELEVATION PROFILE</div>
        <PlaceholderStrip seed={destinationSeed} />
      </div>
    );
  }

  return (
    <div className="tactical-panel" style={{ padding: '12px 16px' }}>
      <div className="label-tag" style={{ marginBottom: 8 }}>ELEVATION PROFILE</div>

      <div
        style={{ position: 'relative', height: STRIP_H, cursor: 'crosshair', overflow: 'hidden' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverX(null)}
      >
        {/* Mountain backdrop — natural aspect ratio, anchored to bottom */}
        <svg
          viewBox={`0 0 ${MTN_W} ${MTN_H}`}
          preserveAspectRatio="xMidYMax slice"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0d1b2a" />
              <stop offset="100%" stopColor="#0E1012" />
            </linearGradient>
          </defs>
          <rect x={0} y={0} width={MTN_W} height={MTN_H} fill="url(#skyGrad)" />
          <path d={buildSilhouette(MTN_W, MTN_H, destinationSeed + '_far', 0.7)}  fill="#1a2535" opacity={0.6} />
          <path d={buildSilhouette(MTN_W, MTN_H, destinationSeed + '_near', 0.45)} fill="#1a1f26" opacity={0.9} />
        </svg>

        {/* Data layer — preserveAspectRatio none is correct: x-axis is distance, y-axis is elevation */}
        <svg
          ref={dataLayerRef}
          viewBox={`0 0 ${DATA_W} ${DATA_H}`}
          preserveAspectRatio="none"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
        >
          <defs>
            <linearGradient id="elevGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#E67E22" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#E67E22" stopOpacity="0.03" />
            </linearGradient>
          </defs>

          {/* Mode tint bands */}
          {profile && profile.segmentMeta.map((seg, i) => {
            const band = MODE_BAND[seg.mode];
            if (!band) return null;
            const x1 = profile.pts[seg.startIdx]?.x ?? 0;
            const x2 = profile.pts[seg.endIdx]?.x ?? DATA_W;
            return (
              <rect key={`band-${i}`} x={x1} y={0} width={x2 - x1} height={DATA_H}
                fill={band.color} opacity={band.opacity} />
            );
          })}

          {profile && (
            <>
              <path d={buildFillPath(profile.pts)} fill="url(#elevGrad)" />
              <path d={buildPath(profile.pts)} stroke="#E67E22" strokeWidth="1.5" fill="none" />

              {profile.segmentMeta.map((seg, i) => {
                const s = SURFACE[seg.mode] ?? DEFAULT_SURFACE;
                const x1 = profile.pts[seg.startIdx]?.x ?? 0;
                const x2 = profile.pts[seg.endIdx]?.x ?? DATA_W;
                return (
                  <rect key={i} x={x1} y={DATA_H - 4} width={x2 - x1} height={3} fill={s.color} rx={1} />
                );
              })}
            </>
          )}

          {hoverPt && (
            <>
              <line x1={hoverPt.x} y1={0} x2={hoverPt.x} y2={DATA_H}
                stroke="#E67E22" strokeWidth={1} strokeDasharray="3 2" opacity={0.6} />
              <circle cx={hoverPt.x} cy={hoverPt.y} r={3.5} fill="#E67E22" />
              {hoverPt.elev !== null && (
                <>
                  <rect
                    x={Math.min(hoverPt.x + 6, DATA_W - 90)} y={hoverPt.y - 10}
                    width={82} height={16} rx={2}
                    fill="rgba(14,16,18,0.92)" stroke="#2a2f36" strokeWidth={1}
                  />
                  <text
                    x={Math.min(hoverPt.x + 47, DATA_W - 49)} y={hoverPt.y + 2}
                    textAnchor="middle" fontSize={8} fill="#F2EDE8"
                    fontFamily="'JetBrains Mono', monospace"
                  >
                    {Math.round(hoverPt.elev)} m
                  </text>
                </>
              )}
            </>
          )}
        </svg>
      </div>

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

function PlaceholderStrip({ seed = 'default' }) {
  const pts = [
    { x: 0, y: 60 }, { x: 80, y: 50 }, { x: 160, y: 35 }, { x: 240, y: 28 },
    { x: 320, y: 20 }, { x: 380, y: 15 }, { x: 440, y: 22 }, { x: 500, y: 30 }, { x: 600, y: 38 },
  ];
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const fill = `${line} L600,${DATA_H} L0,${DATA_H} Z`;

  return (
    <>
      <div style={{ position: 'relative', height: STRIP_H, overflow: 'hidden' }}>
        {/* Mountain backdrop */}
        <svg
          viewBox={`0 0 ${MTN_W} ${MTN_H}`}
          preserveAspectRatio="xMidYMax slice"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="skyGradPh" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0d1b2a" />
              <stop offset="100%" stopColor="#0E1012" />
            </linearGradient>
          </defs>
          <rect x={0} y={0} width={MTN_W} height={MTN_H} fill="url(#skyGradPh)" />
          <path d={buildSilhouette(MTN_W, MTN_H, seed + '_far', 0.7)}  fill="#1a2535" opacity={0.6} />
          <path d={buildSilhouette(MTN_W, MTN_H, seed + '_near', 0.45)} fill="#1a1f26" opacity={0.9} />
        </svg>

        {/* Placeholder data line */}
        <svg
          viewBox={`0 0 ${DATA_W} ${DATA_H}`}
          preserveAspectRatio="none"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block', opacity: 0.45 }}
        >
          <defs>
            <linearGradient id="elevGradPh" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#E67E22" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#E67E22" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <path d={fill} fill="url(#elevGradPh)" />
          <path d={line} stroke="#E67E22" strokeWidth="1.5" fill="none" />
          <rect x={0}   y={DATA_H - 4} width={200} height={3} fill="#D9C5B2" rx={1} />
          <rect x={200} y={DATA_H - 4} width={160} height={3} fill="#8B6914" rx={1} />
          <rect x={360} y={DATA_H - 4} width={140} height={3} fill="#5C9A6A" rx={1} />
          <rect x={500} y={DATA_H - 4} width={100} height={3} fill="#D9C5B2" rx={1} />
        </svg>
      </div>

      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#484440', letterSpacing: '0.06em', marginTop: 4 }}>
        ADD GROUND LEGS WITH COORDINATES TO SEE ELEVATION DATA
      </div>
    </>
  );
}
