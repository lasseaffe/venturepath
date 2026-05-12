// src/components/dashboard/HeroStrip.jsx
import { useTripStore } from '../../store/useTripStore';

export default function HeroStrip({ onEnterTrip }) {
  const { trip, legs } = useTripStore();
  const totalKm = legs.reduce((s, l) => s + (l.distanceKm ?? 0), 0);

  const STATUS_COLORS = {
    PLANNING: 'rgba(230,126,34,0.9)',
    ACTIVE:   'rgba(34,197,94,0.9)',
    COMPLETE: 'rgba(148,163,184,0.7)',
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 24,
      padding: '20px 32px',
      background: 'rgba(0,0,0,0.35)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid rgba(255,255,255,0.08)',
      minHeight: 100,
    }}>
      {/* Left: trip identity */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 9,
          letterSpacing: '0.15em', color: 'rgba(255,255,255,0.4)',
          textTransform: 'uppercase', marginBottom: 4,
        }}>
          Your Expedition
        </div>
        <h1 style={{
          fontFamily: 'Playfair Display, serif',
          fontSize: 'clamp(1.25rem, 3vw, 2rem)',
          color: '#fff', margin: 0, lineHeight: 1.1,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {trip.name}
        </h1>
        <p style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
          color: 'rgba(255,255,255,0.5)', margin: '4px 0 0',
        }}>
          {trip.destination} · {trip.days} days · {totalKm > 0 ? `${totalKm.toLocaleString()} km` : '0 km'}
        </p>
      </div>

      {/* Centre: dates */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 9, fontFamily: 'JetBrains Mono, monospace', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Departure</div>
          <div style={{ fontSize: 13, color: '#fff', fontFamily: 'JetBrains Mono, monospace', marginTop: 2 }}>{trip.startDate}</div>
        </div>
        <span style={{ color: '#E67E22', fontSize: 16 }}>→</span>
        <div>
          <div style={{ fontSize: 9, fontFamily: 'JetBrains Mono, monospace', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Return</div>
          <div style={{ fontSize: 13, color: '#fff', fontFamily: 'JetBrains Mono, monospace', marginTop: 2 }}>{trip.endDate}</div>
        </div>
      </div>

      {/* Status pill */}
      <div style={{
        padding: '4px 12px', borderRadius: 4, flexShrink: 0,
        background: STATUS_COLORS[trip.status] ?? STATUS_COLORS.PLANNING,
        fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
        letterSpacing: '0.12em', color: '#fff', fontWeight: 700,
        textTransform: 'uppercase',
      }}>
        {trip.status ?? 'PLANNING'}
      </div>

      {/* CTA */}
      <button
        onClick={onEnterTrip}
        style={{
          flexShrink: 0,
          padding: '10px 24px',
          background: '#E67E22',
          border: 'none', borderRadius: 9999,
          color: '#fff', fontWeight: 600, fontSize: 14,
          cursor: 'pointer',
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = '#d4711e'}
        onMouseLeave={e => e.currentTarget.style.background = '#E67E22'}
      >
        Start Planning →
      </button>
    </div>
  );
}
