"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  MessageSquare, BookOpen, Users,
  TreePine, Home as HomeIcon,
  HeartHandshake, Utensils, TrendingUp, Link2, ChefHat, ExternalLink, Zap, ArrowRight, Compass,
  GraduationCap, BookMarked, GitBranch,
} from "lucide-react";
import { HeroSlideshow } from "@/components/hero-slideshow";
import { ScriptureRotation } from "@/components/scripture-rotation";
import { LdsNewsSection } from "@/components/lds-news-section";
import { EcosystemSection } from "@/components/ecosystem-section";
import { CommunitySection } from "@/components/community-section";
import { Logo } from "@/components/logo";

const PHOTOS = {
  scripture: "https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?auto=format&fit=crop&w=900&q=80",
  nature:    "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1600&q=75",
  stars:     "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1600&q=75",
  forest:    "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=900&q=80",
  genealogy: "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=900&q=80",
  // Grid thumbnails — contextually matched
  family:    "https://images.unsplash.com/photo-1511895426328-dc8714191011?auto=format&fit=crop&w=900&q=80",
  mission:   "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=900&q=80",
  community: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=900&q=80",
  talk:      "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=900&q=80",
  prayer:    "https://images.unsplash.com/photo-1499209974431-9dddcece7f88?auto=format&fit=crop&w=900&q=80",
};



const TALK_PREVIEWS = [
  {
    label: "Sacrament Talk · Adult · 7 min",
    text: `Brothers and sisters, I've been asked to speak today on the gift of the Atonement.\n\nIn Alma 7:11–12, we read that the Savior took upon himself our pains, afflictions, and infirmities—not only our sins, but the very weight of our mortality. He did not observe our suffering from a distance; He entered it.\n\nI testify that whatever you are carrying this week, He has already carried it first. His grace is not a reward for the righteous—it is a lifeline for all of us.`,
  },
  {
    label: "Youth Talk · Aaronic Priesthood · 5 min",
    text: `When I think about what it means to hold the priesthood, I think about my dad.\n\nEvery fast Sunday, he's the one who wakes up early and prays before anyone else is awake. He's never told me to do that—I just noticed. That's what priesthood looks like at home.\n\nMoroni 7:45 says charity "suffereth long, and is kind." I think that's what the priesthood is for. Not status. Service.`,
  },
  {
    label: "Testimony · Fast Sunday · 2 min",
    text: `I want to bear my testimony that I know this work is true.\n\nThis past year has been one of the hardest of my life. But every time I opened the scriptures, I found something I needed. Not always an answer—sometimes just peace.\n\nI'm grateful for a Heavenly Father who knows me by name, and for a Savior who makes it possible to begin again. In the name of Jesus Christ, amen.`,
  },
];

function TypewriterPreview() {
  const [slideIdx, setSlideIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [pausing, setPausing] = useState(false);
  const current = TALK_PREVIEWS[slideIdx];

  useEffect(() => {
    if (pausing) {
      const t = setTimeout(() => {
        setSlideIdx((i) => (i + 1) % TALK_PREVIEWS.length);
        setCharIdx(0);
        setPausing(false);
      }, 3200);
      return () => clearTimeout(t);
    }
    if (charIdx >= current.text.length) {
      setPausing(true);
      return;
    }
    const delay = current.text[charIdx] === "\n" ? 60 : 18;
    const t = setTimeout(() => setCharIdx((c) => c + 1), delay);
    return () => clearTimeout(t);
  }, [charIdx, pausing, current, slideIdx]);

  const displayed = current.text.slice(0, charIdx);

  return (
    <div
      className="hf-parchment rounded-2xl p-5 md:p-7 shadow-xl"
      style={{ fontFamily: "var(--font-heading, Georgia, serif)", minHeight: 260 }}
    >
      <div className="flex items-center gap-2 mb-4">
        <span
          className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
          style={{ background: "rgba(212,175,55,0.15)", color: "#D4AF37", border: "1px solid rgba(212,175,55,0.3)" }}
        >
          {current.label}
        </span>
      </div>
      <hr className="hf-ink-rule mb-4" />
      <p
        className="text-sm md:text-base leading-relaxed whitespace-pre-line hf-cursor"
        style={{ color: "#2D1B69", minHeight: 160 }}
      >
        {displayed}
      </p>
    </div>
  );
}

const values = [
  { icon: BookOpen,      title: "Scripture-Rooted",   description: "Every AI output is anchored to the Standard Works. No generic inspiration — just the real thing." },
  { icon: HeartHandshake, title: "Faith-Positive",    description: "Built for covenant members. The tone, the vocabulary, and the purpose are all LDS-specific." },
  { icon: HomeIcon,      title: "Family-First",       description: "From Sunbeams to seniors, every feature works for the whole family — not just individual users." },
  { icon: TreePine,      title: "Privacy-Respecting", description: "Your spiritual journal stays yours. We never train models on your personal entries." },
];

export default function Home() {
  return (
    <div className="flex flex-col" style={{ background: "#FDFAF5" }}>

      {/* -- PARCHMENT HERO -------------------------------- */}
      <section className="relative overflow-hidden py-14 md:py-20 px-6" style={{ background: "#FDFAF5" }}>
        {/* Subtle dot-grid texture */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: "radial-gradient(#DDD5F0 1px, transparent 1px)", backgroundSize: "24px 24px", opacity: 0.5 }}
        />
        <div className="relative max-w-5xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16">

            {/* Left: value prop */}
            <div className="flex-1 lg:max-w-[44%]">
              <p
                className="text-[10px] font-bold uppercase tracking-[0.3em] mb-4"
                style={{ color: "#D4AF37" }}
              >
                For Latter-day Saints · Free to start
              </p>
              <h1
                className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight mb-5"
                style={{ color: "#1A0D4A", fontFamily: "var(--font-heading, Georgia, serif)" }}
              >
                Your covenant
                <br />
                <span style={{ color: "#2D1B69" }}>journey,</span>
                <br />
                <span style={{ color: "#D4AF37" }}>elevated.</span>
              </h1>
              <p className="text-sm md:text-base leading-relaxed mb-7 max-w-sm" style={{ color: "#6B5FA0" }}>
                Prepare sacrament talks in minutes. Study Come Follow Me with AI. Strengthen your home and ward — all in one faith-positive place.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/talk-generator"
                  className="btn-primary-glow inline-flex items-center justify-center gap-2 rounded-xl font-bold text-sm shadow-lg"
                  style={{ background: "#D4AF37", color: "#1A1430", padding: "13px 28px" }}
                >
                  <MessageSquare size={15} />
                  Generate your talk — free
                </Link>
                <Link
                  href="/come-follow-me"
                  className="btn-outline-lift inline-flex items-center justify-center gap-2 rounded-xl font-semibold text-sm"
                  style={{ border: "1.5px solid #DDD5F0", color: "#2D1B69", background: "white", padding: "13px 22px" }}
                >
                  <BookOpen size={15} />
                  This week&apos;s CFM
                </Link>
              </div>
            </div>

            {/* Right: live typewriter preview */}
            <div className="flex-1 w-full lg:max-w-[56%]">
              <TypewriterPreview />
              <p className="text-center text-[10px] mt-3 font-medium" style={{ color: "#8B7EC0" }}>
                ✦ Real AI-generated talks — live preview
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* -- WHAT'S COOKING FEATURE GRID ------------------- */}
      <section className="px-4 py-14" style={{ background: "linear-gradient(180deg,#FDFAF5,#F0EBF8)" }}>
        <div className="max-w-5xl mx-auto">
          {/* Section header */}
          <div className="text-center mb-10">
            <div className="flex items-center gap-3 justify-center mb-3">
              <div className="h-px flex-1 max-w-20" style={{ background: "linear-gradient(to right, transparent, #DDD5F0)" }} />
              <ChefHat size={16} style={{ color: "#C8522A" }} />
              <div className="h-px flex-1 max-w-20" style={{ background: "linear-gradient(to left, transparent, #DDD5F0)" }} />
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] mb-1" style={{ color: "#C8522A" }}>
              What&apos;s Cooking · Sister App
            </p>
            <h2 className="text-2xl font-bold mb-2" style={{ color: "#2D1B69", fontFamily: "Georgia, serif" }}>
              The Kitchen, Reimagined
            </h2>
            <p className="text-sm max-w-md mx-auto" style={{ color: "#8B7EC0" }}>
              A new way to plan, discover, and cook — powered by AI, built for real kitchens.
            </p>
          </div>

          {/* Feature tiles */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {[
              { Icon: Utensils, title: "AI Meal Planner", desc: "Tell us your preferences and get a fully personalised weekly meal plan with shopping lists, built around your life.", accent: "#C8522A" },
              { Icon: TrendingUp, title: "Discover & Trending", desc: "Browse trending recipes from the community. Filter by cuisine, cooking time, dietary needs, or mood.", accent: "#D4884C" },
              { Icon: Link2, title: "Social Recipe Import", desc: "Spotted something on Instagram or TikTok? Paste the link and we extract every ingredient and step automatically.", accent: "#B06A3A" },
              { Icon: BookOpen, title: "Recipe Library", desc: "Save all your favourite recipes, plans, and ideas in one beautiful place. Always at hand, always organised.", accent: "#C8522A" },
              { Icon: Users, title: "Collaborative Cooking", desc: "Plan meals with family or friends in real time. Share notes, assign courses, and prep together effortlessly.", accent: "#D4884C" },
              { Icon: Zap, title: "Smart Recommendations", desc: "The more you cook, the smarter it gets. Personalised suggestions based on your taste, goals, and favourite cuisines.", accent: "#B06A3A" },
            ].map(({ Icon, title, desc, accent }) => (
              <div
                key={title}
                className="rounded-2xl p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
                style={{ background: "#FEFCFF", border: "1px solid #DDD5F0" }}
              >
                <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-3"
                  style={{ background: `${accent}18` }}>
                  <Icon size={15} style={{ color: accent }} />
                </div>
                <h3 className="font-bold text-sm mb-1.5" style={{ color: "#2D1B69" }}>{title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: "#8B7EC0" }}>{desc}</p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="flex justify-center">
            <a
              href="https://whatscooking.app"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm hover:scale-105 transition-transform shadow-sm"
              style={{ background: "#C8522A", color: "#fff" }}
            >
              <ChefHat size={14} />
              Try What&apos;s Cooking
              <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </section>

      {/* -- PITCH STRIP ------------------------------- */}
      <div className="border-y" style={{ background: "#FDFAF5", borderColor: "#DDD5F0" }}>
        <div className="max-w-5xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { icon: MessageSquare, label: "Sacrament Talks",  desc: "Ready in 60 seconds",       color: "#2D1B69" },
            { icon: BookOpen,      label: "Come Follow Me",   desc: "Always this week's lesson",  color: "#2D1B69" },
            { icon: TreePine,      label: "Family Roots",     desc: "Temple & genealogy tools",   color: "#2D1B69" },
            { icon: HomeIcon,      label: "FHE Lessons",      desc: "For all ages, every Monday", color: "#2D1B69" },
          ].map(({ icon: Icon, label, desc, color }) => (
            <div key={label} className="flex flex-col items-center text-center gap-2">
              <div className="p-3 rounded-xl" style={{ background: "rgba(212,175,55,0.10)", border: "1px solid rgba(212,175,55,0.2)" }}>
                <Icon size={18} style={{ color: "#D4AF37" }} />
              </div>
              <p className="text-sm font-semibold" style={{ color }}>{label}</p>
              <p className="text-xs leading-snug" style={{ color: "#8B7EC0" }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* -- SCRIPTURE ROTATION ------------------------- */}
      <ScriptureRotation />

      {/* -- STATS BAR ---------------------------------- */}
      <div style={{ background: "#EDE8F8", borderTop: "1px solid #DDD5F0", borderBottom: "1px solid #DDD5F0" }}>
        <div className="max-w-4xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { value: "17M+",  label: "Members worldwide" },
            { value: "170+",  label: "Countries served" },
            { value: "350+",  label: "Temples built or planned" },
            { value: "50K+",  label: "New missionaries yearly" },
          ].map(({ value, label }) => (
            <div key={label} className="text-center">
              <p className="text-3xl font-bold" style={{ color: "#2D1B69", fontFamily: "var(--font-heading, Georgia, serif)" }}>{value}</p>
              <p className="text-xs mt-1.5 font-medium" style={{ color: "#8B7EC0" }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* -- LDS NEWS & EVENTS -------------------------- */}
      <LdsNewsSection />

      {/* -- LDS VISUAL GRID ---------------------------- */}
      <section className="py-20 px-4 relative overflow-hidden" style={{ background: "linear-gradient(180deg,#FDFAF5,#F0EBF8)" }}>
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{ backgroundImage: "radial-gradient(#8B7EC0 1.5px, transparent 1.5px)", backgroundSize: "26px 26px" }} />
        <div className="max-w-5xl mx-auto relative">
          <p className="text-xs font-semibold uppercase tracking-widest text-center mb-3" style={{ color: "#8B7EC0" }}>Rooted in faith</p>
          <h2 className="text-3xl font-bold text-center mb-4" style={{ color: "#2D1B69" }}>Every tool, every calling, every home</h2>
          <p className="text-center max-w-xl mx-auto mb-12 text-base" style={{ color: "#6B5FA0" }}>
            Whether you&apos;re a nervous first-time speaker, a busy parent, or a dedicated teacher — HolyFlex meets you where you are.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">

            {/* Tall left — scripture study (contextually matched) */}
            <div className="relative rounded-2xl overflow-hidden row-span-2 min-h-[340px]">
              <Image src={PHOTOS.scripture} alt="Person studying scriptures" fill sizes="(max-width: 768px) 50vw, 33vw" className="object-cover" />
              <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(26,13,74,0.80) 0%, rgba(26,13,74,0.1) 60%)" }} />
              <div className="absolute bottom-4 left-4 right-4">
                <p className="text-sm font-bold mb-0.5" style={{ color: "#F5F0E8" }}>Scripture Study</p>
                <p className="text-xs" style={{ color: "#9BB89A" }}>Come Follow Me · Book of Mormon · D&amp;C</p>
              </div>
              <div className="absolute top-4 left-4">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: "rgba(45,27,105,0.85)", color: "#EDE8F8" }}>
                  <BookOpen size={10} className="inline mr-1" />CFM Companion
                </span>
              </div>
            </div>

            {/* Top middle — talk prep (person at podium/speaking) */}
            <div className="relative rounded-2xl overflow-hidden min-h-[160px]">
              <Image src={PHOTOS.talk} alt="Person giving a talk" fill sizes="(max-width: 768px) 50vw, 33vw" className="object-cover" />
              <div className="absolute inset-0" style={{ background: "rgba(20,35,20,0.45)" }} />
              <div className="absolute bottom-3 left-3">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: "rgba(255,255,255,0.15)", color: "#F5F0E8" }}>
                  <MessageSquare size={10} className="inline mr-1" />Talk Prep
                </span>
              </div>
            </div>

            {/* Top right — prayer / personal revelation */}
            <div className="relative rounded-2xl overflow-hidden min-h-[160px]">
              <Image src={PHOTOS.prayer} alt="Person in prayer" fill sizes="(max-width: 768px) 50vw, 33vw" className="object-cover" />
              <div className="absolute inset-0" style={{ background: "rgba(30,25,40,0.5)" }} />
              <div className="absolute bottom-3 left-3">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: "rgba(255,255,255,0.15)", color: "#F5F0E8" }}>
                  Personal Revelation
                </span>
              </div>
            </div>

            {/* Bottom middle — family at home */}
            <div className="relative rounded-2xl overflow-hidden min-h-[160px]">
              <Image src={PHOTOS.family} alt="Family together at home" fill sizes="(max-width: 768px) 50vw, 33vw" className="object-cover" />
              <div className="absolute inset-0" style={{ background: "rgba(20,20,35,0.42)" }} />
              <div className="absolute bottom-3 left-3">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: "rgba(255,255,255,0.15)", color: "#F5F0E8" }}>
                  <HomeIcon size={10} className="inline mr-1" />Family Home Evening
                </span>
              </div>
            </div>

            {/* Bottom right — Agapé / connection */}
            <Link href="/agape" className="relative rounded-2xl overflow-hidden min-h-[160px] flex flex-col items-center justify-center gap-3"
              style={{ background: "linear-gradient(135deg, #2D1A2D, #4A2A4A)" }}>
              <div className="absolute inset-0 opacity-[0.06]"
                style={{ backgroundImage: "radial-gradient(#E8C4E8 1px, transparent 1px)", backgroundSize: "18px 18px" }} />
              <div className="relative z-10 w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"
                style={{ background: "linear-gradient(135deg, #B05A8A, #C87070)" }}>
                <HeartHandshake size={22} fill="white" stroke="none" />
              </div>
              <div className="relative z-10 text-center px-4">
                <p className="text-sm font-bold" style={{ color: "#F0E8F0" }}>Agapé</p>
                <p className="text-xs mt-0.5" style={{ color: "#B09AB0" }}>Blind gospel reflections</p>
              </div>
            </Link>

          </div>
        </div>
      </section>

      {/* -- ECOSYSTEM ---------------------------------- */}
      <EcosystemSection />

      {/* -- AGAPÉ AD ----------------------------------- */}
      <section className="px-4 pb-6" style={{ background: "linear-gradient(180deg,#F0EBF8,#FDFAF5)" }}>
        <div className="max-w-5xl mx-auto">
          <div className="rounded-3xl overflow-hidden relative"
            style={{ background: "linear-gradient(135deg, #1A0A1A 0%, #2D1A2D 55%, #4A2A4A 100%)" }}>
            <div className="absolute inset-0 hf-noise" />
            <div className="absolute inset-0 opacity-[0.05]"
              style={{ backgroundImage: "radial-gradient(#E8C4E8 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
            {/* Large decorative watermark */}
            <div aria-hidden className="absolute inset-0 pointer-events-none flex items-center justify-end overflow-hidden select-none pr-6 opacity-80">
              <span className="font-bold" style={{ fontSize: "clamp(60px,14vw,140px)", color: "rgba(176,90,138,0.06)", fontFamily: "Georgia,serif", transform:"rotate(-5deg)" }}>
                Agapé
              </span>
            </div>
            <div className="relative px-8 py-8 flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <div className="flex-1">
                <span className="inline-block text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full mb-2"
                  style={{ background: "rgba(176,90,138,0.2)", color: "#E8A8D0" }}>HolyFlex Agapé</span>
                <h2 className="text-2xl font-bold text-white mb-2">💜 Sacred reflections, shared together</h2>
                <p className="text-sm leading-relaxed max-w-lg" style={{ color: "#C0A0C0" }}>
                  You and a partner receive the same gospel prompt. You each answer privately — neither sees the other&apos;s
                  response until both have submitted. Then the curtain lifts.
                </p>
                <div className="flex flex-wrap gap-2 mt-5">
                  {["With a ward friend", "Via share link", "With a random match"].map((label) => (
                    <span key={label} className="text-xs font-medium px-3 py-1 rounded-full"
                      style={{ background: "rgba(176,90,138,0.18)", color: "#E8A8D0", border: "1px solid rgba(176,90,138,0.3)" }}>
                      {label}
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap gap-3 mt-5">
                  <Link href="/agape" className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm hover:scale-105 transition-transform"
                    style={{ background: "linear-gradient(135deg, #B05A8A, #C87070)", color: "white" }}>
                    <HeartHandshake size={14} />Start a Reflection
                  </Link>
                  <Link href="/agape" className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm"
                    style={{ background: "rgba(255,255,255,0.08)", color: "#E8A8D0", border: "1px solid rgba(176,90,138,0.25)" }}>
                    See how it works →
                  </Link>
                </div>
              </div>
              <div className="text-6xl shrink-0 hidden sm:block select-none">💜</div>
            </div>
          </div>
        </div>
      </section>

      {/* -- SPEAK SPOTLIGHT ---------------------------- */}
      <section className="py-20 px-4" style={{ background: "linear-gradient(180deg,#FDFAF5,#F0EBF8)" }}>
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#8B7EC0" }}>HolyFlex Speak</p>
            <h2 className="text-3xl font-bold mb-5" style={{ color: "#2D1B69" }}>Never feel unprepared for a talk again</h2>
            <p className="text-base leading-relaxed mb-6" style={{ color: "#6B5FA0" }}>
              Got a sacrament talk assigned? HolyFlex Speak builds you a structured, scripturally grounded
              starting point in under 60 seconds — complete with opening, teaching points, stories, and a close.
            </p>
            <ul className="space-y-2.5 mb-8">
              {["Sacrament Meeting talks", "Family Home Evening lessons", "Sunday School & youth classes", "All four standard works referenced"].map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-sm" style={{ color: "#6B5FA0" }}>
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#D4AF37" }} />
                  {f}
                </li>
              ))}
            </ul>
            <Link href="/talk-generator" className="inline-flex items-center gap-2 rounded-xl font-semibold text-sm"
              style={{ background: "#2D1B69", color: "#FDFAF5", padding: "14px 28px" }}>
              Prepare Your Talk <ArrowRight size={14} />
            </Link>
          </div>
          <div className="relative">
            <div className="rounded-2xl overflow-hidden shadow-xl">
              <div className="relative h-52">
                <Image src={PHOTOS.scripture} alt="Studying scriptures" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
                <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 30%, #FEFCFF 100%)" }} />
              </div>
              <div className="px-6 pb-6 pt-2" style={{ background: "#FEFCFF" }}>
                <div className="h-4 rounded mb-2" style={{ background: "#EDE8F8", width: "65%" }} />
                <div className="h-3 rounded mb-1.5" style={{ background: "#F0EBF8", width: "100%" }} />
                <div className="h-3 rounded mb-1.5" style={{ background: "#F0EBF8", width: "88%" }} />
                <div className="h-3 rounded mb-4"  style={{ background: "#F0EBF8", width: "78%" }} />
                <div className="flex gap-2">
                  <div className="h-7 w-20 rounded-lg" style={{ background: "#EDE8F8" }} />
                  <div className="h-7 w-20 rounded-lg" style={{ background: "#F5F0FF" }} />
                </div>
              </div>
            </div>
            <div className="absolute -bottom-3 -left-3 px-3 py-2 rounded-xl shadow-lg text-xs font-semibold"
              style={{ background: "#2D1B69", color: "#FDFAF5" }}>✓ Ready in under 60 seconds</div>
          </div>
        </div>
      </section>

      {/* -- MISSION AD --------------------------------- */}
      <section className="px-4 pb-6" style={{ background: "linear-gradient(180deg,#F0EBF8,#FDFAF5)" }}>
        <div className="max-w-5xl mx-auto">
          <div className="rounded-3xl overflow-hidden relative"
            style={{ background: "linear-gradient(135deg, #0F1F2E 0%, #1A3550 55%, #2A5080 100%)" }}>
            <div className="absolute inset-0 hf-noise" />
            <div className="absolute inset-0 opacity-[0.04]"
              style={{ backgroundImage: "radial-gradient(#A8C4E8 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
            <div aria-hidden className="absolute inset-0 pointer-events-none flex items-center justify-end overflow-hidden select-none pr-6">
              <span className="font-bold uppercase" style={{ fontSize: "clamp(60px,13vw,140px)", color: "rgba(168,196,232,0.05)", fontFamily: "Georgia,serif", letterSpacing:"0.1em", transform:"rotate(-4deg)" }}>
                Mission
              </span>
            </div>
            <div className="relative px-8 py-7 flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <div className="flex-1">
                <span className="inline-block text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full mb-2"
                  style={{ background: "rgba(168,196,232,0.15)", color: "#A8C4E8" }}>HolyFlex Mission</span>
                <h2 className="text-2xl font-bold text-white mb-2">🌍 Plan Your Mission Journey</h2>
                <p className="text-sm leading-relaxed max-w-lg" style={{ color: "#A8C4E8" }}>
                  Follow missionaries around the world, track your prep checklist, discover mission stories from social media,
                  and connect posts to your travel planner.
                </p>
                <div className="flex flex-wrap gap-3 mt-4">
                  <Link href="/mission" className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm hover:scale-105 transition-transform"
                    style={{ background: "#A8C4E8", color: "#0F1F2E" }}>
                    <Compass size={14} />Explore Mission Hub
                  </Link>
                  <Link href="/mission" className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm"
                    style={{ background: "rgba(255,255,255,0.1)", color: "#A8C4E8", border: "1px solid rgba(168,196,232,0.25)" }}>
                    Mission Prep Checklist →
                  </Link>
                </div>
              </div>
              <div className="text-6xl shrink-0 hidden sm:block select-none">✈️</div>
            </div>
          </div>
        </div>
      </section>

      {/* -- LEARN AD ----------------------------------- */}
      <section className="px-4 pb-16" style={{ background: "linear-gradient(180deg,#FDFAF5,#F0EBF8)" }}>
        <div className="max-w-5xl mx-auto">
          <div className="rounded-3xl overflow-hidden relative"
            style={{ background: "linear-gradient(135deg, #1A2E20 0%, #2A5038 55%, #3A7050 100%)" }}>
            <div className="absolute inset-0 hf-noise" />
            <div className="absolute inset-0 opacity-[0.04]"
              style={{ backgroundImage: "radial-gradient(#9BB89A 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
            <div aria-hidden className="absolute inset-0 pointer-events-none flex items-center justify-end overflow-hidden select-none pr-6">
              <span className="font-bold uppercase" style={{ fontSize: "clamp(60px,13vw,140px)", color: "rgba(155,184,154,0.05)", fontFamily: "Georgia,serif", letterSpacing:"0.1em", transform:"rotate(-4deg)" }}>
                Learn
              </span>
            </div>
            <div className="relative px-8 py-7 flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <div className="flex-1">
                <span className="inline-block text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full mb-2"
                  style={{ background: "rgba(155,184,154,0.2)", color: "#9BB89A" }}>HolyFlex Learn</span>
                <h2 className="text-2xl font-bold text-white mb-2">📖 Study the Gospel Like Never Before</h2>
                <p className="text-sm leading-relaxed max-w-lg" style={{ color: "#9BB89A" }}>
                  A learning roadmap through the scriptures — track progress, take quizzes, create classrooms with friends,
                  and use everything you learn to build better talks and lessons.
                </p>
                <div className="flex flex-wrap gap-3 mt-4">
                  <Link href="/learn" className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm hover:scale-105 transition-transform"
                    style={{ background: "#9BB89A", color: "#1A2E20" }}>
                    <GraduationCap size={14} />Start Learning
                  </Link>
                  <Link href="/learn" className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm"
                    style={{ background: "rgba(255,255,255,0.1)", color: "#9BB89A", border: "1px solid rgba(155,184,154,0.25)" }}>
                    View Learning Roadmap →
                  </Link>
                </div>
              </div>
              <div className="text-6xl shrink-0 hidden sm:block select-none">🗺️</div>
            </div>
          </div>
        </div>
      </section>

      {/* -- CFM SPOTLIGHT ------------------------------ */}
      <section className="py-20 px-4" style={{ background: "linear-gradient(135deg,#EDE8F8,#DDD5F0)" }}>
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div className="rounded-2xl shadow-xl overflow-hidden border order-2 md:order-1" style={{ borderColor: "#DDD5F0", background: "#FEFCFF" }}>
            <div className="px-4 py-3 border-b flex items-center gap-3" style={{ background: "#EDE8F8", borderColor: "#DDD5F0" }}>
              <BookMarked size={18} style={{ color: "#2D1B69" }} />
              <p className="text-xs font-medium" style={{ color: "#2D1B69" }}>📖 Come Follow Me · Week 14 · D&amp;C 49–56</p>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex justify-end">
                <div className="rounded-2xl rounded-br-sm px-4 py-2.5 text-sm max-w-[85%]" style={{ background: "#2D1B69", color: "#EDE8F8" }}>
                  Summarize this week&apos;s lesson for my 8-year-old
                </div>
              </div>
              <div className="flex justify-start gap-2">
                <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-1 text-xs font-bold" style={{ background: "#EDE8F8", color: "#2D1B69" }}>H</div>
                <div className="rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm max-w-[85%]" style={{ background: "#EDE8F8", color: "#1A1430" }}>
                  This week we learn that Heavenly Father wants everyone to hear His gospel.
                  Sections 49–56 teach us to seek God&apos;s kingdom first and trust His plan. ✨
                </div>
              </div>
              <div className="flex justify-end">
                <div className="rounded-2xl rounded-br-sm px-4 py-2.5 text-sm" style={{ background: "#2D1B69", color: "#EDE8F8" }}>
                  Give me a FHE activity idea for tonight
                </div>
              </div>
            </div>
          </div>
          <div className="order-1 md:order-2">
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#D4AF37" }}>HolyFlex Study</p>
            <h2 className="text-3xl font-bold mb-5" style={{ color: "#2D1B69" }}>Your Come Follow Me companion, always current</h2>
            <p className="text-base leading-relaxed mb-6" style={{ color: "#6B5FA0" }}>
              HolyFlex Study always knows this week&apos;s lesson. Ask anything — explain a hard verse,
              generate discussion questions, or get a family activity idea.
            </p>
            <Link href="/come-follow-me" className="inline-flex items-center gap-2 rounded-xl font-semibold text-sm"
              style={{ background: "#D4AF37", color: "#1A1430", padding: "14px 28px" }}>
              Open CFM Companion <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* -- ROOTS CALLOUT ------------------------------ */}
      <section className="py-20 px-4 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg,#1A0D4A,#2D1B69)" }}>
        {/* Noise grain for rustic feel */}
        <div className="absolute inset-0 hf-noise" />
        {/* Dot grid */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.06]"
          style={{ backgroundImage: "radial-gradient(#D4AF37 1px, transparent 1px)", backgroundSize: "22px 22px" }} />
        {/* Large decorative watermark */}
        <div aria-hidden className="absolute inset-0 pointer-events-none flex items-center justify-end overflow-hidden select-none pr-8">
          <span className="font-bold uppercase"
            style={{ fontSize: "clamp(80px,18vw,200px)", color: "rgba(212,175,55,0.06)", fontFamily: "Georgia,serif", letterSpacing:"0.12em", transform:"rotate(-6deg)" }}>
            Roots
          </span>
        </div>
        <div className="max-w-5xl mx-auto relative grid md:grid-cols-2 gap-12 items-center">
          <div className="relative rounded-2xl overflow-hidden h-72 shadow-2xl">
            <Image src={PHOTOS.genealogy} alt="Old family photographs" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
            <div className="absolute inset-0" style={{ background: "rgba(45,31,20,0.45)" }} />
            <div className="absolute bottom-5 left-5">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
                style={{ background: "rgba(232,180,154,0.2)", color: "#E8C4A0", border: "1px solid rgba(232,180,154,0.3)" }}>
                <GitBranch size={12} />Powered by FamilySearch
              </div>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#D4AF37" }}>HolyFlex Roots</p>
            <h2 className="text-3xl font-bold mb-5" style={{ color: "#F5F0FF" }}>Bring your ancestors&apos; stories to life</h2>
            <p className="text-base leading-relaxed mb-4" style={{ color: "#A89CD8" }}>
              FamilySearch holds over 8 billion records. HolyFlex Roots turns your family history data into
              readable, shareable narratives your whole family will treasure.
            </p>
            <p className="text-sm leading-relaxed mb-8" style={{ color: "#8B7EC0" }}>
              &ldquo;And he shall turn the heart of the fathers to the children.&rdquo; —{" "}
              <em style={{ color: "#D4AF37" }}>Malachi 4:6</em>
            </p>
            <div className="flex items-center gap-3">
              <span className="px-4 py-2 rounded-full text-xs font-semibold"
                style={{ background: "rgba(212,175,55,0.12)", color: "#D4AF37", border: "1px solid rgba(212,175,55,0.3)" }}>
                Coming soon
              </span>
              <Link href="/pricing" className="text-sm font-medium" style={{ color: "#D4AF37" }}>Get early access →</Link>
            </div>
          </div>
        </div>
      </section>

      {/* -- SCRIPTURE DIVIDER -------------------------- */}
      {/* hf-image-fade-top/bottom make the fade start when ~20% of image is still visible */}
      <div className="relative h-64 overflow-hidden hf-image-fade-top hf-image-fade-bottom"
        style={{ "--fade-to": "#F0EBF8" } as React.CSSProperties}>
        <Image src={PHOTOS.nature} alt="Green mountain forest" fill sizes="100vw" className="object-cover" />
        {/* Base tint */}
        <div className="absolute inset-0" style={{ background: "rgba(26,13,74,0.65)" }} />
        {/* Aggressive top+bottom gradient — fade starts at 25% from each edge */}
        <div className="absolute inset-0" style={{
          background: "linear-gradient(to bottom, rgba(26,13,74,0.95) 0%, transparent 25%, transparent 75%, rgba(26,13,74,0.95) 100%)"
        }} />
        {/* Noise grain for rustic feel */}
        <div className="absolute inset-0 hf-noise" />
        {/* Text */}
        <div className="absolute inset-0 flex items-center justify-center text-center px-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] mb-3" style={{ color: "rgba(212,175,55,0.8)" }}>
              D&amp;C 11:23
            </p>
            <p className="text-2xl font-bold mb-2 leading-snug"
              style={{ color: "#E8DDD0", fontFamily: "Georgia,'Times New Roman',serif", textShadow: "0 2px 12px rgba(0,0,0,0.5)" }}>
              &ldquo;Seek ye first the kingdom of God.&rdquo;
            </p>
            <p className="text-sm" style={{ color: "#8B7EC0" }}>Matthew 6:33 · Doctrine &amp; Covenants 11:23</p>
          </div>
        </div>
      </div>

      {/* -- COMMUNITY ---------------------------------- */}
      <CommunitySection />


      {/* -- VALUES ------------------------------------- */}
      <section className="py-16 px-4" style={{ background: "linear-gradient(135deg,#EDE8F8,#DDD5F0)" }}>
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-10" style={{ color: "#2D1B69" }}>Why members trust HolyFlex</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map(({ icon: Icon, title, description }) => (
              <div key={title} className="text-center">
                <div className="flex justify-center mb-3">
                  <div className="p-3 rounded-full" style={{ background: "linear-gradient(135deg,#FDF5DC,#F5E8B0)" }}>
                    <Icon size={18} style={{ color: "#D4AF37" }} />
                  </div>
                </div>
                <h3 className="font-semibold mb-1" style={{ color: "#2D1B69" }}>{title}</h3>
                <p className="text-sm" style={{ color: "#6B5FA0" }}>{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* -- FINAL CTA ---------------------------------- */}
      <section className="relative py-24 px-4 text-center overflow-hidden hf-image-fade-top"
        style={{ "--fade-to": "#DDD5F0" } as React.CSSProperties}>
        <Image src={PHOTOS.stars} alt="Starry mountain night" fill sizes="100vw" className="object-cover" />
        {/* Base tint */}
        <div className="absolute inset-0" style={{ background: "rgba(26,13,74,0.82)" }} />
        {/* Early top fade — starts at 30% from top so image bleeds gracefully */}
        <div className="absolute inset-0" style={{
          background: "linear-gradient(to bottom, rgba(26,13,74,0.96) 0%, transparent 30%, transparent 100%)"
        }} />
        {/* Noise grain */}
        <div className="absolute inset-0 hf-noise" />
        <div className="relative z-10 max-w-2xl mx-auto">
          <Logo size="lg" className="justify-center mb-6" />
          <h2 className="text-3xl font-bold mb-4" style={{ color: "#F5F0FF" }}>Start strengthening your faith today</h2>
          <p className="mb-10 text-base" style={{ color: "#A89CD8" }}>
            Free to start. No account required. Built for the community, by someone who cares about it.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/talk-generator" className="inline-flex items-center justify-center gap-2 rounded-xl font-semibold text-base shadow-xl"
              style={{ background: "#D4AF37", color: "#1A1430", padding: "16px 36px" }}>
              Prepare Your First Talk <ArrowRight size={16} />
            </Link>
            <Link href="/pricing" className="inline-flex items-center justify-center gap-2 rounded-xl font-semibold text-base"
              style={{ border: "2px solid #8B7EC0", color: "#C8BCEC", padding: "16px 28px" }}>
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* -- DISCLAIMER --------------------------------- */}
      <section className="py-8 px-4" style={{ background: "linear-gradient(135deg,#1A0D4A,#2D1B69)" }}>
        <div className="max-w-2xl mx-auto text-center text-sm">
          <p className="font-medium mb-1.5" style={{ color: "#C8BCEC" }}>A note on AI and personal revelation</p>
          <p style={{ color: "#8B7EC0" }}>
            HolyFlex is a preparation tool, not a spiritual authority. All generated content is a starting point.
            Study the scriptures, pray, and let the Spirit guide your testimony.
          </p>
        </div>
      </section>
    </div>
  );
}
