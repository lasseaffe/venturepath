// src/components/nearby/NearbyResultCard.jsx

function ratingStars(rating) {
  if (rating === null) return '—';
  const filled = Math.round(rating); // 0–3
  return '★'.repeat(filled) + '☆'.repeat(3 - filled);
}

export default function NearbyResultCard({ place, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect?.(place)}
      className="w-full text-left p-2.5 rounded-lg transition-colors"
      style={{
        background: 'var(--surface-raised)',
        border: '1px solid var(--border)',
        cursor: onSelect ? 'pointer' : 'default',
      }}
      onMouseEnter={e => { if (onSelect) e.currentTarget.style.borderColor = 'var(--accent)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className="text-sm font-medium leading-snug"
          style={{ color: 'var(--text-primary)' }}
        >
          {place.name}
        </span>
        <span
          className="shrink-0 text-xs font-mono"
          style={{ color: '#E67E22' }}
        >
          {ratingStars(place.rating)}
        </span>
      </div>
      <div className="flex items-center gap-2 mt-1">
        <span
          className="text-[10px] px-1.5 py-0.5 rounded font-mono capitalize"
          style={{ background: 'var(--surface)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
        >
          {place.type}
        </span>
        {place.address && (
          <span className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>
            {place.address}
          </span>
        )}
      </div>
    </button>
  );
}
