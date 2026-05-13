// VenturePath · Phase 1 · Architect Dossier
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';

const HANDLE_RE = /^[a-z0-9_]{3,24}$/;

const S = {
  page: {
    minHeight: '100vh',
    background: '#0E1012',
    color: '#fff',
    fontFamily: "'JetBrains Mono', monospace",
    padding: '32px 24px',
    maxWidth: 560, margin: '0 auto',
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
  field: { marginBottom: 18 },
  badge: (color) => ({
    display: 'inline-block',
    fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase',
    padding: '2px 6px', marginLeft: 8,
    background: color + '22', color, border: `1px solid ${color}44`,
  }),
  btn: {
    background: '#E67E22', color: '#000',
    border: 'none', fontFamily: "'JetBrains Mono', monospace",
    fontSize: 11, letterSpacing: '0.14em', fontWeight: 700,
    padding: '12px 24px', cursor: 'pointer', textTransform: 'uppercase',
  },
  btnGhost: {
    background: 'transparent', color: 'rgba(255,255,255,0.45)',
    border: '1px solid rgba(255,255,255,0.12)',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
    padding: '10px 24px', cursor: 'pointer',
  },
  toggle: {
    display: 'flex', alignItems: 'center', gap: 12,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    padding: '12px 14px', cursor: 'pointer', userSelect: 'none',
  },
  dot: (on) => ({
    width: 32, height: 18, borderRadius: 9,
    background: on ? '#E67E22' : 'rgba(255,255,255,0.12)',
    position: 'relative', transition: 'background 0.2s', flexShrink: 0,
  }),
  dotKnob: (on) => ({
    position: 'absolute', top: 3, left: on ? 17 : 3,
    width: 12, height: 12, borderRadius: '50%',
    background: '#fff', transition: 'left 0.2s',
  }),
};

function HandleStatus({ checking, available, handle }) {
  if (!handle || handle.length < 3) return null;
  if (!HANDLE_RE.test(handle)) return <span style={S.badge('#ef4444')}>INVALID</span>;
  if (checking) return <span style={S.badge('#F2C94C')}>CHECKING…</span>;
  if (available === true)  return <span style={S.badge('#4ade80')}>AVAILABLE</span>;
  if (available === false) return <span style={S.badge('#ef4444')}>TAKEN</span>;
  return null;
}

export default function Profile({ onClose, onSignedOut }) {
  const { architect, profile, needsHandleSetup, updateProfile, isHandleAvailable, signOut, exportMyData } = useAuth();

  const [handle, setHandle]           = useState('');
  const [displayName, setDisplayName] = useState('');
  const [region, setRegion]           = useState('');
  const [bio, setBio]                 = useState('');
  const [sabbath, setSabbath]         = useState(false);

  const [handleAvailable, setHandleAvailable] = useState(null);
  const [handleChecking, setHandleChecking]   = useState(false);

  const [saving, setSaving]   = useState(false);
  const [message, setMessage] = useState(null);

  const debounceRef = useRef(null);

  // Populate form from profile
  useEffect(() => {
    if (!profile) return;
    setHandle(profile.handle ?? '');
    setDisplayName(profile.display_name ?? '');
    setRegion(profile.region ?? '');
    setBio(profile.bio ?? '');
    setSabbath(profile.sabbath_aware ?? false);
  }, [profile]);

  // Debounced handle availability check
  useEffect(() => {
    if (handle === (profile?.handle ?? '')) { setHandleAvailable(null); return; }
    clearTimeout(debounceRef.current);
    if (!HANDLE_RE.test(handle)) { setHandleAvailable(null); return; }
    setHandleChecking(true);
    debounceRef.current = setTimeout(async () => {
      const ok = await isHandleAvailable(handle);
      setHandleAvailable(ok);
      setHandleChecking(false);
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [handle, profile?.handle, isHandleAvailable]);

  async function handleSave(e) {
    e.preventDefault();
    if (!HANDLE_RE.test(handle)) {
      setMessage({ type: 'error', text: 'Handle must be 3-24 lowercase letters, digits, or underscores.' });
      return;
    }
    if (handle !== profile?.handle && handleAvailable === false) {
      setMessage({ type: 'error', text: 'That handle is already taken.' });
      return;
    }
    setSaving(true);
    const { error } = await updateProfile({
      handle,
      display_name: displayName || null,
      region: region || null,
      bio: bio || null,
      sabbath_aware: sabbath,
    });
    setSaving(false);
    if (error) setMessage({ type: 'error', text: error.message });
    else setMessage({ type: 'success', text: '▣ DOSSIER COMMITTED' });
  }

  async function handleSignOut() {
    await signOut();
    onSignedOut?.();
  }

  if (!architect) return null;

  return (
    <div style={S.page}>
      {/* Back */}
      <button
        onClick={onClose}
        style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 11, cursor: 'pointer', marginBottom: 24, padding: 0, letterSpacing: '0.1em' }}
      >
        ← BACK TO BASECAMP
      </button>

      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 9, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.25)', marginBottom: 4 }}>
          VENTUREPATH ·
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '0.06em' }}>
          ARCHITECT DOSSIER
        </div>
        {needsHandleSetup && (
          <div style={{ marginTop: 8, padding: '8px 12px', background: 'rgba(230,126,34,0.1)', border: '1px solid rgba(230,126,34,0.3)', fontSize: 10, color: '#E67E22' }}>
            ⚠ Draft handle active. Set a permanent handle below.
          </div>
        )}
      </div>

      <form onSubmit={handleSave}>
        {/* Handle */}
        <div style={S.field}>
          <label style={S.label}>
            HANDLE
            <HandleStatus checking={handleChecking} available={handleAvailable} handle={handle} />
          </label>
          <input
            style={S.input}
            value={handle}
            onChange={e => setHandle(e.target.value.toLowerCase())}
            placeholder="my_handle"
            maxLength={24}
          />
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', marginTop: 4 }}>
            3–24 chars · lowercase · letters, digits, underscore only
          </div>
        </div>

        {/* Display name */}
        <div style={S.field}>
          <label style={S.label}>DISPLAY NAME</label>
          <input
            style={S.input}
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder="Your Architect name"
          />
        </div>

        {/* Basecamp region */}
        <div style={S.field}>
          <label style={S.label}>BASECAMP REGION</label>
          <input
            style={S.input}
            value={region}
            onChange={e => setRegion(e.target.value)}
            placeholder="e.g. Pacific Northwest, Utah"
          />
        </div>

        {/* Expedition ethos */}
        <div style={S.field}>
          <label style={S.label}>EXPEDITION ETHOS</label>
          <textarea
            style={{ ...S.input, height: 72, resize: 'vertical' }}
            value={bio}
            onChange={e => setBio(e.target.value)}
            placeholder="What drives your expeditions?"
            maxLength={280}
          />
        </div>

        {/* Sabbath-aware */}
        <div style={S.field}>
          <label style={S.label}>SUNDAY OBSERVANCE</label>
          <div
            style={S.toggle}
            onClick={() => setSabbath(v => !v)}
          >
            <div style={S.dot(sabbath)}>
              <div style={S.dotKnob(sabbath)} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: sabbath ? '#E67E22' : 'rgba(255,255,255,0.5)' }}>
                {sabbath ? 'Sabbath-aware — Sunday scheduling protected' : 'No Sunday restrictions'}
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
                Affects Gathering scheduling and public feed filters
              </div>
            </div>
          </div>
        </div>

        {message && (
          <div style={{ fontSize: 11, color: message.type === 'error' ? '#ef4444' : '#4ade80', marginBottom: 12 }}>
            {message.text}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button type="submit" style={S.btn} disabled={saving}>
            {saving ? '▢▢▢ COMMITTING' : '▣ COMMIT DOSSIER'}
          </button>
          <button type="button" style={S.btnGhost} onClick={exportMyData}>
            ▣ EXPORT MY DATA
          </button>
          <button type="button" style={{ ...S.btnGhost, color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }} onClick={handleSignOut}>
            SIGN OUT
          </button>
        </div>
      </form>
    </div>
  );
}
