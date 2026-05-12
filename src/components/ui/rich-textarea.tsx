"use client";

import { useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────
type FormatAction =
  | { type: "wrap"; before: string; after: string }
  | { type: "line-prefix"; prefix: string }
  | { type: "link" }
  | { type: "align"; align: "left" | "center" | "right" };

interface ToolbarItem {
  label: string;
  title: string;
  action: FormatAction;
}

// ── Toolbar config ────────────────────────────────────────────────
const TOOLS: (ToolbarItem | "sep")[] = [
  { label: "B", title: "Bold", action: { type: "wrap", before: "**", after: "**" } },
  { label: "I", title: "Italic", action: { type: "wrap", before: "_", after: "_" } },
  { label: "U", title: "Underline", action: { type: "wrap", before: "<u>", after: "</u>" } },
  { label: "S", title: "Strikethrough", action: { type: "wrap", before: "~~", after: "~~" } },
  "sep",
  { label: "🔗", title: "Link", action: { type: "link" } },
  { label: "H", title: "Heading", action: { type: "line-prefix", prefix: "## " } },
  { label: "❝", title: "Quote", action: { type: "line-prefix", prefix: "> " } },
  "sep",
  { label: "⇐", title: "Align left", action: { type: "align", align: "left" } },
  { label: "⇔", title: "Align center", action: { type: "align", align: "center" } },
  { label: "⇒", title: "Align right", action: { type: "align", align: "right" } },
];

// ── Format logic ──────────────────────────────────────────────────
function applyFormat(
  value: string,
  start: number,
  end: number,
  action: FormatAction
): { value: string; cursor: [number, number] } {
  const selected = value.slice(start, end);
  const before = value.slice(0, start);
  const after = value.slice(end);

  if (action.type === "wrap") {
    const { before: b, after: a } = action;
    if (selected.startsWith(b) && selected.endsWith(a)) {
      const inner = selected.slice(b.length, selected.length - a.length);
      return { value: before + inner + after, cursor: [start, start + inner.length] };
    }
    const result = before + b + selected + a + after;
    return { value: result, cursor: [start + b.length, end + b.length] };
  }

  if (action.type === "line-prefix") {
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const lineEnd = value.indexOf("\n", end);
    const line = value.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);
    if (line.startsWith(action.prefix)) {
      const newLine = line.slice(action.prefix.length);
      const result = value.slice(0, lineStart) + newLine + value.slice(lineStart + line.length);
      const delta = -action.prefix.length;
      return { value: result, cursor: [start + delta, end + delta] };
    }
    const result = value.slice(0, lineStart) + action.prefix + value.slice(lineStart);
    const delta = action.prefix.length;
    return { value: result, cursor: [start + delta, end + delta] };
  }

  if (action.type === "link") {
    const url = window.prompt("Enter URL:", "https://");
    if (!url) return { value, cursor: [start, end] };
    const text = selected || "link text";
    const md = `[${text}](${url})`;
    return { value: before + md + after, cursor: [start, start + md.length] };
  }

  if (action.type === "align") {
    if (action.align === "left") return { value, cursor: [start, end] };
    const wrapped = `<div style="text-align:${action.align}">${selected || "text"}</div>`;
    return { value: before + wrapped + after, cursor: [start, start + wrapped.length] };
  }

  return { value, cursor: [start, end] };
}

// ── Component ─────────────────────────────────────────────────────
interface RichTextareaProps extends Omit<React.ComponentProps<"textarea">, "onChange"> {
  value: string;
  onChange: (value: string) => void;
  toolbarClassName?: string;
  wrapperClassName?: string;
}

export function RichTextarea({
  value,
  onChange,
  className,
  toolbarClassName,
  wrapperClassName,
  ...props
}: RichTextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const applyTool = useCallback(
    (action: FormatAction) => {
      const el = ref.current;
      if (!el) return;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const { value: newValue, cursor } = applyFormat(value, start, end, action);
      onChange(newValue);
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(cursor[0], cursor[1]);
      });
    },
    [value, onChange]
  );

  return (
    <div className={cn("flex flex-col", wrapperClassName)}>
      {/* Toolbar */}
      <div
        className={cn(
          "flex items-center gap-0.5 px-2 py-1.5 rounded-t-lg border border-b-0",
          "bg-gradient-to-r from-[#1a1a2e] to-[#16213e] border-[#3a3a5c]",
          toolbarClassName
        )}
      >
        {TOOLS.map((item, i) => {
          if (item === "sep") {
            return <span key={`sep-${i}`} className="w-px h-4 mx-1 bg-white/20 flex-shrink-0" />;
          }
          return (
            <button
              key={item.title}
              type="button"
              title={item.title}
              onMouseDown={(e) => {
                e.preventDefault();
                applyTool(item.action);
              }}
              className={cn(
                "w-7 h-7 flex items-center justify-center rounded text-xs font-semibold",
                "text-gray-300 hover:text-white hover:bg-white/15 transition-colors",
                item.label === "B" && "font-bold",
                item.label === "I" && "italic",
                item.label === "U" && "underline",
                item.label === "S" && "line-through"
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Textarea */}
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "flex w-full rounded-b-lg rounded-t-none border border-[#3a3a5c]",
          "bg-transparent px-3 py-2 text-sm transition-colors outline-none",
          "placeholder:text-muted-foreground",
          "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
    </div>
  );
}
