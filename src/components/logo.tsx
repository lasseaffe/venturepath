import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  iconOnly?: boolean;
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: { icon: 22, text: "text-sm" },
  md: { icon: 28, text: "text-lg" },
  lg: { icon: 36, text: "text-2xl" },
};

export function Logo({ className, iconOnly = false, size = "md" }: LogoProps) {
  const { icon, text } = sizes[size];

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      {/* Beehive / Deseret mark — the iconic LDS symbol of community & industry */}
      <svg
        width={icon}
        height={icon}
        viewBox="0 0 40 44"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Dome body */}
        <path
          d="M20 4 C10 4 5 12 5 20 C5 28 7 34 7 34 L33 34 C33 34 35 28 35 20 C35 12 30 4 20 4 Z"
          fill="#2D1B69"
        />
        {/* Horizontal bands (beehive coils) */}
        <path d="M7.5 28 Q20 25.5 32.5 28" stroke="white" strokeWidth="1" fill="none" opacity="0.45" />
        <path d="M6.5 23 Q20 20 33.5 23" stroke="white" strokeWidth="1" fill="none" opacity="0.45" />
        <path d="M6.5 18 Q20 15 33.5 18" stroke="white" strokeWidth="1" fill="none" opacity="0.45" />
        <path d="M8 13 Q20 10.5 32 13" stroke="white" strokeWidth="1" fill="none" opacity="0.4" />
        {/* Base platform */}
        <rect x="3" y="34" width="34" height="4.5" rx="2.25" fill="#1A1040" />
        {/* Entrance arch */}
        <path d="M15 34 Q20 30 25 34" fill="#1A0D4A" opacity="0.5" />
        {/* Finial dot (gold accent) */}
        <circle cx="20" cy="2.5" r="2.5" fill="#D4AF37" />
        {/* Subtle hexagon texture inside dome */}
        <path
          d="M17 17 L20 15.2 L23 17 L23 20.8 L20 22.6 L17 20.8 Z"
          stroke="white"
          strokeWidth="0.6"
          fill="none"
          opacity="0.2"
        />
      </svg>

      {!iconOnly && (
        <span className={cn("font-semibold tracking-tight", text)} style={{ color: "#2D1B69", letterSpacing: "-0.025em" }}>
          Holy<span style={{ color: "#D4AF37", fontWeight: 300 }}>Flex</span>
        </span>
      )}
    </div>
  );
}
