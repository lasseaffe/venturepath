'use client'

import { useEffect, useState } from 'react'
import { useWizardStore } from '@/store/useWizardStore'

const LINES = [
  '> Initialising Expedition Briefing...',
  '> Loading destination engine... OK',
  '> Calibrating squad manifest... OK',
  '> Connecting to transit ledger... OK',
  '> Briefing ready. Welcome, Architect.',
  '',
  '> We will architect together:',
  '>   destination → squad → transit → bases',
  '>   objectives → days → budget → gear',
  '',
  '> Estimated time: 8 minutes.',
  '> Progress is saved at every step.',
]

export default function WelcomeStep({ onNext }) {
  const [visibleLines, setVisibleLines] = useState(0)
  const [done, setDone] = useState(false)
  const setStep = useWizardStore((s) => s.setStep)

  useEffect(() => {
    setStep('welcome')
  }, [setStep])

  useEffect(() => {
    if (visibleLines >= LINES.length) {
      setTimeout(() => setDone(true), 400)
      return
    }
    const t = setTimeout(() => setVisibleLines((v) => v + 1), visibleLines < 5 ? 320 : 180)
    return () => clearTimeout(t)
  }, [visibleLines])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-10">
      <div className="w-full max-w-xl bg-[#0A0A0A] border border-[#E67E22]/20 rounded-lg p-6 font-['JetBrains_Mono',monospace] text-sm">
        {LINES.slice(0, visibleLines).map((line, i) => (
          <div key={i} className={`leading-7 ${line.startsWith('>') ? 'text-[#E67E22]' : 'text-[#D9C5B2]'}`}>
            {line || ' '}
            {i === visibleLines - 1 && !done && (
              <span className="inline-block w-2 h-4 bg-[#E67E22] ml-1 animate-pulse align-middle" />
            )}
          </div>
        ))}
      </div>

      {done && (
        <button
          onClick={onNext}
          className="px-8 py-3 bg-[#E67E22] text-[#0E1012] font-mono font-semibold rounded hover:bg-[#d4711f] transition-all duration-200 hover:scale-105"
        >
          Begin Expedition Briefing →
        </button>
      )}
    </div>
  )
}
