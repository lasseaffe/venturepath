import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const DIRECTION_ICONS = {
  flight: '↑',
  bus:    '→',
  foot:   '↗',
  boat:   '→',
};

const METRICS = ['KM LEFT', 'KM/H', 'ELEV', 'ETA'];

function etaString(durationH) {
  const totalMins = Math.round(durationH * 60);
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  if (h > 0) return `${h}h${m > 0 ? m + 'm' : ''}`;
  return `${m}m`;
}

export default function LegHud({ leg, onClose }) {
  const [activeMetric, setActiveMetric] = useState(0);

  if (!leg) return null;

  const metricValues = {
    'KM LEFT': `${leg.distanceKm?.toLocaleString() ?? '—'}`,
    'KM/H':    leg.mode === 'flight' ? '850' : leg.mode === 'bus' ? '80' : '5',
    'ELEV':    '+—',
    'ETA':     etaString(leg.durationH ?? 0),
  };

  function swipe(dir) {
    setActiveMetric(i => (i + dir + METRICS.length) % METRICS.length);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      style={{
        position: 'absolute',
        bottom: 16,
        left: 16,
        right: 16,
        zIndex: 900,
        background: 'rgba(14,16,18,0.92)',
        backdropFilter: 'blur(12px)',
        border: '1px solid #2a2f36',
        borderRadius: 4,
        overflow: 'hidden',
      }}
    >
      {/* Top instruction row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px' }}>
        <div
          style={{
            fontSize: 22,
            color: '#E67E22',
            minWidth: 28,
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          {DIRECTION_ICONS[leg.mode] ?? '→'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700, color: '#F2EDE8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {leg.from} → {leg.to}
          </div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#8A8680', letterSpacing: '0.04em', marginTop: 2 }}>
            {leg.mode?.toUpperCase()} · {leg.distanceKm?.toLocaleString()} km · {etaString(leg.durationH ?? 0)}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#484440',
            cursor: 'pointer',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 12,
            padding: '0 4px',
          }}
          title="Close HUD"
        >
          ✕
        </button>
      </div>

      {/* Metric strip */}
      <div
        style={{
          display: 'flex',
          borderTop: '1px solid #1a1f24',
        }}
      >
        {METRICS.map((key, i) => {
          const isActive = i === activeMetric;
          return (
            <button
              key={key}
              onClick={() => setActiveMetric(i)}
              style={{
                flex: 1,
                textAlign: 'center',
                padding: '8px 0',
                background: 'none',
                border: 'none',
                borderRight: i < METRICS.length - 1 ? '1px solid #1a1f24' : 'none',
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 16,
                  fontWeight: 700,
                  color: isActive ? '#F2EDE8' : '#484440',
                  transition: 'color 0.15s',
                }}
              >
                {metricValues[key]}
              </div>
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 8,
                  letterSpacing: '0.1em',
                  color: isActive ? '#E67E22' : '#484440',
                  marginTop: 2,
                  transition: 'color 0.15s',
                }}
              >
                {key}
              </div>
            </button>
          );
        })}
      </div>

      {/* Swipe hint */}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 10px 6px', borderTop: '1px solid #1a1f24' }}>
        <button
          onClick={() => swipe(-1)}
          style={{ background: 'none', border: 'none', color: '#484440', cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}
        >
          ‹ prev
        </button>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: '#2a2f36', letterSpacing: '0.08em', alignSelf: 'center' }}>
          TAP METRIC · SWIPE TO CYCLE
        </div>
        <button
          onClick={() => swipe(1)}
          style={{ background: 'none', border: 'none', color: '#484440', cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}
        >
          next ›
        </button>
      </div>
    </motion.div>
  );
}
