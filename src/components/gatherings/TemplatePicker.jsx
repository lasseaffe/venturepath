import { TEMPLATES } from '../../lib/gatherings/templates.js';

export default function TemplatePicker({ onSelect }) {
  return (
    <div>
      <div style={{ color: '#888', fontSize: '0.65rem', letterSpacing: '0.15em', marginBottom: '1rem' }}>CHOOSE A TEMPLATE</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.5rem' }}>
        {Object.values(TEMPLATES).map(tpl => (
          <button
            key={tpl.id}
            onClick={() => onSelect(tpl.id)}
            style={{
              background: '#1a1a1a', border: `1px solid #333`, padding: '1rem',
              cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace', textAlign: 'center',
              color: '#D9C5B2', transition: 'border-color 0.15s, color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = tpl.accent; e.currentTarget.style.color = tpl.accent; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.color = '#D9C5B2'; }}
          >
            <div style={{ fontSize: '0.65rem', letterSpacing: '0.1em', marginBottom: '0.3rem' }}>{tpl.label.toUpperCase()}</div>
            <div style={{ fontSize: '0.6rem', color: '#666', lineHeight: 1.4 }}>{tpl.vibePrompt}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
