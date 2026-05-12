import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function GpxImportDialog({ stops, onConfirm, onCancel }) {
  const [mode, setMode] = useState('append'); // 'replace' | 'append'

  if (!stops || stops.length < 2) return null;

  const legCount = stops.length - 1;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(10,11,12,0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24,
        }}
        onClick={onCancel}
      >
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          onClick={e => e.stopPropagation()}
          style={{
            background: '#101214',
            border: '1px solid #2a2f36',
            borderRadius: 4,
            padding: 24,
            width: '100%',
            maxWidth: 480,
          }}
        >
          {/* Header */}
          <div style={{ marginBottom: 20 }}>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase',
              color: '#E67E22', marginBottom: 4,
            }}>
              GPX IMPORT
            </div>
            <div style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 18, color: '#F2EDE8',
            }}>
              {stops.length} stops · {legCount} leg{legCount !== 1 ? 's' : ''} detected
            </div>
          </div>

          {/* Stop preview list */}
          <div style={{
            maxHeight: 180, overflowY: 'auto',
            border: '1px solid #1a1f24', borderRadius: 2,
            marginBottom: 20,
          }}>
            {stops.map((s, i) => (
              <div
                key={i}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '7px 12px',
                  borderBottom: i < stops.length - 1 ? '1px solid #1a1f24' : 'none',
                }}
              >
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 8, letterSpacing: '0.08em',
                  color: '#E67E22', minWidth: 18, textAlign: 'right',
                }}>
                  {i + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#F2EDE8' }}>
                    {s.name}
                  </div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#484440', marginTop: 1 }}>
                    {s.lat.toFixed(4)}, {s.lng.toFixed(4)}
                    {s.mode ? ` · ${s.mode}` : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Replace / Append toggle */}
          <div style={{ marginBottom: 20 }}>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase',
              color: '#484440', marginBottom: 8,
            }}>
              How to add these legs
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { value: 'append', label: 'APPEND', desc: 'Add after existing legs' },
                { value: 'replace', label: 'REPLACE', desc: 'Overwrite current itinerary' },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setMode(opt.value)}
                  style={{
                    flex: 1, padding: '10px 12px', textAlign: 'left',
                    background: mode === opt.value ? 'rgba(230,126,34,0.10)' : 'transparent',
                    border: `1px solid ${mode === opt.value ? '#E67E22' : '#2a2f36'}`,
                    borderRadius: 2, cursor: 'pointer',
                  }}
                >
                  <div style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                    color: mode === opt.value ? '#E67E22' : '#8A8680',
                  }}>
                    {opt.label}
                  </div>
                  <div style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 9, color: '#484440', marginTop: 3,
                  }}>
                    {opt.desc}
                  </div>
                </button>
              ))}
            </div>
            {mode === 'replace' && (
              <div style={{
                marginTop: 8,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 9, color: '#C03030', letterSpacing: '0.04em',
              }}>
                ⚠ This will remove all existing legs from your itinerary
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              onClick={onCancel}
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10, letterSpacing: '0.08em',
                padding: '8px 16px', borderRadius: 2,
                background: 'transparent',
                border: '1px solid #2a2f36',
                color: '#8A8680', cursor: 'pointer',
              }}
            >
              CANCEL
            </button>
            <button
              onClick={() => onConfirm(mode)}
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                padding: '8px 20px', borderRadius: 2,
                background: '#E67E22',
                border: 'none',
                color: '#fff', cursor: 'pointer',
              }}
            >
              IMPORT {legCount} LEG{legCount !== 1 ? 'S' : ''}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
