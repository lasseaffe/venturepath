// src/components/onboarding/ChoiceCard.tsx
import { motion } from 'framer-motion'
import { MOTION_PRESETS } from './onboarding.motion'

const CARD_COLORS = [
  { border: '#FECDD3', selectedBorder: '#E8547A', selectedBg: '#FFF0F3', shadow: 'rgba(232,84,122,0.2)', label: '#9F1239' },
  { border: '#E9D5FF', selectedBorder: '#9333EA', selectedBg: '#F5F0FF', shadow: 'rgba(147,51,234,0.2)',  label: '#581C87' },
  { border: '#FEF08A', selectedBorder: '#EAB308', selectedBg: '#FEFCE8', shadow: 'rgba(234,179,8,0.2)',   label: '#713F12' },
  { border: '#BAE6FD', selectedBorder: '#38BDF8', selectedBg: '#F0F9FF', shadow: 'rgba(56,189,248,0.2)',  label: '#0C4A6E' },
]

interface ChoiceCardProps {
  icon: string
  label: string
  selected: boolean
  onClick: () => void
  colorIndex: number // 0–3 maps to rose/purple/gold/blue
}

export function ChoiceCard({ icon, label, selected, onClick, colorIndex }: ChoiceCardProps) {
  const preset = MOTION_PRESETS.snappy
  const colors = CARD_COLORS[colorIndex % 4]

  return (
    <motion.button
      variants={preset.cardVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      whileHover={preset.cardHover}
      whileTap={selected ? preset.cardSelect : { scale: 0.98 }}
      onClick={onClick}
      style={{
        background: selected ? colors.selectedBg : '#ffffff',
        border: `2px solid ${selected ? colors.selectedBorder : colors.border}`,
        borderRadius: 14,
        padding: '16px 10px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        cursor: 'pointer',
        boxShadow: selected ? `0 6px 20px ${colors.shadow}` : '0 2px 8px rgba(0,0,0,0.06)',
        transition: 'background 0.18s, border-color 0.18s, box-shadow 0.18s',
      }}
      aria-pressed={selected}
    >
      <span style={{ fontSize: 32, lineHeight: 1 }}>{icon}</span>
      <span style={{
        fontSize: 11,
        fontWeight: 800,
        textAlign: 'center',
        color: selected ? colors.selectedBorder : colors.label,
        fontFamily: 'Inter, system-ui, sans-serif',
        lineHeight: 1.3,
      }}>
        {label}
      </span>
    </motion.button>
  )
}
