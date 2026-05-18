import { useState } from 'react';
import TemplatePicker from './TemplatePicker.jsx';
import { createGathering } from '../../lib/gatherings/api.js';
import { useAuth } from '../../context/AuthContext.jsx';

const PRIVACY_OPTS = [
  { value: 'squad',  label: 'Squad — invite-only, squad members only' },
  { value: 'invite', label: 'Invite — anyone with link' },
  // public_listed unlocked in Phase 4 for verified architects
];

const S = {
  label: { color: '#D9C5B2', fontSize: '0.7rem', letterSpacing: '0.1em', display: 'block', marginBottom: '0.4rem' },
  input: { width: '100%', background: '#1a1a1a', border: '1px solid #333', color: '#fff', padding: '0.7rem', fontSize: '0.85rem', fontFamily: 'JetBrains Mono, monospace', boxSizing: 'border-box', marginBottom: '0.75rem' },
  select: { width: '100%', background: '#1a1a1a', border: '1px solid #333', color: '#fff', padding: '0.7rem', fontSize: '0.85rem', fontFamily: 'JetBrains Mono, monospace', boxSizing: 'border-box', marginBottom: '0.75rem' },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' },
  warn: { background: '#2a1a00', border: '1px solid #E67E22', color: '#E67E22', padding: '0.6rem', fontSize: '0.7rem', marginBottom: '0.75rem' },
  btn: (disabled) => ({ padding: '0.8rem 1.5rem', background: disabled ? '#333' : '#E67E22', border: 'none', color: disabled ? '#888' : '#fff', fontSize: '0.75rem', letterSpacing: '0.1em', cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }),
  ghost: { padding: '0.8rem 1.5rem', background: 'transparent', border: '1px solid #444', color: '#D9C5B2', fontSize: '0.7rem', cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace', marginRight: '0.5rem' },
  err: { color: '#e74c3c', fontSize: '0.75rem', marginBottom: '0.5rem' },
};

function isSunday(dateStr) {
  if (!dateStr) return false;
  return new Date(dateStr).getDay() === 0;
}

export default function CreateGatheringForm({ tripId = null, onCreated, onCancel }) {
  const { profile } = useAuth();
  const [step, setStep]       = useState('template');
  const [templateId, setTpl]  = useState(null);
  const [form, setForm]       = useState({
    title: '', vibe_tag: '', starts_at: '', ends_at: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    location_label: '', coords_lat: '', coords_lng: '',
    privacy: 'squad', coords_radius_m: 0,
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr]   = useState(null);

  function pick(id) { setTpl(id); setStep('details'); }
  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function submit(e) {
    e.preventDefault(); setErr(null); setBusy(true);
    const lat = parseFloat(form.coords_lat);
    const lng = parseFloat(form.coords_lng);
    const geoValue = !isNaN(lat) && !isNaN(lng)
      ? `SRID=4326;POINT(${lng} ${lat})` : null;

    const { data, error } = await createGathering({
      template_id: templateId,
      trip_id: tripId,
      title: form.title,
      vibe_tag: form.vibe_tag || null,
      starts_at: form.starts_at || null,
      ends_at: form.ends_at || null,
      timezone: form.timezone,
      location_label: form.location_label || null,
      coords: geoValue,
      coords_radius_m: parseInt(form.coords_radius_m) || 0,
      privacy: form.privacy,
    });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    onCreated(data);
  }

  if (step === 'template') {
    return (
      <div>
        <TemplatePicker onSelect={pick} />
        {onCancel && <button style={{ ...S.ghost, marginTop: '1rem' }} onClick={onCancel}>✕ ABORT</button>}
      </div>
    );
  }

  const sabbathWarn = profile?.sabbath_aware && isSunday(form.starts_at);

  return (
    <form onSubmit={submit}>
      <div style={{ color: '#888', fontSize: '0.65rem', letterSpacing: '0.15em', marginBottom: '1rem' }}>
        CONFIGURE GATHERING — {templateId.toUpperCase().replace('_', ' ')}
      </div>

      <label style={S.label}>GATHERING NAME</label>
      <input style={S.input} value={form.title} onChange={e => set('title', e.target.value)} placeholder="Summit Eve Campfire" required />

      <label style={S.label}>VIBE TAG (optional)</label>
      <input style={S.input} value={form.vibe_tag} onChange={e => set('vibe_tag', e.target.value)} placeholder="One line — the spirit of this Gathering" />

      <div style={S.row2}>
        <div>
          <label style={S.label}>STARTS</label>
          <input style={S.input} type="datetime-local" value={form.starts_at} onChange={e => set('starts_at', e.target.value)} />
        </div>
        <div>
          <label style={S.label}>ENDS</label>
          <input style={S.input} type="datetime-local" value={form.ends_at} onChange={e => set('ends_at', e.target.value)} />
        </div>
      </div>

      {sabbathWarn && (
        <div style={S.warn}>⚠ SABBATH-AWARE: This Gathering falls on a Sunday — confirm this is intentional</div>
      )}

      <label style={S.label}>LOCATION LABEL</label>
      <input style={S.input} value={form.location_label} onChange={e => set('location_label', e.target.value)} placeholder="Refugio Chileno, Torres del Paine" />

      <div style={S.row2}>
        <div>
          <label style={S.label}>LATITUDE (optional)</label>
          <input style={S.input} value={form.coords_lat} onChange={e => set('coords_lat', e.target.value)} placeholder="-50.94" />
        </div>
        <div>
          <label style={S.label}>LONGITUDE (optional)</label>
          <input style={S.input} value={form.coords_lng} onChange={e => set('coords_lng', e.target.value)} placeholder="-73.41" />
        </div>
      </div>

      <label style={S.label}>PRIVACY</label>
      <select style={S.select} value={form.privacy} onChange={e => set('privacy', e.target.value)}>
        {PRIVACY_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        {profile?.verified && (
          <option value="public_listed">Public Listed — discoverable by Pioneers nearby</option>
        )}
      </select>

      {form.privacy === 'public_listed' && (
        <>
          <label style={S.label}>LOCATION PRIVACY RADIUS (metres, 0 = exact)</label>
          <input style={S.input} type="number" min={0} value={form.coords_radius_m} onChange={e => set('coords_radius_m', e.target.value)} placeholder="500" />
        </>
      )}

      {err && <div style={S.err}>{err}</div>}

      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
        <button style={S.ghost} type="button" onClick={() => setStep('template')}>← BACK</button>
        {onCancel && <button style={S.ghost} type="button" onClick={onCancel}>✕ ABORT</button>}
        <button style={S.btn(busy)} type="submit" disabled={busy}>
          {busy ? 'LIGHTING UP...' : '▸ LIGHT IT UP'}
        </button>
      </div>
    </form>
  );
}
