// src/components/onboarding/FeatureBeacon.tsx
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { OnboardingBeacon, OnboardingTheme } from './onboarding.types'

const HF_PURPLE = '#9333EA'

function useBeaconPosition(selector: string) {
  const [pos, setPos] = useState<{ left: number; top: number; width: number; height: number } | null>(null)

  useEffect(() => {
    const el = document.querySelector(selector)
    if (!el) {
      setPos(null)
      return
    }

    const compute = () => {
      const r = el.getBoundingClientRect()
      setPos({ left: r.left, top: r.top, width: r.width, height: r.height })
    }

    compute()
    const ro = new ResizeObserver(compute)
    ro.observe(el)
    window.addEventListener('scroll', compute, { passive: true })
    window.addEventListener('resize', compute)
    return () => {
      ro.disconnect()
      window.removeEventListener('scroll', compute)
      window.removeEventListener('resize', compute)
    }
  }, [selector])

  return pos
}

interface FeatureBeaconProps {
  targetSelector: string
  label: string
  beaconKey: string
  onDismiss: (key: string) => void
  accent?: string
}

export function FeatureBeacon({ targetSelector, label, beaconKey, onDismiss, accent = HF_PURPLE }: FeatureBeaconProps) {
  const pos = useBeaconPosition(targetSelector)
  const [showHint, setShowHint] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cleanup any pending timers on unmount.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  if (!pos) return null

  const handleDismiss = () => {
    setShowHint(false)
    onDismiss(beaconKey)
  }

  return (
    <div
      style={{
        position: 'fixed',
        left: pos.left + pos.width - 8,
        top: pos.top - 8,
        zIndex: 8000,
        pointerEvents: 'auto',
      }}
    >
      <motion.div
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'relative',
          width: 16,
          height: 16,
          borderRadius: '50%',
          background: accent,
          boxShadow: `0 0 8px ${accent}80`,
          cursor: 'pointer',
        }}
        onClick={() => setShowHint(h => !h)}
        aria-label={`Discover ${label}`}
      >
        <motion.div
          animate={{ scale: [1, 2, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            inset: -10,
            borderRadius: '50%',
            border: `2px solid ${accent}`,
            pointerEvents: 'none',
          }}
        />
      </motion.div>

      <AnimatePresence>
        {showHint && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            style={{
              position: 'absolute',
              top: 24,
              right: 0,
              background: '#fff',
              borderRadius: 12,
              padding: '12px 14px',
              boxShadow: '0 8px 32px rgba(147,51,234,0.2)',
              border: '1.5px solid #E9D5FF',
              width: 180,
              zIndex: 8001,
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: '#2D0A4E',
                marginBottom: 8,
                fontFamily: 'Inter, sans-serif',
              }}
            >
              {label}
            </div>
            <button
              onClick={handleDismiss}
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: HF_PURPLE,
                background: '#F5F0FF',
                border: 'none',
                borderRadius: 8,
                padding: '6px 12px',
                cursor: 'pointer',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              Got it ✓
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

interface BeaconManagerProps {
  beacons: OnboardingBeacon[]
  dismissedKeys: string[]
  onDismiss: (key: string) => void
  theme?: OnboardingTheme
}

export function BeaconManager({ beacons, dismissedKeys, onDismiss, theme }: BeaconManagerProps) {
  const accent = theme?.accent ?? HF_PURPLE
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
            accent={accent}
          />
        ))}
    </>
  )
}
