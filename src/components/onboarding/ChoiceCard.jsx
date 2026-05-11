// src/components/onboarding/ChoiceCard.jsx

export function ChoiceCard({ icon, label, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      className="vp-terminal-card"
      style={{
        background: selected ? '#1a2b14' : '#111A0E',
        border: `1.5px solid ${selected ? '#E67E22' : '#2a3a22'}`,
        borderRadius: 10,
        padding: '14px 10px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        cursor: 'pointer',
        position: 'relative',
        fontFamily: '"JetBrains Mono", monospace',
        boxShadow: selected ? '0 0 12px rgba(230,126,34,0.3)' : 'none',
        /* CSS steps(3,end) applied via stylesheet class below */
        transition: 'all 0.12s steps(3, end)',
      }}
      aria-pressed={selected}
    >
      {selected && (
        <span style={{
          position: 'absolute',
          top: 6,
          right: 8,
          fontSize: 8,
          fontWeight: 700,
          color: '#E67E22',
          fontFamily: '"JetBrains Mono", monospace',
          letterSpacing: 1,
        }}>
          [SELECTED]
        </span>
      )}
      <span style={{ fontSize: 28, lineHeight: 1 }}>{icon}</span>
      <span style={{
        fontSize: 10,
        fontWeight: 700,
        color: selected ? '#E8F5E0' : '#8FAF80',
        textAlign: 'center',
        fontFamily: '"JetBrains Mono", monospace',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
      }}>
        {label}
      </span>
    </button>
  )
}
