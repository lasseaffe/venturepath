"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Compass,
  MapPin,
  Globe,
  Tag,
  ExternalLink,
  Calendar,
  ArrowRight,
  Bookmark,
  Share2,
  Search,
  ChevronRight,
  Flag,
  Heart,
  Star,
} from "lucide-react";

const FEATURED_MISSIONS = [
  {
    id: "m1",
    missionary: "Elder Jake Sorensen",
    mission: "Brazil São Paulo North",
    tag: "Brazil",
    date: "Serving since Mar 2025",
    image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=400&q=70",
    snippet:
      "Week 52 in São Paulo Norte. We had three baptisms this week — the Rodrigues family accepted the gospel after months of teaching. The Spirit was so strong during the service.",
    source: "Instagram @elder.sorensen.mission",
    url: "https://www.instagram.com",
    tags: ["Brazil", "Baptisms", "Family"],
    hearts: 124,
  },
  {
    id: "m2",
    missionary: "Sister Emma Christoffersen",
    mission: "Philippines Manila",
    tag: "Philippines",
    date: "Serving since Jan 2026",
    image: "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=400&q=70",
    snippet:
      "Just finished our district conference in Manila! President Nelson's message about the gathering of Israel hits different when you're living it every day on the streets of Quezon City.",
    source: "Facebook · Sister Missionaries",
    url: "https://www.facebook.com",
    tags: ["Philippines", "District Conference", "Manila"],
    hearts: 89,
  },
  {
    id: "m3",
    missionary: "Elder Finn Larsen",
    mission: "Germany Hamburg",
    tag: "Germany",
    date: "Serving since Sep 2024",
    image: "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=400&q=70",
    snippet:
      "Reached fluency milestone this month! Can finally hold full teaching discussions in German without switching to English. Danke, Heavenly Father. Hamburg is so beautiful in the spring.",
    source: "MissionaryBlog.org",
    url: "https://www.missionaryblog.org",
    tags: ["Germany", "Language", "Hamburg", "Europe"],
    hearts: 67,
  },
  {
    id: "m4",
    missionary: "Sister Aiko Yamamoto",
    mission: "Japan Tokyo",
    tag: "Japan",
    date: "Starting Jul 2026",
    image: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=400&q=70",
    snippet:
      "Just received my mission call to Tokyo Japan! I've been studying Preach My Gospel for months and can't wait to teach the Restoration in Japanese. 行ってきます！",
    source: "Instagram @aiko.yww",
    url: "https://www.instagram.com",
    tags: ["Japan", "Tokyo", "New Call", "Language"],
    hearts: 312,
  },
  {
    id: "m5",
    missionary: "Elder Marcus Webb",
    mission: "Kenya Nairobi",
    tag: "Africa",
    date: "Serving since Jun 2025",
    image: "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=400&q=70",
    snippet:
      "The Church is growing so fast in Kenya. In our mission alone we've had over 200 baptisms this year. Families here are so golden — they embrace the gospel with their whole hearts.",
    source: "LDS Living Africa",
    url: "https://www.ldsliving.com",
    tags: ["Kenya", "Africa", "Growth", "Baptisms"],
    hearts: 198,
  },
  {
    id: "m6",
    missionary: "Sister Brianna Tafiti",
    mission: "Samoa Apia",
    tag: "Pacific",
    date: "Serving since Nov 2025",
    image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=400&q=70",
    snippet:
      "Sunday was incredible. Our branch in Savai'i performed an original Samoan hymn during sacrament. I cried. This is why I came — to see the gospel become part of a culture's soul.",
    source: "Pacific LDS Voices",
    url: "https://www.ldsliving.com",
    tags: ["Samoa", "Pacific", "Culture", "Music"],
    hearts: 241,
  },
];

const MISSION_TAGS = [
  "All", "North America", "South America", "Europe", "Africa", "Asia", "Pacific", "New Call", "Baptisms", "Language",
];

const PREP_STEPS = [
  { id: 1, title: "Medical & Dental Clearance", done: true, desc: "Complete all required health forms and exams." },
  { id: 2, title: "Submit Mission Papers", done: true, desc: "Through the Gospel Library app or meetinghouse." },
  { id: 3, title: "Receive Your Call", done: true, desc: "Open your call letter or digital call." },
  { id: 4, title: "Study Preach My Gospel", done: false, desc: "Focus on Chapters 1–4 before the MTC." },
  { id: 5, title: "Language Study", done: false, desc: "Use the Language Training app or resources." },
  { id: 6, title: "Book Travel to MTC / Field", done: false, desc: "Coordinate with your mission president's office." },
];

export default function MissionPage() {
  const [activeTag, setActiveTag] = useState("All");
  const [savedPosts, setSavedPosts] = useState<Set<string>>(new Set());
  const [prepDone, setPrepDone] = useState<Set<number>>(new Set([1, 2, 3]));
  const [search, setSearch] = useState("");

  const filtered = FEATURED_MISSIONS.filter((m) => {
    if (activeTag !== "All" && !m.tags.some((t) => t === activeTag || m.tag === activeTag)) return false;
    if (search && !m.missionary.toLowerCase().includes(search.toLowerCase()) &&
        !m.mission.toLowerCase().includes(search.toLowerCase()) &&
        !m.snippet.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  function toggleSave(id: string) {
    setSavedPosts((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10" data-beacon="mission-prep">
      {/* Hero */}
      <div
        className="rounded-3xl overflow-hidden mb-10 relative"
        style={{ background: "linear-gradient(135deg, #1A2A3A 0%, #2A4A6A 55%, #3A6A8A 100%)" }}
      >
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: "radial-gradient(#A8C4E8 1px, transparent 1px)", backgroundSize: "20px 20px" }}
        />
        <div className="relative px-8 py-10 flex flex-col md:flex-row items-center gap-8">
          <div className="flex-1">
            <span
              className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full mb-4"
              style={{ background: "rgba(168,196,232,0.15)", color: "#A8C4E8" }}
            >
              <Compass size={11} />
              HolyFlex Mission
            </span>
            <h1 className="text-3xl font-bold mb-3" style={{ color: "#F0EDE8" }}>
              Your Mission Journey
            </h1>
            <p className="text-base leading-relaxed mb-6" style={{ color: "#8AAAC0" }}>
              Plan your mission, follow other missionaries around the world,
              and find inspiration from those already serving. Connect posts to
              your travel planner and track every step of the journey.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: "#A8C4E8", color: "#1A2A3A" }}
              >
                <Flag size={14} />
                Mission Planner
              </button>
              <button
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border"
                style={{ borderColor: "rgba(168,196,232,0.3)", color: "#A8C4E8" }}
              >
                <Globe size={14} />
                Explore World Map
              </button>
            </div>
          </div>
          <div className="hidden md:block text-8xl select-none">🌍</div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_280px] gap-8 items-start">
        {/* Main: missionary posts */}
        <div>
          {/* Filters */}
          <div className="flex items-center gap-3 mb-5 flex-wrap">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#8B7EC0" }} />
              <input
                type="text"
                placeholder="Search missionaries…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-2 rounded-xl border text-sm outline-none w-48"
                style={{ borderColor: "#DDD5F0", color: "#2D1B69" }}
              />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {MISSION_TAGS.map((t) => (
                <button
                  key={t}
                  onClick={() => setActiveTag(t)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                  style={
                    activeTag === t
                      ? { background: "#3A6A8A", color: "#fff" }
                      : { background: "#EDF2F8", color: "#5A7A9A" }
                  }
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Post cards */}
          <div className="space-y-4">
            {filtered.map((post) => (
              <div
                key={post.id}
                className="rounded-2xl border overflow-hidden transition-all hover:shadow-md"
                style={{ background: "#FEFCFF", borderColor: "#DDD5F0" }}
              >
                <div className="flex gap-0">
                  {/* Image */}
                  <div className="w-28 flex-shrink-0 hidden sm:block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={post.image}
                      alt={post.mission}
                      className="w-full h-full object-cover"
                      style={{ minHeight: 120 }}
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="text-xs font-bold" style={{ color: "#3A6A8A" }}>
                          {post.missionary}
                        </p>
                        <p className="text-xs" style={{ color: "#8B7EC0" }}>
                          {post.mission} · {post.date}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => toggleSave(post.id)} className="p-1.5 rounded-lg hover:bg-gray-100">
                          <Bookmark
                            size={13}
                            style={{
                              color: savedPosts.has(post.id) ? "#3A6A8A" : "#8B7EC0",
                              fill: savedPosts.has(post.id) ? "#3A6A8A" : "none",
                            }}
                          />
                        </button>
                        <a
                          href={post.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg hover:bg-gray-100"
                        >
                          <ExternalLink size={13} style={{ color: "#8B7EC0" }} />
                        </a>
                      </div>
                    </div>

                    <p className="text-sm leading-relaxed mb-2.5" style={{ color: "#3D4A3D" }}>
                      &ldquo;{post.snippet}&rdquo;
                    </p>

                    {/* Tags */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {post.tags.map((t) => (
                        <span
                          key={t}
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: "#EDF2F8", color: "#3A6A8A" }}
                        >
                          <Tag size={9} className="inline mr-0.5" />
                          {t}
                        </span>
                      ))}
                      <span
                        className="ml-auto flex items-center gap-1 text-xs"
                        style={{ color: "#8B7EC0" }}
                      >
                        <Heart size={10} />
                        {post.hearts}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t" style={{ borderColor: "#EDE8F8" }}>
                      <span className="text-xs" style={{ color: "#8B7EC0" }}>
                        via {post.source}
                      </span>
                      <button
                        className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                        style={{ background: "#EDF2F8", color: "#3A6A8A" }}
                      >
                        <MapPin size={10} />
                        Add to Travel Planner
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {filtered.length === 0 && (
              <div className="text-center py-12">
                <Globe size={32} className="mx-auto mb-3" style={{ color: "#C8D8C8" }} />
                <p style={{ color: "#8B7EC0" }}>No posts match your filter.</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar: Mission Prep Checklist */}
        <aside className="space-y-4 sticky top-20">
          <div
            className="rounded-2xl p-5"
            style={{ background: "#FEFCFF", border: "1px solid #DDD5F0" }}
          >
            <p className="text-sm font-bold mb-1" style={{ color: "#2D1B69" }}>
              Mission Prep Checklist
            </p>
            <p className="text-xs mb-4" style={{ color: "#8B7EC0" }}>
              Track your steps to serving
            </p>

            {/* Progress */}
            <div className="mb-4">
              <div className="flex justify-between text-xs mb-1">
                <span style={{ color: "#6B5FA0" }}>
                  {prepDone.size}/{PREP_STEPS.length} complete
                </span>
                <span style={{ color: "#2D1B69" }}>
                  {Math.round((prepDone.size / PREP_STEPS.length) * 100)}%
                </span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#EDE8F8" }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(prepDone.size / PREP_STEPS.length) * 100}%`,
                    background: "linear-gradient(90deg, #8B7EC0, #2D1B69)",
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              {PREP_STEPS.map((step) => {
                const done = prepDone.has(step.id);
                return (
                  <button
                    key={step.id}
                    onClick={() =>
                      setPrepDone((prev) => {
                        const n = new Set(prev);
                        if (n.has(step.id)) n.delete(step.id);
                        else n.add(step.id);
                        return n;
                      })
                    }
                    className="w-full flex items-start gap-2.5 text-left py-2 transition-colors"
                  >
                    <div
                      className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{
                        borderColor: done ? "#2D1B69" : "#C8D8C8",
                        background: done ? "#2D1B69" : "transparent",
                      }}
                    >
                      {done && <span className="text-white text-[8px] font-bold">✓</span>}
                    </div>
                    <div>
                      <p
                        className="text-xs font-semibold"
                        style={{
                          color: done ? "#8B7EC0" : "#2D1B69",
                          textDecoration: done ? "line-through" : "none",
                        }}
                      >
                        {step.title}
                      </p>
                      <p className="text-xs" style={{ color: "#B8C8B8" }}>
                        {step.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Resources */}
          <div
            className="rounded-2xl p-5"
            style={{
              background: "linear-gradient(135deg, #1A2A3A 0%, #2A4060 100%)",
            }}
          >
            <p
              className="text-xs font-semibold uppercase tracking-widest mb-4"
              style={{ color: "#A8C4E8" }}
            >
              Useful Resources
            </p>
            {[
              { label: "Preach My Gospel", url: "https://www.churchofjesuschrist.org/study/manual/preach-my-gospel-2023" },
              { label: "Gospel Library App", url: "https://www.churchofjesuschrist.org/pages/gospel-library" },
              { label: "Language Training", url: "https://www.churchofjesuschrist.org/languages" },
              { label: "Submit Mission Papers", url: "https://www.churchofjesuschrist.org/missionary/apply" },
            ].map((r) => (
              <a
                key={r.label}
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between py-2.5 border-b last:border-0 text-sm group"
                style={{ borderColor: "rgba(168,196,232,0.1)", color: "#A8C4E8" }}
              >
                {r.label}
                <ChevronRight size={13} className="opacity-50 group-hover:opacity-100 transition-opacity" />
              </a>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
