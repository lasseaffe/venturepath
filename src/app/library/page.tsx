"use client";

import { useState } from "react";
import {
  BookMarked,
  Search,
  Filter,
  Folder,
  FolderPlus,
  FileText,
  MessageSquare,
  Home,
  BookOpen,
  Users,
  Plus,
  Trash2,
  Download,
  Share2,
  MoreHorizontal,
  Calendar,
  ChevronRight,
} from "lucide-react";

type TalkType = "sacrament" | "fhe" | "sunday_school" | "youth";

const TYPE_META: Record<TalkType, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  sacrament: { label: "Sacrament Talk", color: "#2D1B69", bg: "linear-gradient(135deg,#EDE8F8,#D8EDD8)", icon: MessageSquare },
  fhe: { label: "FHE Lesson", color: "#D4AF37", bg: "linear-gradient(135deg,#FDF0E8,#F5E0D0)", icon: Home },
  sunday_school: { label: "Sunday School", color: "#3A6A8A", bg: "linear-gradient(135deg,#EDF2F8,#DCE7F5)", icon: BookOpen },
  youth: { label: "Youth Lesson", color: "#8A4A7A", bg: "linear-gradient(135deg,#F5EDF4,#EDD8E8)", icon: Users },
};

interface SavedLesson {
  id: string;
  title: string;
  topic: string;
  type: TalkType;
  date: string;
  words: number;
  folder?: string;
  pinned?: boolean;
}

const SAMPLE_LESSONS: SavedLesson[] = [
  {
    id: "l1",
    title: "Faith in the Lord's Timing",
    topic: "Faith and trusting in God's plan",
    type: "sacrament",
    date: "Mar 30, 2026",
    words: 980,
    folder: "Easter Season",
    pinned: true,
  },
  {
    id: "l2",
    title: "The Resurrection — Easter Lesson",
    topic: "Easter · Resurrection of Jesus Christ",
    type: "sunday_school",
    date: "Apr 1, 2026",
    words: 1450,
    folder: "Easter Season",
  },
  {
    id: "l3",
    title: "FHE: Gratitude in All Things",
    topic: "Gratitude and counting your blessings",
    type: "fhe",
    date: "Mar 23, 2026",
    words: 640,
  },
  {
    id: "l4",
    title: "Strengthening Testimonies",
    topic: "Youth testimony and peer pressure",
    type: "youth",
    date: "Mar 15, 2026",
    words: 820,
  },
  {
    id: "l5",
    title: "The Atonement — A Personal Anchor",
    topic: "Atonement of Jesus Christ",
    type: "sacrament",
    date: "Feb 28, 2026",
    words: 1100,
    folder: "Favourite Talks",
    pinned: true,
  },
];

const FOLDERS = ["Easter Season", "Favourite Talks", "Mission Prep"];

export default function LibraryPage() {
  const [lessons, setLessons] = useState<SavedLesson[]>(SAMPLE_LESSONS);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<TalkType | "all">("all");
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const filtered = lessons.filter((l) => {
    if (activeFolder && l.folder !== activeFolder) return false;
    if (filterType !== "all" && l.type !== filterType) return false;
    if (
      search &&
      !l.title.toLowerCase().includes(search.toLowerCase()) &&
      !l.topic.toLowerCase().includes(search.toLowerCase())
    )
      return false;
    return true;
  });

  const pinned = filtered.filter((l) => l.pinned);
  const rest = filtered.filter((l) => !l.pinned);

  function deleteLesson(id: string) {
    setLessons((prev) => prev.filter((l) => l.id !== id));
    setOpenMenu(null);
  }

  function printLesson(lesson: SavedLesson) {
    window.print();
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-1" style={{ color: "#2D1B69" }}>
          My Library
        </h1>
        <p style={{ color: "#6B5FA0" }}>
          All your saved talks and lessons in one place.
        </p>
      </div>

      <div className="grid md:grid-cols-[220px_1fr] gap-6 items-start">
        {/* Sidebar */}
        <aside className="space-y-2 sticky top-20">
          <button
            onClick={() => setActiveFolder(null)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all"
            style={
              !activeFolder
                ? { background: "#EDE8F8", color: "#2D1B69" }
                : { color: "#6B5FA0" }
            }
          >
            <BookMarked size={14} />
            All lessons
            <span
              className="ml-auto text-xs px-1.5 py-0.5 rounded-full"
              style={{ background: "#2D1B6922", color: "#2D1B69" }}
            >
              {lessons.length}
            </span>
          </button>

          <div className="pt-2">
            <p
              className="text-xs font-semibold uppercase tracking-widest px-3 mb-2"
              style={{ color: "#8B7EC0" }}
            >
              Folders
            </p>
            {FOLDERS.map((f) => (
              <button
                key={f}
                onClick={() => setActiveFolder(activeFolder === f ? null : f)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all"
                style={
                  activeFolder === f
                    ? { background: "#EDE8F8", color: "#2D1B69" }
                    : { color: "#6B5FA0" }
                }
              >
                <Folder size={14} />
                {f}
                <span className="ml-auto text-xs" style={{ color: "#8B7EC0" }}>
                  {lessons.filter((l) => l.folder === f).length}
                </span>
              </button>
            ))}
            <button
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all"
              style={{ color: "#8B7EC0" }}
            >
              <FolderPlus size={14} />
              New folder
            </button>
          </div>

          <div className="pt-3">
            <p
              className="text-xs font-semibold uppercase tracking-widest px-3 mb-2"
              style={{ color: "#8B7EC0" }}
            >
              Filter by type
            </p>
            <button
              onClick={() => setFilterType("all")}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all"
              style={filterType === "all" ? { color: "#2D1B69", fontWeight: 600 } : { color: "#6B5FA0" }}
            >
              All types
            </button>
            {(Object.keys(TYPE_META) as TalkType[]).map((t) => {
              const { label, color, icon: Icon } = TYPE_META[t];
              return (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all"
                  style={filterType === t ? { color, fontWeight: 600 } : { color: "#6B5FA0" }}
                >
                  <Icon size={13} style={{ color }} />
                  {label}
                </button>
              );
            })}
          </div>
        </aside>

        {/* Main content */}
        <main>
          {/* Search + add */}
          <div className="flex gap-3 mb-6">
            <div className="relative flex-1">
              <Search
                size={14}
                className="absolute left-3.5 top-1/2 -translate-y-1/2"
                style={{ color: "#8B7EC0" }}
              />
              <input
                type="text"
                placeholder="Search lessons…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm outline-none"
                style={{ background: "#FEFCFF", borderColor: "#DDD5F0", color: "#2D1B69" }}
              />
            </div>
            <a
              href="/talk-generator"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold"
              style={{ background: "#2D1B69", color: "#F5F0FF" }}
            >
              <Plus size={14} />
              New
            </a>
          </div>

          {filtered.length === 0 ? (
            <div
              className="rounded-2xl border-2 border-dashed py-20 text-center"
              style={{ borderColor: "#C8D8C8" }}
            >
              <FileText size={36} className="mx-auto mb-3" style={{ color: "#C8D8C8" }} />
              <p className="font-medium mb-1" style={{ color: "#8B7EC0" }}>
                No lessons yet
              </p>
              <p className="text-sm mb-5" style={{ color: "#B8C8B8" }}>
                Generate your first talk or lesson to see it here.
              </p>
              <a
                href="/talk-generator"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: "#2D1B69", color: "#F5F0FF" }}
              >
                <Plus size={14} />
                Create your first lesson
              </a>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Pinned */}
              {pinned.length > 0 && (
                <div>
                  <p
                    className="text-xs font-semibold uppercase tracking-widest mb-3"
                    style={{ color: "#8B7EC0" }}
                  >
                    Pinned
                  </p>
                  <div className="space-y-2">
                    {pinned.map((lesson) => (
                      <LessonCard
                        key={lesson.id}
                        lesson={lesson}
                        openMenu={openMenu}
                        setOpenMenu={setOpenMenu}
                        onDelete={deleteLesson}
                        onPrint={printLesson}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Rest */}
              {rest.length > 0 && (
                <div>
                  {pinned.length > 0 && (
                    <p
                      className="text-xs font-semibold uppercase tracking-widest mb-3"
                      style={{ color: "#8B7EC0" }}
                    >
                      Recent
                    </p>
                  )}
                  <div className="space-y-2">
                    {rest.map((lesson) => (
                      <LessonCard
                        key={lesson.id}
                        lesson={lesson}
                        openMenu={openMenu}
                        setOpenMenu={setOpenMenu}
                        onDelete={deleteLesson}
                        onPrint={printLesson}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function LessonCard({
  lesson,
  openMenu,
  setOpenMenu,
  onDelete,
  onPrint,
}: {
  lesson: SavedLesson;
  openMenu: string | null;
  setOpenMenu: (id: string | null) => void;
  onDelete: (id: string) => void;
  onPrint: (lesson: SavedLesson) => void;
}) {
  const { label, color, bg, icon: Icon } = TYPE_META[lesson.type];
  const isOpen = openMenu === lesson.id;

  return (
    <div
      className="rounded-2xl border flex items-center gap-4 px-5 py-4 transition-all hover:shadow-md relative group"
      style={{ background: "#FEFCFF", borderColor: "#DDD5F0" }}
    >
      {/* Type icon */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: bg }}
      >
        <Icon size={16} style={{ color }} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="text-xs font-semibold uppercase tracking-wide"
            style={{ color }}
          >
            {label}
          </span>
          {lesson.folder && (
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: "#EDE8F8", color: "#2D1B69" }}
            >
              <Folder size={9} className="inline mr-0.5" />
              {lesson.folder}
            </span>
          )}
          {lesson.pinned && (
            <span className="text-xs" style={{ color: "#C8B040" }}>
              ★ Pinned
            </span>
          )}
        </div>
        <h3 className="font-bold text-sm mt-0.5 truncate" style={{ color: "#2D1B69" }}>
          {lesson.title}
        </h3>
        <div
          className="flex items-center gap-3 text-xs mt-0.5"
          style={{ color: "#8B7EC0" }}
        >
          <span className="flex items-center gap-1">
            <Calendar size={10} />
            {lesson.date}
          </span>
          <span>~{lesson.words.toLocaleString()} words</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <a
          href="/talk-generator"
          className="p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-100"
        >
          <ChevronRight size={14} style={{ color: "#2D1B69" }} />
        </a>
        <div className="relative">
          <button
            onClick={() => setOpenMenu(isOpen ? null : lesson.id)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <MoreHorizontal size={14} style={{ color: "#8B7EC0" }} />
          </button>
          {isOpen && (
            <div
              className="absolute right-0 top-full mt-1 w-44 rounded-xl shadow-xl border py-1 z-20"
              style={{ background: "#FEFCFF", borderColor: "#DDD5F0" }}
            >
              <button
                onClick={() => { onPrint(lesson); setOpenMenu(null); }}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
                style={{ color: "#2D1B69" }}
              >
                <Download size={13} />
                Save as PDF
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(
                    `Check out my lesson: ${lesson.title}`
                  );
                  setOpenMenu(null);
                }}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
                style={{ color: "#2D1B69" }}
              >
                <Share2 size={13} />
                Share
              </button>
              <div className="h-px my-1" style={{ background: "#EDE8F8" }} />
              <button
                onClick={() => onDelete(lesson.id)}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-sm hover:bg-red-50 transition-colors"
                style={{ color: "#D04040" }}
              >
                <Trash2 size={13} />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
