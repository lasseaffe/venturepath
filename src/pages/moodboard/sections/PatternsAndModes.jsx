import { useTheme } from '../../../context/ThemeContext';
import { moodboard } from '../moodboard.config';
import { SectionShell, CARD } from './SectionShell';

const THEMES = ['default', 'day', 'tactical'];

export function PatternsAndModes() {
  const { theme, setTheme } = useTheme();

  return (
    <SectionShell
      id="modes"
      number="06"
      title="Patterns & Modes"
      lede="Three theme registers, live. The rest of the page repaints when you toggle."
    >
      <div className="p-5 mb-6" style={CARD}>
        <h3 className="text-[10px] uppercase mb-3" style={{ color: 'var(--accent)', fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.25em' }}>Theme</h3>
        <div className="flex flex-wrap gap-2">
          {THEMES.map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              style={{
                background: theme === t ? 'var(--accent)' : 'transparent',
                color: theme === t ? '#0E1012' : 'var(--text-secondary)',
                border: `1px solid ${theme === t ? 'var(--accent)' : 'var(--border)'}`,
                padding: '8px 14px',
                borderRadius: 'var(--radius-card)',
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: 11,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
              }}
            >
              {t === 'default' ? 'Modern Nomad' : t === 'day' ? 'Day · Sandstone' : 'Tactical HUD'}
            </button>
          ))}
        </div>
        <p className="text-[11px] mt-3 italic" style={{ color: 'var(--text-secondary)' }}>
          Sets <code style={{ fontFamily: '"JetBrains Mono", monospace' }}>data-theme</code> on the root element. Persists in localStorage (vp-theme).
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        {moodboard.modes.map((m) => (
          <div key={m.name} className="p-4" style={CARD}>
            <h4 className="text-[12px] font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{m.name}</h4>
            <code className="text-[10px] block mb-2" style={{ color: 'var(--accent)', fontFamily: '"JetBrains Mono", monospace' }}>{m.cssTrigger}</code>
            <p className="text-[11px] italic" style={{ color: 'var(--text-secondary)' }}>{m.intent}</p>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}
