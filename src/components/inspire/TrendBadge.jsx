export default function TrendBadge({ score, label }) {
  if (!score) return null;
  return (
    <span
      title={label}
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 7,
        letterSpacing: '0.15em',
        color: '#E67E22',
        background: 'rgba(230,126,34,0.12)',
        border: '1px solid rgba(230,126,34,0.3)',
        borderRadius: 3,
        padding: '1px 5px',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
      }}
    >
      🔥 TRENDING
    </span>
  );
}
