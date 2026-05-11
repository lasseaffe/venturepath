// src/components/onboarding/OverlayTour.tsx
import { useState, useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Spotlight } from './Spotlight'
import { TooltipBubble } from './TooltipBubble'
import { ActionGate } from './ActionGate'
import { CelebrationOverlay } from './CelebrationOverlay'
import type { OnboardingConfig, OnboardingState } from './onboarding.types'

interface OverlayTourProps {
  config: OnboardingConfig
  state: OnboardingState
  onAdvance: (completedId: string) => void
  onActionComplete?: (id: string) => void
  onComplete?: () => void
}

export function OverlayTour({ config, state, onAdvance, onActionComplete, onComplete }: OverlayTourProps) {
  const { waypoints } = config.tour
  const waypoint = waypoints[state.tourStep]
  const [targetRect, setTargetRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null)
  const [celebration, setCelebration] = useState<{ text: string; subtext?: string; nextId: string } | null>(null)

  useEffect(() => {
    if (!waypoint?.target) {
      setTargetRect(null)
      return
    }
    const el = document.querySelector(waypoint.target)
    if (!el) {
      setTargetRect(null)
      return
    }

    const compute = () => {
      const r = el.getBoundingClientRect()
      setTargetRect({ x: r.left, y: r.top, width: r.width, height: r.height })
    }

    compute()
    const ro = new ResizeObserver(compute)
    ro.observe(el)
    window.addEventListener('scroll', compute, { passive: true })
    window.addEventListener('resize', compute)
    return () => {
      ro.disconnect()
      window.removeEventListener('scroll', compute)
      window.removeEventListener('resize', compute)
    }
  }, [state.tourStep, config])

  if (!waypoint) return null

  const isLast = state.tourStep === waypoints.length - 1

  const handleNext = () => {
    if (isLast && onComplete) {
      onComplete()
      return
    }
    onAdvance(waypoint.id)
  }

  // Capture waypoint fields BEFORE state mutation so async transitions don't read stale values.
  const handleActionComplete = () => {
    const { id, celebrationText } = waypoint
    if (onActionComplete) onActionComplete(id)
    if (celebrationText) {
      setCelebration({ text: celebrationText, nextId: id })
    } else {
      onAdvance(id)
    }
  }

  return (
    <>
      <Spotlight rect={targetRect} />

      <AnimatePresence>
        {celebration && (
          <CelebrationOverlay
            text={celebration.text}
            subtext={celebration.subtext}
            onDone={() => {
              const { nextId } = celebration
              setCelebration(null)
              if (isLast && onComplete) {
                onComplete()
              } else {
                onAdvance(nextId)
              }
            }}
          />
        )}
      </AnimatePresence>

      {!celebration && targetRect && waypoint.type !== 'celebrate' && (
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

      {waypoint.type === 'celebrate' && !celebration && (
        <CelebrationOverlay
          text={waypoint.title}
          subtext={waypoint.body}
          onDone={handleNext}
        />
      )}
    </>
  )
}
