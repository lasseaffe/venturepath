// src/components/logistics/bag/BagAnim_handbag.jsx
// Handbag animation layer — 5 backpack techniques applied to handbag geometry.
// Zones: main (body clasp→base), inner_pocket (lining), outer_pocket (front strap pocket)
//
// 1) Idle stitching details fade out on any hover
// 2) RadialGradient interior cavity colour (skin palette)
// 3) Clip-path expand — main cavity reveals from clasp downward
// 4) Zipper draw-on — inner_pocket seam, outer_pocket seam
// 5) Split-flap — clasp halves slide apart (main zone)

const ease = 'cubic-bezier(0.4,0,0.2,1)';
const PAL_FALLBACK = { interiorMid: '#1a2830', interiorSh: '#0e1820', interiorDeep: '#080e14' };

export default function BagAnim_handbag({ hoveredZone, highlightedZone, accentColor, palette }) {
  const PAL   = palette ?? PAL_FALLBACK;
  const ac    = accentColor;
  const hov   = (z) => hoveredZone === z || highlightedZone === z;
  const idle  = !hoveredZone;

  const mainOpen  = hov('main');
  const innerOpen = hov('inner_pocket');
  const outerOpen = hov('outer_pocket');

  const innerZipLen = 120;
  const outerSeamLen = 82;

  return (
    <g>
      <defs>
        <radialGradient id="interior-handbag" cx="50%" cy="30%" r="65%">
          <stop offset="0%"   stopColor={PAL.interiorMid} />
          <stop offset="60%"  stopColor={PAL.interiorSh} />
          <stop offset="100%" stopColor={PAL.interiorDeep} />
        </radialGradient>

        {/* Main cavity — wipes from clasp downward */}
        <clipPath id="clip-main-handbag">
          <rect x={44} y={100} width={152}
            height={mainOpen ? 116 : 0}
            style={{ transition: `height 0.45s ${ease}` }} />
        </clipPath>

        {/* Inner pocket — wipes left→right */}
        <clipPath id="clip-inner-handbag">
          <rect x={57} y={226} width={innerOpen ? 126 : 0} height={28}
            style={{ transition: `width 0.38s ${ease}` }} />
        </clipPath>
      </defs>

      {/* 1) Idle details — handle edge lines + clasp shimmer */}
      <g style={{ opacity: idle ? 1 : 0, transition: `opacity 0.4s ${ease}` }}>
        <path d="M 77 90 Q 77 38 107 38 Q 134 38 134 90"
          fill="none" stroke={ac} strokeWidth="1" opacity="0.22" strokeLinecap="round" />
        <path d="M 106 90 Q 106 38 133 38 Q 163 38 163 90"
          fill="none" stroke={ac} strokeWidth="1" opacity="0.22" strokeLinecap="round" />
        <rect x={108} y={86} width={24} height={12} rx="3"
          fill="none" stroke={ac} strokeWidth="0.7" opacity="0.35" strokeDasharray="4,3" />
      </g>

      {/* 2+3) Main: cavity radialGrad revealed by clip-path + 5) split-flap clasp */}
      <rect x={44} y={100} width={152} height={116}
        fill="url(#interior-handbag)" clipPath="url(#clip-main-handbag)" />
      {/* Interior fabric grain */}
      {[115,125,135,145,155,165,175,185,195].map((y, i) => (
        <line key={y} x1={50} y1={y} x2={190} y2={y}
          stroke={ac} strokeWidth="0.4"
          style={{ opacity: mainOpen ? 0.14 : 0, transition: `opacity 0.18s ${ease} ${i * 0.025}s` }} />
      ))}
      {/* Clasp left slides left */}
      <rect x={mainOpen ? 100 : 108} y={86} width={12} height={12} rx="3"
        fill={ac} opacity={mainOpen ? 0.85 : 0}
        style={{ transition: `x 0.3s ${ease}, opacity 0.2s ${ease}` }} />
      {/* Clasp right slides right */}
      <rect x={mainOpen ? 128 : 120} y={86} width={12} height={12} rx="3"
        fill={ac} opacity={mainOpen ? 0.85 : 0}
        style={{ transition: `x 0.3s ${ease}, opacity 0.2s ${ease}` }} />
      <text x={120} y={162} textAnchor="middle" dominantBaseline="middle"
        fill={ac} fontSize="6.5" fontFamily="JetBrains Mono, monospace" letterSpacing="0.15em"
        style={{ opacity: mainOpen ? 0.6 : 0, transition: `opacity 0.3s ${ease}` }}>
        MAIN BAG OPEN
      </text>

      {/* 4) Inner pocket: zipper draw-on + 2+3) clip cavity */}
      <line x1={60} y1={225} x2={180} y2={225}
        stroke={ac} strokeWidth="1.4" strokeLinecap="round"
        strokeDasharray={innerZipLen} strokeDashoffset={innerOpen ? 0 : innerZipLen}
        style={{ transition: `stroke-dashoffset 0.45s ${ease}` }} />
      <rect x={innerOpen ? 166 : 60} y={221} width={10} height={7} rx="1.5"
        fill={ac} opacity="0.9"
        style={{ transition: `x 0.42s ${ease}` }} />
      <rect x={57} y={226} width={126} height={28}
        fill="url(#interior-handbag)" clipPath="url(#clip-inner-handbag)" />
      <text x={120} y={240} textAnchor="middle" dominantBaseline="middle"
        fill={ac} fontSize="5.5" fontFamily="JetBrains Mono, monospace" letterSpacing="0.12em"
        style={{ opacity: innerOpen ? 0.6 : 0, transition: `opacity 0.3s ${ease}` }}>
        INNER POCKET
      </text>

      {/* 4) Outer pocket: seam draw-on + snap button */}
      <line x1={80} y1={258} x2={162} y2={258}
        stroke={ac} strokeWidth="1.4" strokeLinecap="round"
        strokeDasharray={outerSeamLen} strokeDashoffset={outerOpen ? 0 : outerSeamLen}
        style={{ transition: `stroke-dashoffset 0.4s ${ease}` }} />
      <circle cx={120} cy={268} r={outerOpen ? 5 : 2}
        fill="none" stroke={ac} strokeWidth="1.2"
        style={{ transition: `r 0.3s ${ease}` }} />
      <circle cx={120} cy={268} r="1.5" fill={ac}
        style={{ opacity: outerOpen ? 0.8 : 0, transition: `opacity 0.2s ${ease}` }} />
    </g>
  );
}
