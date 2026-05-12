import { moodboard } from '../moodboard.config';
import { SectionShell, CARD } from './SectionShell';

export function Identity() {
  const { identity } = moodboard;
  return (
    <SectionShell id="identity" number="01" title="Identity" lede={identity.tagline}>
      <div className="p-6 max-w-3xl" style={CARD}>
        <p style={{ fontFamily: '"Playfair Display", serif', fontSize: 18, lineHeight: 1.65, color: 'var(--text-primary)' }}>
          {identity.philosophy}
        </p>
        <hr className="my-5" style={{ border: 'none', borderTop: '1px solid var(--border)' }} />
        <ul className="space-y-2 list-none">
          {identity.pillars.map((p) => (
            <li key={p} className="flex items-baseline gap-3 text-[14px]" style={{ color: 'var(--text-primary)' }}>
              <span style={{ color: 'var(--accent)', fontFamily: '"JetBrains Mono", monospace' }}>⊕</span>
              <span>{p}</span>
            </li>
          ))}
        </ul>
      </div>
    </SectionShell>
  );
}
