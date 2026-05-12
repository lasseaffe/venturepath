import { useState } from 'react';
import { createPortal } from 'react-dom';

const ISSUE_TYPES = [
  { id: 'wrong_location', label: '🗺️ Wrong city / location' },
  { id: 'bad_poi',        label: '📍 Bad POI — wrong or irrelevant' },
  { id: 'wrong_language', label: '🌐 Description in wrong language' },
  { id: 'missing_image',  label: '🖼️ Missing or wrong image' },
  { id: 'missing_pois',   label: '➕ Missing important attractions' },
  { id: 'other',          label: '💬 Other problem' },
];

const RECEIVER_URL = '/api/element-reports';

export default function ReportButton({
  cityId, cityName, country, poiId = null, small = false,
  imageUrl = null, imageAttribution = null,
}) {
  const [open, setOpen]       = useState(false);
  const [type, setType]       = useState(imageUrl ? 'missing_image' : 'bad_poi');
  const [detail, setDetail]   = useState('');
  const [state, setState]     = useState('idle'); // idle | sending | done | error

  async function handleSubmit() {
    setState('sending');
    try {
      const res = await fetch(RECEIVER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cityId, cityName, country,
          issueType: type,
          poiId,
          detail,
          imageUrl,
          card_type: poiId ? 'inspire_poi' : imageUrl ? 'destination_image' : 'inspire_city',
        }),
      });
      if (!res.ok) throw new Error('Server error');
      setState('done');
      setTimeout(() => { setOpen(false); setState('idle'); setDetail(''); }, 1800);
    } catch {
      setState('error');
      setTimeout(() => setState('idle'), 2500);
    }
  }

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={e => { e.stopPropagation(); setOpen(true); }}
        title="Report a problem"
        style={{
          width: small ? 20 : 24, height: small ? 20 : 24,
          borderRadius: '50%',
          border: '1px solid rgba(230,126,34,0.3)',
          background: 'rgba(0,0,0,0.5)',
          color: '#E67E22',
          fontSize: small ? 9 : 11,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', flexShrink: 0,
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(230,126,34,0.25)'}
        onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.5)'}
      >
        ⚠
      </button>

      {/* Modal — portal escapes CSS transform containing blocks (framer-motion cards) */}
      {open && createPortal(
        <div
          onClick={e => { e.stopPropagation(); setOpen(false); }}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#0E1012', border: '1px solid #1e2328',
              borderRadius: 8, padding: 24, width: 340, maxWidth: '90vw',
            }}
          >
            {/* Header */}
            <div className="text-[10px] font-mono tracking-widest text-[#E67E22] uppercase mb-1">
              Report a problem
            </div>
            <div className="text-[12px] font-mono font-bold text-white mb-4">
              {cityName}{poiId ? ` — ${poiId.replace(/^[^-]+-/, '')}` : ''}
            </div>

            {imageAttribution?.author && (
              <div className="mb-4 p-2 rounded" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="text-[9px] font-mono text-[#E67E22] uppercase tracking-widest mb-1.5">Image credit</div>
                <div className="flex flex-col gap-1">
                  <a href={imageAttribution.authorUrl} target="_blank" rel="noopener noreferrer"
                     className="text-[10px] font-mono text-[#E67E22]" style={{ textDecoration: 'none' }}>
                    {imageAttribution.author} ↗
                  </a>
                  <a href={imageAttribution.licenseUrl} target="_blank" rel="noopener noreferrer"
                     className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>
                    {imageAttribution.license} ↗
                  </a>
                  <a href={imageAttribution.photoPageUrl} target="_blank" rel="noopener noreferrer"
                     className="text-[10px] font-mono text-[#E67E22]" style={{ textDecoration: 'none' }}>
                    View original ↗
                  </a>
                </div>
              </div>
            )}

            {/* Issue type pills */}
            <div className="flex flex-col gap-1.5 mb-4">
              {ISSUE_TYPES.map(t => (
                <button
                  key={t.id}
                  onClick={() => setType(t.id)}
                  className="text-left text-[10px] font-mono px-3 py-2 rounded border transition-colors"
                  style={{
                    borderColor: type === t.id ? 'rgba(230,126,34,0.6)' : '#1e2328',
                    background:  type === t.id ? 'rgba(230,126,34,0.1)' : 'transparent',
                    color:       type === t.id ? '#E67E22' : '#6b7280',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Detail textarea */}
            <textarea
              value={detail}
              onChange={e => setDetail(e.target.value)}
              placeholder="Extra details (optional)…"
              rows={2}
              style={{
                width: '100%', background: '#111316', border: '1px solid #1e2328',
                borderRadius: 4, color: 'var(--text-secondary)', fontSize: 10, fontFamily: 'monospace',
                padding: '8px 10px', resize: 'none', outline: 'none',
                boxSizing: 'border-box', marginBottom: 12,
              }}
            />

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={state === 'sending' || state === 'done'}
              style={{
                width: '100%', padding: '8px 0',
                background: state === 'done' ? 'rgba(34,197,94,0.15)' : 'rgba(230,126,34,0.15)',
                border: `1px solid ${state === 'done' ? 'rgba(34,197,94,0.4)' : 'rgba(230,126,34,0.4)'}`,
                borderRadius: 4, color: state === 'done' ? '#22c55e' : '#E67E22',
                fontSize: 10, fontFamily: 'monospace', letterSpacing: '0.15em',
                cursor: state === 'sending' || state === 'done' ? 'default' : 'pointer',
                textTransform: 'uppercase',
              }}
            >
              {state === 'idle'    && 'Submit report'}
              {state === 'sending' && 'Sending…'}
              {state === 'done'    && '✓ Report saved — thanks!'}
              {state === 'error'   && '✖ Failed — is the receiver running?'}
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
