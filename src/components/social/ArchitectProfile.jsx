import { useState } from 'react';
import { motion } from 'framer-motion';

const STATS = [
  { label: 'Total Clones',       value: '247',    icon: '⬇' },
  { label: 'Success Rate',       value: '94%',    icon: '✓' },
  { label: 'Reputation Score',   value: '812',    icon: '★' },
  { label: 'Active Squads',      value: '7',      icon: '⚑' },
];

const REVENUE_POINTS = [12, 8, 22, 18, 35, 28, 42, 31, 56, 48, 38, 62, 55, 71, 66, 82, 74, 90, 85, 110, 98, 125, 115, 142];

const PUBLISHED_PATHS = [
  { id: 1, name: 'Operation Patagonia',    clones: 168, rating: 4.9, conversion: '34%', status: 'active'  },
  { id: 2, name: 'Nordic Deep Winter',      clones: 79,  rating: 4.6, conversion: '21%', status: 'active'  },
];

const BADGES = [
  { id: 'b1', name: 'Winter Specialist',   emoji: '❄',  earned: true,  desc: '3+ successful arctic paths' },
  { id: 'b2', name: 'Master Cartographer', emoji: '🗺', earned: true,  desc: '100+ map upvotes' },
  { id: 'b3', name: 'Elite Pioneer',       emoji: '⛰', earned: true,  desc: '5+ completed trips verified' },
  { id: 'b4', name: 'Trail Blazer',        emoji: '🔥', earned: false, desc: 'First to publish a new region' },
  { id: 'b5', name: 'Safety Guardian',     emoji: '🛡', earned: false, desc: '500+ hazard reports validated' },
];

function Sparkline({ points }) {
  const max = Math.max(...points);
  const min = Math.min(...points);
  const w = 240;
  const h = 48;
  const coords = points.map((p, i) => {
    const x = (i / (points.length - 1)) * w;
    const y = h - ((p - min) / (max - min)) * h;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline points={coords} fill="none" stroke="#F2C94C" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

export default function ArchitectProfile({ onClose }) {
  const [withdrawing, setWithdrawing] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 24 }}
      className="min-h-screen bg-[#0F1115] text-white p-6 pb-20"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="label-tag mb-2">Pioneer Profile</div>
          <h1 className="font-editorial text-4xl text-white">Lasse A.</h1>
          <p className="text-[#F2C94C] font-mono text-sm mt-1">Level 14 Elite Architect</p>
          <p className="text-slate-400 text-sm mt-2 max-w-sm">
            Expedition architect specializing in austral wilderness and high-altitude traverses.
          </p>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-slate-500 hover:text-white font-mono text-sm">
            ✕ CLOSE
          </button>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {STATS.map(s => (
          <div key={s.label} className="glass-panel p-4">
            <div className="text-2xl mb-2">{s.icon}</div>
            <div className="text-2xl font-bold text-white font-mono">{s.value}</div>
            <div className="label-tag mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Earnings command center */}
      <div className="glass-panel p-5 mb-5">
        <div className="label-tag mb-4">Earnings Command Center</div>
        <div className="flex flex-col md:flex-row gap-6 items-start">
          <div>
            <div className="text-4xl font-mono font-bold text-[#F2C94C]">$142.00</div>
            <div className="text-xs text-slate-400 font-mono mt-1">Available balance</div>
            <div className="text-xs text-slate-500 font-mono mt-0.5">$34.00 pending escrow</div>
            <button
              onClick={() => setWithdrawing(true)}
              className="mt-3 px-4 py-2 bg-[#F2C94C] hover:bg-[#e5b93f] text-[#0F1115] font-mono font-bold text-xs rounded-lg transition-colors"
            >
              WITHDRAW FUNDS
            </button>
            {withdrawing && (
              <p className="text-xs text-green-400 font-mono mt-2">Transfer initiated via PayPal →</p>
            )}
          </div>
          <div>
            <div className="label-tag mb-2">30-Day Revenue</div>
            <Sparkline points={REVENUE_POINTS} />
          </div>
        </div>
      </div>

      {/* Published paths */}
      <div className="glass-panel p-5 mb-5">
        <div className="label-tag mb-4">Published Paths</div>
        <div className="space-y-3">
          {PUBLISHED_PATHS.map(p => (
            <div key={p.id} className="flex items-center justify-between p-3 bg-white/3 rounded-lg border border-white/5">
              <div>
                <div className="text-white text-sm font-semibold">{p.name}</div>
                <div className="text-xs text-slate-400 font-mono mt-0.5">
                  {p.clones} clones · ★ {p.rating} · CVR {p.conversion}
                </div>
              </div>
              <div className="flex gap-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-green-700 text-green-400">
                  {p.status}
                </span>
                <button className="text-[10px] font-mono px-2 py-0.5 rounded border border-white/20 text-slate-400 hover:text-white transition-colors">
                  EDIT
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Badge gallery */}
      <div className="glass-panel p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="label-tag">Badge Gallery</div>
          <button className="text-[10px] font-mono text-[#F2C94C] hover:underline">
            Share Profile →
          </button>
        </div>
        <div className="flex flex-wrap gap-3">
          {BADGES.map(b => (
            <div
              key={b.id}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${
                b.earned
                  ? 'border-[#F2C94C]/40 bg-[#F2C94C]/5 text-white'
                  : 'border-white/10 text-slate-600 grayscale'
              }`}
              title={b.desc}
            >
              <span className="text-lg">{b.emoji}</span>
              <span className="font-mono text-xs">{b.name}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
