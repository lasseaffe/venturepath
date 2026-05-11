// src/components/onboarding/TooltipBubble.tsx
import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'

interface TooltipBubbleProps {
  title: string
  body?: string
  position: 'top' | 'bottom' | 'left' | 'right'
  rect: { x: number; y: number; width: number; height: number }
  padding?: number
  onNext: () => void
  isDoStep?: boolean
  stepIndex: number
  totalSteps: number
}

export function TooltipBubble({
  title,
  body,
  position,
  rect,
  padding = 12,
  onNext,
  isDoStep,
  stepIndex,
  totalSteps,
}: TooltipBubbleProps) {
  const gap = 16
  const tooltipW = Math.min(280, typeof window !== 'undefined' ? window.innerWidth - 32 : 280)

  let top = 0
  let left = 0

  switch (position) {
    case 'bottom':
      top = rect.y + rect.height + padding + gap
      left = rect.x + rect.width / 2 - tooltipW / 2
      break
    case 'top':
      top = rect.y - padding - gap - 140
      left = rect.x + rect.width / 2 - tooltipW / 2
      break
    case 'right':
      top = rect.y + rect.height / 2 - 70
      left = rect.x + rect.width + padding + gap
      break
    case 'left':
      top = rect.y + rect.height / 2 - 70
      left = rect.x - padding - gap - tooltipW
      break
  }

  if (typeof window !== 'undefined') {
    left = Math.max(16, Math.min(left, window.innerWidth - tooltipW - 16))
  }
  top = Math.max(16, top)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      style={{
        position: 'fixed',
        top,
        left,
        width: tooltipW,
        background: '#fff',
        borderRadius: 16,
        padding: '16px 18px',
        boxShadow: '0 12px 40px rgba(147,51,234,0.2)',
        zIndex: 9999,
        border: '1.5px solid #E9D5FF',
      }}
    >
      <div
        style={{
          fontSize: 10,
          color: '#9333EA',
          fontWeight: 700,
          marginBottom: 6,
          fontFamily: 'Inter, sans-serif',
        }}
      >
        {stepIndex} / {totalSteps}
      </div>
      <div
        style={{
          fontSize: 15,
          fontWeight: 900,
          color: '#2D0A4E',
          marginBottom: body ? 8 : 12,
          fontFamily: 'Inter, sans-serif',
        }}
      >
        {title}
      </div>
      {body && (
        <div
          style={{
            fontSize: 13,
            color: '#6B21A8',
            marginBottom: 12,
            lineHeight: 1.5,
            fontFamily: 'Inter, sans-serif',
          }}
        >
          {body}
        </div>
      )}
      {!isDoStep && (
        <button
          onClick={onNext}
          style={{
            width: '100%',
            padding: '10px 0',
            borderRadius: 10,
            background: 'linear-gradient(135deg, #E8547A, #9333EA)',
            border: 'none',
            color: '#fff',
            fontWeight: 800,
            fontSize: 13,
            cursor: 'pointer',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          Next →
        </button>
      )}
      {isDoStep && (
        <div
          style={{
            fontSize: 12,
            color: '#9333EA',
            fontWeight: 700,
            textAlign: 'center',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          Complete the action above ↑
        </div>
      )}
    </motion.div>
  )
}

/**
 * Live-tracking position hook. Re-computes the target rect on scroll, resize, and
 * any size change of the target element. Returns null while the target is missing.
 */
export function useTooltipPosition(selector: string) {
  const [pos, setPos] = useState<{ x: number; y: number; width: number; height: number } | null>(null)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (!selector) {
      setPos(null)
      return
    }

    const el = document.querySelector(selector)
    if (!el) {
      setPos(null)
      return
    }

    const compute = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect()
        setPos({ x: r.left, y: r.top, width: r.width, height: r.height })
      })
    }

    compute()
    const ro = new ResizeObserver(compute)
    ro.observe(el)
    window.addEventListener('scroll', compute, { passive: true })
    window.addEventListener('resize', compute)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      ro.disconnect()
      window.removeEventListener('scroll', compute)
      window.removeEventListener('resize', compute)
    }
  }, [selector])

  return pos
}
