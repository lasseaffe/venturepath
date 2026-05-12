import { useState } from 'react';

const DEFAULT_ITEMS = [
  { id: 1, name: 'Passport',     category: 'Docs',  packed: false, remindBy: '2026-04-20T17:00' },
  { id: 2, name: 'Camera Gear',  category: 'Tech',  packed: false },
  { id: 3, name: 'Hiking Boots', category: 'Gear',  packed: true  },
  { id: 4, name: 'Power Bank',   category: 'Tech',  packed: false, remindBy: '2026-04-21T09:00' },
];

export default function PackingEngine() {
  const [items, setItems] = useState(DEFAULT_ITEMS);

  const toggle = (id) => setItems(prev =>
    prev.map(i => i.id === id ? { ...i, packed: !i.packed } : i)
  );

  const pct = Math.round((items.filter(i => i.packed).length / items.length) * 100);
  const pending = items.filter(i => !i.packed);
  const stowed  = items.filter(i => i.packed);

  return (
    <div className="tactical-panel p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="label-tag">Expedition Manifest</h2>
        <span className="text-[10px] font-mono text-[#E67E22]">{pct}% stowed</span>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-[#1e2328] rounded-full overflow-hidden">
        <div
          className="h-full bg-[#E67E22] rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Pending */}
      {pending.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[9px] font-mono text-[var(--text-muted)] tracking-widest">PENDING STOWAGE</div>
          {pending.map(item => (
            <div
              key={item.id}
              className="flex items-center justify-between bg-[#0E1012] rounded px-3 py-2 border border-[#1e2328]"
            >
              <div>
                <div className="text-sm text-white font-mono">{item.name}</div>
                {item.remindBy && (
                  <div className="text-[9px] font-mono text-[#E67E22] mt-0.5">
                    REMIND: {new Date(item.remindBy).toLocaleDateString()}
                  </div>
                )}
              </div>
              <button
                onClick={() => toggle(item.id)}
                className="text-[9px] font-mono px-3 py-1 border border-[#E67E22]/50 text-[#E67E22] rounded hover:bg-[#E67E22]/10 transition-colors tracking-widest"
              >
                STOW
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Stowed */}
      {stowed.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[9px] font-mono text-[var(--text-muted)] tracking-widest">STOWED GEAR</div>
          {stowed.map(item => (
            <div
              key={item.id}
              className="flex items-center justify-between bg-[#0E1012] rounded px-3 py-2 border border-[#1e2328] opacity-40"
            >
              <div className="text-sm text-[var(--text-muted)] font-mono line-through">{item.name}</div>
              <button
                onClick={() => toggle(item.id)}
                className="text-[9px] font-mono text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors tracking-widest"
              >
                UNDO
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
