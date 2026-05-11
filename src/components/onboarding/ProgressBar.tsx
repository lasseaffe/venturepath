// src/components/onboarding/ProgressBar.tsx
import { motion } from 'framer-motion'

interface ProgressBarProps {
  current: number  // 0-based index of current step
  total: number
}

export function ProgressBar({ current, total }: ProgressBarProps) {
  const pct = Math.round(((current + 1) / total) * 100)

  return (
    <div style={{ padding: '0 22px 12px', background: '#FDF4FF', flexShrink: 0 }}>
      <div style={{ height: 8, background: '#F0E8FF', borderRadius: 4, overflow: 'hidden' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
          style={{
            height: '100%',
            borderRadius: 4,
            background: 'linear-gradient(90deg, #E8547A, #9333EA, #EAB308, #38BDF8)',
          }}
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          role="progressbar"
        />
      </div>
    </div>
  )
}
