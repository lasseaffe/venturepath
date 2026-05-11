// src/components/onboarding/Spotlight.tsx
import { useId } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface SpotlightProps {
  rect: { x: number; y: number; width: number; height: number } | null
  padding?: number
  borderRadius?: number
}

export function Spotlight({ rect, padding = 12, borderRadius = 16 }: SpotlightProps) {
  const clipId = useId()

  if (rect && rect.width === 0 && rect.height === 0) return null

  const vw = typeof window !== 'undefined' ? window.innerWidth : 375
  const vh = typeof window !== 'undefined' ? window.innerHeight : 812

  return (
    <svg
      style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 9998, pointerEvents: 'none' }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <clipPath id={clipId}>
          <rect width={vw} height={vh} clipRule="evenodd" />
          <AnimatePresence>
            {rect && (
              <motion.rect
                key="hole"
                x={rect.x - padding}
                y={rect.y - padding}
                width={rect.width + padding * 2}
                height={rect.height + padding * 2}
                rx={borderRadius}
                clipRule="evenodd"
                initial={{ opacity: 0 }}
                animate={{
                  opacity: 1,
                  x: rect.x - padding,
                  y: rect.y - padding,
                  width: rect.width + padding * 2,
                  height: rect.height + padding * 2,
                }}
                transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              />
            )}
          </AnimatePresence>
        </clipPath>
      </defs>
      <rect
        x={0} y={0} width={vw} height={vh}
        fill="rgba(0,0,0,0.72)"
        clipPath={`url(#${clipId})`}
        style={{ clipRule: 'evenodd' }}
      />
      {rect && (
        <motion.rect
          x={rect.x - padding - 2}
          y={rect.y - padding - 2}
          width={rect.width + padding * 2 + 4}
          height={rect.height + padding * 2 + 4}
          rx={borderRadius + 2}
          fill="none"
          stroke="#9333EA"
          strokeWidth={2}
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
    </svg>
  )
}
