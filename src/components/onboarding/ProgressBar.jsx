// src/components/onboarding/ProgressBar.jsx
import { motion } from 'framer-motion'

export function ProgressBar({ current, total }) {
  const pct = Math.round(((current + 1) / total) * 100)

  return (
    <div style={{ padding: '0 0 10px', background: '#0C0F0A', flexShrink: 0 }}>
      <div style={{ height: 3, background: '#1a2518' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ type: 'tween', duration: 0.08 }}
          style={{ height: '100%', background: '#E67E22' }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  )
}
