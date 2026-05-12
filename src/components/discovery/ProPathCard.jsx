import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const CLIMATE_GLOW = {
  alpine:     'radial-gradient(ellipse at center, rgba(100,116,139,0.6) 0%, transparent 70%)',
  tropical:   'radial-gradient(ellipse at center, rgba(16,185,129,0.5) 0%, transparent 70%)',
  subarctic:  'radial-gradient(ellipse at center, rgba(6,182,212,0.5) 0%, transparent 70%)',
  desert:     'radial-gradient(ellipse at center, rgba(245,158,11,0.5) 0%, transparent 70%)',
  temperate:  'radial-gradient(ellipse at center, rgba(20,184,166,0.5) 0%, transparent 70%)',
  arid:       'radial-gradient(ellipse at center, rgba(234,88,12,0.4) 0%, transparent 70%)',
};

const CLIMATE_FALLBACK_GRADIENT = {
  alpine:    'from-slate-800 to-zinc-950',
  tropical:  'from-emerald-900 to-teal-950',
  subarctic: 'from-blue-900 to-indigo-950',
  desert:    'from-amber-900 to-orange-950',
  temperate: 'from-green-900 to-emerald-950',
  arid:      'from-orange-900 to-red-950',
};

const DIFFICULTY_COLOR = {
  Easy:     'text-green-300 border-green-700',
  Moderate: 'text-green-400 border-green-700',
  Hard:     'text-yellow-400 border-yellow-700',
  Expert:   'text-red-400 border-red-700',
};

const DIFFICULTY_BADGE = {
  Easy:     { bg: '#5C9A6A22', border: '#5C9A6A', color: '#5C9A6A' },
  Moderate: { bg: '#E67E2222', border: '#E67E22', color: '#E67E22' },
  Hard:     { bg: '#C0303022', border: '#C03030', color: '#C03030' },
  Expert:   { bg: '#C0303044', border: '#ff4040', color: '#ff4040' },
};

function QualityDots({ score }) {
  const filled = Math.round((score ?? 0) * 5);
  return (
    <span className="text-[10px] font-mono text-[var(--text-secondary)]">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < filled ? 'text-[#E67E22]' : 'text-[var(--text-muted)]'}>◆</span>
      ))}
    </span>
  );
}

function Tag({ children }) {
  return (
    <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-white/20 text-[var(--text-secondary)]">
      {children}
    </span>
  );
}

export default function ProPathCard({ path, onClone, cloning }) {
  const [legsOpen, setLegsOpen] = useState(false);

  const hasPhoto = !!path.cover_image_url;
  const fallbackGradient = CLIMATE_FALLBACK_GRADIENT[path.climate] ?? 'from-slate-800 to-zinc-950';
  const isElite = (path.clones ?? 0) >= 100;
  const isCommunity = path.is_community && !path.is_curated;

  return (
    <motion.div
      layout
      whileHover={{ scale: 1.02, zIndex: 10 }}
      className="relative rounded-xl overflow-hidden border border-white/10 cursor-pointer"
      style={{ height: 220 }}
      onClick={() => setLegsOpen(v => !v)}
    >
      {/* Breathing glow layer */}
      <motion.div
        className="absolute inset-0 z-0"
        animate={{ scale: [1, 1.15, 1], opacity: [0.15, 0.35, 0.15] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        style={{ background: CLIMATE_GLOW[path.climate] ?? CLIMATE_GLOW.temperate }}
      />

      {/* Photo background with Ken Burns */}
      {hasPhoto ? (
        <motion.div
          className="absolute inset-0 z-1"
          animate={{ backgroundPosition: ['50% 40%', '50% 60%'] }}
          transition={{ duration: 10, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
          style={{
            backgroundImage: `url(${path.cover_image_url})`,
            backgroundSize: 'cover',
          }}
        />
      ) : (
        <div className={`absolute inset-0 z-1 bg-gradient-to-br ${fallbackGradient}`} />
      )}

      {/* Dark overlay */}
      <div className="absolute inset-0 z-2 bg-gradient-to-t from-black/80 via-black/40 to-black/10" />

      {/* Difficulty badge — bottom-left of photo hero */}
      {path.difficulty && (() => {
        const badge = DIFFICULTY_BADGE[path.difficulty];
        return badge ? (
          <div
            className="absolute bottom-16 left-4 z-10"
            style={{
              background: badge.bg,
              border: `1px solid ${badge.border}`,
              color: badge.color,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9,
              letterSpacing: '0.1em',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: 2,
            }}
          >
            {path.difficulty.toUpperCase()}
          </div>
        ) : null;
      })()}

      {/* Content */}
      <div className="relative z-10 p-5 h-full flex flex-col justify-between">
        <div>
          <div className="flex justify-end mb-2">
            {isElite && !isCommunity && (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold text-[#0F1115] bg-[#F2C94C]">
                ELITE PIONEER
              </span>
            )}
            {isCommunity && (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold text-[#0F1115] bg-[#D9C5B2]">
                COMMUNITY
              </span>
            )}
          </div>

          <div className="font-editorial text-xl text-white mb-1">{path.name}</div>
          <div className="text-xs text-[var(--text-secondary)] font-mono mb-1">
            by {path.architect_name} · {path.clones} clones · ★ {path.rating?.toFixed(1) ?? '—'}
          </div>
          {path.llm_quality_score != null && (
            <div className="mb-2"><QualityDots score={path.llm_quality_score} /></div>
          )}
          {/* Stats row */}
          <div className="flex flex-wrap gap-2">
            <Tag>{path.distance_km} km</Tag>
            {path.elevation_m != null && <Tag>+{path.elevation_m}m</Tag>}
            <Tag>{path.days}d</Tag>
            <Tag>Squad {path.squad_min}–{path.squad_max}</Tag>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[#F2C94C] font-mono font-bold text-lg">
            {path.price_usd === 0 ? 'Free' : `$${path.price_usd}`}
          </span>
          <button
            onClick={e => { e.stopPropagation(); onClone(path); }}
            disabled={cloning}
            className="px-4 py-2 bg-[#E67E22] hover:bg-[#d4711e] disabled:opacity-50 text-white font-mono text-xs font-bold rounded-lg transition-colors"
          >
            {cloning ? 'CLONING…' : 'CLONE PATH'}
          </button>
        </div>
      </div>

      {/* Legs preview drawer */}
      <AnimatePresence>
        {legsOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="absolute bottom-0 left-0 right-0 z-20 bg-black/90 border-t border-white/10 p-3"
          >
            {(path.legs ?? []).map((leg, i) => (
              <div key={i} className="text-[10px] font-mono text-[var(--text-secondary)] py-0.5">
                {leg.from} → {leg.to} · {leg.mode} · {leg.durationH}h
              </div>
            ))}
            {path.forked_from && (
              <div className="text-[10px] font-mono text-[#D9C5B2] mt-1">
                forked from a curated expedition
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
