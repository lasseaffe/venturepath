"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { TempleSilhouette } from "@/components/illustrations/temple-silhouette";

const slides = [
  // 1 — Salt Lake Temple illustration
  {
    type: "temple",
    variant: "salt-lake" as const,
    bg: "linear-gradient(160deg, #2D4A2D 0%, #3D6040 100%)",
    label: "Salt Lake Temple",
    sub: "Salt Lake City, Utah",
    quote: null,
  },
  // 2 — Mountain photo + scripture
  {
    type: "photo",
    src: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=900&q=80",
    alt: "Mountain landscape",
    quote: '\u201cBe still, and know that I am God.\u201d',
    ref: "Psalm 46:10",
  },
  // 3 — CTR-inspired symbol slide
  {
    type: "symbol",
    symbol: "ctr",
    bg: "linear-gradient(150deg, #4A7050 0%, #6A9060 100%)",
    quote: '\u201cChoose the right when a choice is placed before you.\u201d',
    ref: "LDS Hymn #239",
  },
  // 4 — DC Temple illustration
  {
    type: "temple",
    variant: "dc" as const,
    bg: "linear-gradient(160deg, #1E3320 0%, #2D4A2D 100%)",
    label: "Washington D.C. Temple",
    sub: "Kensington, Maryland",
    quote: null,
  },
  // 5 — Forest photo + D&C quote
  {
    type: "photo",
    src: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=900&q=80",
    alt: "Green forest light",
    quote: '\u201cSeek ye first the kingdom of God.\u201d',
    ref: "Matthew 6:33 · D&C 11:23",
  },
  // 6 — Beehive / Deseret symbol
  {
    type: "symbol",
    symbol: "beehive",
    bg: "linear-gradient(150deg, #5A4A2A 0%, #8A7040 100%)",
    quote: '\u201cBy small and simple things are great things brought to pass.\u201d',
    ref: "Alma 37:6",
  },
  // 7 — Provo Temple
  {
    type: "temple",
    variant: "provo" as const,
    bg: "linear-gradient(160deg, #2D3A4A 0%, #3D5060 100%)",
    label: "Provo Utah Temple",
    sub: "Provo, Utah",
    quote: null,
  },
  // 8 — Starry night + quote
  {
    type: "photo",
    src: "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=900&q=80",
    alt: "Mountain at night with stars",
    quote: '\u201cThe worth of souls is great in the sight of God.\u201d',
    ref: "Doctrine & Covenants 18:10",
  },
];

export function HeroSlideshow() {
  const [current, setCurrent] = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setCurrent((c) => (c + 1) % slides.length);
        setFading(false);
      }, 400);
    }, 4200);
    return () => clearInterval(timer);
  }, []);

  const slide = slides[current];

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-2xl select-none">
      {/* Slide content */}
      <div
        className="absolute inset-0 transition-opacity duration-500"
        style={{ opacity: fading ? 0 : 1 }}
      >
        {slide.type === "photo" && (
          <>
            <Image
              src={(slide as { src: string; alt: string }).src}
              alt={(slide as { alt: string }).alt}
              fill
              className="object-cover"
            />
            <div className="absolute inset-0" style={{ background: "rgba(20,35,20,0.58)" }} />
          </>
        )}

        {(slide.type === "temple" || slide.type === "symbol") && (
          <div className="absolute inset-0" style={{ background: (slide as { bg: string }).bg }} />
        )}

        {slide.type === "temple" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <TempleSilhouette
              variant={(slide as { variant: "salt-lake" | "dc" | "provo" }).variant}
              height={160}
              className="text-[#9BB89A] opacity-90"
            />
            <p className="text-sm font-semibold" style={{ color: "#C8DCC8" }}>
              {(slide as { label: string }).label}
            </p>
            <p className="text-xs" style={{ color: "#5A7A5A" }}>
              {(slide as { sub: string }).sub}
            </p>
          </div>
        )}

        {slide.type === "symbol" && (slide as { symbol: string }).symbol === "ctr" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-6">
            {/* CTR-inspired geometric shield */}
            <svg width="80" height="90" viewBox="0 0 80 90" fill="none">
              <path d="M40 4 L74 18 L74 52 C74 68 56 82 40 88 C24 82 6 68 6 52 L6 18 Z"
                fill="none" stroke="#9BB89A" strokeWidth="2.5" />
              <path d="M40 14 L64 24 L64 52 C64 64 52 74 40 80 C28 74 16 64 16 52 L16 24 Z"
                fill="#9BB89A" opacity="0.15" />
              <text x="40" y="55" textAnchor="middle" fontSize="22" fontWeight="700" fill="#C8DCC8" fontFamily="serif">CTR</text>
            </svg>
            <p className="text-center text-sm italic leading-relaxed max-w-[180px]" style={{ color: "#C8DCC8" }}>
              {(slide as { quote: string }).quote}
            </p>
            <p className="text-xs" style={{ color: "#5A7A5A" }}>
              {(slide as { ref: string }).ref}
            </p>
          </div>
        )}

        {slide.type === "symbol" && (slide as { symbol: string }).symbol === "beehive" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-6">
            {/* Deseret beehive */}
            <svg width="80" height="88" viewBox="0 0 80 88" fill="none">
              <path d="M40 8 C20 8 10 24 10 40 C10 56 14 68 14 68 L66 68 C66 68 70 56 70 40 C70 24 60 8 40 8 Z"
                fill="#E8C49A" opacity="0.9" />
              <path d="M15 58 Q40 52 65 58" stroke="white" strokeWidth="1.5" fill="none" opacity="0.5" />
              <path d="M13 48 Q40 41 67 48" stroke="white" strokeWidth="1.5" fill="none" opacity="0.5" />
              <path d="M13 38 Q40 31 67 38" stroke="white" strokeWidth="1.5" fill="none" opacity="0.5" />
              <path d="M16 28 Q40 22 64 28" stroke="white" strokeWidth="1.5" fill="none" opacity="0.45" />
              <rect x="6" y="68" width="68" height="9" rx="4.5" fill="#C8A070" />
              <ellipse cx="40" cy="68" rx="8" ry="3" fill="#A07840" opacity="0.4" />
              <circle cx="40" cy="5" r="5" fill="white" opacity="0.3" />
            </svg>
            <p className="text-center text-sm italic leading-relaxed max-w-[200px]" style={{ color: "#F5EDE0" }}>
              {(slide as { quote: string }).quote}
            </p>
            <p className="text-xs" style={{ color: "#C8A870" }}>
              {(slide as { ref: string }).ref}
            </p>
          </div>
        )}

        {(slide.type === "photo") && "quote" in slide && slide.quote && (
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <p className="text-sm font-medium italic leading-relaxed" style={{ color: "#F5F0E8", textShadow: "0 1px 6px rgba(0,0,0,0.6)" }}>
              {(slide as { quote: string }).quote}
            </p>
            <p className="text-xs mt-1" style={{ color: "#9BB89A", textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>
              {(slide as { ref: string }).ref}
            </p>
          </div>
        )}
      </div>

      {/* Dot indicators */}
      <div className="absolute bottom-3 right-4 flex gap-1.5">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => { setFading(true); setTimeout(() => { setCurrent(i); setFading(false); }, 300); }}
            className="rounded-full transition-all duration-300"
            style={{
              width: i === current ? "18px" : "6px",
              height: "6px",
              background: i === current ? "#E8B49A" : "rgba(255,255,255,0.35)",
            }}
          />
        ))}
      </div>
    </div>
  );
}
