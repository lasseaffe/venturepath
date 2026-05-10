'use client'

import { useEffect } from 'react'
import { useWizardStore } from '@/store/useWizardStore'

const CATEGORIES = ['accommodation', 'transport', 'food', 'activities', 'emergency']
const CAT_LABELS = { accommodation: 'Accommodation', transport: 'Transport', food: 'Food', activities: 'Activities', emergency: 'Emergency Buffer' }
const CAT_COLORS = { accommodation: '#2196F3', transport: '#9C27B0', food: '#FF9800', activities: '#E67E22', emergency: '#F44336' }
const CURRENCIES = ['USD', 'EUR', 'GBP', 'AUD', 'JPY']
const DEFAULT_SPLITS = { accommodation: 30, transport: 25, food: 25, activities: 15, emergency: 5 }

function DonutChart({ splits, total, currency }) {
  const entries = CATEGORIES.map((c) => ({ cat: c, pct: splits[c] || 0, color: CAT_COLORS[c] }))
  let cumulative = 0
  const r = 50, cx = 70, cy = 70, stroke = 18
  const circumference = 2 * Math.PI * r

  return (
    <svg width={140} height={140} viewBox="0 0 140 140">
      {entries.map((e) => {
        const start = cumulative
        cumulative += e.pct
        const dashLen = circumference * e.pct / 100
        const rotation = (start / 100) * 360 - 90
        return (
          <circle key={e.cat} r={r} cx={cx} cy={cy} fill="none" stroke={e.color} strokeWidth={stroke}
            strokeDasharray={`${dashLen} ${circumference}`}
            transform={`rotate(${rotation}, ${cx}, ${cy})`} />
        )
      })}
      <text x={cx} y={cy - 6} textAnchor="middle" fill="#D9C5B2" fontSize={10} fontFamily="JetBrains Mono, monospace">Total</text>
      <text x={cx} y={cy + 10} textAnchor="middle" fill="#E67E22" fontSize={13} fontWeight="bold" fontFamily="JetBrains Mono, monospace">{total.toLocaleString()}</text>
      <text x={cx} y={cy + 24} textAnchor="middle" fill="#D9C5B2" fontSize={9} fontFamily="JetBrains Mono, monospace">{currency}</text>
    </svg>
  )
}

export default function BudgetStep({ onNext }) {
  const { budget, setBudget, setStep } = useWizardStore()

  useEffect(() => { setStep('budget') }, [setStep])

  const autoSplit = () => setBudget({ ...budget, splits: DEFAULT_SPLITS })

  const adjustSplit = (cat, value) => {
    const current = budget.splits[cat]
    const diff = value - current
    const others = CATEGORIES.filter((c) => c !== cat)
    const totalOthers = others.reduce((s, c) => s + (budget.splits[c] || 0), 0)
    const newSplits = { ...budget.splits, [cat]: value }
    if (totalOthers > 0) {
      others.forEach((c) => {
        newSplits[c] = Math.max(0, Math.round((budget.splits[c] || 0) - diff * ((budget.splits[c] || 0) / totalOthers)))
      })
    }
    const total = Object.values(newSplits).reduce((s, v) => s + v, 0)
    if (total !== 100) {
      const lastOther = others[others.length - 1]
      newSplits[lastOther] = Math.max(0, (newSplits[lastOther] || 0) + (100 - total))
    }
    setBudget({ ...budget, splits: newSplits })
  }

  const totalAllocated = CATEGORIES.reduce((s, c) => s + (budget.splits[c] || 0), 0)

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="font-['Playfair_Display'] text-3xl text-white mb-1">Set the Ledger</h2>
        <p className="text-[#D9C5B2] text-sm">Define your expedition budget and how to distribute it.</p>
      </div>

      <div className="flex gap-8 items-start flex-wrap">
        <div className="flex flex-col gap-6 flex-1 min-w-[300px]">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-mono text-[#D9C5B2] uppercase tracking-widest mb-2">Total Budget</label>
              <input type="number" value={budget.ceiling || ''} onChange={(e) => setBudget({ ...budget, ceiling: Number(e.target.value) })}
                placeholder="0" min={0}
                className="w-full bg-[#141820] border border-white/10 rounded px-4 py-3 text-white text-xl font-mono focus:outline-none focus:border-[#E67E22]/60" />
            </div>
            <div>
              <label className="block text-xs font-mono text-[#D9C5B2] uppercase tracking-widest mb-2">Currency</label>
              <select value={budget.currency} onChange={(e) => setBudget({ ...budget, currency: e.target.value })}
                className="bg-[#141820] border border-white/10 rounded px-4 py-3 text-white font-mono focus:outline-none focus:border-[#E67E22]/60 h-[52px]">
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs font-mono text-[#D9C5B2] uppercase tracking-widest">Category Splits</p>
            <button onClick={autoSplit} className="text-xs font-mono text-[#E67E22] hover:underline">Auto-split</button>
          </div>

          {CATEGORIES.map((cat) => {
            const pct = budget.splits[cat] || 0
            const amount = budget.ceiling ? Math.round(budget.ceiling * pct / 100) : 0
            return (
              <div key={cat}>
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-white">{CAT_LABELS[cat]}</span>
                  <span className="text-sm font-mono text-[#D9C5B2]">{pct}% · {budget.currency} {amount.toLocaleString()}</span>
                </div>
                <input type="range" min={0} max={100} value={pct}
                  onChange={(e) => adjustSplit(cat, Number(e.target.value))}
                  style={{ accentColor: CAT_COLORS[cat] }}
                  className="w-full h-1.5 rounded-full cursor-pointer" />
              </div>
            )
          })}

          {totalAllocated !== 100 && (
            <p className="text-amber-400 text-xs font-mono">⚠ Splits total {totalAllocated}% — should be 100%</p>
          )}
        </div>

        <div className="flex flex-col items-center gap-3">
          <DonutChart splits={budget.splits} total={budget.ceiling || 0} currency={budget.currency} />
          <div className="flex flex-col gap-1">
            {CATEGORIES.map((cat) => (
              <div key={cat} className="flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full inline-block flex-shrink-0" style={{ backgroundColor: CAT_COLORS[cat] }} />
                <span className="text-[#D9C5B2]">{CAT_LABELS[cat]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button onClick={onNext} className="px-6 py-2 bg-[#E67E22] text-[#0E1012] font-mono font-semibold rounded hover:bg-[#d4711f] transition-colors">
          Continue →
        </button>
      </div>
    </div>
  )
}
