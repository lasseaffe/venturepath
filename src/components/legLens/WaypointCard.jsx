import { getCategoryStyle } from '../../utils/legIntelligence/waypointCategories.js';

export function WaypointCard({ waypoint, onConfirm, onBook, onDismiss }) {
  const { color, icon, label } = getCategoryStyle(waypoint.category);

  return (
    <div
      style={{
        borderLeft: `4px solid ${color}`,
        background: '#0E1012',
        fontFamily: 'JetBrains Mono, monospace',
        padding: '12px 16px',
        borderRadius: '4px',
        color: '#D9C5B2',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>{icon}</span>
        <strong style={{ color: '#fff' }}>{waypoint.name}</strong>
        <span style={{ marginLeft: 'auto', fontSize: '0.75rem' }}>{label}</span>
      </div>
      <div style={{ display: 'flex', gap: 16, marginTop: 6, fontSize: '0.8rem' }}>
        {waypoint.kmFromStart != null && <span>{waypoint.kmFromStart} km</span>}
        {waypoint.estCost != null && waypoint.estCost > 0 && (
          <span style={{ color: color }}>€{waypoint.estCost.toFixed(2)}</span>
        )}
        <span style={{ marginLeft: 'auto', textTransform: 'uppercase', fontSize: '0.7rem' }}>
          {waypoint.status}
        </span>
      </div>
      {waypoint.notes && <p style={{ marginTop: 4, fontSize: '0.75rem' }}>{waypoint.notes}</p>}
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <button
          onClick={() => onConfirm(waypoint.id)}
          style={{
            background: '#E67E22',
            color: '#0E1012',
            border: 'none',
            padding: '4px 12px',
            borderRadius: 3,
            fontFamily: 'inherit',
            cursor: 'pointer',
          }}
        >
          Confirm
        </button>
        <button
          onClick={() => onBook(waypoint.id)}
          disabled={!!waypoint.bookingRef}
          style={{
            background: '#1a1a1a',
            color: '#D9C5B2',
            border: '1px solid #333',
            padding: '4px 12px',
            borderRadius: 3,
            fontFamily: 'inherit',
            cursor: 'pointer',
          }}
        >
          Book
        </button>
        <button
          onClick={() => onDismiss(waypoint.id)}
          style={{
            background: 'transparent',
            color: '#666',
            border: 'none',
            padding: '4px 12px',
            fontFamily: 'inherit',
            cursor: 'pointer',
          }}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
