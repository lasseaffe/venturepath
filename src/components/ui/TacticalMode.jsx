// TACTICAL-CRITICAL: this component must work offline
import { useState, useEffect } from 'react';
import { useTripStore } from '../../store/useTripStore';
import { useTheme } from '../../context/ThemeContext';

const CACHED_MESSAGES = [
  'Scout: River crossing waist-deep as of 07:30',
  'Lead: Summit bid confirmed for 05:00',
  'Medic: Full first aid kit in pack',
];

function SignalBars({ strength = 4 }) {
  return (
    <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 20 }}>
      {[8, 12, 16, 20].map((h, i) => (
        <div key={i} style={{
          width: 4, height: h,
          background: i < strength ? '#F2A900' : '#3a3a3a',
          borderRadius: 1
        }} />
      ))}
    </div>
  );
}

export default function TacticalMode({ onExit }) {
  const { trip, legs } = useTripStore();
  const { setTheme } = useTheme();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    setTheme('tactical');
    return () => setTheme('default');
  }, [setTheme]);

  const [coords] = useState({ lat: -50.9423, lng: -73.4068 });
  const [freshness] = useState('14 min ago');
  const [sosReady, setSosReady] = useState(false);
  const [sosCopied, setSosCopied] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const activeLeg = legs.find(l => l.status === 'pending') ?? legs[0];

  const sosText = [
    `[SOS] VenturePath Emergency Beacon`,
    `Time: ${time.toISOString()}`,
    `Coords: ${coords.lat}, ${coords.lng}`,
    `Trip: ${trip.name}`,
    `Active Leg: ${activeLeg?.from} → ${activeLeg?.to}`,
    `Status: EMERGENCY — REQUIRES ASSISTANCE`,
  ].join('\n');

  const handleSOS = () => {
    setSosReady(true);
    navigator.clipboard?.writeText(sosText).then(() => setSosCopied(true));
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
  };

  const mono = { fontFamily: "'JetBrains Mono', monospace" };

  return (
    <div
      data-tour="tactical"
      data-beacon="tactical-mode"
      style={{
        minHeight: '100vh',
        background: '#0A0A0A',
        color: '#F2A900',
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        ...mono,
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <SignalBars strength={4} />
        <span style={{ color: '#F2A900', fontWeight: 'bold', letterSpacing: '0.12em', fontSize: 11 }}>GPS LOCKED</span>
        <span style={{ color: '#F2A900', fontSize: 20, fontWeight: 'bold', marginLeft: 'auto' }}>
          {time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
        <span style={{ background: '#1a1a1a', border: '1px solid #3a3a3a', borderRadius: 3, padding: '2px 6px', fontSize: 9, color: '#888', letterSpacing: '0.06em' }}>
          {freshness}
        </span>
      </div>

      {/* Coordinate strip */}
      <div style={{ background: '#F2A900', color: '#0A0A0A', fontWeight: 'bold', padding: '8px 12px', borderRadius: 3, fontSize: 13, letterSpacing: '0.04em', marginBottom: 12, ...mono }}>
        −{Math.abs(coords.lat)}° S, {Math.abs(coords.lng)}° W &nbsp; ↗ 042° &nbsp; ▲ 1,240m
      </div>

      {/* Current objective */}
      <div style={{ borderLeft: '2px solid #2a2a2a', paddingLeft: 10, marginBottom: 12, opacity: activeLeg ? 1 : 0.4 }}>
        <div style={{ fontSize: 9, color: '#666', letterSpacing: '0.1em', marginBottom: 4 }}>CURRENT OBJECTIVE</div>
        {activeLeg ? (
          <>
            <div style={{ fontWeight: 'bold', fontSize: 14 }}>{activeLeg.from?.label ?? activeLeg.from} → {activeLeg.to?.label ?? activeLeg.to}</div>
            <div style={{ fontSize: 11, color: '#888', marginTop: 3 }}>{activeLeg.distanceKm} km · {activeLeg.durationH}h estimated</div>
          </>
        ) : (
          <div style={{ fontSize: 12, color: '#666' }}>No active leg</div>
        )}
      </div>

      {/* Squad comms */}
      <div style={{ flex: 1, marginBottom: 16 }}>
        <div style={{ fontSize: 9, color: '#666', letterSpacing: '0.1em', marginBottom: 8 }}>SQUAD COMMS — CACHED</div>
        {CACHED_MESSAGES.map((m, i) => (
          <div key={i} style={{ fontSize: 11, color: '#ccc', marginBottom: 6 }}>│ {m}</div>
        ))}
      </div>

      {/* SOS section */}
      <div>
        {sosReady && (
          <div style={{ padding: 12, border: '1px solid #3a3a3a', borderRadius: 4, fontSize: 11, whiteSpace: 'pre-wrap', color: '#F2A900', marginBottom: 10, ...mono }}>
            {sosText}
            {sosCopied && (
              <div style={{ marginTop: 8, color: '#4ade80' }}>✓ Copied to clipboard — paste into satellite messenger</div>
            )}
          </div>
        )}
        <button
          onClick={handleSOS}
          style={{ width: '100%', padding: '14px', background: '#7f1d1d', border: '2px solid #ef4444', color: '#fca5a5', fontWeight: 'bold', letterSpacing: '0.15em', fontSize: 13, borderRadius: 4, cursor: 'pointer', ...mono }}
        >
          ⚠ SOS EMERGENCY BEACON
        </button>
        <button
          onClick={onExit}
          style={{ width: '100%', marginTop: 8, padding: '8px', background: 'transparent', border: '1px solid #2a2a2a', color: '#555', fontSize: 10, letterSpacing: '0.1em', borderRadius: 4, cursor: 'pointer', ...mono }}
        >
          EXIT TACTICAL MODE
        </button>
      </div>
    </div>
  );
}
