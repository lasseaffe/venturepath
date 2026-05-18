// TACTICAL-CRITICAL: this component must work offline
// REQUIRES LOCATION USAGE DESCRIPTION IN APP STORE CONNECT

import { useState, useEffect, useMemo } from 'react';
import { postBeacon, listBeacons, subscribeToBeacons } from '../../lib/gatherings/api.js';
import { useAuth } from '../../context/AuthContext.jsx';

const S = {
  root: (live) => ({ background: live ? '#0a0500' : '#0d0d0d', border: `1px solid ${live ? '#F2A900' : '#222'}`, padding: '0.75rem', marginBottom: '1rem', fontFamily: 'JetBrains Mono, monospace' }),
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' },
  label: (live) => ({ color: live ? '#F2A900' : '#666', fontSize: '0.65rem', letterSpacing: '0.15em' }),
  dot: (live) => ({ width: 8, height: 8, borderRadius: '50%', background: live ? '#F2A900' : '#444', display: 'inline-block', marginRight: '0.4rem', animation: live ? 'pulse 1.2s infinite' : 'none' }),
  btnRow: { display: 'flex', gap: '0.4rem', flexWrap: 'wrap' },
  btn: (active, color) => ({ padding: '0.35rem 0.75rem', background: active ? color : 'transparent', border: `1px solid ${active ? color : '#444'}`, color: active ? '#fff' : '#888', fontSize: '0.65rem', letterSpacing: '0.08em', cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace', fontWeight: active ? 700 : 400 }),
  rosterRow: { display: 'flex', justify: 'space-between', padding: '0.25rem 0', fontSize: '0.7rem', color: '#D9C5B2' },
  kindColor: { arrived: '#27AE60', enroute: '#4A90D9', late: '#E67E22', sos: '#e74c3c' },
};

function getPhase(gathering) {
  if (!gathering?.starts_at) return 'STANDBY';
  const start = new Date(gathering.starts_at).getTime();
  const now   = Date.now();
  const end   = gathering.ends_at ? new Date(gathering.ends_at).getTime() : start + 3 * 3600_000;
  if (now > end) return 'ENDED';
  if (now >= start) return 'LIVE';
  if (start - now <= 3600_000) return 'IMMINENT';
  return 'STANDBY';
}

export default function Beacon({ gathering, isAttendee }) {
  const { profile } = useAuth();
  const phase  = getPhase(gathering);
  const isLive = phase === 'LIVE' || phase === 'IMMINENT';

  const [beacons, setBeacons] = useState([]);
  const [myKind, setMyKind]   = useState(null);

  useEffect(() => {
    if (!isLive) return;
    listBeacons(gathering.id).then(setBeacons);
    const ch = subscribeToBeacons(gathering.id, (b) => {
      setBeacons(prev => {
        const filtered = prev.filter(x => x.pioneer_id !== b.pioneer_id);
        return [...filtered, b];
      });
    });
    return () => ch.unsubscribe();
  }, [isLive, gathering.id]);

  // Latest beacon per pioneer
  const rosterBeacons = useMemo(() => {
    const map = {};
    beacons.forEach(b => { map[b.pioneer_id] = b; });
    return Object.values(map);
  }, [beacons]);

  async function broadcast(kind) {
    let coords = null;
    try {
      // REQUIRES LOCATION USAGE DESCRIPTION IN APP STORE CONNECT
      const pos = await new Promise((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 })
      );
      coords = [pos.coords.longitude, pos.coords.latitude];
    } catch (_) { /* GPS optional */ }
    setMyKind(kind);
    await postBeacon(gathering.id, kind, coords);
  }

  if (!isAttendee || phase === 'STANDBY' || phase === 'ENDED') return null;

  return (
    <div style={S.root(phase === 'LIVE')}>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
      <div style={S.header}>
        <div>
          <span style={S.dot(phase === 'LIVE')} />
          <span style={S.label(phase === 'LIVE')}>
            {phase === 'LIVE' ? 'BEACON — LIVE' : 'BEACON — IMMINENT'}
          </span>
        </div>
      </div>

      <div style={S.btnRow}>
        {[
          { kind: 'arrived',  label: '✓ ARRIVED',     color: '#27AE60' },
          { kind: 'enroute',  label: '→ EN ROUTE',    color: '#4A90D9' },
          { kind: 'late',     label: '⏱ RUNNING LATE', color: '#E67E22' },
          { kind: 'sos',      label: '⚡ SOS',          color: '#e74c3c' },
        ].map(({ kind, label, color }) => (
          <button key={kind} style={S.btn(myKind === kind, color)} onClick={() => broadcast(kind)}>
            {label}
          </button>
        ))}
      </div>

      {rosterBeacons.length > 0 && (
        <div style={{ marginTop: '0.75rem', borderTop: '1px solid #1a1a1a', paddingTop: '0.5rem' }}>
          {rosterBeacons.map(b => (
            <div key={b.pioneer_id} style={S.rosterRow}>
              <span>@{b.pioneer?.handle ?? b.pioneer_id?.slice(0, 8)}</span>
              <span style={{ color: S.kindColor[b.kind] ?? '#888' }}>{b.kind.toUpperCase()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
