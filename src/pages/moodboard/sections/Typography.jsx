import { moodboard } from '../moodboard.config';
import { SectionShell, CARD } from './SectionShell';

export function Typography() {
  return (
    <SectionShell id="typography" number="03" title="Typography" lede="Three faces, three roles. Playfair carries weight. Inter carries the chrome. JetBrains Mono carries data.">
      <div className="space-y-5">
        {moodboard.fonts.map((f) => (
          <article key={f.role} className="p-5" style={CARD}>
            <header className="flex flex-wrap items-baseline gap-3 mb-3">
              <h3 className="text-xl" style={{ fontFamily: f.family, color: 'var(--text-primary)' }}>{f.role}</h3>
              <code style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 11, color: 'var(--accent)' }}>{f.family}</code>
            </header>
            <div style={{ fontFamily: f.family, color: 'var(--text-primary)' }}>
              <p style={{ fontSize: 56, lineHeight: 1, marginBottom: 8 }}>Aa</p>
              <p style={{ fontSize: 32, lineHeight: 1.15, fontWeight: 600, marginBottom: 8 }}>{f.specimen}</p>
              <p style={{ fontSize: 14, lineHeight: 1.65 }}>{f.specimen}</p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>0123456789 · °N °S °E °W · 54° 48′ 19″ S</p>
            </div>
          </article>
        ))}
      </div>
    </SectionShell>
  );
}
