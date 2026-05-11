// src/components/onboarding/FeatureBeacon.jsx
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export function FeatureBeacon({ targetSelector, label, beaconKey, onDismiss }) {
  const [rect, setRect] = useState(null)
  const [showHint, setShowHint] = useState(false)
  const dismissed = useRef(false)

  useEffect(() => {
    const el = document.querySelector(targetSelector)
    if (!el) return
    setRect(el.getBoundingClientRect())
  }, [targetSelector])

  if (!rect || dismissed.current) return null

  return (
    <div style={{ position: 'fixed', left: rect.left + rect.width - 8, top: rect.top - 8, zIndex: 8000, pointerEvents: 'auto' }}>
      <motion.div
        animate={{ scale: [1, 1.6, 1], opacity: [1, 0.3, 1] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          width: 14, height: 14, borderRadius: '50%',
          background: '#E67E22',
          boxShadow: '0 0 8px rgba(230,126,34,0.6)',
          cursor: 'pointer',
        }}
        onClick={() => setShowHint(h => !h)}
        aria-label={`Discover: ${label}`}
      />
      <AnimatePresence>
        {showHint && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.05 }}
            style={{
              position: 'absolute', top: 22, right: 0,
              background: '#111A0E',
              border: '1px solid #E67E22',
              borderRadius: 6,
              padding: '10px 12px',
              width: 180,
              zIndex: 8001,
              fontFamily: '"JetBrains Mono", monospace',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: '#E8F5E0', marginBottom: 8, letterSpacing: 0.5 }}>
              {label}
            </div>
            <button
              onClick={() => { dismissed.current = true; onDismiss(beaconKey); setShowHint(false) }}
              style={{
                fontSize: 10, fontWeight: 700, color: '#E67E22',
                background: 'transparent', border: '1px solid #E67E22',
                borderRadius: 4, padding: '5px 10px',
                cursor: 'pointer',
                fontFamily: '"JetBrains Mono", monospace',
                letterSpacing: 1,
                transition: 'all 0.12s steps(3, end)',
              }}
              onMouseEnter={e => { e.target.style.background = '#E67E22'; e.target.style.color = '#0C0F0A' }}
              onMouseLeave={e => { e.target.style.background = 'transparent'; e.target.style.color = '#E67E22' }}
            >
              [ACK]
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function BeaconManager({ beacons, dismissedKeys, onDismiss }) {
  return (
    <>
      {beacons
        .filter(b => !dismissedKeys.includes(b.key))
        .map(b => (
          <FeatureBeacon
            key={b.id}
            targetSelector={b.target}
            label={b.label}
            beaconKey={b.key}
            onDismiss={onDismiss}
          />
        ))}
    </>
  )
}
