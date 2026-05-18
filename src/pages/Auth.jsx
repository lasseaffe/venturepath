import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

const S = {
  root: { minHeight: '100vh', background: '#0E1012', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' },
  card: { width: '100%', maxWidth: 440, fontFamily: 'JetBrains Mono, monospace' },
  pre: { color: '#E67E22', fontSize: '0.7rem', letterSpacing: '0.12em', marginBottom: '0.5rem' },
  title: { color: '#fff', fontSize: '1.6rem', fontFamily: 'Playfair Display, serif', fontWeight: 700, marginBottom: '0.3rem' },
  sub: { color: '#D9C5B2', fontSize: '0.8rem', marginBottom: '2rem' },
  row: { display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' },
  tab: (active) => ({
    flex: 1, padding: '0.5rem', background: 'transparent', border: `1px solid ${active ? '#E67E22' : '#2a2a2a'}`,
    color: active ? '#E67E22' : '#888', fontSize: '0.7rem', letterSpacing: '0.1em', cursor: 'pointer',
  }),
  label: { color: '#D9C5B2', fontSize: '0.7rem', letterSpacing: '0.1em', display: 'block', marginBottom: '0.4rem' },
  input: { width: '100%', background: '#1a1a1a', border: '1px solid #333', color: '#fff', padding: '0.75rem', fontSize: '0.9rem', fontFamily: 'JetBrains Mono, monospace', boxSizing: 'border-box', marginBottom: '0.75rem' },
  btn: (disabled) => ({ width: '100%', padding: '0.9rem', background: disabled ? '#333' : '#E67E22', color: disabled ? '#888' : '#fff', border: 'none', fontSize: '0.75rem', letterSpacing: '0.1em', cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }),
  googleBtn: { width: '100%', padding: '0.9rem', background: 'transparent', border: '1px solid #444', color: '#D9C5B2', fontSize: '0.75rem', letterSpacing: '0.1em', cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace', marginTop: '0.75rem' },
  err: { color: '#e74c3c', fontSize: '0.75rem', marginBottom: '0.75rem' },
  ok: { color: '#27AE60', fontSize: '0.75rem', marginBottom: '0.75rem' },
  divider: { borderColor: '#222', margin: '1rem 0' },
};

export default function Auth({ onSuccess }) {
  const { signInWithMagicLink, signInWithPassword, signUpWithPassword, signInWithGoogle } = useAuth();
  const [mode, setMode]     = useState('enlist'); // 'enlist' | 'resume'
  const [method, setMethod] = useState('magic');  // 'magic' | 'passphrase'
  const [email, setEmail]   = useState('');
  const [pass, setPass]     = useState('');
  const [busy, setBusy]     = useState(false);
  const [msg, setMsg]       = useState(null);   // { type: 'ok'|'err', text }

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      let err;
      if (method === 'magic') {
        ({ error: err } = await signInWithMagicLink(email));
        if (!err) setMsg({ type: 'ok', text: '▢▢▢ MAGIC LINK DISPATCHED — check your signal' });
      } else if (mode === 'enlist') {
        ({ error: err } = await signUpWithPassword(email, pass));
        if (!err) setMsg({ type: 'ok', text: 'ENLISTED — confirm your signal then return' });
      } else {
        ({ error: err } = await signInWithPassword(email, pass));
        if (!err && onSuccess) onSuccess();
      }
      if (err) setMsg({ type: 'err', text: err.message });
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setBusy(true);
    const { error } = await signInWithGoogle();
    if (error) setMsg({ type: 'err', text: error.message });
    setBusy(false);
  }

  return (
    <div style={S.root}>
      <div style={S.card}>
        <div style={S.pre}>// VENTUREPATH — AUTHENTICATION TERMINAL</div>
        <div style={S.title}>{mode === 'enlist' ? 'Enlist as Architect' : 'Resume Expedition'}</div>
        <div style={S.sub}>{mode === 'enlist' ? 'Create your Architect dossier' : 'Pick up where you left off'}</div>

        <div style={S.row}>
          <button style={S.tab(mode === 'enlist')} onClick={() => setMode('enlist')}>▸ ENLIST</button>
          <button style={S.tab(mode === 'resume')} onClick={() => setMode('resume')}>▸ RESUME</button>
        </div>

        <div style={S.row}>
          <button style={S.tab(method === 'magic')} onClick={() => setMethod('magic')}>MAGIC LINK</button>
          <button style={S.tab(method === 'passphrase')} onClick={() => setMethod('passphrase')}>PASSPHRASE</button>
        </div>

        <form onSubmit={submit}>
          <label style={S.label}>SIGNAL ADDRESS (EMAIL)</label>
          <input style={S.input} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="architect@domain.com" required />

          {method === 'passphrase' && (
            <>
              <label style={S.label}>PASSPHRASE</label>
              <input style={S.input} type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="min 8 chars" minLength={8} required />
            </>
          )}

          {msg && <div style={msg.type === 'ok' ? S.ok : S.err}>{msg.text}</div>}

          <button style={S.btn(busy)} type="submit" disabled={busy}>
            {busy ? '▢▢▢ TRANSMITTING' : method === 'magic' ? 'DISPATCH MAGIC LINK' : mode === 'enlist' ? 'ENLIST AS ARCHITECT' : 'RESUME EXPEDITION'}
          </button>
        </form>

        <hr style={S.divider} />

        <button style={S.googleBtn} onClick={google} disabled={busy}>
          G — AUTHENTICATE VIA GOOGLE
        </button>
      </div>
    </div>
  );
}
