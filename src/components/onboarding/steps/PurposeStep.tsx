// src/components/onboarding/steps/PurposeStep.tsx
import { ChoiceCard } from '../ChoiceCard'
import type { WizardStepProps } from '../onboarding.types'

const OPTIONS = [
  { value: 'scripture', icon: '📖',     label: 'Scripture study' },
  { value: 'prayer',    icon: '🙏',     label: 'Personal prayer' },
  { value: 'family',    icon: '👨‍👩‍👧', label: 'Family history' },
  { value: 'mission',   icon: '✈️',     label: 'Mission prep' },
]

export function PurposeStep({ onAnswer, answer }: WizardStepProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
      {OPTIONS.map((opt, i) => (
        <ChoiceCard
          key={opt.value}
          icon={opt.icon}
          label={opt.label}
          selected={answer === opt.value}
          onClick={() => onAnswer(opt.value)}
          colorIndex={i}
        />
      ))}
    </div>
  )
}
