import React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  MessageSquare, BookOpen, ArrowRight, Users, Shield,
  Zap, Heart, GitBranch, TreePine, BookMarked, Home as HomeIcon,
  Compass, GraduationCap, HeartHandshake,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EcosystemSection } from "@/components/ecosystem-section";
import { CommunitySection } from "@/components/community-section";
import { HeroSlideshow } from "@/components/hero-slideshow";
import { Logo } from "@/components/logo";
import { WhatsCookingAd } from "@/components/whats-cooking-ad";
import { ScriptureRotation } from "@/components/scripture-rotation";
import { LdsNewsSection } from "@/components/lds-news-section";

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


const values = [
  { icon: Shield, title: "Faith-Positive",   description: "Built on General Conference talks and all four standard works. Never hostile to your faith." },
  { icon: Heart,  title: "Community First",  description: "Built to serve members, not commercialize faith. Your trust matters more than revenue." },
  { icon: Zap,    title: "Saves Hours",       description: "Members spend 4–8 hours preparing a talk. HolyFlex gives you a solid foundation in minutes." },
  { icon: Users,  title: "Family-Centered",  description: "From Sunbeams to senior missionaries — tools for every age and calling." },
];

const stats = [
  { value: "17M+", label: "Members worldwide" },
  { value: "170+", label: "Countries served" },
  { value: "350+", label: "Temples built or planned" },
  { value: "50K+", label: "New missionaries yearly" },
];

const pitchItems = [
  { icon: MessageSquare, label: "Sacrament Talks", desc: "Ready in 60 seconds",         color: "#4A7A4A", bg: "linear-gradient(135deg,#EDF5ED,#D8EDD8)" },
  { icon: BookOpen,      label: "Come Follow Me",  desc: "Always this week's lesson",   color: "#C87A50", bg: "linear-gradient(135deg,#FDF0E8,#F5E0D0)" },
  { icon: TreePine,      label: "Family Roots",    desc: "Powered by FamilySearch",     color: "#7A5A3A", bg: "linear-gradient(135deg,#F5EFE8,#EDE0D0)" },
  { icon: HomeIcon,      label: "FHE Lessons",     desc: "For all ages at home",        color: "#3A6A8A", bg: "linear-gradient(135deg,#EDF2F8,#DCE7F5)" },
];

export default function Home() {
  return (
    <div className="flex flex-col" style={{ background: "#FDFAF3" }}>

      {/* ── COMPACT HERO ─── ~1/4 height of original */}
      <section
        className="relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #1E3320 0%, #2D4A2D 55%, #3A5A3A 100%)" }}
      >
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{ backgroundImage: "radial-gradient(#9BB89A 1px, transparent 1px)", backgroundSize: "22px 22px" }}
        />
        <div className="relative max-w-7xl mx-auto px-6 lg:px-10">
          <div className="flex flex-col lg:flex-row items-center gap-6 py-7 lg:py-9">

            {/* Left: text */}
            <div className="flex-1 lg:pr-8">
              <Badge
                className="mb-3 w-fit px-3 py-1 text-xs font-medium"
                style={{ background: "rgba(232,180,154,0.18)", color: "#E8C4A0", border: "1px solid rgba(232,180,154,0.35)" }}
              >
                2026 · Come Follow Me — D&amp;C · Easter Season 🌅
              </Badge>

              <h1 className="text-2xl md:text-3xl font-bold mb-2.5 leading-tight tracking-tight" style={{ color: "#F5F0E8" }}>
                Your gospel toolkit for{" "}
                <span style={{ color: "#E8C49A" }}>Latter-day Saints</span>
              </h1>

              <p className="text-sm mb-4 max-w-lg leading-relaxed" style={{ color: "#A8C4A8" }}>
                Prepare sacrament talks, study Come Follow Me, trace your family roots,
                and strengthen your home — all in one faith-positive place.
              </p>

              <div className="flex flex-wrap gap-1.5 mb-5">
                {pitchItems.map(({ icon: Icon, label }) => (
                  <span
                    key={label}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                    style={{ background: "rgba(255,255,255,0.07)", color: "#C8DCC8", border: "1px solid rgba(155,184,154,0.25)" }}
                  >
                    <Icon size={10} />
                    {label}
                  </span>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/talk-generator"
                  className="inline-flex items-center justify-center gap-2 rounded-xl font-semibold text-sm shadow-lg"
                  style={{ background: "#E8B49A", color: "#2D1A0E", padding: "11px 26px" }}
                >
                  <MessageSquare size={15} />
                  Prepare a Talk or Lesson
                </Link>
                <Link
                  href="/come-follow-me"
                  className="inline-flex items-center justify-center gap-2 rounded-xl font-semibold text-sm"
                  style={{ border: "2px solid #6A8A6A", color: "#C8E0C8", background: "transparent", padding: "11px 22px" }}
                >
                  <BookOpen size={15} />
                  This Week&apos;s CFM
                </Link>
              </div>
            </div>

            {/* Right: compact slideshow */}
            <div className="w-full lg:w-[36%] flex-shrink-0 hidden lg:block" style={{ maxWidth: 380 }}>
              <div style={{ height: 200 }}>
                <HeroSlideshow />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── WHAT'S COOKING AD — topmost feature section ── */}
      <WhatsCookingAd />

      {/* ── ELEVATOR PITCH STRIP ─────────────────────── */}
      <div className="border-y" style={{ background: "linear-gradient(180deg,#FEFCF7,#F5F0E8)", borderColor: "#DDE8DD" }}>
        <div className="max-w-5xl mx-auto px-4 py-8 grid grid-cols-2 md:grid-cols-4 gap-5">
          {pitchItems.map(({ icon: Icon, label, desc, color, bg }) => (
            <div key={label} className="flex flex-col items-center text-center gap-2">
              <div className="p-3 rounded-xl" style={{ background: bg }}>
                <Icon size={20} style={{ color }} />
              </div>
              <p className="text-sm font-semibold" style={{ color: "#2D4A2D" }}>{label}</p>
              <p className="text-xs" style={{ color: "#9AAA9A" }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── SCRIPTURE ROTATION ───────────────────────── */}
      <ScriptureRotation />

      {/* ── STATS BAR ────────────────────────────────── */}
      <div style={{ background: "linear-gradient(135deg,#F5F0E8,#EDE8DC)" }}>
        <div className="max-w-4xl mx-auto px-4 py-10 grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map(({ value, label }) => (
            <div key={label} className="text-center">
              <p className="text-3xl font-bold" style={{ color: "#4A7A4A" }}>{value}</p>
              <p className="text-xs mt-1" style={{ color: "#9AAA9A" }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── LDS NEWS & EVENTS ────────────────────────── */}
      <LdsNewsSection />

      {/* ── LDS VISUAL GRID ──────────────────────────── */}
      <section className="py-20 px-4 relative overflow-hidden" style={{ background: "linear-gradient(180deg,#FDFAF3,#F5F0E8)" }}>
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{ backgroundImage: "radial-gradient(#4A7A4A 1.5px, transparent 1.5px)", backgroundSize: "26px 26px" }} />
        <div className="max-w-5xl mx-auto relative">
          <p className="text-xs font-semibold uppercase tracking-widest text-center mb-3" style={{ color: "#9BB89A" }}>Rooted in faith</p>
          <h2 className="text-3xl font-bold text-center mb-4" style={{ color: "#2D4A2D" }}>Every tool, every calling, every home</h2>
          <p className="text-center max-w-xl mx-auto mb-12 text-base" style={{ color: "#7A9A7A" }}>
            Whether you&apos;re a nervous first-time speaker, a busy parent, or a dedicated teacher — HolyFlex meets you where you are.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">

            {/* Tall left — scripture study (contextually matched) */}
            <div className="relative rounded-2xl overflow-hidden row-span-2 min-h-[340px]">
              <Image src={PHOTOS.scripture} alt="Person studying scriptures" fill sizes="(max-width: 768px) 50vw, 33vw" className="object-cover" />
              <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(20,35,20,0.75) 0%, rgba(20,35,20,0.1) 60%)" }} />
              <div className="absolute bottom-4 left-4 right-4">
                <p className="text-sm font-bold mb-0.5" style={{ color: "#F5F0E8" }}>Scripture Study</p>
                <p className="text-xs" style={{ color: "#9BB89A" }}>Come Follow Me · Book of Mormon · D&amp;C</p>
              </div>
              <div className="absolute top-4 left-4">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: "rgba(74,122,74,0.85)", color: "#F5F0E8" }}>
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

      {/* ── ECOSYSTEM ────────────────────────────────── */}
      <EcosystemSection />

      {/* ── AGAPÉ AD ─────────────────────────────────── */}
      <section className="px-4 pb-6" style={{ background: "linear-gradient(180deg,#F5F0E8,#FDFAF3)" }}>
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

      {/* ── SPEAK SPOTLIGHT ──────────────────────────── */}
      <section className="py-20 px-4" style={{ background: "linear-gradient(180deg,#FDFAF3,#F5F0E8)" }}>
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#9BB89A" }}>HolyFlex Speak</p>
            <h2 className="text-3xl font-bold mb-5" style={{ color: "#2D4A2D" }}>Never feel unprepared for a talk again</h2>
            <p className="text-base leading-relaxed mb-6" style={{ color: "#6B7A6B" }}>
              Got a sacrament talk assigned? HolyFlex Speak builds you a structured, scripturally grounded
              starting point in under 60 seconds — complete with opening, teaching points, stories, and a close.
            </p>
            <ul className="space-y-2.5 mb-8">
              {["Sacrament Meeting talks", "Family Home Evening lessons", "Sunday School & youth classes", "All four standard works referenced"].map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-sm" style={{ color: "#5A7A5A" }}>
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#9BB89A" }} />
                  {f}
                </li>
              ))}
            </ul>
            <Link href="/talk-generator" className="inline-flex items-center gap-2 rounded-xl font-semibold text-sm"
              style={{ background: "#4A7A4A", color: "#F5F0E8", padding: "14px 28px" }}>
              Prepare Your Talk <ArrowRight size={14} />
            </Link>
          </div>
          <div className="relative">
            <div className="rounded-2xl overflow-hidden shadow-xl">
              <div className="relative h-52">
                <Image src={PHOTOS.scripture} alt="Studying scriptures" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
                <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 30%, #FEFCF7 100%)" }} />
              </div>
              <div className="px-6 pb-6 pt-2" style={{ background: "#FEFCF7" }}>
                <div className="h-4 rounded mb-2" style={{ background: "#EDF5ED", width: "65%" }} />
                <div className="h-3 rounded mb-1.5" style={{ background: "#F0F5F0", width: "100%" }} />
                <div className="h-3 rounded mb-1.5" style={{ background: "#F0F5F0", width: "88%" }} />
                <div className="h-3 rounded mb-4"  style={{ background: "#F0F5F0", width: "78%" }} />
                <div className="flex gap-2">
                  <div className="h-7 w-20 rounded-lg" style={{ background: "#EDF5ED" }} />
                  <div className="h-7 w-20 rounded-lg" style={{ background: "#F5F0E8" }} />
                </div>
              </div>
            </div>
            <div className="absolute -bottom-3 -left-3 px-3 py-2 rounded-xl shadow-lg text-xs font-semibold"
              style={{ background: "#4A7A4A", color: "#F5F0E8" }}>✓ Ready in under 60 seconds</div>
          </div>
        </div>
      </section>

      {/* ── MISSION AD ───────────────────────────────── */}
      <section className="px-4 pb-6" style={{ background: "linear-gradient(180deg,#F5F0E8,#FDFAF3)" }}>
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

      {/* ── LEARN AD ─────────────────────────────────── */}
      <section className="px-4 pb-16" style={{ background: "linear-gradient(180deg,#FDFAF3,#F5F0E8)" }}>
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

      {/* ── CFM SPOTLIGHT ────────────────────────────── */}
      <section className="py-20 px-4" style={{ background: "linear-gradient(135deg,#F5F0E8,#EDE8DC)" }}>
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div className="rounded-2xl shadow-xl overflow-hidden border order-2 md:order-1" style={{ borderColor: "#DDE8DD", background: "#FEFCF7" }}>
            <div className="px-4 py-3 border-b flex items-center gap-3" style={{ background: "#EDF5ED", borderColor: "#DDE8DD" }}>
              <BookMarked size={18} style={{ color: "#4A7A4A" }} />
              <p className="text-xs font-medium" style={{ color: "#4A7A4A" }}>📖 Come Follow Me · Week 14 · D&amp;C 49–56</p>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex justify-end">
                <div className="rounded-2xl rounded-br-sm px-4 py-2.5 text-sm max-w-[85%]" style={{ background: "#3D6040", color: "#F5F0E8" }}>
                  Summarize this week&apos;s lesson for my 8-year-old
                </div>
              </div>
              <div className="flex justify-start gap-2">
                <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-1 text-xs font-bold" style={{ background: "#EDF5ED", color: "#4A7A4A" }}>H</div>
                <div className="rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm max-w-[85%]" style={{ background: "#EDF5ED", color: "#2D4A2D" }}>
                  This week we learn that Heavenly Father wants everyone to hear His gospel.
                  Sections 49–56 teach us to seek God&apos;s kingdom first and trust His plan. ✨
                </div>
              </div>
              <div className="flex justify-end">
                <div className="rounded-2xl rounded-br-sm px-4 py-2.5 text-sm" style={{ background: "#3D6040", color: "#F5F0E8" }}>
                  Give me a FHE activity idea for tonight
                </div>
              </div>
            </div>
          </div>
          <div className="order-1 md:order-2">
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#C87A50" }}>HolyFlex Study</p>
            <h2 className="text-3xl font-bold mb-5" style={{ color: "#2D4A2D" }}>Your Come Follow Me companion, always current</h2>
            <p className="text-base leading-relaxed mb-6" style={{ color: "#6B7A6B" }}>
              HolyFlex Study always knows this week&apos;s lesson. Ask anything — explain a hard verse,
              generate discussion questions, or get a family activity idea.
            </p>
            <Link href="/come-follow-me" className="inline-flex items-center gap-2 rounded-xl font-semibold text-sm"
              style={{ background: "#C87A50", color: "#FDF5EE", padding: "14px 28px" }}>
              Open CFM Companion <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── ROOTS CALLOUT ────────────────────────────── */}
      <section className="py-20 px-4 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg,#2D1F14,#3D2820)" }}>
        {/* Noise grain for rustic feel */}
        <div className="absolute inset-0 hf-noise" />
        {/* Dot grid */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.06]"
          style={{ backgroundImage: "radial-gradient(#E8B49A 1px, transparent 1px)", backgroundSize: "22px 22px" }} />
        {/* Large decorative watermark */}
        <div aria-hidden className="absolute inset-0 pointer-events-none flex items-center justify-end overflow-hidden select-none pr-8">
          <span className="font-bold uppercase"
            style={{ fontSize: "clamp(80px,18vw,200px)", color: "rgba(232,180,154,0.04)", fontFamily: "Georgia,serif", letterSpacing:"0.12em", transform:"rotate(-6deg)" }}>
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
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#C8A070" }}>HolyFlex Roots</p>
            <h2 className="text-3xl font-bold mb-5" style={{ color: "#F0E8DC" }}>Bring your ancestors&apos; stories to life</h2>
            <p className="text-base leading-relaxed mb-4" style={{ color: "#A89080" }}>
              FamilySearch holds over 8 billion records. HolyFlex Roots turns your family history data into
              readable, shareable narratives your whole family will treasure.
            </p>
            <p className="text-sm leading-relaxed mb-8" style={{ color: "#7A6858" }}>
              &ldquo;And he shall turn the heart of the fathers to the children.&rdquo; —{" "}
              <em style={{ color: "#C8A070" }}>Malachi 4:6</em>
            </p>
            <div className="flex items-center gap-3">
              <span className="px-4 py-2 rounded-full text-xs font-semibold"
                style={{ background: "rgba(232,180,154,0.12)", color: "#C8A070", border: "1px solid rgba(200,160,112,0.3)" }}>
                Coming soon
              </span>
              <Link href="/pricing" className="text-sm font-medium" style={{ color: "#E8C49A" }}>Get early access →</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── SCRIPTURE DIVIDER ────────────────────────── */}
      {/* hf-image-fade-top/bottom make the fade start when ~20% of image is still visible */}
      <div className="relative h-64 overflow-hidden hf-image-fade-top hf-image-fade-bottom"
        style={{ "--fade-to": "#F5EFE8" } as React.CSSProperties}>
        <Image src={PHOTOS.nature} alt="Green mountain forest" fill sizes="100vw" className="object-cover" />
        {/* Base tint */}
        <div className="absolute inset-0" style={{ background: "rgba(20,35,20,0.60)" }} />
        {/* Aggressive top+bottom gradient — fade starts at 25% from each edge */}
        <div className="absolute inset-0" style={{
          background: "linear-gradient(to bottom, rgba(45,31,20,0.92) 0%, transparent 25%, transparent 75%, rgba(20,35,20,0.92) 100%)"
        }} />
        {/* Noise grain for rustic feel */}
        <div className="absolute inset-0 hf-noise" />
        {/* Text */}
        <div className="absolute inset-0 flex items-center justify-center text-center px-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] mb-3" style={{ color: "rgba(155,184,154,0.7)" }}>
              D&amp;C 11:23
            </p>
            <p className="text-2xl font-bold mb-2 leading-snug"
              style={{ color: "#E8DDD0", fontFamily: "Georgia,'Times New Roman',serif", textShadow: "0 2px 12px rgba(0,0,0,0.5)" }}>
              &ldquo;Seek ye first the kingdom of God.&rdquo;
            </p>
            <p className="text-sm" style={{ color: "#7A9A7A" }}>Matthew 6:33 · Doctrine &amp; Covenants 11:23</p>
          </div>
        </div>
      </div>

      {/* ── COMMUNITY ────────────────────────────────── */}
      <CommunitySection />


      {/* ── VALUES ───────────────────────────────────── */}
      <section className="py-16 px-4" style={{ background: "linear-gradient(135deg,#F5F0E8,#EDE8DC)" }}>
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-10" style={{ color: "#2D4A2D" }}>Why members trust HolyFlex</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map(({ icon: Icon, title, description }) => (
              <div key={title} className="text-center">
                <div className="flex justify-center mb-3">
                  <div className="p-3 rounded-full" style={{ background: "linear-gradient(135deg,#FDF0E8,#F5E0D0)" }}>
                    <Icon size={18} style={{ color: "#C87A50" }} />
                  </div>
                </div>
                <h3 className="font-semibold mb-1" style={{ color: "#2D4A2D" }}>{title}</h3>
                <p className="text-sm" style={{ color: "#6B7A6B" }}>{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────── */}
      <section className="relative py-24 px-4 text-center overflow-hidden hf-image-fade-top"
        style={{ "--fade-to": "#EDE8DC" } as React.CSSProperties}>
        <Image src={PHOTOS.stars} alt="Starry mountain night" fill sizes="100vw" className="object-cover" />
        {/* Base tint */}
        <div className="absolute inset-0" style={{ background: "rgba(16,28,16,0.80)" }} />
        {/* Early top fade — starts at 30% from top so image bleeds gracefully */}
        <div className="absolute inset-0" style={{
          background: "linear-gradient(to bottom, rgba(45,50,35,0.95) 0%, transparent 30%, transparent 100%)"
        }} />
        {/* Noise grain */}
        <div className="absolute inset-0 hf-noise" />
        <div className="relative z-10 max-w-2xl mx-auto">
          <Logo size="lg" className="justify-center mb-6" />
          <h2 className="text-3xl font-bold mb-4" style={{ color: "#F5F0E8" }}>Start strengthening your faith today</h2>
          <p className="mb-10 text-base" style={{ color: "#7A9A7A" }}>
            Free to start. No account required. Built for the community, by someone who cares about it.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/talk-generator" className="inline-flex items-center justify-center gap-2 rounded-xl font-semibold text-base shadow-xl"
              style={{ background: "#E8B49A", color: "#2D1A0E", padding: "16px 36px" }}>
              Prepare Your First Talk <ArrowRight size={16} />
            </Link>
            <Link href="/pricing" className="inline-flex items-center justify-center gap-2 rounded-xl font-semibold text-base"
              style={{ border: "2px solid #5A7A5A", color: "#C8E0C8", padding: "16px 28px" }}>
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* ── DISCLAIMER ───────────────────────────────── */}
      <section className="py-8 px-4" style={{ background: "linear-gradient(135deg,#1E3320,#2D4A2D)" }}>
        <div className="max-w-2xl mx-auto text-center text-sm">
          <p className="font-medium mb-1.5" style={{ color: "#C8D8C8" }}>A note on AI and personal revelation</p>
          <p style={{ color: "#4A6A4A" }}>
            HolyFlex is a preparation tool, not a spiritual authority. All generated content is a starting point.
            Study the scriptures, pray, and let the Spirit guide your testimony.
          </p>
        </div>
      </section>
    </div>
  );
}
