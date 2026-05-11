"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, Send, BookOpen, ChevronDown, ChevronUp } from "lucide-react";
import { CFM_2026, getCurrentCfmWeek, type CfmWeek } from "@/lib/come-follow-me";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTED_QUESTIONS = [
  "Summarize this week's lesson for a family with young children",
  "What are the main principles to teach from these scriptures?",
  "Give me 3 discussion questions for Sunday School",
  "How can I apply this week's lesson in my daily life?",
  "Suggest a Family Home Evening activity based on this week's topic",
];

export default function ComeFollowMePage() {
  const currentWeek = getCurrentCfmWeek();
  const [selectedWeek, setSelectedWeek] = useState<CfmWeek>(currentWeek);
  const [showWeekPicker, setShowWeekPicker] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function ask(q?: string) {
    const userMessage = q ?? question;
    if (!userMessage.trim()) return;

    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setQuestion("");
    setLoading(true);
    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/come-follow-me", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: userMessage, weekOverride: selectedWeek }),
        signal: abortRef.current.signal,
      });

      if (!res.body) throw new Error("No response body");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let text = "";

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: text };
          return updated;
        });
      }
      window.dispatchEvent(new CustomEvent('onboarding:action', { detail: { id: 'note-saved' } }));
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Something went wrong. Please try again." },
        ]);
      }
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      ask();
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10" data-tour="cfm">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2" style={{ color: "#2D1B69" }}>Come Follow Me Companion</h1>
        <p style={{ color: "#6B5FA0" }}>
          Ask any question about this week&apos;s lesson. Doctrine &amp; Covenants 2026.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Week panel */}
        <div className="md:col-span-1 space-y-4">
          <Card className="border shadow-sm" style={{ background: "#FEFCFF", borderColor: "#DDD5F0" }}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold" style={{ color: "#2D1B69" }}>Current Week</CardTitle>
                <Badge className="text-xs" style={{ background: "#EDE8F8", color: "#2D1B69", border: "none" }}>
                  Week {selectedWeek.week}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-start gap-2">
                <BookOpen size={14} className="mt-0.5 shrink-0" style={{ color: "#D4AF37" }} />
                <div>
                  <p className="text-sm font-medium" style={{ color: "#2D1B69" }}>{selectedWeek.title}</p>
                  <p className="text-xs mt-0.5" style={{ color: "#8B7EC0" }}>{selectedWeek.dateRange}</p>
                </div>
              </div>
              <Separator style={{ background: "#DDD5F0" }} />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "#8B7EC0" }}>Scriptures</p>
                <p className="text-sm" style={{ color: "#3D4A3D" }}>{selectedWeek.scriptures}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "#8B7EC0" }}>Theme</p>
                <p className="text-sm" style={{ color: "#3D4A3D" }}>{selectedWeek.theme}</p>
              </div>
              <button
                className="w-full flex items-center justify-center gap-1 mt-2 py-1.5 rounded-lg text-xs font-medium border transition-colors"
                style={{ borderColor: "#C8D8C8", color: "#2D1B69", background: "transparent" }}
                onClick={() => setShowWeekPicker(!showWeekPicker)}
              >
                {showWeekPicker ? <><ChevronUp size={12} /> Hide weeks</> : <><ChevronDown size={12} /> Browse all weeks</>}
              </button>
            </CardContent>
          </Card>

          {/* Week picker */}
          {showWeekPicker && (
            <Card className="border shadow-sm" style={{ background: "#FEFCFF", borderColor: "#DDD5F0" }}>
              <CardContent className="p-2 max-h-72 overflow-y-auto">
                {CFM_2026.map((week) => (
                  <button
                    key={week.week}
                    onClick={() => { setSelectedWeek(week); setShowWeekPicker(false); }}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-lg text-xs transition-colors",
                      selectedWeek.week === week.week
                        ? "font-medium"
                        : "hover:opacity-80"
                    )}
                    style={selectedWeek.week === week.week
                      ? { background: "#EDE8F8", color: "#2D1B69" }
                      : { color: "#6B5FA0" }
                    }
                  >
                    <span className="mr-2" style={{ color: "#8B7EC0" }}>Wk {week.week}</span>
                    {week.title}
                  </button>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Suggested questions */}
          <Card className="border shadow-sm" style={{ background: "#FEFCFF", borderColor: "#DDD5F0" }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#8B7EC0" }}>
                Suggested questions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => ask(q)}
                  disabled={loading}
                  className="w-full text-left text-xs px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
                  style={{ background: "#F5F0FF", color: "#6B5FA0" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#EDE8F8"; e.currentTarget.style.color = "#2D1B69"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "#F5F0FF"; e.currentTarget.style.color = "#6B5FA0"; }}
                >
                  {q}
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Chat panel */}
        <div className="md:col-span-2 flex flex-col">
          <Card className="border shadow-sm flex-1 flex flex-col" style={{ background: "#FEFCFF", borderColor: "#DDD5F0" }}>
            <CardContent className="p-4 flex-1 flex flex-col">
              {/* Messages */}
              <div className="flex-1 space-y-4 min-h-[300px] max-h-[500px] overflow-y-auto pr-1">
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center py-10">
                    <BookOpen size={32} className="mb-3" style={{ color: "#C8D8C8" }} />
                    <p className="text-sm" style={{ color: "#8B7EC0" }}>Ask anything about this week&apos;s lesson.</p>
                    <p className="text-xs mt-1" style={{ color: "#B8C8B8" }}>Or tap a suggested question →</p>
                  </div>
                )}

                {messages.map((msg, i) => (
                  <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                    <div
                      className="max-w-[85%] rounded-2xl px-4 py-2.5 text-sm"
                      style={msg.role === "user"
                        ? { background: "#2D1B69", color: "#F5F0FF", borderBottomRightRadius: "4px" }
                        : { background: "#EDE8F8", color: "#2D1B69", borderBottomLeftRadius: "4px" }
                      }
                    >
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    </div>
                  </div>
                ))}

                {loading && messages[messages.length - 1]?.role === "user" && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl px-4 py-3" style={{ background: "#EDE8F8", borderBottomLeftRadius: "4px" }}>
                      <Loader2 size={14} className="animate-spin" style={{ color: "#8B7EC0" }} />
                    </div>
                  </div>
                )}

                <div ref={bottomRef} />
              </div>

              <Separator className="my-3" style={{ background: "#DDD5F0" }} />

              {/* Input */}
              <div className="flex gap-2">
                <Textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about this week's lesson…"
                  rows={2}
                  className="resize-none text-sm"
                  disabled={loading}
                />
                <button
                  onClick={() => ask()}
                  disabled={!question.trim() || loading}
                  className="rounded-lg px-3 self-end shrink-0 flex items-center justify-center h-10 transition-opacity disabled:opacity-40"
                  style={{ background: "#2D1B69", color: "#F5F0FF" }}
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </div>
              <p className="text-xs mt-2" style={{ color: "#B8C8B8" }}>
                Press Enter to send · Shift+Enter for new line
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
