// src/components/onboarding/steps/DailyTimeStep.tsx
import { ChoiceCard } from '../ChoiceCard'
import type { WizardStepProps } from '../onboarding.types'

const OPTIONS = [
  { value: '5min',  icon: '⚡',  label: '5 min' },
  { value: '15min', icon: '☕',  label: '15 min' },
  { value: '30min', icon: '📚',  label: '30 min' },
  { value: '60min', icon: '🕐',  label: '60 min' },
]

export function DailyTimeStep({ onAnswer, answer }: WizardStepProps) {
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
