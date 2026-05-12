"use client";

import { useState, useRef } from "react";
import { X, ChevronDown, Paperclip, AlertTriangle, Lightbulb, CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Option lists ────────────────────────────────────────────────────────────

const FEATURE_OPTIONS = [
  "UX/UI",
  "Recipes",
  "Meal Plans",
  "Dinner & Events",
  "Nutrient Tracker",
  "My Pantry",
  "Meal Swipe",
  "Premium",
  "Cooking Mode",
];

const PLATFORM_OPTIONS = [
  "Web — Chrome",
  "Web — Safari",
  "Web — Firefox",
  "iOS App",
  "Android App",
  "Desktop App",
];

const SEVERITY_OPTIONS = [
  { value: "critical", label: "Critical", desc: "App crash / data loss", color: "#DC2626" },
  { value: "high",     label: "High",     desc: "Major feature broken",  color: "#EA580C" },
  { value: "medium",   label: "Medium",   desc: "Annoying but usable",   color: "#CA8A04" },
  { value: "low",      label: "Low",      desc: "Minor / cosmetic",      color: "#16A34A" },
] as const;

type ReportType = "bug" | "improvement" | "task";
type Severity   = "critical" | "high" | "medium" | "low";

interface FormState {
  type: ReportType;
  page_url: string;
  feature_module: string;
  feature_custom: string;
  platform: string;
  platform_custom: string;
  summary: string;
  severity: Severity;
  expected_behavior: string;
  actual_behavior: string;
  steps_to_reproduce: string;
  element_affected: string;
  notes: string;
  why_value: string;
}

const EMPTY: FormState = {
  type: "bug",
  page_url: "",
  feature_module: "",
  feature_custom: "",
  platform: "",
  platform_custom: "",
  summary: "",
  severity: "medium",
  expected_behavior: "",
  actual_behavior: "",
  steps_to_reproduce: "1. ",
  element_affected: "",
  notes: "",
  why_value: "",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-semibold mb-1" style={{ color: "#2D1B69" }}>
      {children} {required && <span style={{ color: "#DC2626" }}>*</span>}
    </label>
  );
}

function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-xl border px-3 py-2 text-sm outline-none transition-colors",
        "focus:border-[#7C5CBF] focus:ring-2 focus:ring-[#EDE8F8]",
        className
      )}
      style={{ borderColor: "#DDD5F0", background: "#FEFCFF", color: "#2D1B69" }}
      {...props}
    />
  );
}

function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full rounded-xl border px-3 py-2 text-sm outline-none transition-colors resize-none",
        "focus:border-[#7C5CBF] focus:ring-2 focus:ring-[#EDE8F8]",
        className
      )}
      style={{ borderColor: "#DDD5F0", background: "#FEFCFF", color: "#2D1B69" }}
      {...props}
    />
  );
}

// Combo: dropdown suggestions + free-text fallback
function ComboField({
  label,
  options,
  value,
  customValue,
  onSelect,
  onCustomChange,
  placeholder,
  required,
}: {
  label: string;
  options: string[];
  value: string;
  customValue: string;
  onSelect: (v: string) => void;
  onCustomChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <Label required={required}>{label}</Label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center justify-between rounded-xl border px-3 py-2 text-sm text-left transition-colors hover:border-[#7C5CBF]"
          style={{ borderColor: "#DDD5F0", background: "#FEFCFF", color: value ? "#2D1B69" : "#8B7EC0" }}
        >
          {value || placeholder || `Select ${label}`}
          <ChevronDown size={13} className={cn("transition-transform", open && "rotate-180")} />
        </button>

        {open && (
          <div
            className="absolute z-20 top-full left-0 right-0 mt-1 rounded-xl border shadow-xl overflow-hidden"
            style={{ background: "#FEFCFF", borderColor: "#DDD5F0" }}
          >
            {options.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => { onSelect(opt); setOpen(false); }}
                className={cn(
                  "w-full text-left px-3 py-2 text-sm transition-colors hover:bg-[#F5F0FF]",
                  value === opt && "bg-[#EDE8F8]"
                )}
                style={{ color: "#2D1B69" }}
              >
                {opt}
              </button>
            ))}
            <div className="border-t px-3 py-2" style={{ borderColor: "#DDD5F0" }}>
              <p className="text-[10px] mb-1" style={{ color: "#8B7EC0" }}>Or type manually:</p>
              <Input
                value={customValue}
                onChange={(e) => { onCustomChange(e.target.value); onSelect(e.target.value); }}
                placeholder="Custom value…"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main form ────────────────────────────────────────────────────────────────

interface DebugReportFormProps {
  onClose?: () => void;
  /** Pre-fill the current page URL */
  currentUrl?: string;
}

export function DebugReportForm({ onClose, currentUrl = "" }: DebugReportFormProps) {
  const [form, setForm] = useState<FormState>({ ...EMPTY, page_url: currentUrl });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileNames, setFileNames] = useState<string[]>([]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function addStep() {
    const lines = form.steps_to_reproduce.split("\n").filter(Boolean);
    set("steps_to_reproduce", form.steps_to_reproduce + `\n${lines.length + 1}. `);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.summary.trim()) { setError("Summary is required."); return; }
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/debug-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          feature_module: form.feature_module || form.feature_custom,
          platform: form.platform || form.platform_custom,
          app_version: process.env.NEXT_PUBLIC_APP_VERSION ?? null,
        }),
      });
      if (!res.ok) throw new Error("Server error");
      setSubmitted(true);
    } catch {
      setError("Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "#EDE8F8" }}>
          <CheckSquare size={28} style={{ color: "#7C5CBF" }} />
        </div>
        <p className="font-semibold text-lg" style={{ color: "#2D1B69" }}>Report submitted!</p>
        <p className="text-sm" style={{ color: "#6B5FA0" }}>Thank you — we'll look into it shortly.</p>
        <button
          onClick={() => { setSubmitted(false); setForm({ ...EMPTY, page_url: currentUrl }); setFileNames([]); }}
          className="mt-2 text-sm underline"
          style={{ color: "#7C5CBF" }}
        >
          Submit another
        </button>
      </div>
    );
  }

  const typeConfig: Record<ReportType, { label: string; icon: React.ElementType; color: string }> = {
    bug:         { label: "Bug",         icon: AlertTriangle, color: "#DC2626" },
    improvement: { label: "Improvement", icon: Lightbulb,    color: "#CA8A04" },
    task:        { label: "Task",         icon: CheckSquare,  color: "#2563EB" },
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-xl font-semibold" style={{ color: "#2D1B69" }}>
          Submit a Report
        </h2>
        {onClose && (
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-[#F5F0FF] transition-colors">
            <X size={18} style={{ color: "#6B5FA0" }} />
          </button>
        )}
      </div>

      {/* ── Type ── */}
      <div>
        <Label required>Type</Label>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(typeConfig) as ReportType[]).map((t) => {
            const { label, icon: Icon, color } = typeConfig[t];
            return (
              <button
                key={t}
                type="button"
                onClick={() => set("type", t)}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-xl border py-3 text-xs font-medium transition-colors",
                  form.type === t ? "border-[#7C5CBF] bg-[#EDE8F8]" : "hover:bg-[#F5F0FF]"
                )}
                style={{ borderColor: form.type === t ? "#7C5CBF" : "#DDD5F0", color: form.type === t ? color : "#6B5FA0" }}
              >
                <Icon size={16} />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Where ── */}
      <div className="rounded-2xl border p-4 flex flex-col gap-3" style={{ borderColor: "#DDD5F0" }}>
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#8B7EC0" }}>Where</p>

        <div>
          <Label>Page / URL</Label>
          <Input
            value={form.page_url}
            onChange={(e) => set("page_url", e.target.value)}
            placeholder="/dashboard or Settings Page"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <ComboField
            label="Feature / Module"
            options={FEATURE_OPTIONS}
            value={form.feature_module}
            customValue={form.feature_custom}
            onSelect={(v) => set("feature_module", v)}
            onCustomChange={(v) => set("feature_custom", v)}
          />
          <ComboField
            label="Platform"
            options={PLATFORM_OPTIONS}
            value={form.platform}
            customValue={form.platform_custom}
            onSelect={(v) => set("platform", v)}
            onCustomChange={(v) => set("platform_custom", v)}
          />
        </div>
      </div>

      {/* ── What ── */}
      <div className="rounded-2xl border p-4 flex flex-col gap-3" style={{ borderColor: "#DDD5F0" }}>
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#8B7EC0" }}>What</p>

        <div>
          <Label required>Summary</Label>
          <Input
            value={form.summary}
            onChange={(e) => set("summary", e.target.value)}
            placeholder="Short, punchy title (e.g. Meal Swiper gets stuck after 10 swipes)"
          />
        </div>

        <div>
          <Label required>Severity</Label>
          <div className="grid grid-cols-4 gap-2">
            {SEVERITY_OPTIONS.map(({ value, label, desc, color }) => (
              <button
                key={value}
                type="button"
                onClick={() => set("severity", value)}
                className={cn(
                  "flex flex-col items-start gap-0.5 rounded-xl border px-2.5 py-2 text-left transition-colors",
                  form.severity === value ? "border-[#7C5CBF] bg-[#EDE8F8]" : "hover:bg-[#F5F0FF]"
                )}
                style={{ borderColor: form.severity === value ? "#7C5CBF" : "#DDD5F0" }}
              >
                <span className="text-xs font-bold" style={{ color }}>{label}</span>
                <span className="text-[10px] leading-tight" style={{ color: "#8B7EC0" }}>{desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Expected Behavior</Label>
            <Textarea
              rows={3}
              value={form.expected_behavior}
              onChange={(e) => set("expected_behavior", e.target.value)}
              placeholder="What should happen?"
            />
          </div>
          <div>
            <Label>Actual Behavior</Label>
            <Textarea
              rows={3}
              value={form.actual_behavior}
              onChange={(e) => set("actual_behavior", e.target.value)}
              placeholder="What actually happens?"
            />
          </div>
        </div>
      </div>

      {/* ── How ── */}
      <div className="rounded-2xl border p-4 flex flex-col gap-3" style={{ borderColor: "#DDD5F0" }}>
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#8B7EC0" }}>How to Reproduce</p>

        <div>
          <Label>Steps to Reproduce</Label>
          <Textarea
            rows={4}
            value={form.steps_to_reproduce}
            onChange={(e) => set("steps_to_reproduce", e.target.value)}
            placeholder={"1. Open app\n2. Tap on Meal Swiper\n3. Swipe right 10 times\n4. See error"}
          />
          <button
            type="button"
            onClick={addStep}
            className="mt-1 text-xs underline"
            style={{ color: "#7C5CBF" }}
          >
            + Add step
          </button>
        </div>

        <div>
          <Label>Element Affected</Label>
          <Input
            value={form.element_affected}
            onChange={(e) => set("element_affected", e.target.value)}
            placeholder="e.g. 'Swipe-Right gesture' or 'Reset button'"
          />
        </div>

        <div>
          <Label>Attachments (screenshots / recordings)</Label>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 rounded-xl border border-dashed px-4 py-3 text-sm transition-colors hover:bg-[#F5F0FF] w-full justify-center"
            style={{ borderColor: "#DDD5F0", color: "#6B5FA0" }}
          >
            <Paperclip size={14} />
            {fileNames.length ? fileNames.join(", ") : "Click to attach files"}
          </button>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept="image/*,video/*"
            className="hidden"
            onChange={(e) => setFileNames(Array.from(e.target.files ?? []).map((f) => f.name))}
          />
          <p className="mt-1 text-[10px]" style={{ color: "#8B7EC0" }}>
            File upload is stored locally — attachments noted for developers.
          </p>
        </div>
      </div>

      {/* ── Extra ── */}
      <div className="flex flex-col gap-3">
        <div>
          <Label>Notes</Label>
          <Textarea
            rows={2}
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Any extra context (e.g. 'Only happens when Wi-Fi is weak')"
          />
        </div>

        {form.type === "improvement" && (
          <div>
            <Label>Why? / Value</Label>
            <Textarea
              rows={2}
              value={form.why_value}
              onChange={(e) => set("why_value", e.target.value)}
              placeholder="What problem does this improvement solve? Who benefits?"
            />
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm rounded-xl px-3 py-2" style={{ background: "#FEF2F2", color: "#DC2626" }}>
          {error}
        </p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-xl py-3 text-sm font-semibold transition-opacity disabled:opacity-60"
        style={{ background: "#2D1B69", color: "#FEFCFF" }}
      >
        {submitting ? "Submitting…" : "Submit Report"}
      </button>
    </form>
  );
}
