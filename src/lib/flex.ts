import { createClient } from "@/lib/supabase/client";

export const FLEX_EARN: Record<string, number> = {
  first_talk:      100,
  save_talk:        25,
  cfm_session:      50,
  agape_post:       30,
  daily_login:      10,
  temple_name:      40,
  fhe_plan:         60,
  self_reliance:    20,
};

export async function getFlexBalance(): Promise<number> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const { data } = await supabase
    .from("users")
    .select("flex_balance")
    .eq("id", user.id)
    .single();

  return data?.flex_balance ?? 0;
}

export async function earnFlex(trigger: keyof typeof FLEX_EARN): Promise<number> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const amount = FLEX_EARN[trigger] ?? 0;
  if (amount === 0) return 0;

  const { data } = await supabase.rpc("increment_flex", {
    user_id: user.id,
    amount,
  });

  return data ?? 0;
}
