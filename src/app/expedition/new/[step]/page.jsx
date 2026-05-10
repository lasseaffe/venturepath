// src/app/expedition/new/[step]/page.jsx
'use client'

import { useRouter } from 'next/navigation'
import WizardShell from '@/components/wizard/WizardShell'
import WelcomeStep from '@/components/wizard/WelcomeStep'
import DestinationStep from '@/components/wizard/DestinationStep'
import SquadStep from '@/components/wizard/SquadStep'
import TransportStep from '@/components/wizard/TransportStep'
import AccommodationStep from '@/components/wizard/AccommodationStep'
import StopsStep from '@/components/wizard/StopsStep'
import ItineraryGridStep from '@/components/wizard/ItineraryGridStep'
import BudgetStep from '@/components/wizard/BudgetStep'
import PackingStep from '@/components/wizard/PackingStep'
import ReadinessStep from '@/components/wizard/ReadinessStep'

const STEPS = [
  'welcome', 'destination', 'squad', 'transport',
  'accommodation', 'stops', 'itinerary', 'budget', 'packing', 'readiness'
]

const STEP_COMPONENTS = {
  welcome: WelcomeStep,
  destination: DestinationStep,
  squad: SquadStep,
  transport: TransportStep,
  accommodation: AccommodationStep,
  stops: StopsStep,
  itinerary: ItineraryGridStep,
  budget: BudgetStep,
  packing: PackingStep,
  readiness: ReadinessStep,
}

export default function WizardPage({ params }) {
  const router = useRouter()
  const step = params.step
  const currentIndex = STEPS.indexOf(step)

  if (currentIndex === -1) {
    router.replace('/expedition/new/welcome')
    return null
  }

  const StepComponent = STEP_COMPONENTS[step]

  const goNext = () => {
    if (currentIndex < STEPS.length - 1) {
      router.push(`/expedition/new/${STEPS[currentIndex + 1]}`)
    }
  }

  const goBack = () => {
    if (currentIndex > 0) {
      router.push(`/expedition/new/${STEPS[currentIndex - 1]}`)
    }
  }

  return (
    <WizardShell
      currentStep={step}
      onBack={goBack}
      onContinue={goNext}
    >
      <StepComponent onNext={goNext} />
    </WizardShell>
  )
}
