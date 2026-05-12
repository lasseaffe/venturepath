"use client";

import { useEffect, useState } from "react";
import { getFlexBalance } from "@/lib/flex";
import { createClient } from "@/lib/supabase/client";

export function FlexBalance() {
  const [balance, setBalance] = useState<number | null>(null);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setAuthed(false); return; }
      setAuthed(true);
      const bal = await getFlexBalance();
      setBalance(bal);
    }

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => init());
    return () => subscription.unsubscribe();
  }, []);

  if (!authed) {
    return (
      <span
        className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full"
        style={{ background: "rgba(212,175,55,0.12)", color: "#D4AF37", border: "1px solid rgba(212,175,55,0.3)" }}
        title="Sign in to earn $FLEX tokens"
      >
        ✦ 0 $FLEX
      </span>
    );
  }

  if (balance === null) return null;

  return (
    <span
      className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full"
      style={{ background: "rgba(212,175,55,0.18)", color: "#B8942A", border: "1px solid rgba(212,175,55,0.4)" }}
      title={`Your $FLEX balance: ${balance} tokens`}
    >
      ✦ {balance.toLocaleString()} $FLEX
    </span>
  );
}
