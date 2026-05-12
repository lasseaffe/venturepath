import { useState } from 'react';

export function CascadeConfirmSheet({ previews, stopName, onApply, onDiscard, dispatch }) {
  const [selected, setSelected] = useState(() => new Set(Object.keys(previews)));

  function toggle(key) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function applyAll() {
    Object.entries(previews).forEach(([key, p]) => {
      if (selected.has(key)) p.apply(dispatch);
    });
    onApply();
  }

  return (
    <div style={{
      background: 'var(--surface-raised)',
      border: '1px solid rgba(230,126,34,0.3)',
      borderRadius: 2,
      padding: '12px 14px',
    }}>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--accent)', fontWeight: 700, marginBottom: 10 }}>
        ⚡ Semi-Auto Preview — &quot;{stopName}&quot; added
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, marginBottom: 10 }}>
        {Object.entries(previews).map(([key, p]) => (
          <button
            key={key}
            onClick={() => toggle(key)}
            style={{
              background: selected.has(key) ? 'rgba(230,126,34,0.08)' : 'var(--surface)',
              border: selected.has(key) ? '1px solid rgba(230,126,34,0.35)' : '1px solid rgba(242,237,232,0.07)',
              borderRadius: 2,
              padding: '7px 8px',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-secondary)' }}>{p.label}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-primary)', fontWeight: 700, marginTop: 2 }}>{p.value}</div>
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button
          onClick={applyAll}
          style={{ background: 'var(--accent)', color: '#0A0B0C', fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 700, padding: '5px 14px', borderRadius: 2, border: 'none', cursor: 'pointer' }}
        >
          Apply all changes
        </button>
        <button
          onClick={onDiscard}
          style={{ background: 'transparent', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '0.6rem', padding: '5px 10px', border: '1px solid rgba(242,237,232,0.12)', borderRadius: 2, cursor: 'pointer' }}
        >
          Discard
        </button>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.52rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
          or apply individually ↑
        </span>
      </div>
    </div>
  );
}
