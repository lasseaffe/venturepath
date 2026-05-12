const LABELS = { fastest: 'Fastest', 'toll-free': 'Toll-free', scenic: 'Scenic' };

export function RouteVariantPicker({ routeVariants = [], activeVariant, onSelect }) {
  const fastest = routeVariants.find(v => v.variant === 'fastest');

  return (
    <div style={{ fontFamily: 'JetBrains Mono, monospace', display: 'flex', gap: 8 }}>
      {routeVariants.map(v => {
        const isActive = v.variant === activeVariant;
        const deltaMin = fastest && v.variant !== 'fastest'
          ? Math.round((v.durationH - fastest.durationH) * 60)
          : null;

        return (
          <button
            key={v.variant}
            onClick={() => onSelect(v.variant)}
            aria-pressed={isActive}
            style={{
              flex: 1,
              padding: '8px 12px',
              background: isActive ? '#E67E22' : '#1a1a1a',
              color: isActive ? '#0E1012' : '#D9C5B2',
              border: isActive ? '2px solid #E67E22' : '1px solid #333',
              borderRadius: 4,
              fontFamily: 'inherit',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <div style={{ fontWeight: 600 }}>{LABELS[v.variant] ?? v.variant}</div>
            {deltaMin != null && (
              <div style={{ fontSize: '0.7rem', marginTop: 2 }}>
                +{deltaMin} min
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
