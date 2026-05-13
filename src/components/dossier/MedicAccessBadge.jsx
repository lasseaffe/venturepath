// src/components/dossier/MedicAccessBadge.jsx
import { useState } from 'react';

const TACTICAL_VAULT_KEY = 'tactical_vault';

export default function MedicAccessBadge({ doc, userRole }) {
  const [enabled, setEnabled] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(TACTICAL_VAULT_KEY) ?? '[]');
      return stored.some(d => d.id === doc.id);
    } catch { return false; }
  });

  if (userRole !== 'MEDIC' && userRole !== 'LEADER') return null;

  const toggle = () => {
    try {
      const stored = JSON.parse(localStorage.getItem(TACTICAL_VAULT_KEY) ?? '[]');
      const next = enabled
        ? stored.filter(d => d.id !== doc.id)
        : [...stored, doc];
      localStorage.setItem(TACTICAL_VAULT_KEY, JSON.stringify(next));
      setEnabled(e => !e);
    } catch { /* localStorage unavailable — do not flip UI state */ }
  };

  return (
    <button
      onClick={toggle}
      aria-pressed={enabled}
      className={`text-xs px-2 py-1 rounded border font-mono transition-colors ${
        enabled
          ? 'bg-amber-400 text-black border-amber-400'
          : 'border-amber-400/40 text-amber-400/60 hover:border-amber-400 hover:text-amber-400'
      }`}
    >
      {enabled ? 'Emergency Access ON' : 'Emergency Access'}
    </button>
  );
}
