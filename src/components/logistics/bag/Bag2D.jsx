// src/components/logistics/bag/Bag2D.jsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import { SKINS } from './bagSkins';

// Zone → clickable region over the illustration (not the whole bag, specific areas)
const ZONE_HIT_AREAS = {
  top_lid:      { x: 25,  y: 52,  w: 190, h: 62  },
  main:         { x: 22,  y: 114, w: 196, h: 106 },
  front_pocket: { x: 50,  y: 128, w: 140, h: 102 },
  hip_belt:     { x: 8,   y: 264, w: 224, h: 34  },
  side_pocket:  { x: 192, y: 86,  w: 34,  h: 112 },
};

// Count badge positions (corners of each zone)
const BADGE_POS = {
  top_lid:      { x: 204, y: 62  },
  main:         { x: 204, y: 124 },
  front_pocket: { x: 179, y: 137 },
  hip_belt:     { x: 222, y: 273 },
  side_pocket:  { x: 218, y: 96  },
};

export default function Bag2D({ zoneMap, packed, activeSkin = 'tactical', onZoneHover }) {
  const [hoveredZone, setHoveredZone] = useState(null);
  const skin = SKINS[activeSkin];

  function enter(z) { setHoveredZone(z); onZoneHover?.(z); }
  function leave()  { setHoveredZone(null); onZoneHover?.(null); }

  // Per-skin palette for the illustration
  const p = ILLUS_PALETTE[activeSkin] ?? ILLUS_PALETTE.tactical;

  return (
    <svg
      viewBox="0 0 240 310"
      className="w-full h-full"
      style={{ maxHeight: 380, filter: 'drop-shadow(0 12px 28px rgba(0,0,0,0.7))' }}
    >
      <defs>
        {/* ── Canvas body gradient — lit from upper-right ── */}
        <radialGradient id={`cg-${activeSkin}`} cx="72%" cy="18%" r="90%">
          <stop offset="0%"   stopColor={p.canvasHi}  />
          <stop offset="45%"  stopColor={p.canvasMid} />
          <stop offset="100%" stopColor={p.canvasSh}  />
        </radialGradient>

        {/* ── Pocket gradient — slightly darker, own light source ── */}
        <radialGradient id={`pg-${activeSkin}`} cx="65%" cy="25%" r="80%">
          <stop offset="0%"   stopColor={p.pocketHi}  />
          <stop offset="100%" stopColor={p.pocketSh}  />
        </radialGradient>

        {/* ── Leather gradient ── */}
        <radialGradient id={`lg-${activeSkin}`} cx="55%" cy="28%" r="75%">
          <stop offset="0%"   stopColor={p.leatherHi} />
          <stop offset="55%"  stopColor={p.leatherMid}/>
          <stop offset="100%" stopColor={p.leatherSh} />
        </radialGradient>

        {/* ── Buckle / brass gradient ── */}
        <linearGradient id={`bg-${activeSkin}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor={p.buckleHi}  />
          <stop offset="50%"  stopColor={p.buckleMid} />
          <stop offset="100%" stopColor={p.buckleSh}  />
        </linearGradient>

        {/* ── Canvas weave texture ── */}
        <filter id={`tex-${activeSkin}`} x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85 0.65"
            numOctaves="4" seed={p.texSeed} result="noise"/>
          <feColorMatrix type="matrix" in="noise" result="grayNoise"
            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.18 0"/>
          <feBlend in="SourceGraphic" in2="grayNoise" mode="multiply"/>
        </filter>

        {/* ── Leather grain texture ── */}
        <filter id={`ltex-${activeSkin}`} x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.35 0.25"
            numOctaves="3" seed={p.texSeed + 3} result="noise"/>
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

        {/* ── Glow for hover zones ── */}
        <filter id="zone-glow" x="-8%" y="-8%" width="116%" height="116%">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>

        {/* Clip the whole bag */}
        <clipPath id="bag-body-clip">
          <rect x="22" y="52" width="196" height="246" rx="16"/>
        </clipPath>

        {/* ── Zipper glow filter (draw-on animation) ── */}
        <filter id="zipper-glow" x="-5%" y="-30%" width="110%" height="160%">
          <feGaussianBlur stdDeviation="1.5" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>

        {/* ── Clip-path expand for main zone — grows from midline y=167 ── */}
        <clipPath id="clip-expand-main">
          <rect
            x={22} width={196} rx={8}
            y={hoveredZone === 'main' ? 114 : 167}
            height={hoveredZone === 'main' ? 106 : 0}
            style={{ transition: 'y 0.45s cubic-bezier(0.4,0,0.2,1), height 0.45s cubic-bezier(0.4,0,0.2,1)' }}
          />
        </clipPath>

        {/* ── Clip-path expand for hip_belt — grows from midline y=281 ── */}
        <clipPath id="clip-expand-hip">
          <rect
            x={8} width={224} rx={8}
            y={hoveredZone === 'hip_belt' ? 264 : 281}
            height={hoveredZone === 'hip_belt' ? 34 : 0}
            style={{ transition: 'y 0.4s cubic-bezier(0.4,0,0.2,1), height 0.4s cubic-bezier(0.4,0,0.2,1)' }}
          />
        </clipPath>

        {/* ── Clip for top_lid split-flap bounds ── */}
        <clipPath id="clip-lid-zone">
          <rect x={25} y={52} width={190} height={62} rx={12}/>
        </clipPath>
      </defs>

      {/* ══ GROUND SHADOW ══ */}
      <ellipse cx="120" cy="302" rx="85" ry="7"
        fill="rgba(0,0,0,0.55)"
        style={{ filter: 'blur(5px)' }}/>

      {/* ══ HIP BELT — behind main bag for depth ══ */}
      <rect x="8" y="264" width="224" height="34" rx="10"
        fill={`url(#lg-${activeSkin})`} filter={`url(#ltex-${activeSkin})`}/>
      {/* Hip belt stitching line */}
      <line x1="16" y1="276" x2="224" y2="276"
        stroke={p.stitch} strokeWidth="0.8" strokeDasharray="5,3" opacity="0.6"/>
      {/* Hip belt buckles */}
      {[52, 170].map((x, i) => <BuckleRect key={i} x={x} y={272} skin={activeSkin} p={p}/>)}

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
        fill={p.canvasHi} opacity="0.18"/>

      {/* ══ TOP LID / FLAP (leather) ══ */}
      <rect x="25" y="52" width="190" height="62" rx="14"
        fill={`url(#lg-${activeSkin})`}
        filter={`url(#ltex-${activeSkin})`}
        style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))' }}/>
      {/* Leather flap highlight edge */}
      <path d="M39,52 Q120,44 201,52" fill="none"
        stroke={p.leatherHi} strokeWidth="1.2" opacity="0.5"/>
      {/* Lid stitching */}
      <rect x="30" y="103" width="180" height="0" rx="0"
        fill="none" stroke={p.stitch} strokeWidth="0.8"
        strokeDasharray="6,4" opacity="0.7"/>
      <line x1="30" y1="105" x2="210" y2="105"
        stroke={p.stitch} strokeWidth="0.8" strokeDasharray="6,4" opacity="0.5"/>

      {/* Lid compression strap */}
      <rect x="95" y="74" width="50" height="11" rx="3"
        fill={`url(#lg-${activeSkin})`} filter={`url(#ltex-${activeSkin})`}/>
      <rect x="95" y="74" width="50" height="11" rx="3"
        fill="none" stroke={p.buckleMid} strokeWidth="0.7" opacity="0.6"/>
      {/* Strap buckle center */}
      <BuckleRect x={116} y={77} skin={activeSkin} p={p} w={8} h={5}/>

      {/* ══ SHOULDER STRAP STUBS (visible at top) ══ */}
      {[52, 165].map((x, i) => (
        <g key={i}>
          <path d={`M${x},52 C${x+(i===0?-6:6)},30 ${x+(i===0?-4:4)},20 ${x+(i===0?-2:2)},14`}
            stroke={`url(#lg-${activeSkin})`}
            strokeWidth="10" fill="none" strokeLinecap="round"
            filter={`url(#ltex-${activeSkin})`}/>
          <path d={`M${x},52 C${x+(i===0?-6:6)},30 ${x+(i===0?-4:4)},20 ${x+(i===0?-2:2)},14`}
            stroke={p.leatherHi} strokeWidth="1" fill="none" opacity="0.2"/>
        </g>
      ))}

      {/* ══ TOP CARRY HANDLE ══ */}
      <path d="M97,28 Q120,12 143,28"
        stroke={`url(#lg-${activeSkin})`}
        strokeWidth="9" fill="none" strokeLinecap="round"/>
      <path d="M97,28 Q120,12 143,28"
        stroke={p.leatherHi} strokeWidth="1.5" fill="none" opacity="0.3"/>
      {/* Handle attachment rings */}
      {[97, 143].map((x, i) => (
        <ellipse key={i} cx={x} cy="32" rx="5" ry="4"
          fill={`url(#bg-${activeSkin})`} stroke={p.buckleSh} strokeWidth="0.5"/>
      ))}

      {/* ══ BODY LID BUCKLES ══ */}
      <g>
        <BuckleRect x={74}  y={80} skin={activeSkin} p={p}/>
        <BuckleRect x={152} y={80} skin={activeSkin} p={p}/>
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
        stroke={p.buckleMid} strokeWidth="1.2" strokeDasharray="3,2" opacity="0.8"/>
      <ellipse cx="208" cy="94" rx="3.5" ry="3"
        fill={`url(#bg-${activeSkin})`}/>
      {/* Side pocket stitch edge */}
      <rect x="194" y="88" width="28" height="108" rx="6"
        fill="none" stroke={p.stitch} strokeWidth="0.7" strokeDasharray="4,3" opacity="0.5"/>

      {/* ══ COMPRESSION STRAP (right side) ══ */}
      <rect x="182" y="116" width="12" height="62" rx="3"
        fill={`url(#lg-${activeSkin})`} filter={`url(#ltex-${activeSkin})`}/>
      <BuckleRect x={184} y={144} skin={activeSkin} p={p} w={8} h={5}/>

      {/* ══ FRONT POCKET ══ */}
      <rect x="50" y="128" width="140" height="102" rx="10"
        fill={`url(#pg-${activeSkin})`}
        filter={`url(#tex-${activeSkin})`}
        style={{ filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.5))' }}/>
      {/* Pocket highlight edge top */}
      <path d="M60,128 Q120,121 180,128"
        fill="none" stroke={p.canvasHi} strokeWidth="1" opacity="0.2"/>
      {/* Pocket zipper rail */}
      <rect x="50" y="148" width="140" height="5" rx="2"
        fill={p.leatherSh}/>
      <line x1="55" y1="150" x2="185" y2="150"
        stroke={p.buckleMid} strokeWidth="1.2" strokeDasharray="4,3" opacity="0.9"/>
      {/* Zipper pull */}
      <rect x="113" y="146" width="14" height="9" rx="2"
        fill={`url(#bg-${activeSkin})`} stroke={p.buckleSh} strokeWidth="0.6"/>
      {/* Pocket stitching border */}
      <rect x="54" y="132" width="132" height="94" rx="8"
        fill="none" stroke={p.stitch} strokeWidth="0.8" strokeDasharray="5,3" opacity="0.55"/>
      {/* Pocket leather bottom trim */}
      <rect x="50" y="220" width="140" height="10" rx="0 0 10 10"
        fill={`url(#lg-${activeSkin})`} filter={`url(#ltex-${activeSkin})`}
        style={{ borderRadius: '0 0 10px 10px' }}/>

      {/* ══ BODY STITCHING (vertical panels) ══ */}
      <line x1="120" y1="114" x2="120" y2="260"
        stroke={p.stitch} strokeWidth="0.6" strokeDasharray="6,4" opacity="0.3"/>

      {/* ══ ZONE HOVER OVERLAYS (on top, semi-transparent) ══ */}
      {Object.entries(ZONE_HIT_AREAS).map(([zone, z]) => {
        const isHov = hoveredZone === zone;
        const items = zoneMap[zone] ?? [];
        const packedCount = items.filter(it => packed[it.id]).length;
        const badge = BADGE_POS[zone];
        return (
          <g key={zone}>
            {/* Base hit-area rect — always present for hover detection */}
            <rect
              x={z.x} y={z.y} width={z.w} height={z.h} rx="8"
              fill={isHov ? `${p.accent}28` : `${p.accent}08`}
              stroke={p.accent}
              strokeWidth={isHov ? 1.8 : 1}
              strokeOpacity={isHov ? 1 : 0.55}
              filter={isHov ? 'url(#zone-glow)' : undefined}
              onMouseEnter={() => enter(zone)}
              onMouseLeave={leave}
              style={{ cursor: 'pointer', transition: 'all 0.15s' }}
            />

            {/* ── ANIMATION B: Clip-path expand — main + hip_belt ── */}
            {(zone === 'main' || zone === 'hip_belt') && (
              <rect
                x={z.x} y={z.y} width={z.w} height={z.h} rx={8}
                fill={`${p.accent}22`}
                clipPath={zone === 'main' ? 'url(#clip-expand-main)' : 'url(#clip-expand-hip)'}
                style={{ pointerEvents: 'none' }}
              />
            )}

            {/* ── ANIMATION A: Draw-on zipper — front_pocket (horizontal) ── */}
            {zone === 'front_pocket' && (
              <g style={{ pointerEvents: 'none' }}>
                <line
                  x1={55} y1={150} x2={185} y2={150}
                  stroke={p.accent} strokeWidth={2} strokeLinecap="round"
                  filter="url(#zipper-glow)"
                  strokeDasharray={130}
                  strokeDashoffset={isHov ? 0 : 130}
                  style={{ transition: 'stroke-dashoffset 0.55s cubic-bezier(0.4,0,0.2,1)' }}
                />
                <line
                  x1={55} y1={148} x2={185} y2={148}
                  stroke={p.accent} strokeWidth={1.2} strokeOpacity={0.5}
                  strokeDasharray="5 4"
                  strokeDashoffset={isHov ? 0 : 130}
                  style={{ transition: 'stroke-dashoffset 0.55s cubic-bezier(0.4,0,0.2,1) 0.04s' }}
                />
                <line
                  x1={55} y1={152} x2={185} y2={152}
                  stroke={p.accent} strokeWidth={1.2} strokeOpacity={0.5}
                  strokeDasharray="5 4"
                  strokeDashoffset={isHov ? 0 : 130}
                  style={{ transition: 'stroke-dashoffset 0.55s cubic-bezier(0.4,0,0.2,1) 0.06s' }}
                />
                <circle
                  cx={isHov ? 187 : 55} cy={150} r={3.5}
                  fill={p.accent}
                  opacity={isHov ? 1 : 0}
                  style={{ transition: 'cx 0.55s cubic-bezier(0.4,0,0.2,1), opacity 0.2s' }}
                />
              </g>
            )}

            {/* ── ANIMATION A: Draw-on zipper — side_pocket (vertical) ── */}
            {zone === 'side_pocket' && (
              <g style={{ pointerEvents: 'none' }}>
                <line
                  x1={208} y1={92} x2={208} y2={192}
                  stroke={p.accent} strokeWidth={2} strokeLinecap="round"
                  filter="url(#zipper-glow)"
                  strokeDasharray={100}
                  strokeDashoffset={isHov ? 0 : 100}
                  style={{ transition: 'stroke-dashoffset 0.5s cubic-bezier(0.4,0,0.2,1)' }}
                />
                <line
                  x1={206} y1={92} x2={206} y2={192}
                  stroke={p.accent} strokeWidth={1} strokeOpacity={0.45}
                  strokeDasharray="4 4"
                  strokeDashoffset={isHov ? 0 : 100}
                  style={{ transition: 'stroke-dashoffset 0.5s cubic-bezier(0.4,0,0.2,1) 0.04s' }}
                />
                <line
                  x1={210} y1={92} x2={210} y2={192}
                  stroke={p.accent} strokeWidth={1} strokeOpacity={0.45}
                  strokeDasharray="4 4"
                  strokeDashoffset={isHov ? 0 : 100}
                  style={{ transition: 'stroke-dashoffset 0.5s cubic-bezier(0.4,0,0.2,1) 0.06s' }}
                />
                <circle
                  cx={208} cy={isHov ? 194 : 92} r={3}
                  fill={p.accent}
                  opacity={isHov ? 1 : 0}
                  style={{ transition: 'cy 0.5s cubic-bezier(0.4,0,0.2,1), opacity 0.2s' }}
                />
              </g>
            )}

            {/* ── ANIMATION C: Split-flap reveal — top_lid ── */}
            {zone === 'top_lid' && (
              <g clipPath="url(#clip-lid-zone)" style={{ pointerEvents: 'none' }}>
                {/* Interior accent fill revealed beneath the flaps */}
                <rect x={25} y={52} width={190} height={62} rx={12} fill={`${p.accent}18`}/>
                {/* Top flap half — slides up */}
                <rect
                  x={25} y={52} width={190} height={31} rx={12}
                  fill={`url(#lg-${activeSkin})`}
                  style={{
                    transform: `translateY(${isHov ? -32 : 0}px)`,
                    transition: 'transform 0.42s cubic-bezier(0.4,0,0.2,1)',
                  }}
                />
                {/* Bottom flap half — slides down */}
                <rect
                  x={25} y={83} width={190} height={31} rx={0}
                  fill={`url(#lg-${activeSkin})`}
                  style={{
                    transform: `translateY(${isHov ? 32 : 0}px)`,
                    transition: 'transform 0.42s cubic-bezier(0.4,0,0.2,1)',
                  }}
                />
                {/* Center seam glow */}
                <line
                  x1={30} y1={83} x2={210} y2={83}
                  stroke={p.accent} strokeWidth={1.5}
                  strokeOpacity={isHov ? 1 : 0}
                  style={{ transition: 'stroke-opacity 0.2s 0.18s' }}
                />
                {/* Zipper tooth dots along seam */}
                {isHov && Array.from({ length: 14 }, (_, i) => (
                  <circle key={i} cx={35 + i * 12} cy={83} r={2} fill={p.accent} opacity={0.6}/>
                ))}
              </g>
            )}

            {/* Zone label */}
            <text
              x={z.x + z.w / 2} y={z.y + z.h / 2}
              textAnchor="middle" dominantBaseline="middle"
              fill={isHov ? p.accent : `${p.accent}80`}
              fontSize="7" fontFamily="JetBrains Mono, monospace"
              letterSpacing="0.12em"
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {zone.replace(/_/g, ' ').toUpperCase()}
            </text>

            {/* Count badge */}
            {items.length > 0 && (
              <g>
                <rect x={badge.x - 14} y={badge.y - 8} width={28} height={14} rx={4}
                  fill="rgba(8,10,12,0.82)"
                  stroke={isHov ? p.accent : 'rgba(255,255,255,0.12)'}
                  strokeWidth="0.8"/>
                <text x={badge.x} y={badge.y + 2}
                  textAnchor="middle" dominantBaseline="middle"
                  fill={isHov ? p.accent : 'rgba(200,180,140,0.7)'}
                  fontSize="6.5" fontFamily="JetBrains Mono, monospace"
                  letterSpacing="0.04em">
                  {packedCount}/{items.length}
                </text>
              </g>
            )}
          </g>
        );
      })}

      {/* ══ HIGHLIGHT SHEEN (top-right specular) ══ */}
      <ellipse cx="185" cy="72" rx="28" ry="16"
        fill="rgba(255,255,255,0.06)" transform="rotate(-20, 185, 72)"/>
    </svg>
  );
}

// Small hardware buckle primitive
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

// Per-skin illustration palette — all the colors needed to render the bag
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
