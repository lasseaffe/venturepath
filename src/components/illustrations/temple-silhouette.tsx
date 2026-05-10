interface TempleProps {
  variant?: "salt-lake" | "dc" | "provo";
  className?: string;
  height?: number;
}

export function TempleSilhouette({ variant = "salt-lake", className = "", height = 220 }: TempleProps) {
  if (variant === "salt-lake") return <SaltLakeTemple className={className} height={height} />;
  if (variant === "dc") return <DCTemple className={className} height={height} />;
  return <ProvoTemple className={className} height={height} />;
}

function SaltLakeTemple({ className, height }: { className: string; height: number }) {
  return (
    <svg
      viewBox="0 0 560 320"
      height={height}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Salt Lake Temple"
    >
      {/* Temple body */}
      <rect x="40" y="210" width="480" height="100" rx="2" fill="currentColor" opacity="0.9" />

      {/* — WEST (left) spires — */}
      {/* West tall spire */}
      <polygon points="68,210 92,210 80,70" fill="currentColor" />
      <polygon points="76,72 84,72 80,55" fill="currentColor" opacity="0.7" />
      {/* West medium spire */}
      <polygon points="110,210 128,210 119,110" fill="currentColor" opacity="0.95" />
      <polygon points="115,112 123,112 119,98" fill="currentColor" opacity="0.7" />
      {/* West short spire */}
      <polygon points="142,210 158,210 150,148" fill="currentColor" opacity="0.9" />
      <polygon points="146,150 154,150 150,138" fill="currentColor" opacity="0.65" />

      {/* — EAST (right) spires — */}
      {/* East short spire */}
      <polygon points="402,210 418,210 410,148" fill="currentColor" opacity="0.9" />
      <polygon points="406,150 414,150 410,138" fill="currentColor" opacity="0.65" />
      {/* East medium spire */}
      <polygon points="432,210 450,210 441,110" fill="currentColor" opacity="0.95" />
      <polygon points="437,112 445,112 441,98" fill="currentColor" opacity="0.7" />
      {/* East tall spire (with Angel Moroni) */}
      <polygon points="468,210 492,210 480,60" fill="currentColor" />
      <polygon points="476,62 484,62 480,45" fill="currentColor" opacity="0.7" />
      {/* Angel Moroni */}
      <circle cx="480" cy="40" r="5" fill="currentColor" opacity="0.8" />
      <line x1="480" y1="35" x2="480" y2="28" stroke="currentColor" strokeWidth="2" opacity="0.9" />
      <polygon points="476,28 484,28 480,22" fill="currentColor" opacity="0.9" />

      {/* Connector walls between spires */}
      <rect x="92" y="190" width="18" height="20" fill="currentColor" opacity="0.5" />
      <rect x="128" y="200" width="14" height="10" fill="currentColor" opacity="0.5" />
      <rect x="418" y="200" width="14" height="10" fill="currentColor" opacity="0.5" />
      <rect x="450" y="190" width="18" height="20" fill="currentColor" opacity="0.5" />

      {/* Decorative battlements on body */}
      {[60, 100, 140, 190, 240, 290, 340, 390, 420, 460].map((x, i) => (
        <rect key={i} x={x} y="203" width="10" height="8" fill="currentColor" opacity="0.4" />
      ))}

      {/* Arched windows */}
      {[90, 150, 220, 290, 360, 420].map((x, i) => (
        <g key={i}>
          <rect x={x} y="232" width="16" height="28" rx="8" fill="currentColor" opacity="0.2" />
          <rect x={x} y="242" width="16" height="20" fill="currentColor" opacity="0.15" />
        </g>
      ))}

      {/* Earth / Moon / Sun symbols on walls (LDS temple motifs) */}
      <circle cx="200" cy="225" r="8" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
      <circle cx="280" cy="225" r="8" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
      <circle cx="360" cy="225" r="8" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />

      {/* Base / ground line */}
      <rect x="20" y="308" width="520" height="4" rx="2" fill="currentColor" opacity="0.2" />

      {/* Reflection / shadow */}
      <rect x="40" y="312" width="480" height="6" rx="3" fill="currentColor" opacity="0.08" />
    </svg>
  );
}

function DCTemple({ className, height }: { className: string; height: number }) {
  return (
    <svg
      viewBox="0 0 400 300"
      height={height}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Washington D.C. Temple"
    >
      {/* Main body */}
      <rect x="60" y="210" width="280" height="80" rx="2" fill="currentColor" opacity="0.88" />

      {/* Stepped lower towers (2 pairs) */}
      <rect x="70" y="190" width="40" height="22" rx="1" fill="currentColor" opacity="0.75" />
      <rect x="290" y="190" width="40" height="22" rx="1" fill="currentColor" opacity="0.75" />
      <rect x="80" y="175" width="28" height="16" rx="1" fill="currentColor" opacity="0.65" />
      <rect x="292" y="175" width="28" height="16" rx="1" fill="currentColor" opacity="0.65" />

      {/* Secondary spires */}
      <polygon points="84,175 104,175 94,120" fill="currentColor" opacity="0.85" />
      <polygon points="296,175 316,175 306,120" fill="currentColor" opacity="0.85" />
      <polygon points="88,122 100,122 94,108" fill="currentColor" opacity="0.6" />
      <polygon points="300,122 312,122 306,108" fill="currentColor" opacity="0.6" />

      {/* Tall center spire (distinctive feature of DC Temple) */}
      <rect x="170" y="160" width="60" height="52" rx="1" fill="currentColor" opacity="0.9" />
      <polygon points="162,162 238,162 200,30" fill="currentColor" />
      <polygon points="190,32 210,32 200,14" fill="currentColor" opacity="0.7" />
      {/* Angel Moroni */}
      <circle cx="200" cy="10" r="5" fill="currentColor" opacity="0.85" />
      <line x1="200" y1="5" x2="200" y2="0" stroke="currentColor" strokeWidth="2" opacity="0.9" />

      {/* Windows */}
      {[80, 140, 200, 260, 310].map((x, i) => (
        <rect key={i} x={x} y="228" width="14" height="22" rx="7" fill="currentColor" opacity="0.18" />
      ))}

      {/* Ground line */}
      <rect x="40" y="290" width="320" height="3" rx="1.5" fill="currentColor" opacity="0.18" />
    </svg>
  );
}

function ProvoTemple({ className, height }: { className: string; height: number }) {
  return (
    <svg
      viewBox="0 0 360 280"
      height={height}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Provo Utah Temple"
    >
      {/* Modern rectangular body (Provo is modernist) */}
      <rect x="50" y="180" width="260" height="90" rx="3" fill="currentColor" opacity="0.88" />
      {/* Upper step */}
      <rect x="90" y="155" width="180" height="30" rx="2" fill="currentColor" opacity="0.82" />
      {/* Upper step 2 */}
      <rect x="130" y="130" width="100" height="30" rx="2" fill="currentColor" opacity="0.78" />

      {/* Slender center spire (Provo's distinctive spire) */}
      <rect x="162" y="80" width="36" height="55" rx="1" fill="currentColor" opacity="0.92" />
      <polygon points="158,82 202,82 180,20" fill="currentColor" />
      <polygon points="173,22 187,22 180,8" fill="currentColor" opacity="0.7" />
      {/* Angel Moroni */}
      <circle cx="180" cy="4" r="4" fill="currentColor" opacity="0.85" />

      {/* Horizontal decorative bands */}
      <rect x="50" y="200" width="260" height="3" fill="currentColor" opacity="0.15" />
      <rect x="50" y="220" width="260" height="3" fill="currentColor" opacity="0.12" />

      {/* Windows */}
      {[70, 120, 180, 220, 270].map((x, i) => (
        <rect key={i} x={x} y="195" width="12" height="20" rx="6" fill="currentColor" opacity="0.18" />
      ))}

      {/* Ground */}
      <rect x="30" y="272" width="300" height="3" rx="1.5" fill="currentColor" opacity="0.15" />
    </svg>
  );
}
