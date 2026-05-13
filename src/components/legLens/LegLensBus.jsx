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

export function LegLensBus({ leg, onHydrate }) {
  const meta = leg?.legMeta;
  useEffect(() => { if (!meta && onHydrate) onHydrate(leg?.id); }, [leg?.id]);

  if (!meta) {
    return <div style={{ fontFamily: 'JetBrains Mono, monospace', color: S, padding: 16 }}>Loading bus intelligence…</div>;
  }

  return (
    <div style={{ fontFamily: 'JetBrains Mono, monospace', background: '#0E1012', color: S }}>
      <section style={{ padding: '12px 16px', borderBottom: '1px solid #1f1f1f' }}>
        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#666', marginBottom: 8 }}>Bus Details</div>
        <Row label="Carrier" value={meta.carrier} color="#E67E22" />
        <Row label="Route" value={meta.routeNumber} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', padding: '3px 0' }}>
          <span style={{ color: '#666' }}>Seat</span>
          <data style={{ color: S }}>{meta.seat}</data>
        </div>
        <Row label="Restroom breaks" value={meta.restroomBreaks} />
      </section>
      <section style={{ padding: '12px 16px' }}>
        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#666', marginBottom: 8 }}>Stops</div>
        <Row label="Departs" value={meta.departureStop} />
        <Row label="Arrives" value={meta.arrivalStop} />
      </section>
    </div>
  );
}
