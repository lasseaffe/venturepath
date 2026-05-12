import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Seed bundles — replaced with Supabase query when the bundles table exists
const SEED_BUNDLES = [
  {
    id: 'b1',
    title: 'Alpine Summer',
    region: 'Switzerland · France · Italy',
    pathCount: 6,
    cloneCount: 2341,
    architectName: 'arc_collective',
    gradient: 'linear-gradient(135deg, #0d1f2d, #1a3a4a)',
  },
  {
    id: 'b2',
    title: 'Desert Crossings',
    region: 'Morocco · Jordan · Namibia',
    pathCount: 4,
    cloneCount: 891,
    architectName: 'nomad_lasse',
    gradient: 'linear-gradient(135deg, #2d1a0d, #4a2d0a)',
  },
  {
    id: 'b3',
    title: 'Patagonia Seasons',
    region: 'Chile · Argentina',
    pathCount: 9,
    cloneCount: 4108,
    architectName: 'trek_lab',
    gradient: 'linear-gradient(135deg, #0d2d1a, #0a3a20)',
  },
  {
    id: 'b4',
    title: 'Silk Road East',
    region: 'Uzbekistan · Kyrgyzstan · Tajikistan',
    pathCount: 5,
    cloneCount: 634,
    architectName: 'silk_path',
    gradient: 'linear-gradient(135deg, #2d2000, #3a2d0a)',
  },
];

function BundleCard({ bundle, onSelect, selected }) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      onClick={() => onSelect(bundle.id)}
      style={{
        minWidth: 180,
        flex: '0 0 auto',
        background: bundle.gradient,
        borderRadius: 4,
        overflow: 'hidden',
        border: selected ? '1px solid #E67E22' : '1px solid #1a1f24',
        cursor: 'pointer',
        position: 'relative',
      }}
    >
      {/* Gradient overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to top, rgba(10,11,12,0.85), transparent 50%)',
      }} />

      {/* Count badge */}
      <div style={{ position: 'relative', padding: '10px 10px 0', display: 'flex', justifyContent: 'flex-end' }}>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 8,
          letterSpacing: '0.06em',
          padding: '2px 8px',
          borderRadius: 2,
          background: 'rgba(230,126,34,0.15)',
          border: '1px solid rgba(230,126,34,0.4)',
          color: '#E67E22',
        }}>
          {bundle.pathCount} expeditions
        </span>
      </div>

      {/* Content */}
      <div style={{ position: 'relative', padding: '32px 10px 10px' }}>
        <div style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: 13,
          fontWeight: 700,
          color: '#F2EDE8',
          marginBottom: 3,
        }}>
          {bundle.title}
        </div>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9,
          color: '#8A8680',
          letterSpacing: '0.04em',
          marginBottom: 8,
        }}>
          {bundle.region}
        </div>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 8,
          color: '#484440',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          paddingTop: 6,
        }}>
          ↓ {bundle.cloneCount.toLocaleString()} clones · by {bundle.architectName}
        </div>
      </div>
    </motion.div>
  );
}

export default function ExpeditionBundleShelf({ onFilterByBundle }) {
  const [selected, setSelected] = useState(null);
  const [open, setOpen] = useState(true);

  function handleSelect(id) {
    const next = selected === id ? null : id;
    setSelected(next);
    onFilterByBundle?.(next ? SEED_BUNDLES.find(b => b.id === next) : null);
  }

  return (
    <div style={{ marginBottom: 20 }}>
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: '0.12em', color: '#E67E22', textTransform: 'uppercase', marginBottom: 2 }}>
            EXPEDITION BUNDLES
          </div>
          <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 16, color: 'var(--text-primary)' }}>
            Themed Collections
          </div>
        </div>
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            background: 'none',
            border: '1px solid #2a2f36',
            color: '#8A8680',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 8,
            letterSpacing: '0.08em',
            padding: '3px 8px',
            borderRadius: 2,
            cursor: 'pointer',
          }}
        >
          {open ? 'HIDE' : 'SHOW'}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
              {SEED_BUNDLES.map(bundle => (
                <BundleCard
                  key={bundle.id}
                  bundle={bundle}
                  onSelect={handleSelect}
                  selected={selected === bundle.id}
                />
              ))}
            </div>
            {selected && (
              <div style={{
                marginTop: 8,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 9,
                color: '#E67E22',
                letterSpacing: '0.06em',
              }}>
                FILTERING BY: {SEED_BUNDLES.find(b => b.id === selected)?.title?.toUpperCase()} ·{' '}
                <button
                  onClick={() => handleSelect(selected)}
                  style={{ background: 'none', border: 'none', color: '#8A8680', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit' }}
                >
                  CLEAR ✕
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
