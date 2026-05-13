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

export function LegLensFlight({ leg, onHydrate }) {
  const meta = leg?.legMeta;
  useEffect(() => { if (!meta && onHydrate) onHydrate(leg?.id); }, [leg?.id]);

  if (!meta) {
    return <div style={{ fontFamily: 'JetBrains Mono, monospace', color: S, padding: 16 }}>Loading flight intelligence…</div>;
  }

  return (
    <div style={{ fontFamily: 'JetBrains Mono, monospace', background: '#0E1012', color: S }}>
      <section style={{ padding: '12px 16px', borderBottom: '1px solid #1f1f1f' }}>
        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#666', marginBottom: 8 }}>Flight Details</div>
        <Row label="Carrier" value={meta.carrier} color="#E67E22" />
        <Row label="Flight" value={meta.flightNumber} color="#E67E22" />
        <Row label="Seat" value={meta.seat} />
        <Row label="Baggage" value={meta.baggageAllowanceKg != null ? `${meta.baggageAllowanceKg} kg` : null} />
      </section>
      <section style={{ padding: '12px 16px', borderBottom: '1px solid #1f1f1f' }}>
        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#666', marginBottom: 8 }}>Terminals & Gates</div>
        <Row label="Dep. terminal" value={meta.departureTerminal} />
        <Row label="Dep. gate" value={meta.departureGate} />
        <Row label="Arr. terminal" value={meta.arrivalTerminal} />
        <Row label="Arr. gate" value={meta.arrivalGate} />
      </section>
      {meta.layovers?.length > 0 && (
        <section style={{ padding: '12px 16px', borderBottom: '1px solid #1f1f1f' }}>
          <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#666', marginBottom: 8 }}>Layovers</div>
          {meta.layovers.map((l, i) => (
            <div key={i} style={{ fontSize: '0.82rem', padding: '2px 0' }}>⏳ {l.airport} — {l.durationMin} min</div>
          ))}
        </section>
      )}
      {meta.visaRequired && (
        <section style={{ padding: '12px 16px' }}>
          <div style={{ color: '#F2A900', fontSize: '0.82rem' }}>⚠ Visa required</div>
        </section>
      )}
    </div>
  );
}
