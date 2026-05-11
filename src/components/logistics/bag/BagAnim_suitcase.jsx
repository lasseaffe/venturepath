// src/components/logistics/bag/BagAnim_suitcase.jsx
// Suitcase animation layer — 5 backpack techniques on hard-shell geometry.
// Zones: main_shell (bottom half), lid_mesh (top half), side_handle (telescoping handle)
//
// 1) Idle wheel/corner glints fade out on hover
// 2) RadialGradient interior — dark tray cavity
// 3) Clip-path expand — main_shell tray wipes down from hinge; lid_mesh reveals upward
// 4) Hinge draw-on — lid_mesh hinge line draws across on hover
// 5) Split-flap — lid_mesh group translates upward simulating clamshell opening

const ease = 'cubic-bezier(0.4,0,0.2,1)';
const PAL_FALLBACK = { interiorMid: '#1a2830', interiorSh: '#0e1820', interiorDeep: '#080e14' };

export default function BagAnim_suitcase({ hoveredZone, highlightedZone, accentColor, palette }) {
  const PAL  = palette ?? PAL_FALLBACK;
  const ac   = accentColor;
  const hov  = (z) => hoveredZone === z || highlightedZone === z;
  const idle = !hoveredZone;

  const lidOpen    = hov('lid_mesh');
  const shellOpen  = hov('main_shell');
  const handleOpen = hov('side_handle');
  const anyHover   = !!hoveredZone;
  const hingeLen   = 170;

  return (
    <g>
      <defs>
        <radialGradient id="interior-suitcase" cx="50%" cy="40%" r="60%">
          <stop offset="0%"   stopColor={PAL.interiorMid} />
          <stop offset="55%"  stopColor={PAL.interiorSh} />
          <stop offset="100%" stopColor={PAL.interiorDeep} />
        </radialGradient>

        {/* Lid mesh clip — reveals from hinge (y=148) upward */}
        <clipPath id="clip-lid-suitcase">
          <rect x={37} y={lidOpen ? 42 : 148} width={166}
            height={lidOpen ? 106 : 0}
            style={{ transition: `y 0.45s ${ease}, height 0.45s ${ease}` }} />
        </clipPath>

        {/* Main shell clip — reveals from hinge downward */}
        <clipPath id="clip-shell-suitcase">
          <rect x={37} y={148} width={166}
            height={shellOpen ? 118 : 0}
            style={{ transition: `height 0.45s ${ease}` }} />
        </clipPath>
      </defs>

      {/* 1) Idle: wheel spoke glints + corner bumpers */}
      <g style={{ opacity: idle ? 1 : 0, transition: `opacity 0.4s ${ease}` }}>
        {[54, 186].map(cx => (
          <g key={cx}>
            <line x1={cx} y1={260} x2={cx} y2={284} stroke={ac} strokeWidth="0.6" opacity="0.25" />
            <line x1={cx - 12} y1={272} x2={cx + 12} y2={272} stroke={ac} strokeWidth="0.6" opacity="0.25" />
          </g>
        ))}
        {[[44, 50], [196, 50]].map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="4"
            fill="none" stroke={ac} strokeWidth="0.8" opacity="0.2" />
        ))}
      </g>

      {/* 5+3) Lid mesh: split-flap upward lift + clip-path reveal + 2) radialGrad */}
      {/* Lid lift overlay — translates up to suggest clamshell opening */}
      <rect x={37} y={lidOpen ? 24 : 42} width={166} height={104} rx="4"
        fill="none" stroke={ac} strokeWidth="1"
        style={{ opacity: lidOpen ? 0.4 : 0, transition: `y 0.42s ${ease}, opacity 0.3s ${ease}` }} />
      {/* Lid interior */}
      <rect x={37} y={42} width={166} height={106}
        fill="url(#interior-suitcase)" clipPath="url(#clip-lid-suitcase)" />
      {/* 4) Hinge draw-on */}
      <line x1={35} y1={148} x2={205} y2={148}
        stroke={ac} strokeWidth="1.6" strokeLinecap="round"
        strokeDasharray={hingeLen} strokeDashoffset={lidOpen ? 0 : hingeLen}
        style={{ transition: `stroke-dashoffset 0.5s ${ease}` }} />
      {/* Mesh lines */}
      {[60, 75, 90, 105, 120, 135].map((y, i) => (
        <line key={y} x1={38} y1={y} x2={202} y2={y}
          stroke={ac} strokeWidth="0.5" strokeDasharray="6,5"
          style={{ opacity: lidOpen ? 0.22 : 0, transition: `opacity 0.18s ${ease} ${i * 0.04}s` }} />
      ))}
      <text x={120} y={94} textAnchor="middle" dominantBaseline="middle"
        fill={ac} fontSize="6.5" fontFamily="JetBrains Mono, monospace" letterSpacing="0.15em"
        style={{ opacity: lidOpen ? 0.6 : 0, transition: `opacity 0.3s ${ease}` }}>
        LID MESH
      </text>

      {/* 2+3) Main shell: clip-path tray reveal + grid */}
      <rect x={37} y={148} width={166} height={118}
        fill="url(#interior-suitcase)" clipPath="url(#clip-shell-suitcase)" />
      {[175, 200, 225].map((y, i) => (
        <line key={y} x1={38} y1={y} x2={202} y2={y}
          stroke={ac} strokeWidth="0.6" strokeDasharray="8,5"
          style={{ opacity: shellOpen ? 0.2 : 0, transition: `opacity 0.2s ${ease} ${i * 0.05}s` }} />
      ))}
      {[90, 140].map((x, i) => (
        <line key={x} x1={x} y1={150} x2={x} y2={262}
          stroke={ac} strokeWidth="0.6" strokeDasharray="8,5"
          style={{ opacity: shellOpen ? 0.2 : 0, transition: `opacity 0.2s ${ease} ${i * 0.05 + 0.1}s` }} />
      ))}
      <text x={120} y={210} textAnchor="middle" dominantBaseline="middle"
        fill={ac} fontSize="6.5" fontFamily="JetBrains Mono, monospace" letterSpacing="0.15em"
        style={{ opacity: shellOpen ? 0.55 : 0, transition: `opacity 0.3s ${ease}` }}>
        MAIN SHELL
      </text>

      {/* Telescoping handle — extends on any hover */}
      <rect x={96} y={handleOpen ? -18 : 2} width={9} height={handleOpen ? 56 : 36} rx="2"
        fill={ac} opacity={handleOpen ? 0.65 : anyHover ? 0.2 : 0.3}
        style={{ transition: `y 0.38s ${ease}, height 0.38s ${ease}, opacity 0.2s ${ease}` }} />
      <rect x={135} y={handleOpen ? -18 : 2} width={9} height={handleOpen ? 56 : 36} rx="2"
        fill={ac} opacity={handleOpen ? 0.65 : anyHover ? 0.2 : 0.3}
        style={{ transition: `y 0.38s ${ease}, height 0.38s ${ease}, opacity 0.2s ${ease}` }} />
      {[-10, -4].map((y, i) => (
        <line key={i} x1={96} y1={y} x2={105} y2={y}
          stroke={ac} strokeWidth="0.8"
          style={{ opacity: handleOpen ? 0.5 : 0, transition: `opacity 0.2s ${ease}` }} />
      ))}
      {[-10, -4].map((y, i) => (
        <line key={`r-${i}`} x1={135} y1={y} x2={144} y2={y}
          stroke={ac} strokeWidth="0.8"
          style={{ opacity: handleOpen ? 0.5 : 0, transition: `opacity 0.2s ${ease}` }} />
      ))}
      <rect x={96} y={6} width={48} height={12} rx="4"
        fill={ac} opacity={handleOpen ? 0.25 : 0}
        style={{ transition: `opacity 0.25s ${ease}` }} />
    </g>
  );
}
