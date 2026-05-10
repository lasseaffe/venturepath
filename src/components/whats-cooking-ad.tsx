"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ChevronLeft, ChevronRight, ChefHat, ExternalLink, Sparkles,
  Utensils, TrendingUp, BookOpen, Users, Zap, Link2,
} from "lucide-react";

/* ─── What's Cooking feature tiles ───────────────────── */
const FEATURES = [
  {
    id: "meal-planner",
    Icon: Utensils,
    title: "AI Meal Planner",
    desc: "Tell us your preferences and get a fully personalised weekly meal plan with shopping lists, built around your life.",
    href: "https://whatscooking.app/plans",
    accent: "#C8522A",
  },
  {
    id: "discover",
    Icon: TrendingUp,
    title: "Discover & Trending",
    desc: "Browse trending recipes from the community. Filter by cuisine, cooking time, dietary needs, or mood.",
    href: "https://whatscooking.app/discover",
    accent: "#D4884C",
  },
  {
    id: "import",
    Icon: Link2,
    title: "Social Recipe Import",
    desc: "Spotted something on Instagram or TikTok? Paste the link and we extract every ingredient and step automatically.",
    href: "https://whatscooking.app/discover",
    accent: "#B06A3A",
  },
  {
    id: "library",
    Icon: BookOpen,
    title: "Recipe Library",
    desc: "Save all your favourite recipes, plans, and ideas in one beautiful place. Always at hand, always organised.",
    href: "https://whatscooking.app/recipes",
    accent: "#C8522A",
  },
  {
    id: "collab",
    Icon: Users,
    title: "Collaborative Cooking",
    desc: "Plan meals with family or friends in real time. Share notes, assign courses, and prep together effortlessly.",
    href: "https://whatscooking.app/plans",
    accent: "#D4884C",
  },
  {
    id: "recs",
    Icon: Zap,
    title: "Smart Recommendations",
    desc: "The more you cook, the smarter it gets. Personalised suggestions based on your taste, goals, and favourite cuisines.",
    href: "https://whatscooking.app/discover",
    accent: "#B06A3A",
  },
];

/* ─── Dirty Soda Slides — images verified to show drinks ─ */
const SODA_SLIDES = [
  {
    id: "1",
    title: "Classic Dirty Dr Pepper",
    description:
      "The original Utah dirty soda that started the craze. Dr Pepper over crushed ice with coconut cream and fresh lime — refreshing, indulgent, and completely non-alcoholic.",
    image_url:
      "https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=800&q=80",
    source_name: "Swig — Original Utah Dirty Soda",
  },
  {
    id: "2",
    title: "Raspberry Coconut Dirty Sprite",
    description:
      "A favourite at Utah soda shops — Sprite with raspberry syrup, coconut cream, and fresh lemon. The tartness balances the sweetness perfectly.",
    image_url:
      "https://images.unsplash.com/photo-1570197788417-0e82375c9371?w=800&q=80",
    source_name: "NYT Cooking — Inspired",
  },
  {
    id: "3",
    title: "Mango Habanero Dirty Lemonade",
    description:
      "A bold Utah soda-shop staple — fresh lemonade with mango syrup, a touch of habanero heat, and a coconut cream float. Sweet, sour, and spicy in every sip.",
    image_url:
      "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=800&q=80",
    source_name: "Sodalicious",
  },
  {
    id: "4",
    title: "Peach Green Tea Dirty Soda",
    description:
      "Crisp green tea meets peach nectar and a silky coconut cream float. A lighter dirty soda that feels almost virtuous.",
    image_url:
      "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800&q=80",
    source_name: "Fiiz Drinks",
  },
  {
    id: "5",
    title: "Brown Sugar Vanilla Dirty Coke",
    description:
      "The TikTok dirty soda that blew up — Coca-Cola with brown sugar syrup, vanilla cream, and lime. Tastes like a dessert in a cup.",
    image_url:
      "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=800&q=80",
    source_name: "Dirty Dough & Friends",
  },
];

/* ─── SVG noise pattern (inline, no external dependency) ── */
const NOISE_URL =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.72' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='400' height='400' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E\")";

export function WhatsCookingAd() {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const next = useCallback(() => setCurrent((p) => (p + 1) % SODA_SLIDES.length), []);
  const prev = () => setCurrent((p) => (p - 1 + SODA_SLIDES.length) % SODA_SLIDES.length);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(next, 4500);
    return () => clearInterval(id);
  }, [paused, next]);

  const slide = SODA_SLIDES[current];

  return (
    <section className="relative overflow-hidden">

      {/* ── 3-bar horizontal background ──────────────────── */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(
            to bottom,
            #1A0902 0%,   #1A0902 34%,
            #3D1A0A 34%,  #3D1A0A 66%,
            #1A0902 66%,  #1A0902 100%
          )`,
        }}
      />

      {/* ── Animated food-texture background images ─────── */}
      {/* Bar 1 – subtle kitchen texture */}
      <div
        aria-hidden
        className="absolute top-0 left-0 right-0 pointer-events-none overflow-hidden"
        style={{ height: "34%" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1495195134817-aeb325a55b65?w=1400&q=60"
          alt=""
          className="w-full h-full object-cover"
          style={{
            opacity: 0,
            animation: "hf-bg-breathe 8s ease-in-out infinite, hf-bg-drift 22s ease-in-out infinite",
          }}
        />
      </div>
      {/* Bar 2 – spice/warmth texture */}
      <div
        aria-hidden
        className="absolute left-0 right-0 pointer-events-none overflow-hidden"
        style={{ top: "34%", height: "32%" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1466637574441-749b8f19452f?w=1400&q=60"
          alt=""
          className="w-full h-full object-cover"
          style={{
            opacity: 0,
            animation: "hf-bg-breathe 9s ease-in-out infinite 2s, hf-bg-drift 25s ease-in-out infinite 4s",
          }}
        />
      </div>
      {/* Bar 3 */}
      <div
        aria-hidden
        className="absolute bottom-0 left-0 right-0 pointer-events-none overflow-hidden"
        style={{ height: "34%" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1495195134817-aeb325a55b65?w=1400&q=60"
          alt=""
          className="w-full h-full object-cover"
          style={{
            opacity: 0,
            animation: "hf-bg-breathe 10s ease-in-out infinite 1s, hf-bg-drift 20s ease-in-out infinite 8s",
          }}
        />
      </div>

      {/* ── Noise / grain texture overlay ──────────────── */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: NOISE_URL,
          backgroundSize: "300px 300px",
          opacity: 0.055,
          mixBlendMode: "overlay",
        }}
      />

      {/* ── Dot grid decorative pattern ─────────────────── */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(rgba(200,82,42,0.25) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          opacity: 0.4,
        }}
      />

      {/* ── Decorative large watermark text ─────────────── */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden select-none"
      >
        <span
          className="font-bold uppercase tracking-[0.5em] whitespace-nowrap"
          style={{
            fontSize: "clamp(60px, 14vw, 160px)",
            color: "rgba(200,82,42,0.04)",
            transform: "rotate(-8deg) translateY(-20%)",
            fontFamily: "Georgia, serif",
            letterSpacing: "0.6em",
          }}
        >
          What&apos;s Cooking
        </span>
      </div>

      {/* ═════════════════════════════════════════════════
          SECTION 1 — Feature grid "THE KITCHEN, REIMAGINED"
      ═════════════════════════════════════════════════ */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 pt-14 pb-10">

        {/* Section label */}
        <div className="text-center mb-10">
          {/* Decorative rule */}
          <div className="flex items-center gap-4 justify-center mb-4">
            <div className="h-px flex-1 max-w-24" style={{ background: "linear-gradient(to right, transparent, rgba(200,82,42,0.5))" }} />
            <ChefHat size={18} style={{ color: "#C8522A" }} />
            <div className="h-px flex-1 max-w-24" style={{ background: "linear-gradient(to left, transparent, rgba(200,82,42,0.5))" }} />
          </div>
          <p
            className="text-xs font-bold uppercase tracking-[0.28em] mb-1"
            style={{ color: "rgba(200,82,42,0.7)" }}
          >
            What&apos;s Cooking
          </p>
          <h2
            className="text-2xl font-bold"
            style={{ color: "#EFE3CE", fontFamily: "Georgia, 'Times New Roman', serif", letterSpacing: "0.06em" }}
          >
            The Kitchen, Reimagined
          </h2>
          <p className="text-sm mt-2 max-w-md mx-auto" style={{ color: "rgba(200,155,100,0.65)" }}>
            A new way to plan, discover, and cook — powered by AI, built for real kitchens.
          </p>
        </div>

        {/* ── Feature tiles — full tile is the link hitbox ─ */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map(({ id, Icon, title, desc, href, accent }) => (
            <a
              key={id}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="group block rounded-2xl p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(200,82,42,0.15)",
                backdropFilter: "blur(4px)",
                WebkitBackdropFilter: "blur(4px)",
                cursor: "pointer",
              }}
            >
              {/* Icon */}
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center mb-3"
                style={{ background: `${accent}22` }}
              >
                <Icon size={15} style={{ color: accent }} />
              </div>
              {/* Title */}
              <h3
                className="font-bold text-sm mb-1.5 group-hover:text-white transition-colors"
                style={{ color: "#EFE3CE" }}
              >
                {title}
              </h3>
              {/* Description */}
              <p className="text-xs leading-relaxed" style={{ color: "rgba(175,130,90,0.75)" }}>
                {desc}
              </p>
              {/* Arrow hint */}
              <p
                className="text-xs mt-3 font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: accent }}
              >
                Open →
              </p>
            </a>
          ))}
        </div>
      </div>

      {/* ── Wavy SVG divider between sections ────────────── */}
      <div className="relative z-10 w-full overflow-hidden" style={{ height: 56, marginBottom: -1 }}>
        <svg
          viewBox="0 0 1200 56"
          preserveAspectRatio="none"
          className="w-full h-full"
          aria-hidden
        >
          <path
            d="M0,28 C200,60 400,0 600,28 C800,56 1000,8 1200,28 L1200,56 L0,56 Z"
            fill="rgba(200,82,42,0.10)"
          />
          <path
            d="M0,38 C250,10 500,56 750,30 C900,16 1050,46 1200,38 L1200,56 L0,56 Z"
            fill="rgba(61,26,10,0.55)"
          />
        </svg>
        {/* Decorative typography on the wave */}
        <span
          aria-hidden
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-xs font-bold uppercase tracking-[0.4em] select-none"
          style={{ color: "rgba(200,82,42,0.45)", whiteSpace: "nowrap" }}
        >
          Trending in communities
        </span>
      </div>

      {/* ═════════════════════════════════════════════════
          SECTION 2 — Dirty Soda Trending Banner
      ═════════════════════════════════════════════════ */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 pb-14 pt-2">

        {/* Header row */}
        <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
          <div>
            <h2
              className="text-xl font-bold"
              style={{ color: "#EFE3CE", fontFamily: "Georgia, 'Times New Roman', serif" }}
            >
              Utah&apos;s Dirty Soda Culture
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "rgba(200,155,100,0.6)" }}>
              Coconut cream, house-made syrups, zero alcohol — the soda-shop drinks that became a beloved community tradition.
            </p>
          </div>
          <a
            href="https://whatscooking.app"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:scale-105 shadow-sm"
            style={{ background: "#C85A2F", color: "#fff" }}
          >
            <ChefHat size={14} />
            What&apos;s Cooking
            <ExternalLink size={12} />
          </a>
        </div>

        {/* Banner card */}
        <div
          className="rounded-3xl overflow-hidden shadow-2xl"
          style={{
            background: "linear-gradient(135deg, #2D1000 0%, #5C1E08 50%, #8B3010 100%)",
            border: "1px solid rgba(200,82,42,0.25)",
          }}
        >
          <div className="grid md:grid-cols-[1fr_380px]">

            {/* Left: text + controls */}
            <div className="flex flex-col justify-center px-8 py-8 gap-4">
              <span
                className="w-fit text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full"
                style={{ background: "rgba(255,255,255,0.10)", color: "#FED7AA" }}
              >
                Trending in LDS Communities
              </span>

              <div>
                <h3 className="text-xl font-bold text-white mb-1.5">{slide.title}</h3>
                <p className="text-sm leading-relaxed line-clamp-3" style={{ color: "#FED7AA" }}>
                  {slide.description}
                </p>
                {slide.source_name && (
                  <p className="text-xs mt-2" style={{ color: "rgba(254,215,170,0.5)" }}>
                    via {slide.source_name}
                  </p>
                )}
              </div>

              {/* Slide indicator dots */}
              <div className="flex gap-1.5">
                {SODA_SLIDES.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrent(i)}
                    aria-label={`Go to slide ${i + 1}`}
                    className="rounded-full transition-all duration-300"
                    style={{
                      width: i === current ? 18 : 6,
                      height: 6,
                      background: i === current ? "#FED7AA" : "rgba(255,255,255,0.28)",
                    }}
                  />
                ))}
              </div>

              {/* CTAs */}
              <div className="flex flex-wrap gap-3 mt-1">
                <a
                  href="https://whatscooking.app/discover"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all hover:scale-105"
                  style={{
                    background: "rgba(255,255,255,0.14)",
                    color: "#fff",
                    border: "1px solid rgba(255,255,255,0.22)",
                  }}
                >
                  See all dirty soda recipes
                </a>
                <a
                  href="https://whatscooking.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all hover:scale-105"
                  style={{ background: "#fff", color: "#C85A2F" }}
                >
                  <Sparkles size={14} />
                  Try What&apos;s Cooking
                  <ExternalLink size={12} />
                </a>
              </div>
            </div>

            {/* Right: slideshow image — flowy diagonal mask */}
            <div
              className="relative overflow-hidden min-h-[260px] md:min-h-0"
              onMouseEnter={() => setPaused(true)}
              onMouseLeave={() => setPaused(false)}
              style={{
                /* Flowy organic left-edge cut blending into the card */
                clipPath: "polygon(9% 0%, 100% 0%, 100% 100%, 0% 100%)",
              }}
            >
              {SODA_SLIDES.map((s, i) => (
                <div
                  key={s.id}
                  className="absolute inset-0 transition-opacity duration-700"
                  style={{ opacity: i === current ? 1 : 0 }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={s.image_url}
                    alt={s.title}
                    className="w-full h-full object-cover"
                  />
                  {/* Left-bleed gradient to merge with card */}
                  <div
                    className="absolute inset-0"
                    style={{
                      background: "linear-gradient(to right, rgba(92,30,8,0.80) 0%, rgba(92,30,8,0.30) 30%, transparent 65%)",
                    }}
                  />
                  {/* Bottom fade out — starts early */}
                  <div
                    className="absolute inset-0"
                    style={{
                      background: "linear-gradient(to bottom, transparent 30%, rgba(45,16,0,0.65) 100%)",
                    }}
                  />
                </div>
              ))}

              {/* Prev / Next */}
              <button
                onClick={prev}
                aria-label="Previous slide"
                className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity"
                style={{ background: "rgba(0,0,0,0.42)" }}
              >
                <ChevronLeft className="w-4 h-4 text-white" />
              </button>
              <button
                onClick={next}
                aria-label="Next slide"
                className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity"
                style={{ background: "rgba(0,0,0,0.42)" }}
              >
                <ChevronRight className="w-4 h-4 text-white" />
              </button>

              {/* What's Cooking badge */}
              <a
                href="https://whatscooking.app"
                target="_blank"
                rel="noopener noreferrer"
                className="absolute top-4 right-4 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold tracking-wide backdrop-blur-sm hover:opacity-90 transition-opacity"
                style={{ background: "rgba(200,90,47,0.85)", color: "#fff" }}
              >
                <ChefHat size={11} /> What&apos;s Cooking
              </a>
            </div>
          </div>
        </div>

        {/* Decorative footnote */}
        <p className="text-center text-xs mt-4" style={{ color: "rgba(200,155,100,0.35)" }}>
          Explore thousands of recipes · Powered by What&apos;s Cooking AI
        </p>
      </div>

      {/* ── Top fade-in from previous (cream) section ───── */}
      <div
        aria-hidden
        className="absolute top-0 left-0 right-0 pointer-events-none"
        style={{
          height: 80,
          background: "linear-gradient(to bottom, #FDFAF3 0%, transparent 100%)",
          zIndex: 20,
        }}
      />

      {/* ── Bottom fade-out into next section — starts at 70% ── */}
      <div
        aria-hidden
        className="absolute bottom-0 left-0 right-0 pointer-events-none"
        style={{
          height: 100,
          background: "linear-gradient(to bottom, transparent 0%, #FDFAF3 100%)",
          zIndex: 20,
        }}
      />
    </section>
  );
}
