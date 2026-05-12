import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import ProPathCard from './ProPathCard';

const STORAGE_KEY = 'vp-wizard-draft';
const MODES = ['foot', 'bus', 'flight', 'boat', 'train', 'bike'];
const DIFFICULTIES = ['Easy', 'Moderate', 'Hard', 'Expert'];
const CLIMATES = ['alpine', 'tropical', 'subarctic', 'desert', 'temperate', 'arid'];

function emptyDraft() {
  return {
    destination: '',
    architectName: '',
    legs: [{ from: '', to: '', mode: 'foot', durationH: 4, distanceKm: 20 }],
    squadMin: 1,
    squadMax: 4,
    difficulty: 'Moderate',
    climate: 'temperate',
    days: 3,
    price_usd: 0,
    paid: false,
  };
}

export default function SubmitWizard({ onComplete, onCancel }) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? emptyDraft(); }
    catch { return emptyDraft(); }
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  }, [draft]);

  function set(key, value) {
    setDraft(d => ({ ...d, [key]: value }));
  }

  function addLeg() {
    setDraft(d => ({
      ...d,
      legs: [...d.legs, { from: '', to: '', mode: 'foot', durationH: 4, distanceKm: 10 }],
    }));
  }

  function updateLeg(i, key, value) {
    setDraft(d => {
      const legs = [...d.legs];
      legs[i] = { ...legs[i], [key]: value };
      return { ...d, legs };
    });
  }

  function removeLeg(i) {
    setDraft(d => ({ ...d, legs: d.legs.filter((_, idx) => idx !== i) }));
  }

  async function handlePublish() {
    setSubmitting(true);
    setError(null);
    const { error: err } = await supabase.from('pro_paths').insert({
      name: draft.destination,
      destination: draft.destination,
      architect_name: draft.architectName,
      difficulty: draft.difficulty,
      climate: draft.climate,
      days: draft.days,
      squad_min: draft.squadMin,
      squad_max: draft.squadMax,
      price_usd: draft.paid ? draft.price_usd : 0,
      legs: draft.legs,
      objectives: [],
      manifest_settings: { climate: draft.climate, days: draft.days, hasChildren: false },
      is_community: true,
      source: 'wizard',
    });
    setSubmitting(false);
    if (err) { setError(err.message); return; }
    localStorage.removeItem(STORAGE_KEY);
    onComplete?.();
  }

  const STEPS = [
    <div key="dest" className="space-y-4">
      <div className="label-tag">STEP 1 / 5 — DESTINATION</div>
      <input value={draft.destination} onChange={e => set('destination', e.target.value)}
        placeholder="e.g. Dolomites, Italy"
        className="w-full bg-transparent border border-white/20 rounded px-3 py-2 text-sm font-mono text-white outline-none focus:border-[#E67E22]" />
      <input value={draft.architectName} onChange={e => set('architectName', e.target.value)}
        placeholder="Your Pioneer name"
        className="w-full bg-transparent border border-white/20 rounded px-3 py-2 text-sm font-mono text-white outline-none focus:border-[#E67E22]" />
    </div>,

    <div key="legs" className="space-y-3">
      <div className="label-tag">STEP 2 / 5 — LEGS</div>
      {draft.legs.map((leg, i) => (
        <div key={i} className="border border-white/10 rounded p-3 space-y-2">
          <div className="flex gap-2">
            <input value={leg.from} onChange={e => updateLeg(i, 'from', e.target.value)}
              placeholder="From" className="flex-1 bg-transparent border-b border-white/20 text-xs font-mono text-white outline-none px-1" />
            <input value={leg.to} onChange={e => updateLeg(i, 'to', e.target.value)}
              placeholder="To" className="flex-1 bg-transparent border-b border-white/20 text-xs font-mono text-white outline-none px-1" />
          </div>
          <div className="flex gap-2 items-center">
            <select value={leg.mode} onChange={e => updateLeg(i, 'mode', e.target.value)}
              className="bg-[#0E1012] border border-white/20 rounded px-2 py-1 text-xs font-mono text-white">
              {MODES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <input type="number" value={leg.durationH} onChange={e => updateLeg(i, 'durationH', +e.target.value)}
              className="w-16 bg-transparent border-b border-white/20 text-xs font-mono text-white outline-none px-1" />
            <span className="text-[10px] font-mono text-[var(--text-muted)]">h</span>
            {draft.legs.length > 1 && (
              <button onClick={() => removeLeg(i)} className="ml-auto text-[10px] font-mono text-red-400">REMOVE</button>
            )}
          </div>
        </div>
      ))}
      <button onClick={addLeg} className="text-[10px] font-mono text-[#E67E22]">+ ADD LEG</button>
    </div>,

    <div key="squad" className="space-y-4">
      <div className="label-tag">STEP 3 / 5 — SQUAD & DIFFICULTY</div>
      <div>
        <div className="text-[10px] font-mono text-[var(--text-secondary)] mb-2">DIFFICULTY</div>
        <div className="flex gap-2">
          {DIFFICULTIES.map(d => (
            <button key={d} onClick={() => set('difficulty', d)}
              className={`px-3 py-1 rounded text-[10px] font-mono border transition-colors ${draft.difficulty === d ? 'bg-[#E67E22] border-[#E67E22] text-white' : 'border-white/20 text-[var(--text-secondary)]'}`}>
              {d}
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="text-[10px] font-mono text-[var(--text-secondary)] mb-2">CLIMATE</div>
        <div className="flex flex-wrap gap-2">
          {CLIMATES.map(c => (
            <button key={c} onClick={() => set('climate', c)}
              className={`px-3 py-1 rounded text-[10px] font-mono border transition-colors ${draft.climate === c ? 'bg-[#E67E22] border-[#E67E22] text-white' : 'border-white/20 text-[var(--text-secondary)]'}`}>
              {c}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-4">
        <div>
          <div className="text-[10px] font-mono text-[var(--text-secondary)] mb-1">MIN SQUAD</div>
          <input type="number" min={1} max={12} value={draft.squadMin} onChange={e => set('squadMin', +e.target.value)}
            className="w-16 bg-transparent border border-white/20 rounded px-2 py-1 text-sm font-mono text-white outline-none" />
        </div>
        <div>
          <div className="text-[10px] font-mono text-[var(--text-secondary)] mb-1">MAX SQUAD</div>
          <input type="number" min={1} max={12} value={draft.squadMax} onChange={e => set('squadMax', +e.target.value)}
            className="w-16 bg-transparent border border-white/20 rounded px-2 py-1 text-sm font-mono text-white outline-none" />
        </div>
        <div>
          <div className="text-[10px] font-mono text-[var(--text-secondary)] mb-1">DAYS</div>
          <input type="number" min={1} max={90} value={draft.days} onChange={e => set('days', +e.target.value)}
            className="w-16 bg-transparent border border-white/20 rounded px-2 py-1 text-sm font-mono text-white outline-none" />
        </div>
      </div>
    </div>,

    <div key="pricing" className="space-y-4">
      <div className="label-tag">STEP 4 / 5 — PRICING</div>
      <div className="flex gap-3">
        <button onClick={() => set('paid', false)}
          className={`px-4 py-2 rounded text-xs font-mono border transition-colors ${!draft.paid ? 'bg-[#E67E22] border-[#E67E22] text-white' : 'border-white/20 text-[var(--text-secondary)]'}`}>
          FREE
        </button>
        <button onClick={() => set('paid', true)}
          className={`px-4 py-2 rounded text-xs font-mono border transition-colors ${draft.paid ? 'bg-[#E67E22] border-[#E67E22] text-white' : 'border-white/20 text-[var(--text-secondary)]'}`}>
          PAID
        </button>
      </div>
      {draft.paid && (
        <div>
          <div className="text-[10px] font-mono text-[var(--text-secondary)] mb-1">PRICE (USD)</div>
          <input type="number" min={1} max={999} value={draft.price_usd}
            onChange={e => set('price_usd', +e.target.value)}
            className="w-24 bg-transparent border border-white/20 rounded px-2 py-1 text-sm font-mono text-white outline-none" />
        </div>
      )}
    </div>,

    <div key="preview" className="space-y-4">
      <div className="label-tag">STEP 5 / 5 — PREVIEW & PUBLISH</div>
      <ProPathCard
        path={{
          name: draft.destination || 'Unnamed Expedition',
          architect_name: draft.architectName || 'Pioneer',
          difficulty: draft.difficulty,
          climate: draft.climate,
          days: draft.days,
          distance_km: draft.legs.reduce((s, l) => s + (l.distanceKm || 0), 0),
          squad_min: draft.squadMin,
          squad_max: draft.squadMax,
          price_usd: draft.paid ? draft.price_usd : 0,
          legs: draft.legs,
          clones: 0,
          rating: 0,
          is_community: true,
        }}
        onClone={() => {}}
        cloning={false}
      />
      {error && <div className="text-xs text-red-400 font-mono">{error}</div>}
    </div>,
  ];

  return (
    <div className="tactical-panel p-5 space-y-5">
      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
          {STEPS[step]}
        </motion.div>
      </AnimatePresence>

      <div className="flex gap-3">
        {step > 0 && (
          <button onClick={() => setStep(s => s - 1)}
            className="px-4 py-2 border border-white/20 text-[var(--text-secondary)] font-mono text-xs rounded-lg">
            BACK
          </button>
        )}
        {step < STEPS.length - 1 && (
          <button onClick={() => setStep(s => s + 1)}
            className="px-4 py-2 bg-[#E67E22] text-white font-mono text-xs font-bold rounded-lg">
            NEXT
          </button>
        )}
        {step === STEPS.length - 1 && (
          <button onClick={handlePublish} disabled={submitting}
            className="px-4 py-2 bg-[#E67E22] text-white font-mono text-xs font-bold rounded-lg disabled:opacity-50">
            {submitting ? 'PUBLISHING…' : 'PUBLISH EXPEDITION'}
          </button>
        )}
        <button onClick={onCancel}
          className="ml-auto px-4 py-2 border border-white/20 text-[var(--text-secondary)] font-mono text-xs rounded-lg">
          CANCEL
        </button>
      </div>
    </div>
  );
}
