// src/components/logistics/bag/BagAnim_backpack.jsx
// Backpack-specific animation layer — renders between the illustration and zone overlays.
// Receives the same hover/highlight state as ZoneOverlays so every zone has a
// bespoke animated response.

const ease = 'cubic-bezier(0.4,0,0.2,1)';

// ── Idle pattern: quilting dots for front_pocket ──────────────────────────────
function FrontPocketIdle({ visible, accent }) {
  const dots = [
    [72, 152], [96, 152], [120, 152], [144, 152], [168, 152],
    [72, 172], [96, 172], [120, 172], [144, 172], [168, 172],
    [72, 192], [96, 192], [120, 192], [144, 192], [168, 192],
  ];
  return (
    <g style={{ opacity: visible ? 0.28 : 0, transition: `opacity 0.4s ${ease}` }}>
      {dots.map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.2"
          fill={accent} opacity="0.7" />
      ))}
    </g>
  );
}

// ── Idle pattern: vertical panel seams for main ───────────────────────────────
function MainIdle({ visible, accent }) {
  return (
    <g style={{ opacity: visible ? 0.22 : 0, transition: `opacity 0.4s ${ease}` }}>
      <line x1="80"  y1="118" x2="80"  y2="218" stroke={accent} strokeWidth="0.5" strokeDasharray="5,4" />
      <line x1="120" y1="118" x2="120" y2="218" stroke={accent} strokeWidth="0.5" strokeDasharray="5,4" />
      <line x1="160" y1="118" x2="160" y2="218" stroke={accent} strokeWidth="0.5" strokeDasharray="5,4" />
    </g>
  );
}

// ── Idle pattern: fill bands for side_pocket ──────────────────────────────────
function SidePocketIdle({ visible, accent }) {
  return (
    <g style={{ opacity: visible ? 0.25 : 0, transition: `opacity 0.4s ${ease}` }}>
      {[100, 120, 140, 160, 180].map(y => (
        <line key={y} x1="195" y1={y} x2="221" y2={y}
          stroke={accent} strokeWidth="0.8" strokeDasharray="3,3" />
      ))}
    </g>
  );
}

// ── top_lid: split-flap open ──────────────────────────────────────────────────
function TopLidAnim({ hovered, accent, activeSkin }) {
  const shift = hovered ? 50 : 0;
  return (
    <g style={{ clipPath: 'url(#bag-body-clip)' }}>
      {/* Top half flap slides UP */}
      <rect x={25} y={52} width={190} height={35}
        fill={`url(#lg-${activeSkin})`}
        style={{
          transformBox: 'fill-box', transformOrigin: 'center top',
          transform: `translateY(${hovered ? -35 : 0}px)`,
          transition: `transform 0.38s ${ease}`,
        }} />
      {/* Bottom half flap slides DOWN */}
      <rect x={25} y={87} width={190} height={27}
        fill={`url(#lg-${activeSkin})`}
        style={{
          transformBox: 'fill-box', transformOrigin: 'center top',
          transform: `translateY(${hovered ? 27 : 0}px)`,
          transition: `transform 0.38s ${ease}`,
        }} />
      {/* Interior cavity exposed when open */}
      <rect x={30} y={54} width={180} height={58} rx="6"
        fill="rgba(10,14,18,0.82)"
        style={{ opacity: hovered ? 1 : 0, transition: `opacity 0.25s ${ease}` }} />
      {/* Interior label */}
      <text x={120} y={84}
        textAnchor="middle" dominantBaseline="middle"
        fill={accent} fontSize="6.5" fontFamily="JetBrains Mono, monospace"
        letterSpacing="0.15em"
        style={{ opacity: hovered ? 0.7 : 0, transition: `opacity 0.3s ${ease}` }}>
        TOP LID OPEN
      </text>
      {/* Seam reveal line */}
      <line x1={30} y1={83} x2={210} y2={83}
        stroke={accent} strokeWidth="0.8"
        style={{ opacity: hovered ? 0.5 : 0, transition: `opacity 0.2s ${ease}` }} />
      {/* Staggered tooth dots */}
      {[40, 58, 76, 94, 112, 130, 148, 166, 184, 202].map((x, i) => (
        <circle key={x} cx={x} cy={83} r="1.5" fill={accent}
          style={{
            opacity: hovered ? 0.55 : 0,
            transition: `opacity 0.18s ${ease} ${i * 0.03}s`,
          }} />
      ))}
    </g>
  );
}

// ── front_pocket: zipper draw-on + interior reveal ───────────────────────────
function FrontPocketAnim({ hovered, accent, activeSkin }) {
  return (
    <g>
      {/* Draw-on zipper along the rail */}
      <line x1={55} y1={150} x2={185} y2={150}
        stroke={accent} strokeWidth="1.8" strokeLinecap="round"
        strokeDasharray="130" strokeDashoffset={hovered ? 0 : 130}
        style={{ transition: `stroke-dashoffset 0.55s ${ease}` }} />
      {/* Zipper pull slides right */}
      <rect
        x={hovered ? 168 : 113} y={146} width={14} height={9} rx="2"
        fill={accent} opacity="0.9"
        style={{ transition: `x 0.5s ${ease}` }} />
      {/* Interior cavity */}
      <rect x={54} y={152} width={132} height={70} rx="4"
        fill="rgba(8,11,16,0.78)"
        style={{ opacity: hovered ? 1 : 0, transition: `opacity 0.25s ${ease}` }} />
      {/* Interior weave lines */}
      {hovered && [162, 172, 182, 192, 202, 212].map(y => (
        <line key={y} x1={58} y1={y} x2={182} y2={y}
          stroke={accent} strokeWidth="0.4" opacity="0.18" />
      ))}
      <text x={120} y={188}
        textAnchor="middle" dominantBaseline="middle"
        fill={accent} fontSize="6.5" fontFamily="JetBrains Mono, monospace"
        letterSpacing="0.14em"
        style={{ opacity: hovered ? 0.65 : 0, transition: `opacity 0.3s ${ease}` }}>
        FRONT POCKET
      </text>
    </g>
  );
}

// ── side_pocket: vertical zipper draw-on ─────────────────────────────────────
function SidePocketAnim({ hovered, accent }) {
  return (
    <g>
      {/* Draw-on vertical zipper */}
      <line x1={208} y1={92} x2={208} y2={192}
        stroke={accent} strokeWidth="1.8" strokeLinecap="round"
        strokeDasharray="100" strokeDashoffset={hovered ? 0 : 100}
        style={{ transition: `stroke-dashoffset 0.5s ${ease}` }} />
      {/* Pull ellipse slides down */}
      <ellipse cx={208} cy={hovered ? 192 : 94} rx="3.5" ry="3"
        fill={accent}
        style={{ transition: `cy 0.46s ${ease}` }} />
      {/* Pocket open fill */}
      <rect x={195} y={98} width={28} height={92} rx="4"
        fill="rgba(8,11,16,0.75)"
        style={{ opacity: hovered ? 1 : 0, transition: `opacity 0.25s ${ease}` }} />
      <text x={209} y={148}
        textAnchor="middle" dominantBaseline="middle"
        fill={accent} fontSize="5.5" fontFamily="JetBrains Mono, monospace"
        letterSpacing="0.1em"
        style={{
          opacity: hovered ? 0.65 : 0,
          transition: `opacity 0.3s ${ease}`,
          writingMode: 'vertical-lr',
        }}>
        SIDE
      </text>
    </g>
  );
}

// ── hip_belt: compression expand ─────────────────────────────────────────────
function HipBeltAnim({ hovered, accent }) {
  return (
    <g>
      {/* Belt expand indicator arrows */}
      <g style={{ opacity: hovered ? 0.7 : 0, transition: `opacity 0.25s ${ease}` }}>
        <path d="M 20 281 L 12 281 M 12 277 L 8 281 L 12 285"
          stroke={accent} strokeWidth="1.2" fill="none" strokeLinecap="round" />
        <path d="M 220 281 L 228 281 M 228 277 L 232 281 L 228 285"
          stroke={accent} strokeWidth="1.2" fill="none" strokeLinecap="round" />
      </g>
      {/* Highlight line */}
      <rect x={10} y={265} width={220} height={32} rx="9"
        fill="none" stroke={accent} strokeWidth="1"
        style={{ opacity: hovered ? 0.55 : 0, transition: `opacity 0.2s ${ease}` }} />
    </g>
  );
}

// ── main: subtle depth lines reveal ──────────────────────────────────────────
function MainAnim({ hovered, accent }) {
  return (
    <g>
      {/* Depth guide lines */}
      {[130, 150, 170, 190, 210].map((y, i) => (
        <line key={y} x1={26} y1={y} x2={214} y2={y}
          stroke={accent} strokeWidth="0.5" strokeDasharray="8,6"
          style={{
            opacity: hovered ? 0.18 : 0,
            transition: `opacity 0.2s ${ease} ${i * 0.04}s`,
          }} />
      ))}
    </g>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function BagAnim_backpack({ hoveredZone, highlightedZone, accentColor, activeSkin }) {
  const hov = (z) => hoveredZone === z || highlightedZone === z;
  const idle = (z) => !hoveredZone; // show idle patterns when nothing hovered

  return (
    <g>
      {/* Idle textures */}
      <FrontPocketIdle visible={idle('front_pocket')} accent={accentColor} />
      <MainIdle visible={idle('main')} accent={accentColor} />
      <SidePocketIdle visible={idle('side_pocket')} accent={accentColor} />

      {/* Zone-specific animations */}
      <TopLidAnim     hovered={hov('top_lid')}      accent={accentColor} activeSkin={activeSkin} />
      <FrontPocketAnim hovered={hov('front_pocket')} accent={accentColor} activeSkin={activeSkin} />
      <SidePocketAnim  hovered={hov('side_pocket')}  accent={accentColor} />
      <HipBeltAnim     hovered={hov('hip_belt')}     accent={accentColor} />
      <MainAnim        hovered={hov('main')}          accent={accentColor} />
    </g>
  );
}
