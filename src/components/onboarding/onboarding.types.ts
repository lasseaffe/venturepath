// src/components/onboarding/onboarding.types.ts

export interface OnboardingTheme {
  motion: 'smooth' | 'snappy' | 'terminal'
  accent: string
  bg: string
  surface: string
  text: string
  textMuted: string
  storageKey: string
  colors?: {
    rose: string
    purple: string
    gold: string
    blue: string
  }
}

export interface WizardStepProps {
  onAnswer: (answer: string | string[]) => void
  answer: string | string[] | undefined
  theme: OnboardingTheme
}

export interface OnboardingWizardStep {
  id: string
  component: React.ComponentType<WizardStepProps>
  title: string
}

export interface OnboardingTourWaypoint {
  id: string
  type: 'demo' | 'do' | 'celebrate'
  target: string
  title: string
  body?: string
  position?: 'top' | 'bottom' | 'left' | 'right'
  completeOn?: string
  celebrationText?: string
}

export interface OnboardingBeacon {
  id: string
  target: string
  label: string
  key: string
}

export interface OnboardingConfig {
  theme: OnboardingTheme
  wizard: { steps: OnboardingWizardStep[] }
  tour: { waypoints: OnboardingTourWaypoint[] }
  beacons: OnboardingBeacon[]
}

export interface OnboardingState {
  mode: 'wizard' | 'tour' | 'beacons' | 'done'
  wizardStep: number
  tourStep: number
  wizardAnswers: Record<string, string | string[]>
  dismissedBeacons: string[]
  completedActions: string[]
}
