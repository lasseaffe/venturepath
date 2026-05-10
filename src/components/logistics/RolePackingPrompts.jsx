// src/components/logistics/RolePackingPrompts.jsx
import { useState } from 'react';
import { ROLE_PROMPTS } from '../../utils/rolePackingConfig';

export default function RolePackingPrompts({ role }) {
  const prompts = ROLE_PROMPTS[role];
  const [checked, setChecked] = useState({});
  const [dates, setDates] = useState({});

  if (!prompts) return null;

  const toggle = (label) => setChecked(prev => ({ ...prev, [label]: !prev[label] }));
  const setDate = (label, val) => setDates(prev => ({ ...prev, [label]: val }));

  return (
    <div className="mb-4 border border-[#E67E22]/20 rounded p-3 bg-black/20">
      <p className="font-mono text-[#E67E22] text-xs uppercase tracking-widest mb-3">
        {role} Checklist
      </p>
      <div className="space-y-2">
        {prompts.map(prompt => (
          <div key={prompt.label} className="flex items-center gap-3">
            {prompt.type === 'checkbox' ? (
              <>
                <input
                  type="checkbox"
                  checked={!!checked[prompt.label]}
                  onChange={() => toggle(prompt.label)}
                  className="accent-[#E67E22]"
                />
                <span className={`font-mono text-sm flex items-center gap-1 ${prompt.critical ? 'text-white' : 'text-[#D9C5B2]'}`}>
                  {prompt.critical && !checked[prompt.label] && (
                    <span className="inline-block w-2 h-2 rounded-full bg-[#E67E22] animate-pulse" />
                  )}
                  {prompt.label}
                </span>
              </>
            ) : (
              <>
                <span className={`font-mono text-sm ${prompt.critical ? 'text-white' : 'text-[#D9C5B2]'}`}>{prompt.label}</span>
                <input
                  type="date"
                  value={dates[prompt.label] ?? ''}
                  onChange={e => setDate(prompt.label, e.target.value)}
                  className="ml-auto bg-black/40 border border-white/10 rounded px-2 py-1 text-xs font-mono text-white"
                />
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
