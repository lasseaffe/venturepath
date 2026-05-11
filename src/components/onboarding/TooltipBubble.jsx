// src/components/onboarding/TooltipBubble.jsx
import { motion } from 'framer-motion'

export function TooltipBubble({ title, body, position, rect, padding = 12, onNext, isDoStep, stepIndex, totalSteps }) {
  const gap = 14
  const tooltipW = Math.min(280, window.innerWidth - 32)

  let top = 0
  let left = 0

  switch (position) {
    case 'bottom':
      top = rect.y + rect.height + padding + gap
      left = rect.x + rect.width / 2 - tooltipW / 2
      break
    case 'top':
      top = rect.y - padding - gap - 160
      left = rect.x + rect.width / 2 - tooltipW / 2
      break
    case 'right':
      top = rect.y + rect.height / 2 - 80
      left = rect.x + rect.width + padding + gap
      break
    case 'left':
      top = rect.y + rect.height / 2 - 80
      left = rect.x - padding - gap - tooltipW
      break
    default:
      top = rect.y + rect.height + padding + gap
      left = rect.x + rect.width / 2 - tooltipW / 2
  }

  left = Math.max(16, Math.min(left, window.innerWidth - tooltipW - 16))
  top = Math.max(16, top)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.05 }}
      style={{
        position: 'fixed', top, left,
        width: tooltipW,
        background: '#111A0E',
        borderRadius: 8,
        padding: '14px 16px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        zIndex: 9999,
        border: '1px solid #2a3a22',
        fontFamily: '"JetBrains Mono", monospace',
      }}
    >
      <div style={{ fontSize: 9, color: '#4A7C59', fontWeight: 700, marginBottom: 6, letterSpacing: 1 }}>
        // {stepIndex}/{totalSteps}
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#E8F5E0', marginBottom: body ? 8 : 12, letterSpacing: 0.3 }}>
        {title}
      </div>
      {body && (
        <div style={{ fontSize: 11, color: '#8FAF80', marginBottom: 12, lineHeight: 1.6 }}>
          {body}
        </div>
      )}
      {!isDoStep && (
        <button
          onClick={onNext}
          style={{
            width: '100%', padding: '9px 0',
            background: 'transparent',
            border: '1px solid #E67E22',
            borderRadius: 4,
            color: '#E67E22', fontWeight: 700, fontSize: 11,
            cursor: 'pointer',
            fontFamily: '"JetBrains Mono", monospace',
            letterSpacing: 1,
            transition: 'all 0.12s steps(3, end)',
          }}
          onMouseEnter={e => { e.target.style.background = '#E67E22'; e.target.style.color = '#0C0F0A' }}
          onMouseLeave={e => { e.target.style.background = 'transparent'; e.target.style.color = '#E67E22' }}
        >
          {'> NEXT'}
        </button>
      )}
      {isDoStep && (
        <div style={{ fontSize: 10, color: '#E67E22', fontWeight: 700, textAlign: 'center', letterSpacing: 1 }}>
          {'> COMPLETE THE ACTION ABOVE'}
        </div>
      )}
    </motion.div>
  )
}
