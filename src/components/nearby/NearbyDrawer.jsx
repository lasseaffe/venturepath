// src/components/nearby/NearbyDrawer.jsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNearbySearch } from '../../hooks/useNearbySearch';
import { OTM_CATEGORIES } from '../../utils/otmEngine';
import NearbyResultCard from './NearbyResultCard';

export default function NearbyDrawer({ anchor: defaultAnchor, onSelectPlace }) {
  const [open, setOpen] = useState(false);
  const [editingAnchor, setEditingAnchor] = useState(false);
  const [anchorInput, setAnchorInput] = useState('');

  const {
    anchor, setAnchor,
    category, setCategory,
    sortBy, setSortBy,
    results, loading, error,
    inspire,
  } = useNearbySearch(defaultAnchor);

  function toggleOpen() {
    setOpen(v => !v);
  }

  function commitAnchor() {
    if (anchorInput.trim()) setAnchor(anchorInput.trim());
    setEditingAnchor(false);
  }

  return (
    <div className="mt-2">
      {/* Trigger button */}
      <button
        type="button"
        onClick={toggleOpen}
        className="w-full py-2 rounded-lg text-xs font-mono transition-colors"
        style={{
          background: 'transparent',
          color: 'var(--accent)',
          border: '1px dashed var(--accent)',
        }}
      >
        {open ? '▲ Close nearby' : '🔍 Find nearby'}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            className="overflow-hidden"
          >
            <div className="pt-3 space-y-3">

              {/* Anchor row */}
              <div className="flex items-center gap-2">
                {editingAnchor ? (
                  <input
                    autoFocus
                    value={anchorInput}
                    onChange={e => setAnchorInput(e.target.value)}
                    onBlur={commitAnchor}
                    onKeyDown={e => { if (e.key === 'Enter') commitAnchor(); if (e.key === 'Escape') setEditingAnchor(false); }}
                    className="flex-1 px-2 py-1 rounded text-xs outline-none"
                    style={{ background: 'var(--surface-raised)', border: '1px solid var(--accent)', color: 'var(--text-primary)' }}
                    placeholder="Enter city or place…"
                  />
                ) : (
                  <>
                    <span className="flex-1 text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                      📍 {anchor || 'No location set'}
                    </span>
                    <button
                      type="button"
                      onClick={() => { setAnchorInput(anchor); setEditingAnchor(true); }}
                      className="text-[10px] px-1.5 py-0.5 rounded"
                      style={{ background: 'var(--surface-raised)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                    >
                      change
                    </button>
                  </>
                )}
              </div>

              {/* Category chips */}
              <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                {OTM_CATEGORIES.map(cat => (
                  <button
                    key={cat.kinds}
                    type="button"
                    onClick={() => setCategory(cat.kinds)}
                    className="shrink-0 px-2.5 py-1 rounded-full text-xs font-medium transition-colors"
                    style={{
                      background: category === cat.kinds ? 'var(--cta)' : 'var(--surface-raised)',
                      color: category === cat.kinds ? '#fff' : 'var(--text-secondary)',
                      border: `1px solid ${category === cat.kinds ? 'var(--cta)' : 'var(--border)'}`,
                    }}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Sort row */}
              <div className="flex items-center justify-end gap-2">
                <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>SORT:</span>
                {[{ value: 'rating', label: 'Rating ↓' }, { value: 'name', label: 'Name A–Z' }].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSortBy(opt.value)}
                    className="text-[10px] px-2 py-0.5 rounded font-mono transition-colors"
                    style={{
                      background: sortBy === opt.value ? 'var(--accent)' : 'var(--surface-raised)',
                      color: sortBy === opt.value ? '#fff' : 'var(--text-muted)',
                      border: `1px solid ${sortBy === opt.value ? 'var(--accent)' : 'var(--border)'}`,
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Inspire me */}
              <button
                type="button"
                onClick={inspire}
                disabled={loading}
                className="w-full py-2 rounded-lg text-xs font-semibold text-white transition-opacity"
                style={{ background: 'var(--cta)', opacity: loading ? 0.6 : 1 }}
              >
                {loading ? 'Searching…' : '✨ Inspire me'}
              </button>

              {/* Results */}
              {error && (
                <p className="text-xs text-center py-2" style={{ color: 'var(--status-alert)' }}>{error}</p>
              )}
              {!loading && !error && results.length === 0 && anchor && (
                <p className="text-xs text-center py-2" style={{ color: 'var(--text-muted)' }}>No places found nearby.</p>
              )}
              <div className="space-y-2 overflow-y-auto" style={{ maxHeight: 240 }}>
                {results.map(place => (
                  <NearbyResultCard
                    key={place.id}
                    place={place}
                    onSelect={p => { onSelectPlace(p.name); setOpen(false); }}
                  />
                ))}
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
