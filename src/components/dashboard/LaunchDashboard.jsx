import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useTripStore } from '../../store/useTripStore';
import { useSquadGear } from '../../context/SquadGearContext';
import { useSquadSync } from '../../hooks/useSquadSync';
import { useTheme } from '../../context/ThemeContext';
import { useLabels } from '../../hooks/useLabels';

const HERO_IMAGES = {
  'Torres del Paine, Chile': 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1600&q=80',
  default: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1600&q=80',
};

const ACTIVITY_FEED = [
  'Scout updated Packing Manifest',
  'Weather alert: High winds on Leg 3',
  'Medic confirmed crampons in manifest',
  'Lead cloned Torres del Paine Pro-Path',
];

export default function LaunchDashboard({ onEnterTrip, onOpenVault, onOpenChat, onOpenProfile }) {
  const { trip, legs } = useTripStore();
  const { members, weights } = useSquadGear();
  const { syncReady } = useSquadSync();
  const { theme } = useTheme();
  const labels = useLabels();
  const router = useRouter();
  const [ticker, setTicker] = useState(0);

  const heroImg = HERO_IMAGES[trip.destination] ?? HERO_IMAGES.default;
  const totalKm = legs.reduce((s, l) => s + l.distanceKm, 0);
  const isTactical = theme === 'tactical';

  useEffect(() => {
    const id = setInterval(() => setTicker(t => (t + 1) % ACTIVITY_FEED.length), 3500);
    return () => clearInterval(id);
  }, []);

  const heroGradient = isTactical
    ? 'linear-gradient(to right, #0F1115 0%, rgba(15,17,21,0.80) 50%, rgba(15,17,21,0.40) 100%)'
    : 'linear-gradient(to right, #B4844A 0%, rgba(180,132,74,0.70) 45%, rgba(180,132,74,0.10) 100%)';

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: 'var(--bg)', color: 'var(--text-primary)' }}>
      {/* Hero background */}
      <div className="absolute inset-0 z-0">
        <div
          className="absolute inset-0 animate-ken-burns bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImg})` }}
        />
        <div className="absolute inset-0" style={{ background: heroGradient }} />
      </div>

      {/* Activity ticker */}
      <div
        className="relative z-10 border-b px-6 py-2 flex items-center gap-3"
        style={{
          borderColor: isTactical ? 'rgba(255,255,255,0.1)' : 'rgba(180,132,74,0.3)',
          background: isTactical ? 'rgba(0,0,0,0.3)' : 'rgba(180,132,74,0.15)',
          backdropFilter: 'blur(8px)',
        }}
      >
        {isTactical && (
          <span className="text-[10px] font-mono tracking-widest" style={{ color: 'var(--status-warn)' }}>LIVE</span>
        )}
        <div
          className="w-2 h-2 rounded-full animate-pulse shrink-0"
          style={{ background: isTactical ? 'var(--status-warn)' : 'var(--accent)' }}
        />
        <motion.span
          key={ticker}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="text-xs"
          style={{
            color: isTactical ? '#cbd5e1' : 'rgba(255,255,255,0.85)',
            fontFamily: isTactical ? 'monospace' : 'inherit',
          }}
        >
          {ACTIVITY_FEED[ticker]}
        </motion.span>
        <span className="ml-auto flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full" style={{ background: syncReady ? 'var(--status-ok)' : 'var(--status-warn)' }} />
          <span style={{
            color: syncReady ? 'var(--status-ok)' : 'var(--status-warn)',
            fontFamily: isTactical ? 'monospace' : 'inherit',
            fontSize: isTactical ? '10px' : '11px',
            letterSpacing: isTactical ? '0.1em' : 'normal',
          }}>
            {syncReady
              ? (isTactical ? 'SQUAD SYNCED' : 'Synced')
              : (isTactical ? 'SYNCING…' : 'Syncing…')
            }
          </span>
        </span>
      </div>

      {/* Main layout */}
      <div className="relative z-10 flex min-h-[calc(100vh-40px)]">
        {/* Left panel */}
        <motion.div
          initial={{ x: -60, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="w-80 shrink-0 p-6 space-y-5 border-r"
          style={{
            borderColor: isTactical ? 'rgba(255,255,255,0.1)' : 'rgba(180,132,74,0.25)',
            background: isTactical ? 'rgba(0,0,0,0.2)' : 'rgba(180,132,74,0.12)',
            backdropFilter: 'blur(12px)',
          }}
        >
          {/* Brand */}
          <div className="flex items-center gap-3 mb-2">
            {isTactical && (
              <div style={{ width: 14, height: 14, border: '1px solid var(--cta)', transform: 'rotate(45deg)', flexShrink: 0 }} />
            )}
            <span
              className={`font-bold text-sm ${isTactical ? 'font-mono tracking-[0.2em] uppercase' : 'font-editorial text-lg'}`}
              style={{ color: '#fff' }}
            >
              VenturePath
            </span>
          </div>

          {/* Profile mini-card */}
          <button
            onClick={onOpenProfile}
            className="glass-panel p-4 w-full text-left transition-colors group"
          >
            <div className="label-tag mb-2">{labels.profile}</div>
            <div className="font-editorial text-lg" style={{ color: '#fff' }}>
              {isTactical ? 'Level 7 Pioneer' : 'Level 7 Traveler'}
            </div>
            <div className="flex justify-between mt-2 text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
              <span>$142 earnings</span>
              <span style={{ color: 'var(--accent)' }}>View →</span>
            </div>
          </button>

          {/* Travel party / Squad */}
          <div className="glass-panel p-4 space-y-3">
            <div className="label-tag">{labels.group}</div>
            {members.map(m => {
              const w = weights[m.id] ?? 0;
              const pct = Math.min((w / m.maxKg) * 100, 100);
              const over = w > m.maxKg;
              return (
                <div key={m.id}>
                  <div className="flex justify-between text-xs mb-1" style={{ color: 'rgba(255,255,255,0.6)' }}>
                    <span>{m.avatar} {m.name}</span>
                    <span style={{ color: over ? 'var(--status-alert)' : 'rgba(255,255,255,0.4)' }}>{w.toFixed(1)}/{m.maxKg}kg</span>
                  </div>
                  <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.15)' }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, background: over ? 'var(--status-alert)' : 'var(--cta)' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Saved trips */}
          <div className="glass-panel p-4">
            <div className="label-tag mb-3">{labels.saved}</div>
            {['Iceland Ring Road 2025', 'Dolomites Alta Via 2024', 'Nepal Base Camp 2023'].map((t, i) => (
              <div
                key={i}
                className="flex items-center gap-2 py-1.5 border-b last:border-0"
                style={{ borderColor: 'rgba(255,255,255,0.07)' }}
              >
                <span className="text-xs" style={{ color: 'var(--accent)' }}>✓</span>
                <span
                  className="text-xs"
                  style={{ color: 'rgba(255,255,255,0.8)', fontFamily: isTactical ? 'monospace' : 'inherit' }}
                >
                  {t}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Right panel */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.9, delay: 0.2 }}
          className="flex-1 p-8 flex flex-col gap-6"
        >
          {/* Trip header */}
          <div>
            <div className="label-tag mb-2" style={{ color: 'rgba(255,255,255,0.65)' }}>
              {labels.activeMission}
            </div>
            <h1
              className="font-editorial leading-tight"
              style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', color: '#fff' }}
            >
              {trip.name}
            </h1>
            <p
              className="text-sm mt-2"
              style={{
                color: 'rgba(255,255,255,0.65)',
                fontFamily: isTactical ? 'monospace' : 'inherit',
              }}
            >
              {trip.destination} · {trip.days} days · {totalKm.toLocaleString()} km
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Departure', value: trip.startDate },
              { label: 'Return',    value: trip.endDate },
              { label: 'Status',    value: trip.status },
            ].map(s => (
              <div key={s.label} className="glass-panel p-4">
                <div className="label-tag mb-1" style={{ color: 'rgba(255,255,255,0.55)' }}>{s.label}</div>
                <div
                  className="text-sm"
                  style={{ color: '#fff', fontFamily: isTactical ? 'monospace' : 'inherit' }}
                >
                  {s.value}
                </div>
              </div>
            ))}
          </div>

          {/* Featured trips */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="label-tag" style={{ color: 'rgba(255,255,255,0.55)' }}>
                {isTactical ? 'VentureVault — Featured Paths' : 'Featured trips'}
              </div>
              <button
                onClick={onOpenVault}
                className="text-xs hover:underline"
                style={{ color: 'var(--accent)', fontFamily: isTactical ? 'monospace' : 'inherit' }}
              >
                Browse all →
              </button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {VAULT_PREVIEWS.map(v => (
                <button
                  key={v.id}
                  onClick={onOpenVault}
                  className="shrink-0 glass-panel p-4 w-52 text-left transition-colors"
                >
                  <div className="text-sm font-semibold truncate" style={{ color: '#fff' }}>{v.name}</div>
                  <div
                    className="text-xs mt-1"
                    style={{ color: 'rgba(255,255,255,0.55)', fontFamily: isTactical ? 'monospace' : 'inherit' }}
                  >
                    {v.distance} · {v.days}d
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-xs" style={{ color: 'var(--accent)' }}>${v.price}</span>
                    <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{v.clones} clones</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="mt-auto flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push('/expedition/new/welcome')}
              className="flex items-center gap-2 px-4 py-2 bg-[#E67E22]/10 border border-[#E67E22]/40 text-[#E67E22] font-mono text-sm rounded hover:bg-[#E67E22]/20 transition-colors"
            >
              ✦ Plan with Guide
            </button>
            <button
              onClick={onEnterTrip}
              className="px-8 py-4 font-semibold text-sm text-white transition-colors"
              style={{
                background: 'var(--cta)',
                borderRadius: isTactical ? '8px' : '9999px',
                letterSpacing: isTactical ? '0.1em' : 'normal',
                fontFamily: isTactical ? 'monospace' : 'Inter, sans-serif',
                textTransform: isTactical ? 'uppercase' : 'none',
              }}
            >
              {labels.enter}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

const VAULT_PREVIEWS = [
  { id: 1, name: 'Icelandic Ring Road',    distance: '1,332 km', days: 10, price: 8,  clones: 214 },
  { id: 2, name: 'Swiss Alps Haute Route', distance: '180 km',   days: 7,  price: 6,  clones: 87  },
  { id: 3, name: 'Mt. Fuji Sunrise',       distance: '22 km',    days: 2,  price: 4,  clones: 453 },
  { id: 4, name: 'Patagonia W-Trek',       distance: '72 km',    days: 5,  price: 7,  clones: 168 },
];
