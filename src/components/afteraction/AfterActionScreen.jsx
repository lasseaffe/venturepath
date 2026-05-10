import { useState, useMemo } from 'react';
import { useTripStore } from '../../store/useTripStore';

const VAULT_KEY = 'vp-vault';

function loadVault() {
  try { return JSON.parse(localStorage.getItem(VAULT_KEY) ?? '[]'); } catch { return []; }
}

function saveVault(items) {
  localStorage.setItem(VAULT_KEY, JSON.stringify(items));
}

// ── Phase 1: Expense Settlement ────────────────────────────────────────────────

const MOCK_MEMBERS = [
  { id: 'lead',  role: 'Lead',  paid: 920 },
  { id: 'scout', role: 'Scout', paid: 480 },
  { id: 'medic', role: 'Medic', paid: 440 },
];

function Settlement({ onConfirm }) {
  const total = MOCK_MEMBERS.reduce((s, m) => s + m.paid, 0);
  const perHead = Math.round(total / MOCK_MEMBERS.length);

  const rows = MOCK_MEMBERS.map(m => ({
    ...m,
    owes: perHead,
    balance: m.paid - perHead,
  }));

  function exportCsv() {
    const lines = [
      'Role,Paid,Owes,Balance',
      ...rows.map(r => `${r.role},${r.paid},${r.owes},${r.balance}`),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'expedition-settlement.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-editorial text-2xl mb-1" style={{ color: 'var(--text-primary)' }}>Expedition Debrief</h2>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Total Spent: <span className="font-mono text-[#E67E22]">${total.toLocaleString()}</span>
          {' · '}Split across {MOCK_MEMBERS.length} Pioneers ({' '}
          <span className="font-mono">${perHead}</span> each)
        </p>
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: 'var(--surface-raised)', color: 'var(--text-secondary)' }}>
              <th className="text-left px-4 py-2 font-medium">Pioneer</th>
              <th className="text-right px-4 py-2 font-medium">Paid</th>
              <th className="text-right px-4 py-2 font-medium">Owes</th>
              <th className="text-right px-4 py-2 font-medium">Balance</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-t" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                <td className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>{r.role}</td>
                <td className="px-4 py-3 text-right font-mono" style={{ color: 'var(--text-secondary)' }}>${r.paid}</td>
                <td className="px-4 py-3 text-right font-mono" style={{ color: 'var(--text-secondary)' }}>${r.owes}</td>
                <td className={`px-4 py-3 text-right font-mono font-semibold ${r.balance >= 0 ? 'text-green-500' : 'text-red-400'}`}>
                  {r.balance >= 0 ? '+' : ''}{r.balance}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-3">
        <button
          onClick={exportCsv}
          className="px-4 py-2 rounded-lg text-sm border hover:opacity-80 transition-opacity"
          style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
        >
          Export CSV
        </button>
        <button
          onClick={onConfirm}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-[#E67E22] text-white hover:bg-[#d06a1a] transition-colors"
        >
          Confirm Settlement → Publish
        </button>
      </div>
    </div>
  );
}

// ── Phase 2: Publish to VentureVault ─────────────────────────────────────────

function Publish({ trip, legs }) {
  const [name, setName] = useState(trip.name + ' — Our Way');
  const [difficulty, setDifficulty] = useState('Moderate');
  const [description, setDescription] = useState('');
  const [published, setPublished] = useState(false);

  const confirmedStops = legs.filter(l => l.status === 'confirmed');

  function handlePublish() {
    const template = {
      id: `vault-${Date.now()}`,
      name,
      difficulty,
      description,
      legs: confirmedStops.map(l => ({
        from: l.from,
        to: l.to,
        mode: l.mode,
        durationH: l.durationH,
        distanceKm: l.distanceKm,
        type: l.type ?? 'transit',
      })),
      manifestConfig: { climate: 'temperate', days: trip.days, hasChildren: false },
      budgetTemplate: { totalUSD: 1840, paxCount: 3 },
      architectName: 'Architect',
      publishedAt: new Date().toISOString(),
      cloneCount: 0,
      rating: null,
      price: 0,
    };

    const vault = loadVault();
    saveVault([template, ...vault]);
    setPublished(true);
  }

  if (published) {
    return (
      <div className="text-center py-12 space-y-4">
        <div className="text-5xl">⬡</div>
        <h2 className="font-editorial text-2xl" style={{ color: 'var(--text-primary)' }}>Pro-Path Published</h2>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          "{name}" is now available in VentureVault for other Architects to clone.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-editorial text-2xl mb-1" style={{ color: 'var(--text-primary)' }}>Package This Expedition</h2>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Publish as a Pro-Path to VentureVault. Sensitive data is stripped.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Path Name</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm bg-transparent"
            style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          />
        </div>

        <div>
          <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Difficulty</label>
          <select
            value={difficulty}
            onChange={e => setDifficulty(e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm bg-transparent"
            style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          >
            {['Easy', 'Moderate', 'Hard', 'Expert'].map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            placeholder="Describe this expedition for future Architects..."
            className="w-full rounded-lg border px-3 py-2 text-sm bg-transparent resize-none"
            style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          />
        </div>
      </div>

      <div className="rounded-xl border p-4 space-y-2 text-sm" style={{ borderColor: 'var(--border)', background: 'var(--surface-raised)' }}>
        <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Includes:</p>
        <ul className="space-y-1" style={{ color: 'var(--text-secondary)' }}>
          <li>✓ {confirmedStops.length} confirmed legs</li>
          <li>✓ Packing manifest (climate: {trip.climate})</li>
          <li>✓ Budget template ($1,840 / 3 Pioneers)</li>
          <li className="opacity-60">✗ Hazard overlays (stripped for privacy)</li>
        </ul>
      </div>

      <button
        onClick={handlePublish}
        className="px-4 py-2 rounded-lg text-sm font-medium bg-[#E67E22] text-white hover:bg-[#d06a1a] transition-colors"
      >
        Publish to VentureVault
      </button>
    </div>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function AfterActionScreen() {
  const { trip, legs } = useTripStore();
  const [phase, setPhase] = useState(1);

  return (
    <div className="min-h-screen p-8" style={{ background: 'var(--bg)', color: 'var(--text-primary)' }}>
      <div className="max-w-2xl mx-auto">
        {/* Step indicator */}
        <div className="flex items-center gap-4 mb-8">
          <StepBadge n={1} label="Settle" active={phase === 1} done={phase > 1} />
          <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
          <StepBadge n={2} label="Publish" active={phase === 2} done={false} />
        </div>

        {phase === 1 && <Settlement onConfirm={() => setPhase(2)} />}
        {phase === 2 && <Publish trip={trip} legs={legs} />}
      </div>
    </div>
  );
}

function StepBadge({ n, label, active, done }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
          done ? 'bg-green-600 text-white' :
          active ? 'bg-[#E67E22] text-white' :
          'border text-[var(--text-secondary)]'
        }`}
        style={!active && !done ? { borderColor: 'var(--border)' } : {}}
      >
        {done ? '✓' : n}
      </span>
      <span className={`text-sm ${active ? 'font-medium' : 'opacity-60'}`} style={{ color: 'var(--text-primary)' }}>
        {label}
      </span>
    </div>
  );
}
