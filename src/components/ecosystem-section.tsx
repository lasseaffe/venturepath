import Link from "next/link";
import {
  MessageSquare,
  BookOpen,
  Compass,
  GraduationCap,
  Users,
  Building2,
  HeartHandshake,
} from "lucide-react";
import { GospelSystemDiagram } from "@/components/illustrations/gospel-system-diagram";

const tools = [
  {
    id: "speak",
    name: "HolyFlex Speak",
    tagline: "Talk & Lesson Generator",
    description: "Generate full sacrament talks, FHE lessons, Sunday School plans and youth classes in seconds.",
    icon: MessageSquare,
    status: "live" as const,
    href: "/talk-generator",
    color: "#4A7A4A",
    bg: "#EDF5ED",
  },
  {
    id: "study",
    name: "HolyFlex Study",
    tagline: "Come Follow Me Companion",
    description: "Your AI study guide for the weekly Come Follow Me curriculum — for individuals, couples, and families.",
    icon: BookOpen,
    status: "live" as const,
    href: "/come-follow-me",
    color: "#C87A50",
    bg: "#FDF0E8",
  },
  {
    id: "mission",
    name: "HolyFlex Mission",
    tagline: "Mission Prep Hub",
    description: "Study Preach My Gospel, practice discussions, and prepare for the greatest adventure of your life.",
    icon: Compass,
    status: "live" as const,
    href: "/mission",
    color: "#5A7A9A",
    bg: "#EDF2F8",
  },
  {
    id: "communities",
    name: "HolyFlex Communities",
    tagline: "Ward & Study Communities",
    description: "Create or join communities by topic or ward. Share resources, discuss the gospel, and grow together.",
    icon: Users,
    status: "live" as const,
    href: "/communities",
    color: "#A05A7A",
    bg: "#F8EDF4",
  },
  {
    id: "learn",
    name: "HolyFlex Learn",
    tagline: "Gospel Learning Roadmap",
    description: "Structured courses, quizzes, and progress tracking to deepen your understanding of the restored gospel.",
    icon: GraduationCap,
    status: "live" as const,
    href: "/learn",
    color: "#7A5A3A",
    bg: "#F5EFE8",
  },
  {
    id: "agape",
    name: "HolyFlex Agapé",
    tagline: "Blind Gospel Reflections",
    description: "You and a partner answer the same prompt privately — neither sees the other's response until both have submitted.",
    icon: HeartHandshake,
    status: "live" as const,
    href: "/agape",
    color: "#B05A8A",
    bg: "#F8EDF4",
  },
];

export function EcosystemSection() {
  return (
    <section className="py-20 px-4" style={{ background: "#F5F0E8" }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-14">
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#9BB89A" }}>
            The HolyFlex Family
          </p>
          <h2 className="text-3xl font-bold mb-4" style={{ color: "#2D4A2D" }}>
            One ecosystem. Every need.
          </h2>
          <p className="max-w-xl mx-auto text-base" style={{ color: "#7A9A7A" }}>
            HolyFlex is not just one tool — it&apos;s a growing family of AI companions
            built for every stage of Latter-day Saint life.
          </p>
        </div>

        {/* System diagram — instructional overview */}
        <div
          className="mb-10 rounded-2xl overflow-hidden border"
          style={{ borderColor: "#DDE8DD", background: "#FEFCF7" }}
        >
          <GospelSystemDiagram width="100%" />
        </div>

        {/* Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {tools.map((tool) => {
            const Icon = tool.icon;
            const isLive = tool.status === "live";

            return (
              <Link
                key={tool.id}
                href={tool.href}
                className="group block rounded-2xl p-6 border transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
                style={{
                  background: "#FEFCF7",
                  borderColor: "#DDE8DD",
                  cursor: isLive ? "pointer" : "default",
                }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div
                    className="p-2.5 rounded-xl"
                    style={{ background: tool.bg }}
                  >
                    <Icon size={20} style={{ color: tool.color }} />
                  </div>
                  {isLive ? (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: "#EDF5ED", color: "#4A7A4A" }}>
                      Live
                    </span>
                  ) : (
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: "#F5F0E8", color: "#9AAA9A" }}>
                      Coming Soon
                    </span>
                  )}
                </div>

                <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "#9AAA9A" }}>
                  {tool.name}
                </p>
                <h3 className="font-semibold text-base mb-2" style={{ color: "#2D4A2D" }}>
                  {tool.tagline}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "#6B7A6B" }}>
                  {tool.description}
                </p>

                {isLive && (
                  <p className="mt-4 text-xs font-medium" style={{ color: tool.color }}>
                    Open tool →
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
