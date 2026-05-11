// src/components/onboarding/useOnboardingState.ts
import { useState, useCallback } from 'react'
import type { OnboardingState } from './onboarding.types'

const DEFAULT: OnboardingState = {
  mode: 'wizard',
  wizardStep: 0,
  tourStep: 0,
  wizardAnswers: {},
  dismissedBeacons: [],
  completedActions: [],
}

function load(key: string): OnboardingState {
  try {
    const raw = localStorage.getItem(key)
    return raw ? { ...DEFAULT, ...JSON.parse(raw) } : { ...DEFAULT }
  } catch {
    return { ...DEFAULT }
  }
}

function save(key: string, state: OnboardingState) {
  localStorage.setItem(key, JSON.stringify(state))
}

export function useOnboardingState(storageKey: string) {
  const [state, setState] = useState<OnboardingState>(() => load(storageKey))

  const update = useCallback((patch: Partial<OnboardingState>) => {
    setState(prev => {
      const next = { ...prev, ...patch }
      save(storageKey, next)
      return next
    })
  }, [storageKey])

  const advanceWizard = useCallback((answers: Record<string, string | string[]>) => {
    setState(prev => {
      const next = {
        ...prev,
        wizardStep: prev.wizardStep + 1,
        wizardAnswers: { ...prev.wizardAnswers, ...answers },
      }
      save(storageKey, next)
      return next
    })
  }, [storageKey])

  const startTour = useCallback(() => update({ mode: 'tour', tourStep: 0 }), [update])

  const advanceTour = useCallback((completedId: string) => {
    setState(prev => {
      const next = {
        ...prev,
        tourStep: prev.tourStep + 1,
        completedActions: [...prev.completedActions, completedId],
      }
      save(storageKey, next)
      return next
    })
  }, [storageKey])

  const startBeacons = useCallback(() => update({ mode: 'beacons' }), [update])
  const completeTour = useCallback(() => update({ mode: 'done' }), [update])

  const dismissBeacon = useCallback((beaconKey: string) => {
    setState(prev => {
      const next = {
        ...prev,
        dismissedBeacons: [...prev.dismissedBeacons, beaconKey],
      }
      save(storageKey, next)
      return next
    })
  }, [storageKey])

  const reset = useCallback(() => {
    const fresh = { ...DEFAULT }
    save(storageKey, fresh)
    setState(fresh)
  }, [storageKey])

  const skip = useCallback(() => update({ mode: 'done' }), [update])

  return { state, advanceWizard, startTour, advanceTour, startBeacons, completeTour, dismissBeacon, reset, skip }
}
