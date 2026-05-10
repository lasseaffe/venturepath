"use client";

import { useRef, useState, useCallback } from "react";
import { AlertTriangle, X } from "lucide-react";

const ISSUE_TYPES = [
  { value: "faulty_image", label: "Faulty / missing image" },
  { value: "wrong_ingredients", label: "Wrong ingredients" },
  { value: "broken_function", label: "Broken function / interaction" },
  { value: "other", label: "Other problem" },
] as const;

type IssueType = (typeof ISSUE_TYPES)[number]["value"];

export interface SodaCard {
  id: string;
  name: string;
  creator: string;
  ingredients: string[];
  amens: number;
  saves: number;
  gradientFrom: string;
  gradientTo: string;
  description: string;
  /** Original source URL — Instagram Reel or recipe website. Used to auto-fix faulty images. */
  sourceUrl?: string;
}

interface SwipeCardProps {
  card: SodaCard;
  active: boolean;
  zIndex: number;
  stackOffset: number; // visual offset for cards below the top
  onSwipeRight: () => void;
  onSwipeLeft: () => void;
  onAmen: () => void; // double-tap
}

const SWIPE_THRESHOLD = 80;
const DOUBLE_TAP_MS = 300;

export function SwipeCard({ card, active, zIndex, stackOffset, onSwipeRight, onSwipeLeft, onAmen }: SwipeCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const deltaX = useRef(0);
  const lastTap = useRef(0);
  const [drag, setDrag] = useState(0);
  const [flying, setFlying] = useState<"left" | "right" | null>(null);
  const [confetti, setConfetti] = useState<{ x: number; y: number } | null>(null);
  const [localAmens, setLocalAmens] = useState(card.amens);
  const [reportOpen, setReportOpen] = useState(false);
  const [issueType, setIssueType] = useState<IssueType>("faulty_image");
  const [reportDesc, setReportDesc] = useState("");
  const [reportStatus, setReportStatus] = useState<"idle" | "sending" | "done">("idle");

  async function submitReport() {
    setReportStatus("sending");
    await fetch("/api/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipeId: card.id,
        recipeName: card.name,
        creator: card.creator,
        sourceUrl: card.sourceUrl ?? null,
        issueType,
        description: reportDesc,
      }),
    });
    setReportStatus("done");
    setTimeout(() => {
      setReportOpen(false);
      setReportStatus("idle");
      setReportDesc("");
    }, 1400);
  }

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (!active) return;
    // Double-tap detection
    const now = Date.now();
    if (now - lastTap.current < DOUBLE_TAP_MS) {
      setLocalAmens((n) => n + 1);
      setConfetti({ x: e.clientX, y: e.clientY });
      onAmen();
      setTimeout(() => setConfetti(null), 900);
      lastTap.current = 0;
      return;
    }
    lastTap.current = now;
    startX.current = e.clientX;
    startY.current = e.clientY;
    deltaX.current = 0;
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
  }, [active, onAmen]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!active || !(e.currentTarget as HTMLDivElement).hasPointerCapture(e.pointerId)) return;
    deltaX.current = e.clientX - startX.current;
    setDrag(deltaX.current);
  }, [active]);

  const onPointerUp = useCallback(() => {
    if (!active) return;
    const dx = deltaX.current;
    if (Math.abs(dx) > SWIPE_THRESHOLD) {
      const dir = dx > 0 ? "right" : "left";
      setFlying(dir);
      setTimeout(() => {
        setDrag(0);
        setFlying(null);
        if (dir === "right") onSwipeRight();
        else onSwipeLeft();
      }, 320);
    } else {
      setDrag(0);
    }
    deltaX.current = 0;
  }, [active, onSwipeRight, onSwipeLeft]);

  const rotate = drag * 0.07;
  const opacity = flying ? 0 : Math.max(0.4, 1 - Math.abs(drag) / 400);

  const swipeRightVisible = drag > 30 || flying === "right";
  const swipeLeftVisible = drag < -30 || flying === "left";

  let transform = `translateX(${drag}px) rotate(${rotate}deg)`;
  if (flying === "right") transform = `translateX(120%) rotate(15deg)`;
  if (flying === "left")  transform = `translateX(-120%) rotate(-15deg)`;
  if (!active) transform = `translateY(${stackOffset}px) scale(${1 - stackOffset * 0.012})`;

  return (
    <>
      {/* Confetti burst */}
      {confetti && (
        <div
          className="pointer-events-none fixed z-[200]"
          style={{ left: confetti.x - 40, top: confetti.y - 40, width: 80, height: 80 }}
        >
          {Array.from({ length: 14 }).map((_, i) => (
            <span
              key={i}
              className="absolute w-1.5 h-1.5 rounded-full"
              style={{
                background: ["#E8B49A", "#4A7A4A", "#B05A8A", "#F5C842", "#9BB89A"][i % 5],
                left: "50%",
                top: "50%",
                animation: `confetti-burst-${i % 3} 0.8s ease-out forwards`,
                transform: `rotate(${i * 26}deg)`,
              }}
            />
          ))}
        </div>
      )}

      <div
        ref={cardRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className="absolute inset-0 rounded-3xl select-none"
        style={{
          zIndex,
          transform,
          opacity,
          transition: flying || !active ? "transform 0.32s cubic-bezier(0.25,1,0.5,1), opacity 0.32s" : "none",
          cursor: active ? "grab" : "default",
          touchAction: "none",
          pointerEvents: flying ? "none" : undefined,
        }}
      >
        {/* Card background */}
        <div
          className="w-full h-full rounded-3xl overflow-hidden flex flex-col shadow-2xl"
          style={{ background: `linear-gradient(160deg, ${card.gradientFrom} 0%, ${card.gradientTo} 100%)` }}
        >
          {/* Swipe overlays */}
          {swipeRightVisible && (
            <div className="absolute inset-0 rounded-3xl z-10 flex items-start justify-start p-6 pointer-events-none"
              style={{ background: "rgba(74,122,74,0.18)" }}>
              <span className="border-4 rounded-xl px-4 py-2 text-2xl font-black rotate-[-20deg]"
                style={{ borderColor: "#4A7A4A", color: "#4A7A4A" }}>AMEN ✓</span>
            </div>
          )}
          {swipeLeftVisible && (
            <div className="absolute inset-0 rounded-3xl z-10 flex items-start justify-end p-6 pointer-events-none"
              style={{ background: "rgba(180,60,60,0.14)" }}>
              <span className="border-4 rounded-xl px-4 py-2 text-2xl font-black rotate-[20deg]"
                style={{ borderColor: "#B03A3A", color: "#B03A3A" }}>SKIP</span>
            </div>
          )}

          {/* Content */}
          <div className="flex flex-col h-full px-7 py-8 justify-between">
            {/* Top: creator + name */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-3 opacity-70" style={{ color: "#2D1A0E" }}>
                🧪 Dirty Soda Lab
              </p>
              <h2 className="text-3xl font-black leading-tight mb-2" style={{ color: "#1A0E05" }}>
                {card.name}
              </h2>
              <p className="text-sm font-medium opacity-60 mb-4" style={{ color: "#2D1A0E" }}>
                by @{card.creator}
              </p>
              <p className="text-sm leading-relaxed opacity-75 mb-6" style={{ color: "#2D1A0E" }}>
                {card.description}
              </p>
            </div>

            {/* Ingredients */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-2 opacity-50" style={{ color: "#2D1A0E" }}>
                Ingredients
              </p>
              <div className="flex flex-wrap gap-2 mb-6">
                {card.ingredients.map((ing) => (
                  <span
                    key={ing}
                    className="px-3 py-1 rounded-full text-sm font-semibold"
                    style={{ background: "rgba(255,255,255,0.45)", color: "#1A0E05" }}
                  >
                    {ing}
                  </span>
                ))}
              </div>

              {/* Stats + hint + report */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm font-semibold opacity-70" style={{ color: "#2D1A0E" }}>
                  <span>🙏 {localAmens.toLocaleString()} Amens</span>
                  <span>🔖 {card.saves.toLocaleString()} saves</span>
                </div>
                <div className="flex items-center gap-2">
                  {active && (
                    <p className="text-xs opacity-40" style={{ color: "#2D1A0E" }}>
                      swipe or double-tap
                    </p>
                  )}
                  {/* Report bug button — stops swipe propagation */}
                  <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => { e.stopPropagation(); setReportOpen(true); }}
                    title="Report a problem"
                    className="w-7 h-7 rounded-full flex items-center justify-center transition-opacity hover:opacity-100 opacity-50"
                    style={{ background: "rgba(255,255,255,0.5)", color: "#B03A3A" }}
                  >
                    <AlertTriangle size={13} strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Report modal */}
      {reportOpen && (
        <div
          className="fixed inset-0 z-[300] flex items-end justify-center"
          style={{ background: "rgba(0,0,0,0.45)" }}
          onPointerDown={(e) => { e.stopPropagation(); setReportOpen(false); }}
        >
          <div
            className="w-full max-w-md rounded-t-3xl p-6 pb-8"
            style={{ background: "#FDFAF5" }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} style={{ color: "#B03A3A" }} />
                <h3 className="font-black text-base" style={{ color: "#2D1A0E" }}>
                  Report a problem
                </h3>
              </div>
              <button
                onClick={() => setReportOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-full"
                style={{ background: "#F0EAE0", color: "#7A6858" }}
              >
                <X size={14} />
              </button>
            </div>

            <p className="text-xs mb-4 opacity-60" style={{ color: "#2D1A0E" }}>
              Recipe: <strong>{card.name}</strong> by @{card.creator}
            </p>

            {/* Issue type */}
            <div className="flex flex-col gap-2 mb-4">
              {ISSUE_TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setIssueType(t.value)}
                  className="text-left px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all"
                  style={
                    issueType === t.value
                      ? { background: "#2D1A0E", color: "#F5F0FF", borderColor: "#2D1A0E" }
                      : { background: "transparent", color: "#4A3A2E", borderColor: "#DDD5CC" }
                  }
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Optional description */}
            <textarea
              value={reportDesc}
              onChange={(e) => setReportDesc(e.target.value)}
              placeholder="Extra details (optional)…"
              rows={2}
              className="w-full rounded-xl px-4 py-3 text-sm resize-none outline-none border mb-4"
              style={{ borderColor: "#DDD5CC", background: "#FEFCFF", color: "#2D1A0E" }}
            />

            <button
              onClick={submitReport}
              disabled={reportStatus !== "idle"}
              className="w-full py-3 rounded-2xl font-black text-sm transition-all"
              style={
                reportStatus === "done"
                  ? { background: "#4A7A4A", color: "#fff" }
                  : { background: "#2D1A0E", color: "#F5F0FF" }
              }
            >
              {reportStatus === "idle" && "Submit report"}
              {reportStatus === "sending" && "Sending…"}
              {reportStatus === "done" && "✓ Report saved"}
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes confetti-burst-0 {
          to { transform: rotate(var(--r, 0deg)) translateY(-60px) scale(0); opacity: 0; }
        }
        @keyframes confetti-burst-1 {
          to { transform: rotate(var(--r, 0deg)) translateY(-80px) translateX(30px) scale(0); opacity: 0; }
        }
        @keyframes confetti-burst-2 {
          to { transform: rotate(var(--r, 0deg)) translateY(-50px) translateX(-25px) scale(0); opacity: 0; }
        }
      `}</style>
    </>
  );
}
