"use client";

import { useState, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getTopicImageUrl } from "@/lib/topic-images";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, Copy, RotateCcw, Check, FileText, Sparkles,
  RefreshCw, Upload, Share2, Download, BookOpen, Plus,
  ChevronDown, ChevronUp, Video, Printer, BookMarked,
  Wand2, Link2,
} from "lucide-react";

// ── Scripture extractor ──────────────────────────────────────────
const SCRIPTURE_PATTERN =
  /(?:(?:1st?|2nd?|3rd?|4th?|First|Second|Third|Fourth)\s+)?(?:Nephi|Mosiah|Alma|Helaman|Ether|Moroni|Jacob|Enos|Jarom|Omni|Words of Mormon|3\s*Nephi|4\s*Nephi|Mormon|D&C|Doctrine\s*&?\s*Covenants|Doctrine\s*and\s*Covenants|Moses|Abraham|Pearl of Great Price|Matthew|Mark|Luke|John|Acts|Romans|Corinthians|Galatians|Ephesians|Philippians|Colossians|Thessalonians|Timothy|Titus|Philemon|Hebrews|James|Peter|Jude|Revelation|Revelations|Genesis|Exodus|Leviticus|Numbers|Deuteronomy|Joshua|Judges|Ruth|Samuel|Kings|Chronicles|Ezra|Nehemiah|Esther|Job|Psalms?|Proverbs|Ecclesiastes|Song of Solomon|Isaiah|Jeremiah|Lamentations|Ezekiel|Daniel|Hosea|Joel|Amos|Obadiah|Jonah|Micah|Nahum|Habakkuk|Zephaniah|Haggai|Zechariah|Malachi|Articles of Faith)\s+\d+(?::\d+(?:[–\-]\d+)?)?/gi;

function extractScriptures(text: string): string[] {
  const matches = text.match(SCRIPTURE_PATTERN) ?? [];
  return [...new Set(matches)].slice(0, 20);
}

// ── Topic image cycling ──────────────────────────────────────────
const EXTRA_IMAGE_IDS = [
  "1506905925346-21bda4d32df4",
  "1464822759023-fed622ff2c3b",
  "1519681393784-d120267933ba",
  "1448375240586-882707db888b",
  "1432888498266-38ffec3eaf0a",
  "1499209974431-9dddcece7f88",
  "1473116763249-dec59e8fdbfc",
  "1501854140801-50d01698950b",
];

function buildUrl(id: string) {
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=900&q=75`;
}

// ── Related topics by keyword ────────────────────────────────────
function getRelatedTopics(topic: string): string[] {
  const t = topic.toLowerCase();
  if (t.includes("faith") || t.includes("trust"))
    return ["Overcoming Doubt", "The Miracle of Forgiveness", "God's Plan of Happiness"];
  if (t.includes("prayer") || t.includes("pray"))
    return ["Fasting and Prayer", "Seeking Personal Revelation", "Gratitude in Prayer"];
  if (t.includes("easter") || t.includes("resurrect") || t.includes("atonement"))
    return ["The Living Christ", "Redemption Through Grace", "Covenant Promises"];
  if (t.includes("family") || t.includes("home"))
    return ["Eternal Marriage", "Teaching Children the Gospel", "Family History and Sealing"];
  if (t.includes("mission") || t.includes("missionary"))
    return ["Preach My Gospel", "Every Member a Missionary", "The Gathering of Israel"];
  if (t.includes("scripture") || t.includes("study"))
    return ["Feasting on the Word of God", "Come Follow Me Principles", "Daily Scripture Habits"];
  return [
    "The Infinite Atonement",
    "Living by the Spirit",
    "Seeking First the Kingdom of God",
  ];
}

const ENHANCEMENT_TYPES = [
  { value: "topic", label: "Related Topic", placeholder: "e.g. Overcoming doubt through service" },
  { value: "scripture", label: "Scripture / Psalm", placeholder: "e.g. Alma 34:14 or Psalm 23" },
  { value: "video", label: "Video / Resource URL", placeholder: "e.g. youtube.com/..." },
  { value: "story", label: "Story / Analogy", placeholder: "e.g. The prodigal son" },
];

export default function TalkGeneratorPage() {
  const [type, setType] = useState("sacrament");
  const [topic, setTopic] = useState("");
  const [scripture, setScripture] = useState("");
  const [audience, setAudience] = useState("general");
  const [length, setLength] = useState("medium");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Graphic state
  const [contextImageUrl, setContextImageUrl] = useState("");
  const [imageIdx, setImageIdx] = useState(0);
  const [customImageUrl, setCustomImageUrl] = useState("");
  const uploadRef = useRef<HTMLInputElement>(null);

  // Enhance state
  const [showEnhance, setShowEnhance] = useState(false);
  const [enhanceType, setEnhanceType] = useState("topic");
  const [enhanceInput, setEnhanceInput] = useState("");
  const [enhancing, setEnhancing] = useState(false);

  // Quoted scriptures
  const [showQuotes, setShowQuotes] = useState(false);

  // Share / download
  const [shareMsg, setShareMsg] = useState("");

  const abortRef = useRef<AbortController | null>(null);

  const allImageUrls = [contextImageUrl, ...EXTRA_IMAGE_IDS.map(buildUrl)].filter(Boolean);
  const displayImage = customImageUrl || allImageUrls[imageIdx] || "";

  async function generate() {
    if (!topic.trim()) return;
    setOutput("");
    const baseUrl = getTopicImageUrl(topic, scripture);
    setContextImageUrl(baseUrl);
    setImageIdx(0);
    setCustomImageUrl("");
    setShowEnhance(false);
    setShowQuotes(false);
    setLoading(true);
    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/generate-talk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, topic, scripture, audience, length }),
        signal: abortRef.current.signal,
      });

      if (!res.body) throw new Error("No response body");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let text = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setOutput(text);
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setOutput("Something went wrong. Please check your connection and try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function enhance() {
    if (!enhanceInput.trim() || !output) return;
    setEnhancing(true);
    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/enhance-talk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalTopic: topic,
          originalContent: output,
          enhancement: enhanceInput,
          enhancementType: enhanceType,
        }),
        signal: abortRef.current.signal,
      });

      if (!res.body) throw new Error("No body");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let addition = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        addition += decoder.decode(value, { stream: true });
        setOutput(output + "\n\n---\n\n" + addition);
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        console.error(err);
      }
    } finally {
      setEnhancing(false);
      setEnhanceInput("");
    }
  }

  function stop() {
    abortRef.current?.abort();
    setLoading(false);
    setEnhancing(false);
  }

  async function copyToClipboard() {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function cyclImage() {
    setCustomImageUrl("");
    setImageIdx((i) => (i + 1) % Math.max(allImageUrls.length, 1));
  }

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setCustomImageUrl(url);
  }

  async function share() {
    const text = `${typeLabels[type]}: "${topic}"\n\nGenerated with HolyFlex — holyflex.com`;
    if (navigator.share) {
      try {
        await navigator.share({ title: typeLabels[type], text });
      } catch {
        /* user cancelled */
      }
    } else {
      await navigator.clipboard.writeText(text);
      setShareMsg("Link copied!");
      setTimeout(() => setShareMsg(""), 2000);
    }
  }

  function savePdf() {
    window.print();
  }

  const relatedTopics = getRelatedTopics(topic);
  const quotedScriptures = extractScriptures(output);

  const typeLabels: Record<string, string> = {
    sacrament: "Sacrament Meeting Talk",
    fhe: "Family Home Evening Lesson",
    sunday_school: "Sunday School Lesson",
    youth: "Youth Class Lesson",
  };

  const enhancePlaceholder =
    ENHANCEMENT_TYPES.find((e) => e.value === enhanceType)?.placeholder ?? "";

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          nav, header, aside, .no-print { display: none !important; }
          .print-content { max-width: 100% !important; padding: 0 !important; }
        }
      `}</style>

      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: "#2D4A2D" }}>
            Talk &amp; Lesson Generator
          </h1>
          <p style={{ color: "#7A9A7A" }}>
            Enter your topic and we&apos;ll create a faith-positive starting point for your preparation.
          </p>
        </div>

        <div className="grid md:grid-cols-[340px_1fr] gap-6 items-start">
          {/* ── Form ── */}
          <Card
            className="border shadow-sm sticky top-20 no-print"
            style={{ background: "#FEFCF7", borderColor: "#DDE8DD" }}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-base" style={{ color: "#2D4A2D" }}>
                Configure your lesson
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#7A9A7A" }}>
                  Type
                </label>
                <Select value={type} onValueChange={(v) => v && setType(v)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sacrament">Sacrament Meeting Talk</SelectItem>
                    <SelectItem value="fhe">Family Home Evening Lesson</SelectItem>
                    <SelectItem value="sunday_school">Sunday School Lesson</SelectItem>
                    <SelectItem value="youth">Youth Class Lesson</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#7A9A7A" }}>
                  Topic <span style={{ color: "#C87A50" }}>*</span>
                </label>
                <Textarea
                  placeholder="e.g. Faith and trusting in the Lord's timing"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  rows={3}
                  className="resize-none text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#7A9A7A" }}>
                  Scripture{" "}
                  <span className="font-normal normal-case" style={{ color: "#9AAA9A" }}>
                    (optional)
                  </span>
                </label>
                <Textarea
                  placeholder="e.g. D&C 58:3–4"
                  value={scripture}
                  onChange={(e) => setScripture(e.target.value)}
                  rows={2}
                  className="resize-none text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#7A9A7A" }}>
                    Audience
                  </label>
                  <Select value={audience} onValueChange={(v) => v && setAudience(v)}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">Adults</SelectItem>
                      <SelectItem value="youth">Youth</SelectItem>
                      <SelectItem value="children">Primary</SelectItem>
                      <SelectItem value="family">Family</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#7A9A7A" }}>
                    Length
                  </label>
                  <Select value={length} onValueChange={(v) => v && setLength(v)}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="short">3–5 min</SelectItem>
                      <SelectItem value="medium">7–10 min</SelectItem>
                      <SelectItem value="long">12–15 min</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="pt-1">
                {loading ? (
                  <Button onClick={stop} variant="outline" className="w-full">
                    <Loader2 className="animate-spin mr-2" size={15} />
                    Generating… tap to stop
                  </Button>
                ) : (
                  <button
                    onClick={generate}
                    disabled={!topic.trim()}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-40"
                    style={{ background: "#4A7A4A", color: "#F5F0E8" }}
                  >
                    <Sparkles size={15} />
                    Generate {typeLabels[type] ?? "Lesson"}
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between text-xs pt-1" style={{ color: "#9AAA9A" }}>
                <span>Free tier</span>
                <Badge variant="secondary" className="text-xs" style={{ background: "#EDF5ED", color: "#4A7A4A" }}>
                  0 / 3 this month
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* ── Output panel ── */}
          <div className="flex flex-col gap-3">
            {/* Empty state */}
            {!output && !loading && (
              <div
                className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed py-24 text-center no-print"
                style={{ borderColor: "#C8D8C8", background: "#FEFCF7" }}
              >
                <FileText size={36} className="mb-3" style={{ color: "#C8D8C8" }} />
                <p className="text-sm font-medium" style={{ color: "#9AAA9A" }}>
                  Your {typeLabels[type] ?? "lesson"} will appear here
                </p>
                <p className="text-xs mt-1" style={{ color: "#B8C8B8" }}>
                  Fill in the form and click Generate
                </p>
              </div>
            )}

            {/* Loading skeleton */}
            {loading && !output && (
              <div
                className="rounded-2xl border shadow-sm overflow-hidden"
                style={{ background: "#FEFCF7", borderColor: "#DDE8DD" }}
              >
                {displayImage && (
                  <div className="relative h-40 overflow-hidden animate-pulse" style={{ background: "#EDF5ED" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={displayImage} alt="" className="w-full h-full object-cover opacity-60" />
                    <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 40%, #FEFCF7 100%)" }} />
                  </div>
                )}
                <div className="p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <Loader2 size={18} className="animate-spin" style={{ color: "#9BB89A" }} />
                    <span className="text-sm" style={{ color: "#7A9A7A" }}>
                      Writing your {typeLabels[type]}…
                    </span>
                  </div>
                  <div className="space-y-3 animate-pulse">
                    <div className="h-5 rounded w-2/3" style={{ background: "#EDF5ED" }} />
                    <div className="h-3 rounded w-full" style={{ background: "#EDF5ED" }} />
                    <div className="h-3 rounded w-5/6" style={{ background: "#EDF5ED" }} />
                    <div className="h-3 rounded w-full" style={{ background: "#EDF5ED" }} />
                    <div className="h-3 rounded w-4/5" style={{ background: "#EDF5ED" }} />
                  </div>
                </div>
              </div>
            )}

            {/* Generated content */}
            {output && (
              <>
                <div
                  className="rounded-2xl border shadow-sm overflow-hidden print-content"
                  style={{ background: "#FEFCF7", borderColor: "#DDE8DD" }}
                >
                  {/* Toolbar */}
                  <div
                    className="flex items-center justify-between px-5 py-3 border-b no-print"
                    style={{ background: "linear-gradient(135deg, #F5F0E8 0%, #EDF5ED 100%)", borderColor: "#DDE8DD" }}
                  >
                    <div className="flex items-center gap-2">
                      <FileText size={14} style={{ color: "#4A7A4A" }} />
                      <span className="text-xs font-medium" style={{ color: "#2D4A2D" }}>
                        {typeLabels[type]}
                      </span>
                      {loading && (
                        <Loader2 size={12} className="animate-spin" style={{ color: "#9AAA9A" }} />
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1 flex-wrap">
                      {/* Copy */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={copyToClipboard}
                        className="h-7 px-2 text-xs"
                        style={{ color: "#7A9A7A" }}
                      >
                        {copied ? (
                          <><Check size={12} className="mr-1" style={{ color: "#4A7A4A" }} /><span style={{ color: "#4A7A4A" }}>Copied!</span></>
                        ) : (
                          <><Copy size={12} className="mr-1" />Copy</>
                        )}
                      </Button>

                      {/* Share */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={share}
                        className="h-7 px-2 text-xs"
                        style={{ color: "#7A9A7A" }}
                      >
                        <Share2 size={12} className="mr-1" />
                        {shareMsg || "Share"}
                      </Button>

                      {/* Download PDF */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={savePdf}
                        className="h-7 px-2 text-xs"
                        style={{ color: "#7A9A7A" }}
                      >
                        <Printer size={12} className="mr-1" />
                        PDF
                      </Button>

                      {/* Download other formats */}
                      <div className="relative group">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          style={{ color: "#7A9A7A" }}
                        >
                          <Download size={12} className="mr-1" />
                          More ↓
                        </Button>
                        <div
                          className="absolute right-0 top-full mt-1 w-48 rounded-xl shadow-xl border py-1 z-20 hidden group-hover:block"
                          style={{ background: "#FEFCF7", borderColor: "#DDE8DD" }}
                        >
                          {[
                            { label: "Save as PDF", icon: Printer, action: savePdf },
                            {
                              label: "Copy as Markdown",
                              icon: FileText,
                              action: copyToClipboard,
                            },
                            {
                              label: "PNG / JPG (Premium)",
                              icon: Download,
                              action: () => alert("Image export is a Premium feature. Upgrade to unlock."),
                            },
                            {
                              label: "Video Animation (Premium)",
                              icon: Video,
                              action: () => alert("Video generation is a Premium feature. Coming soon!"),
                            },
                          ].map(({ label, icon: Icon, action }) => (
                            <button
                              key={label}
                              onClick={action}
                              className="w-full flex items-center gap-2.5 px-4 py-2 text-xs hover:bg-gray-50 transition-colors"
                              style={{ color: "#2D4A2D" }}
                            >
                              <Icon size={12} />
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Clear */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setOutput(""); setShowEnhance(false); }}
                        className="h-7 px-2 text-xs"
                        style={{ color: "#7A9A7A" }}
                      >
                        <RotateCcw size={12} className="mr-1" />
                        Clear
                      </Button>
                    </div>
                  </div>

                  {/* Contextual image + controls */}
                  {displayImage && (
                    <div className="relative">
                      <div className="relative h-52 overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={displayImage}
                          alt="Visual related to your topic"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                        <div
                          className="absolute inset-0"
                          style={{
                            background:
                              "linear-gradient(to bottom, transparent 30%, #FEFCF7 100%)",
                          }}
                        />
                      </div>

                      {/* Image controls — overlaid bottom right */}
                      <div className="absolute bottom-3 right-3 flex gap-1.5 no-print">
                        <button
                          onClick={cyclImage}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium backdrop-blur-sm"
                          style={{ background: "rgba(45,74,45,0.75)", color: "#C8DCC8" }}
                          title="Generate new graphic"
                        >
                          <RefreshCw size={11} />
                          New image
                        </button>
                        <button
                          onClick={() => uploadRef.current?.click()}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium backdrop-blur-sm"
                          style={{ background: "rgba(45,74,45,0.75)", color: "#C8DCC8" }}
                          title="Upload your own image"
                        >
                          <Upload size={11} />
                          Upload
                        </button>
                        <input
                          ref={uploadRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleUpload}
                        />
                      </div>
                    </div>
                  )}

                  {/* Document body */}
                  <div className="px-8 py-8 max-h-[60vh] overflow-y-auto">
                    <div
                      className="
                        prose prose-slate max-w-none
                        prose-headings:font-semibold
                        prose-h1:text-2xl prose-h1:mb-4 prose-h1:mt-0
                        prose-h2:text-lg prose-h2:mt-8 prose-h2:mb-3 prose-h2:pb-2
                        prose-h3:text-base prose-h3:mt-6 prose-h3:mb-2
                        prose-p:text-[0.925rem] prose-p:leading-7
                        prose-strong:font-semibold
                        prose-blockquote:border-l-4 prose-blockquote:px-4 prose-blockquote:py-1 prose-blockquote:rounded-r-lg prose-blockquote:not-italic
                        prose-ul:space-y-1 prose-li:text-[0.925rem]
                        prose-ol:space-y-1
                        prose-hr:my-6
                      "
                      style={{
                        "--tw-prose-headings": "#2D4A2D",
                        "--tw-prose-body": "#3D4A3D",
                        "--tw-prose-bold": "#1A2818",
                        "--tw-prose-links": "#4A7A4A",
                        "--tw-prose-hr": "#DDE8DD",
                        "--tw-prose-quotes": "#5A7A5A",
                        "--tw-prose-quote-borders": "#E8B49A",
                        "--tw-prose-bullets": "#9BB89A",
                        "--tw-prose-counters": "#9BB89A",
                      } as React.CSSProperties}
                    >
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {output}
                      </ReactMarkdown>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="px-8 py-4 border-t" style={{ background: "#FDF5EE", borderColor: "#F0DDD0" }}>
                    <p className="text-xs leading-relaxed" style={{ color: "#A06040" }}>
                      <strong>Remember:</strong> This is a starting point. Study the scriptures, pray, and let the Holy Ghost guide you as you make this message your own.
                    </p>
                  </div>
                </div>

                {/* ── Quoted Scriptures ── */}
                {quotedScriptures.length > 0 && (
                  <div
                    className="rounded-2xl border overflow-hidden no-print"
                    style={{ background: "#FEFCF7", borderColor: "#DDE8DD" }}
                  >
                    <button
                      onClick={() => setShowQuotes(!showQuotes)}
                      className="w-full flex items-center justify-between px-5 py-3.5 text-left"
                      style={{ background: "linear-gradient(135deg, #EDF5ED, #D8EDD8)" }}
                    >
                      <div className="flex items-center gap-2">
                        <BookMarked size={14} style={{ color: "#4A7A4A" }} />
                        <span className="text-sm font-semibold" style={{ color: "#2D4A2D" }}>
                          Referenced Scriptures ({quotedScriptures.length})
                        </span>
                      </div>
                      {showQuotes ? (
                        <ChevronUp size={14} style={{ color: "#7A9A7A" }} />
                      ) : (
                        <ChevronDown size={14} style={{ color: "#7A9A7A" }} />
                      )}
                    </button>
                    {showQuotes && (
                      <div className="px-5 py-4">
                        <p
                          className="text-xs mb-3"
                          style={{ color: "#7A9A7A" }}
                        >
                          Study each reference to deepen your preparation:
                        </p>
                        <div className="space-y-2">
                          {quotedScriptures.map((ref) => (
                            <div
                              key={ref}
                              className="flex items-center gap-3 px-3 py-2 rounded-xl"
                              style={{ background: "#F5F0E8" }}
                            >
                              <BookOpen size={13} style={{ color: "#C87A50" }} />
                              <span className="text-sm font-medium flex-1" style={{ color: "#2D4A2D" }}>
                                {ref}
                              </span>
                              <a
                                href={`https://www.churchofjesuschrist.org/study/scriptures?lang=eng`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs"
                                style={{ color: "#C87A50" }}
                              >
                                Look up →
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Enhance Panel ── */}
                <div
                  className="rounded-2xl border overflow-hidden no-print"
                  style={{ background: "#FEFCF7", borderColor: "#DDE8DD" }}
                >
                  <button
                    onClick={() => setShowEnhance(!showEnhance)}
                    className="w-full flex items-center justify-between px-5 py-3.5 text-left"
                    style={{ background: "linear-gradient(135deg, #FDF0E8, #F5E0D0)" }}
                  >
                    <div className="flex items-center gap-2">
                      <Wand2 size={14} style={{ color: "#C87A50" }} />
                      <span className="text-sm font-semibold" style={{ color: "#2D1A0E" }}>
                        Enhance Your Lesson
                      </span>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: "rgba(200,122,80,0.15)", color: "#C87A50" }}
                      >
                        Add more depth
                      </span>
                    </div>
                    {showEnhance ? (
                      <ChevronUp size={14} style={{ color: "#C87A50" }} />
                    ) : (
                      <ChevronDown size={14} style={{ color: "#C87A50" }} />
                    )}
                  </button>

                  {showEnhance && (
                    <div className="px-5 py-5 space-y-4">
                      {/* Related topic chips */}
                      <div>
                        <p
                          className="text-xs font-semibold uppercase tracking-wide mb-2"
                          style={{ color: "#C87A50" }}
                        >
                          Suggested related topics
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {relatedTopics.map((rt) => (
                            <button
                              key={rt}
                              onClick={() => {
                                setEnhanceType("topic");
                                setEnhanceInput(rt);
                              }}
                              className="px-3 py-1.5 rounded-full text-xs font-medium border transition-all hover:scale-105"
                              style={{
                                borderColor: "#E8C4A0",
                                color: "#7A4A20",
                                background: "#FDF5EE",
                              }}
                            >
                              + {rt}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Enhancement type + input */}
                      <div className="space-y-2.5">
                        <div className="flex gap-2 flex-wrap">
                          {ENHANCEMENT_TYPES.map((et) => (
                            <button
                              key={et.value}
                              onClick={() => setEnhanceType(et.value)}
                              className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                              style={
                                enhanceType === et.value
                                  ? { background: "#C87A50", color: "#fff" }
                                  : { background: "#F5F0E8", color: "#9A7A5A" }
                              }
                            >
                              {enhanceType === "video" && et.value === "video" && (
                                <Link2 size={10} className="inline mr-1" />
                              )}
                              {et.label}
                            </button>
                          ))}
                        </div>

                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={enhanceInput}
                            onChange={(e) => setEnhanceInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && enhance()}
                            placeholder={enhancePlaceholder}
                            className="flex-1 px-3.5 py-2 rounded-xl border text-sm outline-none"
                            style={{ borderColor: "#E8C4A0", color: "#2D1A0E" }}
                          />
                          <button
                            onClick={enhance}
                            disabled={!enhanceInput.trim() || enhancing}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-40"
                            style={{ background: "#C87A50", color: "#fff" }}
                          >
                            {enhancing ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Plus size={14} />
                            )}
                            Add
                          </button>
                        </div>
                      </div>

                      {/* Video / TikTok Premium stub */}
                      <div
                        className="rounded-xl p-4 flex items-center gap-3"
                        style={{ background: "linear-gradient(135deg, #1E3320 0%, #2D4A2D 100%)" }}
                      >
                        <Video size={18} style={{ color: "#E8C49A" }} />
                        <div className="flex-1">
                          <p className="text-xs font-bold" style={{ color: "#E8C49A" }}>
                            Generate a Short Video (Premium)
                          </p>
                          <p className="text-xs" style={{ color: "#5A8A5A" }}>
                            Turn this lesson into a 60-second animation for TikTok, Instagram, and YouTube Shorts — watermarked with HolyFlex.
                          </p>
                        </div>
                        <button
                          onClick={() => alert("Video generation is a Premium feature. Upgrade coming soon!")}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold flex-shrink-0"
                          style={{ background: "#E8B49A", color: "#2D1A0E" }}
                        >
                          Unlock
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Save to Library nudge ── */}
                <div
                  className="rounded-xl p-4 flex items-center gap-3 no-print"
                  style={{ background: "#EDF5ED", border: "1px solid #C8DCC8" }}
                >
                  <BookMarked size={16} style={{ color: "#4A7A4A" }} />
                  <p className="text-sm flex-1" style={{ color: "#2D4A2D" }}>
                    Save this to your{" "}
                    <a href="/library" className="font-semibold underline" style={{ color: "#4A7A4A" }}>
                      Library
                    </a>{" "}
                    to access it later, organise your lessons, and share with your ward.
                  </p>
                  <button
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold flex-shrink-0"
                    style={{ background: "#4A7A4A", color: "#F5F0E8" }}
                    onClick={() => alert("Sign in to save to your library.")}
                  >
                    Save
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
