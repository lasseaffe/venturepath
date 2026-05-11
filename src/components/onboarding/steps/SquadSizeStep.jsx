// src/components/onboarding/steps/SquadSizeStep.jsx
import { ChoiceCard } from '../ChoiceCard'

const OPTIONS = [
  { value: 'solo',    icon: '🧑',  label: 'Solo' },
  { value: 'partner', icon: '👫',  label: 'Partner' },
  { value: 'squad',   icon: '👥',  label: 'Small squad' },
  { value: 'group',   icon: '🪖',  label: 'Full group' },
]

export function SquadSizeStep({ onAnswer, answer }) {
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
