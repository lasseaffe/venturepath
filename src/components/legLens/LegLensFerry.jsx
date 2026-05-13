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

export function LegLensFerry({ leg, onHydrate }) {
  const meta = leg?.legMeta;
  useEffect(() => { if (!meta && onHydrate) onHydrate(leg?.id); }, [leg?.id]);

  if (!meta) {
    return <div style={{ fontFamily: 'JetBrains Mono, monospace', color: S, padding: 16 }}>Loading ferry intelligence…</div>;
  }

  return (
    <div style={{ fontFamily: 'JetBrains Mono, monospace', background: '#0E1012', color: S }}>
      <section style={{ padding: '12px 16px', borderBottom: '1px solid #1f1f1f' }}>
        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#666', marginBottom: 8 }}>Ferry Details</div>
        <Row label="Carrier" value={meta.carrier} color="#E67E22" />
        <Row label="Vessel" value={meta.vesselName} color="#E67E22" />
        <Row label="Cabin" value={meta.cabinRef} />
        {meta.vehicleCarried && <div style={{ fontSize: '0.8rem', color: '#F2A900', marginTop: 4 }}>🚗 Vehicle on board</div>}
        {meta.customsAtPort && <div style={{ fontSize: '0.8rem', color: '#F2A900', marginTop: 4 }}>🛂 Customs at arrival port</div>}
      </section>
      <section style={{ padding: '12px 16px' }}>
        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#666', marginBottom: 8 }}>Ports</div>
        <Row label="Departs" value={meta.departurePort} />
        <Row label="Arrives" value={meta.arrivalPort} />
      </section>
    </div>
  );
}
