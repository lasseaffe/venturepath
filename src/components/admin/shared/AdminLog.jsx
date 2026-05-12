const COLOR = {
  done:  '#E67E22',
  error: '#E74C3C',
  start: '#5B8DB8',
  item:  '#D9C5B2',
};

export default function AdminLog({ lines }) {
  return (
    <div style={{
      background: '#0A0D0F',
      border: '1px solid #1C2025',
      borderRadius: 4,
      maxHeight: 380,
      overflowY: 'auto',
      padding: '8px 12px',
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: 12,
    }}>
      {lines.length === 0 && (
        <span style={{ color: '#4A5568' }}>Awaiting operation…</span>
      )}
      {lines.map((line, i) => (
        <div key={i} style={{ color: COLOR[line.type] ?? '#D9C5B2', marginBottom: 2 }}>
          <span style={{ color: '#4A5568', marginRight: 8 }}>
            {line.ts.slice(11, 19)}
          </span>
          {line.message}
        </div>
      ))}
    </div>
  );
}
