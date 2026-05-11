// src/components/onboarding/WizardShell.jsx
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ProgressBar } from './ProgressBar'
import { MOTION_PRESETS } from './onboarding.motion'

export function WizardShell({ config, state, onAnswer, onSkip }) {
  const { steps } = config.wizard
  const preset = MOTION_PRESETS.terminal
  const currentStep = steps[state.wizardStep]
  const [pendingAnswer, setPendingAnswer] = useState(state.wizardAnswers[currentStep?.id])

  const handleContinue = () => {
    if (!pendingAnswer) return
    onAnswer({ [currentStep.id]: pendingAnswer })
    setPendingAnswer(undefined)
  }

  if (!currentStep) return null
  const StepComponent = currentStep.component

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: '#0C0F0A',
      display: 'flex', flexDirection: 'column',
      maxWidth: 460, margin: '0 auto',
      fontFamily: '"JetBrains Mono", monospace',
    }}>
      {/* Terminal status bar */}
      <div style={{
        padding: '10px 20px 6px',
        display: 'flex', justifyContent: 'space-between',
        fontSize: 10, fontWeight: 700, color: '#4A7C59',
        letterSpacing: 1,
      }}>
        <span>VENTUREPATH</span>
        <span>{state.wizardStep + 1}/{steps.length}</span>
      </div>

      <ProgressBar current={state.wizardStep} total={steps.length} />

      <div style={{ flex: 1, padding: '8px 20px 0', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        <button
          onClick={onSkip}
          style={{
            alignSelf: 'flex-end', fontSize: 10, color: '#4A7C59',
            fontFamily: '"JetBrains Mono", monospace',
            background: 'none', border: 'none', cursor: 'pointer', marginBottom: 16,
            letterSpacing: 1,
          }}
        >
          [SKIP]
        </button>

        {/* Question — prefixed with terminal `>` */}
        <div style={{
          fontSize: 16, fontWeight: 700, color: '#E8F5E0',
          lineHeight: 1.4, marginBottom: 20,
          letterSpacing: 0.5,
        }}>
          {currentStep.title}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep.id}
            variants={preset.cardVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <StepComponent
              onAnswer={(a) => setPendingAnswer(a)}
              answer={pendingAnswer}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* CTA — outlined terminal button */}
      <AnimatePresence>
        {pendingAnswer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.05 }}
            style={{ padding: '12px 20px 28px', background: '#0C0F0A', flexShrink: 0 }}
          >
            <button
              onClick={handleContinue}
              className="vp-cta-btn"
              style={{
                width: '100%',
                padding: '14px 0',
                border: '1px solid #E67E22',
                borderRadius: 6,
                background: 'transparent',
                color: '#E67E22',
                fontSize: 13, fontWeight: 700,
                fontFamily: '"JetBrains Mono", monospace',
                cursor: 'pointer',
                letterSpacing: 1,
                transition: 'all 0.12s steps(3, end)',
              }}
              onMouseEnter={e => { e.target.style.background = '#E67E22'; e.target.style.color = '#0C0F0A' }}
              onMouseLeave={e => { e.target.style.background = 'transparent'; e.target.style.color = '#E67E22' }}
            >
              {state.wizardStep === steps.length - 1 ? '> INITIATE TOUR' : '> CONFIRM'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
