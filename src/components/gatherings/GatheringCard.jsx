import { resolveAccent, resolveIcon, getTemplate } from '../../lib/gatherings/templates.js';

const PRIVACY_LABELS = { squad: 'SQUAD', invite: 'INVITE', public_listed: 'PUBLIC', public_open: 'OPEN' };
const STATUS_COLORS  = { draft: '#888', scheduled: '#27AE60', live: '#E67E22', completed: '#D9C5B2', cancelled: '#e74c3c' };

export default function GatheringCard({ gathering, onClick }) {
  const accent = resolveAccent(gathering);
  const tpl    = getTemplate(gathering.template_id);
  const statusColor = STATUS_COLORS[gathering.status] ?? '#888';

  const dateStr = gathering.starts_at
    ? new Date(gathering.starts_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—';

  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', textAlign: 'left', background: '#111', border: `1px solid ${accent}33`,
        borderLeft: `3px solid ${accent}`, padding: '1rem', cursor: 'pointer',
        fontFamily: 'JetBrains Mono, monospace', transition: 'border-color 0.15s',
        display: 'block', marginBottom: '0.5rem',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
        <div style={{ color: '#fff', fontSize: '0.95rem', fontFamily: 'Playfair Display, serif', fontWeight: 700 }}>
          {gathering.title}
        </div>
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.6rem', padding: '0.2rem 0.4rem', background: '#1a1a1a', color: '#888', letterSpacing: '0.1em' }}>
            {PRIVACY_LABELS[gathering.privacy] ?? gathering.privacy}
          </span>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor, display: 'inline-block' }} title={gathering.status} />
        </div>
      </div>

      <div style={{ color: '#D9C5B2', fontSize: '0.75rem', marginBottom: '0.4rem' }}>
        {tpl.label} · {dateStr}
      </div>

      {gathering.location_label && (
        <div style={{ color: '#888', fontSize: '0.7rem' }}>◎ {gathering.location_label}</div>
      )}

      {gathering.vibe_tag && (
        <div style={{ color: accent, fontSize: '0.7rem', marginTop: '0.4rem', opacity: 0.8 }}>{gathering.vibe_tag}</div>
      )}
    </button>
  );
}
