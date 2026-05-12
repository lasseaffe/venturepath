'use client'

import { useEffect } from 'react'
import { useWizardStore } from '@/store/useWizardStore'
import { nanoid } from 'nanoid'

const TYPES = ['hotel', 'hostel', 'camping', 'couchsurf']
const TYPE_ICONS = { hotel: '🏨', hostel: '🛏', camping: '⛺', couchsurf: '🛋' }

export default function AccommodationStep({ onNext }) {
  const { tickets, nothingBooked, accommodation, setAccommodation, updateAccommodation, startDate, setStep } = useWizardStore()

  useEffect(() => { setStep('accommodation') }, [setStep])

  useEffect(() => {
    if (accommodation.length > 0) return
    const legs = nothingBooked || tickets.length === 0
      ? [{ id: nanoid(), legIndex: 0, label: 'Base Camp', type: 'hotel', name: '', checkIn: startDate || '', checkOut: '', confirmation: '', notBooked: false }]
      : tickets.map((t, i) => ({ id: nanoid(), legIndex: i, label: `${t.from} → ${t.to}`, type: 'hotel', name: '', checkIn: t.date || '', checkOut: '', confirmation: '', notBooked: false }))
    setAccommodation(legs)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="font-['Playfair_Display'] text-3xl text-white mb-1">Chart Your Bases</h2>
        <p className="text-[#D9C5B2] text-sm">Where will the squad rest between legs?</p>
      </div>

      {accommodation.map((acc) => (
        <div key={acc.id} className="p-4 bg-[#141820] border border-white/10 rounded flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-white text-sm font-semibold font-mono">{acc.label}</p>
            <label className="flex items-center gap-2 text-xs text-[#D9C5B2] cursor-pointer">
              <input
                type="checkbox"
                checked={acc.notBooked}
                onChange={(e) => updateAccommodation(acc.id, { notBooked: e.target.checked })}
                className="accent-[#E67E22]"
              />
              Not booked yet
            </label>
          </div>

          {!acc.notBooked && (
            <>
              <div className="grid grid-cols-4 gap-2">
                {TYPES.map((t) => (
                  <button
                    key={t}
                    onClick={() => updateAccommodation(acc.id, { type: t })}
                    className={`py-2 px-2 text-xs rounded border transition-colors ${acc.type === t ? 'border-[#E67E22] text-[#E67E22] bg-[#E67E22]/10' : 'border-white/10 text-[#D9C5B2] hover:border-white/30'}`}
                  >
                    {TYPE_ICONS[t]} {t}
                  </button>
                ))}
              </div>
              <input
                value={acc.name}
                onChange={(e) => updateAccommodation(acc.id, { name: e.target.value })}
                placeholder="Property name (optional)"
                className="bg-[#0E1012] border border-white/10 rounded px-3 py-2 text-white text-sm placeholder-[#D9C5B2]/40 focus:outline-none focus:border-[#E67E22]/60"
              />
              <div className="grid grid-cols-3 gap-2">
                <input type="date" value={acc.checkIn} onChange={(e) => updateAccommodation(acc.id, { checkIn: e.target.value })} className="bg-[#0E1012] border border-white/10 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#E67E22]/60" />
                <input type="date" value={acc.checkOut} onChange={(e) => updateAccommodation(acc.id, { checkOut: e.target.value })} className="bg-[#0E1012] border border-white/10 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#E67E22]/60" />
                <input value={acc.confirmation} onChange={(e) => updateAccommodation(acc.id, { confirmation: e.target.value })} placeholder="Confirmation (opt.)" className="bg-[#0E1012] border border-white/10 rounded px-3 py-2 text-white text-sm placeholder-[#D9C5B2]/40 focus:outline-none focus:border-[#E67E22]/60" />
              </div>
            </>
          )}
        </div>
      ))}

      <div className="flex justify-end pt-4">
        <button onClick={onNext} className="px-6 py-2 bg-[#E67E22] text-[#0E1012] font-mono font-semibold rounded hover:bg-[#d4711f] transition-colors">
          Continue →
        </button>
      </div>
    </div>
  )
}
