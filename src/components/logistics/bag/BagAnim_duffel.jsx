// src/components/logistics/bag/BagAnim_duffel.jsx
// Duffel bag animation layer — 5 backpack techniques on cylindrical geometry.
// Zones: main (barrel), end_pocket (left end cap), top_zip (top zip pocket)
//
// 1) Idle barrel contour arcs fade out on hover
// 2) RadialGradient interior — warm deep cavity
// 3) Clip-path expand — barrel interior wipes open, top_zip and end_pocket reveal
// 4) Zipper draw-on — top_zip curved zipper
// 5) Split-flap — end_pocket cap expands outward (ellipse scale)

const ease = 'cubic-bezier(0.4,0,0.2,1)';
const PAL_FALLBACK = { interiorMid: '#1a2830', interiorSh: '#0e1820', interiorDeep: '#080e14' };

export default function BagAnim_duffel({ hoveredZone, highlightedZone, accentColor, palette }) {
  const PAL  = palette ?? PAL_FALLBACK;
  const ac   = accentColor;
  const hov  = (z) => hoveredZone === z || highlightedZone === z;
  const idle = !hoveredZone;

  const mainOpen   = hov('main');
  const topZipOpen = hov('top_zip');
  const endOpen    = hov('end_pocket');
  const zipLen     = 116;

  return (
    <g>
      <defs>
        <radialGradient id="interior-duffel" cx="50%" cy="40%" r="60%">
          <stop offset="0%"   stopColor={PAL.interiorMid} />
          <stop offset="55%"  stopColor={PAL.interiorSh} />
          <stop offset="100%" stopColor={PAL.interiorDeep} />
        </radialGradient>

        {/* Main barrel clip — wipes downward from top of barrel */}
        <clipPath id="clip-main-duffel">
          <rect x={32} y={112} width={176}
            height={mainOpen ? 106 : 0}
            style={{ transition: `height 0.45s ${ease}` }} />
        </clipPath>

        {/* Top zip clip */}
        <clipPath id="clip-topzip-duffel">
          <rect x={57} y={57} width={126}
            height={topZipOpen ? 50 : 0}
            style={{ transition: `height 0.38s ${ease}` }} />
        </clipPath>

        {/* End pocket clip */}
        <clipPath id="clip-end-duffel">
          <rect x={10} y={122} width={34}
            height={endOpen ? 82 : 0}
            style={{ transition: `height 0.4s ${ease}` }} />
        </clipPath>
      </defs>

      {/* 1) Idle: barrel contour arcs */}
      <g style={{ opacity: idle ? 1 : 0, transition: `opacity 0.4s ${ease}` }}>
        {[58, 85, 120, 155, 182].map(x => (
          <ellipse key={x} cx={x} cy={163} rx="6" ry="44"
            fill="none" stroke={ac} strokeWidth="0.5" opacity="0.18" />
        ))}
      </g>

      {/* 2+3) Main barrel: interior cavity + expansion rings */}
      <rect x={32} y={112} width={176} height={106}
        fill="url(#interior-duffel)" clipPath="url(#clip-main-duffel)" />
      <ellipse cx={120} cy={163} rx={mainOpen ? 112 : 100} ry={mainOpen ? 70 : 60}
        fill="none" stroke={ac} strokeWidth="1"
        style={{ opacity: mainOpen ? 0.35 : 0, transition: `rx 0.4s ${ease}, ry 0.4s ${ease}, opacity 0.25s ${ease}` }} />
      <ellipse cx={120} cy={163} rx={mainOpen ? 106 : 96} ry={mainOpen ? 66 : 56}
        fill="none" stroke={ac} strokeWidth="0.6"
        style={{ opacity: mainOpen ? 0.2 : 0, transition: `rx 0.45s ${ease} 0.06s, ry 0.45s ${ease} 0.06s, opacity 0.25s ${ease}` }} />
      {[140, 155, 163, 171, 186].map((y, i) => (
        <line key={y} x1={30} y1={y} x2={210} y2={y}
          stroke={ac} strokeWidth="0.5" strokeDasharray="6,5"
          style={{ opacity: mainOpen ? 0.22 : 0, transition: `opacity 0.18s ${ease} ${i * 0.04}s` }} />
      ))}
      <text x={120} y={163} textAnchor="middle" dominantBaseline="middle"
        fill={ac} fontSize="6.5" fontFamily="JetBrains Mono, monospace" letterSpacing="0.15em"
        style={{ opacity: mainOpen ? 0.55 : 0, transition: `opacity 0.3s ${ease}` }}>
        MAIN BARREL
      </text>

      {/* 4) Top zip: zipper draw-on + 2+3) cavity reveal */}
      <line x1={62} y1={84} x2={178} y2={84}
        stroke={ac} strokeWidth="1.8" strokeLinecap="round"
        strokeDasharray={zipLen} strokeDashoffset={topZipOpen ? 0 : zipLen}
        style={{ transition: `stroke-dashoffset 0.5s ${ease}` }} />
      <rect x={topZipOpen ? 162 : 118} y={80} width={12} height={8} rx="2"
        fill={ac} opacity="0.9"
        style={{ transition: `x 0.46s ${ease}` }} />
      <rect x={57} y={57} width={126} height={50}
        fill="url(#interior-duffel)" clipPath="url(#clip-topzip-duffel)" />
      <text x={120} y={82} textAnchor="middle" dominantBaseline="middle"
        fill={ac} fontSize="6" fontFamily="JetBrains Mono, monospace" letterSpacing="0.12em"
        style={{ opacity: topZipOpen ? 0.6 : 0, transition: `opacity 0.3s ${ease}` }}>
        TOP ZIP OPEN
      </text>

      {/* 5) End pocket: cap pop (ellipse scale) + 2+3) clip cavity + radial spokes */}
      <ellipse cx={17} cy={163} rx={10} ry={44}
        fill="url(#interior-duffel)" clipPath="url(#clip-end-duffel)" />
      <ellipse cx={17} cy={163} rx={endOpen ? 20 : 14} ry={endOpen ? 52 : 46}
        fill="none" stroke={ac} strokeWidth="1.2"
        style={{ opacity: endOpen ? 0.55 : 0, transition: `rx 0.35s ${ease}, ry 0.35s ${ease}, opacity 0.2s ${ease}` }} />
      {[125, 140, 155, 163, 171, 186, 201].map((cy, i) => (
        <line key={i} x1={17} y1={163}
          x2={endOpen ? 3 : 9} y2={cy}
          stroke={ac} strokeWidth="0.6"
          style={{ opacity: endOpen ? 0.3 : 0, transition: `x2 0.3s ${ease}, y2 0.3s ${ease}, opacity 0.2s ${ease} ${i * 0.03}s` }} />
      ))}
      <text x={17} y={163} textAnchor="middle" dominantBaseline="middle"
        fill={ac} fontSize="5" fontFamily="JetBrains Mono, monospace" letterSpacing="0.05em"
        style={{ opacity: endOpen ? 0.55 : 0, transition: `opacity 0.3s ${ease}`, writingMode: 'vertical-lr' }}>
        END
      </text>
    </g>
  );
}
