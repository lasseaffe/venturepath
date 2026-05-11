// src/components/onboarding/Spotlight.jsx
import { motion, AnimatePresence } from 'framer-motion'

function roundedRectPath(x, y, w, h, r) {
  const r2 = Math.min(r, w / 2, h / 2)
  return [
    `M ${x + r2} ${y}`,
    `H ${x + w - r2}`,
    `Q ${x + w} ${y} ${x + w} ${y + r2}`,
    `V ${y + h - r2}`,
    `Q ${x + w} ${y + h} ${x + w - r2} ${y + h}`,
    `H ${x + r2}`,
    `Q ${x} ${y + h} ${x} ${y + h - r2}`,
    `V ${y + r2}`,
    `Q ${x} ${y} ${x + r2} ${y}`,
    `Z`,
  ].join(' ')
}

export function Spotlight({ rect, padding = 12, borderRadius = 8 }) {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 375
  const vh = typeof window !== 'undefined' ? window.innerHeight : 812

  const viewportPath = `M 0 0 H ${vw} V ${vh} H 0 Z`
  const holePath = rect
    ? roundedRectPath(rect.x - padding, rect.y - padding, rect.width + padding * 2, rect.height + padding * 2, borderRadius)
    : ''
  const compoundPath = rect ? `${viewportPath} ${holePath}` : viewportPath

  return (
    <svg style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 9998, pointerEvents: 'none' }} xmlns="http://www.w3.org/2000/svg">
      <AnimatePresence>
        <motion.path
          key={rect ? 'with-hole' : 'solid'}
          d={compoundPath}
          fill="rgba(0,0,0,0.80)"
          fillRule="evenodd"
          style={{ pointerEvents: 'all' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.05 }}
        />
      </AnimatePresence>
      {rect && (
        <motion.rect
          x={rect.x - padding - 1}
          y={rect.y - padding - 1}
          width={rect.width + padding * 2 + 2}
          height={rect.height + padding * 2 + 2}
          rx={borderRadius + 1}
          fill="none"
          stroke="#E67E22"
          strokeWidth={1.5}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}
    </svg>
  )
}
