import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const BOOT_STEPS = [
  'INITIALIZING VENTUREPATH…',
  'LOADING TERRAIN DATA…',
  'SYNCING WEATHER FEEDS…',
  'CALIBRATING ROUTE ENGINE…',
  'ALL SYSTEMS GO.',
];

const CLONE_STEPS = [
  'REMOTE OVERRIDE DETECTED…',
  'AUTHENTICATING SQUAD LEADER…',
  'DOWNLOADING PRO-PATH ASSETS…',
  'RECONFIGURING SQUAD MANIFEST…',
  'SYNC COMPLETE.',
];

export default function LaunchSequence({ onComplete, cloning = false }) {
  const steps = cloning ? CLONE_STEPS : BOOT_STEPS;
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    setStep(0);
    setDone(false);
  }, [cloning]);

  useEffect(() => {
    if (step < steps.length - 1) {
      const t = setTimeout(() => setStep(s => s + 1), cloning ? 600 : 420);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(() => {
        setDone(true);
        onComplete?.();
      }, 600);
      return () => clearTimeout(t);
    }
  }, [step, steps.length, cloning, onComplete]);

  if (done) return null;

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0E1012]"
    >
      {/* Logo mark */}
      <div className="mb-10 flex items-center gap-3">
        <div className="w-10 h-10 border-2 border-[#E67E22] rotate-45" />
        <span className="text-2xl font-mono font-bold tracking-[0.25em] text-white uppercase">
          VenturePath
        </span>
      </div>

      {cloning && (
        <div className="mb-6 text-[10px] font-mono tracking-widest text-[#F2C94C] border border-[#F2C94C]/40 px-3 py-1 rounded">
          SQUAD LEADER IS CHANGING THE OBJECTIVE…
        </div>
      )}

      {/* Terminal log */}
      <div className="w-80 space-y-2">
        <AnimatePresence initial={false}>
          {steps.slice(0, step + 1).map((s, i) => (
            <motion.div
              key={`${cloning}-${i}`}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
              className={`font-mono text-xs tracking-widest ${
                i === step ? 'text-[#E67E22]' : 'text-[#4a5568]'
              }`}
            >
              <span className="text-[#E67E22] mr-2">{'>'}</span>
              {s}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Progress bar */}
      <div className="mt-8 w-80 h-px bg-[#1e2328]">
        <motion.div
          className="h-full bg-[#E67E22]"
          initial={{ width: 0 }}
          animate={{ width: `${((step + 1) / steps.length) * 100}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>
    </motion.div>
  );
}
