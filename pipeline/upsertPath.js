import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_KEY');
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function upsertPath(expedition) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('pro_paths')
    .upsert(expedition, { onConflict: 'name,destination' })
    .select()
    .single();
  if (error) throw error;
  return data;
}
