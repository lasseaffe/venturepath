import { useId } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface SpotlightProps {
  rect: { x: number; y: number; width: number; height: number } | null
  padding?: number
  borderRadius?: number
}

function roundedRectPath(x: number, y: number, w: number, h: number, r: number): string {
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

export function Spotlight({ rect, padding = 12, borderRadius = 16 }: SpotlightProps) {
  const clipId = useId().replace(/:/g, '')

  if (rect && rect.width === 0 && rect.height === 0) return null

  const vw = typeof window !== 'undefined' ? window.innerWidth : 375
  const vh = typeof window !== 'undefined' ? window.innerHeight : 812

  const viewportPath = `M 0 0 H ${vw} V ${vh} H 0 Z`

  const holePath = rect
    ? roundedRectPath(
        rect.x - padding,
        rect.y - padding,
        rect.width + padding * 2,
        rect.height + padding * 2,
        borderRadius,
      )
    : ''

  // Compound path: viewport rect + hole sub-path. fillRule="evenodd" punches the hole.
  const compoundPath = rect ? `${viewportPath} ${holePath}` : viewportPath

  return (
    <svg
      style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 9998, pointerEvents: 'none' }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <AnimatePresence>
        <motion.path
          key={rect ? 'with-hole' : 'solid'}
          d={compoundPath}
          fill="rgba(0,0,0,0.72)"
          fillRule="evenodd"
          style={{ pointerEvents: 'all' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        />
      </AnimatePresence>
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
