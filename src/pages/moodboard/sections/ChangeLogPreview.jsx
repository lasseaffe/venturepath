import logText from '../../../../docs/moodboard.log.md?raw';
import { parseMoodboardLog } from '../lib/parseMoodboardLog';
import { SectionShell, CARD } from './SectionShell';

export function ChangeLogPreview() {
  const entries = parseMoodboardLog(logText, 5);
  return (
    <SectionShell id="changelog" number="11" title="Change Log" lede="Latest entries from docs/moodboard.log.md. Each entry pairs what changed with what to revisit.">
      {entries.length === 0 ? (
        <div className="p-5 text-[14px] italic" style={{ ...CARD, color: 'var(--text-secondary)' }}>
          No entries yet. Add the first one in <code style={{ fontFamily: '"JetBrains Mono", monospace', color: 'var(--accent)' }}>docs/moodboard.log.md</code>.
        </div>
      ) : (
        <div className="space-y-4">
          {entries.map((e, i) => (
            <article key={`${e.date}-${i}`} className="p-5" style={CARD}>
              <header className="flex items-baseline justify-between mb-3 gap-3">
                <h3 className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>{e.title}</h3>
                <code className="text-[10px] shrink-0" style={{ color: 'var(--accent)', fontFamily: '"JetBrains Mono", monospace' }}>{e.date}</code>
              </header>
              {e.changed.length > 0 && (
                <div className="mb-3">
                  <p className="text-[10px] uppercase mb-1" style={{ color: 'var(--status-ok)', fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.3em' }}>Changed</p>
                  <ul className="space-y-1">{e.changed.map((c, j) => <li key={j} className="text-[13px]" style={{ color: 'var(--text-primary)' }}>· {c}</li>)}</ul>
                </div>
              )}
              {e.ideas.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase mb-1" style={{ color: 'var(--status-warn)', fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.3em' }}>Ideas / next steps</p>
                  <ul className="space-y-1">{e.ideas.map((c, j) => <li key={j} className="text-[13px] italic" style={{ color: 'var(--text-secondary)' }}>· {c}</li>)}</ul>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </SectionShell>
  );
}
