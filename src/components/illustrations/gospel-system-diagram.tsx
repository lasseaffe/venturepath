"use client";

/**
 * Gospel System Diagram — HolyFlex
 *
 * Instructional-diagram-style SVG illustration collection.
 * Three panels, one canvas: Ecosystem zones, Talk Prep flow, CFM cycle.
 * Visual language: clinical annotation, color-coded zones, systematic markers.
 * Palette: deep-indigo / gold / lavender — matches HolyFlex globals.css tokens.
 */

interface GospelSystemDiagramProps {
  className?: string;
  width?: number | string;
}

// ─── Palette ────────────────────────────────────────────────────────────────
const P = {
  indigo:     "#2D1B69",
  indigoDeep: "#1A0D4A",
  indigoMid:  "#4A2D8A",
  gold:       "#D4AF37",
  goldLight:  "#F0D060",
  lavender:   "#8B7EC0",
  lavLight:   "#DDD5F0",
  cream:      "#FDFAF5",
  creamWarm:  "#FEFCF8",
  green:      "#4A7A4A",
  amber:      "#C87A50",
  blue:       "#5A7A9A",
  rose:       "#B05A8A",
  muted:      "#6B5FA0",
  border:     "#C8BEE8",
  text:       "#1A0D4A",
  textLight:  "#8B7EC0",
} as const;

const n = (v: number) => Math.round(v * 1e4) / 1e4;

// ─── Shared annotation helpers ───────────────────────────────────────────────

function Label({
  x, y, text, anchor = "middle", size = 9, color = P.text, weight = "normal",
}: {
  x: number; y: number; text: string;
  anchor?: "start" | "middle" | "end";
  size?: number; color?: string; weight?: string;
}) {
  return (
    <text
      x={x} y={y}
      textAnchor={anchor}
      fontSize={size}
      fill={color}
      fontWeight={weight}
      fontFamily="'Georgia', serif"
      letterSpacing="0.02em"
    >
      {text}
    </text>
  );
}

function TinyLabel({
  x, y, text, anchor = "middle", color = P.textLight,
}: {
  x: number; y: number; text: string; anchor?: "start" | "middle" | "end"; color?: string;
}) {
  return (
    <text
      x={x} y={y}
      textAnchor={anchor}
      fontSize={7}
      fill={color}
      fontFamily="'Courier New', monospace"
      letterSpacing="0.06em"
    >
      {text}
    </text>
  );
}

function LeaderLine({
  x1, y1, x2, y2, color = P.border,
}: {
  x1: number; y1: number; x2: number; y2: number; color?: string;
}) {
  return (
    <line
      x1={x1} y1={y1} x2={x2} y2={y2}
      stroke={color}
      strokeWidth={0.75}
      strokeDasharray="3,2"
    />
  );
}

function DiagramBadge({
  x, y, label, color = P.indigo,
}: {
  x: number; y: number; label: string; color?: string;
}) {
  return (
    <g>
      <rect
        x={x} y={y - 8} width={50} height={12}
        rx={2}
        fill={color}
        opacity={0.9}
      />
      <text
        x={x + 25} y={y + 1}
        textAnchor="middle"
        fontSize={6.5}
        fill="white"
        fontFamily="'Courier New', monospace"
        letterSpacing="0.1em"
        fontWeight="bold"
      >
        {label}
      </text>
    </g>
  );
}

function SectionRule({
  x, y, w = 180, color = P.lavLight,
}: {
  x: number; y: number; w?: number; color?: string;
}) {
  return <line x1={x} y1={y} x2={x + w} y2={y} stroke={color} strokeWidth={0.5} />;
}

// ─── Panel 1 — Ecosystem Zone Diagram (pie / hub-and-spoke) ─────────────────

function EcosystemZoneDiagram({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  // Six tools, evenly spaced — like a plate diagram with labeled zones
  const tools = [
    { label: "SPEAK",    sublabel: "Talk Generator",    angle: -90,  color: P.green,     fill: "#D5EDD5" },
    { label: "STUDY",    sublabel: "Come Follow Me",    angle: -30,  color: P.amber,     fill: "#FDE8D8" },
    { label: "MISSION",  sublabel: "Prep Hub",          angle:  30,  color: P.blue,      fill: "#DAE8F0" },
    { label: "LEARN",    sublabel: "Roadmap",           angle:  90,  color: "#7A5A3A",   fill: "#F0E8D8" },
    { label: "AGAPÉ",   sublabel: "Reflections",       angle: 150,  color: P.rose,      fill: "#F4DCE8" },
    { label: "COMMUN.",  sublabel: "Communities",       angle: 210,  color: P.indigoMid, fill: "#E0D5F0" },
  ];

  const degToRad = (d: number) => (d * Math.PI) / 180;
  const SLICE = Math.PI * 2 / tools.length;

  return (
    <g>
      {/* Hub circle */}
      <circle cx={cx} cy={cy} r={r + 2} fill="none" stroke={P.border} strokeWidth={0.5} />
      <circle cx={cx} cy={cy} r={r} fill={P.creamWarm} />
      <circle cx={cx} cy={cy} r={r * 0.38} fill={P.indigo} opacity={0.92} />

      {/* Radial dividers */}
      {tools.map((_, i) => {
        const angle = degToRad(i * 60 - 90) - SLICE / 2;
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={n(cx + Math.cos(angle) * r)}
            y2={n(cy + Math.sin(angle) * r)}
            stroke={P.border}
            strokeWidth={0.75}
          />
        );
      })}

      {/* Coloured wedge fills */}
      {tools.map((tool, i) => {
        const startAngle = degToRad(i * 60 - 90) - SLICE / 2;
        const endAngle   = startAngle + SLICE;
        const innerR     = r * 0.38;
        const x1o = n(cx + Math.cos(startAngle) * r);
        const y1o = n(cy + Math.sin(startAngle) * r);
        const x2o = n(cx + Math.cos(endAngle)   * r);
        const y2o = n(cy + Math.sin(endAngle)   * r);
        const x1i = n(cx + Math.cos(startAngle) * innerR);
        const y1i = n(cy + Math.sin(startAngle) * innerR);
        const x2i = n(cx + Math.cos(endAngle)   * innerR);
        const y2i = n(cy + Math.sin(endAngle)   * innerR);
        const d = [
          `M ${x1i} ${y1i}`,
          `L ${x1o} ${y1o}`,
          `A ${r} ${r} 0 0 1 ${x2o} ${y2o}`,
          `L ${x2i} ${y2i}`,
          `A ${innerR} ${innerR} 0 0 0 ${x1i} ${y1i}`,
          "Z",
        ].join(" ");
        return <path key={i} d={d} fill={tool.fill} opacity={0.75} />;
      })}

      {/* Tool labels inside wedges */}
      {tools.map((tool, i) => {
        const midAngle = degToRad(i * 60 - 90);
        const labelR   = r * 0.66;
        const lx = n(cx + Math.cos(midAngle) * labelR);
        const ly = n(cy + Math.sin(midAngle) * labelR);
        return (
          <g key={i}>
            <text
              x={lx} y={ly - 3}
              textAnchor="middle"
              fontSize={6.5}
              fontWeight="bold"
              fill={tool.color}
              fontFamily="'Courier New', monospace"
              letterSpacing="0.1em"
            >
              {tool.label}
            </text>
            <text
              x={lx} y={ly + 6}
              textAnchor="middle"
              fontSize={5.5}
              fill={tool.color}
              fontFamily="'Georgia', serif"
              opacity={0.8}
            >
              {tool.sublabel}
            </text>
          </g>
        );
      })}

      {/* Hub label */}
      <text
        x={cx} y={cy - 5}
        textAnchor="middle"
        fontSize={7}
        fontWeight="bold"
        fill="white"
        fontFamily="'Courier New', monospace"
        letterSpacing="0.12em"
      >
        HOLY
      </text>
      <text
        x={cx} y={cy + 5}
        textAnchor="middle"
        fontSize={7}
        fontWeight="bold"
        fill={P.goldLight}
        fontFamily="'Courier New', monospace"
        letterSpacing="0.12em"
      >
        FLEX
      </text>

      {/* Outer orbit tick marks */}
      {Array.from({ length: 24 }).map((_, i) => {
        const angle = degToRad(i * 15);
        const isMajor = i % 4 === 0;
        return (
          <line
            key={i}
            x1={n(cx + Math.cos(angle) * (r + 4))}
            y1={n(cy + Math.sin(angle) * (r + 4))}
            x2={n(cx + Math.cos(angle) * (r + 4 + (isMajor ? 5 : 3)))}
            y2={n(cy + Math.sin(angle) * (r + 4 + (isMajor ? 5 : 3)))}
            stroke={P.lavender}
            strokeWidth={isMajor ? 1 : 0.5}
          />
        );
      })}
    </g>
  );
}

// ─── Panel 2 — Talk Prep Step-Sequence Diagram ──────────────────────────────

function TalkPrepDiagram({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const steps = [
    { id: "01", label: "Topic\nInput",   color: P.indigo,    fill: "#E8E0F8" },
    { id: "02", label: "Scripture\nSearch",color: P.amber,   fill: "#FDE8D8" },
    { id: "03", label: "Structure\nBuild", color: P.blue,    fill: "#DAE8F0" },
    { id: "04", label: "Draft\nOutput",    color: P.green,   fill: "#D5EDD5" },
  ];

  const boxW = 38;
  const boxH = 30;
  const gap  = (w - steps.length * boxW) / (steps.length + 1);
  const baseY = y + h / 2 - boxH / 2;

  return (
    <g>
      {/* Connector track */}
      <line
        x1={x + gap + boxW}
        y1={y + h / 2}
        x2={x + w - gap}
        y2={y + h / 2}
        stroke={P.border}
        strokeWidth={1.5}
      />

      {steps.map((step, i) => {
        const bx = x + gap + i * (boxW + gap);
        const by = baseY;
        const isLast = i === steps.length - 1;
        const lines = step.label.split("\n");

        return (
          <g key={i}>
            {/* Arrow connector */}
            {!isLast && (
              <polygon
                points={`
                  ${bx + boxW + 4},${y + h / 2 - 4}
                  ${bx + boxW + 4},${y + h / 2 + 4}
                  ${bx + boxW + 10},${y + h / 2}
                `}
                fill={P.lavender}
                opacity={0.5}
              />
            )}
            {/* Step box */}
            <rect
              x={bx} y={by}
              width={boxW} height={boxH}
              rx={3}
              fill={step.fill}
              stroke={step.color}
              strokeWidth={0.75}
            />
            {/* Step number */}
            <text
              x={bx + 5} y={by + 8}
              fontSize={5.5}
              fill={step.color}
              fontFamily="'Courier New', monospace"
              fontWeight="bold"
              letterSpacing="0.05em"
            >
              {step.id}
            </text>
            {/* Step label */}
            {lines.map((line, li) => (
              <text
                key={li}
                x={bx + boxW / 2} y={by + 17 + li * 8}
                textAnchor="middle"
                fontSize={6.5}
                fill={step.color}
                fontFamily="'Georgia', serif"
                fontWeight="bold"
              >
                {line}
              </text>
            ))}
          </g>
        );
      })}

      {/* Time annotation */}
      <LeaderLine x1={x + w / 2} y1={baseY - 6} x2={x + w / 2} y2={baseY - 14} />
      <TinyLabel x={x + w / 2} y={baseY - 16} text="≤ 60 SECONDS" color={P.gold} anchor="middle" />
    </g>
  );
}

// ─── Panel 3 — CFM Weekly Cycle ─────────────────────────────────────────────

function CFMCycleDiagram({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  const phases = [
    { label: "Read",      sub: "Scriptures",  angle: -90,  color: "#5A7A9A" },
    { label: "Discuss",   sub: "With family", angle:  -2,  color: P.green   },
    { label: "Apply",     sub: "This week",   angle:  72,  color: P.amber   },
    { label: "Reflect",   sub: "Journal",     angle: 145,  color: P.rose    },
    { label: "Plan",      sub: "Next lesson", angle: 216,  color: P.indigo  },
  ];

  const degToRad = (d: number) => (d * Math.PI) / 180;

  return (
    <g>
      {/* Dashed orbit ring */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={P.lavLight} strokeWidth={0.75} strokeDasharray="4,3" />
      {/* Inner filled circle */}
      <circle cx={cx} cy={cy} r={r * 0.32} fill={P.lavLight} opacity={0.5} />

      {/* Center */}
      <text
        x={cx} y={cy - 4}
        textAnchor="middle"
        fontSize={6.5}
        fill={P.indigo}
        fontFamily="'Georgia', serif"
        fontWeight="bold"
      >
        CFM
      </text>
      <text
        x={cx} y={cy + 5}
        textAnchor="middle"
        fontSize={5.5}
        fill={P.muted}
        fontFamily="'Courier New', monospace"
        letterSpacing="0.06em"
      >
        WEEKLY
      </text>

      {phases.map((phase, i) => {
        const angle = degToRad(phase.angle);
        const dotR  = r * 0.75;
        const px    = n(cx + Math.cos(angle) * dotR);
        const py    = n(cy + Math.sin(angle) * dotR);
        // Label slightly further out
        const labelR = r * 1.18;
        const lx     = n(cx + Math.cos(angle) * labelR);
        const ly     = n(cy + Math.sin(angle) * labelR);

        // Curved arc connector (abbreviated: just a spoke)
        const innerPt = r * 0.32;
        const ix = n(cx + Math.cos(angle) * innerPt);
        const iy = n(cy + Math.sin(angle) * innerPt);

        return (
          <g key={i}>
            <line
              x1={ix} y1={iy}
              x2={px} y2={py}
              stroke={phase.color}
              strokeWidth={0.75}
              opacity={0.5}
            />
            <circle cx={px} cy={py} r={7} fill={phase.color} opacity={0.15} />
            <circle cx={px} cy={py} r={4} fill={phase.color} opacity={0.8} />
            <text
              x={lx} y={ly - 3}
              textAnchor="middle"
              fontSize={6.5}
              fontWeight="bold"
              fill={phase.color}
              fontFamily="'Courier New', monospace"
              letterSpacing="0.08em"
            >
              {phase.label}
            </text>
            <text
              x={lx} y={ly + 5}
              textAnchor="middle"
              fontSize={5.5}
              fill={phase.color}
              fontFamily="'Georgia', serif"
              opacity={0.8}
            >
              {phase.sub}
            </text>
          </g>
        );
      })}

      {/* Rotation arrow arc  — top quadrant */}
      <path
        d={`M ${cx - 5} ${cy - r * 0.75 - 6} A ${r * 0.82} ${r * 0.82} 0 0 1 ${cx + 5} ${cy - r * 0.75 - 6}`}
        fill="none"
        stroke={P.lavender}
        strokeWidth={1}
        strokeLinecap="round"
      />
      <polygon
        points={`${cx + 5},${cy - r * 0.75 - 6} ${cx + 9},${cy - r * 0.75 - 2} ${cx + 2},${cy - r * 0.75 - 2}`}
        fill={P.lavender}
        opacity={0.7}
      />
    </g>
  );
}

// ─── Main composite diagram ──────────────────────────────────────────────────

export function GospelSystemDiagram({ className = "", width = "100%" }: GospelSystemDiagramProps) {
  // Viewbox: 800 × 320 — three panels side by side
  const VW = 800;
  const VH = 320;

  // Panel column widths
  const PAD = 16;
  const P1W = 270;
  const P2W = 240;
  const P3W = VW - P1W - P2W - PAD * 4;
  const P1X = PAD;
  const P2X = P1X + P1W + PAD;
  const P3X = P2X + P2W + PAD;

  return (
    <svg
      viewBox={`0 0 ${VW} ${VH}`}
      width={width}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="HolyFlex Gospel System Diagram Collection"
      style={{ WebkitFontSmoothing: "antialiased" }}
    >
      {/* Background */}
      <rect width={VW} height={VH} fill={P.creamWarm} />

      {/* Grid of tiny dots — editorial reference texture */}
      <defs>
        <pattern id="hf-dot-grid" x="0" y="0" width="18" height="18" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="0.6" fill={P.lavender} opacity="0.18" />
        </pattern>
      </defs>
      <rect width={VW} height={VH} fill="url(#hf-dot-grid)" />

      {/* ── HEADER BAND ──────────────────────────────────────── */}
      <rect x={0} y={0} width={VW} height={22} fill={P.indigo} />
      <text
        x={VW / 2} y={14}
        textAnchor="middle"
        fontSize={8}
        fill="white"
        fontFamily="'Courier New', monospace"
        letterSpacing="0.25em"
        fontWeight="bold"
      >
        SVG DIAGRAM COLLECTION · HOLYFLEX GOSPEL SYSTEM
      </text>

      {/* ── PANEL RULES ──────────────────────────────────────── */}
      {/* Vertical dividers */}
      <line x1={P2X - PAD / 2} y1={22} x2={P2X - PAD / 2} y2={VH - PAD} stroke={P.lavLight} strokeWidth={0.75} />
      <line x1={P3X - PAD / 2} y1={22} x2={P3X - PAD / 2} y2={VH - PAD} stroke={P.lavLight} strokeWidth={0.75} />

      {/* ── PANEL 1 — ECOSYSTEM ZONES ────────────────────────── */}
      {/* Panel label badge */}
      <DiagramBadge x={P1X} y={36} label="DIAGRAM 1" color={P.indigo} />
      <text
        x={P1X + 54} y={36}
        fontSize={7.5}
        fill={P.text}
        fontFamily="'Georgia', serif"
        fontStyle="italic"
      >
        Ecosystem zones diagram
      </text>
      <SectionRule x={P1X} y={42} w={P1W - 10} />

      {/* Pie diagram */}
      <EcosystemZoneDiagram
        cx={P1X + P1W / 2}
        cy={VH / 2 + 14}
        r={100}
      />

      {/* Legend — bottom strip */}
      {[
        { label: "SPEAK",   color: P.green     },
        { label: "STUDY",   color: P.amber     },
        { label: "MISSION", color: P.blue      },
      ].map((item, i) => (
        <g key={i}>
          <rect x={P1X + 4 + i * 76} y={VH - 26} width={8} height={8} rx={1} fill={item.color} opacity={0.8} />
          <TinyLabel
            x={P1X + 15 + i * 76}
            y={VH - 19}
            text={item.label}
            anchor="start"
            color={item.color}
          />
        </g>
      ))}
      {[
        { label: "LEARN",   color: "#7A5A3A"   },
        { label: "AGAPÉ",  color: P.rose      },
        { label: "COMMUN.", color: P.indigoMid },
      ].map((item, i) => (
        <g key={i}>
          <rect x={P1X + 4 + i * 76} y={VH - 15} width={8} height={8} rx={1} fill={item.color} opacity={0.8} />
          <TinyLabel
            x={P1X + 15 + i * 76}
            y={VH - 8}
            text={item.label}
            anchor="start"
            color={item.color}
          />
        </g>
      ))}

      {/* ── PANEL 2 — TALK PREP SEQUENCE ─────────────────────── */}
      <DiagramBadge x={P2X} y={36} label="DIAGRAM 2" color={P.amber} />
      <text
        x={P2X + 54} y={36}
        fontSize={7.5}
        fill={P.text}
        fontFamily="'Georgia', serif"
        fontStyle="italic"
      >
        3-step talk prep diagram
      </text>
      <SectionRule x={P2X} y={42} w={P2W - 10} />

      {/* Step labels above boxes */}
      {["STEP 1: INPUT", "STEP 2: SEARCH", "STEP 3: BUILD", "STEP 4: OUTPUT"].map((label, i) => {
        const gap  = (P2W - 4 * 38) / 5;
        const bx   = P2X + gap + i * (38 + gap);
        return (
          <TinyLabel
            key={i}
            x={bx + 19}
            y={55}
            text={label}
            anchor="middle"
            color={P.textLight}
          />
        );
      })}

      <TalkPrepDiagram
        x={P2X}
        y={55}
        w={P2W}
        h={VH - 55 - PAD * 3}
      />

      {/* Footer annotation */}
      <text
        x={P2X + P2W / 2} y={VH - 14}
        textAnchor="middle"
        fontSize={6.5}
        fill={P.muted}
        fontFamily="'Georgia', serif"
        fontStyle="italic"
      >
        All four standard works referenced
      </text>
      <SectionRule x={P2X} y={VH - 18} w={P2W - 10} color={P.lavLight} />

      {/* ── PANEL 3 — CFM WEEKLY CYCLE ───────────────────────── */}
      <DiagramBadge x={P3X} y={36} label="DIAGRAM 3" color={P.blue} />
      <text
        x={P3X + 54} y={36}
        fontSize={7.5}
        fill={P.text}
        fontFamily="'Georgia', serif"
        fontStyle="italic"
      >
        CFM weekly cycle
      </text>
      <SectionRule x={P3X} y={42} w={P3W - 10} />

      <CFMCycleDiagram
        cx={P3X + P3W / 2}
        cy={VH / 2 + 16}
        r={85}
      />

      {/* ── FOOTER BAR ───────────────────────────────────────── */}
      <rect x={0} y={VH - 10} width={VW} height={10} fill={P.lavLight} opacity={0.6} />
      <text
        x={PAD} y={VH - 3}
        fontSize={5.5}
        fill={P.textLight}
        fontFamily="'Courier New', monospace"
        letterSpacing="0.08em"
      >
        HOLYFLEX · GOSPEL SYSTEM OVERVIEW · REF: HF-SVG-001
      </text>
      <text
        x={VW - PAD} y={VH - 3}
        textAnchor="end"
        fontSize={5.5}
        fill={P.textLight}
        fontFamily="'Courier New', monospace"
        letterSpacing="0.08em"
      >
        © 2026 HOLYFLEX
      </text>
    </svg>
  );
}
