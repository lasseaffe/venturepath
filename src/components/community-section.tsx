import Link from "next/link";
import { MessageCircle, Users, BookOpen } from "lucide-react";

const discussions = [
  {
    emoji: "🙏",
    category: "Prayer & Fasting",
    title: "Strengthening Family Prayer",
    question: "How do you keep family prayer meaningful and heartfelt — especially with young children in the home?",
    scripture: "Matthew 18:20",
    members: 47,
    color: "#4A7A4A",
    bg: "#EDF5ED",
  },
  {
    emoji: "⏳",
    category: "Faith & Trials",
    title: "Trusting the Lord's Timing",
    question: "What has helped you hold onto faith during seasons when answers felt distant or delayed?",
    scripture: "D&C 58:3–4",
    members: 83,
    color: "#C87A50",
    bg: "#FDF0E8",
  },
  {
    emoji: "🌳",
    category: "Genealogy & Heritage",
    title: "Stories from Your Ancestors",
    question: "What have you discovered through FamilySearch that changed how you see your family line?",
    scripture: "Malachi 4:6",
    members: 62,
    color: "#7A5A3A",
    bg: "#F5EFE8",
  },
  {
    emoji: "🏛️",
    category: "Temple Worship",
    title: "What the Temple Means to Your Family",
    question: "How do you prepare your family spiritually for temple attendance — and what memories have stayed with you?",
    scripture: "D&C 109:8",
    members: 34,
    color: "#3A6A8A",
    bg: "#EDF2F8",
  },
  {
    emoji: "📣",
    category: "Sharing the Gospel",
    title: "Natural Member Missionary Moments",
    question: "What's a natural way you've shared your faith with someone not of our faith — without it feeling forced?",
    scripture: "1 Peter 3:15",
    members: 55,
    color: "#8A4A7A",
    bg: "#F5EDF4",
  },
  {
    emoji: "⭐",
    category: "Youth & Rising Generation",
    title: "Raising Faithful Children Today",
    question: "What practices in your home have helped your children build their own testimonies of the gospel?",
    scripture: "Alma 37:35",
    members: 71,
    color: "#5A7A3A",
    bg: "#F0F5EA",
  },
];

function AvatarStack({ count }: { count: number }) {
  const shown = Math.min(3, Math.floor(count / 20));
  const colors = ["#9BB89A", "#E8B49A", "#A8C4E8"];
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex -space-x-2">
        {Array.from({ length: shown + 1 }).map((_, i) => (
          <div
            key={i}
            className="w-5 h-5 rounded-full border-2 flex items-center justify-center text-[8px] font-bold"
            style={{ background: colors[i % colors.length], borderColor: "#FEFCF7", color: "white" }}
          >
            {String.fromCharCode(65 + i)}
          </div>
        ))}
      </div>
      <span className="text-xs" style={{ color: "#9AAA9A" }}>{count} members</span>
    </div>
  );
}

export function CommunitySection() {
  return (
    <section className="py-20 px-4 relative overflow-hidden" style={{ background: "#FDFAF3" }}>
      {/* Subtle background texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.025]"
        style={{ backgroundImage: "radial-gradient(#4A7A4A 1.5px, transparent 1.5px)", backgroundSize: "28px 28px" }}
      />

      <div className="max-w-6xl mx-auto relative">
        {/* Header */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4 text-xs font-semibold"
            style={{ background: "#EDF5ED", color: "#4A7A4A" }}>
            <Users size={12} />
            Ward Community
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: "#2D4A2D" }}>
            Discuss. Reflect. Grow together.
          </h2>
          <p className="max-w-xl mx-auto text-base leading-relaxed" style={{ color: "#7A9A7A" }}>
            Join meaningful conversations rooted in gospel principles — the kind you&apos;d have over
            the dinner table with a dear ward family.
          </p>
        </div>

        {/* Discussion cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {discussions.map((d) => (
            <div
              key={d.title}
              className="group rounded-2xl p-6 border flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-lg cursor-pointer"
              style={{ background: "#FEFCF7", borderColor: "#DDE8DD" }}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{d.emoji}</span>
                  <span className="text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full"
                    style={{ background: d.bg, color: d.color }}>
                    {d.category}
                  </span>
                </div>
                <MessageCircle size={14} style={{ color: "#C8D8C8" }} />
              </div>

              {/* Title & question */}
              <h3 className="font-bold text-base mb-2 leading-snug" style={{ color: "#2D4A2D" }}>
                {d.title}
              </h3>
              <p className="text-sm leading-relaxed flex-1 mb-4" style={{ color: "#6B7A6B" }}>
                {d.question}
              </p>

              {/* Scripture badge */}
              <div className="flex items-center gap-1.5 mb-4">
                <BookOpen size={11} style={{ color: d.color }} />
                <span className="text-xs font-medium" style={{ color: d.color }}>{d.scripture}</span>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: "#EDF5ED" }}>
                <AvatarStack count={d.members} />
                <span
                  className="text-xs font-semibold flex items-center gap-1 transition-colors duration-200"
                  style={{ color: d.color }}
                >
                  Join →
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-12 text-center">
          <Link
            href="#community"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold border-2 transition-all duration-200 hover:scale-105 hover:shadow-md"
            style={{ borderColor: "#9BB89A", color: "#4A7A4A", background: "#FEFCF7" }}
          >
            <Users size={15} />
            Browse all discussions
          </Link>
          <p className="mt-3 text-xs" style={{ color: "#B8C8B8" }}>
            Free for all members · No account required to read
          </p>
        </div>
      </div>
    </section>
  );
}
