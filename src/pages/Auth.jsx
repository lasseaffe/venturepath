// VenturePath · Phase 1 · Architect Authentication
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const S = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 9999,
    background: 'rgba(14,16,18,0.96)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: "'JetBrains Mono', monospace",
  },
  card: {
    width: '100%', maxWidth: 420,
    background: '#0E1012',
    border: '1px solid rgba(255,255,255,0.12)',
    padding: '32px 28px',
  },
  label: {
    fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.35)', display: 'block', marginBottom: 6,
  },
  input: {
    width: '100%', background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.12)',
    color: '#fff', fontFamily: "'JetBrains Mono', monospace",
    fontSize: 13, padding: '10px 12px', outline: 'none',
    boxSizing: 'border-box',
  },
  btnPrimary: {
    width: '100%', background: '#E67E22', color: '#000',
    border: 'none', fontFamily: "'JetBrains Mono', monospace",
    fontSize: 11, letterSpacing: '0.14em', fontWeight: 700,
    padding: '12px 0', cursor: 'pointer', marginTop: 16,
    textTransform: 'uppercase',
  },
  btnGhost: {
    background: 'transparent', color: 'rgba(255,255,255,0.45)',
    border: '1px solid rgba(255,255,255,0.12)',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
    padding: '9px 0', cursor: 'pointer', width: '100%',
  },
  toggle: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: '#E67E22', fontFamily: "'JetBrains Mono', monospace",
    fontSize: 10, letterSpacing: '0.1em', textDecoration: 'underline',
    padding: 0,
  },
  error: { color: '#ef4444', fontSize: 11, marginTop: 8 },
  success: { color: '#4ade80', fontSize: 11, marginTop: 8 },
  divider: {
    display: 'flex', alignItems: 'center', gap: 10, margin: '18px 0',
  },
  divLine: { flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' },
  divText: { fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.12em' },
};

export default function Auth({ onAuthenticated, onCancel }) {
  const { signInWithMagicLink, signInWithPassword, signUpWithPassword, signInWithGoogle } = useAuth();

  const [mode, setMode]         = useState('signin');   // 'signin' | 'signup'
  const [method, setMethod]     = useState('magic');     // 'magic' | 'password'
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading]   = useState(false);
  const [message, setMessage]   = useState(null);         // { type: 'error'|'success', text }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (method === 'magic') {
        const { error } = await signInWithMagicLink(email);
        if (error) throw error;
        setMessage({ type: 'success', text: '▣ MAGIC LINK DISPATCHED — check your inbox.' });
      } else if (mode === 'signup') {
        const { error } = await signUpWithPassword(email, password, displayName);
        if (error) throw error;
        setMessage({ type: 'success', text: '▣ ENLISTMENT COMPLETE — check your email to confirm.' });
      } else {
        const { error } = await signInWithPassword(email, password);
        if (error) throw error;
        onAuthenticated?.();
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    const { error } = await signInWithGoogle();
    if (error) setMessage({ type: 'error', text: error.message });
    setLoading(false);
  }

  const isEnlist = mode === 'signup';

  return (
    <div style={S.overlay}>
      <div style={S.card}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 9, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.25)', marginBottom: 4 }}>
            VENTUREPATH ·
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', letterSpacing: '0.06em' }}>
            {isEnlist ? 'ENLIST AS ARCHITECT' : 'RESUME EXPEDITION'}
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>
            {isEnlist
              ? 'Create your Architect identity'
              : 'Sign in to your Architect account'}
          </div>
        </div>

        {/* Mode toggle */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          {['signin', 'signup'].map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setMessage(null); }}
              style={{
                ...S.btnGhost,
                width: 'auto', flex: 1,
                borderColor: mode === m ? '#E67E22' : 'rgba(255,255,255,0.12)',
                color: mode === m ? '#E67E22' : 'rgba(255,255,255,0.45)',
              }}
            >
              {m === 'signin' ? 'RESUME' : 'ENLIST'}
            </button>
          ))}
        </div>

        {/* Method toggle */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
          {[{ k: 'magic', label: 'MAGIC LINK' }, { k: 'password', label: 'PASSPHRASE' }].map(({ k, label }) => (
            <button
              key={k}
              onClick={() => { setMethod(k); setMessage(null); }}
              style={{
                flex: 1,
                fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase',
                fontFamily: "'JetBrains Mono', monospace",
                background: 'none',
                color: method === k ? '#fff' : 'rgba(255,255,255,0.3)',
                borderBottom: method === k ? '1px solid #E67E22' : '1px solid transparent',
                border: 'none', borderBottom: method === k ? '1px solid #E67E22' : '1px solid transparent',
                padding: '4px 0', cursor: 'pointer',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          {isEnlist && method === 'password' && (
            <div style={{ marginBottom: 12 }}>
              <label style={S.label}>DISPLAY NAME</label>
              <input
                style={S.input}
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Your Architect name"
                autoComplete="name"
              />
            </div>
          )}

          <div style={{ marginBottom: 12 }}>
            <label style={S.label}>EMAIL</label>
            <input
              style={S.input}
              type="email" required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              autoComplete="email"
            />
          </div>

          {method === 'password' && (
            <div style={{ marginBottom: 12 }}>
              <label style={S.label}>PASSPHRASE</label>
              <input
                style={S.input}
                type="password" required minLength={8}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min 8 characters"
                autoComplete={isEnlist ? 'new-password' : 'current-password'}
              />
            </div>
          )}

          {message && (
            <div style={message.type === 'error' ? S.error : S.success}>
              {message.text}
            </div>
          )}

          <button type="submit" style={S.btnPrimary} disabled={loading}>
            {loading
              ? '▢▢▢ TRANSMITTING'
              : method === 'magic'
                ? '▣ DISPATCH MAGIC LINK'
                : isEnlist ? '▣ ENLIST' : '▣ RESUME EXPEDITION'}
          </button>
        </form>

        <div style={S.divider}>
          <div style={S.divLine} />
          <span style={S.divText}>OR</span>
          <div style={S.divLine} />
        </div>

        <button style={S.btnGhost} onClick={handleGoogle} disabled={loading}>
          ▣ CONTINUE WITH GOOGLE
        </button>

        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <button style={S.toggle} onClick={onCancel}>
            ✕ ABORT
          </button>
        </div>
      </div>
    </div>
  );
}
