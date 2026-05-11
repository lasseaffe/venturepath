// src/components/onboarding/CelebrationOverlay.tsx
import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

interface CelebrationOverlayProps {
  text: string
  subtext?: string
  onDone: () => void
  autoAdvanceMs?: number
}

export function CelebrationOverlay({ text, subtext, onDone, autoAdvanceMs = 2200 }: CelebrationOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const COLORS = ['#E8547A', '#9333EA', '#EAB308', '#38BDF8', '#F0F9FF', '#FDF4FF']
    const particles = Array.from({ length: 120 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      r: Math.random() * 6 + 3,
      d: Math.random() * 120,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      tilt: Math.floor(Math.random() * 10) - 10,
      tiltAngle: 0,
      tiltAngleInc: Math.random() * 0.07 + 0.05,
    }))

    let frame = 0
    let raf: number

    function draw() {
      ctx.clearRect(0, 0, canvas!.width, canvas!.height)
      particles.forEach(p => {
        p.tiltAngle += p.tiltAngleInc
        p.y += (Math.cos(frame / 20 + p.d) + 1 + p.r / 2) * 1.8
        p.x += Math.sin(frame / 10)
        p.tilt = Math.sin(p.tiltAngle) * 12
        if (p.y > canvas!.height) {
          p.x = Math.random() * canvas!.width
          p.y = -20
        }
        ctx.beginPath()
        ctx.lineWidth = p.r / 2
        ctx.strokeStyle = p.color
        ctx.moveTo(p.x + p.tilt + p.r / 4, p.y)
        ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 4)
        ctx.stroke()
      })
      frame++
      raf = requestAnimationFrame(draw)
    }
    draw()

    const t = setTimeout(onDone, autoAdvanceMs)
    return () => { cancelAnimationFrame(raf); clearTimeout(t) }
  }, [onDone, autoAdvanceMs])

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10010, pointerEvents: 'none' }}>
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0 }} />
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 22 }}
          style={{
            background: '#fff',
            borderRadius: 20,
            padding: '28px 36px',
            textAlign: 'center',
            boxShadow: '0 20px 60px rgba(147,51,234,0.25)',
            pointerEvents: 'auto',
            maxWidth: 300,
          }}
        >
          <div style={{ fontSize: 44, marginBottom: 10 }}>✦</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#2D0A4E', fontFamily: 'Inter, sans-serif' }}>
            {text}
          </div>
          {subtext && (
            <div style={{ fontSize: 13, color: '#9333EA', marginTop: 8, fontWeight: 600 }}>
              {subtext}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
