// src/components/onboarding/OnboardingEngine.tsx
import { AnimatePresence } from 'framer-motion'
import { useOnboardingState } from './useOnboardingState'
import { WizardShell } from './WizardShell'
import { OverlayTour } from './OverlayTour'
import { BeaconManager } from './FeatureBeacon'
import type { OnboardingConfig } from './onboarding.types'

interface OnboardingEngineProps {
  config: OnboardingConfig
}

export function OnboardingEngine({ config }: OnboardingEngineProps) {
  const {
    state,
    advanceWizard,
    startTour,
    advanceTour,
    startBeacons,
    completeTour,
    dismissBeacon,
    skip,
  } = useOnboardingState(config.theme.storageKey)

  if (state.mode === 'done') return null

  const handleWizardAnswer = (answers: Record<string, string | string[]>) => {
    const lastStep = state.wizardStep >= config.wizard.steps.length - 1
    advanceWizard(answers)
    if (lastStep) {
      if (config.tour.waypoints.length > 0) {
        startTour()
      } else if (config.beacons.length > 0) {
        startBeacons()
      } else {
        completeTour()
      }
    }
  }

  const handleTourAdvance = (completedId: string) => {
    const nextStep = state.tourStep + 1
    if (nextStep >= config.tour.waypoints.length) {
      if (config.beacons.length > 0) {
        startBeacons()
      } else {
        completeTour()
      }
    } else {
      advanceTour(completedId)
    }
  }

  const handleActionComplete = (_id: string) => {
    // Surfaced for instrumentation; no-op for now (OverlayTour drives advancement).
  }

  return (
    <AnimatePresence mode="wait">
      {state.mode === 'wizard' && (
        <WizardShell
          key="wizard"
          config={config}
          state={state}
          onAnswer={handleWizardAnswer}
          onSkip={skip}
        />
      )}
      {state.mode === 'tour' && (
        <OverlayTour
          key="tour"
          config={config}
          state={state}
          onAdvance={handleTourAdvance}
          onActionComplete={handleActionComplete}
          onComplete={() => {
            if (config.beacons.length > 0) startBeacons()
            else completeTour()
          }}
        />
      )}
      {state.mode === 'beacons' && (
        <BeaconManager
          key="beacons"
          beacons={config.beacons}
          dismissedKeys={state.dismissedBeacons}
          onDismiss={dismissBeacon}
          theme={config.theme}
        />
      )}
    </AnimatePresence>
  )
}
