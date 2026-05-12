'use client'

import { useState, useEffect } from 'react'
import { useWizardStore } from '@/store/useWizardStore'
import { nanoid } from 'nanoid'

const MODES = ['flight', 'train', 'bus', 'ferry']
const MODE_ICONS = { flight: '✈', train: '🚂', bus: '🚌', ferry: '⛴' }

export default function TransportStep({ onNext }) {
  const { tickets, addTicket, removeTicket, nothingBooked, setNothingBooked, setStep } = useWizardStore()
  const [form, setForm] = useState({ from: '', to: '', date: '', mode: 'flight', confirmationCode: '' })
  const [adding, setAdding] = useState(false)

  useEffect(() => { setStep('transport') }, [setStep])

  const submitTicket = () => {
    if (!form.from || !form.to || !form.date) return
    addTicket({ id: nanoid(), ...form })
    setForm({ from: '', to: '', date: '', mode: 'flight', confirmationCode: '' })
    setAdding(false)
  }

  const canContinue = nothingBooked || tickets.length > 0

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="font-['Playfair_Display'] text-3xl text-white mb-1">Log Your Transit</h2>
        <p className="text-[#D9C5B2] text-sm">Add any transport already booked for this expedition.</p>
      </div>

      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={nothingBooked}
          onChange={(e) => setNothingBooked(e.target.checked)}
          className="w-4 h-4 accent-[#E67E22]"
        />
        <span className="text-[#D9C5B2] text-sm">Nothing booked yet — I'll handle transit later in the planner</span>
      </label>

      {!nothingBooked && (
        <>
          {tickets.map((t) => (
            <div key={t.id} className="flex items-center gap-3 p-3 bg-[#141820] border border-white/10 rounded">
              <span className="text-xl">{MODE_ICONS[t.mode]}</span>
              <div className="flex-1">
                <p className="text-white text-sm font-semibold">{t.from} → {t.to}</p>
                <p className="text-[#D9C5B2] text-xs font-mono">{t.date} · {t.mode}{t.confirmationCode ? ` · ${t.confirmationCode}` : ''}</p>
              </div>
              <button onClick={() => removeTicket(t.id)} className="text-[#D9C5B2]/40 hover:text-red-400 transition-colors text-lg">×</button>
            </div>
          ))}

          {adding ? (
            <div className="p-4 bg-[#141820] border border-[#E67E22]/30 rounded flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <input value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} placeholder="From (city or airport)" className="bg-[#0E1012] border border-white/10 rounded px-3 py-2 text-white text-sm placeholder-[#D9C5B2]/40 focus:outline-none focus:border-[#E67E22]/60" />
                <input value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} placeholder="To (city or airport)" className="bg-[#0E1012] border border-white/10 rounded px-3 py-2 text-white text-sm placeholder-[#D9C5B2]/40 focus:outline-none focus:border-[#E67E22]/60" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="bg-[#0E1012] border border-white/10 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#E67E22]/60" />
                <select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })} className="bg-[#0E1012] border border-white/10 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#E67E22]/60">
                  {MODES.map((m) => <option key={m} value={m}>{MODE_ICONS[m]} {m}</option>)}
                </select>
                <input value={form.confirmationCode} onChange={(e) => setForm({ ...form, confirmationCode: e.target.value })} placeholder="Confirmation (opt.)" className="bg-[#0E1012] border border-white/10 rounded px-3 py-2 text-white text-sm placeholder-[#D9C5B2]/40 focus:outline-none focus:border-[#E67E22]/60" />
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setAdding(false)} className="px-4 py-2 text-sm font-mono text-[#D9C5B2] border border-white/10 rounded hover:border-white/30 transition-colors">Cancel</button>
                <button onClick={submitTicket} disabled={!form.from || !form.to || !form.date} className="px-4 py-2 text-sm font-mono bg-[#E67E22] text-[#0E1012] rounded font-semibold hover:bg-[#d4711f] transition-colors disabled:opacity-40">Add Ticket</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setAdding(true)} className="w-full py-3 border border-dashed border-white/20 rounded text-[#D9C5B2] text-sm font-mono hover:border-[#E67E22]/40 hover:text-[#E67E22] transition-colors">
              + Add Transit Ticket
            </button>
          )}
        </>
      )}

      <div className="flex justify-end pt-4">
        <button onClick={onNext} disabled={!canContinue} className="px-6 py-2 bg-[#E67E22] text-[#0E1012] font-mono font-semibold rounded hover:bg-[#d4711f] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
          Continue →
        </button>
      </div>
    </div>
  )
}
