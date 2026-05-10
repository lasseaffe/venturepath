import { useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function CloneEditMode({ source, onPublish, onDiscard }) {
  const [name, setName] = useState(source.name + ' (my edit)');
  const [legs, setLegs] = useState(source.legs ?? []);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const isDifferent = name !== source.name || JSON.stringify(legs) !== JSON.stringify(source.legs);

  function updateLeg(i, key, value) {
    setLegs(prev => {
      const next = [...prev];
      next[i] = { ...next[i], [key]: value };
      return next;
    });
  }

  async function handlePublish() {
    setSubmitting(true);
    const { error: err } = await supabase.from('pro_paths').insert({
      name,
      destination: source.destination,
      architect_name: source.architect_name,
      difficulty: source.difficulty,
      climate: source.climate,
      days: source.days,
      squad_min: source.squad_min,
      squad_max: source.squad_max,
      price_usd: 0,
      legs,
      objectives: source.objectives ?? [],
      manifest_settings: source.manifest_settings ?? {},
      is_community: true,
      source: 'clone',
      forked_from: source.id,
    });
    setSubmitting(false);
    if (err) { setError(err.message); return; }
    onPublish?.();
  }

  return (
    <div className="tactical-panel p-5 space-y-4">
      <div className="label-tag">EDIT BEFORE PUBLISHING</div>
      <div className="text-[10px] font-mono text-[#D9C5B2]">
        forked from {source.name} by {source.architect_name}
      </div>

      <div>
        <label className="text-[10px] font-mono text-slate-400">EXPEDITION NAME</label>
        <input value={name} onChange={e => setName(e.target.value)}
          className="w-full mt-1 bg-transparent border border-white/20 rounded px-3 py-2 text-sm font-mono text-white outline-none focus:border-[#E67E22]" />
      </div>

      <div className="space-y-2">
        <div className="text-[10px] font-mono text-slate-400">LEGS</div>
        {legs.map((leg, i) => (
          <div key={i} className="flex gap-2">
            <input value={leg.from} onChange={e => updateLeg(i, 'from', e.target.value)}
              className="flex-1 bg-transparent border-b border-white/20 text-xs font-mono text-white outline-none px-1" />
            <input value={leg.to} onChange={e => updateLeg(i, 'to', e.target.value)}
              className="flex-1 bg-transparent border-b border-white/20 text-xs font-mono text-white outline-none px-1" />
          </div>
        ))}
      </div>

      {error && <div className="text-xs text-red-400 font-mono">{error}</div>}

      <div className="flex gap-3">
        <button onClick={handlePublish} disabled={!isDifferent || submitting}
          className="px-4 py-2 bg-[#E67E22] text-white font-mono text-xs font-bold rounded-lg disabled:opacity-40">
          {submitting ? 'PUBLISHING…' : 'PUBLISH AS MY OWN'}
        </button>
        <button onClick={onDiscard}
          className="px-4 py-2 border border-white/20 text-slate-400 font-mono text-xs rounded-lg">
          DISCARD
        </button>
      </div>
    </div>
  );
}
