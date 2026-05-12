import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_SERVICE_ROLE_KEY in env. ' +
    'Never use the admin client on public-facing routes.'
  );
}

/**
 * Service-role Supabase client — bypasses RLS.
 * Use ONLY in seed scripts, admin API routes, and server-side operations
 * that run in a trusted context. Never import this into user-facing components.
 */
export const adminSupabase = createClient(url, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
