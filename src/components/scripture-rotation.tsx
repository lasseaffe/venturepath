"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, BookOpen } from "lucide-react";

// Easter season 2026 — April. Thematically: Resurrection, Atonement, Covenant, Hope.
const SLIDES = [
  {
    id: "resurrection",
    type: "photo",
    bg: "linear-gradient(160deg, #1A2A3A 0%, #2A3A4A 100%)",
    photo: "https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?auto=format&fit=crop&w=900&q=75",
    quote: "\u201cHe is not here: for he is risen, as he said.\u201d",
    ref: "Matthew 28:6",
    label: "Easter · Resurrection",
    accent: "#D4AF37",
  },
  {
    id: "resurrection-life",
    type: "svg",
    bg: "linear-gradient(160deg, #1A0D4A 0%, #2D1B69 100%)",
    photo: null,
    quote: "\u201cI am the resurrection, and the life: he that believeth in me, though he were dead, yet shall he live.\u201d",
    ref: "John 11:25",
    label: "Christ · Life Eternal",
    accent: "#D4AF37",
    svgType: "cross",
  },
  {
    id: "atonement",
    type: "photo",
    bg: "linear-gradient(160deg, #1A0D4A 0%, #2D1B69 100%)",
    photo: "https://images.unsplash.com/photo-1490750580177-83e5f0f40ddb?auto=format&fit=crop&w=900&q=75",
    quote: "\u201cFor God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.\u201d",
    ref: "John 3:16",
    label: "Atonement · God\u2019s Love",
    accent: "#D4AF37",
  },
  {
    id: "mosiah",
    type: "svg",
    bg: "linear-gradient(160deg, #16103A 0%, #231855 100%)",
    photo: null,
    quote: "\u201cAnd he shall go forth, suffering pains and afflictions and temptations of every kind; and this that the word might be fulfilled which saith he will take upon him the pains and the sicknesses of his people.\u201d",
    ref: "Alma 7:11",
    label: "Book of Mormon · Alma",
    accent: "#EDE8F8",
    svgType: "dove",
  },
  {
    id: "dc19",
    type: "photo",
    bg: "linear-gradient(160deg, #1A0D4A 0%, #2D1B69 100%)",
    photo: "https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=900&q=75",
    quote: "\u201cFor, behold, I, God, have suffered these things for all, that they might not suffer if they would repent.\u201d",
    ref: "Doctrine & Covenants 19:16",
    label: "D&C · The Lord Speaks",
    accent: "#D4AF37",
  },
  {
    id: "peace",
    type: "svg",
    bg: "linear-gradient(160deg, #2D1B69 0%, #4A2D8A 100%)",
    photo: null,
    quote: "\u201cPeace I leave with you, my peace I give unto you: not as the world giveth, give I unto you. Let not your heart be troubled, neither let it be afraid.\u201d",
    ref: "John 14:27",
    label: "Easter · Peace",
    accent: "#D4AF37",
    svgType: "sun",
  },
];

function CrossSvg({ accent }: { accent: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 w-full h-full px-6">
      <svg width="72" height="90" viewBox="0 0 72 90" fill="none" className="drop-shadow-lg">
        <rect x="30" y="4" width="12" height="82" rx="6" fill={accent} opacity="0.85" />
        <rect x="6" y="24" width="60" height="12" rx="6" fill={accent} opacity="0.85" />
        {/* glow */}
        <ellipse cx="36" cy="30" rx="22" ry="18" fill={accent} opacity="0.08" />
      </svg>
    </div>
  );
}

function DoveSvg({ accent }: { accent: string }) {
  return (
    <div className="flex flex-col items-center justify-center w-full h-full px-6">
      <svg width="100" height="80" viewBox="0 0 100 80" fill="none" className="drop-shadow-lg">
        {/* Body */}
        <ellipse cx="52" cy="44" rx="24" ry="16" fill={accent} opacity="0.9" />
        {/* Head */}
        <circle cx="74" cy="34" r="10" fill={accent} opacity="0.9" />
        {/* Beak */}
        <path d="M83 33 L94 36 L83 38 Z" fill={accent} opacity="0.7" />
        {/* Wing upper */}
        <path d="M38 44 C20 28 8 20 10 10 C22 16 36 30 52 36 Z" fill={accent} opacity="0.8" />
        {/* Wing lower */}
        <path d="M38 46 C18 52 6 56 8 66 C22 62 36 52 52 46 Z" fill={accent} opacity="0.6" />
        {/* Tail */}
        <path d="M28 44 L8 36 L14 46 L6 52 L20 50 Z" fill={accent} opacity="0.7" />
        {/* Eye */}
        <circle cx="76" cy="32" r="2" fill="rgba(0,0,0,0.5)" />
      </svg>
    </div>
  );
}

function SunSvg({ accent }: { accent: string }) {
  return (
    <div className="flex flex-col items-center justify-center w-full h-full px-6">
      <svg width="100" height="100" viewBox="0 0 100 100" fill="none" className="drop-shadow-lg">
        {/* Rays */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
          <line
            key={angle}
            x1="50"
            y1="50"
            x2={50 + 42 * Math.cos((angle * Math.PI) / 180)}
            y2={50 + 42 * Math.sin((angle * Math.PI) / 180)}
            stroke={accent}
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.6"
          />
        ))}
        {/* Outer glow */}
        <circle cx="50" cy="50" r="32" fill={accent} opacity="0.08" />
        {/* Inner circle */}
        <circle cx="50" cy="50" r="22" fill={accent} opacity="0.9" />
        <circle cx="50" cy="50" r="16" fill="rgba(255,255,255,0.25)" />
      </svg>
    </div>
  );
}

export function ScriptureRotation() {
  const [current, setCurrent] = useState(0);
  const [fading, setFading] = useState(false);

  const goTo = useCallback((idx: number) => {
    setFading(true);
    setTimeout(() => {
      setCurrent(idx);
      setFading(false);
    }, 350);
  }, []);

  const next = useCallback(
    () => goTo((current + 1) % SLIDES.length),
    [current, goTo]
  );
  const prev = () => goTo((current - 1 + SLIDES.length) % SLIDES.length);

  useEffect(() => {
    const id = setInterval(next, 5500);
    return () => clearInterval(id);
  }, [next]);

  const slide = SLIDES[current];

  return (
    <section className="py-16 px-4" style={{ background: "linear-gradient(180deg, #1A0D4A 0%, #2D1B69 100%)" }}>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div
            className="p-2 rounded-lg"
            style={{ background: "rgba(212,175,55,0.15)" }}
          >
            <BookOpen size={16} style={{ color: "#D4AF37" }} />
          </div>
          <div>
            <p
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: "#D4AF37" }}
            >
              Scripture of the Season
            </p>
            <p className="text-xs mt-0.5" style={{ color: "#8B7EC0" }}>
              Easter 2026 · The Resurrection and Atonement of Jesus Christ
            </p>
          </div>
        </div>

        {/* Card */}
        <div
          className="relative rounded-3xl overflow-hidden shadow-2xl transition-opacity duration-500"
          style={{
            height: 320,
            opacity: fading ? 0 : 1,
          }}
        >
          {/* Background */}
          <div className="absolute inset-0" style={{ background: slide.bg }} />

          {/* Subtle dot texture */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.04]"
            style={{
              backgroundImage:
                "radial-gradient(rgba(255,255,255,0.8) 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          />

          {/* Photo */}
          {slide.photo && (
            <div className="absolute inset-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={slide.photo}
                alt=""
                className="w-full h-full object-cover"
              />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(to right, rgba(26,13,74,0.92) 0%, rgba(26,13,74,0.55) 50%, rgba(26,13,74,0.3) 100%)",
                }}
              />
            </div>
          )}

          {/* SVG visual — right side */}
          {slide.type === "svg" && (
            <div className="absolute right-0 top-0 bottom-0 w-48 opacity-70 pointer-events-none">
              {slide.svgType === "cross" && <CrossSvg accent={(slide as { accent: string }).accent} />}
              {slide.svgType === "dove" && <DoveSvg accent={(slide as { accent: string }).accent} />}
              {slide.svgType === "sun" && <SunSvg accent={(slide as { accent: string }).accent} />}
            </div>
          )}

          {/* Gradient fade right → left over SVG */}
          {slide.type === "svg" && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "linear-gradient(to right, transparent 55%, rgba(0,0,0,0.35) 100%)",
              }}
            />
          )}

          {/* Content */}
          <div className="absolute inset-0 flex flex-col justify-center px-8 md:px-12 max-w-2xl">
            {/* Season label */}
            <span
              className="w-fit text-xs font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full mb-5"
              style={{
                background: "rgba(255,255,255,0.1)",
                color: slide.accent,
                border: `1px solid ${slide.accent}40`,
              }}
            >
              {slide.label}
            </span>

            {/* Quote */}
            <blockquote
              className="text-lg md:text-xl font-medium italic leading-relaxed mb-4"
              style={{ color: "#F5F0FF", textShadow: "0 1px 8px rgba(0,0,0,0.4)" }}
            >
              {slide.quote}
            </blockquote>

            {/* Reference */}
            <p
              className="text-sm font-semibold"
              style={{ color: slide.accent }}
            >
              — {slide.ref}
            </p>
          </div>

          {/* Prev / Next */}
          <button
            onClick={prev}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full flex items-center justify-center opacity-50 hover:opacity-100 transition-opacity"
            style={{ background: "rgba(0,0,0,0.35)" }}
          >
            <ChevronLeft className="w-4 h-4 text-white" />
          </button>
          <button
            onClick={next}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full flex items-center justify-center opacity-50 hover:opacity-100 transition-opacity"
            style={{ background: "rgba(0,0,0,0.35)" }}
          >
            <ChevronRight className="w-4 h-4 text-white" />
          </button>

          {/* Dots */}
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className="rounded-full transition-all duration-300"
                style={{
                  width: i === current ? 18 : 6,
                  height: 6,
                  background:
                    i === current
                      ? slide.accent
                      : "rgba(255,255,255,0.3)",
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
