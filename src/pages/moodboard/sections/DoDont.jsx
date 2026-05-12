import { SectionShell, CARD } from './SectionShell';

// Hand-coded JSX previews mirror the moodboard.config.js doDont declarations.
// Authoring previews as JSX (rather than HTML strings) avoids the need for
// a sanitizer dependency and keeps the moodboard self-contained.

const PAIRS = [
  {
    topic: 'Headings',
    wrong: {
      label: 'Generic sans heading',
      el: <h3 style={{ fontFamily: 'sans-serif', fontWeight: 700, fontSize: 22, color: '#888' }}>My Trip</h3>,
    },
    right: {
      label: 'Playfair editorial',
      el: <h3 style={{ fontFamily: '"Playfair Display", serif', fontSize: 24, fontWeight: 600, color: 'var(--text-primary)' }}>Patagonia Expedition</h3>,
    },
  },
  {
    topic: 'Data display',
    wrong: {
      label: 'Plain inline numbers',
      el: <p style={{ fontFamily: 'sans-serif', color: 'var(--text-secondary)' }}>Latitude -54.8 and longitude -68.3</p>,
    },
    right: {
      label: 'Mono tactical readout',
      el: <p style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 13, color: 'var(--accent)', letterSpacing: 1 }}>LAT -54.8019  LON -68.3030</p>,
    },
  },
  {
    topic: 'CTA in tactical mode',
    wrong: {
      label: 'Soft pill',
      el: <button style={{ background: '#888', color: '#fff', borderRadius: 24, padding: '12px 24px', fontWeight: 600, border: 'none' }}>Send help</button>,
    },
    right: {
      label: 'Tactical amber HUD button',
      el: (
        <button style={{ background: 'transparent', color: '#F2A900', border: '1px solid #F2A900', borderRadius: 4, padding: '10px 18px', fontFamily: '"JetBrains Mono", monospace', letterSpacing: 2, textTransform: 'uppercase', fontSize: 11 }}>
          ⊕ SOS Beacon
        </button>
      ),
    },
  },
];

export function DoDont() {
  return (
    <SectionShell id="dodont" number="08" title="Do / Don't" lede="Off-brand pattern vs Modern Nomad / Tactical-correct.">
      <div className="space-y-5">
        {PAIRS.map((pair) => (
          <article key={pair.topic} className="p-5" style={CARD}>
            <h3 className="text-[12px] uppercase mb-3" style={{ color: 'var(--text-primary)', fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.25em' }}>{pair.topic}</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] uppercase mb-2" style={{ color: 'var(--status-alert)', fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.3em' }}>✗ {pair.wrong.label}</p>
                <div className="p-4" style={{ border: '1px solid var(--status-alert)', background: 'var(--surface)', borderRadius: 'var(--radius-card)' }}>{pair.wrong.el}</div>
              </div>
              <div>
                <p className="text-[10px] uppercase mb-2" style={{ color: 'var(--status-ok)', fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.3em' }}>✓ {pair.right.label}</p>
                <div className="p-4" style={{ border: '1px solid var(--status-ok)', background: 'var(--surface)', borderRadius: 'var(--radius-card)' }}>{pair.right.el}</div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </SectionShell>
  );
}
