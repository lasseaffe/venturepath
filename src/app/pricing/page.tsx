"use client";

import { Check, X } from "lucide-react";
import {
  MessageSquare, BookOpen, GraduationCap, Compass,
  Users, Library, Bot, Video, HeartHandshake,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/lib/button-variants";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { PayPalSubscribeButton } from "@/components/paypal-subscribe-button";

// ── Feature overview cards ──────────────────────────────────────
const FEATURES = [
  {
    icon: MessageSquare,
    color: "#4A7A4A",
    bg: "#EDF5ED",
    title: "Talk & Lesson Generator",
    desc: "Sacrament talks, FHE lessons, Sunday School plans — ready in seconds.",
    href: "/talk-generator",
  },
  {
    icon: BookOpen,
    color: "#C87A50",
    bg: "#FDF0E8",
    title: "Come Follow Me",
    desc: "AI companion for the weekly CFM curriculum — always this week's lesson.",
    href: "/come-follow-me",
  },
  {
    icon: GraduationCap,
    color: "#7A5A3A",
    bg: "#F5EFE8",
    title: "Gospel Learning Roadmap",
    desc: "Structured units, quizzes, progress tracking, and personal classrooms.",
    href: "/learn",
  },
  {
    icon: Compass,
    color: "#5A7A9A",
    bg: "#EDF2F8",
    title: "Mission Prep Hub",
    desc: "Missionary posts, prep checklist, resources, and travel planner link.",
    href: "/mission",
  },
  {
    icon: Users,
    color: "#A05A7A",
    bg: "#F8EDF4",
    title: "Communities",
    desc: "Create or join ward and study communities — public or private groups.",
    href: "/communities",
  },
  {
    icon: Library,
    color: "#3A6A8A",
    bg: "#EDF2F8",
    title: "Library",
    desc: "Save, organize, and search all your generated talks and lessons.",
    href: "/library",
  },
  {
    icon: Bot,
    color: "#4A7A4A",
    bg: "#EDF5ED",
    title: "AI Companion Chatbot",
    desc: "Your always-available gospel study and scripture help companion.",
    href: "/",
  },
  {
    icon: HeartHandshake,
    color: "#B05A8A",
    bg: "#F8EDF4",
    title: "Agapé — Blind Reflections",
    desc: "Shared gospel prompts where both parties answer privately, then reveal together.",
    href: "/agape",
  },
  {
    icon: Video,
    color: "#9A5A3A",
    bg: "#F5EFE8",
    title: "Talk Video Generation",
    desc: "Animate your talks for TikTok, Reels, and YouTube Shorts. (coming soon)",
    href: "/pricing",
  },
];

// ── Pricing plans ───────────────────────────────────────────────
const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Try HolyFlex. No card needed.",
    badge: null,
    highlight: false,
    paypalPlanId: null,
    ctaFallback: { label: "Get started free", href: "/talk-generator" },
    features: [
      { label: "3 talk/lesson generations per month", included: true },
      { label: "Current Come Follow Me week", included: true },
      { label: "Join public communities", included: true },
      { label: "Learning Roadmap (read-only)", included: true },
      { label: "3 Agapé reflections per month", included: true },
      { label: "Library & saved talks", included: false },
      { label: "Create communities", included: false },
      { label: "AI Chatbot companion", included: false },
      { label: "Mission Prep Hub", included: false },
    ],
  },
  {
    name: "Personal",
    price: "$9",
    period: "/ month",
    yearlyNote: "or $79/yr — save $29",
    description: "For members who prepare regularly.",
    badge: "Most Popular",
    highlight: true,
    paypalPlanId: process.env.NEXT_PUBLIC_PAYPAL_PLAN_PERSONAL,
    ctaFallback: null,
    features: [
      { label: "Unlimited generations", included: true },
      { label: "Full CFM archive (all years)", included: true },
      { label: "Library — save, organize & search", included: true },
      { label: "Communities — create & manage", included: true },
      { label: "Learning roadmap + quizzes", included: true },
      { label: "Mission Prep Hub", included: true },
      { label: "Agapé blind reflections (unlimited)", included: true },
      { label: "AI Chatbot companion", included: true },
      { label: "Priority AI speed", included: true },
    ],
  },
  {
    name: "Family",
    price: "$14",
    period: "/ month",
    yearlyNote: "or $119/yr — save $49",
    description: "One plan for the whole household.",
    badge: null,
    highlight: false,
    paypalPlanId: process.env.NEXT_PUBLIC_PAYPAL_PLAN_FAMILY,
    ctaFallback: null,
    features: [
      { label: "Everything in Personal", included: true },
      { label: "Up to 6 family members", included: true },
      { label: "Shared library & saved talks", included: true },
      { label: "Talk video generation", included: true },
      { label: "TikTok / Shorts / Reels upload", included: true },
      { label: "Family history storyteller (soon)", included: true },
      { label: "Ministering companion (soon)", included: true },
    ],
  },
  {
    name: "Ward",
    price: "$49",
    period: "/ month",
    description: "For bishoprics and ward leadership.",
    badge: null,
    highlight: false,
    paypalPlanId: null,
    ctaFallback: { label: "Contact us", href: "mailto:hello@holyflex.app" },
    features: [
      { label: "Unlimited ward members", included: true },
      { label: "Ward newsletter generator", included: true },
      { label: "Admin dashboard", included: true },
      { label: "Bulk lesson planning", included: true },
      { label: "Dedicated support", included: true },
    ],
  },
];

export default function PricingPage() {
  return (
    <div className="px-4 py-16" style={{ background: "#FDFAF3" }}>
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="text-center mb-14">
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#9BB89A" }}>Pricing</p>
          <h1 className="text-4xl font-bold mb-3" style={{ color: "#2D4A2D" }}>Simple, honest pricing</h1>
          <p className="max-w-xl mx-auto text-base" style={{ color: "#7A9A7A" }}>
            Start free. Upgrade when HolyFlex genuinely saves you time. No pressure, no dark patterns.
          </p>
        </div>

        {/* Plans */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-20">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className="border flex flex-col relative shadow-sm"
              style={plan.highlight
                ? { background: "#FEFCF7", borderColor: "#4A7A4A", boxShadow: "0 0 0 2px #4A7A4A, 0 4px 16px rgba(74,122,74,0.18)" }
                : { background: "#FEFCF7", borderColor: "#DDE8DD" }
              }
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="px-3 text-xs" style={{ background: "#4A7A4A", color: "#F5F0E8", border: "none" }}>
                    {plan.badge}
                  </Badge>
                </div>
              )}

              <CardHeader className="pb-4 pt-7">
                <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "#9AAA9A" }}>
                  {plan.name}
                </p>
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-bold" style={{ color: "#2D4A2D" }}>{plan.price}</span>
                  <span className="text-sm mb-1.5" style={{ color: "#9AAA9A" }}>{plan.period}</span>
                </div>
                {"yearlyNote" in plan && plan.yearlyNote && (
                  <p className="text-xs font-medium" style={{ color: "#C87A50" }}>{plan.yearlyNote}</p>
                )}
                <p className="text-sm mt-1.5" style={{ color: "#7A9A7A" }}>{plan.description}</p>
              </CardHeader>

              <CardContent className="flex flex-col flex-1 gap-5">
                <ul className="space-y-2 flex-1">
                  {plan.features.map((f) => (
                    <li key={f.label} className="flex items-start gap-2">
                      {f.included
                        ? <Check size={13} className="mt-0.5 shrink-0" style={{ color: "#6B9A6B" }} />
                        : <X size={13} className="mt-0.5 shrink-0" style={{ color: "#C8A8A8" }} />
                      }
                      <span className="text-sm" style={{ color: f.included ? "#5A7A5A" : "#B0A8A8" }}>{f.label}</span>
                    </li>
                  ))}
                </ul>

                {plan.paypalPlanId ? (
                  <PayPalSubscribeButton planId={plan.paypalPlanId} planName={plan.name} />
                ) : plan.ctaFallback ? (
                  <Link
                    href={plan.ctaFallback.href}
                    className={cn(
                      buttonVariants({ variant: plan.highlight ? "default" : "outline" }),
                      "w-full justify-center"
                    )}
                    style={plan.highlight
                      ? { background: "#4A7A4A", color: "#F5F0E8", border: "none" }
                      : { borderColor: "#9BB89A", color: "#3D6040" }
                    }
                  >
                    {plan.ctaFallback.label}
                  </Link>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Feature overview cards */}
        <div className="mb-10">
          <div className="text-center mb-10">
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "#9BB89A" }}>What's included</p>
            <h2 className="text-2xl font-bold" style={{ color: "#2D4A2D" }}>Everything in HolyFlex</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map(({ icon: Icon, color, bg, title, desc, href }) => (
              <Link
                key={title}
                href={href}
                className="group rounded-2xl border p-5 flex flex-col gap-3 transition-all hover:-translate-y-0.5 hover:shadow-md"
                style={{ background: "#FEFCF7", borderColor: "#DDE8DD" }}
              >
                <div className="p-2.5 rounded-xl w-fit" style={{ background: bg }}>
                  <Icon size={18} style={{ color }} />
                </div>
                <div>
                  <p className="text-sm font-semibold mb-1" style={{ color: "#2D4A2D" }}>{title}</p>
                  <p className="text-xs leading-relaxed" style={{ color: "#7A9A7A" }}>{desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Footer note */}
        <div className="text-center text-sm space-y-1 pt-8 border-t" style={{ borderColor: "#DDE8DD", color: "#9AAA9A" }}>
          <p>All paid plans include a 7-day free trial. Cancel anytime via your PayPal account.</p>
          <p>Payments processed securely by PayPal.</p>
          <p className="mt-2 text-xs">
            HolyFlex is an independent product and is not affiliated with The Church of Jesus Christ of Latter-day Saints.
          </p>
        </div>
      </div>
    </div>
  );
}
