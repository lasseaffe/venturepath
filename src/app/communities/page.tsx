"use client";

import { useState } from "react";
import { RichTextarea } from "@/components/ui/rich-textarea";
import {
  Users,
  Plus,
  Search,
  MessageCircle,
  Hash,
  Star,
  Lock,
  Globe,
  X,
  ChevronRight,
  Heart,
  BookOpen,
  Flame,
  Music,
} from "lucide-react";

const ICON_MAP: Record<string, React.ElementType> = {
  heart: Heart,
  book: BookOpen,
  flame: Flame,
  music: Music,
  users: Users,
  star: Star,
};

const COMMUNITIES = [
  {
    id: "c1",
    name: "Easter Season Study",
    topic: "Come Follow Me · Resurrection · Atonement",
    description:
      "Studying the Resurrection and Atonement of Jesus Christ together this Easter season. Share insights, questions, and testimony.",
    members: 312,
    posts: 84,
    icon: "star",
    color: "#2D1B69",
    bg: "linear-gradient(135deg, #EDE8F8 0%, #D8EDD8 100%)",
    tags: ["Easter", "Atonement", "Come Follow Me"],
    public: true,
  },
  {
    id: "c2",
    name: "Utah Dirty Soda Fans",
    topic: "LDS Culture · Food & Drink",
    description:
      "For fans of Utah's beloved non-alcoholic soda shop culture. Share recipes, favourite combinations, and Swig/Sodalicious finds.",
    members: 1247,
    posts: 302,
    icon: "flame",
    color: "#D4AF37",
    bg: "linear-gradient(135deg, #FDF0E8 0%, #F5E0D0 100%)",
    tags: ["Dirty Soda", "Utah Culture", "Recipes"],
    public: true,
  },
  {
    id: "c3",
    name: "First-Time Speakers",
    topic: "Sacrament Talks · Nervousness · Support",
    description:
      "A safe space for members who just got their first sacrament talk assignment. Share tips, outlines, and encouragement.",
    members: 588,
    posts: 145,
    icon: "heart",
    color: "#A05A7A",
    bg: "linear-gradient(135deg, #F8EDF4 0%, #EDD8E8 100%)",
    tags: ["Talks", "First-Time", "Support"],
    public: true,
  },
  {
    id: "c4",
    name: "Family History Researchers",
    topic: "Genealogy · FamilySearch · Stories",
    description:
      "Share discoveries from FamilySearch, tips for finding hard-to-find ancestors, and the stories that changed your perspective.",
    members: 2104,
    posts: 617,
    icon: "book",
    color: "#7A5A3A",
    bg: "linear-gradient(135deg, #F5EFE8 0%, #EDE0D0 100%)",
    tags: ["Genealogy", "FamilySearch", "Roots"],
    public: true,
  },
  {
    id: "c5",
    name: "Mission Prep 2026",
    topic: "Missionary Work · Preach My Gospel",
    description:
      "For future missionaries preparing to serve. Discuss Preach My Gospel, language prep, packing tips, and spiritual preparation.",
    members: 891,
    posts: 224,
    icon: "users",
    color: "#5A7A9A",
    bg: "linear-gradient(135deg, #EEF2F8 0%, #DCE7F5 100%)",
    tags: ["Mission", "Preach My Gospel", "Preparation"],
    public: true,
  },
  {
    id: "c6",
    name: "LDS Worship Music",
    topic: "Hymns · Music · Worship",
    description:
      "Discuss favourite hymns, share arrangements, and find music for sacrament meeting, funerals, and family home evening.",
    members: 763,
    posts: 189,
    icon: "music",
    color: "#3A6A5A",
    bg: "linear-gradient(135deg, #EDF4F1 0%, #D8EDE7 100%)",
    tags: ["Hymns", "Music", "Worship"],
    public: true,
  },
];

export default function CommunitiesPage() {
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newTopic, setNewTopic] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [comment, setComment] = useState("");
  const [newPublic, setNewPublic] = useState(true);
  const [joined, setJoined] = useState<Set<string>>(new Set(["c1"]));

  const filtered = COMMUNITIES.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.topic.toLowerCase().includes(search.toLowerCase()) ||
      c.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
  );

  function toggleJoin(id: string) {
    setJoined((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-1" style={{ color: "#2D1B69" }}>
              Communities
            </h1>
            <p style={{ color: "#6B5FA0" }}>
              Connect with members who share your interests and calling.
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm shadow-sm transition-all hover:scale-105"
            style={{ background: "#2D1B69", color: "#F5F0FF" }}
          >
            <Plus size={16} />
            Create Community
          </button>
        </div>

        {/* Search */}
        <div className="relative mt-5">
          <Search
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2"
            style={{ color: "#8B7EC0" }}
          />
          <input
            type="text"
            placeholder="Search communities by name or topic…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm outline-none"
            style={{
              background: "#FEFCFF",
              borderColor: "#DDD5F0",
              color: "#2D1B69",
            }}
          />
        </div>
      </div>

      {/* My communities */}
      {joined.size > 0 && (
        <div className="mb-8">
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-3"
            style={{ color: "#8B7EC0" }}
          >
            My Communities
          </p>
          <div className="flex flex-wrap gap-2">
            {COMMUNITIES.filter((c) => joined.has(c.id)).map((c) => {
              const Icon = ICON_MAP[c.icon] ?? Users;
              return (
                <div
                  key={c.id}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium"
                  style={{ background: c.color + "15", color: c.color }}
                >
                  <Icon size={12} />
                  {c.name}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Community grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((c) => {
          const Icon = ICON_MAP[c.icon] ?? Users;
          const isJoined = joined.has(c.id);
          return (
            <div
              key={c.id}
              className="rounded-2xl border flex flex-col overflow-hidden transition-all hover:-translate-y-1 hover:shadow-lg"
              style={{ borderColor: "transparent", background: c.bg }}
            >
              {/* Top */}
              <div className="px-5 pt-5 pb-3">
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: c.color + "20" }}
                  >
                    <Icon size={18} style={{ color: c.color }} />
                  </div>
                  <div className="flex items-center gap-1.5">
                    {c.public ? (
                      <Globe size={12} style={{ color: "#8B7EC0" }} />
                    ) : (
                      <Lock size={12} style={{ color: "#8B7EC0" }} />
                    )}
                    <span className="text-xs" style={{ color: "#8B7EC0" }}>
                      {c.public ? "Public" : "Private"}
                    </span>
                  </div>
                </div>

                <h3 className="font-bold text-base mb-0.5" style={{ color: "#1A1430" }}>
                  {c.name}
                </h3>
                <p className="text-xs font-medium mb-2" style={{ color: c.color }}>
                  {c.topic}
                </p>
                <p className="text-xs leading-relaxed" style={{ color: "#6B5FA0" }}>
                  {c.description}
                </p>
              </div>

              {/* Tags */}
              <div className="px-5 pb-3 flex flex-wrap gap-1.5">
                {c.tags.map((t) => (
                  <span
                    key={t}
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(255,255,255,0.55)", color: "#6B5FA0" }}
                  >
                    <Hash size={9} className="inline mr-0.5" />
                    {t}
                  </span>
                ))}
              </div>

              {/* Footer */}
              <div className="mt-auto px-5 py-4 border-t border-white/40 flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs" style={{ color: "#6B5FA0" }}>
                  <span className="flex items-center gap-1">
                    <Users size={11} />
                    {c.members.toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageCircle size={11} />
                    {c.posts} posts
                  </span>
                </div>
                <button
                  onClick={() => toggleJoin(c.id)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105"
                  style={
                    isJoined
                      ? { background: c.color + "20", color: c.color }
                      : { background: c.color, color: "#fff" }
                  }
                >
                  {isJoined ? "Joined ✓" : "Join"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <Search size={32} className="mx-auto mb-3" style={{ color: "#C8D8C8" }} />
          <p className="font-medium" style={{ color: "#8B7EC0" }}>
            No communities match &ldquo;{search}&rdquo;
          </p>
          <button
            onClick={() => {
              setShowCreate(true);
              setNewName(search);
            }}
            className="mt-4 text-sm font-semibold"
            style={{ color: "#2D1B69" }}
          >
            Create &ldquo;{search}&rdquo; as a new community →
          </button>
        </div>
      )}

      {/* Community comment / post box */}
      <div className="mt-10 rounded-2xl border p-6" style={{ background: "#FEFCFF", borderColor: "#DDD5F0" }}>
        <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#8B7EC0" }}>
          Post to Community
        </p>
        <RichTextarea
          value={comment}
          onChange={setComment}
          rows={4}
          placeholder="Share an insight, question, or testimony with your community…"
          className="text-sm resize-none"
          style={{ color: "#2D1B69" }}
        />
        <div className="mt-3 flex justify-end">
          <button
            disabled={!comment.trim()}
            onClick={() => { alert("Sign in to post."); setComment(""); }}
            className="px-5 py-2 rounded-xl text-sm font-semibold disabled:opacity-40 transition-all"
            style={{ background: "#2D1B69", color: "#F5F0FF" }}
          >
            Post
          </button>
        </div>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)" }}
        >
          <div
            className="w-full max-w-md rounded-3xl shadow-2xl p-7"
            style={{ background: "#FEFCFF" }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold" style={{ color: "#2D1B69" }}>
                Create a Community
              </h2>
              <button
                onClick={() => setShowCreate(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100"
              >
                <X size={16} style={{ color: "#6B5FA0" }} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label
                  className="text-xs font-semibold uppercase tracking-wide block mb-1.5"
                  style={{ color: "#6B5FA0" }}
                >
                  Community Name *
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Provo 4th Ward Moms"
                  className="w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none"
                  style={{ borderColor: "#DDD5F0", color: "#2D1B69" }}
                />
              </div>

              <div>
                <label
                  className="text-xs font-semibold uppercase tracking-wide block mb-1.5"
                  style={{ color: "#6B5FA0" }}
                >
                  Topic / Focus
                </label>
                <input
                  type="text"
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                  placeholder="e.g. FHE Ideas · Young Families"
                  className="w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none"
                  style={{ borderColor: "#DDD5F0", color: "#2D1B69" }}
                />
              </div>

              <div>
                <label
                  className="text-xs font-semibold uppercase tracking-wide block mb-1.5"
                  style={{ color: "#6B5FA0" }}
                >
                  Description
                </label>
                <RichTextarea
                  value={newDesc}
                  onChange={setNewDesc}
                  rows={3}
                  placeholder="What is this community about? Who should join?"
                  className="px-3.5 py-2.5 text-sm resize-none"
                  style={{ color: "#2D1B69" }}
                />
              </div>

              <div>
                <label
                  className="text-xs font-semibold uppercase tracking-wide block mb-2"
                  style={{ color: "#6B5FA0" }}
                >
                  Visibility
                </label>
                <div className="flex gap-3">
                  {[
                    { val: true, icon: Globe, label: "Public", sub: "Anyone can find & join" },
                    { val: false, icon: Lock, label: "Private", sub: "Invite only" },
                  ].map(({ val, icon: Icon, label, sub }) => (
                    <button
                      key={String(val)}
                      onClick={() => setNewPublic(val)}
                      className="flex-1 flex items-start gap-2.5 p-3 rounded-xl border-2 text-left transition-all"
                      style={
                        newPublic === val
                          ? { borderColor: "#2D1B69", background: "#EDE8F8" }
                          : { borderColor: "#DDD5F0", background: "transparent" }
                      }
                    >
                      <Icon size={16} style={{ color: newPublic === val ? "#2D1B69" : "#8B7EC0", marginTop: 2 }} />
                      <div>
                        <p className="text-sm font-semibold" style={{ color: "#2D1B69" }}>
                          {label}
                        </p>
                        <p className="text-xs" style={{ color: "#8B7EC0" }}>{sub}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  onClick={() => setShowCreate(false)}
                  className="flex-1 py-2.5 rounded-xl border text-sm font-semibold"
                  style={{ borderColor: "#DDD5F0", color: "#6B5FA0" }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!newName.trim()) return;
                    setShowCreate(false);
                    setNewName("");
                    setNewTopic("");
                    setNewDesc("");
                  }}
                  disabled={!newName.trim()}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
                  style={{ background: "#2D1B69", color: "#F5F0FF" }}
                >
                  <Plus size={14} />
                  Create Community
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
