import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTripStore } from '../../store/useTripStore';
import { useSquadSync } from '../../hooks/useSquadSync';
import { useProPaths, DEFAULT_FILTERS } from '../../hooks/useProPaths';
import ProPathCard from './ProPathCard';
import VaultFilterBar from './VaultFilterBar';
import MinimalSubmit from './MinimalSubmit';
import SubmitWizard from './SubmitWizard';
import CloneEditMode from './CloneEditMode';

export default function VentureVault({ onCloneComplete }) {
  const { clonePath, cloning, userRole } = useTripStore();
  const { broadcastClone } = useSquadSync();
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const { paths, loading, error, refetch } = useProPaths(filters);
  const [cloneId, setCloneId] = useState(null);
  const [memberRequest, setMemberRequest] = useState(null);
  const [mode, setMode] = useState('vault');
  const [cloneSource, setCloneSource] = useState(null);

  function handleClone(path) {
    if (userRole !== 'LEADER') { setMemberRequest(path.name); return; }
    setCloneSource(path);
    setMode('cloneEdit');
  }

  function handleDirectClone(path) {
    setCloneId(path.id);
    broadcastClone(path);
    clonePath(path);
    setTimeout(() => { setCloneId(null); onCloneComplete?.(); }, 3800);
  }

  if (mode === 'minimal') {
    return <MinimalSubmit onComplete={() => { setMode('vault'); refetch(); }} onCancel={() => setMode('vault')} />;
  }
  if (mode === 'wizard') {
    return <SubmitWizard onComplete={() => { setMode('vault'); refetch(); }} onCancel={() => setMode('vault')} />;
  }
  if (mode === 'cloneEdit' && cloneSource) {
    return (
      <CloneEditMode
        source={cloneSource}
        onPublish={() => { handleDirectClone(cloneSource); setMode('vault'); refetch(); }}
        onDiscard={() => { handleDirectClone(cloneSource); setMode('vault'); }}
      />
    );
  }

  return (
    <div data-tour="vault" data-beacon="venture-vault" className="tactical-panel p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="label-tag mb-1">VentureVault</h2>
          <p className="text-white font-editorial text-xl">Pro-Path Marketplace</p>
        </div>
        <div className="flex gap-2 items-center">
          <span className="text-xs font-mono text-slate-400">{paths.length} paths</span>
          <button onClick={() => setMode('minimal')}
            className="px-3 py-1 bg-[#E67E22]/20 border border-[#E67E22]/40 text-[#E67E22] font-mono text-[10px] rounded-lg hover:bg-[#E67E22]/30">
            + QUICK SUBMIT
          </button>
          <button onClick={() => setMode('wizard')}
            className="px-3 py-1 bg-[#E67E22] text-white font-mono text-[10px] font-bold rounded-lg hover:bg-[#d4711e]">
            + WIZARD
          </button>
        </div>
      </div>

      <AnimatePresence>
        {memberRequest && (
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mb-4 px-4 py-3 rounded-lg border border-[#F2C94C]/50 bg-[#F2C94C]/10 text-[#F2C94C] text-sm font-mono">
            Request sent to Squad Leader for approval — "{memberRequest}"
            <button onClick={() => setMemberRequest(null)} className="ml-3 text-[#F2C94C]/50 hover:text-[#F2C94C]">✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      <VaultFilterBar filters={filters} onChange={setFilters} />

      {loading && (
        <div className="text-center text-slate-500 font-mono text-xs py-12">LOADING VAULT…</div>
      )}
      {error && (
        <div className="text-center text-red-400 font-mono text-xs py-12">{error}</div>
      )}
      {!loading && paths.length === 0 && (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">🗺</div>
          <div className="text-slate-400 font-mono text-sm">No expeditions match your filters.</div>
          <button onClick={() => setFilters(DEFAULT_FILTERS)}
            className="mt-3 px-4 py-2 border border-white/20 text-slate-400 font-mono text-xs rounded-lg hover:border-[#E67E22]/50">
            CLEAR FILTERS
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {paths.map(path => (
          <ProPathCard
            key={path.id}
            path={path}
            onClone={handleClone}
            cloning={cloneId === path.id || (cloning && cloneId === path.id)}
          />
        ))}
      </div>

      <AnimatePresence>
        {cloning && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center">
            <div className="tactical-panel p-8 max-w-sm w-full space-y-3 font-mono">
              <div className="label-tag mb-3">SYSTEM OVERRIDE</div>
              {['REMOTE OVERRIDE DETECTED…', 'DOWNLOADING PRO-PATH ASSETS…', 'RECONFIGURING SQUAD MANIFEST…', 'SYNC COMPLETE.'].map((line, i) => (
                <CloneLogLine key={line} text={line} delay={i * 0.7} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CloneLogLine({ text, delay }) {
  const [show, setShow] = useState(false);
  useState(() => { const t = setTimeout(() => setShow(true), delay * 1000 + 50); return () => clearTimeout(t); });
  return (
    <motion.div initial={{ opacity: 0, x: -8 }} animate={show ? { opacity: 1, x: 0 } : {}} transition={{ duration: 0.3 }}
      className={`text-sm ${show ? 'text-[#E67E22]' : 'text-slate-600'}`}>
      &gt; {text}
    </motion.div>
  );
}
