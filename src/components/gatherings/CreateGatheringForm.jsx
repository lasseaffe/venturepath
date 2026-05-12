// VenturePath · Phase 2 · Create Gathering two-step form
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import TemplatePicker from './TemplatePicker';

const S = {
  label: {
    fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.35)', display: 'block', marginBottom: 6,
    fontFamily: "'JetBrains Mono', monospace",
  },
  input: {
    width: '100%', background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.12)',
    color: '#fff', fontFamily: "'JetBrains Mono', monospace",
    fontSize: 13, padding: '10px 12px', outline: 'none',
    boxSizing: 'border-box',
  },
  field: { marginBottom: 16 },
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
};

const PRIVACY_OPTIONS = [
  { value: 'squad',   label: 'SQUAD ONLY', desc: 'Visible to invited Pioneers' },
  { value: 'invite',  label: 'INVITE LINK', desc: 'Anyone with the link can join' },
  // public_listed / public_open locked to Phase 4
];

function isSunday(dateStr) {
  if (!dateStr) return false;
  return new Date(dateStr).getDay() === 0;
}

function parseCoordsString(str) {
  const parts = str.split(',').map(s => parseFloat(s.trim()));
  if (parts.length === 2 && parts.every(n => !isNaN(n))) {
    return [parts[1], parts[0]]; // store as [lng, lat]
  }
  return null;
}

export default function CreateGatheringForm({ tripId, onCreate, onCancel }) {
  const { profile } = useAuth();

  const [step, setStep]       = useState(1); // 1 = template, 2 = details
  const [templateId, setTemplateId] = useState('campfire');
  const [title, setTitle]     = useState('');
  const [vibeTag, setVibeTag] = useState('');
  const [location, setLocation] = useState('');
  const [coordsStr, setCoordsStr] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt]   = useState('');
  const [privacy, setPrivacy] = useState('squad');
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState(null);

  const sabbathWarn = profile?.sabbath_aware && startsAt && isSunday(startsAt);

  async function handleCreate(e) {
    e.preventDefault();
    if (!title.trim()) { setError('Title is required.'); return; }
    if (!startsAt)     { setError('Start time is required.'); return; }
    setSaving(true);
    setError(null);

    const coords = coordsStr ? parseCoordsString(coordsStr) : null;

    const result = await onCreate({
      template_id:    templateId,
      title:          title.trim(),
      vibe_tag:       vibeTag.trim() || null,
      location_label: location.trim() || null,
      coords,
      starts_at:      new Date(startsAt).toISOString(),
      ends_at:        endsAt ? new Date(endsAt).toISOString() : null,
      privacy,
      trip_id:        tripId ?? null,
    });

    setSaving(false);
    if (result?.error) setError(result.error.message);
  }

  return (
    <div style={{
      background: '#0E1012', border: '1px solid rgba(255,255,255,0.12)',
      padding: '24px',
      fontFamily: "'JetBrains Mono', monospace",
      maxHeight: '80vh', overflowY: 'auto',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 9, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.25)', marginBottom: 2 }}>
            VENTUREPATH ·
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', letterSpacing: '0.06em' }}>
            CONVENE A GATHERING
          </div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>
            Step {step} of 2 — {step === 1 ? 'Archetype' : 'Details'}
          </div>
        </div>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 11, cursor: 'pointer', letterSpacing: '0.1em' }}>
          ✕ ABORT
        </button>
      </div>

      {step === 1 ? (
        <>
          <TemplatePicker selected={templateId} onSelect={setTemplateId} />
          <div style={{ marginTop: 20 }}>
            <button style={S.btn} onClick={() => setStep(2)}>
              ▣ CONTINUE →
            </button>
          </div>
        </>
      ) : (
        <form onSubmit={handleCreate}>
          <button
            type="button"
            onClick={() => setStep(1)}
            style={{ ...S.btnGhost, marginBottom: 16, padding: '6px 12px', fontSize: 9 }}
          >
            ← CHANGE ARCHETYPE
          </button>

          {/* Title */}
          <div style={S.field}>
            <label style={S.label}>GATHERING TITLE *</label>
            <input style={S.input} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Ridge Campfire Night" required />
          </div>

          {/* Vibe tag */}
          <div style={S.field}>
            <label style={S.label}>VIBE TAG</label>
            <input style={S.input} value={vibeTag} onChange={e => setVibeTag(e.target.value)} placeholder="One-line mood or intention" maxLength={80} />
          </div>

          {/* Location */}
          <div style={S.field}>
            <label style={S.label}>LOCATION LABEL</label>
            <input style={S.input} value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Hidden Lake Trailhead, Olympic NP" />
          </div>

          {/* Coords */}
          <div style={S.field}>
            <label style={S.label}>COORDINATES (lat, lng)</label>
            <input style={S.input} value={coordsStr} onChange={e => setCoordsStr(e.target.value)} placeholder="47.8234, -123.6813" />
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', marginTop: 4 }}>
              Optional — paste from maps or leave blank
            </div>
          </div>

          {/* Starts at */}
          <div style={S.field}>
            <label style={S.label}>STARTS AT *</label>
            <input
              style={{ ...S.input, colorScheme: 'dark' }}
              type="datetime-local" required
              value={startsAt} onChange={e => setStartsAt(e.target.value)}
            />
            {sabbathWarn && (
              <div style={{ marginTop: 6, padding: '6px 10px', background: 'rgba(230,126,34,0.1)', border: '1px solid rgba(230,126,34,0.3)', fontSize: 9, color: '#E67E22' }}>
                ⚠ This falls on Sunday. Your Sabbath-aware preference is active.
              </div>
            )}
          </div>

          {/* Ends at */}
          <div style={S.field}>
            <label style={S.label}>ENDS AT (optional)</label>
            <input
              style={{ ...S.input, colorScheme: 'dark' }}
              type="datetime-local"
              value={endsAt} onChange={e => setEndsAt(e.target.value)}
              min={startsAt}
            />
          </div>

          {/* Privacy */}
          <div style={S.field}>
            <label style={S.label}>VISIBILITY</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {PRIVACY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPrivacy(opt.value)}
                  style={{
                    flex: 1, padding: '10px 8px', border: 'none', cursor: 'pointer',
                    background: privacy === opt.value ? 'rgba(230,126,34,0.12)' : 'rgba(255,255,255,0.03)',
                    borderBottom: privacy === opt.value ? '2px solid #E67E22' : '2px solid transparent',
                    color: privacy === opt.value ? '#E67E22' : 'rgba(255,255,255,0.4)',
                    fontFamily: "'JetBrains Mono', monospace",
                    textAlign: 'left',
                  }}
                >
                  <div style={{ fontSize: 9, letterSpacing: '0.12em', fontWeight: 700 }}>{opt.label}</div>
                  <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div style={{ fontSize: 11, color: '#ef4444', marginBottom: 12 }}>{error}</div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" style={S.btn} disabled={saving}>
              {saving ? '▢▢▢ LIGHTING UP' : '▣ LIGHT IT UP'}
            </button>
            <button type="button" style={S.btnGhost} onClick={onCancel}>
              ABORT
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
