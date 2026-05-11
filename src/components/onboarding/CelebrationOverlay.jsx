// src/components/onboarding/CelebrationOverlay.jsx
import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

export function CelebrationOverlay({ text, subtext, onDone, autoAdvanceMs = 2400 }) {
  const [displayed, setDisplayed] = useState('')
  const fullText = `> ${text.toUpperCase()}.`
  const onDoneRef = useRef(onDone)
  useEffect(() => { onDoneRef.current = onDone })

  useEffect(() => {
    setDisplayed('')
    let i = 0
    const interval = setInterval(() => {
      i++
      setDisplayed(fullText.slice(0, i))
      if (i >= fullText.length) clearInterval(interval)
    }, 38)
    return () => clearInterval(interval)
  }, [fullText])

  useEffect(() => {
    const t = setTimeout(() => onDoneRef.current(), autoAdvanceMs)
    return () => clearTimeout(t)
  }, [autoAdvanceMs])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.05 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 10010,
        background: '#050805',
        display: 'flex', flexDirection: 'column',
        alignItems: 'flex-start', justifyContent: 'center',
        padding: '0 32px',
        fontFamily: '"JetBrains Mono", monospace',
      }}
    >
      <div style={{ color: '#4A7C59', fontSize: 11, marginBottom: 16, letterSpacing: 1 }}>
        // EXPEDITION LOG
      </div>
      <div style={{
        color: '#E67E22',
        fontSize: 18,
        fontWeight: 700,
        letterSpacing: 1,
        minHeight: 28,
      }}>
        {displayed}
        <motion.span
          animate={{ opacity: [1, 0, 1] }}
          transition={{ duration: 0.8, repeat: Infinity }}
          style={{ color: '#E67E22' }}
        >
          _
        </motion.span>
      </div>
      {subtext && displayed.length >= fullText.length && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          style={{ color: '#8FAF80', fontSize: 12, marginTop: 12, maxWidth: 340 }}
        >
          {subtext}
        </motion.div>
      )}
    </motion.div>
  )
}
