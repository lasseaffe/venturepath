import { useEffect } from 'react';

const S = '#D9C5B2';
const SPRUCE = '#3A6B5C';

function Row({ icon, label, value, color = S }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', padding: '3px 0' }}>
      <span style={{ color: '#666' }}>{icon} {label}</span>
      <span style={{ color }}>{value}</span>
    </div>
  );
}

export function LegLensFoot({ leg, onHydrate }) {
  const meta = leg?.legMeta;
  const waypoints = leg?.waypoints ?? [];

  useEffect(() => {
    if (!meta && onHydrate) onHydrate(leg?.id);
  }, [leg?.id]);

  if (!meta) {
    return (
      <div style={{ fontFamily: 'JetBrains Mono, monospace', color: S, padding: 16 }}>
        Calculating trail intelligence…
      </div>
    );
  }

  const elev = meta.elevationProfile ?? {};
  const waterWps = waypoints.filter(w => w.category === 'water');
  const resupplyWps = waypoints.filter(w => w.category === 'resupply');

  return (
    <div style={{ fontFamily: 'JetBrains Mono, monospace', background: '#0E1012', color: S }}>
      <section style={{ padding: '12px 16px', borderBottom: '1px solid #1f1f1f' }}>
        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#666', marginBottom: 8 }}>Elevation</div>
        <Row icon="↑" label="Gain" value={`${(elev.gainM ?? 0).toLocaleString()} m`} color="#E67E22" />
        <Row icon="↓" label="Loss" value={`${(elev.lossM ?? 0).toLocaleString()} m`} />
        <Row icon="▲" label="Max" value={`${(elev.maxElevM ?? 0).toLocaleString()} m`} />
        <Row icon="▼" label="Min" value={`${(elev.minElevM ?? 0).toLocaleString()} m`} />
      </section>

      {(meta.permits?.length > 0 || meta.bearCountry) && (
        <section style={{ padding: '12px 16px', borderBottom: '1px solid #1f1f1f' }}>
          <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#666', marginBottom: 8 }}>Permits & Hazards</div>
          {meta.permits.map((p, i) => (
            <Row key={i} icon="📋" label={p.name} value={p.status ?? 'required'} color="#F2C94C" />
          ))}
          {meta.bearCountry && (
            <Row icon="🐻" label="Bear country" value="canister required" color="#dc2626" />
          )}
        </section>
      )}

      {waterWps.length > 0 && (
        <section style={{ padding: '12px 16px', borderBottom: '1px solid #1f1f1f' }}>
          <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#666', marginBottom: 8 }}>Water Sources</div>
          {waterWps.map(w => (
            <Row key={w.id} icon="💧" label={w.name} value={w.status} color={SPRUCE} />
          ))}
        </section>
      )}

      {resupplyWps.length > 0 && (
        <section style={{ padding: '12px 16px', borderBottom: '1px solid #1f1f1f' }}>
          <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#666', marginBottom: 8 }}>Resupply</div>
          {resupplyWps.map(w => (
            <Row key={w.id} icon="🎒" label={w.name} value={w.status} />
          ))}
        </section>
      )}

      <section style={{ padding: '12px 16px' }}>
        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#666', marginBottom: 8 }}>Trail File</div>
        {meta.gpxFileId ? (
          <div style={{ fontSize: '0.82rem', color: SPRUCE }}>GPX linked ✓</div>
        ) : (
          <button
            style={{ fontSize: '0.8rem', color: '#E67E22', background: 'transparent', border: '1px solid #E67E22', borderRadius: 4, padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit' }}
            onClick={() => document.getElementById(`gpx-upload-${leg.id}`)?.click()}
            aria-label="Upload GPX file"
          >
            Upload GPX
          </button>
        )}
        <input id={`gpx-upload-${leg.id}`} type="file" accept=".gpx" style={{ display: 'none' }} aria-hidden="true" />
      </section>
    </div>
  );
}
