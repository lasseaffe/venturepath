import { useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';

const ENRICHING_LINES = [
  'GEOCODING DESTINATION…',
  'FETCHING WIKIDATA ENTITY…',
  'GENERATING EXPEDITION BRIEF…',
  'SCORING QUALITY…',
  'PUBLISHING TO VENTUREVAULT…',
];

export default function MinimalSubmit({ onComplete, onCancel }) {
  const [destination, setDestination] = useState('');
  const [architectName, setArchitectName] = useState('');
  const [enriching, setEnriching] = useState(false);
  const [lineIndex, setLineIndex] = useState(0);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!destination.trim() || !architectName.trim()) return;
    setEnriching(true);
    setError(null);

    let idx = 0;
    const ticker = setInterval(() => {
      idx++;
      setLineIndex(idx);
      if (idx >= ENRICHING_LINES.length - 1) clearInterval(ticker);
    }, 900);

    try {
      const { data, error: err } = await supabase
        .from('pro_paths')
        .insert({
          name: destination.trim(),
          destination: destination.trim(),
          architect_name: architectName.trim(),
          is_community: true,
          source: 'manual',
          legs: [],
          objectives: [],
          manifest_settings: {},
        })
        .select()
        .single();

      if (err) throw err;

      supabase.functions.invoke('enrich-path', { body: { pathId: data.id, destination: destination.trim() } })
        .catch(() => {});

      clearInterval(ticker);
      setLineIndex(ENRICHING_LINES.length - 1);
      setTimeout(() => onComplete?.(), 1200);
    } catch (err) {
      clearInterval(ticker);
      setEnriching(false);
      setError(err.message);
    }
  }

  if (enriching) {
    return (
      <div className="tactical-panel p-6 space-y-2 font-mono">
        <div className="label-tag mb-3">ENRICHING EXPEDITION</div>
        {ENRICHING_LINES.slice(0, lineIndex + 1).map((line) => (
          <motion.div
            key={line}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-sm text-[#E67E22]"
          >
            &gt; {line}
          </motion.div>
        ))}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="tactical-panel p-5 space-y-4">
      <div className="label-tag">QUICK SUBMIT</div>
      <div>
        <label className="text-[10px] font-mono text-slate-400">DESTINATION</label>
        <input
          value={destination}
          onChange={e => setDestination(e.target.value)}
          placeholder="e.g. Dolomites, Italy"
          className="w-full mt-1 bg-transparent border border-white/20 rounded px-3 py-2 text-sm font-mono text-white outline-none focus:border-[#E67E22]"
          required
        />
      </div>
      <div>
        <label className="text-[10px] font-mono text-slate-400">YOUR PIONEER NAME</label>
        <input
          value={architectName}
          onChange={e => setArchitectName(e.target.value)}
          placeholder="e.g. Marco V."
          className="w-full mt-1 bg-transparent border border-white/20 rounded px-3 py-2 text-sm font-mono text-white outline-none focus:border-[#E67E22]"
          required
        />
      </div>
      {error && <div className="text-xs text-red-400 font-mono">{error}</div>}
      <div className="flex gap-3">
        <button type="submit"
          className="px-4 py-2 bg-[#E67E22] text-white font-mono text-xs font-bold rounded-lg">
          SUBMIT EXPEDITION
        </button>
        <button type="button" onClick={onCancel}
          className="px-4 py-2 border border-white/20 text-slate-400 font-mono text-xs rounded-lg">
          CANCEL
        </button>
      </div>
    </form>
  );
}
