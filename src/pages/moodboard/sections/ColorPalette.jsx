import { useEffect, useState } from 'react';
import { moodboard } from '../moodboard.config';
import { readCssVar, resolveToHex } from '../lib/readCssVar';
import { SectionShell, CARD } from './SectionShell';

export function ColorPalette() {
  const [resolved, setResolved] = useState({});
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const obs = new MutationObserver(() => setTick((n) => n + 1));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const next = {};
    for (const t of moodboard.colors) {
      next[t.cssVar] = { hex: resolveToHex(t.cssVar), raw: readCssVar(t.cssVar) };
    }
    setResolved(next);
  }, [tick]);

  return (
    <SectionShell
      id="color"
      number="02"
      title="Color"
      lede="Swatches read live from index.css. Switch theme in Patterns & Modes — these repaint."
    >
      <div className="mb-6">
        <h3 className="text-[10px] uppercase mb-3" style={{ color: 'var(--accent)', fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.25em' }}>
          Semantic tokens (theme-aware)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {moodboard.colors.map((t) => {
            const r = resolved[t.cssVar];
            return (
              <div key={t.cssVar} className="flex gap-3 items-stretch overflow-hidden" style={CARD}>
                <div className="w-20 shrink-0" style={{ background: `var(${t.cssVar})` }} />
                <div className="p-3 flex-1 min-w-0">
                  <p className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>{t.name}</p>
                  <p className="text-[10px] truncate" style={{ color: 'var(--text-muted)', fontFamily: '"JetBrains Mono", monospace' }}>{t.cssVar}</p>
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)', fontFamily: '"JetBrains Mono", monospace' }}>{r?.hex ?? r?.raw ?? '…'}</p>
                  <p className="text-[10px] mt-1 italic" style={{ color: 'var(--text-secondary)' }}>{t.usage}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="text-[10px] uppercase mb-3" style={{ color: 'var(--accent)', fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.25em' }}>
          Brand constants (Tailwind)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {moodboard.brandHex.map((b) => (
            <div key={b.name} className="flex gap-3 items-stretch overflow-hidden" style={CARD}>
              <div className="w-20 shrink-0" style={{ background: b.hex }} />
              <div className="p-3 flex-1 min-w-0">
                <p className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>{b.name}</p>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)', fontFamily: '"JetBrains Mono", monospace' }}>{b.hex}</p>
                <p className="text-[10px] mt-1 italic" style={{ color: 'var(--text-secondary)' }}>{b.usage}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </SectionShell>
  );
}
