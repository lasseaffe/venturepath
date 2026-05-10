// src/components/logistics/bag/Bag2D.jsx
import { SKINS } from './bagSkins';

// ─────────────────────────────────────────────────────────────────────────────
// Per-skin illustration palette used by the backpack illustration
// ─────────────────────────────────────────────────────────────────────────────
const ILLUS_PALETTE = {
  tactical: {
    canvasHi:  '#3d5060',
    canvasMid: '#28343c',
    canvasSh:  '#141e24',
    pocketHi:  '#2e3c44',
    pocketSh:  '#1a2428',
    leatherHi: '#3a3630',
    leatherMid:'#252018',
    leatherSh: '#120e08',
    buckleHi:  '#ff9f50',
    buckleMid: '#E67E22',
    buckleSh:  '#8a4010',
    stitch:    '#E67E2255',
    accent:    '#E67E22',
    texSeed:   1,
  },
  heritage: {
    canvasHi:  '#4a6a30',
    canvasMid: '#2a3d1c',
    canvasSh:  '#141e0c',
    pocketHi:  '#3a5228',
    pocketSh:  '#1a2a10',
    leatherHi: '#9a6040',
    leatherMid:'#5c3018',
    leatherSh: '#2e1608',
    buckleHi:  '#ead070',
    buckleMid: '#c8a040',
    buckleSh:  '#7a6020',
    stitch:    '#c8a04055',
    accent:    '#c8a040',
    texSeed:   2,
  },
  desert: {
    canvasHi:  '#c8a060',
    canvasMid: '#8a6830',
    canvasSh:  '#4e3a18',
    pocketHi:  '#a88448',
    pocketSh:  '#5e4020',
    leatherHi: '#b07850',
    leatherMid:'#6b4220',
    leatherSh: '#3a2010',
    buckleHi:  '#f0d880',
    buckleMid: '#d4a843',
    buckleSh:  '#8a6820',
    stitch:    '#d4a84355',
    accent:    '#d4a843',
    texSeed:   5,
  },
};

// Small hardware buckle primitive — used only inside BAG_ILLUSTRATIONS.backpack
function BuckleRect({ x, y, p, w = 12, h = 8, skin }) {
  return (
    <g>
      <rect x={x - w/2} y={y - h/2} width={w} height={h} rx="2"
        fill={`url(#bg-${skin})`} stroke={p.buckleSh} strokeWidth="0.7"/>
      <rect x={x - w/2 + 2} y={y - h/2 + 2} width={w - 4} height={h - 4} rx="1"
        fill="none" stroke={p.buckleHi} strokeWidth="0.5" opacity="0.5"/>
    </g>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SVG illustration per bag type — all in 240×310 viewBox
// Each function receives the props object `p` with skin-derived colors:
//   p.bagFill, p.zoneFill, p.zoneStroke, p.labelColor
// The backpack also receives p.activeSkin and p.illusPal for its rich gradients.
// ─────────────────────────────────────────────────────────────────────────────
const BAG_ILLUSTRATIONS = {

  // ── BACKPACK — existing illustration preserved exactly ──────────────────────
  backpack: (p) => {
    const activeSkin = p.activeSkin;
    const ipal = p.illusPal;
    return (
      <g>
        {/* defs are injected by the outer <svg> via BackpackDefs */}
        {/* ══ GROUND SHADOW ══ */}
        <ellipse cx="120" cy="302" rx="85" ry="7"
          fill="rgba(0,0,0,0.55)"
          style={{ filter: 'blur(5px)' }}/>

        {/* ══ HIP BELT — behind main bag for depth ══ */}
        <rect x="8" y="264" width="224" height="34" rx="10"
          fill={`url(#lg-${activeSkin})`} filter={`url(#ltex-${activeSkin})`}/>
        {/* Hip belt stitching line */}
        <line x1="16" y1="276" x2="224" y2="276"
          stroke={ipal.stitch} strokeWidth="0.8" strokeDasharray="5,3" opacity="0.6"/>
        {/* Hip belt buckles */}
        {[52, 170].map((x, i) => <BuckleRect key={i} x={x} y={272} skin={activeSkin} p={ipal}/>)}

        {/* ══ MAIN BAG BODY ══ */}
        <rect x="22" y="52" width="196" height="246" rx="16"
          fill={`url(#cg-${activeSkin})`}/>
        {/* Canvas texture overlay */}
        <rect x="22" y="52" width="196" height="246" rx="16"
          fill={`url(#cg-${activeSkin})`} filter={`url(#tex-${activeSkin})`} opacity="0.9"/>

        {/* Inner edge shadow (ambient occlusion feel) */}
        <rect x="22" y="52" width="196" height="246" rx="16"
          fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth="6"
          style={{ filter: 'blur(4px)' }} clipPath="url(#bag-body-clip)"/>

        {/* Right-side highlight edge */}
        <rect x="206" y="60" width="3" height="228" rx="2"
          fill={ipal.canvasHi} opacity="0.18"/>

        {/* ══ TOP LID / FLAP (leather) ══ */}
        <rect x="25" y="52" width="190" height="62" rx="14"
          fill={`url(#lg-${activeSkin})`}
          filter={`url(#ltex-${activeSkin})`}
          style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))' }}/>
        {/* Leather flap highlight edge */}
        <path d="M39,52 Q120,44 201,52" fill="none"
          stroke={ipal.leatherHi} strokeWidth="1.2" opacity="0.5"/>
        {/* Lid stitching */}
        <rect x="30" y="103" width="180" height="0" rx="0"
          fill="none" stroke={ipal.stitch} strokeWidth="0.8"
          strokeDasharray="6,4" opacity="0.7"/>
        <line x1="30" y1="105" x2="210" y2="105"
          stroke={ipal.stitch} strokeWidth="0.8" strokeDasharray="6,4" opacity="0.5"/>

        {/* Lid compression strap */}
        <rect x="95" y="74" width="50" height="11" rx="3"
          fill={`url(#lg-${activeSkin})`} filter={`url(#ltex-${activeSkin})`}/>
        <rect x="95" y="74" width="50" height="11" rx="3"
          fill="none" stroke={ipal.buckleMid} strokeWidth="0.7" opacity="0.6"/>
        {/* Strap buckle center */}
        <BuckleRect x={116} y={77} skin={activeSkin} p={ipal} w={8} h={5}/>

        {/* ══ SHOULDER STRAP STUBS (visible at top) ══ */}
        {[52, 165].map((x, i) => (
          <g key={i}>
            <path d={`M${x},52 C${x+(i===0?-6:6)},30 ${x+(i===0?-4:4)},20 ${x+(i===0?-2:2)},14`}
              stroke={`url(#lg-${activeSkin})`}
              strokeWidth="10" fill="none" strokeLinecap="round"
              filter={`url(#ltex-${activeSkin})`}/>
            <path d={`M${x},52 C${x+(i===0?-6:6)},30 ${x+(i===0?-4:4)},20 ${x+(i===0?-2:2)},14`}
              stroke={ipal.leatherHi} strokeWidth="1" fill="none" opacity="0.2"/>
          </g>
        ))}

        {/* ══ TOP CARRY HANDLE ══ */}
        <path d="M97,28 Q120,12 143,28"
          stroke={`url(#lg-${activeSkin})`}
          strokeWidth="9" fill="none" strokeLinecap="round"/>
        <path d="M97,28 Q120,12 143,28"
          stroke={ipal.leatherHi} strokeWidth="1.5" fill="none" opacity="0.3"/>
        {/* Handle attachment rings */}
        {[97, 143].map((x, i) => (
          <ellipse key={i} cx={x} cy="32" rx="5" ry="4"
            fill={`url(#bg-${activeSkin})`} stroke={ipal.buckleSh} strokeWidth="0.5"/>
        ))}

        {/* ══ BODY LID BUCKLES ══ */}
        <g>
          <BuckleRect x={74}  y={80} skin={activeSkin} p={ipal}/>
          <BuckleRect x={152} y={80} skin={activeSkin} p={ipal}/>
          {/* Strap below each buckle */}
          {[78, 156].map((x, i) => (
            <rect key={i} x={x} y={92} width="8" height="20" rx="2"
              fill={`url(#lg-${activeSkin})`} filter={`url(#ltex-${activeSkin})`}/>
          ))}
        </g>

        {/* ══ MAIN BODY SEPARATION LINE ══ */}
        <line x1="30" y1="114" x2="210" y2="114"
          stroke="rgba(0,0,0,0.3)" strokeWidth="1.5"/>

        {/* ══ SIDE POCKET (right) ══ */}
        <rect x="192" y="86" width="32" height="112" rx="7"
          fill={`url(#pg-${activeSkin})`}
          filter={`url(#tex-${activeSkin})`}
          style={{ filter: 'drop-shadow(-2px 0 6px rgba(0,0,0,0.4))' }}/>
        {/* Side pocket zipper */}
        <line x1="208" y1="92" x2="208" y2="192"
          stroke={ipal.buckleMid} strokeWidth="1.2" strokeDasharray="3,2" opacity="0.8"/>
        <ellipse cx="208" cy="94" rx="3.5" ry="3"
          fill={`url(#bg-${activeSkin})`}/>
        {/* Side pocket stitch edge */}
        <rect x="194" y="88" width="28" height="108" rx="6"
          fill="none" stroke={ipal.stitch} strokeWidth="0.7" strokeDasharray="4,3" opacity="0.5"/>

        {/* ══ COMPRESSION STRAP (right side) ══ */}
        <rect x="182" y="116" width="12" height="62" rx="3"
          fill={`url(#lg-${activeSkin})`} filter={`url(#ltex-${activeSkin})`}/>
        <BuckleRect x={184} y={144} skin={activeSkin} p={ipal} w={8} h={5}/>

        {/* ══ FRONT POCKET ══ */}
        <rect x="50" y="128" width="140" height="102" rx="10"
          fill={`url(#pg-${activeSkin})`}
          filter={`url(#tex-${activeSkin})`}
          style={{ filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.5))' }}/>
        {/* Pocket highlight edge top */}
        <path d="M60,128 Q120,121 180,128"
          fill="none" stroke={ipal.canvasHi} strokeWidth="1" opacity="0.2"/>
        {/* Pocket zipper rail */}
        <rect x="50" y="148" width="140" height="5" rx="2"
          fill={ipal.leatherSh}/>
        <line x1="55" y1="150" x2="185" y2="150"
          stroke={ipal.buckleMid} strokeWidth="1.2" strokeDasharray="4,3" opacity="0.9"/>
        {/* Zipper pull */}
        <rect x="113" y="146" width="14" height="9" rx="2"
          fill={`url(#bg-${activeSkin})`} stroke={ipal.buckleSh} strokeWidth="0.6"/>
        {/* Pocket stitching border */}
        <rect x="54" y="132" width="132" height="94" rx="8"
          fill="none" stroke={ipal.stitch} strokeWidth="0.8" strokeDasharray="5,3" opacity="0.55"/>
        {/* Pocket leather bottom trim */}
        <rect x="50" y="220" width="140" height="10" rx="0 0 10 10"
          fill={`url(#lg-${activeSkin})`} filter={`url(#ltex-${activeSkin})`}
          style={{ borderRadius: '0 0 10px 10px' }}/>

        {/* ══ BODY STITCHING (vertical panels) ══ */}
        <line x1="120" y1="114" x2="120" y2="260"
          stroke={ipal.stitch} strokeWidth="0.6" strokeDasharray="6,4" opacity="0.3"/>

        {/* ══ HIGHLIGHT SHEEN (top-right specular) ══ */}
        <ellipse cx="185" cy="72" rx="28" ry="16"
          fill="rgba(255,255,255,0.06)" transform="rotate(-20, 185, 72)"/>
      </g>
    );
  },

  // ── HANDBAG ──────────────────────────────────────────────────────────────────
  handbag: (p) => (
    <g>
      {/* Body: trapezoid */}
      <path d="M 58 92 L 32 262 L 208 262 L 182 92 Z"
        fill={p.bagFill} stroke={p.zoneStroke} strokeWidth="1.5" opacity="0.9" />
      {/* Left handle arc */}
      <path d="M 74 92 Q 74 32 107 32 Q 137 32 137 92"
        fill="none" stroke={p.labelColor} strokeWidth="9" strokeLinecap="round" />
      {/* Right handle arc */}
      <path d="M 103 92 Q 103 32 133 32 Q 166 32 166 92"
        fill="none" stroke={p.labelColor} strokeWidth="9" strokeLinecap="round" />
      {/* Clasp */}
      <rect x="104" y="84" width="32" height="16" rx="4" fill={p.zoneStroke} />
      <rect x="116" y="88" width="8" height="8" rx="2" fill={p.bagFill} />
      {/* Base seam */}
      <line x1="38" y1="240" x2="202" y2="240" stroke={p.zoneStroke} strokeWidth="1" strokeDasharray="5,4" opacity="0.5" />
    </g>
  ),

  // ── DUFFEL ───────────────────────────────────────────────────────────────────
  duffel: (p) => (
    <g>
      {/* Main barrel */}
      <ellipse cx="120" cy="163" rx="106" ry="64" fill={p.bagFill} stroke={p.zoneStroke} strokeWidth="1.5" />
      {/* End cap left */}
      <ellipse cx="17" cy="163" rx="16" ry="48" fill={p.zoneFill} stroke={p.zoneStroke} strokeWidth="1" />
      {/* End cap right */}
      <ellipse cx="223" cy="163" rx="16" ry="48" fill={p.zoneFill} stroke={p.zoneStroke} strokeWidth="1" />
      {/* Top zip pocket */}
      <rect x="54" y="57" width="132" height="54" rx="6" fill={p.zoneFill} stroke={p.zoneStroke} strokeWidth="1.5" />
      <line x1="62" y1="84" x2="178" y2="84" stroke={p.zoneStroke} strokeWidth="1.5" strokeDasharray="5,4" />
      {/* Carry handles */}
      <path d="M 84 99 Q 120 72 156 99" fill="none" stroke={p.labelColor} strokeWidth="9" strokeLinecap="round" />
      {/* Shoulder strap hints */}
      <path d="M 40 140 Q 10 90 60 70" fill="none" stroke={p.labelColor} strokeWidth="4" opacity="0.5" strokeLinecap="round" />
      <path d="M 200 140 Q 230 90 180 70" fill="none" stroke={p.labelColor} strokeWidth="4" opacity="0.5" strokeLinecap="round" />
    </g>
  ),

  // ── SUITCASE ─────────────────────────────────────────────────────────────────
  suitcase: (p) => (
    <g>
      {/* Main body */}
      <rect x="34" y="38" width="172" height="228" rx="12" fill={p.bagFill} stroke={p.zoneStroke} strokeWidth="1.5" />
      {/* Center seam */}
      <line x1="34" y1="148" x2="206" y2="148" stroke={p.zoneStroke} strokeWidth="2" />
      {/* Lid mesh texture lines */}
      {[60, 90, 120, 150, 180].map(cx => (
        <line key={cx} x1={cx} y1="60" x2={cx} y2="145" stroke={p.zoneStroke} strokeWidth="0.8" opacity="0.3" />
      ))}
      {/* Handle base */}
      <rect x="83" y="2" width="74" height="36" rx="6" fill={p.zoneFill} stroke={p.zoneStroke} strokeWidth="1.5" />
      {/* Telescoping rods */}
      <rect x="96"  y="2" width="9" height="36" rx="2" fill={p.labelColor} opacity="0.7" />
      <rect x="135" y="2" width="9" height="36" rx="2" fill={p.labelColor} opacity="0.7" />
      {/* Handle grip */}
      <rect x="96" y="6" width="48" height="12" rx="4" fill={p.zoneStroke} />
      {/* Wheels */}
      <circle cx="54"  cy="272" r="13" fill={p.zoneFill} stroke={p.zoneStroke} strokeWidth="2" />
      <circle cx="186" cy="272" r="13" fill={p.zoneFill} stroke={p.zoneStroke} strokeWidth="2" />
      <circle cx="54"  cy="272" r="5"  fill={p.zoneStroke} />
      <circle cx="186" cy="272" r="5"  fill={p.zoneStroke} />
      {/* Corner bumpers */}
      {[[44,50],[196,50],[44,256],[196,256]].map(([cx,cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="8" fill={p.zoneStroke} opacity="0.7" />
      ))}
    </g>
  ),

  // ── CARRY-ON ─────────────────────────────────────────────────────────────────
  carryon: (p) => (
    <g>
      {/* Body */}
      <rect x="46" y="48" width="148" height="210" rx="10" fill={p.bagFill} stroke={p.zoneStroke} strokeWidth="1.5" />
      {/* Front zip stripe */}
      <rect x="94" y="48" width="52" height="210" rx="6" fill={p.zoneFill} stroke={p.zoneStroke} strokeWidth="1.5" />
      {/* Laptop sleeve at bottom */}
      <rect x="46" y="208" width="148" height="50" rx="6" fill={p.zoneFill} stroke={p.zoneStroke} strokeWidth="1.5" />
      <line x1="54" y1="224" x2="186" y2="224" stroke={p.zoneStroke} strokeWidth="1" strokeDasharray="4,3" />
      {/* Handle base */}
      <rect x="87" y="12" width="66" height="36" rx="5" fill={p.zoneFill} stroke={p.zoneStroke} strokeWidth="1.5" />
      {/* Telescoping rods */}
      <rect x="99"  y="12" width="8" height="36" rx="2" fill={p.labelColor} opacity="0.7" />
      <rect x="133" y="12" width="8" height="36" rx="2" fill={p.labelColor} opacity="0.7" />
      {/* Handle grip */}
      <rect x="99" y="14" width="42" height="12" rx="4" fill={p.zoneStroke} />
      {/* Wheels */}
      <circle cx="66"  cy="264" r="11" fill={p.zoneFill} stroke={p.zoneStroke} strokeWidth="2" />
      <circle cx="174" cy="264" r="11" fill={p.zoneFill} stroke={p.zoneStroke} strokeWidth="2" />
      <circle cx="66"  cy="264" r="4"  fill={p.zoneStroke} />
      <circle cx="174" cy="264" r="4"  fill={p.zoneStroke} />
    </g>
  ),

  // ── DAYPACK ──────────────────────────────────────────────────────────────────
  daypack: (p) => (
    <g>
      {/* Body */}
      <rect x="54" y="68" width="132" height="178" rx="22" fill={p.bagFill} stroke={p.zoneStroke} strokeWidth="1.5" />
      {/* Front zip pocket */}
      <rect x="70" y="202" width="100" height="44" rx="8" fill={p.zoneFill} stroke={p.zoneStroke} strokeWidth="1.5" />
      <line x1="78" y1="224" x2="162" y2="224" stroke={p.zoneStroke} strokeWidth="1.5" strokeDasharray="4,3" />
      {/* Zipper puller */}
      <circle cx="120" cy="203" r="4" fill={p.zoneStroke} />
      {/* Left shoulder strap */}
      <path d="M 72 68 Q 55 14 85 10 Q 110 8 110 68"
        fill="none" stroke={p.labelColor} strokeWidth="11" strokeLinecap="round" />
      {/* Right shoulder strap */}
      <path d="M 130 68 Q 130 8 155 10 Q 185 14 168 68"
        fill="none" stroke={p.labelColor} strokeWidth="11" strokeLinecap="round" />
      {/* Top handle */}
      <rect x="105" y="64" width="30" height="10" rx="4" fill={p.zoneStroke} />
      {/* Sternum strap */}
      <line x1="72" y1="145" x2="168" y2="145" stroke={p.zoneStroke} strokeWidth="3" strokeLinecap="round" opacity="0.4" />
    </g>
  ),
};

// ─────────────────────────────────────────────────────────────────────────────
// Shared <defs> rendered unconditionally — filters used by all bag types.
// ─────────────────────────────────────────────────────────────────────────────
function SharedDefs() {
  return (
    <defs>
      {/* ── Glow for hover zones — applied by ZoneOverlays for ALL bag types ── */}
      <filter id="zone-glow" x="-8%" y="-8%" width="116%" height="116%">
        <feGaussianBlur stdDeviation="3" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// <defs> block for the backpack's gradient/texture filters.
// Only injected when rendering a backpack.
// ─────────────────────────────────────────────────────────────────────────────
function BackpackDefs({ activeSkin, ipal }) {
  return (
    <defs>
      {/* ── Canvas body gradient — lit from upper-right ── */}
      <radialGradient id={`cg-${activeSkin}`} cx="72%" cy="18%" r="90%">
        <stop offset="0%"   stopColor={ipal.canvasHi}  />
        <stop offset="45%"  stopColor={ipal.canvasMid} />
        <stop offset="100%" stopColor={ipal.canvasSh}  />
      </radialGradient>

      {/* ── Pocket gradient — slightly darker, own light source ── */}
      <radialGradient id={`pg-${activeSkin}`} cx="65%" cy="25%" r="80%">
        <stop offset="0%"   stopColor={ipal.pocketHi}  />
        <stop offset="100%" stopColor={ipal.pocketSh}  />
      </radialGradient>

      {/* ── Leather gradient ── */}
      <radialGradient id={`lg-${activeSkin}`} cx="55%" cy="28%" r="75%">
        <stop offset="0%"   stopColor={ipal.leatherHi} />
        <stop offset="55%"  stopColor={ipal.leatherMid}/>
        <stop offset="100%" stopColor={ipal.leatherSh} />
      </radialGradient>

      {/* ── Buckle / brass gradient ── */}
      <linearGradient id={`bg-${activeSkin}`} x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%"   stopColor={ipal.buckleHi}  />
        <stop offset="50%"  stopColor={ipal.buckleMid} />
        <stop offset="100%" stopColor={ipal.buckleSh}  />
      </linearGradient>

      {/* ── Canvas weave texture ── */}
      <filter id={`tex-${activeSkin}`} x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency="0.85 0.65"
          numOctaves="4" seed={ipal.texSeed} result="noise"/>
        <feColorMatrix type="matrix" in="noise" result="grayNoise"
          values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.18 0"/>
        <feBlend in="SourceGraphic" in2="grayNoise" mode="multiply"/>
      </filter>

      {/* ── Leather grain texture ── */}
      <filter id={`ltex-${activeSkin}`} x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency="0.35 0.25"
          numOctaves="3" seed={ipal.texSeed + 3} result="noise"/>
        <feColorMatrix type="matrix" in="noise" result="grayNoise"
          values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.22 0"/>
        <feBlend in="SourceGraphic" in2="grayNoise" mode="multiply"/>
      </filter>

      {/* ── Edge shadow inside bag (ambient occlusion) ── */}
      <filter id="inner-shadow">
        <feGaussianBlur stdDeviation="4" result="blur"/>
        <feOffset dx="0" dy="2" result="offset"/>
        <feComposite in="offset" in2="SourceGraphic" operator="in" result="shadow"/>
        <feBlend in="SourceGraphic" in2="shadow" mode="multiply"/>
      </filter>

      {/* ── Drop shadow for raised elements ── */}
      <filter id="raise-shadow" x="-10%" y="-10%" width="120%" height="130%">
        <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="rgba(0,0,0,0.55)"/>
      </filter>

      {/* Clip the whole bag */}
      <clipPath id="bag-body-clip">
        <rect x="22" y="52" width="196" height="246" rx="16"/>
      </clipPath>
    </defs>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Generic zone overlay renderer — driven by bagType.hitAreas / bagType.badgePos
// ─────────────────────────────────────────────────────────────────────────────
function ZoneOverlays({ bagType, zoneMap, packed, highlightedZone, hoveredZone, onZoneClick, onZoneHover, accentColor }) {
  return Object.entries(bagType.hitAreas).map(([zoneId, { x, y, w, h }]) => {
    const zoneItems   = zoneMap[zoneId] ?? [];
    const packedN     = zoneItems.filter(item => packed[item.id]).length;
    const badge       = bagType.badgePos[zoneId];
    const isHover     = hoveredZone === zoneId;
    const isHighlight = highlightedZone === zoneId;

    return (
      <g key={zoneId}>
        <rect
          x={x} y={y} width={w} height={h} rx="8"
          fill={isHover ? `${accentColor}28` : `${accentColor}08`}
          stroke={accentColor}
          strokeWidth={isHover ? 1.8 : 1}
          strokeOpacity={isHover ? 1 : (isHighlight ? 0.9 : 0.55)}
          filter={isHover ? 'url(#zone-glow)' : undefined}
          style={{ cursor: 'pointer', transition: 'all 0.15s' }}
          onClick={() => onZoneClick?.(zoneId)}
          onMouseEnter={() => onZoneHover?.(zoneId)}
          onMouseLeave={() => onZoneHover?.(null)}
        />
        {/* Zone label */}
        <text
          x={x + w / 2} y={y + h / 2}
          textAnchor="middle" dominantBaseline="middle"
          fill={isHover ? accentColor : `${accentColor}80`}
          fontSize="7" fontFamily="JetBrains Mono, monospace"
          letterSpacing="0.12em"
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {zoneId.replace(/_/g, ' ').toUpperCase()}
        </text>

        {/* Count badge */}
        {zoneItems.length > 0 && badge && (
          <g>
            <rect x={badge.x - 14} y={badge.y - 8} width={28} height={14} rx={4}
              fill="rgba(8,10,12,0.82)"
              stroke={isHover ? accentColor : 'rgba(255,255,255,0.12)'}
              strokeWidth="0.8"/>
            <text x={badge.x} y={badge.y + 2}
              textAnchor="middle" dominantBaseline="middle"
              fill={isHover ? accentColor : 'rgba(200,180,140,0.7)'}
              fontSize="6.5" fontFamily="JetBrains Mono, monospace"
              letterSpacing="0.04em">
              {packedN}/{zoneItems.length}
            </text>
          </g>
        )}
      </g>
    );
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component — generic, driven by bagType config prop
// ─────────────────────────────────────────────────────────────────────────────
export default function Bag2D({
  bagType,
  zoneMap         = {},
  packed          = {},
  highlightedZone,
  hoveredZone,
  onZoneClick,
  onZoneHover,
  activeSkin      = 'tactical',
}) {
  const skin      = SKINS[activeSkin] ?? SKINS.tactical;
  const ipal      = ILLUS_PALETTE[activeSkin] ?? ILLUS_PALETTE.tactical;
  const isBackpack = bagType?.id === 'backpack' || !bagType;

  // Props passed to illustration functions
  const illusProps = {
    bagFill:    skin.bagFill,
    zoneFill:   skin.zoneFill,
    zoneStroke: skin.zoneStroke,
    labelColor: skin.labelColor,
    // Extra props needed only by the backpack illustration
    activeSkin,
    illusPal:   ipal,
  };

  const Illustration = BAG_ILLUSTRATIONS[bagType?.id] ?? BAG_ILLUSTRATIONS.backpack;
  const accentColor  = ipal.accent;

  // Fallback: if no bagType provided render backpack with old-style zone overlays
  const activeBagType = bagType ?? {
    id: 'backpack',
    hitAreas: {
      top_lid:      { x: 25,  y: 52,  w: 190, h: 62  },
      main:         { x: 22,  y: 114, w: 196, h: 106 },
      front_pocket: { x: 50,  y: 128, w: 140, h: 102 },
      hip_belt:     { x: 8,   y: 264, w: 224, h: 34  },
      side_pocket:  { x: 192, y: 86,  w: 34,  h: 112 },
    },
    badgePos: {
      top_lid:      { x: 204, y: 62  },
      main:         { x: 204, y: 124 },
      front_pocket: { x: 179, y: 137 },
      hip_belt:     { x: 222, y: 273 },
      side_pocket:  { x: 218, y: 96  },
    },
  };

  return (
    <svg
      viewBox="0 0 240 310"
      className="w-full h-full"
      style={{ maxHeight: 380, filter: 'drop-shadow(0 12px 28px rgba(0,0,0,0.7))' }}
    >
      <SharedDefs />
      {isBackpack && <BackpackDefs activeSkin={activeSkin} ipal={ipal} />}

      <Illustration {...illusProps} />

      <ZoneOverlays
        bagType={activeBagType}
        zoneMap={zoneMap}
        packed={packed}
        highlightedZone={highlightedZone}
        hoveredZone={hoveredZone}
        onZoneClick={onZoneClick}
        onZoneHover={onZoneHover}
        accentColor={accentColor}
      />
    </svg>
  );
}
