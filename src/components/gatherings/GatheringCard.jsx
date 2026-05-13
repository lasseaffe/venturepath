// VenturePath · Phase 2 · Gathering card for hub + trip view
import { resolveAccent, resolveIcon } from '../../lib/gatherings/templates';

const PRIVACY_LABELS = {
  squad:         { label: 'SQUAD',    color: '#E67E22' },
  invite:        { label: 'INVITE',   color: '#F2C94C' },
  public_listed: { label: 'PUBLIC',   color: '#4ade80' },
  public_open:   { label: 'OPEN',     color: '#4ade80' },
};

const STATUS_COLORS = {
  draft:      'rgba(255,255,255,0.25)',
  scheduled:  '#E67E22',
  live:       '#F2C94C',
  completed:  '#4ade80',
  cancelled:  '#ef4444',
};

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function GatheringCard({ gathering, onClick }) {
  const accent   = resolveAccent(gathering);
  const icon     = resolveIcon(gathering);
  const privacy  = PRIVACY_LABELS[gathering.privacy] ?? PRIVACY_LABELS.squad;
  const statusColor = STATUS_COLORS[gathering.status] ?? STATUS_COLORS.scheduled;

  return (
    <button
      onClick={onClick}
      style={{
        display: 'block', width: '100%', textAlign: 'left',
        background: 'rgba(255,255,255,0.03)',
        border: `1px solid ${accent}33`,
        borderLeft: `3px solid ${accent}`,
        padding: '14px 16px',
        cursor: 'pointer',
        fontFamily: "'JetBrains Mono', monospace",
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
      onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        {/* Template icon */}
        <div style={{ fontSize: 20, flexShrink: 0, lineHeight: 1 }}>{icon}</div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Title + badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{ color: '#fff', fontSize: 13, fontWeight: 700, letterSpacing: '0.04em' }}>
              {gathering.title}
            </span>
            <span style={{
              fontSize: 8, letterSpacing: '0.12em', padding: '1px 5px',
              background: privacy.color + '22', color: privacy.color,
              border: `1px solid ${privacy.color}44`,
            }}>
              {privacy.label}
            </span>
            <span style={{ fontSize: 8, color: statusColor, letterSpacing: '0.1em' }}>
              ● {gathering.status.toUpperCase()}
            </span>
          </div>

          {/* Vibe tag */}
          {gathering.vibe_tag && (
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 6, fontStyle: 'italic' }}>
              "{gathering.vibe_tag}"
            </div>
          )}

          {/* Date + location */}
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <span>◷ {formatDate(gathering.starts_at)}</span>
            {gathering.location_label && <span>◈ {gathering.location_label}</span>}
          </div>
        </div>
      </div>
    </button>
  );
}
