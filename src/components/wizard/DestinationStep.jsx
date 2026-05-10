'use client'

import { useState, useEffect, useRef } from 'react'
import { useWizardStore } from '@/store/useWizardStore'

const CLIMATE_LABELS = {
  temperate: { label: 'Temperate', desc: 'Mild weather — standard clothing layers', color: '#4CAF50' },
  tropical:  { label: 'Tropical',  desc: 'Hot & humid — light breathable fabrics, rain gear', color: '#FF9800' },
  alpine:    { label: 'Alpine',    desc: 'Cold altitude — thermal layers, waterproofs', color: '#2196F3' },
  arctic:    { label: 'Arctic',    desc: 'Extreme cold — expedition-grade insulation', color: '#00BCD4' },
  desert:    { label: 'Desert',    desc: 'Dry heat — sun protection, hydration gear', color: '#FF5722' },
}

function detectClimate(lat, lng) {
  if (lat > 60 || lat < -60) return 'arctic'
  if (Math.abs(lat) > 45) return 'alpine'
  if (Math.abs(lat) < 23) return 'tropical'
  if (Math.abs(lng) > 100 && Math.abs(lat) < 35) return 'desert'
  return 'temperate'
}

export default function DestinationStep({ onNext }) {
  const { destination, startDate, endDate, climate, setDestination, setDates, setClimate, setStep } = useWizardStore()
  const [query, setQuery] = useState(destination?.name || '')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const debounce = useRef(null)

  useEffect(() => { setStep('destination') }, [setStep])

  useEffect(() => {
    if (query.length < 2) { setResults([]); return }
    clearTimeout(debounce.current)
    debounce.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=6`
        )
        const data = await res.json()
        setResults(data.map((r) => ({
          name: r.display_name.split(',').slice(0, 2).join(','),
          lat: parseFloat(r.lat),
          lng: parseFloat(r.lon),
          country: r.display_name.split(',').slice(-1)[0].trim(),
        })))
      } catch { setResults([]) }
      setSearching(false)
    }, 350)
    return () => clearTimeout(debounce.current)
  }, [query])

  const selectDestination = (dest) => {
    setDestination(dest)
    setClimate(detectClimate(dest.lat, dest.lng))
    setQuery(dest.name)
    setResults([])
  }

  const canContinue = destination && startDate && endDate && new Date(endDate) > new Date(startDate)

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="font-['Playfair_Display'] text-3xl text-white mb-1">Set the Coordinates</h2>
        <p className="text-[#D9C5B2] text-sm">Where is this expedition headed?</p>
      </div>

      <div className="relative">
        <label className="block text-xs font-mono text-[#D9C5B2] uppercase tracking-widest mb-2">Destination</label>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search city, region, or landmark..."
          className="w-full bg-[#141820] border border-white/10 rounded px-4 py-3 text-white placeholder-[#D9C5B2]/40 focus:outline-none focus:border-[#E67E22]/60 transition-colors"
        />
        {searching && (
          <p className="absolute right-3 top-[42px] text-xs text-[#D9C5B2] font-mono">Scanning...</p>
        )}
        {results.length > 0 && (
          <ul className="absolute z-10 w-full mt-1 bg-[#141820] border border-white/10 rounded overflow-hidden">
            {results.map((r, i) => (
              <li key={i}>
                <button
                  onClick={() => selectDestination(r)}
                  className="w-full text-left px-4 py-3 text-sm text-white hover:bg-[#E67E22]/10 transition-colors border-b border-white/5 last:border-0"
                >
                  {r.name}
                  <span className="ml-2 text-xs text-[#D9C5B2]">{r.country}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {climate && (
        <div className="flex items-center gap-3 p-4 bg-[#141820] border border-white/10 rounded">
          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: CLIMATE_LABELS[climate].color }} />
          <div>
            <p className="text-white text-sm font-semibold">{CLIMATE_LABELS[climate].label} Climate Detected</p>
            <p className="text-[#D9C5B2] text-xs">{CLIMATE_LABELS[climate].desc}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-mono text-[#D9C5B2] uppercase tracking-widest mb-2">Departure</label>
          <input
            type="date"
            value={startDate || ''}
            onChange={(e) => setDates(e.target.value, endDate || e.target.value)}
            className="w-full bg-[#141820] border border-white/10 rounded px-4 py-3 text-white focus:outline-none focus:border-[#E67E22]/60 transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs font-mono text-[#D9C5B2] uppercase tracking-widest mb-2">Return</label>
          <input
            type="date"
            value={endDate || ''}
            min={startDate || ''}
            onChange={(e) => setDates(startDate || e.target.value, e.target.value)}
            className="w-full bg-[#141820] border border-white/10 rounded px-4 py-3 text-white focus:outline-none focus:border-[#E67E22]/60 transition-colors"
          />
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button
          onClick={onNext}
          disabled={!canContinue}
          className="px-6 py-2 bg-[#E67E22] text-[#0E1012] font-mono font-semibold rounded hover:bg-[#d4711f] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Continue →
        </button>
      </div>
    </div>
  )
}
