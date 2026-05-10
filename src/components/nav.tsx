"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpen, MessageSquare, Menu, X,
  GraduationCap, Compass, Users, Library,
  ChevronDown, HeartHandshake, Sparkles, Search,
  Building2, TrendingUp, Home, CalendarDays, Map,
} from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";
import { FlexBalance } from "@/components/flex-balance";
import { SabbathToggle } from "@/components/sabbath-toggle";

const toolGroups = [
  {
    label: "Create",
    links: [
      { href: "/talk-generator", label: "Speak",          icon: MessageSquare, desc: "Talk & Lesson Generator" },
      { href: "/come-follow-me", label: "Come Follow Me", icon: BookOpen,      desc: "Weekly CFM Companion" },
      { href: "/learn",          label: "Learn",          icon: GraduationCap, desc: "Gospel Learning Roadmap" },
      { href: "/fhe",            label: "FHE Builder",    icon: CalendarDays,  desc: "Family Home Evening Planner" },
    ],
  },
  {
    label: "Community",
    links: [
      { href: "/communities", label: "Ward",     icon: Users,         desc: "Ward & Study Groups" },
      { href: "/agape",       label: "Agapé",   icon: HeartHandshake, desc: "Blind Reflections & Confessions" },
      { href: "/mission",     label: "Mission",  icon: Compass,       desc: "Mission Prep Hub" },
    ],
  },
  {
    label: "My Journey",
    links: [
      { href: "/library",       label: "Library",       icon: Library,    desc: "Saved Talks & Lessons" },
      { href: "/covenant",      label: "Covenant Map",  icon: Map,        desc: "Personal Milestone Tracker" },
      { href: "/temple",        label: "Temple",        icon: Building2,  desc: "Proxy Sync Grid" },
      { href: "/self-reliance", label: "Self-Reliance", icon: TrendingUp, desc: "Progress Map" },
    ],
  },
];

const allToolLinks = toolGroups.flatMap((g) => g.links);

const topLinks = [
  { href: "/discover",  label: "Discover",  icon: Sparkles },
  { href: "/liahona",   label: "Liahona",   icon: Home },
  { href: "/pricing",   label: "Pricing",   icon: null },
];

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropOpen, setDropOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown / search on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setDropOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Focus input when search expands
  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  const submitSearch = useCallback(() => {
    const q = searchQuery.trim();
    if (!q) return;
    router.push(`/search?q=${encodeURIComponent(q)}`);
    setSearchQuery("");
    setSearchOpen(false);
  }, [searchQuery, router]);

  const activeInTools = allToolLinks.some((l) => pathname === l.href);

  return (
    <header className="border-b sticky top-0 z-50" style={{ background: "#FEFCFF", borderColor: "#DDD5F0" }}>
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" onClick={() => setMobileOpen(false)}>
          <Logo size="md" />
        </Link>

        {/* Search bar — desktop */}
        <div ref={searchRef} className="hidden md:flex items-center">
          <div
            className={cn(
              "flex items-center gap-2 rounded-full border transition-all duration-200 overflow-hidden",
              searchOpen ? "w-56 px-3 py-1.5 border-[#7C5CBF]" : "w-8 h-8 justify-center border-transparent"
            )}
            style={{ background: searchOpen ? "#FEFCFF" : "transparent" }}
          >
            <button
              type="button"
              onClick={() => setSearchOpen((v) => !v)}
              className="shrink-0 p-0.5 text-[#6B5FA0] hover:text-[#2D1B69] transition-colors"
              aria-label="Search"
            >
              <Search size={15} />
            </button>
            {searchOpen && (
              <input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") submitSearch(); if (e.key === "Escape") setSearchOpen(false); }}
                placeholder="Search scriptures, talks, CFM…"
                className="flex-1 text-sm outline-none bg-transparent min-w-0"
                style={{ color: "#2D1B69" }}
              />
            )}
          </div>
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-5">

          {/* Tools dropdown — grouped */}
          <div className="relative" ref={dropRef}>
            <button
              onClick={() => setDropOpen((v) => !v)}
              className={cn(
                "flex items-center gap-1 text-sm font-medium transition-colors",
                activeInTools ? "text-[#2D1B69]" : "text-[#6B5FA0] hover:text-[#2D1B69]"
              )}
            >
              Tools <ChevronDown size={13} className={cn("transition-transform", dropOpen && "rotate-180")} />
            </button>

            {dropOpen && (
              <div
                className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-[34rem] rounded-2xl border shadow-xl p-3"
                style={{ background: "#FEFCFF", borderColor: "#DDD5F0" }}
              >
                <div className="grid grid-cols-3 gap-4">
                  {toolGroups.map((group) => (
                    <div key={group.label}>
                      <p
                        className="text-[9px] font-bold uppercase tracking-widest mb-1.5 px-1"
                        style={{ color: "#D4AF37" }}
                      >
                        {group.label}
                      </p>
                      <div className="flex flex-col gap-0.5">
                        {group.links.map(({ href, label, icon: Icon, desc }) => (
                          <Link
                            key={href}
                            href={href}
                            onClick={() => setDropOpen(false)}
                            className={cn(
                              "flex items-start gap-2 rounded-xl px-2.5 py-2 transition-colors",
                              pathname === href ? "bg-[#EDE8F8]" : "hover:bg-[#F5F0FF]"
                            )}
                          >
                            <Icon size={13} className="mt-0.5 shrink-0" style={{ color: "#D4AF37" }} />
                            <div>
                              <p className="text-xs font-semibold leading-tight" style={{ color: "#2D1B69" }}>{label}</p>
                              <p className="text-[10px] leading-tight" style={{ color: "#8B7EC0" }}>{desc}</p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {topLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-1.5 text-sm font-medium transition-colors",
                pathname === href ? "text-[#2D1B69]" : "text-[#6B5FA0] hover:text-[#2D1B69]"
              )}
            >
              {Icon && <Icon size={13} />}
              {label}
            </Link>
          ))}
          <FlexBalance />
          <SabbathToggle />
        </nav>

        {/* Mobile toggle */}
        <button
          className="md:hidden p-2 text-[#2D1B69]"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu — grouped sections */}
      {mobileOpen && (
        <div className="md:hidden border-t px-4 py-3 flex flex-col gap-2" style={{ background: "#FEFCFF", borderColor: "#DDD5F0" }}>
          {/* Mobile search */}
          <div className="flex items-center gap-2 rounded-xl border px-3 py-2.5 mb-1" style={{ borderColor: "#DDD5F0" }}>
            <Search size={14} style={{ color: "#8B7EC0" }} />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { submitSearch(); setMobileOpen(false); } }}
              placeholder="Search scriptures, talks, CFM…"
              className="flex-1 text-sm outline-none bg-transparent"
              style={{ color: "#2D1B69" }}
            />
          </div>

          {/* Top links */}
          <div className="flex flex-col gap-0.5">
            {topLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-2.5 text-sm font-semibold min-h-[44px] px-3 rounded-xl transition-colors",
                  pathname === href ? "bg-[#EDE8F8] text-[#2D1B69]" : "text-[#6B5FA0] hover:bg-[#F5F0FF]"
                )}
              >
                {Icon && <Icon size={15} />}
                {label}
              </Link>
            ))}
          </div>

          {/* Tool groups */}
          {toolGroups.map((group) => (
            <div key={group.label}>
              <p className="text-[9px] font-bold uppercase tracking-widest px-3 mb-1" style={{ color: "#D4AF37" }}>
                {group.label}
              </p>
              <div className="flex flex-col gap-0.5">
                {group.links.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-2.5 text-sm font-medium min-h-[44px] px-3 rounded-xl transition-colors",
                      pathname === href ? "bg-[#EDE8F8] text-[#2D1B69]" : "text-[#6B5FA0] hover:bg-[#F5F0FF]"
                    )}
                  >
                    <Icon size={15} style={{ color: "#D4AF37" }} />
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </header>
  );
}
