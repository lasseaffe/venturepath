// src/components/onboarding/steps/TerrainStep.jsx
import { ChoiceCard } from '../ChoiceCard'

const OPTIONS = [
  { value: 'mountain',   icon: '🏔️', label: 'Mountain' },
  { value: 'coastal',    icon: '🌊', label: 'Coastal' },
  { value: 'urban',      icon: '🏙️', label: 'Urban' },
  { value: 'wilderness', icon: '🌿', label: 'Wilderness' },
]

export function TerrainStep({ onAnswer, answer }) {
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
