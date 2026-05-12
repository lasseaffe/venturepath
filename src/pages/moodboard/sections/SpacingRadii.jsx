import { moodboard } from '../moodboard.config';
import { SectionShell, CARD } from './SectionShell';

export function SpacingRadii() {
  return (
    <SectionShell id="spacing" number="04" title="Spacing & Radii" lede="Sharp by default — editorial precision. Soft only in Day mode and Tactical cards.">
      <div className="grid md:grid-cols-2 gap-6">
        <div className="p-5" style={CARD}>
          <h3 className="text-[10px] uppercase mb-3" style={{ color: 'var(--accent)', fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.25em' }}>Spacing scale (px)</h3>
          <div className="space-y-2">
            {moodboard.spacing.scale.map((px) => (
              <div key={px} className="flex items-center gap-3 text-[12px]" style={{ color: 'var(--text-primary)' }}>
                <span className="w-10 text-right" style={{ color: 'var(--text-muted)', fontFamily: '"JetBrains Mono", monospace' }}>{px}px</span>
                <span className="block h-3" style={{ width: Math.max(px, 1), background: 'var(--accent)' }} />
              </div>
            ))}
          </div>
        </div>

        <div className="p-5" style={CARD}>
          <h3 className="text-[10px] uppercase mb-3" style={{ color: 'var(--accent)', fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.25em' }}>Radii</h3>
          <div className="space-y-3">
            {moodboard.spacing.radii.map((r) => (
              <div key={r.name} className="flex items-center gap-4">
                <span className="block w-16 h-16 shrink-0" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: r.value }} />
                <div>
                  <p className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{r.name} · {r.value}</p>
                  <p className="text-[11px] italic" style={{ color: 'var(--text-secondary)' }}>{r.note}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SectionShell>
  );
}
