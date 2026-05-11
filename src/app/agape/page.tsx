"use client";

// 1.3-SENSITIVE: This page contains anonymous UGC. All posts support is_flagged + reported_at.
// REQUIRES UGC POLICY LINK IN APP STORE METADATA

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Heart, Share2, Users, Shuffle, Send, Lock,
  Copy, Check, RefreshCw, UserPlus, ChevronLeft,
  Sparkles, Eye,
} from "lucide-react";
import { TypewriterText } from "@/components/ui/TypewriterText";

// ── Prompt pool ───────────────────────────────────────────────────
const PROMPTS = [
  "What is one moment from the past week where you felt Heavenly Father's hand in your life?",
  "Describe a time when the Atonement of Jesus Christ became real and personal to you.",
  "What scripture or hymn has given you the most comfort in a difficult season, and why?",
  "Who in your life best exemplifies Christlike love, and what have they taught you?",
  "What is something you've been praying about that you haven't told many people?",
  "How has your testimony changed or deepened in the past year?",
  "What is one thing about the restored gospel that brings you the most joy?",
  "Describe a service experience that changed the way you see others.",
  "What is the hardest principle for you to fully live, and what helps you keep trying?",
  "What does 'Come Follow Me' mean to you personally — beyond the curriculum?",
  "If you could ask Heavenly Father one question right now, what would it be?",
  "What temple experience has meant the most to you, and why?",
  "How do you personally feel the Spirit? What does it feel like for you specifically?",
  "What is something you've doubted, and how did you find your way back to faith?",
  "What Christlike attribute do you most want to develop this year, and why that one?",
  "Describe a blessing — large or small — that surprised you recently.",
  "What is your testimony of the Book of Mormon in your own words right now?",
  "What does eternal life mean to you personally — not theologically, but in your heart?",
  "When do you feel closest to God, and what creates that closeness for you?",
  "What is one thing you wish the members of your ward or community knew about you?",
  "What has been your biggest spiritual struggle this year, and where are you with it now?",
  "Describe a General Conference talk that changed something in you. What changed?",
  "What would you tell your 16-year-old self about faith and the gospel?",
  "What is a prayer that was answered in an unexpected way?",
];

// ── Simulated partner responses ───────────────────────────────────
const PARTNER_ANSWERS = [
  "I've been thinking about this a lot. It was a quiet Tuesday morning — I was reading 3 Nephi 11 and felt an overwhelming peace I couldn't explain rationally. I knew it was real in a way I hadn't felt in months.",
  "Last year when my father was in the hospital, I prayed more fervently than I ever had. An old neighbor showed up with dinner, completely unprompted. I felt God in that small act more than I have in years of regular church attendance.",
  "During my mission in the Philippines, we taught a family for months with little progress. The day they were baptized, the branch president — who had been baptized himself just two years earlier — wept openly. I understood in that moment what the gospel is actually about.",
  "When I got my patriarchal blessing at 17, the patriarch stopped mid-sentence and had to compose himself. Whatever he was feeling, I felt it too. That moment carried me through a lot of hard things I didn't know were coming.",
  "Honestly? It was a random Sunday when someone from church I barely knew stopped to ask how I was doing — and actually waited for the real answer. It sounds small. But I'd been invisible for a long time and it broke something open in me.",
];

// ── Simulated partner names ───────────────────────────────────────
const PARTNER_NAMES = [
  "Elder Richards", "Sister Andersen", "Brother Kim",
  "Sister Osei", "Elder Lindqvist", "Sister Nakamura",
  "Brother Ferreira", "Sister Yuen",
];

const MOCK_COMMUNITIES = [
  { id: "c1", name: "Sunday School — Ward 14", members: 12 },
  { id: "c2", name: "BYU Study Group", members: 7 },
  { id: "c3", name: "Young Adults SLC", members: 24 },
];

// ── Helpers ───────────────────────────────────────────────────────
function hashStr(s: string): number {
  let h = 0;
  for (const c of s) h = (Math.imul(31, h) + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}
function getPrompt(sessionId: string) {
  return PROMPTS[hashStr(sessionId) % PROMPTS.length];
}
function getPartnerAnswer(sessionId: string) {
  return PARTNER_ANSWERS[hashStr(sessionId + "p") % PARTNER_ANSWERS.length];
}
function getPartnerName(sessionId: string) {
  return PARTNER_NAMES[hashStr(sessionId + "n") % PARTNER_NAMES.length];
}
function getConfessionsPrompt(sessionId: string, category: ConfessionsCategory): string {
  const pool = CONFESSIONS_PROMPTS[category];
  return pool[hashStr(sessionId + category) % pool.length];
}
function makeId() {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

// Quiet Echoes — 4 gospel-specific reaction types (no generic likes)
const QUIET_ECHOES = [
  { id: "peace",      emoji: "🕊️", label: "Peace" },
  { id: "testimony",  emoji: "✦",  label: "Testimony" },
  { id: "prayer",     emoji: "🙏", label: "Prayer" },
  { id: "gratitude",  emoji: "💛", label: "Gratitude" },
] as const;
type EchoId = typeof QUIET_ECHOES[number]["id"];

// ── Confessions types ─────────────────────────────────────────────
type ConfessionsCategory = 'work' | 'relationships' | 'mental-health' | 'faith-doubt';

const CONFESSIONS_CATEGORY_META: Record<ConfessionsCategory, { label: string; icon: string; desc: string }> = {
  'work':          { label: 'Work & Ambition',  icon: '💼', desc: 'Burnout, purpose, career doubt' },
  'relationships': { label: 'Relationships',    icon: '🫂', desc: 'Loneliness, conflict, connection' },
  'mental-health': { label: 'Mental Health',    icon: '🌿', desc: 'Anxiety, self-worth, identity' },
  'faith-doubt':   { label: 'Faith Doubt',      icon: '🕯️', desc: 'Questions, distance, wrestling' },
};

const CONFESSIONS_PROMPTS: Record<ConfessionsCategory, string[]> = {
  'work': [
    "Something I've never admitted about why I chose my career path is…",
    "The version of success I perform for others vs. the one I actually want looks like…",
    "A professional failure I still haven't forgiven myself for is…",
    "The thing that drains me most about my work that I pretend doesn't bother me is…",
    "If I could walk away from my job tomorrow with no consequences, I would or wouldn't, because…",
    "Something I'm jealous of in someone else's career that I've never said out loud is…",
    "The biggest lie I tell myself about my ambitions is…",
    "A dream I've quietly given up on is…",
    "The moment I realized I was working for approval rather than purpose was…",
    "What I wish my younger self knew before choosing this path is…",
  ],
  'relationships': [
    "A person I've hurt that I never properly apologized to is…",
    "The way I push people away without realizing it is…",
    "Something I need from others that I've never been able to ask for directly is…",
    "A relationship I've stayed in longer than I should have, and why…",
    "The version of myself I hide from the people closest to me is…",
    "Something I resent someone for that I've never told them is…",
    "The loneliest I've ever felt while surrounded by people was…",
    "A boundary I consistently let others cross because I'm afraid of what happens if I enforce it…",
    "What I actually mean when I say 'I'm fine' is…",
    "The relationship pattern I keep repeating that I can't seem to break is…",
  ],
  'mental-health': [
    "The thought I'm most ashamed to admit I have regularly is…",
    "Something I do to cope that I know isn't healthy but haven't stopped is…",
    "The story I tell myself about my own worth when no one is watching is…",
    "A fear so specific and embarrassing I've never said it out loud is…",
    "The moment anxiety has cost me something I actually wanted is…",
    "What 'being okay' actually costs me on a daily basis is…",
    "Something I pretend not to care about that actually devastates me is…",
    "The version of myself I was before things got hard looked like…",
    "A thought I've had about myself that I would never say to a friend is…",
    "What I wish the people who love me understood about what I'm carrying is…",
  ],
  'faith-doubt': [
    "A doctrine I've smiled and nodded at while privately disagreeing is…",
    "The moment my faith felt most fragile and what I did with that is…",
    "Something I've stopped praying about because I've given up expecting an answer is…",
    "The version of God I was taught to believe in vs. the one I actually believe in now is…",
    "A question about the Church I'm afraid to ask out loud because of what the answer might mean is…",
    "Something I do out of habit or obligation that I've lost the meaning behind is…",
    "The person in my ward I'm most afraid of disappointing spiritually, and why that is…",
    "A season when I felt completely spiritually abandoned and what I made of it is…",
    "Something I believe privately that I've never said in testimony meeting is…",
    "The gap between the faith I show and the faith I actually have right now is…",
  ],
};

// Confessions Quiet Echoes — distinct from gospel reactions
const CONFESSIONS_ECHOES = [
  { id: "seen",    emoji: "🤍", label: "Seen" },
  { id: "same",    emoji: "🔥", label: "Same" },
  { id: "heard",   emoji: "💬", label: "Heard" },
  { id: "growing", emoji: "🌱", label: "Growing" },
] as const;
type ConfessionsEchoId = typeof CONFESSIONS_ECHOES[number]["id"];

// UGC data model — is_flagged + reported_at required per Apple Guideline 1.3
type AgapePost = {
  id: string;
  answer: string;
  echo?: EchoId;
  is_flagged: boolean;        // 1.3-SENSITIVE
  reported_at?: number;       // 1.3-SENSITIVE
};

type Screen = "home" | "share-setup" | "community-pick" | "category-pick" | "answering" | "waiting" | "revealed";
type Mode = "share" | "community" | "random";

// ── Page ──────────────────────────────────────────────────────────
export default function AgapePage() {
  const [screen, setScreen] = useState<Screen>("home");
  const [mode, setMode] = useState<Mode | null>(null);
  const [sessionId, setSessionId] = useState("");
  const [answer, setAnswer] = useState("");
  const [copied, setCopied] = useState(false);
  const [added, setAdded] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [incomingSession, setIncomingSession] = useState(false);
  const [myEcho, setMyEcho] = useState<EchoId | null>(null);
  const [partnerEcho, setPartnerEcho] = useState<EchoId | ConfessionsEchoId | null>(null);
  const [reported, setReported] = useState(false);
  // Confessions state
  const [activeCategory, setActiveCategory] = useState<'gospel' | 'confessions'>('gospel');
  const [confessionsCategory, setConfessionsCategory] = useState<ConfessionsCategory | null>(null);
  const [myConfessionsEcho, setMyConfessionsEcho] = useState<ConfessionsEchoId | null>(null);

  const partnerName = sessionId ? getPartnerName(sessionId) : "";
  const prompt = sessionId
    ? (activeCategory === 'confessions' && confessionsCategory
        ? getConfessionsPrompt(sessionId, confessionsCategory)
        : getPrompt(sessionId))
    : "";
  const partnerAnswer = sessionId ? getPartnerAnswer(sessionId) : "";

  // Check for incoming session via URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const s = params.get("s");
    if (s) {
      setSessionId(s);
      setMode("share");
      setIncomingSession(true);
      setScreen("answering");
    }
  }, []);

  function startSession(m: Mode) {
    const id = makeId();
    setSessionId(id);
    setMode(m);
    if (typeof window !== "undefined") {
      setShareUrl(`${window.location.origin}/agape?s=${id}`);
    }
    if (activeCategory === 'confessions') {
      setScreen("category-pick");
    } else {
      if (m === "share") setScreen("share-setup");
      else if (m === "community") setScreen("community-pick");
      else setScreen("answering");
    }
  }

  function pickConfessionsCategory(cat: ConfessionsCategory) {
    setConfessionsCategory(cat);
    if (mode === "share") setScreen("share-setup");
    else if (mode === "community") setScreen("community-pick");
    else setScreen("answering");
  }

  async function copyLink() {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  async function shareLink() {
    if (navigator.share) {
      await navigator.share({
        title: "Gospel Reflection — Agapé on HolyFlex",
        text: "I want to do a blind gospel reflection with you. Answer the prompt, then we reveal together.",
        url: shareUrl,
      });
    } else {
      copyLink();
    }
  }

  function submit() {
    if (!answer.trim()) return;
    if (typeof window !== "undefined") {
      localStorage.setItem(`agape-${sessionId}`, answer);
    }
    setScreen("waiting");
    const delay = mode === "random" ? 2200 : 1800;
    setTimeout(() => {
      if (activeCategory === 'confessions') {
        const echoes: ConfessionsEchoId[] = ["seen", "same", "heard", "growing"];
        setPartnerEcho(echoes[Math.floor(Math.random() * echoes.length)]);
      } else {
        const echoes: EchoId[] = ["peace", "testimony", "prayer", "gratitude"];
        setPartnerEcho(echoes[Math.floor(Math.random() * echoes.length)]);
      }
      setScreen("revealed");
    }, delay);
  }

  function reset() {
    setScreen("home");
    setMode(null);
    setSessionId("");
    setAnswer("");
    setAdded(false);
    setIncomingSession(false);
    setMyEcho(null);
    setPartnerEcho(null);
    setReported(false);
    // Confessions state
    setConfessionsCategory(null);
    setMyConfessionsEcho(null);
    if (typeof window !== "undefined") {
      window.history.replaceState({}, "", "/agape");
    }
  }

  // ── HOME ─────────────────────────────────────────────────────────
  if (screen === "home") {
    const isConfessions = activeCategory === 'confessions';
    const accentColor = isConfessions ? '#C4872A' : '#B05A8A';
    const bgGradient = isConfessions
      ? 'linear-gradient(160deg, #FDFAF5 0%, rgba(30,42,58,0.06) 60%, #F5EBF5 100%)'
      : 'linear-gradient(160deg, #FDFAF5 0%, #FDF0F8 60%, #F5EBF5 100%)';
    const heroGradient = isConfessions
      ? 'linear-gradient(135deg, #3D5A7A, #5A7A9A)'
      : 'linear-gradient(135deg, #B05A8A, #C87070)';

    return (
    <div className="min-h-screen px-4 py-20" style={{ background: bgGradient }}>
      <div className="max-w-3xl mx-auto text-center">

        {/* Category switcher */}
        <div className="flex items-center justify-center gap-2 mb-10">
          <button
            onClick={() => setActiveCategory('gospel')}
            className="px-5 py-2 rounded-full text-sm font-semibold transition-all"
            style={activeCategory === 'gospel'
              ? { background: 'linear-gradient(135deg, #B05A8A, #C87070)', color: 'white', boxShadow: '0 2px 12px rgba(176,90,138,0.3)' }
              : { background: '#F5EBF5', color: '#B07A9A', border: '1.5px solid #E0D0E0' }}
          >
            Gospel Reflections
          </button>
          <button
            onClick={() => setActiveCategory('confessions')}
            className="px-5 py-2 rounded-full text-sm font-semibold transition-all"
            style={activeCategory === 'confessions'
              ? { background: 'linear-gradient(135deg, #3D5A7A, #5A7A9A)', color: 'white', boxShadow: '0 2px 12px rgba(61,90,122,0.3)' }
              : { background: '#F5F0E8', color: '#8A6A3A', border: '1.5px solid #E0D5C0' }}
          >
            Confessions
          </button>
        </div>

        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center shadow-lg"
            style={{ background: heroGradient }}>
            <Heart size={36} fill="white" stroke="none" />
          </div>
        </div>

        <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: accentColor }}>
          HolyFlex Agapé
        </p>
        <h1 className="text-4xl md:text-5xl font-bold mb-4" style={{ color: "#2D1A2D" }}>
          {isConfessions ? <>Raw honesty,<br />shared together</> : <>Sacred reflections,<br />shared together</>}
        </h1>
        <p className="text-base leading-relaxed max-w-xl mx-auto mb-3" style={{ color: "#7A5A7A" }}>
          {isConfessions
            ? "You and a partner receive the same prompt about real life. You each answer privately — neither of you can see the other's response until both have sent it. Then the curtain lifts."
            : "You and a partner receive the same gospel prompt. You each write your answer privately — neither of you can see the other's response until both have sent it. Then the curtain lifts."
          }
        </p>
        <p className="text-sm mb-12" style={{ color: "#B09AB0" }}>
          {isConfessions
            ? "Four categories. One honest question. No judgment."
            : "Named after the Greek word for unconditional, selfless love."}
        </p>

        {/* Mode cards */}
        <div className="grid sm:grid-cols-3 gap-4 text-left mb-10">
          <button onClick={() => startSession("community")}
            className="group rounded-2xl border p-6 text-left transition-all hover:-translate-y-1 hover:shadow-xl"
            style={{ background: "#FEFCFF", borderColor: isConfessions ? '#E0D5C0' : "#DDD5DD" }}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
              style={{ background: "linear-gradient(135deg, #EDE8F8, #D8EDD8)" }}>
              <Users size={20} style={{ color: "#2D1B69" }} />
            </div>
            <p className="font-semibold mb-1" style={{ color: "#2D1A2D" }}>Community</p>
            <p className="text-sm" style={{ color: "#9A7A9A" }}>
              Invite someone from one of your communities — a ward member, study group, or friend.
            </p>
            <p className="mt-4 text-xs font-semibold" style={{ color: "#2D1B69" }}>Choose community →</p>
          </button>

          <button onClick={() => startSession("share")}
            className="group rounded-2xl border p-6 text-left transition-all hover:-translate-y-1 hover:shadow-xl"
            style={{ background: "#FEFCFF", borderColor: isConfessions ? '#E0D5C0' : "#DDD5DD" }}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
              style={{ background: "linear-gradient(135deg, #FDF0E8, #F5E0D0)" }}>
              <Share2 size={20} style={{ color: "#D4AF37" }} />
            </div>
            <p className="font-semibold mb-1" style={{ color: "#2D1A2D" }}>Share a link</p>
            <p className="text-sm" style={{ color: "#9A7A9A" }}>
              Generate a unique link and send it via WhatsApp, iMessage, Instagram DM, or any platform.
            </p>
            <p className="mt-4 text-xs font-semibold" style={{ color: "#D4AF37" }}>Get your link →</p>
          </button>

          <button onClick={() => startSession("random")}
            className="group rounded-2xl border p-6 text-left transition-all hover:-translate-y-1 hover:shadow-xl"
            style={{ background: "#FEFCFF", borderColor: isConfessions ? '#E0D5C0' : "#DDD5DD" }}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
              style={{ background: "linear-gradient(135deg, #F0EDF8, #E0D8F5)" }}>
              <Shuffle size={20} style={{ color: "#7A5A9A" }} />
            </div>
            <p className="font-semibold mb-1" style={{ color: "#2D1A2D" }}>Random match</p>
            <p className="text-sm" style={{ color: "#9A7A9A" }}>
              Get paired with an anonymous member of the HolyFlex community. Build a new connection.
            </p>
            <p className="mt-4 text-xs font-semibold" style={{ color: "#7A5A9A" }}>Match me →</p>
          </button>
        </div>

        <p className="text-xs" style={{ color: "#C0A8C0" }}>
          All answers are end-to-end private. No answer is stored on our servers.
        </p>
      </div>
    </div>
    );
  }

  // ── CATEGORY PICK (Confessions only) ──────────────────────────────
  if (screen === "category-pick") return (
    <div className="min-h-screen px-4 py-16 flex items-center justify-center"
      style={{ background: "linear-gradient(160deg, #FDFAF5 0%, rgba(30,42,58,0.06) 60%, #F5EBF5 100%)" }}>
      <div className="max-w-lg w-full">
        <button onClick={reset} className="flex items-center gap-1 text-sm mb-8" style={{ color: "#7A6A4A" }}>
          <ChevronLeft size={16} /> Back
        </button>

        <div className="text-center mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "#C4872A" }}>
            Confessions
          </p>
          <h2 className="text-2xl font-bold mb-2" style={{ color: "#2D1A2D" }}>What are you carrying today?</h2>
          <p className="text-sm" style={{ color: "#9A7A9A" }}>
            Choose a category. You&apos;ll both receive a prompt from that space.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {(Object.keys(CONFESSIONS_CATEGORY_META) as ConfessionsCategory[]).map((cat) => {
            const meta = CONFESSIONS_CATEGORY_META[cat];
            return (
              <button
                key={cat}
                onClick={() => pickConfessionsCategory(cat)}
                className="rounded-2xl border p-5 text-left transition-all hover:-translate-y-1 hover:shadow-xl"
                style={{ background: "#FEFCFF", borderColor: "#E0D5C0" }}
              >
                <span className="text-2xl block mb-3">{meta.icon}</span>
                <p className="font-semibold text-sm mb-1" style={{ color: "#2D1A2D" }}>{meta.label}</p>
                <p className="text-xs leading-relaxed" style={{ color: "#9A7A9A" }}>{meta.desc}</p>
              </button>
            );
          })}
        </div>

        <p className="text-xs text-center mt-6" style={{ color: "#C0A8C0" }}>
          All answers are end-to-end private. No answer is stored on our servers.
        </p>
      </div>
    </div>
  );

  // ── SHARE SETUP ────────────────────────────────────────────────
  if (screen === "share-setup") {
    const isConfessions = activeCategory === 'confessions';
    const accentGradient = isConfessions
      ? 'linear-gradient(135deg, #3D5A7A, #5A7A9A)'
      : 'linear-gradient(135deg, #B05A8A, #C87070)';
    const backColor = isConfessions ? '#7A6A4A' : '#B07A9A';

    return (
      <div className="min-h-screen px-4 py-16 flex items-center justify-center"
        style={{ background: "linear-gradient(160deg, #FDFAF5 0%, #FDF0F8 100%)" }}>
        <div className="max-w-lg w-full">
          <button onClick={reset} className="flex items-center gap-1 text-sm mb-8" style={{ color: backColor }}>
            <ChevronLeft size={16} /> Back
          </button>

          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: accentGradient }}>
              <Heart size={24} fill="white" stroke="none" />
            </div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: "#2D1A2D" }}>Share your reflection link</h2>
            <p className="text-sm" style={{ color: "#9A7A9A" }}>
              Send this link to your partner. Once they open it, you&apos;ll both see the same prompt and can answer privately.
            </p>
          </div>

          <div className="rounded-2xl border p-5 mb-6" style={{ background: "#FEFCFF", borderColor: "#E8D5E8" }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: backColor }}>Your prompt</p>
            <p className="text-sm italic leading-relaxed" style={{ color: "#4A2A4A" }}>
              &ldquo;{sessionId ? prompt : ""}&rdquo;
            </p>
          </div>

          <div className="rounded-xl border flex items-center gap-3 px-4 py-3 mb-4" style={{ background: "#FDFAF5", borderColor: "#DDD5DD" }}>
            <p className="flex-1 text-sm truncate font-mono" style={{ color: "#7A5A7A" }}>{shareUrl}</p>
            <button onClick={copyLink} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
              style={{ background: copied ? "#EDE8F8" : "#F5EBF5", color: copied ? "#2D1B69" : "#7A5A9A" }}>
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>

          <div className="flex gap-3 mb-8">
            <button onClick={shareLink}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm"
              style={{ background: accentGradient, color: "white" }}>
              <Share2 size={15} /> Share via App
            </button>
          </div>

          <div className="rounded-2xl border p-4 text-sm text-center" style={{ background: "#FDF5F5", borderColor: "#E8D5D5" }}>
            <p style={{ color: "#9A5A5A" }}>
              After your partner opens the link and writes their answer, come back here to write yours — then you&apos;ll both reveal together.
            </p>
          </div>

          <button
            onClick={() => setScreen("answering")}
            className="w-full mt-6 py-3 rounded-xl font-semibold text-sm"
            style={{ background: "#F5EBF5", color: "#7A4A7A", border: "1.5px solid #DDD0DD" }}>
            I sent the link — write my answer now
          </button>
        </div>
      </div>
    );
  }

  // ── COMMUNITY PICK ─────────────────────────────────────────────
  if (screen === "community-pick") {
    const isConfessions = activeCategory === 'confessions';
    const backColor = isConfessions ? '#7A6A4A' : '#B07A9A';
    const cardBorder = isConfessions ? '#E0D5C0' : '#DDD5DD';
    const badgeBg = isConfessions ? '#FFF5E8' : '#F0EDF8';
    const badgeColor = isConfessions ? '#7A4A0A' : '#7A5A9A';
    const iconBg = isConfessions ? '#F5F0E8' : '#F5EBF5';
    const iconColor = isConfessions ? '#8A6A3A' : '#A05A8A';
    const linkColor = isConfessions ? '#8A6A3A' : '#A05A8A';

    return (
    <div className="min-h-screen px-4 py-16 flex items-center justify-center"
      style={{ background: "linear-gradient(160deg, #FDFAF5 0%, #FDF0F8 100%)" }}>
      <div className="max-w-lg w-full">
        <button onClick={reset} className="flex items-center gap-1 text-sm mb-8" style={{ color: backColor }}>
          <ChevronLeft size={16} /> Back
        </button>
        <h2 className="text-2xl font-bold mb-2" style={{ color: "#2D1A2D" }}>Choose a community</h2>
        <p className="text-sm mb-8" style={{ color: "#9A7A9A" }}>A random member will receive your reflection invitation.</p>

        <div className="flex flex-col gap-3">
          {MOCK_COMMUNITIES.map((c) => (
            <button key={c.id} onClick={() => setScreen("answering")}
              className="flex items-center justify-between rounded-2xl border px-5 py-4 text-left transition-all hover:shadow-md"
              style={{ background: "#FEFCFF", borderColor: cardBorder }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: iconBg }}>
                  <Users size={16} style={{ color: iconColor }} />
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: "#2D1A2D" }}>{c.name}</p>
                  <p className="text-xs" style={{ color: "#B09AB0" }}>{c.members} members</p>
                </div>
              </div>
              <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ background: badgeBg, color: badgeColor }}>
                Invite →
              </span>
            </button>
          ))}
        </div>

        <div className="mt-6 rounded-xl border p-4 text-center" style={{ background: "#FDFAF5", borderColor: cardBorder }}>
          <p className="text-sm" style={{ color: "#9A7A9A" }}>Not in any communities yet?</p>
          <Link href="/communities" className="text-sm font-semibold mt-1 inline-block" style={{ color: linkColor }}>
            Browse communities →
          </Link>
        </div>
      </div>
    </div>
    );
  }

  // ── ANSWERING ──────────────────────────────────────────────────
  if (screen === "answering") {
    const isConfessions = activeCategory === 'confessions';
    const accentGradient = isConfessions
      ? 'linear-gradient(135deg, #3D5A7A, #5A7A9A)'
      : 'linear-gradient(135deg, #B05A8A, #C87070)';
    const accentColor = isConfessions ? '#C4872A' : '#B07A9A';
    const bgGradient = isConfessions
      ? 'linear-gradient(160deg, #FDFAF5 0%, rgba(30,42,58,0.06) 100%)'
      : 'linear-gradient(160deg, #FDFAF5 0%, #FDF0F8 100%)';

    return (
      <div className="min-h-screen px-4 py-16" style={{ background: bgGradient }}>
        <div className="max-w-2xl mx-auto">
          <button onClick={reset} className="flex items-center gap-1 text-sm mb-8" style={{ color: accentColor }}>
            <ChevronLeft size={16} /> Start over
          </button>

          {incomingSession && (
            <div className="rounded-xl px-4 py-3 mb-6 text-sm flex items-center gap-2"
              style={{ background: "#F5EBF5", color: "#7A4A7A", border: "1.5px solid #E0D0E0" }}>
              <Heart size={14} fill="#B05A8A" stroke="none" />
              Someone sent you a reflection. Answer to reveal their response.
            </div>
          )}

          {isConfessions && confessionsCategory && (
            <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#C4872A' }}>
              Confessions · {CONFESSIONS_CATEGORY_META[confessionsCategory].label}
            </p>
          )}

          <div className="rounded-3xl p-8 mb-6 relative overflow-hidden"
            style={{ background: "linear-gradient(135deg, #2D1A2D 0%, #4A2A4A 100%)" }}>
            <div className="absolute inset-0 opacity-[0.05]"
              style={{ backgroundImage: "radial-gradient(#E8C4E8 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
            <p className="text-xs font-semibold uppercase tracking-widest mb-4 relative" style={{ color: "#B09AB0" }}>
              <Sparkles size={12} className="inline mr-1" />Your reflection prompt
            </p>
            <p className="text-xl font-medium leading-relaxed relative" style={{ color: "#F0E8F0" }}>
              &ldquo;{prompt}&rdquo;
            </p>
          </div>

          <div className="rounded-2xl border mb-6 overflow-hidden" style={{ borderColor: "#E0D0E0" }}>
            <div className="px-5 py-3 flex items-center gap-2 border-b" style={{ background: "#F5EBF5", borderColor: "#E0D0E0" }}>
              <Lock size={13} style={{ color: "#A07AA0" }} />
              <p className="text-xs font-semibold" style={{ color: "#A07AA0" }}>
                {mode === "random" ? "Your match" : partnerName}&apos;s answer — sealed until you both submit
              </p>
            </div>
            <div className="px-5 py-6 flex flex-col items-center gap-2" style={{ background: "#FEFCFF" }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "#F0EBF5" }}>
                <Lock size={16} style={{ color: "#C0A8C0" }} />
              </div>
              <p className="text-xs" style={{ color: "#C0A8C0" }}>Hidden until you submit your answer</p>
            </div>
          </div>

          <div className="rounded-2xl border overflow-hidden mb-6" style={{ borderColor: "#E0D0E0" }}>
            <div className="px-5 py-3 border-b" style={{ background: "#F5EBF5", borderColor: "#E0D0E0" }}>
              <p className="text-xs font-semibold" style={{ color: "#A07AA0" }}>Your answer — write honestly</p>
            </div>
            <div className="p-4" style={{ background: "#FEFCFF" }}>
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                rows={6}
                placeholder="Take your time. There are no wrong answers here…"
                className="w-full resize-none text-sm leading-relaxed outline-none"
                style={{ background: "transparent", color: "#2D1A2D" }}
              />
            </div>
          </div>

          <button
            onClick={submit}
            disabled={!answer.trim()}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-semibold text-base transition-all"
            style={answer.trim()
              ? { background: accentGradient, color: "white", boxShadow: isConfessions ? "0 4px 20px rgba(61,90,122,0.35)" : "0 4px 20px rgba(176,90,138,0.35)" }
              : { background: "#F0EBF0", color: "#C0A8C0" }
            }>
            <Send size={16} /> Seal &amp; Send My Answer
          </button>
          <p className="text-center text-xs mt-3" style={{ color: "#C0A8C0" }}>
            Once sent, you cannot edit your answer.
          </p>
        </div>
      </div>
    );
  }

  // ── WAITING ────────────────────────────────────────────────────
  if (screen === "waiting") {
    const isConfessions = activeCategory === 'confessions';
    const waitGradient = isConfessions
      ? 'linear-gradient(135deg, #3D5A7A, #5A7A9A)'
      : 'linear-gradient(135deg, #B05A8A, #C87070)';
    const dotColor = isConfessions ? '#3D5A7A' : '#B05A8A';

    return (
      <div className="min-h-screen flex items-center justify-center px-4"
        style={{ background: "linear-gradient(160deg, #FDFAF5 0%, #FDF0F8 100%)" }}>
        <div className="max-w-sm w-full text-center">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg animate-pulse"
            style={{ background: waitGradient }}>
            <Lock size={32} style={{ color: "white" }} />
          </div>
          <h2 className="text-2xl font-bold mb-3" style={{ color: "#2D1A2D" }}>Your answer is sealed</h2>
          <p className="text-sm leading-relaxed mb-8" style={{ color: "#9A7A9A" }}>
            {mode === "random"
              ? "Finding your match and waiting for them to answer…"
              : `Waiting for ${partnerName} to submit their answer…`}
          </p>
          <div className="flex justify-center gap-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="w-2 h-2 rounded-full animate-bounce"
                style={{ background: dotColor, animationDelay: `${i * 0.18}s` }} />
            ))}
          </div>
          <p className="text-xs mt-10" style={{ color: "#C0A8C0" }}>Revealing momentarily…</p>
        </div>
      </div>
    );
  }

  // ── REVEALED ───────────────────────────────────────────────────
  if (screen === "revealed") {
    const isConfessions = activeCategory === 'confessions';
    const heroGradient = isConfessions
      ? 'linear-gradient(135deg, #3D5A7A, #5A7A9A)'
      : 'linear-gradient(135deg, #B05A8A, #C87070)';
    const accentColor = isConfessions ? '#C4872A' : '#B07A9A';
    const activeEchoBg = isConfessions ? '#FFF5E8' : '#EDE8F8';
    const activeEchoBorder = isConfessions ? '#C4872A' : '#9B8DC8';
    const activeEchoText = isConfessions ? '#7A4A0A' : '#2D1B69';
    const activeEchoes = isConfessions ? CONFESSIONS_ECHOES : QUIET_ECHOES;
    const currentMyEcho = isConfessions ? myConfessionsEcho : myEcho;
    const setCurrentMyEcho = isConfessions
      ? (id: string) => setMyConfessionsEcho(prev => prev === id ? null : id as ConfessionsEchoId)
      : (id: string) => setMyEcho(prev => prev === (id as EchoId) ? null : id as EchoId);

    return (
      <div className="min-h-screen px-4 py-16" style={{ background: "linear-gradient(160deg, #FDFAF5 0%, #FDF0F8 100%)" }}>
        <div className="max-w-2xl mx-auto">

          <div className="text-center mb-10">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg"
              style={{ background: heroGradient }}>
              <Eye size={28} style={{ color: "white" }} />
            </div>
            <h2 className="text-2xl font-bold mb-1" style={{ color: "#2D1A2D" }}>The curtain has lifted</h2>
            <p className="text-sm" style={{ color: "#9A7A9A" }}>Both answers are now visible. Read with an open heart.</p>
          </div>

          {isConfessions && confessionsCategory && (
            <p className="text-xs font-semibold uppercase tracking-widest mb-4 text-center" style={{ color: '#C4872A' }}>
              Confessions · {CONFESSIONS_CATEGORY_META[confessionsCategory].label}
            </p>
          )}

          <div className="rounded-2xl px-6 py-4 mb-6 text-center"
            style={{ background: "linear-gradient(135deg, #F5EBF5, #F0E8F0)", border: "1px solid #E0D0E0" }}>
            <p className="text-sm italic leading-relaxed" style={{ color: "#4A2A4A" }}>
              &ldquo;{prompt}&rdquo;
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-8">
            <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "#E0D0E0" }}>
              <div className="px-4 py-2.5 border-b flex items-center gap-2" style={{ background: "#F5EBF5", borderColor: "#E0D0E0" }}>
                <div className="w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold"
                  style={{ background: isConfessions ? '#3D5A7A' : '#B05A8A', color: "white" }}>Y</div>
                <p className="text-xs font-semibold" style={{ color: "#7A4A7A" }}>Your answer</p>
              </div>
              <div className="p-5" style={{ background: "#FEFCFF" }}>
                <p className="text-sm leading-relaxed" style={{ color: "#2D1A2D" }}>{answer}</p>
              </div>
            </div>

            <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "#E0D0E0" }}>
              <div className="px-4 py-2.5 border-b flex items-center gap-2" style={{ background: "#EDE8F8", borderColor: "#D0E0D0" }}>
                <div className="w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold"
                  style={{ background: "#2D1B69", color: "white" }}>
                  {partnerName[0]}
                </div>
                <p className="text-xs font-semibold" style={{ color: "#2D1B69" }}>{partnerName}&apos;s answer</p>
                {partnerEcho && (
                  <span className="ml-auto text-xs" style={{ color: "#8B7EC0" }}>
                    {activeEchoes.find(e => e.id === partnerEcho)?.emoji}{" "}
                    {activeEchoes.find(e => e.id === partnerEcho)?.label}
                  </span>
                )}
              </div>
              <div className="p-5" style={{ background: "#FEFCFF" }}>
                <TypewriterText
                  text={partnerAnswer}
                  speed={52}
                  cursorColor="#c8a96e"
                  className="text-sm leading-relaxed"
                  style={{ color: "#2D1A2D" }}
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border p-5 mb-4" style={{ background: "#FEFCFF", borderColor: "#DDD5DD" }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-3 text-center" style={{ color: accentColor }}>
              {isConfessions ? 'Confessions Echoes' : 'Quiet Echoes'}
            </p>
            <p className="text-xs text-center mb-4" style={{ color: "#9A7A9A" }}>How did their answer touch you?</p>
            <div className="flex justify-center gap-3 flex-wrap">
              {activeEchoes.map(({ id, emoji, label }) => (
                <button
                  key={id}
                  onClick={() => setCurrentMyEcho(id)}
                  className="flex flex-col items-center gap-1 px-4 py-2.5 rounded-xl border transition-all"
                  style={{
                    background: currentMyEcho === id ? activeEchoBg : "#FDFAF5",
                    borderColor: currentMyEcho === id ? activeEchoBorder : "#DDD5DD",
                    color: currentMyEcho === id ? activeEchoText : "#9A7A9A",
                  }}
                >
                  <span className="text-lg">{emoji}</span>
                  <span className="text-[10px] font-semibold">{label}</span>
                </button>
              ))}
            </div>
            {currentMyEcho && (
              <p className="text-xs text-center mt-3" style={{ color: accentColor }}>
                You sent a {activeEchoes.find(e => e.id === currentMyEcho)?.label} echo ✦
              </p>
            )}
          </div>

          {!added ? (
            <div className="rounded-2xl border p-5 mb-4 flex items-center justify-between" style={{ background: "#FEFCFF", borderColor: "#DDD5DD" }}>
              <div>
                <p className="text-sm font-semibold" style={{ color: "#2D1A2D" }}>Something resonated?</p>
                <p className="text-xs mt-0.5" style={{ color: "#9A7A9A" }}>Add {partnerName} as a contact.</p>
              </div>
              <button
                onClick={() => setAdded(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold text-xs"
                style={{ background: heroGradient, color: "white" }}>
                <UserPlus size={13} /> Add
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border p-4 mb-4 flex items-center gap-2" style={{ background: "#EDE8F8", borderColor: "#C0D8C0" }}>
              <Check size={15} style={{ color: "#2D1B69" }} />
              <p className="text-sm font-semibold" style={{ color: "#2D1B69" }}>{partnerName} added to your contacts</p>
            </div>
          )}

          {!reported ? (
            <button
              onClick={() => setReported(true)}
              className="text-xs w-full text-center py-2 rounded-xl border transition-colors hover:bg-red-50"
              style={{ borderColor: "#F0D5D5", color: "#C0808080" }}
            >
              Report this content
            </button>
          ) : (
            <p className="text-xs text-center py-2" style={{ color: "#8B7EC0" }}>Report submitted. Thank you for keeping Agapé safe.</p>
          )}

          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <button onClick={reset}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm"
              style={{ background: "#F5EBF5", color: "#7A4A7A", border: "1.5px solid #DDD0DD" }}>
              <RefreshCw size={14} /> New Reflection
            </button>
            <Link href="/communities"
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm"
              style={{ background: "#EDE8F8", color: "#2D1B69", border: "1.5px solid #C0D8C0" }}>
              <Users size={14} /> Explore Communities
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
