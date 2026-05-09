import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTripStore } from '../../store/useTripStore';
import { useSquadSync } from '../../hooks/useSquadSync';

const PRO_PATHS = [
  {
    id: 'pp1',
    name: 'Patagonia W-Trek',
    architect: 'Ana M.',
    pioneersCompleted: 6,
    difficulty: 'Expert',
    distance: '72 km',
    days: 5,
    squadSize: '2-4',
    price: 7,
    clones: 168,
    rating: 4.9,
    coverColor: 'from-emerald-900 to-teal-950',
    destinationMetadata: { name: 'Operation W-Trek', destination: 'Torres del Paine, Chile', days: 5, climate: 'temperate', status: 'PLANNING', startDate: '2027-01-05', endDate: '2027-01-10' },
    legs: [
      { id: 1, from: 'Puerto Natales',   to: 'Paine Grande',   mode: 'boat', durationH: 3,  distanceKm: 45,  status: 'confirmed' },
      { id: 2, from: 'Paine Grande',     to: 'Grey Glacier',   mode: 'foot', durationH: 7,  distanceKm: 18,  status: 'confirmed' },
      { id: 3, from: 'Grey Glacier',     to: 'Las Torres',     mode: 'foot', durationH: 9,  distanceKm: 20,  status: 'pending'   },
    ],
    objectives: [],
    manifestSettings: { climate: 'temperate', days: 5, hasChildren: false },
  },
  {
    id: 'pp2',
    name: 'Icelandic Ring Road',
    architect: 'Erik T.',
    pioneersCompleted: 8,
    difficulty: 'Moderate',
    distance: '1,332 km',
    days: 10,
    squadSize: '2-6',
    price: 8,
    clones: 214,
    rating: 4.8,
    coverColor: 'from-blue-900 to-indigo-950',
    destinationMetadata: { name: 'Operation Ring Road', destination: 'Iceland Ring Road', days: 10, climate: 'subarctic', status: 'PLANNING', startDate: '2027-06-01', endDate: '2027-06-11' },
    legs: [
      { id: 1, from: 'Reykjavik',   to: 'Akureyri',    mode: 'bus',   durationH: 5,  distanceKm: 390, status: 'confirmed' },
      { id: 2, from: 'Akureyri',    to: 'Egilsstaðir', mode: 'bus',   durationH: 3,  distanceKm: 270, status: 'confirmed' },
      { id: 3, from: 'Egilsstaðir', to: 'Reykjavik',   mode: 'bus',   durationH: 6,  distanceKm: 672, status: 'pending'   },
    ],
    objectives: [],
    manifestSettings: { climate: 'subarctic', days: 10, hasChildren: false },
  },
  {
    id: 'pp3',
    name: 'Swiss Alps Haute Route',
    architect: 'Lena K.',
    pioneersCompleted: 5,
    difficulty: 'Hard',
    distance: '180 km',
    days: 7,
    squadSize: '1-3',
    price: 6,
    clones: 87,
    rating: 4.7,
    coverColor: 'from-slate-800 to-zinc-950',
    destinationMetadata: { name: 'Operation Haute Route', destination: 'Swiss Alps, Switzerland', days: 7, climate: 'alpine', status: 'PLANNING', startDate: '2027-07-15', endDate: '2027-07-22' },
    legs: [
      { id: 1, from: 'Chamonix', to: 'Verbier', mode: 'foot', durationH: 48, distanceKm: 90, status: 'confirmed' },
      { id: 2, from: 'Verbier',  to: 'Zermatt', mode: 'foot', durationH: 40, distanceKm: 90, status: 'pending'   },
    ],
    objectives: [],
    manifestSettings: { climate: 'alpine', days: 7, hasChildren: false },
  },
  {
    id: 'pp4',
    name: 'Mt. Fuji Sunrise',
    architect: 'Yuki S.',
    pioneersCompleted: 12,
    difficulty: 'Moderate',
    distance: '22 km',
    days: 2,
    squadSize: '1-8',
    price: 4,
    clones: 453,
    rating: 4.9,
    coverColor: 'from-rose-900 to-orange-950',
    destinationMetadata: { name: 'Operation Fuji', destination: 'Mt. Fuji, Japan', days: 2, climate: 'alpine', status: 'PLANNING', startDate: '2027-08-01', endDate: '2027-08-03' },
    legs: [
      { id: 1, from: 'Fujinomiya 5th Station', to: 'Summit',                mode: 'foot', durationH: 6,  distanceKm: 11, status: 'confirmed' },
      { id: 2, from: 'Summit',                  to: 'Fujinomiya 5th Station', mode: 'foot', durationH: 3,  distanceKm: 11, status: 'pending'   },
    ],
    objectives: [],
    manifestSettings: { climate: 'alpine', days: 2, hasChildren: false },
  },
];

const DIFFICULTY_COLOR = {
  Moderate: 'text-green-400 border-green-700',
  Hard:     'text-yellow-400 border-yellow-700',
  Expert:   'text-red-400 border-red-700',
};

export default function VentureVault({ onCloneComplete }) {
  const { clonePath, cloning, userRole } = useTripStore();
  const { broadcastClone } = useSquadSync();
  const [cloneId, setCloneId] = useState(null);
  const [memberRequest, setMemberRequest] = useState(null);

  const handleClone = (path) => {
    if (userRole !== 'LEADER') {
      setMemberRequest(path.name);
      return;
    }
    setCloneId(path.id);
    broadcastClone(path);
    clonePath(path);
    setTimeout(() => {
      setCloneId(null);
      if (onCloneComplete) onCloneComplete();
    }, 3800);
  };

  return (
    <div className="tactical-panel p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="label-tag mb-1">VentureVault</h2>
          <p className="text-white font-editorial text-xl">Pro-Path Marketplace</p>
        </div>
        <span className="text-xs font-mono text-slate-400">{PRO_PATHS.length} paths available</span>
      </div>

      {/* Member request toast */}
      <AnimatePresence>
        {memberRequest && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-4 px-4 py-3 rounded-lg border border-[#F2C94C]/50 bg-[#F2C94C]/10 text-[#F2C94C] text-sm font-mono"
          >
            Request sent to Squad Leader for approval — "{memberRequest}"
            <button onClick={() => setMemberRequest(null)} className="ml-3 text-[#F2C94C]/50 hover:text-[#F2C94C]">✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PRO_PATHS.map(path => {
          const isElite = path.pioneersCompleted >= 5;
          const isCloning = cloneId === path.id || cloning;

          return (
            <motion.div
              key={path.id}
              layout
              className={`relative rounded-xl overflow-hidden border border-white/10 bg-gradient-to-br ${path.coverColor}`}
            >
              {isElite && (
                <div className="absolute top-3 right-3 px-2 py-0.5 rounded text-[10px] font-mono font-bold text-[#0F1115] bg-[#F2C94C]">
                  ELITE PIONEER
                </div>
              )}
              <div className="p-5">
                <div className="font-editorial text-xl text-white mb-1">{path.name}</div>
                <div className="text-xs text-slate-400 font-mono mb-3">
                  by {path.architect} · {path.clones} clones · ★ {path.rating}
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  <Tag>{path.distance}</Tag>
                  <Tag>{path.days}d</Tag>
                  <Tag>Squad {path.squadSize}</Tag>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${DIFFICULTY_COLOR[path.difficulty] ?? 'text-slate-400 border-slate-700'}`}>
                    {path.difficulty}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#F2C94C] font-mono font-bold text-lg">${path.price}</span>
                  <button
                    onClick={() => handleClone(path)}
                    disabled={!!cloneId}
                    className="px-4 py-2 bg-[#E67E22] hover:bg-[#d4711e] disabled:opacity-50 disabled:cursor-not-allowed text-white font-mono text-xs font-bold rounded-lg transition-colors"
                  >
                    {isCloning ? 'CLONING…' : 'CLONE PATH'}
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Clone overlay */}
      <AnimatePresence>
        {cloning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center"
          >
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
  const [visible, setVisible] = useState(false);
  useState(() => {
    const t = setTimeout(() => setVisible(true), delay * 1000);
    return () => clearTimeout(t);
  });
  // force first render
  const [show, setShow] = useState(false);
  if (!show) setTimeout(() => setShow(true), delay * 1000 + 50);

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={show ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.3 }}
      className={`text-sm ${show ? 'text-[#E67E22]' : 'text-slate-600'}`}
    >
      &gt; {text}
    </motion.div>
  );
}

function Tag({ children }) {
  return (
    <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-white/20 text-slate-300">
      {children}
    </span>
  );
}
