'use client'

import { useState, useEffect } from 'react'
import { useWizardStore } from '@/store/useWizardStore'

const SLOTS = ['morning', 'afternoon', 'evening']
const SLOT_LABELS = { morning: '☀ Morning', afternoon: '🌤 Afternoon', evening: '🌙 Evening' }
const DURATION_HOURS = { half: 4, full: 8, multi: 10 }
const INTENSITY_COLORS = { low: '#4CAF50', medium: '#FF9800', high: '#F44336' }

function getDayLoad(daySlots, stops) {
  return Object.values(daySlots || {}).reduce((total, stopId) => {
    const stop = stops.find((s) => s.id === stopId)
    return total + (stop ? (DURATION_HOURS[stop.duration] || 0) : 0)
  }, 0)
}

function getDayHighCount(daySlots, stops) {
  return Object.values(daySlots || {}).filter((stopId) => {
    const stop = stops.find((s) => s.id === stopId)
    return stop?.intensity === 'high'
  }).length
}

function DayLoadBar({ hours }) {
  const pct = Math.min(100, (hours / 12) * 100)
  const color = hours > 10 ? '#F44336' : hours > 7 ? '#FF9800' : '#4CAF50'
  return (
    <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden mt-1">
      <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  )
}

function StopChip({ stop }) {
  return (
    <div className="px-2 py-1 rounded text-xs text-white flex items-center gap-1 cursor-grab active:cursor-grabbing"
      style={{ backgroundColor: `${INTENSITY_COLORS[stop.intensity]}22`, border: `1px solid ${INTENSITY_COLORS[stop.intensity]}66` }}>
      <span className="w-1.5 h-1.5 rounded-full inline-block flex-shrink-0" style={{ backgroundColor: INTENSITY_COLORS[stop.intensity] }} />
      <span className="truncate max-w-[120px]">{stop.name}</span>
    </div>
  )
}

function GridCell({ dayIndex, slot, stopId, stops, onDrop, onRemove }) {
  const stop = stops.find((s) => s.id === stopId)
  const [over, setOver] = useState(false)

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        const id = e.dataTransfer.getData('stopId')
        if (id) onDrop(dayIndex, slot, id)
      }}
      className={`min-h-[52px] rounded border transition-colors p-1.5 ${over ? 'border-[#E67E22]/60 bg-[#E67E22]/5' : 'border-white/5 bg-white/[0.02]'}`}
    >
      {stop ? (
        <div className="flex items-start gap-1">
          <StopChip stop={stop} />
          <button
            onClick={() => onRemove(dayIndex, slot)}
            className="text-[#D9C5B2]/40 hover:text-red-400 transition-colors text-sm leading-none ml-auto flex-shrink-0"
          >
            ×
          </button>
        </div>
      ) : (
        <p className="text-[#D9C5B2]/20 text-xs font-mono text-center py-2">drop here</p>
      )}
    </div>
  )
}

export default function ItineraryGridStep({ onNext }) {
  const {
    stops, days, itineraryGrid, setItineraryGrid, clearSlot,
    aiSuggestion, setAiSuggestion, startDate, squad, climate, setStep
  } = useWizardStore()

  const [aiLoading, setAiLoading] = useState(false)
  const [aiNarrative, setAiNarrative] = useState(aiSuggestion?.narrative || '')

  useEffect(() => { setStep('itinerary') }, [setStep])

  const placedIds = new Set(
    Object.values(itineraryGrid).flatMap((slots) => Object.values(slots).filter(Boolean))
  )
  const unplacedStops = stops.filter((s) => !placedIds.has(s.id))

  const handleDrop = (dayIndex, slot, stopId) => {
    const newGrid = JSON.parse(JSON.stringify(itineraryGrid))
    // Remove from any existing cell
    for (const day of Object.keys(newGrid)) {
      for (const s of SLOTS) {
        if (newGrid[day]?.[s] === stopId) newGrid[day][s] = null
      }
    }
    if (!newGrid[dayIndex]) newGrid[dayIndex] = {}
    newGrid[dayIndex][slot] = stopId
    setItineraryGrid(newGrid)
  }

  const handleRemove = (dayIndex, slot) => {
    clearSlot(dayIndex, slot)
  }

  const optimizeWithAI = async () => {
    if (stops.length === 0 || aiLoading) return
    setAiLoading(true)
    setAiNarrative('')
    try {
      const res = await fetch('/api/wizard-optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stops,
          days,
          startDate,
          squadSize: squad.length || 1,
          climate,
        }),
      })
      if (!res.ok) throw new Error('API error')
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let full = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        full += chunk
        setAiNarrative(full)
      }
      const jsonMatch = full.match(/```json\n([\s\S]*?)\n```/)
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[1])
          setAiSuggestion({ narrative: full, proposedGrid: parsed.proposedGrid, conflicts: parsed.conflicts || [] })
        } catch { /* malformed JSON block — show narrative only */ }
      }
    } catch {
      setAiNarrative('Failed to reach optimization service. Check your connection and try again.')
    }
    setAiLoading(false)
  }

  const acceptAILayout = () => {
    if (!aiSuggestion?.proposedGrid) return
    const nameToId = Object.fromEntries(stops.map((s) => [s.name, s.id]))
    const newGrid = {}
    for (const [day, slots] of Object.entries(aiSuggestion.proposedGrid)) {
      newGrid[day] = {}
      for (const [slot, nameOrNull] of Object.entries(slots)) {
        newGrid[day][slot] = nameOrNull ? (nameToId[nameOrNull] || null) : null
      }
    }
    setItineraryGrid(newGrid)
  }

  const dayDates = Array.from({ length: days || 1 }, (_, i) => {
    if (!startDate) return `Day ${i + 1}`
    const d = new Date(startDate)
    d.setDate(d.getDate() + i)
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-['Playfair_Display'] text-3xl text-white mb-1">Architect the Days</h2>
        <p className="text-[#D9C5B2] text-sm">Drag objectives into day slots. Balance intensity across the expedition.</p>
      </div>

      <div className="flex gap-4 items-start">
        {/* Unplaced pool */}
        <div className="w-44 flex-shrink-0">
          <p className="text-xs font-mono text-[#D9C5B2] uppercase tracking-widest mb-2">
            Unplaced ({unplacedStops.length})
          </p>
          <div className="flex flex-col gap-1.5 p-2 bg-[#141820] border border-white/10 rounded min-h-[120px]">
            {unplacedStops.map((s) => (
              <div
                key={s.id}
                draggable
                onDragStart={(e) => e.dataTransfer.setData('stopId', s.id)}
              >
                <StopChip stop={s} />
              </div>
            ))}
            {unplacedStops.length === 0 && (
              <p className="text-[#D9C5B2]/20 text-xs font-mono text-center mt-6">All placed ✓</p>
            )}
          </div>
        </div>

        {/* Day grid */}
        <div className="flex-1 overflow-x-auto">
          <div className="min-w-[480px]">
            {/* Column headers */}
            <div className="grid grid-cols-4 gap-1 mb-2">
              <div />
              {SLOTS.map((slot) => (
                <p key={slot} className="text-xs font-mono text-[#D9C5B2] text-center uppercase tracking-widest">
                  {SLOT_LABELS[slot]}
                </p>
              ))}
            </div>

            {/* Rows */}
            {dayDates.map((label, dayIndex) => {
              const daySlots = itineraryGrid[dayIndex] || {}
              const hours = getDayLoad(daySlots, stops)
              const highCount = getDayHighCount(daySlots, stops)
              const isAmber = highCount >= 2
              const isRed = hours > 10
              const needsRest = dayIndex > 0 && dayIndex % 4 === 3 &&
                !Object.values(daySlots).some((id) => stops.find((s) => s.id === id)?.type === 'rest')

              return (
                <div
                  key={dayIndex}
                  className={`grid grid-cols-4 gap-1 mb-2 p-2 rounded border transition-colors ${
                    isRed ? 'border-red-500/40 bg-red-500/5'
                    : isAmber ? 'border-amber-500/40 bg-amber-500/5'
                    : 'border-white/5'
                  }`}
                >
                  <div className="flex flex-col justify-start pt-0.5 pr-1">
                    <p className="text-xs text-white font-mono leading-tight">{label}</p>
                    <DayLoadBar hours={hours} />
                    <p className="text-[9px] text-[#D9C5B2]/60 font-mono mt-0.5">{hours}h est.</p>
                    {isAmber && !isRed && <span className="text-[9px] text-amber-400 font-mono">⚠ High load</span>}
                    {isRed && <span className="text-[9px] text-red-400 font-mono">⛔ Overloaded</span>}
                    {needsRest && <span className="text-[9px] text-[#D9C5B2]/60 font-mono">💤 Rest?</span>}
                  </div>
                  {SLOTS.map((slot) => (
                    <GridCell
                      key={slot}
                      dayIndex={dayIndex}
                      slot={slot}
                      stopId={daySlots[slot]}
                      stops={stops}
                      onDrop={handleDrop}
                      onRemove={handleRemove}
                    />
                  ))}
                </div>
              )
            })}
          </div>
        </div>

        {/* AI panel */}
        <div className="w-56 flex-shrink-0">
          <p className="text-xs font-mono text-[#D9C5B2] uppercase tracking-widest mb-2">AI Pacing</p>
          <div className={`p-3 bg-[#141820] border rounded min-h-[160px] transition-colors ${aiLoading ? 'border-[#E67E22]/40' : 'border-white/10'}`}>
            {!aiNarrative && !aiLoading && (
              <p className="text-[#D9C5B2]/50 text-xs font-mono leading-relaxed">
                Place your objectives, then tap Optimize to get AI pacing suggestions.
              </p>
            )}
            {aiLoading && (
              <div className="flex flex-col gap-2">
                <div className="h-2 bg-[#E67E22]/20 rounded animate-pulse" />
                <div className="h-2 bg-[#E67E22]/20 rounded animate-pulse w-3/4" />
                <div className="h-2 bg-[#E67E22]/20 rounded animate-pulse w-1/2" />
                <p className="text-[#E67E22] text-xs font-mono mt-1">Analysing...</p>
              </div>
            )}
            {aiNarrative && (
              <div className="text-[#D9C5B2] text-xs leading-relaxed overflow-y-auto max-h-[320px]">
                {aiNarrative.replace(/```json[\s\S]*?```/g, '').trim()}
              </div>
            )}
            {aiSuggestion?.conflicts?.length > 0 && (
              <div className="mt-3 pt-3 border-t border-white/10 flex flex-col gap-1">
                {aiSuggestion.conflicts.map((c, i) => (
                  <p key={i} className="text-amber-400 text-xs font-mono">⚠ {c}</p>
                ))}
              </div>
            )}
            {aiSuggestion?.proposedGrid && (
              <button
                onClick={acceptAILayout}
                className="mt-3 w-full py-1.5 text-xs font-mono bg-[#E67E22] text-[#0E1012] rounded font-semibold hover:bg-[#d4711f] transition-colors"
              >
                Accept AI Layout
              </button>
            )}
          </div>
          <button
            onClick={optimizeWithAI}
            disabled={aiLoading || stops.length === 0}
            className="mt-2 w-full py-2 text-xs font-mono border border-[#E67E22]/40 text-[#E67E22] rounded hover:bg-[#E67E22]/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {aiLoading ? 'Optimizing...' : '✦ Optimize with Claude'}
          </button>
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
