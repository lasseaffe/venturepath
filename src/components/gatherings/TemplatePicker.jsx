// VenturePath · Phase 2 · Gathering template picker
import { TEMPLATES } from '../../lib/gatherings/templates';

export default function TemplatePicker({ selected, onSelect }) {
  return (
    <div>
      <div style={{ fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 12, fontFamily: "'JetBrains Mono', monospace" }}>
        CHOOSE A GATHERING ARCHETYPE
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 }}>
        {TEMPLATES.map(t => {
          const isSelected = selected === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onSelect(t.id)}
              style={{
                background: isSelected ? `${t.accentColor}18` : 'rgba(255,255,255,0.03)',
                border: `1.5px solid ${isSelected ? t.accentColor : 'rgba(255,255,255,0.1)'}`,
                color: isSelected ? t.accentColor : 'rgba(255,255,255,0.6)',
                fontFamily: "'JetBrains Mono', monospace",
                padding: '14px 10px',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ fontSize: 22, marginBottom: 6 }}>{t.icon}</div>
              <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>
                {t.label}
              </div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 4, lineHeight: 1.3 }}>
                {t.vibePrompt}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
