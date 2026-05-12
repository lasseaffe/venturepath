"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Moon, Sun } from "lucide-react";
import { computeSabbath, setSabbathOverride, isSabbath } from "@/lib/sabbath";

type SabbathCtx = { sabbath: boolean; toggle: () => void };
const SabbathContext = createContext<SabbathCtx>({ sabbath: false, toggle: () => {} });

export function useSabbath() {
  return useContext(SabbathContext);
}

export function SabbathProvider({ children }: { children: ReactNode }) {
  const [sabbath, setSabbath] = useState(false);

  useEffect(() => {
    const active = computeSabbath();
    setSabbath(active);
    document.documentElement.classList.toggle("sabbath", active);
  }, []);

  function toggle() {
    setSabbath(prev => {
      const next = !prev;
      // If toggling back to what the natural day would be, clear override
      if (next === isSabbath()) {
        setSabbathOverride(null);
      } else {
        setSabbathOverride(next);
      }
      document.documentElement.classList.toggle("sabbath", next);
      return next;
    });
  }

  return (
    <SabbathContext.Provider value={{ sabbath, toggle }}>
      {children}
    </SabbathContext.Provider>
  );
}

export function SabbathToggle() {
  const { sabbath, toggle } = useSabbath();

  return (
    <button
      onClick={toggle}
      title={sabbath ? "Exit Sabbath Mode" : "Enter Sabbath Mode"}
      className="flex items-center justify-center w-7 h-7 rounded-full transition-all"
      style={{
        background: sabbath ? "rgba(212,175,55,0.18)" : "transparent",
        border: sabbath ? "1px solid rgba(212,175,55,0.4)" : "1px solid transparent",
        color: sabbath ? "#D4AF37" : "#8B7EC0",
      }}
      aria-label="Toggle Sabbath Mode"
    >
      {sabbath ? <Moon size={13} /> : <Sun size={13} />}
    </button>
  );
}
