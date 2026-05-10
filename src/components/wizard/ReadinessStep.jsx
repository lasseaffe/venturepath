'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useWizardStore } from '@/store/useWizardStore'
import { useTripStore } from '@/store/useTripStore'

const AXES = ['route', 'squad', 'logistics', 'budget', 'packing']
const AXIS_LABELS = {
  route: 'Route Completeness',
  squad: 'Squad Readiness',
  logistics: 'Logistics',
  budget: 'Budget Coverage',
  packing: 'Packing',
}
const AXIS_STEPS = {
  route: 'itinerary',
  squad: 'squad',
  logistics: 'transport',
  budget: 'budget',
  packing: 'packing',
}

function computeScores(store) {
  const { days, itineraryGrid, squad, tickets, nothingBooked, budget, packingList } = store

  // Route: % of days with ≥1 stop placed
  const daysWithStops = Array.from({ length: days || 0 }, (_, i) =>
    Object.values(itineraryGrid[i] || {}).some(Boolean)
  ).filter(Boolean).length
  const route = days > 0 ? Math.round((daysWithStops / days) * 100) : 0

  // Squad: solo = 100, has members + at least one role assigned = 100, members but no roles = 50
  const squadScore = squad.length === 0 ? 100 : squad.some((m) => m.role) ? 100 : 50

  // Logistics: tickets entered OR nothingBooked acknowledged
  const logistics = tickets.length > 0 || nothingBooked ? 100 : 0

  // Budget: ceiling set + all cats non-zero
  const budgetOk = budget.ceiling > 0 && Object.values(budget.splits).every((v) => v > 0)
  const budgetScore = budgetOk ? 100 : budget.ceiling > 0 ? 50 : 0

  // Packing: >50% checked
  const packingScore = packingList.length === 0 ? 0
    : packingList.filter((i) => i.checked).length / packingList.length >= 0.5 ? 100 : 40

  const overall = Math.round((route + squadScore + logistics + budgetScore + packingScore) / 5)
  return { route, squad: squadScore, logistics, budget: budgetScore, packing: packingScore, overall }
}

function ScoreBar({ score, color, animated }) {
  return (
    <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-1000"
        style={{ width: animated ? `${score}%` : '0%', backgroundColor: color }}
      />
    </div>
  )
}

export default function ReadinessStep() {
  const router = useRouter()
  const wizardStore = useWizardStore()
  const { setReadinessScore, resetWizard } = wizardStore

  // useTripStore is a React context — use the hook directly (not getState())
  const { createTrip } = useTripStore()

  const [scores, setScores] = useState({ route: 0, squad: 0, logistics: 0, budget: 0, packing: 0, overall: 0 })
  const [animated, setAnimated] = useState(false)
  const [launching, setLaunching] = useState(false)

  useEffect(() => { wizardStore.setStep('readiness') }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const computed = computeScores(wizardStore)
    setReadinessScore(computed)
    setTimeout(() => { setScores(computed); setAnimated(true) }, 150)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const getColor = (score) => score >= 80 ? '#4CAF50' : score >= 60 ? '#FF9800' : '#F44336'
  const overallColor = getColor(scores.overall)

  const launchExpedition = async () => {
    if (launching) return
    setLaunching(true)

    try {
      // Bridge wizard → TripStore: CREATE_TRIP replaces the active expedition
      // and persists to localStorage (vp-trip-store), which TripPlanner reads on mount.
      createTrip({
        name: `${wizardStore.destination?.name || 'Expedition'} ${new Date().getFullYear()}`,
        destination: wizardStore.destination?.name || '',
        startDate: wizardStore.startDate,
        endDate: wizardStore.endDate,
        climate: wizardStore.climate || 'temperate',
      })

      resetWizard()
      router.push('/')
    } catch (e) {
      console.error('Launch failed:', e)
      setLaunching(false)
    }
  }

  return (
    <div className="flex flex-col gap-8 items-center max-w-lg mx-auto w-full">
      <div className="text-center">
        <h2 className="font-['Playfair_Display'] text-3xl text-white mb-1">Launch Readiness</h2>
        <p className="text-[#D9C5B2] text-sm">Expedition briefing complete. Final systems check.</p>
      </div>

      {/* Overall score circle */}
      <div className="relative w-36 h-36">
        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
          <circle r={50} cx={60} cy={60} fill="none" stroke="#ffffff10" strokeWidth={10} />
          <circle
            r={50} cx={60} cy={60} fill="none"
            stroke={overallColor} strokeWidth={10}
            strokeDasharray={`${2 * Math.PI * 50 * (animated ? scores.overall : 0) / 100} ${2 * Math.PI * 50}`}
            style={{ transition: 'stroke-dasharray 1.2s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-['JetBrains_Mono',monospace] text-3xl font-bold leading-none" style={{ color: overallColor }}>
            {scores.overall}
          </span>
          <span className="text-[#D9C5B2] text-xs font-mono">/ 100</span>
        </div>
      </div>

      {/* Axis bars */}
      <div className="w-full flex flex-col gap-4">
        {AXES.map((axis) => {
          const score = scores[axis]
          const color = getColor(score)
          return (
            <div key={axis}>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-white">{AXIS_LABELS[axis]}</span>
                <span className="text-sm font-mono transition-all duration-1000" style={{ color }}>
                  {animated ? score : 0}
                </span>
              </div>
              <ScoreBar score={score} color={color} animated={animated} />
              {score < 60 && (
                <button
                  onClick={() => router.push(`/expedition/new/${AXIS_STEPS[axis]}`)}
                  className="text-xs text-amber-400 font-mono hover:underline mt-0.5"
                >
                  ← Go back and improve
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Status panel */}
      <div className={`w-full p-4 rounded border text-center ${
        scores.overall >= 80 ? 'border-green-500/40 bg-green-500/5'
        : scores.overall >= 60 ? 'border-amber-500/40 bg-amber-500/5'
        : 'border-red-500/40 bg-red-500/5'
      }`}>
        <p className="font-mono text-sm" style={{ color: overallColor }}>
          {scores.overall >= 80
            ? '✓ Expedition Cleared for Launch'
            : scores.overall >= 60
            ? '⚠ Expedition Ready — Some Gaps Remain'
            : '⛔ Expedition Not Ready — Address Critical Gaps'}
        </p>
      </div>

      {scores.overall >= 60 && (
        <button
          onClick={launchExpedition}
          disabled={launching}
          className="px-10 py-3 bg-[#E67E22] text-[#0E1012] font-mono font-bold rounded text-lg hover:bg-[#d4711f] transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {launching ? 'Launching...' : '🚀 Launch Expedition'}
        </button>
      )}
    </div>
  )
}
