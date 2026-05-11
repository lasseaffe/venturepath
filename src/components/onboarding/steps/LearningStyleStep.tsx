// src/components/onboarding/steps/LearningStyleStep.tsx
import { ChoiceCard } from '../ChoiceCard'
import type { WizardStepProps } from '../onboarding.types'

const OPTIONS = [
  { value: 'visual',     icon: '🎨', label: 'Visual' },
  { value: 'structured', icon: '📋', label: 'Structured' },
  { value: 'discussion', icon: '💬', label: 'Discussion' },
  { value: 'self-paced', icon: '🧭', label: 'Self-paced' },
]

export function LearningStyleStep({ onAnswer, answer }: WizardStepProps) {
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
