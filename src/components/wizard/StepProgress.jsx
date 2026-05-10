// src/components/wizard/StepProgress.jsx
'use client'

const STEPS = [
  'welcome', 'destination', 'squad', 'transport',
  'accommodation', 'stops', 'itinerary', 'budget', 'packing', 'readiness'
]

const STEP_LABELS = {
  welcome: 'Briefing', destination: 'Coordinates', squad: 'Squad',
  transport: 'Transit', accommodation: 'Bases', stops: 'Objectives',
  itinerary: 'Days', budget: 'Ledger', packing: 'Gear', readiness: 'Readiness',
}

export default function StepProgress({ currentStep }) {
  const currentIndex = STEPS.indexOf(currentStep)

  return (
    <div className="flex flex-col items-center gap-1">
      <p className="text-xs font-mono text-[#D9C5B2] tracking-widest uppercase">
        {STEP_LABELS[currentStep]} — {currentIndex + 1} of {STEPS.length}
      </p>
      <div className="flex gap-1">
        {STEPS.map((step, i) => (
          <div
            key={step}
            className={`h-1 w-6 rounded-full transition-all duration-300 ${
              i < currentIndex
                ? 'bg-[#E67E22]'
                : i === currentIndex
                ? 'bg-[#E67E22] opacity-60'
                : 'bg-[#D9C5B2] opacity-20'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
