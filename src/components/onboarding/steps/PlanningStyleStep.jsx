// src/components/onboarding/steps/PlanningStyleStep.jsx
import { ChoiceCard } from '../ChoiceCard'

const OPTIONS = [
  { value: 'wing-it',    icon: '🎲', label: 'Wing it' },
  { value: 'balanced',   icon: '⚖️', label: 'Balanced' },
  { value: 'structured', icon: '📋', label: 'Structured' },
  { value: 'tactical',   icon: '🔭', label: 'Tactical' },
]

export function PlanningStyleStep({ onAnswer, answer }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
      {OPTIONS.map(opt => (
        <ChoiceCard
          key={opt.value}
          icon={opt.icon}
          label={opt.label}
          selected={answer === opt.value}
          onClick={() => onAnswer(opt.value)}
        />
      ))}
    </div>
  )
}
