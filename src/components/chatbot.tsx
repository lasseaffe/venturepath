"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  MessageCircle,
  X,
  Send,
  Loader2,
  ChevronDown,
  Users,
  BookOpen,
} from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const STARTERS = [
  "What does the Book of Mormon teach about hope?",
  "I need help preparing a talk on faith.",
  "What are some calming scriptures for hard times?",
  "How can I make family prayer more meaningful?",
];

export function Chatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([
        {
          role: "assistant",
          content:
            "Hello! I'm your HolyFlex companion 🙏 I'm here to help with scripture questions, talk preparation, gospel study, or just a friendly chat. How can I help you today?",
        },
      ]);
    }
  }, [open, messages.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  const send = useCallback(
    async (text: string) => {
      if (!text.trim() || streaming) return;
      const userMsg: Message = { role: "user", content: text.trim() };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setStreaming(true);

      const history: Message[] = [...messages, userMsg];
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      abortRef.current = new AbortController();

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history }),
          signal: abortRef.current.signal,
        });

        if (!res.body) throw new Error("No body");
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          accumulated += decoder.decode(value, { stream: true });
          setMessages((prev) => {
            const copy = [...prev];
            copy[copy.length - 1] = {
              role: "assistant",
              content: accumulated,
            };
            return copy;
          });
        }
        window.dispatchEvent(new CustomEvent('onboarding:action', { detail: { id: 'ai-question-asked' } }))
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setMessages((prev) => {
            const copy = [...prev];
            copy[copy.length - 1] = {
              role: "assistant",
              content:
                "Sorry, I couldn't connect. Please check your internet and try again.",
            };
            return copy;
          });
        }
      } finally {
        setStreaming(false);
      }
    },
    [messages, streaming]
  );

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
        style={{
          background: "linear-gradient(135deg, #4A7A4A 0%, #2D5A2D 100%)",
          display: open ? "none" : "flex",
        }}
        aria-label="Open HolyFlex companion"
        data-tour="ai-companion"
        data-beacon="ai-insights"
      >
        <MessageCircle className="w-6 h-6 text-white" />
        {/* Pulse ring */}
        <span
          className="absolute w-14 h-14 rounded-full animate-ping opacity-20"
          style={{ background: "#4A7A4A" }}
        />
      </button>

      {/* Chat panel */}
      {open && (
        <div
          className="fixed bottom-6 right-6 z-50 w-[360px] max-w-[calc(100vw-24px)] rounded-3xl shadow-2xl overflow-hidden flex flex-col"
          style={{
            height: "520px",
            background: "#FEFCF7",
            border: "1px solid #DDE8DD",
          }}
        >
          {/* Header */}
          <div
            className="px-5 py-4 flex items-center gap-3"
            style={{
              background:
                "linear-gradient(135deg, #2D4A2D 0%, #3D6040 100%)",
            }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
              style={{ background: "rgba(155,184,154,0.3)", color: "#C8DCC8" }}
            >
              H
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white leading-tight">
                HolyFlex Companion
              </p>
              <p
                className="text-xs truncate"
                style={{ color: "rgba(200,220,200,0.7)" }}
              >
                Scripture · Gospel · Everyday life
              </p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-lg transition-colors hover:bg-white/10"
            >
              <X size={16} className="text-white/70" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start gap-2"}`}
              >
                {msg.role === "assistant" && (
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-1"
                    style={{ background: "#EDF5ED", color: "#4A7A4A" }}
                  >
                    H
                  </div>
                )}
                <div
                  className="max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap"
                  style={
                    msg.role === "user"
                      ? {
                          background: "#3D6040",
                          color: "#F5F0E8",
                          borderBottomRightRadius: 4,
                        }
                      : {
                          background: "#EDF5ED",
                          color: "#2D4A2D",
                          borderBottomLeftRadius: 4,
                        }
                  }
                >
                  {msg.content ||
                    (streaming && i === messages.length - 1 ? (
                      <span className="flex gap-1 items-center h-4">
                        <span
                          className="w-1.5 h-1.5 rounded-full animate-bounce"
                          style={{ background: "#9BB89A", animationDelay: "0ms" }}
                        />
                        <span
                          className="w-1.5 h-1.5 rounded-full animate-bounce"
                          style={{ background: "#9BB89A", animationDelay: "150ms" }}
                        />
                        <span
                          className="w-1.5 h-1.5 rounded-full animate-bounce"
                          style={{ background: "#9BB89A", animationDelay: "300ms" }}
                        />
                      </span>
                    ) : (
                      ""
                    ))}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Starter chips — only if just the welcome message */}
          {messages.length === 1 && (
            <div className="px-4 pb-2 flex flex-wrap gap-1.5">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium transition-all hover:scale-105"
                  style={{
                    background: "#EDF5ED",
                    color: "#4A7A4A",
                    border: "1px solid #C8DCC8",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Community nudge */}
          <div
            className="mx-4 mb-2 px-3 py-2 rounded-xl flex items-center gap-2"
            style={{ background: "#F5F0E8" }}
          >
            <Users size={12} style={{ color: "#C87A50" }} />
            <p className="text-xs" style={{ color: "#9A7A5A" }}>
              For deeper support,{" "}
              <a
                href="/communities"
                className="font-semibold underline"
                style={{ color: "#C87A50" }}
              >
                connect with your ward community →
              </a>
            </p>
          </div>

          {/* Input */}
          <div
            className="px-4 pb-4 pt-2 border-t"
            style={{ borderColor: "#EDF5ED" }}
          >
            <div className="flex gap-2 items-end">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                rows={1}
                placeholder="Ask anything…"
                disabled={streaming}
                className="flex-1 resize-none rounded-xl px-3.5 py-2.5 text-sm outline-none border"
                style={{
                  background: "#F5F5F0",
                  borderColor: "#DDE8DD",
                  color: "#2D4A2D",
                  minHeight: 40,
                  maxHeight: 100,
                }}
              />
              <button
                onClick={() => send(input)}
                disabled={!input.trim() || streaming}
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 disabled:opacity-40 transition-all hover:scale-105"
                style={{ background: "#4A7A4A" }}
              >
                {streaming ? (
                  <Loader2 size={14} className="animate-spin text-white" />
                ) : (
                  <Send size={14} className="text-white" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
