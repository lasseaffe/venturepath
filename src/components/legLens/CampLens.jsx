// src/components/legLens/CampLens.jsx
const SPRUCE = '#3A6B5C';

export function CampLens({ stay, campMeta = {} }) {
  const {
    siteType,
    bearCountry,
    bearStorage,
    fireRules = {},
    waterSource = {},
    sanitation,
    permits = [],
    alternates = [],
  } = campMeta;

  return (
    <div style={{ fontFamily: 'JetBrains Mono, monospace', background: '#0E1012', color: '#D9C5B2', borderTop: `2px solid ${SPRUCE}` }}>
      <div style={{ padding: '10px 16px', background: 'rgba(58,107,92,0.12)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: '1rem' }}>🏕</span>
        <span style={{ color: SPRUCE, fontWeight: 600, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Camp Intelligence — {stay?.name ?? 'Camp'}
        </span>
        {stay?.kind === 'wild' && (
          <span style={{ marginLeft: 'auto', fontSize: '0.65rem', color: '#F2A900', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Wild Pitch
          </span>
        )}
      </div>

      <div style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {permits.length > 0 && (
          <Row icon="📋" label="Permits" value={permits.map(p => p.name ?? p).join(', ')} color="#F2A900" />
        )}
        {permits.length === 0 && (
          <Row icon="📋" label="Permits" value="None required" color={SPRUCE} />
        )}

        <Row
          icon={fireRules.permitted === false ? '🔥🚫' : '🔥'}
          label="Fire"
          value={fireRules.permitted === false ? (fireRules.stoveOnly ? 'Stove only' : 'Fire ban') : 'Permitted'}
          color={fireRules.permitted === false ? '#dc2626' : SPRUCE}
        />

        <Row
          icon="💧"
          label="Water"
          value={waterSource.type
            ? `${waterSource.type}${waterSource.treatRequired ? ' — treat required' : ''}${waterSource.distanceM ? ` (${waterSource.distanceM}m)` : ''}`
            : 'Unknown — carry own'}
          color={waterSource.treatRequired ? '#F2A900' : SPRUCE}
        />

        {bearCountry && (
          <Row
            icon="🐻"
            label="Bear country"
            value={bearStorage ?? 'canister-required'}
            color="#F2A900"
          />
        )}

        {sanitation && <Row icon="🚽" label="Sanitation" value={sanitation} color="#D9C5B2" />}

        {alternates.length > 0 && (
          <Row icon="↔" label="Alternates" value={`${alternates.length} backup site${alternates.length > 1 ? 's' : ''}`} color="#D9C5B2" />
        )}
      </div>
    </div>
  );
}

function Row({ icon, label, value, color }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: '0.78rem' }}>
      <span style={{ flexShrink: 0, width: 18 }}>{icon}</span>
      <span style={{ color: '#666', minWidth: 70, flexShrink: 0 }}>{label}</span>
      <span style={{ color }}>{value}</span>
    </div>
  );
}
