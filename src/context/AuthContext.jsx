import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [status, setStatus]   = useState('loading'); // 'loading' | 'authenticated' | 'anonymous'
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);

  const loadProfile = useCallback(async (uid) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .single();
    setProfile(data ?? null);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s?.user) {
        loadProfile(s.user.id).then(() => setStatus('authenticated'));
      } else {
        setStatus('anonymous');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s?.user) {
        loadProfile(s.user.id).then(() => setStatus('authenticated'));
      } else {
        setProfile(null);
        setStatus('anonymous');
      }
    });
    return () => subscription.unsubscribe();
  }, [loadProfile]);

  const signInWithMagicLink = (email) =>
    supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } });

  const signInWithPassword = (email, password) =>
    supabase.auth.signInWithPassword({ email, password });

  const signUpWithPassword = (email, password) =>
    supabase.auth.signUp({ email, password });

  const signInWithGoogle = () =>
    supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });

  const signOut = () => supabase.auth.signOut();

  const reloadProfile = useCallback(() => {
    if (session?.user) return loadProfile(session.user.id);
  }, [session, loadProfile]);

  const updateProfile = useCallback(async (updates) => {
    if (!session?.user) return { error: { message: 'Not authenticated' } };
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', session.user.id)
      .select()
      .single();
    if (data) setProfile(data);
    return { data, error };
  }, [session]);

  const isHandleAvailable = useCallback(async (handle) => {
    const { data } = await supabase.rpc('is_handle_available', { p_handle: handle });
    return !!data;
  }, []);

  const exportMyData = useCallback(async () => {
    const { data } = await supabase.from('my_profile_export').select('*').single();
    return data;
  }, []);

  // A draft handle looks like architect_xxxxxxxx
  const needsHandleSetup = profile && /^architect_[0-9a-f]{8}$/.test(profile.handle);

  return (
    <AuthContext.Provider value={{
      status, session, profile,
      architect: profile,
      needsHandleSetup,
      signInWithMagicLink, signInWithPassword, signUpWithPassword,
      signInWithGoogle, signOut,
      updateProfile, reloadProfile,
      isHandleAvailable, exportMyData,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
