// src/components/logistics/bag/Bag2D.jsx
import { useState } from 'react';
import { SKINS } from './bagSkins';
import BagAnim_handbag  from './BagAnim_handbag';
import BagAnim_duffel   from './BagAnim_duffel';
import BagAnim_suitcase from './BagAnim_suitcase';
import BagAnim_carryon  from './BagAnim_carryon';
import BagAnim_daypack  from './BagAnim_daypack';

const ZONE_HIT_AREAS = {
  top_lid:      { x: 25,  y: 52,  w: 190, h: 62  },
  main:         { x: 22,  y: 114, w: 196, h: 106 },
  front_pocket: { x: 50,  y: 128, w: 140, h: 102 },
  hip_belt:     { x: 8,   y: 264, w: 224, h: 34  },
  side_pocket:  { x: 192, y: 86,  w: 34,  h: 112 },
};

const BADGE_POS = {
  top_lid:      { x: 204, y: 62  },
  main:         { x: 204, y: 124 },
  front_pocket: { x: 179, y: 137 },
  hip_belt:     { x: 222, y: 273 },
  side_pocket:  { x: 218, y: 96  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Top-level dispatch: rich animated backpack OR generic non-backpack illustration.
// Backpack uses the per-zone hover/opened animation system below.
// Other types use a simpler animated overlay (Stage B work).
// ─────────────────────────────────────────────────────────────────────────────
export default function Bag2D({
  bagType,
  zoneMap         = {},
  packed          = {},
  activeSkin      = 'tactical',
  onZoneHover,
  onZoneClick,
  highlightedZone,
  hoveredZone,
}) {
  const isBackpack = !bagType || bagType.id === 'backpack';
  if (isBackpack) {
    return (
      <AnimatedBackpack
        zoneMap={zoneMap}
        packed={packed}
        activeSkin={activeSkin}
        onZoneHover={onZoneHover}
        onZoneClick={onZoneClick}
      />
    );
  }
  return (
    <GenericBag
      bagType={bagType}
      zoneMap={zoneMap}
      packed={packed}
      activeSkin={activeSkin}
      onZoneHover={onZoneHover}
      onZoneClick={onZoneClick}
      highlightedZone={highlightedZone}
      hoveredZone={hoveredZone}
    />
  );
}

function AnimatedBackpack({ zoneMap, packed, activeSkin = 'tactical', onZoneHover, onZoneClick }) {
  const [hoveredZone, setHoveredZone] = useState(null);

  function enter(z) { setHoveredZone(z); onZoneHover?.(z); }
  function leave()  { setHoveredZone(null); onZoneHover?.(null); }

  const p = ILLUS_PALETTE[activeSkin] ?? ILLUS_PALETTE.tactical;

  const isHov = (z) => hoveredZone === z;

  return (
    <svg
      viewBox="0 0 240 310"
      className="w-full h-full"
      style={{ maxHeight: 380, filter: 'drop-shadow(0 12px 28px rgba(0,0,0,0.7))' }}
    >
      <defs>
        {/* ── Gradients ── */}
        <radialGradient id={`cg-${activeSkin}`} cx="72%" cy="18%" r="90%">
          <stop offset="0%"   stopColor={p.canvasHi}  />
          <stop offset="45%"  stopColor={p.canvasMid} />
          <stop offset="100%" stopColor={p.canvasSh}  />
        </radialGradient>
        <radialGradient id={`pg-${activeSkin}`} cx="65%" cy="25%" r="80%">
          <stop offset="0%"   stopColor={p.pocketHi}  />
          <stop offset="100%" stopColor={p.pocketSh}  />
        </radialGradient>
        <radialGradient id={`lg-${activeSkin}`} cx="55%" cy="28%" r="75%">
          <stop offset="0%"   stopColor={p.leatherHi} />
          <stop offset="55%"  stopColor={p.leatherMid}/>
          <stop offset="100%" stopColor={p.leatherSh} />
        </radialGradient>
        <linearGradient id={`bg-${activeSkin}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor={p.buckleHi}  />
          <stop offset="50%"  stopColor={p.buckleMid} />
          <stop offset="100%" stopColor={p.buckleSh}  />
        </linearGradient>

        {/* Interior cavity gradient — warm dark center, slight glow at edges */}
        <radialGradient id={`interior-${activeSkin}`} cx="50%" cy="40%" r="70%">
          <stop offset="0%"   stopColor={p.interiorMid} stopOpacity="1"/>
          <stop offset="60%"  stopColor={p.interiorSh}  stopOpacity="1"/>
          <stop offset="100%" stopColor={p.interiorDeep} stopOpacity="1"/>
        </radialGradient>

        {/* Pocket interior — slightly lighter, own source */}
        <radialGradient id={`pint-${activeSkin}`} cx="50%" cy="30%" r="65%">
          <stop offset="0%"   stopColor={p.pocketIntHi}  stopOpacity="1"/>
          <stop offset="100%" stopColor={p.pocketIntSh}  stopOpacity="1"/>
        </radialGradient>

        {/* Hip belt interior — horizontal strip */}
        <linearGradient id={`bint-${activeSkin}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor={p.beltIntHi}  />
          <stop offset="100%" stopColor={p.beltIntSh}  />
        </linearGradient>

        {/* ── Textures ── */}
        <filter id={`tex-${activeSkin}`} x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85 0.65"
            numOctaves="4" seed={p.texSeed} result="noise"/>
          <feColorMatrix type="matrix" in="noise" result="grayNoise"
            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.18 0"/>
          <feBlend in="SourceGraphic" in2="grayNoise" mode="multiply"/>
        </filter>
        <filter id={`ltex-${activeSkin}`} x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.35 0.25"
            numOctaves="3" seed={p.texSeed + 3} result="noise"/>
          <feColorMatrix type="matrix" in="noise" result="grayNoise"
            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.22 0"/>
          <feBlend in="SourceGraphic" in2="grayNoise" mode="multiply"/>
        </filter>
        {/* Interior fabric texture — finer weave, lighter */}
        <filter id={`itex-${activeSkin}`} x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="1.2 0.9"
            numOctaves="3" seed={p.texSeed + 7} result="noise"/>
          <feColorMatrix type="matrix" in="noise" result="grayNoise"
            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.12 0"/>
          <feBlend in="SourceGraphic" in2="grayNoise" mode="overlay"/>
        </filter>

        {/* ── Filters ── */}
        <filter id="inner-shadow">
          <feGaussianBlur stdDeviation="4" result="blur"/>
          <feOffset dx="0" dy="2" result="offset"/>
          <feComposite in="offset" in2="SourceGraphic" operator="in" result="shadow"/>
          <feBlend in="SourceGraphic" in2="shadow" mode="multiply"/>
        </filter>
        <filter id="raise-shadow" x="-10%" y="-10%" width="120%" height="130%">
          <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="rgba(0,0,0,0.55)"/>
        </filter>
        <filter id="zone-glow" x="-8%" y="-8%" width="116%" height="116%">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="zipper-glow" x="-5%" y="-30%" width="110%" height="160%">
          <feGaussianBlur stdDeviation="1.8" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        {/* Soft inner cavity shadow — used inside opened compartments */}
        <filter id="cavity-shadow" x="-8%" y="-8%" width="116%" height="120%">
          <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="rgba(0,0,0,0.7)" floodOpacity="1"/>
        </filter>
        {/* Accent bloom — used for glow behind opened zone label */}
        <filter id="accent-bloom" x="-20%" y="-40%" width="140%" height="180%">
          <feGaussianBlur stdDeviation="4" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>

        {/* ── Clip paths ── */}
        <clipPath id="bag-body-clip">
          <rect x="22" y="52" width="196" height="246" rx="16"/>
        </clipPath>
        <clipPath id="clip-lid-zone">
          <rect x={25} y={52} width={190} height={62} rx={12}/>
        </clipPath>
        <clipPath id="clip-main-zone">
          <rect x={22} y={114} width={196} height={106} rx={8}/>
        </clipPath>
        <clipPath id="clip-front-zone">
          <rect x={50} y={128} width={140} height={102} rx={10}/>
        </clipPath>
        <clipPath id="clip-side-zone">
          <rect x={192} y={86} width={34} height={112} rx={7}/>
        </clipPath>
        <clipPath id="clip-hip-zone">
          <rect x={8} y={264} width={224} height={34} rx={10}/>
        </clipPath>

        {/* Animated clip-path expand for main — grows from midline */}
        <clipPath id="clip-expand-main">
          <rect
            x={22} width={196} rx={8}
            y={isHov('main') ? 114 : 167}
            height={isHov('main') ? 106 : 0}
            style={{ transition: 'y 0.45s cubic-bezier(0.4,0,0.2,1), height 0.45s cubic-bezier(0.4,0,0.2,1)' }}
          />
        </clipPath>
        {/* Animated clip-path expand for hip_belt */}
        <clipPath id="clip-expand-hip">
          <rect
            x={8} width={224} rx={8}
            y={isHov('hip_belt') ? 264 : 281}
            height={isHov('hip_belt') ? 34 : 0}
            style={{ transition: 'y 0.4s cubic-bezier(0.4,0,0.2,1), height 0.4s cubic-bezier(0.4,0,0.2,1)' }}
          />
        </clipPath>
      </defs>

      {/* ══ GROUND SHADOW ══ */}
      <ellipse cx="120" cy="302" rx="85" ry="7"
        fill="rgba(0,0,0,0.55)" style={{ filter: 'blur(5px)' }}/>

      {/* ══ HIP BELT base ══ */}
      <rect x="8" y="264" width="224" height="34" rx="10"
        fill={`url(#lg-${activeSkin})`} filter={`url(#ltex-${activeSkin})`}/>
      <line x1="16" y1="276" x2="224" y2="276"
        stroke={p.stitch} strokeWidth="0.8" strokeDasharray="5,3" opacity="0.6"/>
      {[52, 170].map((x, i) => <BuckleRect key={i} x={x} y={272} skin={activeSkin} p={p}/>)}

      {/* ══ MAIN BAG BODY ══ */}
      <rect x="22" y="52" width="196" height="246" rx="16" fill={`url(#cg-${activeSkin})`}/>
      <rect x="22" y="52" width="196" height="246" rx="16"
        fill={`url(#cg-${activeSkin})`} filter={`url(#tex-${activeSkin})`} opacity="0.9"/>
      <rect x="22" y="52" width="196" height="246" rx="16"
        fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth="6"
        style={{ filter: 'blur(4px)' }} clipPath="url(#bag-body-clip)"/>
      <rect x="206" y="60" width="3" height="228" rx="2" fill={p.canvasHi} opacity="0.18"/>

      {/* ══ TOP LID base ══ */}
      <rect x="25" y="52" width="190" height="62" rx="14"
        fill={`url(#lg-${activeSkin})`} filter={`url(#ltex-${activeSkin})`}
        style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))' }}/>
      <path d="M39,52 Q120,44 201,52" fill="none" stroke={p.leatherHi} strokeWidth="1.2" opacity="0.5"/>
      <line x1="30" y1="105" x2="210" y2="105" stroke={p.stitch} strokeWidth="0.8" strokeDasharray="6,4" opacity="0.5"/>
      <rect x="95" y="74" width="50" height="11" rx="3"
        fill={`url(#lg-${activeSkin})`} filter={`url(#ltex-${activeSkin})`}/>
      <rect x="95" y="74" width="50" height="11" rx="3"
        fill="none" stroke={p.buckleMid} strokeWidth="0.7" opacity="0.6"/>
      <BuckleRect x={116} y={77} skin={activeSkin} p={p} w={8} h={5}/>

      {/* ══ SHOULDER STRAPS ══ */}
      {[52, 165].map((x, i) => (
        <g key={i}>
          <path d={`M${x},52 C${x+(i===0?-6:6)},30 ${x+(i===0?-4:4)},20 ${x+(i===0?-2:2)},14`}
            stroke={`url(#lg-${activeSkin})`} strokeWidth="10" fill="none" strokeLinecap="round"
            filter={`url(#ltex-${activeSkin})`}/>
          <path d={`M${x},52 C${x+(i===0?-6:6)},30 ${x+(i===0?-4:4)},20 ${x+(i===0?-2:2)},14`}
            stroke={p.leatherHi} strokeWidth="1" fill="none" opacity="0.2"/>
        </g>
      ))}

      {/* ══ CARRY HANDLE ══ */}
      <path d="M97,28 Q120,12 143,28" stroke={`url(#lg-${activeSkin})`} strokeWidth="9" fill="none" strokeLinecap="round"/>
      <path d="M97,28 Q120,12 143,28" stroke={p.leatherHi} strokeWidth="1.5" fill="none" opacity="0.3"/>
      {[97, 143].map((x, i) => (
        <ellipse key={i} cx={x} cy="32" rx="5" ry="4"
          fill={`url(#bg-${activeSkin})`} stroke={p.buckleSh} strokeWidth="0.5"/>
      ))}

      {/* ══ LID BUCKLES ══ */}
      <BuckleRect x={74}  y={80} skin={activeSkin} p={p}/>
      <BuckleRect x={152} y={80} skin={activeSkin} p={p}/>
      {[78, 156].map((x, i) => (
        <rect key={i} x={x} y={92} width="8" height="20" rx="2"
          fill={`url(#lg-${activeSkin})`} filter={`url(#ltex-${activeSkin})`}/>
      ))}

      {/* ══ MAIN BODY SEPARATION ══ */}
      <line x1="30" y1="114" x2="210" y2="114" stroke="rgba(0,0,0,0.3)" strokeWidth="1.5"/>

      {/* ══ SIDE POCKET base ══ */}
      <rect x="192" y="86" width="32" height="112" rx="7"
        fill={`url(#pg-${activeSkin})`} filter={`url(#tex-${activeSkin})`}
        style={{ filter: 'drop-shadow(-2px 0 6px rgba(0,0,0,0.4))' }}/>
      <line x1="208" y1="92" x2="208" y2="192"
        stroke={p.buckleMid} strokeWidth="1.2" strokeDasharray="3,2" opacity="0.8"/>
      <ellipse cx="208" cy="94" rx="3.5" ry="3" fill={`url(#bg-${activeSkin})`}/>
      <rect x="194" y="88" width="28" height="108" rx="6"
        fill="none" stroke={p.stitch} strokeWidth="0.7" strokeDasharray="4,3" opacity="0.5"/>

      {/* ══ COMPRESSION STRAP ══ */}
      <rect x="182" y="116" width="12" height="62" rx="3"
        fill={`url(#lg-${activeSkin})`} filter={`url(#ltex-${activeSkin})`}/>
      <BuckleRect x={184} y={144} skin={activeSkin} p={p} w={8} h={5}/>

      {/* ══ FRONT POCKET base ══ */}
      <rect x="50" y="128" width="140" height="102" rx="10"
        fill={`url(#pg-${activeSkin})`} filter={`url(#tex-${activeSkin})`}
        style={{ filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.5))' }}/>
      <path d="M60,128 Q120,121 180,128" fill="none" stroke={p.canvasHi} strokeWidth="1" opacity="0.2"/>
      <rect x="50" y="148" width="140" height="5" rx="2" fill={p.leatherSh}/>
      <line x1="55" y1="150" x2="185" y2="150"
        stroke={p.buckleMid} strokeWidth="1.2" strokeDasharray="4,3" opacity="0.9"/>
      <rect x="113" y="146" width="14" height="9" rx="2"
        fill={`url(#bg-${activeSkin})`} stroke={p.buckleSh} strokeWidth="0.6"/>
      <rect x="54" y="132" width="132" height="94" rx="8"
        fill="none" stroke={p.stitch} strokeWidth="0.8" strokeDasharray="5,3" opacity="0.55"/>
      <rect x="50" y="220" width="140" height="10" rx="0"
        fill={`url(#lg-${activeSkin})`} filter={`url(#ltex-${activeSkin})`}/>

      {/* ══ BODY STITCHING ══ */}
      <line x1="120" y1="114" x2="120" y2="260"
        stroke={p.stitch} strokeWidth="0.6" strokeDasharray="6,4" opacity="0.3"/>

      {/* ════════════════════════════════════════════════
          ZONE OVERLAYS — idle + hover states per zone
          ════════════════════════════════════════════════ */}

      {/* ── TOP LID ────────────────────────────────────── */}
      <g>
        {/* IDLE: subtle warm tint + inner stitching detail */}
        <rect x={25} y={52} width={190} height={62} rx={12}
          fill={p.accent} fillOpacity={isHov('top_lid') ? 0 : 0.04}
          stroke={p.accent} strokeWidth={isHov('top_lid') ? 0 : 0.8} strokeOpacity={0.3}
          style={{ transition: 'fill-opacity 0.3s, stroke-opacity 0.3s' }}
          onMouseEnter={() => enter('top_lid')}
          onMouseLeave={leave}
          pointerEvents="none"
        />
        {/* Idle: horizontal stitching lines across lid — subtle depth marks */}
        {[66, 78, 90].map((y, i) => (
          <line key={i} x1={35} y1={y} x2={205} y2={y}
            stroke={p.stitch} strokeWidth={0.5} strokeDasharray={i % 2 === 0 ? '8,5' : '4,6'}
            opacity={isHov('top_lid') ? 0 : 0.35}
            style={{ transition: `opacity 0.25s ${i * 0.05}s` }}
          />
        ))}
        {/* Idle: compression strap shadow detail */}
        <rect x={93} y={72} width={54} height={15} rx={4}
          fill="rgba(0,0,0,0.18)"
          opacity={isHov('top_lid') ? 0 : 1}
          style={{ transition: 'opacity 0.2s', pointerEvents: 'none' }}
        />

        {/* OPENED: split-flap reveal — interior cavity exposed */}
        <g clipPath="url(#clip-lid-zone)" style={{ pointerEvents: 'none' }}>
          {/* Interior cavity fill */}
          <rect x={25} y={52} width={190} height={62} rx={12}
            fill={`url(#interior-${activeSkin})`}
            filter={`url(#itex-${activeSkin})`}
          />
          {/* Deep cavity edge shadow — makes it look like a real recessed interior */}
          <rect x={25} y={52} width={190} height={62} rx={12}
            fill="none" stroke="rgba(0,0,0,0.6)" strokeWidth={8}
            style={{ filter: 'blur(5px)' }}
          />
          {/* Interior accent glow line — warm light inside */}
          <rect x={30} y={95} width={180} height={2} rx={1}
            fill={p.accent} fillOpacity={isHov('top_lid') ? 0.25 : 0}
            style={{ filter: `blur(3px)`, transition: 'fill-opacity 0.35s 0.2s' }}
          />
          {/* Seam line revealed as flaps part */}
          <line x1={30} y1={83} x2={210} y2={83}
            stroke={p.accent} strokeWidth={1.2}
            strokeOpacity={isHov('top_lid') ? 0.85 : 0}
            style={{ transition: 'stroke-opacity 0.15s 0.25s' }}
          />
          {/* Staggered tooth dots along seam */}
          {Array.from({ length: 14 }, (_, i) => (
            <circle key={i} cx={35 + i * 12} cy={83} r={1.8}
              fill={p.accent}
              opacity={isHov('top_lid') ? 0.55 : 0}
              style={{ transition: `opacity 0.1s ${0.28 + i * 0.012}s` }}
            />
          ))}
          {/* Top flap slides UP out of clip */}
          <rect x={25} y={52} width={190} height={62}
            fill={`url(#lg-${activeSkin})`}
            style={{
              transformBox: 'fill-box',
              transform: `translateY(${isHov('top_lid') ? -62 : 0}px)`,
              transition: 'transform 0.4s cubic-bezier(0.4,0,0.2,1)',
            }}
          />
          {/* Bottom flap slides DOWN */}
          <rect x={25} y={83} width={190} height={62}
            fill={`url(#lg-${activeSkin})`}
            style={{
              transformBox: 'fill-box',
              transform: `translateY(${isHov('top_lid') ? 62 : 0}px)`,
              transition: 'transform 0.4s cubic-bezier(0.4,0,0.2,1)',
            }}
          />
          {/* Stitching rides with top flap */}
          <line x1={30} y1={60} x2={210} y2={60}
            stroke={p.stitch} strokeWidth={0.7} strokeDasharray="5,3" opacity={0.6}
            style={{
              transform: `translateY(${isHov('top_lid') ? -62 : 0}px)`,
              transition: 'transform 0.4s cubic-bezier(0.4,0,0.2,1)',
            }}
          />
        </g>

        {/* Hit area (transparent, on top) */}
        <rect x={25} y={52} width={190} height={62} rx={12}
          fill="transparent"
          stroke={p.accent} strokeWidth={isHov('top_lid') ? 1.8 : 1}
          strokeOpacity={isHov('top_lid') ? 1 : 0.4}
          filter={isHov('top_lid') ? 'url(#zone-glow)' : undefined}
          onMouseEnter={() => enter('top_lid')}
          onMouseLeave={leave}
          onClick={() => onZoneClick?.('top_lid')}
          style={{ cursor: 'pointer', transition: 'stroke-opacity 0.2s, stroke-width 0.2s' }}
        />
        {/* Zone label */}
        <ZoneLabel zone="top_lid" z={ZONE_HIT_AREAS.top_lid} isHov={isHov('top_lid')} p={p}/>
        <ZoneBadge zone="top_lid" zoneMap={zoneMap} packed={packed} isHov={isHov('top_lid')} p={p}/>
      </g>

      {/* ── MAIN COMPARTMENT ────────────────────────────── */}
      <g>
        {/* IDLE: cross-hatched panel lines — shows structural fabric panels */}
        <g clipPath="url(#clip-main-zone)" style={{ pointerEvents: 'none' }}>
          {/* Idle vertical panel seams */}
          {[80, 140].map((x, i) => (
            <line key={i} x1={x} y1={114} x2={x} y2={220}
              stroke={p.stitch} strokeWidth={0.6} strokeDasharray="6,5"
              opacity={isHov('main') ? 0 : 0.28}
              style={{ transition: `opacity 0.2s ${i * 0.06}s` }}
            />
          ))}
          {/* Idle horizontal load-line */}
          <line x1={28} y1={175} x2={182} y2={175}
            stroke={p.stitch} strokeWidth={0.5} strokeDasharray="10,6"
            opacity={isHov('main') ? 0 : 0.2}
            style={{ transition: 'opacity 0.2s' }}
          />
          {/* Idle: subtle fill tint with depth */}
          <rect x={22} y={114} width={196} height={106} rx={8}
            fill={p.accent} fillOpacity={0.04}
            stroke={p.accent} strokeWidth={0.8} strokeOpacity={0.25}
          />

          {/* OPENED: interior cavity reveal via clip-path expand */}
          <rect x={22} y={114} width={196} height={106} rx={8}
            fill={`url(#interior-${activeSkin})`}
            filter={`url(#itex-${activeSkin})`}
            clipPath="url(#clip-expand-main)"
          />
          {/* Deep edge shadow inside cavity */}
          <rect x={22} y={114} width={196} height={106} rx={8}
            fill="none" stroke="rgba(0,0,0,0.55)" strokeWidth={10}
            clipPath="url(#clip-expand-main)"
            style={{ filter: 'blur(6px)' }}
          />
          {/* Interior warm glow seam at midline */}
          <rect x={28} y={165} width={170} height={3} rx={1.5}
            fill={p.accent}
            fillOpacity={isHov('main') ? 0.18 : 0}
            style={{ filter: 'blur(4px)', transition: 'fill-opacity 0.4s 0.2s' }}
          />
          {/* Clip-path expand accent fill layer */}
          <rect x={22} y={114} width={196} height={106} rx={8}
            fill={`${p.accent}18`}
            clipPath="url(#clip-expand-main)"
            style={{ pointerEvents: 'none' }}
          />
        </g>

        {/* Hit area */}
        <rect x={22} y={114} width={196} height={106} rx={8}
          fill="transparent"
          stroke={p.accent} strokeWidth={isHov('main') ? 1.8 : 1}
          strokeOpacity={isHov('main') ? 1 : 0.45}
          filter={isHov('main') ? 'url(#zone-glow)' : undefined}
          onMouseEnter={() => enter('main')}
          onMouseLeave={leave}
          onClick={() => onZoneClick?.('main')}
          style={{ cursor: 'pointer', transition: 'all 0.2s' }}
        />
        <ZoneLabel zone="main" z={ZONE_HIT_AREAS.main} isHov={isHov('main')} p={p}/>
        <ZoneBadge zone="main" zoneMap={zoneMap} packed={packed} isHov={isHov('main')} p={p}/>
      </g>

      {/* ── FRONT POCKET ────────────────────────────────── */}
      <g>
        {/* IDLE: diagonal quilting pattern — pockets often have quilted lining */}
        <g clipPath="url(#clip-front-zone)" style={{ pointerEvents: 'none' }}>
          {/* Idle quilting lines */}
          {Array.from({ length: 8 }, (_, i) => (
            <line key={`q${i}`}
              x1={50 + i * 20} y1={152}
              x2={50 + i * 20 - 20} y2={230}
              stroke={p.stitch} strokeWidth={0.5}
              opacity={isHov('front_pocket') ? 0 : 0.22}
              style={{ transition: `opacity 0.18s ${i * 0.03}s` }}
            />
          ))}
          {/* Idle: pocket depth shadow at bottom */}
          <rect x={50} y={210} width={140} height={20} rx={0}
            fill="rgba(0,0,0,0.15)"
            opacity={isHov('front_pocket') ? 0 : 1}
            style={{ transition: 'opacity 0.2s', filter: 'blur(4px)' }}
          />
          {/* Idle: faint fill tint */}
          <rect x={50} y={128} width={140} height={102} rx={10}
            fill={p.accent} fillOpacity={0.04}
            stroke={p.accent} strokeWidth={0.7} strokeOpacity={0.22}
          />

          {/* OPENED: interior pocket reveal below zipper rail */}
          <rect x={50} y={153} width={140} height={77} rx={0}
            fill={`url(#pint-${activeSkin})`}
            filter={`url(#itex-${activeSkin})`}
            opacity={isHov('front_pocket') ? 1 : 0}
            style={{ transition: 'opacity 0.35s 0.3s' }}
          />
          {/* Deep shadow at top of opened pocket */}
          <rect x={50} y={153} width={140} height={16}
            fill="rgba(0,0,0,0.5)"
            opacity={isHov('front_pocket') ? 1 : 0}
            style={{ filter: 'blur(5px)', transition: 'opacity 0.3s 0.35s' }}
          />
          {/* Interior bottom warm glow */}
          <rect x={58} y={218} width={124} height={2} rx={1}
            fill={p.accent}
            fillOpacity={isHov('front_pocket') ? 0.2 : 0}
            style={{ filter: 'blur(3px)', transition: 'fill-opacity 0.4s 0.45s' }}
          />
        </g>

        {/* Draw-on zipper animation */}
        <g style={{ pointerEvents: 'none' }}>
          <line x1={55} y1={150} x2={185} y2={150}
            stroke={p.accent} strokeWidth={2} strokeLinecap="round"
            filter="url(#zipper-glow)"
            strokeDasharray={130} strokeDashoffset={isHov('front_pocket') ? 0 : 130}
            style={{ transition: 'stroke-dashoffset 0.55s cubic-bezier(0.4,0,0.2,1)' }}
          />
          <line x1={55} y1={148} x2={185} y2={148}
            stroke={p.accent} strokeWidth={1.2} strokeOpacity={0.5}
            strokeDasharray="5 4" strokeDashoffset={isHov('front_pocket') ? 0 : 130}
            style={{ transition: 'stroke-dashoffset 0.55s cubic-bezier(0.4,0,0.2,1) 0.04s' }}
          />
          <line x1={55} y1={152} x2={185} y2={152}
            stroke={p.accent} strokeWidth={1.2} strokeOpacity={0.5}
            strokeDasharray="5 4" strokeDashoffset={isHov('front_pocket') ? 0 : 130}
            style={{ transition: 'stroke-dashoffset 0.55s cubic-bezier(0.4,0,0.2,1) 0.06s' }}
          />
          {/* Zipper pull slides to right on open */}
          <rect
            x={isHov('front_pocket') ? 178 : 113} y={146} width={14} height={9} rx={2}
            fill={`url(#bg-${activeSkin})`} stroke={p.accent} strokeWidth={isHov('front_pocket') ? 1 : 0.6}
            style={{ transition: 'x 0.55s cubic-bezier(0.4,0,0.2,1), stroke-width 0.2s' }}
          />
          {/* Pull dot glows at destination */}
          <circle cx={isHov('front_pocket') ? 187 : 55} cy={150} r={3.5}
            fill={p.accent} opacity={isHov('front_pocket') ? 1 : 0}
            style={{ transition: 'cx 0.55s cubic-bezier(0.4,0,0.2,1), opacity 0.2s' }}
          />
        </g>

        {/* Hit area */}
        <rect x={50} y={128} width={140} height={102} rx={10}
          fill="transparent"
          stroke={p.accent} strokeWidth={isHov('front_pocket') ? 1.8 : 1}
          strokeOpacity={isHov('front_pocket') ? 1 : 0.45}
          filter={isHov('front_pocket') ? 'url(#zone-glow)' : undefined}
          onMouseEnter={() => enter('front_pocket')}
          onMouseLeave={leave}
          onClick={() => onZoneClick?.('front_pocket')}
          style={{ cursor: 'pointer', transition: 'all 0.2s' }}
        />
        <ZoneLabel zone="front_pocket" z={ZONE_HIT_AREAS.front_pocket} isHov={isHov('front_pocket')} p={p}/>
        <ZoneBadge zone="front_pocket" zoneMap={zoneMap} packed={packed} isHov={isHov('front_pocket')} p={p}/>
      </g>

      {/* ── SIDE POCKET ─────────────────────────────────── */}
      <g>
        {/* IDLE: horizontal fill bands — like item slots stacked */}
        <g clipPath="url(#clip-side-zone)" style={{ pointerEvents: 'none' }}>
          {[115, 140, 165].map((y, i) => (
            <line key={i} x1={194} y1={y} x2={222} y2={y}
              stroke={p.stitch} strokeWidth={0.5} strokeDasharray="3,3"
              opacity={isHov('side_pocket') ? 0 : 0.3}
              style={{ transition: `opacity 0.15s ${i * 0.05}s` }}
            />
          ))}
          <rect x={192} y={86} width={34} height={112} rx={7}
            fill={p.accent} fillOpacity={0.04}
            stroke={p.accent} strokeWidth={0.7} strokeOpacity={0.22}
          />

          {/* OPENED: narrow interior reveals from top */}
          <rect x={192} y={86} width={34} height={112} rx={7}
            fill={`url(#pint-${activeSkin})`}
            filter={`url(#itex-${activeSkin})`}
            opacity={isHov('side_pocket') ? 1 : 0}
            style={{ transition: 'opacity 0.3s 0.25s' }}
          />
          <rect x={192} y={86} width={34} height={18}
            fill="rgba(0,0,0,0.55)"
            opacity={isHov('side_pocket') ? 1 : 0}
            style={{ filter: 'blur(4px)', transition: 'opacity 0.25s 0.3s' }}
          />
          {/* Right-edge interior highlight */}
          <rect x={218} y={92} width={2} height={100} rx={1}
            fill={p.accent} fillOpacity={isHov('side_pocket') ? 0.18 : 0}
            style={{ transition: 'fill-opacity 0.3s 0.35s' }}
          />
        </g>

        {/* Draw-on zipper — vertical */}
        <g style={{ pointerEvents: 'none' }}>
          <line x1={208} y1={92} x2={208} y2={192}
            stroke={p.accent} strokeWidth={2} strokeLinecap="round"
            filter="url(#zipper-glow)"
            strokeDasharray={100} strokeDashoffset={isHov('side_pocket') ? 0 : 100}
            style={{ transition: 'stroke-dashoffset 0.5s cubic-bezier(0.4,0,0.2,1)' }}
          />
          <line x1={206} y1={92} x2={206} y2={192}
            stroke={p.accent} strokeWidth={1} strokeOpacity={0.45}
            strokeDasharray="4 4" strokeDashoffset={isHov('side_pocket') ? 0 : 100}
            style={{ transition: 'stroke-dashoffset 0.5s cubic-bezier(0.4,0,0.2,1) 0.04s' }}
          />
          <line x1={210} y1={92} x2={210} y2={192}
            stroke={p.accent} strokeWidth={1} strokeOpacity={0.45}
            strokeDasharray="4 4" strokeDashoffset={isHov('side_pocket') ? 0 : 100}
            style={{ transition: 'stroke-dashoffset 0.5s cubic-bezier(0.4,0,0.2,1) 0.06s' }}
          />
          {/* Pull tab slides down */}
          <ellipse cx={208} cy={isHov('side_pocket') ? 192 : 94} rx={3.5} ry={3}
            fill={`url(#bg-${activeSkin})`}
            stroke={p.accent} strokeWidth={isHov('side_pocket') ? 1 : 0}
            style={{ transition: 'cy 0.5s cubic-bezier(0.4,0,0.2,1), stroke-width 0.2s' }}
          />
          <circle cx={208} cy={isHov('side_pocket') ? 194 : 92} r={3}
            fill={p.accent} opacity={isHov('side_pocket') ? 1 : 0}
            style={{ transition: 'cy 0.5s cubic-bezier(0.4,0,0.2,1), opacity 0.2s' }}
          />
        </g>

        {/* Hit area */}
        <rect x={192} y={86} width={34} height={112} rx={7}
          fill="transparent"
          stroke={p.accent} strokeWidth={isHov('side_pocket') ? 1.8 : 1}
          strokeOpacity={isHov('side_pocket') ? 1 : 0.45}
          filter={isHov('side_pocket') ? 'url(#zone-glow)' : undefined}
          onMouseEnter={() => enter('side_pocket')}
          onMouseLeave={leave}
          onClick={() => onZoneClick?.('side_pocket')}
          style={{ cursor: 'pointer', transition: 'all 0.2s' }}
        />
        <ZoneLabel zone="side_pocket" z={ZONE_HIT_AREAS.side_pocket} isHov={isHov('side_pocket')} p={p}/>
        <ZoneBadge zone="side_pocket" zoneMap={zoneMap} packed={packed} isHov={isHov('side_pocket')} p={p}/>
      </g>

      {/* ── HIP BELT ────────────────────────────────────── */}
      <g>
        {/* IDLE: belt weave lines */}
        <g clipPath="url(#clip-hip-zone)" style={{ pointerEvents: 'none' }}>
          {[270, 278, 286].map((y, i) => (
            <line key={i} x1={16} y1={y} x2={224} y2={y}
              stroke={p.stitch} strokeWidth={0.5} strokeDasharray="8,4"
              opacity={isHov('hip_belt') ? 0 : 0.25}
              style={{ transition: `opacity 0.15s ${i * 0.04}s` }}
            />
          ))}
          <rect x={8} y={264} width={224} height={34} rx={10}
            fill={p.accent} fillOpacity={0.04}
            stroke={p.accent} strokeWidth={0.7} strokeOpacity={0.22}
          />

          {/* OPENED: interior strip via clip-path expand */}
          <rect x={8} y={264} width={224} height={34} rx={10}
            fill={`url(#bint-${activeSkin})`}
            filter={`url(#itex-${activeSkin})`}
            clipPath="url(#clip-expand-hip)"
          />
          {/* Edge depth shadows inside cavity */}
          <rect x={8} y={264} width={224} height={34} rx={10}
            fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth={8}
            clipPath="url(#clip-expand-hip)"
            style={{ filter: 'blur(4px)' }}
          />
          {/* Center glow strip */}
          <rect x={20} y={279} width={200} height={2} rx={1}
            fill={p.accent}
            fillOpacity={isHov('hip_belt') ? 0.22 : 0}
            clipPath="url(#clip-expand-hip)"
            style={{ filter: 'blur(3px)', transition: 'fill-opacity 0.4s 0.2s' }}
          />
          {/* Clip-path expand accent fill */}
          <rect x={8} y={264} width={224} height={34} rx={10}
            fill={`${p.accent}20`}
            clipPath="url(#clip-expand-hip)"
          />
        </g>

        {/* Hit area */}
        <rect x={8} y={264} width={224} height={34} rx={10}
          fill="transparent"
          stroke={p.accent} strokeWidth={isHov('hip_belt') ? 1.8 : 1}
          strokeOpacity={isHov('hip_belt') ? 1 : 0.45}
          filter={isHov('hip_belt') ? 'url(#zone-glow)' : undefined}
          onMouseEnter={() => enter('hip_belt')}
          onMouseLeave={leave}
          onClick={() => onZoneClick?.('hip_belt')}
          style={{ cursor: 'pointer', transition: 'all 0.2s' }}
        />
        <ZoneLabel zone="hip_belt" z={ZONE_HIT_AREAS.hip_belt} isHov={isHov('hip_belt')} p={p}/>
        <ZoneBadge zone="hip_belt" zoneMap={zoneMap} packed={packed} isHov={isHov('hip_belt')} p={p}/>
      </g>

      {/* ══ HIGHLIGHT SHEEN ══ */}
      <ellipse cx="185" cy="72" rx="28" ry="16"
        fill="rgba(255,255,255,0.06)" transform="rotate(-20, 185, 72)"/>
    </svg>
  );
}

// ── Sub-components ────────────────────────────────────────

function ZoneLabel({ zone, z, isHov, p }) {
  return (
    <text
      x={z.x + z.w / 2} y={z.y + z.h / 2}
      textAnchor="middle" dominantBaseline="middle"
      fill={isHov ? p.accent : `${p.accent}70`}
      fontSize={isHov ? 7.5 : 6.5}
      fontFamily="JetBrains Mono, monospace"
      letterSpacing="0.14em"
      fontWeight={isHov ? '600' : '400'}
      style={{
        pointerEvents: 'none',
        userSelect: 'none',
        transition: 'font-size 0.2s, fill 0.2s',
        filter: isHov ? `drop-shadow(0 0 4px ${p.accent}88)` : undefined,
      }}
    >
      {zone.replace(/_/g, ' ').toUpperCase()}
    </text>
  );
}

function ZoneBadge({ zone, zoneMap, packed, isHov, p }) {
  const items = zoneMap[zone] ?? [];
  if (items.length === 0) return null;
  const packedCount = items.filter(it => packed[it.id]).length;
  const badge = BADGE_POS[zone];
  const full = packedCount === items.length;
  return (
    <g style={{ pointerEvents: 'none' }}>
      <rect x={badge.x - 14} y={badge.y - 8} width={28} height={14} rx={4}
        fill={full && isHov ? `${p.accent}30` : 'rgba(8,10,12,0.85)'}
        stroke={isHov ? p.accent : full ? `${p.accent}60` : 'rgba(255,255,255,0.12)'}
        strokeWidth={isHov ? 1 : 0.8}
        style={{ transition: 'all 0.2s' }}
      />
      <text x={badge.x} y={badge.y + 2}
        textAnchor="middle" dominantBaseline="middle"
        fill={isHov ? p.accent : full ? `${p.accent}90` : 'rgba(200,180,140,0.7)'}
        fontSize="6.5" fontFamily="JetBrains Mono, monospace" letterSpacing="0.04em"
        style={{ transition: 'fill 0.2s' }}
      >
        {packedCount}/{items.length}
      </text>
    </g>
  );
}

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

// ── Palettes ───────────────────────────────────────────────
const ILLUS_PALETTE = {
  tactical: {
    canvasHi:   '#3d5060',
    canvasMid:  '#28343c',
    canvasSh:   '#141e24',
    pocketHi:   '#2e3c44',
    pocketSh:   '#1a2428',
    leatherHi:  '#3a3630',
    leatherMid: '#252018',
    leatherSh:  '#120e08',
    buckleHi:   '#ff9f50',
    buckleMid:  '#E67E22',
    buckleSh:   '#8a4010',
    stitch:     '#E67E2255',
    accent:     '#E67E22',
    texSeed:    1,
    // Interior cavity colors
    interiorMid:  '#1a2830',
    interiorSh:   '#0e1820',
    interiorDeep: '#080e14',
    pocketIntHi:  '#1e2c36',
    pocketIntSh:  '#0c1620',
    beltIntHi:    '#1c2830',
    beltIntSh:    '#0a1018',
  },
  heritage: {
    canvasHi:   '#4a6a30',
    canvasMid:  '#2a3d1c',
    canvasSh:   '#141e0c',
    pocketHi:   '#3a5228',
    pocketSh:   '#1a2a10',
    leatherHi:  '#9a6040',
    leatherMid: '#5c3018',
    leatherSh:  '#2e1608',
    buckleHi:   '#ead070',
    buckleMid:  '#c8a040',
    buckleSh:   '#7a6020',
    stitch:     '#c8a04055',
    accent:     '#c8a040',
    texSeed:    2,
    interiorMid:  '#1a2418',
    interiorSh:   '#0e160c',
    interiorDeep: '#060e04',
    pocketIntHi:  '#1e2a18',
    pocketIntSh:  '#0c160a',
    beltIntHi:    '#1a2618',
    beltIntSh:    '#0a1208',
  },
  desert: {
    canvasHi:   '#c8a060',
    canvasMid:  '#8a6830',
    canvasSh:   '#4e3a18',
    pocketHi:   '#a88448',
    pocketSh:   '#5e4020',
    leatherHi:  '#b07850',
    leatherMid: '#6b4220',
    leatherSh:  '#3a2010',
    buckleHi:   '#f0d880',
    buckleMid:  '#d4a843',
    buckleSh:   '#8a6820',
    stitch:     '#d4a84355',
    accent:     '#d4a843',
    texSeed:    5,
    interiorMid:  '#2a1e10',
    interiorSh:   '#1a1208',
    interiorDeep: '#0e0a04',
    pocketIntHi:  '#28200e',
    pocketIntSh:  '#160e04',
    beltIntHi:    '#241a0c',
    beltIntSh:    '#120c04',
  },
};

// ═════════════════════════════════════════════════════════════════════════════
// GENERIC BAG (non-backpack) — handbag, duffel, suitcase, carryon, daypack
// Stage A: static illustration + generic zone overlay hit-test with hover glow
// ═════════════════════════════════════════════════════════════════════════════
// Per-zone animation layers for non-backpack bag types
// ═════════════════════════════════════════════════════════════════════════════

const BAG_ANIM_LAYER = {
  handbag:  BagAnim_handbag,
  duffel:   BagAnim_duffel,
  suitcase: BagAnim_suitcase,
  carryon:  BagAnim_carryon,
  daypack:  BagAnim_daypack,
};

const NON_BACKPACK_ILLUSTRATIONS = {
  handbag: (p) => (
    <g>
      <path d="M 58 92 L 32 262 L 208 262 L 182 92 Z"
        fill={p.bagFill} stroke={p.zoneStroke} strokeWidth="1.5" opacity="0.9" />
      <path d="M 74 92 Q 74 32 107 32 Q 137 32 137 92"
        fill="none" stroke={p.labelColor} strokeWidth="9" strokeLinecap="round" />
      <path d="M 103 92 Q 103 32 133 32 Q 166 32 166 92"
        fill="none" stroke={p.labelColor} strokeWidth="9" strokeLinecap="round" />
      <rect x="104" y="84" width="32" height="16" rx="4" fill={p.zoneStroke} />
      <rect x="116" y="88" width="8" height="8" rx="2" fill={p.bagFill} />
      <line x1="38" y1="240" x2="202" y2="240" stroke={p.zoneStroke} strokeWidth="1" strokeDasharray="5,4" opacity="0.5" />
    </g>
  ),
  duffel: (p) => (
    <g>
      <ellipse cx="120" cy="163" rx="106" ry="64" fill={p.bagFill} stroke={p.zoneStroke} strokeWidth="1.5" />
      <ellipse cx="17" cy="163" rx="16" ry="48" fill={p.zoneFill} stroke={p.zoneStroke} strokeWidth="1" />
      <ellipse cx="223" cy="163" rx="16" ry="48" fill={p.zoneFill} stroke={p.zoneStroke} strokeWidth="1" />
      <rect x="54" y="57" width="132" height="54" rx="6" fill={p.zoneFill} stroke={p.zoneStroke} strokeWidth="1.5" />
      <line x1="62" y1="84" x2="178" y2="84" stroke={p.zoneStroke} strokeWidth="1.5" strokeDasharray="5,4" />
      <path d="M 84 99 Q 120 72 156 99" fill="none" stroke={p.labelColor} strokeWidth="9" strokeLinecap="round" />
      <path d="M 40 140 Q 10 90 60 70" fill="none" stroke={p.labelColor} strokeWidth="4" opacity="0.5" strokeLinecap="round" />
      <path d="M 200 140 Q 230 90 180 70" fill="none" stroke={p.labelColor} strokeWidth="4" opacity="0.5" strokeLinecap="round" />
    </g>
  ),
  suitcase: (p) => (
    <g>
      <rect x="34" y="38" width="172" height="228" rx="12" fill={p.bagFill} stroke={p.zoneStroke} strokeWidth="1.5" />
      <line x1="34" y1="148" x2="206" y2="148" stroke={p.zoneStroke} strokeWidth="2" />
      {[60, 90, 120, 150, 180].map(cx => (
        <line key={cx} x1={cx} y1="60" x2={cx} y2="145" stroke={p.zoneStroke} strokeWidth="0.8" opacity="0.3" />
      ))}
      <rect x="83" y="2" width="74" height="36" rx="6" fill={p.zoneFill} stroke={p.zoneStroke} strokeWidth="1.5" />
      <rect x="96"  y="2" width="9" height="36" rx="2" fill={p.labelColor} opacity="0.7" />
      <rect x="135" y="2" width="9" height="36" rx="2" fill={p.labelColor} opacity="0.7" />
      <rect x="96" y="6" width="48" height="12" rx="4" fill={p.zoneStroke} />
      <circle cx="54"  cy="272" r="13" fill={p.zoneFill} stroke={p.zoneStroke} strokeWidth="2" />
      <circle cx="186" cy="272" r="13" fill={p.zoneFill} stroke={p.zoneStroke} strokeWidth="2" />
      <circle cx="54"  cy="272" r="5"  fill={p.zoneStroke} />
      <circle cx="186" cy="272" r="5"  fill={p.zoneStroke} />
      {[[44,50],[196,50],[44,256],[196,256]].map(([cx,cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="8" fill={p.zoneStroke} opacity="0.7" />
      ))}
    </g>
  ),
  carryon: (p) => (
    <g>
      <rect x="46" y="48" width="148" height="210" rx="10" fill={p.bagFill} stroke={p.zoneStroke} strokeWidth="1.5" />
      <rect x="94" y="48" width="52" height="210" rx="6" fill={p.zoneFill} stroke={p.zoneStroke} strokeWidth="1.5" />
      <rect x="46" y="208" width="148" height="50" rx="6" fill={p.zoneFill} stroke={p.zoneStroke} strokeWidth="1.5" />
      <line x1="54" y1="224" x2="186" y2="224" stroke={p.zoneStroke} strokeWidth="1" strokeDasharray="4,3" />
      <rect x="87" y="12" width="66" height="36" rx="5" fill={p.zoneFill} stroke={p.zoneStroke} strokeWidth="1.5" />
      <rect x="99"  y="12" width="8" height="36" rx="2" fill={p.labelColor} opacity="0.7" />
      <rect x="133" y="12" width="8" height="36" rx="2" fill={p.labelColor} opacity="0.7" />
      <rect x="99" y="14" width="42" height="12" rx="4" fill={p.zoneStroke} />
      <circle cx="66"  cy="264" r="11" fill={p.zoneFill} stroke={p.zoneStroke} strokeWidth="2" />
      <circle cx="174" cy="264" r="11" fill={p.zoneFill} stroke={p.zoneStroke} strokeWidth="2" />
      <circle cx="66"  cy="264" r="4"  fill={p.zoneStroke} />
      <circle cx="174" cy="264" r="4"  fill={p.zoneStroke} />
    </g>
  ),
  daypack: (p) => (
    <g>
      <rect x="54" y="68" width="132" height="178" rx="22" fill={p.bagFill} stroke={p.zoneStroke} strokeWidth="1.5" />
      <rect x="70" y="202" width="100" height="44" rx="8" fill={p.zoneFill} stroke={p.zoneStroke} strokeWidth="1.5" />
      <line x1="78" y1="224" x2="162" y2="224" stroke={p.zoneStroke} strokeWidth="1.5" strokeDasharray="4,3" />
      <circle cx="120" cy="203" r="4" fill={p.zoneStroke} />
      <path d="M 72 68 Q 55 14 85 10 Q 110 8 110 68"
        fill="none" stroke={p.labelColor} strokeWidth="11" strokeLinecap="round" />
      <path d="M 130 68 Q 130 8 155 10 Q 185 14 168 68"
        fill="none" stroke={p.labelColor} strokeWidth="11" strokeLinecap="round" />
      <rect x="105" y="64" width="30" height="10" rx="4" fill={p.zoneStroke} />
      <line x1="72" y1="145" x2="168" y2="145" stroke={p.zoneStroke} strokeWidth="3" strokeLinecap="round" opacity="0.4" />
    </g>
  ),
};

function GenericBag({ bagType, zoneMap = {}, packed = {}, activeSkin = 'tactical', onZoneHover, onZoneClick, hoveredZone: hoveredZoneProp, highlightedZone }) {
  const [internalHover, setInternalHover] = useState(null);
  const hoveredZone = hoveredZoneProp ?? internalHover;
  const [isHovered, setIsHovered] = useState(false);

  function enter(z) { setInternalHover(z); onZoneHover?.(z); }
  function leave()  { setInternalHover(null); onZoneHover?.(null); }

  const skin = SKINS[activeSkin] ?? SKINS.tactical;
  const accentColor = (ILLUS_PALETTE[activeSkin] ?? ILLUS_PALETTE.tactical).accent;
  const illusProps = {
    bagFill:    skin.bagFill,
    zoneFill:   skin.zoneFill,
    zoneStroke: skin.zoneStroke,
    labelColor: skin.labelColor,
  };

  const Illustration = NON_BACKPACK_ILLUSTRATIONS[bagType.id];
  if (!Illustration) return null;
  const AnimLayer = BAG_ANIM_LAYER[bagType.id];

  const filterValue = isHovered
    ? `drop-shadow(0 12px 28px rgba(0,0,0,0.7)) drop-shadow(0 0 20px ${accentColor}AA)`
    : 'drop-shadow(0 12px 28px rgba(0,0,0,0.7))';

  return (
    <>
      <style>{`
        @keyframes gbag-bob {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-6px); }
        }
        .gbag-illustration {
          animation: gbag-bob 3.2s ease-in-out infinite;
          transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .gbag-svg:hover .gbag-illustration {
          animation-play-state: paused;
          transform: translateY(-8px) scale(1.03);
        }
      `}</style>
      <svg
        viewBox="0 0 240 310"
        className="w-full h-full gbag-svg"
        style={{ maxHeight: 380, filter: filterValue, transition: 'filter 0.25s' }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <defs>
          <filter id="zone-glow" x="-8%" y="-8%" width="116%" height="116%">
            <feGaussianBlur stdDeviation="3" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        <g className="gbag-illustration">
          <Illustration {...illusProps} />
          {AnimLayer && (
            <AnimLayer
              hoveredZone={hoveredZone}
              highlightedZone={highlightedZone}
              accentColor={accentColor}
            />
          )}
        </g>

        {/* Zone overlays */}
        {Object.entries(bagType.hitAreas ?? {}).map(([zoneId, { x, y, w, h }]) => {
          const zoneItems   = zoneMap[zoneId] ?? [];
          const packedN     = zoneItems.filter(item => packed[item.id]).length;
          const badge       = bagType.badgePos?.[zoneId];
          const isHover     = hoveredZone === zoneId;
          const isHighlight = highlightedZone === zoneId;
          return (
            <g key={zoneId}>
              <rect
                x={x} y={y} width={w} height={h} rx="8"
                fill={isHover ? `${accentColor}28` : `${accentColor}08`}
                stroke={accentColor}
                strokeWidth={isHover ? 1.8 : 1}
                strokeOpacity={isHover ? 1 : (isHighlight ? 0.9 : 0.45)}
                filter={isHover ? 'url(#zone-glow)' : undefined}
                style={{ cursor: 'pointer', transition: 'all 0.18s' }}
                onClick={() => onZoneClick?.(zoneId)}
                onMouseEnter={() => enter(zoneId)}
                onMouseLeave={leave}
              />
              <text
                x={x + w / 2} y={y + h / 2}
                textAnchor="middle" dominantBaseline="middle"
                fill={isHover ? accentColor : `${accentColor}80`}
                fontSize="7" fontFamily="JetBrains Mono, monospace"
                letterSpacing="0.12em"
                style={{ pointerEvents: 'none', userSelect: 'none', transition: 'fill 0.18s' }}
              >
                {zoneId.replace(/_/g, ' ').toUpperCase()}
              </text>
              {zoneItems.length > 0 && badge && (
                <g style={{ pointerEvents: 'none' }}>
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
        })}
      </svg>
    </>
  );
}
