export function DayLoopPanel({ dayLoop, stay, pois, onAddStop }) {
  const orderedStops = dayLoop.stopIds.map(id => pois.find(p => p.id === id)).filter(Boolean);

  const date = new Date(dayLoop.date + 'T00:00:00');
  const dateLabel = date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });

  function StopItem({ name, meta, variant = 'confirmed' }) {
    const borderColor = {
      homebase:  '#5C9A6A',
      confirmed: 'var(--accent)',
      pending:   'rgba(230,126,34,0.3)',
      return:    'rgba(92,154,106,0.2)',
    }[variant];
    return (
      <li role="listitem" style={{
        background: 'var(--surface-raised)',
        borderLeft: `2px solid ${borderColor}`,
        border: `1px solid rgba(242,237,232,0.07)`,
        borderLeftWidth: 2,
        borderLeftColor: borderColor,
        borderRadius: 2,
        padding: '7px 9px',
        opacity: variant === 'return' ? 0.5 : 1,
      }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-primary)', fontWeight: 600 }}>{name}</div>
        {meta && <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.52rem', color: 'var(--text-muted)', marginTop: 2 }}>{meta}</div>}
      </li>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--surface)' }}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(242,237,232,0.07)' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent)' }}>
          {dateLabel}
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.52rem', color: 'var(--text-muted)', marginTop: 1 }}>
          {stay?.name} loop
        </div>
      </div>

      <ul style={{ flex: 1, overflowY: 'auto', padding: 6, display: 'flex', flexDirection: 'column', gap: 4, listStyle: 'none', margin: 0 }}>
        {stay && <StopItem name={stay.name} meta="Homebase" variant="homebase" />}
        {orderedStops.map(stop => (
          <StopItem key={stop.id} name={stop.name} meta={stop.category} variant="confirmed" />
        ))}
        {stay && <StopItem name={`Return to ${stay.name}`} meta="auto-leg" variant="return" />}
      </ul>

      <button
        onClick={onAddStop}
        style={{
          margin: 8,
          border: '1px dashed rgba(230,126,34,0.35)',
          borderRadius: 2,
          padding: 7,
          textAlign: 'center',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.58rem',
          color: 'var(--accent)',
          background: 'transparent',
          cursor: 'pointer',
        }}
      >
        + Add Stop to {dateLabel}
      </button>
    </div>
  );
}
