// src/components/wizard/WizardShell.jsx
'use client'

import { useState } from 'react'

import StepProgress from './StepProgress'

const STEPS = [
  'welcome', 'destination', 'squad', 'transport',
  'accommodation', 'stops', 'itinerary', 'budget', 'packing', 'readiness'
]

export default function WizardShell({ currentStep, children, onBack, onContinue, continueLabel = 'Continue', continueDisabled = false }) {
  const [showExitConfirm, setShowExitConfirm] = useState(false)
  const currentIndex = STEPS.indexOf(currentStep)
  const isFirst = currentIndex === 0

  return (
    <div className="min-h-screen bg-[#0E1012] flex flex-col" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E\")" }}>

      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <span className="font-['Playfair_Display'] text-lg text-white tracking-wide">VenturePath</span>
        <StepProgress currentStep={currentStep} />
        <button
          onClick={() => setShowExitConfirm(true)}
          className="text-xs text-[#D9C5B2] hover:text-white transition-colors font-mono tracking-widest uppercase"
        >
          Exit to Dashboard
        </button>
      </header>

      {/* Content */}
      <main className="flex-1 flex flex-col items-center px-4 py-8 overflow-y-auto">
        <div className="w-full max-w-[860px]">
          {children}
        </div>
      </main>

      {/* Bottom nav */}
      {currentStep !== 'welcome' && (
        <footer className="border-t border-white/5 px-6 py-4 flex justify-between items-center">
          <button
            onClick={onBack}
            disabled={isFirst}
            className="px-5 py-2 text-sm font-mono text-[#D9C5B2] border border-white/10 rounded hover:border-white/30 transition-colors disabled:opacity-30"
          >
            ← Back
          </button>
          <button
            onClick={onContinue}
            disabled={continueDisabled}
            className="px-6 py-2 text-sm font-mono bg-[#E67E22] text-[#0E1012] rounded font-semibold hover:bg-[#d4711f] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {continueLabel} →
          </button>
        </footer>
      )}

      {/* Exit confirmation modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-[#141820] border border-white/10 rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="font-['Playfair_Display'] text-white text-lg mb-2">Leave the Briefing?</h3>
            <p className="text-[#D9C5B2] text-sm mb-6">Your progress is saved. You can resume this expedition briefing anytime from the dashboard.</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="px-4 py-2 text-sm font-mono text-[#D9C5B2] border border-white/10 rounded hover:border-white/30 transition-colors"
              >
                Stay
              </button>
              <button
                onClick={() => window.location.assign('/')}
                className="px-4 py-2 text-sm font-mono bg-[#E67E22] text-[#0E1012] rounded font-semibold hover:bg-[#d4711f] transition-colors"
              >
                Exit to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
