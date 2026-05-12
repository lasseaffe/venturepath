import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { computeBalances, computeSettlements, computeTotals } from '../../utils/budgetEngine';

const MEMBERS = [
  { id: 'lead',  name: 'Lead',  avatar: '🧗' },
  { id: 'scout', name: 'Scout', avatar: '🗺' },
  { id: 'medic', name: 'Medic', avatar: '🩺' },
];

const MEMBER_IDS = MEMBERS.map(m => m.id);

const SEED_EXPENSES = [
  { id: 'e1', description: 'Airport Transfer', amount: 90,  paidBy: 'lead',  splitType: 'equal' },
  { id: 'e2', description: 'Base Camp Permit', amount: 135, paidBy: 'scout', splitType: 'equal' },
  { id: 'e3', description: 'Group Dinner',     amount: 72,  paidBy: 'medic', splitType: 'equal' },
];

function memberName(id) {
  return MEMBERS.find(m => m.id === id)?.name ?? id;
}

export default function BudgetLoom() {
  const [expenses, setExpenses] = useState(SEED_EXPENSES);
  const [form, setForm] = useState({ description: '', amount: '', paidBy: 'lead', splitType: 'equal' });
  const [showAdd, setShowAdd] = useState(false);

  const balances = useMemo(() => computeBalances(expenses, MEMBER_IDS), [expenses]);
  const settlements = useMemo(() => computeSettlements(balances), [balances]);
  const { total, paid } = useMemo(() => computeTotals(expenses, MEMBER_IDS), [expenses]);

  function addExpense() {
    const amount = parseFloat(form.amount);
    if (!form.description.trim() || isNaN(amount) || amount <= 0) return;
    setExpenses(prev => [...prev, {
      id: `e${Date.now()}`,
      description: form.description.trim(),
      amount,
      paidBy: form.paidBy,
      splitType: 'equal',
    }]);
    setForm({ description: '', amount: '', paidBy: 'lead', splitType: 'equal' });
    setShowAdd(false);
  }

  function removeExpense(id) {
    setExpenses(prev => prev.filter(e => e.id !== id));
  }

  return (
    <div className="tactical-panel p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="label-tag">Budget Loom</div>
          <div className="text-[10px] text-[var(--text-muted)] font-mono mt-0.5">Squad expense splitter</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-mono text-[var(--text-muted)]">TOTAL SPEND</div>
          <div className="text-[#E67E22] font-mono text-xl font-bold">${total.toFixed(2)}</div>
        </div>
      </div>

      {/* Per-member paid totals */}
      <div className="grid grid-cols-3 gap-2">
        {MEMBERS.map(m => (
          <div key={m.id} className="bg-[#0E1012] rounded-lg p-3 border border-[#1e2328] text-center">
            <div className="text-lg mb-1">{m.avatar}</div>
            <div className="text-[9px] font-mono text-[var(--text-muted)] tracking-widest">{m.name.toUpperCase()}</div>
            <div className="text-white font-mono text-sm font-semibold mt-1">${(paid[m.id] ?? 0).toFixed(2)}</div>
            <div className={`text-[9px] font-mono mt-0.5 ${balances[m.id] >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {balances[m.id] >= 0 ? '+' : ''}{balances[m.id].toFixed(2)} net
            </div>
          </div>
        ))}
      </div>

      {/* Settlement panel */}
      {settlements.length > 0 && (
        <div className="bg-[#0E1012] rounded-lg p-4 border border-[#E67E22]/20 space-y-2">
          <div className="text-[9px] font-mono text-[#E67E22] tracking-widest mb-3">SETTLEMENT PLAN</div>
          {settlements.map((s, i) => (
            <div key={i} className="flex items-center justify-between text-xs font-mono">
              <span className="text-[var(--text-secondary)]">
                <span className="text-white font-semibold">{memberName(s.from)}</span>
                <span className="text-[var(--text-muted)] mx-2">owes</span>
                <span className="text-white font-semibold">{memberName(s.to)}</span>
              </span>
              <span className="text-[#F2C94C] font-bold">${s.amount.toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}
      {settlements.length === 0 && expenses.length > 0 && (
        <div className="text-center text-[10px] font-mono text-green-400 py-2">✓ All square — no settlements needed</div>
      )}

      {/* Expense list */}
      <div className="space-y-2">
        <div className="text-[9px] font-mono text-[var(--text-muted)] tracking-widest">EXPENSES</div>
        <AnimatePresence>
          {expenses.map(e => (
            <motion.div
              key={e.id}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex items-center justify-between bg-[#0E1012] rounded p-3 border border-[#1e2328] group"
            >
              <div>
                <div className="text-white text-xs font-mono">{e.description}</div>
                <div className="text-[9px] text-[var(--text-muted)] font-mono mt-0.5">
                  paid by <span className="text-[var(--text-secondary)]">{memberName(e.paidBy)}</span> · equal split
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[#E67E22] font-mono font-bold text-sm">${e.amount.toFixed(2)}</span>
                <button
                  onClick={() => removeExpense(e.id)}
                  className="text-[var(--text-muted)] hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 text-xs"
                >✕</button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Add expense */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-[#0E1012] rounded-lg p-4 border border-[#E67E22]/30 space-y-3"
          >
            <div className="text-[9px] font-mono text-[#E67E22] tracking-widest">ADD EXPENSE</div>
            <input
              className="w-full bg-[#1a1f24] border border-[#2a2f36] rounded px-3 py-2 text-white text-xs font-mono placeholder-slate-600 focus:border-[#E67E22] outline-none"
              placeholder="Description"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
            <div className="flex gap-2">
              <input
                type="number"
                className="flex-1 bg-[#1a1f24] border border-[#2a2f36] rounded px-3 py-2 text-white text-xs font-mono placeholder-slate-600 focus:border-[#E67E22] outline-none"
                placeholder="Amount $"
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && addExpense()}
              />
              <select
                className="bg-[#1a1f24] border border-[#2a2f36] rounded px-3 py-2 text-white text-xs font-mono focus:border-[#E67E22] outline-none"
                value={form.paidBy}
                onChange={e => setForm(f => ({ ...f, paidBy: e.target.value }))}
              >
                {MEMBERS.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={addExpense}
                className="flex-1 py-2 bg-[#E67E22] text-[#0E1012] text-xs font-mono font-bold rounded hover:bg-[#F2C94C] transition-colors"
              >
                ADD
              </button>
              <button
                onClick={() => setShowAdd(false)}
                className="px-4 py-2 border border-[#2a2f36] text-[var(--text-secondary)] text-xs font-mono rounded hover:border-[#E67E22]/50 transition-colors"
              >
                CANCEL
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!showAdd && (
        <button
          onClick={() => setShowAdd(true)}
          className="w-full py-2.5 border border-dashed border-[#2a2f36] text-[var(--text-muted)] text-xs font-mono tracking-widest hover:border-[#E67E22]/50 hover:text-[#E67E22] rounded transition-colors"
        >
          + ADD EXPENSE
        </button>
      )}
    </div>
  );
}
