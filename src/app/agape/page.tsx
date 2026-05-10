"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Heart, Share2, Users, Shuffle, Send, Lock,
  Copy, Check, RefreshCw, UserPlus, ChevronLeft,
  Sparkles, Eye,
} from "lucide-react";

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
function makeId() {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

type Screen = "home" | "share-setup" | "community-pick" | "answering" | "waiting" | "revealed";
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

  const partnerName = sessionId ? getPartnerName(sessionId) : "";
  const prompt = sessionId ? getPrompt(sessionId) : "";
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
    if (m === "share") setScreen("share-setup");
    else if (m === "community") setScreen("community-pick");
    else { setScreen("answering"); }
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
    setTimeout(() => setScreen("revealed"), delay);
  }

  function reset() {
    setScreen("home");
    setMode(null);
    setSessionId("");
    setAnswer("");
    setAdded(false);
    setIncomingSession(false);
    if (typeof window !== "undefined") {
      window.history.replaceState({}, "", "/agape");
    }
  }

  // ── HOME ─────────────────────────────────────────────────────────
  if (screen === "home") return (
    <div className="min-h-screen px-4 py-20" style={{ background: "linear-gradient(160deg, #FDFAF3 0%, #FDF0F8 60%, #F5EBF5 100%)" }}>
      <div className="max-w-3xl mx-auto text-center">

        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center shadow-lg"
            style={{ background: "linear-gradient(135deg, #B05A8A, #C87070)" }}>
            <Heart size={36} fill="white" stroke="none" />
          </div>
        </div>

        <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#B07A9A" }}>
          HolyFlex Agapé
        </p>
        <h1 className="text-4xl md:text-5xl font-bold mb-4" style={{ color: "#2D1A2D" }}>
          Sacred reflections,<br />shared together
        </h1>
        <p className="text-base leading-relaxed max-w-xl mx-auto mb-3" style={{ color: "#7A5A7A" }}>
          You and a partner receive the same gospel prompt. You each write your answer privately —
          neither of you can see the other&apos;s response until <em>both</em> have sent it.
          Then the curtain lifts.
        </p>
        <p className="text-sm mb-12" style={{ color: "#B09AB0" }}>
          Named after the Greek word for unconditional, selfless love.
        </p>

        {/* Mode cards */}
        <div className="grid sm:grid-cols-3 gap-4 text-left mb-10">
          <button onClick={() => startSession("community")}
            className="group rounded-2xl border p-6 text-left transition-all hover:-translate-y-1 hover:shadow-xl"
            style={{ background: "#FEFCF7", borderColor: "#DDD5DD" }}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
              style={{ background: "linear-gradient(135deg, #EDF5ED, #D8EDD8)" }}>
              <Users size={20} style={{ color: "#4A7A4A" }} />
            </div>
            <p className="font-semibold mb-1" style={{ color: "#2D1A2D" }}>Community</p>
            <p className="text-sm" style={{ color: "#9A7A9A" }}>
              Invite someone from one of your communities — a ward member, study group, or friend.
            </p>
            <p className="mt-4 text-xs font-semibold" style={{ color: "#4A7A4A" }}>Choose community →</p>
          </button>

          <button onClick={() => startSession("share")}
            className="group rounded-2xl border p-6 text-left transition-all hover:-translate-y-1 hover:shadow-xl"
            style={{ background: "#FEFCF7", borderColor: "#DDD5DD" }}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
              style={{ background: "linear-gradient(135deg, #FDF0E8, #F5E0D0)" }}>
              <Share2 size={20} style={{ color: "#C87A50" }} />
            </div>
            <p className="font-semibold mb-1" style={{ color: "#2D1A2D" }}>Share a link</p>
            <p className="text-sm" style={{ color: "#9A7A9A" }}>
              Generate a unique link and send it via WhatsApp, iMessage, Instagram DM, or any platform.
            </p>
            <p className="mt-4 text-xs font-semibold" style={{ color: "#C87A50" }}>Get your link →</p>
          </button>

          <button onClick={() => startSession("random")}
            className="group rounded-2xl border p-6 text-left transition-all hover:-translate-y-1 hover:shadow-xl"
            style={{ background: "#FEFCF7", borderColor: "#DDD5DD" }}>
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

  // ── SHARE SETUP ────────────────────────────────────────────────
  if (screen === "share-setup") return (
    <div className="min-h-screen px-4 py-16 flex items-center justify-center"
      style={{ background: "linear-gradient(160deg, #FDFAF3 0%, #FDF0F8 100%)" }}>
      <div className="max-w-lg w-full">
        <button onClick={reset} className="flex items-center gap-1 text-sm mb-8" style={{ color: "#B07A9A" }}>
          <ChevronLeft size={16} /> Back
        </button>

        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: "linear-gradient(135deg, #B05A8A, #C87070)" }}>
            <Heart size={24} fill="white" stroke="none" />
          </div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: "#2D1A2D" }}>Share your reflection link</h2>
          <p className="text-sm" style={{ color: "#9A7A9A" }}>
            Send this link to your partner. Once they open it, you&apos;ll both see the same prompt and can answer privately.
          </p>
        </div>

        {/* Prompt preview */}
        <div className="rounded-2xl border p-5 mb-6" style={{ background: "#FEFCF7", borderColor: "#E8D5E8" }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "#B07A9A" }}>Your prompt</p>
          <p className="text-sm italic leading-relaxed" style={{ color: "#4A2A4A" }}>
            &ldquo;{sessionId ? getPrompt(sessionId) : ""}&rdquo;
          </p>
        </div>

        {/* Link box */}
        <div className="rounded-xl border flex items-center gap-3 px-4 py-3 mb-4" style={{ background: "#FDFAF3", borderColor: "#DDD5DD" }}>
          <p className="flex-1 text-sm truncate font-mono" style={{ color: "#7A5A7A" }}>{shareUrl}</p>
          <button onClick={copyLink} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
            style={{ background: copied ? "#EDF5ED" : "#F5EBF5", color: copied ? "#4A7A4A" : "#7A5A9A" }}>
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>

        <div className="flex gap-3 mb-8">
          <button onClick={shareLink}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm"
            style={{ background: "linear-gradient(135deg, #B05A8A, #C87070)", color: "white" }}>
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

  // ── COMMUNITY PICK ─────────────────────────────────────────────
  if (screen === "community-pick") return (
    <div className="min-h-screen px-4 py-16 flex items-center justify-center"
      style={{ background: "linear-gradient(160deg, #FDFAF3 0%, #FDF0F8 100%)" }}>
      <div className="max-w-lg w-full">
        <button onClick={reset} className="flex items-center gap-1 text-sm mb-8" style={{ color: "#B07A9A" }}>
          <ChevronLeft size={16} /> Back
        </button>
        <h2 className="text-2xl font-bold mb-2" style={{ color: "#2D1A2D" }}>Choose a community</h2>
        <p className="text-sm mb-8" style={{ color: "#9A7A9A" }}>A random member will receive your reflection invitation.</p>

        <div className="flex flex-col gap-3">
          {MOCK_COMMUNITIES.map((c) => (
            <button key={c.id} onClick={() => setScreen("answering")}
              className="flex items-center justify-between rounded-2xl border px-5 py-4 text-left transition-all hover:shadow-md"
              style={{ background: "#FEFCF7", borderColor: "#DDD5DD" }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#F5EBF5" }}>
                  <Users size={16} style={{ color: "#A05A8A" }} />
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: "#2D1A2D" }}>{c.name}</p>
                  <p className="text-xs" style={{ color: "#B09AB0" }}>{c.members} members</p>
                </div>
              </div>
              <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ background: "#F0EDF8", color: "#7A5A9A" }}>
                Invite →
              </span>
            </button>
          ))}
        </div>

        <div className="mt-6 rounded-xl border p-4 text-center" style={{ background: "#FDFAF3", borderColor: "#DDD5DD" }}>
          <p className="text-sm" style={{ color: "#9A7A9A" }}>Not in any communities yet?</p>
          <Link href="/communities" className="text-sm font-semibold mt-1 inline-block" style={{ color: "#A05A8A" }}>
            Browse communities →
          </Link>
        </div>
      </div>
    </div>
  );

  // ── ANSWERING ──────────────────────────────────────────────────
  if (screen === "answering") return (
    <div className="min-h-screen px-4 py-16" style={{ background: "linear-gradient(160deg, #FDFAF3 0%, #FDF0F8 100%)" }}>
      <div className="max-w-2xl mx-auto">
        <button onClick={reset} className="flex items-center gap-1 text-sm mb-8" style={{ color: "#B07A9A" }}>
          <ChevronLeft size={16} /> Start over
        </button>

        {incomingSession && (
          <div className="rounded-xl px-4 py-3 mb-6 text-sm flex items-center gap-2"
            style={{ background: "#F5EBF5", color: "#7A4A7A", border: "1.5px solid #E0D0E0" }}>
            <Heart size={14} fill="#B05A8A" stroke="none" />
            Someone sent you a gospel reflection. Answer to reveal their response.
          </div>
        )}

        {/* Prompt card */}
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

        {/* Partner's locked answer */}
        <div className="rounded-2xl border mb-6 overflow-hidden" style={{ borderColor: "#E0D0E0" }}>
          <div className="px-5 py-3 flex items-center gap-2 border-b" style={{ background: "#F5EBF5", borderColor: "#E0D0E0" }}>
            <Lock size={13} style={{ color: "#A07AA0" }} />
            <p className="text-xs font-semibold" style={{ color: "#A07AA0" }}>
              {mode === "random" ? "Your match" : partnerName}&apos;s answer — sealed until you both submit
            </p>
          </div>
          <div className="px-5 py-6 flex flex-col items-center gap-2" style={{ background: "#FEFCF7" }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "#F0EBF5" }}>
              <Lock size={16} style={{ color: "#C0A8C0" }} />
            </div>
            <p className="text-xs" style={{ color: "#C0A8C0" }}>Hidden until you submit your answer</p>
          </div>
        </div>

        {/* Your answer */}
        <div className="rounded-2xl border overflow-hidden mb-6" style={{ borderColor: "#E0D0E0" }}>
          <div className="px-5 py-3 border-b" style={{ background: "#F5EBF5", borderColor: "#E0D0E0" }}>
            <p className="text-xs font-semibold" style={{ color: "#A07AA0" }}>Your answer — write from the heart</p>
          </div>
          <div className="p-4" style={{ background: "#FEFCF7" }}>
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
            ? { background: "linear-gradient(135deg, #B05A8A, #C87070)", color: "white", boxShadow: "0 4px 20px rgba(176,90,138,0.35)" }
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

  // ── WAITING ────────────────────────────────────────────────────
  if (screen === "waiting") return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "linear-gradient(160deg, #FDFAF3 0%, #FDF0F8 100%)" }}>
      <div className="max-w-sm w-full text-center">
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg animate-pulse"
          style={{ background: "linear-gradient(135deg, #B05A8A, #C87070)" }}>
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
              style={{ background: "#B05A8A", animationDelay: `${i * 0.18}s` }} />
          ))}
        </div>
        <p className="text-xs mt-10" style={{ color: "#C0A8C0" }}>Revealing momentarily…</p>
      </div>
    </div>
  );

  // ── REVEALED ───────────────────────────────────────────────────
  if (screen === "revealed") return (
    <div className="min-h-screen px-4 py-16" style={{ background: "linear-gradient(160deg, #FDFAF3 0%, #FDF0F8 100%)" }}>
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg"
            style={{ background: "linear-gradient(135deg, #B05A8A, #C87070)" }}>
            <Eye size={28} style={{ color: "white" }} />
          </div>
          <h2 className="text-2xl font-bold mb-1" style={{ color: "#2D1A2D" }}>The curtain has lifted</h2>
          <p className="text-sm" style={{ color: "#9A7A9A" }}>Both answers are now visible. Read with an open heart.</p>
        </div>

        {/* Prompt */}
        <div className="rounded-2xl px-6 py-4 mb-6 text-center"
          style={{ background: "linear-gradient(135deg, #F5EBF5, #F0E8F0)", border: "1px solid #E0D0E0" }}>
          <p className="text-sm italic leading-relaxed" style={{ color: "#4A2A4A" }}>
            &ldquo;{prompt}&rdquo;
          </p>
        </div>

        {/* Both answers */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          {/* Your answer */}
          <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "#E0D0E0" }}>
            <div className="px-4 py-2.5 border-b flex items-center gap-2" style={{ background: "#F5EBF5", borderColor: "#E0D0E0" }}>
              <div className="w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold"
                style={{ background: "#B05A8A", color: "white" }}>Y</div>
              <p className="text-xs font-semibold" style={{ color: "#7A4A7A" }}>Your answer</p>
            </div>
            <div className="p-5" style={{ background: "#FEFCF7" }}>
              <p className="text-sm leading-relaxed" style={{ color: "#2D1A2D" }}>{answer}</p>
            </div>
          </div>

          {/* Partner's answer */}
          <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "#E0D0E0" }}>
            <div className="px-4 py-2.5 border-b flex items-center gap-2" style={{ background: "#EDF5ED", borderColor: "#D0E0D0" }}>
              <div className="w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold"
                style={{ background: "#4A7A4A", color: "white" }}>
                {partnerName[0]}
              </div>
              <p className="text-xs font-semibold" style={{ color: "#2D4A2D" }}>{partnerName}&apos;s answer</p>
            </div>
            <div className="p-5" style={{ background: "#FEFCF7" }}>
              <p className="text-sm leading-relaxed" style={{ color: "#2D1A2D" }}>{partnerAnswer}</p>
            </div>
          </div>
        </div>

        {/* Add contact CTA */}
        {!added ? (
          <div className="rounded-2xl border p-6 mb-4 text-center" style={{ background: "#FEFCF7", borderColor: "#DDD5DD" }}>
            <Heart size={20} className="mx-auto mb-3" style={{ color: "#B05A8A" }} />
            <p className="text-sm font-semibold mb-1" style={{ color: "#2D1A2D" }}>
              Something resonated?
            </p>
            <p className="text-xs mb-4" style={{ color: "#9A7A9A" }}>
              Add {partnerName} as a contact to keep building this connection.
            </p>
            <button
              onClick={() => setAdded(true)}
              className="flex items-center gap-2 mx-auto px-5 py-2.5 rounded-xl font-semibold text-sm"
              style={{ background: "linear-gradient(135deg, #B05A8A, #C87070)", color: "white" }}>
              <UserPlus size={15} /> Add {partnerName} as a Contact
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border p-5 mb-4 text-center" style={{ background: "#EDF5ED", borderColor: "#C0D8C0" }}>
            <Check size={18} className="mx-auto mb-2" style={{ color: "#4A7A4A" }} />
            <p className="text-sm font-semibold" style={{ color: "#2D4A2D" }}>
              {partnerName} added to your contacts
            </p>
            <p className="text-xs mt-1" style={{ color: "#6B9A6B" }}>You can find them in your Communities.</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button onClick={reset}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm"
            style={{ background: "#F5EBF5", color: "#7A4A7A", border: "1.5px solid #DDD0DD" }}>
            <RefreshCw size={14} /> New Reflection
          </button>
          <Link href="/communities"
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm"
            style={{ background: "#EDF5ED", color: "#2D4A2D", border: "1.5px solid #C0D8C0" }}>
            <Users size={14} /> Explore Communities
          </Link>
        </div>
      </div>
    </div>
  );

  return null;
}
