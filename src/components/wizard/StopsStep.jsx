'use client'

import { useState, useRef, useEffect } from 'react'
import { useWizardStore } from '@/store/useWizardStore'
import { nanoid } from 'nanoid'

const INTENSITIES = ['low', 'medium', 'high']
const INTENSITY_COLORS = { low: '#4CAF50', medium: '#FF9800', high: '#F44336' }
const DURATIONS = ['half', 'full', 'multi']
const DURATION_LABELS = { half: 'Half day', full: 'Full day', multi: 'Multi-day' }
const STOP_TYPES = ['activity', 'cultural', 'food', 'rest', 'transit']

export default function StopsStep({ onNext }) {
  const { stops, addStop, removeStop, updateStop, setStep } = useWizardStore()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const debounce = useRef(null)

  useEffect(() => { setStep('stops') }, [setStep])

  const search = (q) => {
    setQuery(q)
    if (q.length < 2) { setResults([]); return }
    clearTimeout(debounce.current)
    debounce.current = setTimeout(async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5`)
        const data = await res.json()
        setResults(data.map((r) => ({
          name: r.display_name.split(',').slice(0, 2).join(','),
          lat: parseFloat(r.lat),
          lng: parseFloat(r.lon),
        })))
      } catch { setResults([]) }
    }, 350)
  }

  const selectStop = (r) => {
    if (stops.length >= 40) return
    addStop({ id: nanoid(), name: r.name, lat: r.lat, lng: r.lng, intensity: 'medium', duration: 'full', type: 'activity' })
    setQuery('')
    setResults([])
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-['Playfair_Display'] text-3xl text-white mb-1">Mark Your Objectives</h2>
        <p className="text-[#D9C5B2] text-sm">Add every stop you're planning. You'll arrange them by day in the next step.</p>
      </div>

      <div className="relative">
        <input
          value={query}
          onChange={(e) => search(e.target.value)}
          placeholder="Search for a stop, attraction, or landmark..."
          className="w-full bg-[#141820] border border-white/10 rounded px-4 py-3 text-white placeholder-[#D9C5B2]/40 focus:outline-none focus:border-[#E67E22]/60 transition-colors"
        />
        {results.length > 0 && (
          <ul className="absolute z-10 w-full mt-1 bg-[#141820] border border-white/10 rounded overflow-hidden">
            {results.map((r, i) => (
              <li key={i}>
                <button onClick={() => selectStop(r)} className="w-full text-left px-4 py-3 text-sm text-white hover:bg-[#E67E22]/10 transition-colors border-b border-white/5 last:border-0">
                  {r.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {stops.length === 0 && (
        <p className="text-center text-[#D9C5B2] text-sm py-8 border border-dashed border-white/10 rounded">
          No objectives yet — search above to add your first stop.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {stops.map((s) => (
          <div key={s.id} className="p-4 bg-[#141820] border border-white/10 rounded flex flex-col gap-3">
            <div className="flex items-start justify-between">
              <p className="text-white text-sm font-semibold">{s.name}</p>
              <button onClick={() => removeStop(s.id)} className="text-[#D9C5B2]/40 hover:text-red-400 transition-colors text-lg leading-none">×</button>
            </div>
            <div className="flex gap-4 flex-wrap">
              <div className="flex gap-1">
                {INTENSITIES.map((level) => (
                  <button key={level} onClick={() => updateStop(s.id, { intensity: level })}
                    style={{ borderColor: s.intensity === level ? INTENSITY_COLORS[level] : 'transparent', color: s.intensity === level ? INTENSITY_COLORS[level] : '#D9C5B2' }}
                    className="px-3 py-1 text-xs border rounded capitalize transition-colors hover:border-white/30">
                    {level}
                  </button>
                ))}
              </div>
              <div className="flex gap-1">
                {DURATIONS.map((d) => (
                  <button key={d} onClick={() => updateStop(s.id, { duration: d })}
                    className={`px-3 py-1 text-xs border rounded transition-colors ${s.duration === d ? 'border-[#E67E22] text-[#E67E22]' : 'border-white/10 text-[#D9C5B2] hover:border-white/30'}`}>
                    {DURATION_LABELS[d]}
                  </button>
                ))}
              </div>
              <select value={s.type} onChange={(e) => updateStop(s.id, { type: e.target.value })}
                className="bg-[#0E1012] border border-white/10 rounded px-2 py-1 text-[#D9C5B2] text-xs focus:outline-none focus:border-[#E67E22]/60">
                {STOP_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
        ))}
      </div>

      {stops.length >= 40 && <p className="text-amber-400 text-xs font-mono">Maximum 40 objectives reached.</p>}

      <div className="flex justify-end pt-4">
        <button onClick={onNext} className="px-6 py-2 bg-[#E67E22] text-[#0E1012] font-mono font-semibold rounded hover:bg-[#d4711f] transition-colors">
          Continue →
        </button>
      </div>
    </div>
  )
}
