export function SectionShell({ id, number, title, lede, children }) {
  return (
    <section id={id} className="scroll-mt-24 py-10" style={{ borderTop: '1px solid var(--border)' }}>
      <header className="mb-6">
        <p
          className="text-[10px] uppercase"
          style={{ color: 'var(--accent)', fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.3em' }}
        >
          §{number}
        </p>
        <h2
          className="mt-1"
          style={{ fontFamily: '"Playfair Display", serif', fontSize: '32px', color: 'var(--text-primary)', letterSpacing: '-0.01em' }}
        >
          {title}
        </h2>
        {lede && (
          <p className="mt-2 max-w-2xl text-[14px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {lede}
          </p>
        )}
      </header>
      {children}
    </section>
  );
}

export const CARD = {
  background: 'var(--surface-raised)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-card)',
};
