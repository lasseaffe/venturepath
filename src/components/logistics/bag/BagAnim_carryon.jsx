// src/components/logistics/bag/BagAnim_carryon.jsx
// Carry-on animation layer — 5 backpack techniques on upright hard-shell geometry.
// Zones: main (body), front_zip (center stripe), laptop_sleeve (bottom pocket)
//
// 1) Idle rod breath marks + wheel glints fade out on hover
// 2) RadialGradient interior — deep body cavity
// 3) Clip-path expand — main body wipes down; front_zip stripe wipes down; laptop wipes right
// 4) Zipper draw-on — front_zip vertical; laptop_sleeve horizontal
// 5) Telescoping rods extend upward when any zone active

const ease = 'cubic-bezier(0.4,0,0.2,1)';
const PAL_FALLBACK = { interiorMid: '#1a2830', interiorSh: '#0e1820', interiorDeep: '#080e14' };

export default function BagAnim_carryon({ hoveredZone, highlightedZone, accentColor, palette }) {
  const PAL  = palette ?? PAL_FALLBACK;
  const ac   = accentColor;
  const hov  = (z) => hoveredZone === z || highlightedZone === z;
  const idle = !hoveredZone;

  const mainOpen   = hov('main');
  const zipOpen    = hov('front_zip');
  const lapOpen    = hov('laptop_sleeve');
  const anyHover   = !!hoveredZone;

  const vZipLen  = 160;
  const hZipLen  = 132;

  return (
    <g>
      <defs>
        <radialGradient id="interior-carryon" cx="50%" cy="35%" r="60%">
          <stop offset="0%"   stopColor={PAL.interiorMid} />
          <stop offset="55%"  stopColor={PAL.interiorSh} />
          <stop offset="100%" stopColor={PAL.interiorDeep} />
        </radialGradient>

        {/* Main body clip — wipes downward */}
        <clipPath id="clip-main-carryon">
          <rect x={50} y={52} width={140}
            height={mainOpen ? 156 : 0}
            style={{ transition: `height 0.45s ${ease}` }} />
        </clipPath>

        {/* Front zip stripe clip — wipes downward */}
        <clipPath id="clip-zip-carryon">
          <rect x={94} y={52} width={52}
            height={zipOpen ? 156 : 0}
            style={{ transition: `height 0.45s ${ease}` }} />
        </clipPath>

        {/* Laptop sleeve clip — wipes right */}
        <clipPath id="clip-lap-carryon">
          <rect x={50} y={212} width={lapOpen ? 140 : 0} height={54}
            style={{ transition: `width 0.4s ${ease}` }} />
        </clipPath>
      </defs>

      {/* 1) Idle: rod segment marks + wheel glints */}
      <g style={{ opacity: idle ? 1 : 0, transition: `opacity 0.4s ${ease}` }}>
        <line x1={99} y1={28} x2={107} y2={28} stroke={ac} strokeWidth="0.7" opacity="0.22" />
        <line x1={133} y1={28} x2={141} y2={28} stroke={ac} strokeWidth="0.7" opacity="0.22" />
        {[66, 174].map(cx => (
          <circle key={cx} cx={cx} cy={264} r={6}
            fill="none" stroke={ac} strokeWidth="0.7" opacity="0.2" />
        ))}
      </g>

      {/* 5) Telescoping rods extend when any zone active */}
      <rect x={99} y={anyHover ? -8 : 12} width={8} height={anyHover ? 44 : 36} rx="2"
        fill={ac} opacity={anyHover ? 0.5 : 0.25}
        style={{ transition: `y 0.35s ${ease}, height 0.35s ${ease}, opacity 0.2s ${ease}` }} />
      <rect x={133} y={anyHover ? -8 : 12} width={8} height={anyHover ? 44 : 36} rx="2"
        fill={ac} opacity={anyHover ? 0.5 : 0.25}
        style={{ transition: `y 0.35s ${ease}, height 0.35s ${ease}, opacity 0.2s ${ease}` }} />

      {/* 2+3) Main: interior cavity + depth grid */}
      <rect x={50} y={52} width={140} height={156}
        fill="url(#interior-carryon)" clipPath="url(#clip-main-carryon)" />
      {[80, 105, 130, 155, 180].map((y, i) => (
        <line key={y} x1={50} y1={y} x2={190} y2={y}
          stroke={ac} strokeWidth="0.5" strokeDasharray="7,6"
          style={{ opacity: mainOpen ? 0.18 : 0, transition: `opacity 0.18s ${ease} ${i * 0.04}s` }} />
      ))}
      <text x={69} y={130} textAnchor="middle" dominantBaseline="middle"
        fill={ac} fontSize="6.5" fontFamily="JetBrains Mono, monospace" letterSpacing="0.14em"
        style={{ opacity: mainOpen ? 0.55 : 0, transition: `opacity 0.3s ${ease}` }}>
        MAIN
      </text>

      {/* 4) Front zip: vertical zipper draw-on + 2+3) stripe cavity */}
      <line x1={120} y1={52} x2={120} y2={210}
        stroke={ac} strokeWidth="1.8" strokeLinecap="round"
        strokeDasharray={vZipLen} strokeDashoffset={zipOpen ? 0 : vZipLen}
        style={{ transition: `stroke-dashoffset 0.5s ${ease}` }} />
      <rect x={113} y={zipOpen ? 194 : 52} width={14} height={9} rx="2"
        fill={ac} opacity="0.9"
        style={{ transition: `y 0.47s ${ease}` }} />
      <rect x={94} y={52} width={52} height={156}
        fill="url(#interior-carryon)" clipPath="url(#clip-zip-carryon)" />
      <text x={120} y={130} textAnchor="middle" dominantBaseline="middle"
        fill={ac} fontSize="6.5" fontFamily="JetBrains Mono, monospace" letterSpacing="0.14em"
        style={{ opacity: zipOpen ? 0.6 : 0, transition: `opacity 0.3s ${ease}` }}>
        ZIP
      </text>

      {/* 4) Laptop sleeve: horizontal unzip + 2+3) clip cavity + laptop silhouette */}
      <line x1={52} y1={224} x2={184} y2={224}
        stroke={ac} strokeWidth="1.6" strokeLinecap="round"
        strokeDasharray={hZipLen} strokeDashoffset={lapOpen ? 0 : hZipLen}
        style={{ transition: `stroke-dashoffset 0.45s ${ease}` }} />
      <rect x={lapOpen ? 168 : 52} y={220} width={12} height={8} rx="2"
        fill={ac} opacity="0.85"
        style={{ transition: `x 0.42s ${ease}` }} />
      <rect x={50} y={212} width={140} height={54}
        fill="url(#interior-carryon)" clipPath="url(#clip-lap-carryon)" />
      {/* Laptop outline */}
      <rect x={70} y={216} width={100} height={46} rx="4"
        fill="none" stroke={ac} strokeWidth="0.8"
        style={{ opacity: lapOpen ? 0.35 : 0, transition: `opacity 0.3s ${ease}` }} />
      <rect x={74} y={220} width={92} height={34} rx="2"
        fill="none" stroke={ac} strokeWidth="0.5"
        style={{ opacity: lapOpen ? 0.25 : 0, transition: `opacity 0.3s ${ease}` }} />
      <text x={120} y={238} textAnchor="middle" dominantBaseline="middle"
        fill={ac} fontSize="6" fontFamily="JetBrains Mono, monospace" letterSpacing="0.1em"
        style={{ opacity: lapOpen ? 0.55 : 0, transition: `opacity 0.3s ${ease}` }}>
        LAPTOP
      </text>
    </g>
  );
}
