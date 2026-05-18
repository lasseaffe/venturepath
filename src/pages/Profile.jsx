import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

const S = {
  root: { minHeight: '100vh', background: '#0E1012', padding: '2rem', fontFamily: 'JetBrains Mono, monospace' },
  back: { color: '#888', fontSize: '0.7rem', letterSpacing: '0.1em', cursor: 'pointer', background: 'none', border: 'none', marginBottom: '1.5rem', display: 'block' },
  pre: { color: '#E67E22', fontSize: '0.7rem', letterSpacing: '0.12em', marginBottom: '0.5rem' },
  title: { color: '#fff', fontSize: '1.6rem', fontFamily: 'Playfair Display, serif', fontWeight: 700, marginBottom: '2rem' },
  section: { marginBottom: '2rem' },
  sectionTitle: { color: '#888', fontSize: '0.65rem', letterSpacing: '0.15em', marginBottom: '1rem', borderBottom: '1px solid #222', paddingBottom: '0.5rem' },
  label: { color: '#D9C5B2', fontSize: '0.7rem', letterSpacing: '0.1em', display: 'block', marginBottom: '0.4rem' },
  input: { width: '100%', background: '#1a1a1a', border: '1px solid #333', color: '#fff', padding: '0.75rem', fontSize: '0.9rem', fontFamily: 'JetBrains Mono, monospace', boxSizing: 'border-box', marginBottom: '0.75rem' },
  badge: (v) => ({ fontSize: '0.65rem', padding: '0.2rem 0.5rem', background: v === 'AVAILABLE' ? '#1a3a1a' : v === 'TAKEN' ? '#3a1a1a' : v === 'CHECKING' ? '#1a1a3a' : '#2a2a2a', color: v === 'AVAILABLE' ? '#27AE60' : v === 'TAKEN' ? '#e74c3c' : v === 'CHECKING' ? '#4A90D9' : '#888', marginBottom: '0.75rem', display: 'inline-block' }),
  toggle: { display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' },
  toggleLabel: { color: '#D9C5B2', fontSize: '0.8rem' },
  checkbox: { width: 18, height: 18, accentColor: '#E67E22' },
  btn: (color = '#E67E22') => ({ padding: '0.8rem 1.5rem', background: color, border: 'none', color: '#fff', fontSize: '0.7rem', letterSpacing: '0.1em', cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, marginRight: '0.5rem', marginBottom: '0.5rem' }),
  ghost: { padding: '0.8rem 1.5rem', background: 'transparent', border: '1px solid #444', color: '#D9C5B2', fontSize: '0.7rem', letterSpacing: '0.1em', cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace', marginRight: '0.5rem', marginBottom: '0.5rem' },
  ok: { color: '#27AE60', fontSize: '0.75rem', marginBottom: '0.5rem' },
  err: { color: '#e74c3c', fontSize: '0.75rem', marginBottom: '0.5rem' },
  verifiedBadge: { background: '#1a3a1a', color: '#27AE60', fontSize: '0.65rem', padding: '0.25rem 0.6rem', display: 'inline-block', letterSpacing: '0.1em' },
};

export default function Profile({ onClose, onSignedOut }) {
  const { profile, updateProfile, isHandleAvailable, exportMyData, signOut, reloadProfile } = useAuth();
  const [handle, setHandle]         = useState(profile?.handle ?? '');
  const [displayName, setDisplay]   = useState(profile?.display_name ?? '');
  const [sabbath, setSabbath]       = useState(profile?.sabbath_aware ?? false);
  const [region, setRegion]         = useState(profile?.region ?? '');
  const [handleStatus, setHStatus]  = useState('IDLE'); // IDLE|CHECKING|AVAILABLE|TAKEN|INVALID
  const [saving, setSaving]         = useState(false);
  const [msg, setMsg]               = useState(null);

  // Debounced handle check
  useEffect(() => {
    if (!handle || handle === profile?.handle) { setHStatus('IDLE'); return; }
    if (!/^[a-z0-9_]{3,30}$/.test(handle)) { setHStatus('INVALID'); return; }
    setHStatus('CHECKING');
    const t = setTimeout(async () => {
      const avail = await isHandleAvailable(handle);
      setHStatus(avail ? 'AVAILABLE' : 'TAKEN');
    }, 400);
    return () => clearTimeout(t);
  }, [handle, profile?.handle, isHandleAvailable]);

  const save = useCallback(async () => {
    if (handleStatus === 'TAKEN' || handleStatus === 'INVALID') return;
    setSaving(true); setMsg(null);
    const { error } = await updateProfile({ handle, display_name: displayName, sabbath_aware: sabbath, region });
    if (error) setMsg({ type: 'err', text: error.message });
    else { setMsg({ type: 'ok', text: 'DOSSIER COMMITTED' }); await reloadProfile(); }
    setSaving(false);
  }, [handle, displayName, sabbath, region, handleStatus, updateProfile, reloadProfile]);

  async function doExport() {
    const data = await exportMyData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `architect-export-${Date.now()}.json`; a.click();
  }

  async function doSignOut() {
    await signOut();
    if (onSignedOut) onSignedOut();
  }

  if (!profile) return null;

  return (
    <div style={S.root}>
      {onClose && <button style={S.back} onClick={onClose}>← BACK TO BASECAMP</button>}
      <div style={S.pre}>// ARCHITECT DOSSIER</div>
      <div style={S.title}>
        {profile.display_name || profile.handle}
        {profile.verified && <span style={{ ...S.verifiedBadge, marginLeft: '1rem' }}>✓ VERIFIED ARCHITECT</span>}
      </div>

      <div style={S.section}>
        <div style={S.sectionTitle}>HANDLE</div>
        <label style={S.label}>ARCHITECT HANDLE (3-30 chars, a-z 0-9 _)</label>
        <input style={S.input} value={handle} onChange={e => setHandle(e.target.value.toLowerCase())} placeholder="trailblazer_42" />
        {handleStatus !== 'IDLE' && <div style={S.badge(handleStatus)}>{handleStatus}</div>}

        <label style={S.label}>DISPLAY NAME</label>
        <input style={S.input} value={displayName} onChange={e => setDisplay(e.target.value)} placeholder="Trail Name" />

        <label style={S.label}>HOME REGION (city / country)</label>
        <input style={S.input} value={region} onChange={e => setRegion(e.target.value)} placeholder="Queenstown, NZ" />
      </div>

      <div style={S.section}>
        <div style={S.sectionTitle}>PREFERENCES</div>
        <div style={S.toggle}>
          <input style={S.checkbox} type="checkbox" checked={sabbath} onChange={e => setSabbath(e.target.checked)} id="sabbath" />
          <label style={S.toggleLabel} htmlFor="sabbath">Sabbath-aware scheduling (warn on Sunday Gatherings)</label>
        </div>
      </div>

      {msg && <div style={msg.type === 'ok' ? S.ok : S.err}>{msg.text}</div>}

      <button style={S.btn()} onClick={save} disabled={saving}>
        {saving ? 'COMMITTING...' : 'COMMIT DOSSIER'}
      </button>

      <div style={{ marginTop: '2rem' }}>
        <button style={S.ghost} onClick={doExport}>EXPORT MY DATA</button>
        <button style={S.ghost} onClick={doSignOut}>SIGN OUT</button>
      </div>
    </div>
  );
}
