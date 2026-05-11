// src/components/onboarding/OnboardingEngine.jsx
import { AnimatePresence } from 'framer-motion'
import { useOnboardingState } from './useOnboardingState'
import { WizardShell } from './WizardShell'
import { OverlayTour } from './OverlayTour'
import { BeaconManager } from './FeatureBeacon'

export function OnboardingEngine({ config }) {
  const { state, advanceWizard, startTour, advanceTour, startBeacons, completeTour, dismissBeacon, skip } = useOnboardingState(config.theme.storageKey)

  if (state.mode === 'done') return null

  const handleWizardAnswer = (answers) => {
    if (state.wizardStep >= config.wizard.steps.length - 1) {
      advanceWizard(answers)
      startTour()
    } else {
      advanceWizard(answers)
    }
  }

  const handleTourAdvance = (completedId) => {
    const nextStep = state.tourStep + 1
    if (nextStep >= config.tour.waypoints.length) {
      if (config.beacons.length > 0) startBeacons()
      else completeTour()
    } else {
      advanceTour(completedId)
    }
  }

  const handleTourComplete = () => {
    if (config.beacons.length > 0) startBeacons()
    else completeTour()
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
          onComplete={handleTourComplete}
          onSkip={skip}
        />
      )}
      {state.mode === 'beacons' && (
        <BeaconManager
          key="beacons"
          beacons={config.beacons}
          dismissedKeys={state.dismissedBeacons}
          onDismiss={dismissBeacon}
        />
      )}
    </AnimatePresence>
  )
}
