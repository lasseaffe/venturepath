"use client";

import { useState, createContext, useContext, useCallback, ReactNode } from "react";
import { X, Mail, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type AuthGateContextType = {
  trigger: (action: string, onSuccess: () => void) => void;
};

const AuthGateContext = createContext<AuthGateContextType>({ trigger: () => {} });

export function useAuthGate() {
  return useContext(AuthGateContext);
}

export function AuthGateProvider({ children }: { children: ReactNode }) {
  const [modal, setModal] = useState<{ action: string; onSuccess: () => void } | null>(null);
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "sent" | "error">("idle");

  const trigger = useCallback((action: string, onSuccess: () => void) => {
    setModal({ action, onSuccess });
    setState("idle");
    setEmail("");
  }, []);

  async function sendMagicLink() {
    if (!email.trim() || !modal) return;
    setState("loading");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setState("error");
    } else {
      setState("sent");
    }
  }

  function dismiss() {
    setModal(null);
    setState("idle");
    setEmail("");
  }

  const ACTION_LABELS: Record<string, string> = {
    save: "Save your talk forever",
    library: "Access your Library",
    temple: "Sync your temple names",
    "self-reliance": "Save your progress",
    engagement: "Save your ward contacts",
    default: "Continue with HolyFlex",
  };

  const label = modal ? (ACTION_LABELS[modal.action] ?? ACTION_LABELS.default) : "";

  return (
    <AuthGateContext.Provider value={{ trigger }}>
      {children}

      {modal && (
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center px-4 pb-8 sm:pb-0"
          style={{ background: "rgba(26,20,48,0.72)", backdropFilter: "blur(4px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) dismiss(); }}
        >
          <div
            className="w-full max-w-sm rounded-2xl shadow-2xl p-6 animate-scale-in"
            style={{ background: "#FDFAF5", border: "1px solid #DDD5F0" }}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "#EDE8F8" }}>
                  <Sparkles className="w-4 h-4" style={{ color: "#D4AF37" }} />
                </div>
                <div>
                  <h2 className="font-bold leading-tight text-base" style={{ color: "#2D1B69", fontFamily: "var(--font-heading, Cormorant Garamond, serif)" }}>
                    {label}
                  </h2>
                  <p className="text-xs" style={{ color: "#8B7EC0" }}>Free account · No password needed</p>
                </div>
              </div>
              <button onClick={dismiss} className="mt-0.5" style={{ color: "#8B7EC0" }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm mb-5 leading-relaxed" style={{ color: "#6B5FA0" }}>
              Enter your email and we&apos;ll send a magic link. Your work is waiting for you the moment you click it.
            </p>

            {state === "sent" ? (
              <div className="text-center py-4">
                <div className="text-3xl mb-2">✉️</div>
                <p className="text-sm font-semibold" style={{ color: "#2D1B69" }}>Check your inbox</p>
                <p className="text-xs mt-1" style={{ color: "#8B7EC0" }}>Magic link sent to {email}</p>
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <div className="flex-1 flex items-center gap-2 rounded-xl border px-3 py-2.5" style={{ borderColor: "#DDD5F0", background: "#FDFAF5" }}>
                    <Mail className="w-4 h-4 shrink-0" style={{ color: "#8B7EC0" }} />
                    <input
                      type="email"
                      autoFocus
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") sendMagicLink(); }}
                      placeholder="your@email.com"
                      className="flex-1 text-sm outline-none bg-transparent"
                      style={{ color: "#2D1B69" }}
                    />
                  </div>
                  <button
                    onClick={sendMagicLink}
                    disabled={state === "loading" || !email.trim()}
                    className="rounded-xl px-4 py-2.5 text-sm font-bold btn-primary-glow disabled:opacity-50"
                    style={{ background: "#2D1B69", color: "#FDFAF5" }}
                  >
                    {state === "loading" ? "…" : "Go"}
                  </button>
                </div>
                {state === "error" && (
                  <p className="text-xs mt-2" style={{ color: "#B84040" }}>Something went wrong — try again.</p>
                )}
                <p className="text-[10px] mt-3 text-center" style={{ color: "#8B7EC0" }}>
                  By continuing you agree to our Terms & Privacy Policy.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </AuthGateContext.Provider>
  );
}

type AuthGateProps = {
  action?: string;
  onAuthenticated: () => void;
  children: (triggerAuth: () => void) => ReactNode;
};

export function AuthGate({ action = "default", onAuthenticated, children }: AuthGateProps) {
  const { trigger } = useAuthGate();
  return <>{children(() => trigger(action, onAuthenticated))}</>;
}
