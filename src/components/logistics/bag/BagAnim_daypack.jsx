// src/components/logistics/bag/BagAnim_daypack.jsx
// Daypack animation layer — compact sibling of backpack, all 5 techniques.
// Zones: main (body), front_zip (bottom pocket)
//
// 1) Idle strap highlights + sternum strap pulse fade out on hover
// 2) RadialGradient interior — deep pack cavity
// 3) Clip-path expand — main body wipes down; front_zip wipes right
// 4) Zipper draw-on — front_zip horizontal seam
// 5) Split-flap implied by diagonal panel lines converging on hover

const ease = 'cubic-bezier(0.4,0,0.2,1)';
const PAL_FALLBACK = { interiorMid: '#1a2830', interiorSh: '#0e1820', interiorDeep: '#080e14' };

export default function BagAnim_daypack({ hoveredZone, highlightedZone, accentColor, palette }) {
  const PAL  = palette ?? PAL_FALLBACK;
  const ac   = accentColor;
  const hov  = (z) => hoveredZone === z || highlightedZone === z;
  const idle = !hoveredZone;

  const mainOpen = hov('main');
  const zipOpen  = hov('front_zip');
  const zipLen   = 84;

  return (
    <g>
      <defs>
        <radialGradient id="interior-daypack" cx="50%" cy="35%" r="60%">
          <stop offset="0%"   stopColor={PAL.interiorMid} />
          <stop offset="55%"  stopColor={PAL.interiorSh} />
          <stop offset="100%" stopColor={PAL.interiorDeep} />
        </radialGradient>

        {/* Main body clip — wipes downward from shoulder-strap bar */}
        <clipPath id="clip-main-daypack">
          <rect x={57} y={70} width={126}
            height={mainOpen ? 132 : 0}
            style={{ transition: `height 0.45s ${ease}` }} />
        </clipPath>

        {/* Front zip clip — wipes right */}
        <clipPath id="clip-zip-daypack">
          <rect x={74} y={226} width={zipOpen ? 92 : 0} height={18}
            style={{ transition: `width 0.38s ${ease}` }} />
        </clipPath>
      </defs>

      {/* 1) Idle: strap edge highlights + sternum strap */}
      <g style={{ opacity: idle ? 1 : 0, transition: `opacity 0.4s ${ease}` }}>
        <path d="M 75 68 Q 58 20 85 14 Q 108 10 110 68"
          fill="none" stroke={ac} strokeWidth="0.8" opacity="0.2" strokeLinecap="round" />
        <path d="M 130 68 Q 130 10 155 14 Q 182 20 165 68"
          fill="none" stroke={ac} strokeWidth="0.8" opacity="0.2" strokeLinecap="round" />
        <line x1={72} y1={145} x2={168} y2={145}
          stroke={ac} strokeWidth="1.5" strokeLinecap="round" opacity="0.18" />
      </g>

      {/* 2+3) Main: cavity + diagonal panel lines (5 — converging panels suggest depth) */}
      <rect x={57} y={70} width={126} height={132}
        fill="url(#interior-daypack)" clipPath="url(#clip-main-daypack)" />
      {[[56,80,100,130],[56,110,120,150],[56,140,140,170],[80,70,180,140]].map(([x1,y1,x2,y2], i) => (
        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
          stroke={ac} strokeWidth="0.5" strokeDasharray="5,5"
          style={{ opacity: mainOpen ? 0.18 : 0, transition: `opacity 0.2s ${ease} ${i * 0.05}s` }} />
      ))}
      {/* Centre seam */}
      <line x1={120} y1={68} x2={120} y2={200}
        stroke={ac} strokeWidth="0.5" strokeDasharray="6,4"
        style={{ opacity: mainOpen ? 0.22 : 0, transition: `opacity 0.25s ${ease}` }} />
      <text x={120} y={140} textAnchor="middle" dominantBaseline="middle"
        fill={ac} fontSize="6.5" fontFamily="JetBrains Mono, monospace" letterSpacing="0.15em"
        style={{ opacity: mainOpen ? 0.55 : 0, transition: `opacity 0.3s ${ease}` }}>
        MAIN
      </text>

      {/* 4) Front zip: horizontal zipper draw-on + 2+3) clip pocket interior */}
      <line x1={76} y1={224} x2={160} y2={224}
        stroke={ac} strokeWidth="1.8" strokeLinecap="round"
        strokeDasharray={zipLen} strokeDashoffset={zipOpen ? 0 : zipLen}
        style={{ transition: `stroke-dashoffset 0.44s ${ease}` }} />
      {/* Zipper pull slides right */}
      <circle cx={zipOpen ? 160 : 120} cy={203} r={zipOpen ? 5 : 3}
        fill={ac} opacity="0.9"
        style={{ transition: `cx 0.4s ${ease}, r 0.3s ${ease}` }} />
      {/* Clip-path interior reveal */}
      <rect x={74} y={226} width={92} height={18}
        fill="url(#interior-daypack)" clipPath="url(#clip-zip-daypack)" />
      <text x={120} y={237} textAnchor="middle" dominantBaseline="middle"
        fill={ac} fontSize="5.5" fontFamily="JetBrains Mono, monospace" letterSpacing="0.1em"
        style={{ opacity: zipOpen ? 0.6 : 0, transition: `opacity 0.3s ${ease}` }}>
        FRONT ZIP
      </text>
    </g>
  );
}
