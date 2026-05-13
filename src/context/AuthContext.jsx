// VenturePath · Phase 1 · Architect Auth
// Wraps Supabase auth and exposes architect identity + profile operations.
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const DRAFT_HANDLE_RE = /^architect_[0-9a-f]{8}$/;

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession]   = useState(undefined); // undefined = loading
  const [profile, setProfile]   = useState(null);

  const status = session === undefined
    ? 'loading'
    : session
      ? 'authenticated'
      : 'anonymous';

  const architect = session?.user ?? null;
  const needsHandleSetup = profile ? DRAFT_HANDLE_RE.test(profile.handle) : false;

  // ── Load / reload profile ──────────────────────────────────────────────────

  const reloadProfile = useCallback(async (userId) => {
    const uid = userId ?? session?.user?.id;
    if (!uid) { setProfile(null); return; }
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .maybeSingle();
    setProfile(data ?? null);
  }, [session?.user?.id]);

  // ── Auth state listener ────────────────────────────────────────────────────

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      if (data.session?.user?.id) reloadProfile(data.session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s ?? null);
      if (s?.user?.id) reloadProfile(s.user.id);
      else setProfile(null);
    });

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Auth actions ───────────────────────────────────────────────────────────

  const signInWithMagicLink = useCallback(async (email) => {
    return supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
  }, []);

  const signInWithPassword = useCallback(async (email, password) => {
    return supabase.auth.signInWithPassword({ email, password });
  }, []);

  const signUpWithPassword = useCallback(async (email, password, displayName) => {
    const result = await supabase.auth.signUp({
      email, password,
      options: { data: { display_name: displayName } },
    });
    return result;
  }, []);

  const signInWithGoogle = useCallback(async () => {
    return supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  // ── Profile mutations ──────────────────────────────────────────────────────

  const updateProfile = useCallback(async (patch) => {
    if (!architect?.id) return { error: new Error('Not signed in') };
    const { data, error } = await supabase
      .from('profiles')
      .update(patch)
      .eq('id', architect.id)
      .select()
      .single();
    if (!error) setProfile(data);
    return { data, error };
  }, [architect?.id]);

  const isHandleAvailable = useCallback(async (handle) => {
    if (!handle || handle.length < 3) return false;
    const { data } = await supabase.rpc('is_handle_available', { p_handle: handle.toLowerCase() });
    return !!data;
  }, []);

  const exportMyData = useCallback(async () => {
    if (!architect?.id) return;
    const { data } = await supabase.from('my_profile_export').select('*').single();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vp-profile-${architect.id.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [architect?.id]);

  const value = {
    status,
    session,
    architect,
    profile,
    needsHandleSetup,
    signInWithMagicLink,
    signInWithPassword,
    signUpWithPassword,
    signInWithGoogle,
    signOut,
    updateProfile,
    isHandleAvailable,
    exportMyData,
    reloadProfile: () => reloadProfile(),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
