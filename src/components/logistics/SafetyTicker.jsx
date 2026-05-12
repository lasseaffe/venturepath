import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchSafetyIncidents, SEVERITY_COLORS } from '../../utils/safetyEngine';
import SafetyPulse from './SafetyPulse';

const REFRESH_MS = 30_000;
const SEV_DOT = { red: '#ef4444', amber: '#F59E0B', green: '#22c55e' };

export default function SafetyTicker({ destinationId = 'default', center = [20.0, 0.0], zoom = 9 }) {
  const [incidents, setIncidents] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const intervalRef = useRef(null);

  async function load() {
    const data = await fetchSafetyIncidents(destinationId);
    setIncidents(data);
  }

  useEffect(() => {
    load();
    intervalRef.current = setInterval(load, REFRESH_MS);
    return () => clearInterval(intervalRef.current);
  }, [destinationId]);

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') setDrawerOpen(false); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const hasRed   = incidents.some(i => i.severity === 'red');
  const hasAmber = incidents.some(i => i.severity === 'amber');
  const level    = hasRed ? 'red' : hasAmber ? 'amber' : 'green';
  const topAlert = incidents.find(i => i.severity === level);

  const clearCategories = incidents
    .filter(i => i.severity === 'green')
    .map(i => i.type)
    .slice(0, 3);

  return (
    <>
      {/* Single-row ticker */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '6px 12px',
          background: 'var(--surface-raised)',
          borderBottom: '1px solid var(--border)',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10,
          minHeight: 32,
        }}
      >
        {/* Severity dot */}
        <span
          style={{
            width: 7, height: 7, borderRadius: '50%',
            background: SEV_DOT[level], flexShrink: 0,
          }}
        />
        {/* Top alert summary */}
        <span style={{ color: 'var(--text-primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {topAlert
            ? `${topAlert.type} ${topAlert.time} — ${topAlert.description}`
            : 'No active alerts'}
        </span>
        {/* Clear category pills */}
        {clearCategories.map(cat => (
          <span
            key={cat}
            style={{
              background: 'rgba(34,197,94,0.1)',
              border: '1px solid rgba(34,197,94,0.25)',
              borderRadius: 10, padding: '1px 7px',
              fontSize: 8, color: '#22c55e', flexShrink: 0,
            }}
          >
            {cat} ✓
          </span>
        ))}
        {/* Expand link */}
        <button
          onClick={() => setDrawerOpen(true)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#E67E22', fontFamily: 'inherit', fontSize: 10,
            padding: 0, flexShrink: 0, whiteSpace: 'nowrap',
          }}
        >
          Safety Pulse →
        </button>
      </div>

      {/* Slide-over drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
              style={{
                position: 'fixed', inset: 0,
                background: 'rgba(0,0,0,0.5)', zIndex: 400,
              }}
            />
            {/* Drawer panel */}
            <motion.div
              key="drawer"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.25 }}
              style={{
                position: 'fixed', top: 0, right: 0, bottom: 0,
                width: 420, background: 'var(--surface)',
                borderLeft: '1px solid var(--border)',
                zIndex: 401, overflowY: 'auto',
              }}
            >
              {/* Drawer header */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 16px', borderBottom: '1px solid var(--border)',
              }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: '0.1em', color: 'var(--text-secondary)' }}>
                  SAFETY PULSE
                </span>
                <button
                  onClick={() => setDrawerOpen(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 16 }}
                >
                  ×
                </button>
              </div>
              <SafetyPulse
                destinationId={destinationId}
                center={center}
                zoom={zoom}
                onClose={() => setDrawerOpen(false)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
