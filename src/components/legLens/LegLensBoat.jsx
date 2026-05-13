import { useEffect } from 'react';

const S = '#D9C5B2';

function Row({ label, value, color = S }) {
  if (value == null || value === '') return null;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', padding: '3px 0' }}>
      <span style={{ color: '#666' }}>{label}</span>
      <span style={{ color }}>{String(value)}</span>
    </div>
  );
}

export function LegLensBoat({ leg, onHydrate }) {
  const meta = leg?.legMeta;
  useEffect(() => { if (!meta && onHydrate) onHydrate(leg?.id); }, [leg?.id]);

  if (!meta) {
    return <div style={{ fontFamily: 'JetBrains Mono, monospace', color: S, padding: 16 }}>Loading boat intelligence…</div>;
  }

  return (
    <div style={{ fontFamily: 'JetBrains Mono, monospace', background: '#0E1012', color: S }}>
      <section style={{ padding: '12px 16px', borderBottom: '1px solid #1f1f1f' }}>
        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#666', marginBottom: 8 }}>Boat Details</div>
        <Row label="Marina" value={meta.marina} color="#E67E22" />
        <Row label="Port fees" value={meta.portFees != null ? `€${meta.portFees}` : null} />
        <Row label="Weather window" value={meta.weatherWindowDate} />
      </section>
      {meta.anchorages?.length > 0 && (
        <section style={{ padding: '12px 16px' }}>
          <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#666', marginBottom: 8 }}>Anchorages</div>
          {meta.anchorages.map((a, i) => (
            <div key={i} style={{ fontSize: '0.82rem', padding: '2px 0' }}>⚓ {a}</div>
          ))}
        </section>
      )}
    </div>
  );
}
