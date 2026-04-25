"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen, MessageSquare, Menu, X,
  GraduationCap, Compass, Users, Library,
  ChevronDown, HeartHandshake, Sparkles,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";

const toolsLinks = [
  { href: "/talk-generator",  label: "Speak",       icon: MessageSquare,  desc: "Talk & Lesson Generator" },
  { href: "/come-follow-me",  label: "Come Follow Me", icon: BookOpen,    desc: "Weekly CFM Companion" },
  { href: "/learn",           label: "Learn",        icon: GraduationCap, desc: "Gospel Learning Roadmap" },
  { href: "/mission",         label: "Mission",      icon: Compass,       desc: "Mission Prep Hub" },
  { href: "/communities",     label: "Communities",  icon: Users,         desc: "Ward & Study Groups" },
  { href: "/library",         label: "Library",      icon: Library,       desc: "Saved Talks & Lessons" },
  { href: "/agape",           label: "Agapé",        icon: HeartHandshake, desc: "Blind Gospel Reflections" },
];

const topLinks = [
  { href: "/discover", label: "Discover", icon: Sparkles },
  { href: "/pricing",  label: "Pricing",  icon: null },
];

export function Nav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropOpen, setDropOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setDropOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const activeInTools = toolsLinks.some((l) => pathname === l.href);

  return (
    <header className="border-b sticky top-0 z-50" style={{ background: "#FEFCF7", borderColor: "#DDE8DD" }}>
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" onClick={() => setMobileOpen(false)}>
          <Logo size="md" />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-5">

          {/* Tools dropdown */}
          <div className="relative" ref={dropRef}>
            <button
              onClick={() => setDropOpen((v) => !v)}
              className={cn(
                "flex items-center gap-1 text-sm font-medium transition-colors",
                activeInTools ? "text-[#2D4A2D]" : "text-[#6B8A6B] hover:text-[#2D4A2D]"
              )}
            >
              Tools <ChevronDown size={13} className={cn("transition-transform", dropOpen && "rotate-180")} />
            </button>

            {dropOpen && (
              <div
                className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-[26rem] rounded-2xl border shadow-xl p-2 grid grid-cols-3 gap-1"
                style={{ background: "#FEFCF7", borderColor: "#DDE8DD" }}
              >
                {toolsLinks.map(({ href, label, icon: Icon, desc }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setDropOpen(false)}
                    className={cn(
                      "flex items-start gap-2.5 rounded-xl px-3 py-2.5 transition-colors",
                      pathname === href
                        ? "bg-[#EDF5ED]"
                        : "hover:bg-[#F5F0E8]"
                    )}
                  >
                    <Icon size={15} className="mt-0.5 shrink-0" style={{ color: "#4A7A4A" }} />
                    <div>
                      <p className="text-xs font-semibold" style={{ color: "#2D4A2D" }}>{label}</p>
                      <p className="text-[10px] leading-tight" style={{ color: "#9AAA9A" }}>{desc}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {topLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-1.5 text-sm font-medium transition-colors",
                pathname === href ? "text-[#2D4A2D]" : "text-[#6B8A6B] hover:text-[#2D4A2D]"
              )}
            >
              {Icon && <Icon size={13} />}
              {label}
            </Link>
          ))}
        </nav>

        {/* Mobile toggle */}
        <button
          className="md:hidden p-2 text-[#4A7A4A]"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu — flat list */}
      {mobileOpen && (
        <div className="md:hidden border-t px-4 py-3 flex flex-col gap-1" style={{ background: "#FEFCF7", borderColor: "#DDE8DD" }}>
          {[...toolsLinks, { href: "/discover", label: "Discover", icon: Sparkles, desc: "" }, { href: "/pricing", label: "Pricing", icon: null, desc: "" }].map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-2 text-sm font-medium px-2 py-2 rounded-lg transition-colors",
                pathname === href ? "bg-[#EDF5ED] text-[#2D4A2D]" : "text-[#6B8A6B] hover:bg-[#F5F0E8]"
              )}
            >
              {Icon && <Icon size={15} />}
              {label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
