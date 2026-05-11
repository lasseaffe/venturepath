// src/components/onboarding/OverlayTour.jsx
import { useState, useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Spotlight } from './Spotlight'
import { TooltipBubble } from './TooltipBubble'
import { ActionGate } from './ActionGate'
import { CelebrationOverlay } from './CelebrationOverlay'

export function OverlayTour({ config, state, onAdvance, onComplete, onSkip }) {
  const { waypoints } = config.tour
  const waypoint = waypoints[state.tourStep]
  const [targetRect, setTargetRect] = useState(null)
  const [showCelebration, setShowCelebration] = useState(false)

  useEffect(() => {
    if (!waypoint?.target) { setTargetRect(null); return }
    const el = document.querySelector(waypoint.target)
    if (!el) { setTargetRect(null); return }
    const r = el.getBoundingClientRect()
    setTargetRect({ x: r.left, y: r.top, width: r.width, height: r.height })

    const observer = new ResizeObserver(() => {
      const r2 = el.getBoundingClientRect()
      setTargetRect({ x: r2.left, y: r2.top, width: r2.width, height: r2.height })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [state.tourStep, config])

  if (!waypoint) return null

  const isLast = state.tourStep === waypoints.length - 1

  const handleNext = () => {
    if (isLast) { onComplete(); return }
    onAdvance(waypoint.id)
  }

  const handleActionComplete = () => {
    if (waypoint.celebrationText) {
      setShowCelebration(true)
    } else {
      handleNext()
    }
  }

  return (
    <>
      <Spotlight rect={targetRect} />

      {/* Always-visible skip button */}
      <button
        onClick={onSkip}
        style={{
          position: 'fixed', top: 14, right: 16, zIndex: 10000,
          fontSize: 10, fontWeight: 700, letterSpacing: 1,
          color: '#4A7C59', background: 'none', border: 'none',
          cursor: 'pointer', fontFamily: '"JetBrains Mono", monospace',
        }}
      >
        [SKIP]
      </button>

      <AnimatePresence>
        {showCelebration && (
          <CelebrationOverlay
            text={waypoint.celebrationText}
            onDone={() => { setShowCelebration(false); handleNext() }}
          />
        )}
      </AnimatePresence>

      {!showCelebration && targetRect && (
        <TooltipBubble
          title={waypoint.title}
          body={waypoint.body}
          position={waypoint.position ?? 'bottom'}
          rect={targetRect}
          onNext={handleNext}
          isDoStep={waypoint.type === 'do'}
          stepIndex={state.tourStep + 1}
          totalSteps={waypoints.length}
        />
      )}

      {waypoint.type === 'do' && waypoint.completeOn && (
        <ActionGate completeOn={waypoint.completeOn} onComplete={handleActionComplete} />
      )}

      {waypoint.type === 'celebrate' && (
        <CelebrationOverlay
          text={waypoint.title}
          subtext={waypoint.body}
          onDone={handleNext}
        />
      )}
    </>
  )
}
