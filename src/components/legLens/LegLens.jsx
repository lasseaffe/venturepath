import { LegLensCar } from './LegLensCar.jsx';
import { LegLensFoot } from './LegLensFoot.jsx';

const MODE_LABELS = {
  car: 'Drive',
  foot: 'On Foot',
  flight: 'Flight',
  train: 'Train',
  bus: 'Bus',
  ferry: 'Ferry',
  boat: 'Boat',
};

function LegLensPlaceholder({ mode }) {
  return (
    <div style={{ fontFamily: 'JetBrains Mono, monospace', color: '#D9C5B2', padding: '24px 16px' }}>
      <div style={{ color: '#E67E22', fontWeight: 600, marginBottom: 8 }}>
        {MODE_LABELS[mode] ?? mode} Leg Intelligence
      </div>
      <div style={{ fontSize: '0.85rem', lineHeight: 1.6 }}>
        Mode-specific intelligence for {MODE_LABELS[mode] ?? mode} legs arrives in a future Phase.
        Route details, carrier info, and stop planning will appear here once available.
      </div>
    </div>
  );
}

export function LegLens({
  leg,
  nextStay,
  onVariantSelect,
  onWaypointConfirm,
  onWaypointBook,
  onWaypointDismiss,
  onHydrate,
  onClose,
}) {
  if (!leg) return null;

  return (
    <aside
      aria-label="Leg Lens"
      style={{
        background: '#0E1012',
        borderLeft: '1px solid #1f1f1f',
        width: 320,
        minHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'JetBrains Mono, monospace',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #1f1f1f' }}>
        <span style={{ flex: 1, color: '#fff', fontWeight: 600 }}>
          Leg Lens — {MODE_LABELS[leg.mode] ?? leg.mode}
        </span>
        <button
          onClick={onClose}
          aria-label="Close Leg Lens"
          style={{ background: 'transparent', border: 'none', color: '#666', cursor: 'pointer', fontSize: '1.2rem' }}
        >
          ×
        </button>
      </div>

      {/* Mode-specific body */}
      {leg.mode === 'car' ? (
        <LegLensCar
          leg={leg}
          nextStay={nextStay}
          onVariantSelect={onVariantSelect}
          onWaypointConfirm={onWaypointConfirm}
          onWaypointBook={onWaypointBook}
          onWaypointDismiss={onWaypointDismiss}
          onHydrate={onHydrate}
        />
      ) : leg.mode === 'foot' ? (
        <LegLensFoot leg={leg} onHydrate={onHydrate} />
      ) : (
        <LegLensPlaceholder mode={leg.mode} />
      )}
    </aside>
  );
}
