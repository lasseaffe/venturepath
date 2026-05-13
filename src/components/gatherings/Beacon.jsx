// VenturePath · Phase 3 · Live Beacon (day-of check-in + state broadcast)
// TACTICAL-CRITICAL: this component must work offline
// REQUIRES LOCATION USAGE DESCRIPTION IN APP STORE CONNECT

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { postBeacon, listBeacons, subscribeToBeacons } from '../../lib/gatherings/api';

function getBeaconState(startsAt) {
  if (!startsAt) return 'STANDBY';
  const now = Date.now();
  const start = new Date(startsAt).getTime();
  const diff = start - now;
  if (diff < 0)           return 'LIVE';
  if (diff < 3_600_000)   return 'IMMINENT';
  return 'STANDBY';
}

function relativeTime(startsAt) {
  if (!startsAt) return '—';
  const diff = new Date(startsAt).getTime() - Date.now();
  if (diff < 0) return 'underway';
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  if (h > 24) return `${Math.ceil(h / 24)}d`;
  if (h > 0)  return `${h}h ${m}m`;
  return `${m}m`;
}

const STATE_COLORS = {
  LIVE:     '#F2C94C',
  IMMINENT: '#E67E22',
  STANDBY:  'rgba(255,255,255,0.25)',
};

const KIND_OPTIONS = [
  { kind: 'enroute', label: 'EN ROUTE',  color: '#F2C94C' },
  { kind: 'arrived', label: 'ARRIVED',   color: '#4ade80' },
  { kind: 'late',    label: 'RUNNING LATE', color: '#E67E22' },
];

function shortTime(iso) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export default function Beacon({ gathering }) {
  const { architect } = useAuth();
  const state = useMemo(() => getBeaconState(gathering?.starts_at), [gathering?.starts_at]);
  const stateColor = STATE_COLORS[state];
  const relTime = useMemo(() => relativeTime(gathering?.starts_at), [gathering?.starts_at]);

  const [beacons, setBeacons] = useState([]);
  const [shareCoords, setShareCoords] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const liveModeUnlocked = state !== 'STANDBY';

  // Load and subscribe to beacons when live/imminent
  useEffect(() => {
    if (!liveModeUnlocked || !gathering?.id) return;
    listBeacons(gathering.id).then(({ data }) => setBeacons(data ?? []));
    const channel = subscribeToBeacons(gathering.id, {
      onInsert: (b) => setBeacons(prev => [b, ...prev]),
    });
    return () => channel.unsubscribe();
  }, [gathering?.id, liveModeUnlocked]);

  // Latest beacon per pioneer for the roster display
  const latestPerPioneer = useMemo(() => {
    const map = new Map();
    for (const b of beacons) {
      if (!map.has(b.pioneer_id)) map.set(b.pioneer_id, b);
    }
    return Array.from(map.values());
  }, [beacons]);

  const myLatest = latestPerPioneer.find(b => b.pioneer_id === architect?.id);

  async function broadcast(kind) {
    if (!architect?.id || !gathering?.id) return;
    setSending(true);
    setError(null);

    let coords = null;
    if (shareCoords && navigator.geolocation) {
      try {
        const pos = await new Promise((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
        );
        coords = [pos.coords.longitude, pos.coords.latitude];
      } catch {
        // Silently continue without coords on permission denial / timeout
      }
    }

    const { error: err } = await postBeacon(gathering.id, architect.id, kind, { coords });
    setSending(false);
    if (err) setError(err.message);
  }

  return (
    <div style={{
      padding: '12px 14px',
      background: state === 'LIVE' ? 'rgba(242,201,76,0.06)' : 'rgba(255,255,255,0.03)',
      border: `1px solid ${stateColor}44`,
      fontFamily: "'JetBrains Mono', monospace",
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: liveModeUnlocked ? 10 : 0 }}>
        <div style={{ position: 'relative', width: 10, height: 10, flexShrink: 0 }}>
          <div style={{
            width: 10, height: 10, borderRadius: '50%',
            background: stateColor,
            ...(state === 'LIVE' ? { animation: 'beacon-pulse 1.4s ease-in-out infinite' } : {}),
          }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: stateColor, letterSpacing: '0.12em', fontWeight: 700 }}>
            BEACON · {state}
          </div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
            {state === 'LIVE'
              ? 'Gathering underway — check in or signal status'
              : state === 'IMMINENT'
                ? `Starting in ${relTime} — live broadcast available`
                : `Starts in ${relTime}`}
          </div>
        </div>
      </div>

      {/* Live controls */}
      {liveModeUnlocked && architect && (
        <>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
            {KIND_OPTIONS.map(opt => {
              const isMine = myLatest?.kind === opt.kind;
              return (
                <button
                  key={opt.kind}
                  onClick={() => broadcast(opt.kind)}
                  disabled={sending}
                  style={{
                    background: isMine ? opt.color + '33' : opt.color + '11',
                    color: opt.color,
                    border: `1px solid ${opt.color}${isMine ? 'aa' : '44'}`,
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase',
                    padding: '5px 10px', cursor: 'pointer', fontWeight: isMine ? 700 : 400,
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          {/* Optional coords share */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 9, color: 'rgba(255,255,255,0.45)', cursor: 'pointer', letterSpacing: '0.08em', marginBottom: error ? 6 : 0 }}>
            <input
              type="checkbox"
              checked={shareCoords}
              onChange={e => setShareCoords(e.target.checked)}
              style={{ accentColor: '#E67E22' }}
            />
            Share my coordinates with this broadcast
          </label>

          {error && (
            <div style={{ fontSize: 10, color: '#ef4444', marginTop: 4 }}>{error}</div>
          )}

          {/* Latest per pioneer */}
          {latestPerPioneer.length > 0 && (
            <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.14em', marginBottom: 4 }}>
                LIVE ROSTER · {latestPerPioneer.length}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {latestPerPioneer.map(b => {
                  const opt = KIND_OPTIONS.find(o => o.kind === b.kind);
                  const color = opt?.color ?? '#ef4444';
                  return (
                    <div key={b.id} style={{ fontSize: 9, padding: '3px 6px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${color}33`, color: 'rgba(255,255,255,0.7)' }}>
                      @{b.profile?.handle ?? '…'} <span style={{ color }}>· {opt?.label ?? b.kind.toUpperCase()}</span> <span style={{ color: 'rgba(255,255,255,0.3)' }}>· {shortTime(b.created_at)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      <style>{`
        @keyframes beacon-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.4); }
        }
      `}</style>
    </div>
  );
}
