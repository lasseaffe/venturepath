// src/components/onboarding/WizardShell.tsx
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ProgressBar } from './ProgressBar'
import { MOTION_PRESETS } from './onboarding.motion'
import type { OnboardingConfig, OnboardingState } from './onboarding.types'

interface WizardShellProps {
  config: OnboardingConfig
  state: OnboardingState
  onAnswer: (answers: Record<string, string | string[]>) => void
  onSkip: () => void
}

export function WizardShell({ config, state, onAnswer, onSkip }: WizardShellProps) {
  const { steps } = config.wizard
  const { theme } = config
  const preset = MOTION_PRESETS.snappy
  const currentStep = steps[state.wizardStep]
  const [pendingAnswer, setPendingAnswer] = useState<string | string[] | undefined>(
    state.wizardAnswers[currentStep?.id]
  )

  const handleAnswer = (answer: string | string[]) => setPendingAnswer(answer)

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
      background: theme.bg,
      display: 'flex', flexDirection: 'column',
      maxWidth: 460, margin: '0 auto',
    }}>
      {/* Status bar */}
      <div style={{
        padding: '10px 22px 6px',
        display: 'flex', justifyContent: 'space-between',
        fontSize: 10, fontWeight: 700, color: '#9333EA',
        background: theme.bg,
      }}>
        <span>9:41</span>
        <span>●●●</span>
      </div>

      <ProgressBar current={state.wizardStep} total={steps.length} />

      <div style={{ flex: 1, padding: '4px 20px 0', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        {/* Skip */}
        <button
          onClick={onSkip}
          style={{
            alignSelf: 'flex-end',
            fontSize: 11, color: '#D8B4FE', fontWeight: 600,
            background: 'none', border: 'none', cursor: 'pointer', marginBottom: 8,
          }}
        >
          Skip
        </button>

        {/* Question title */}
        <div style={{
          fontSize: 20, fontWeight: 900, color: '#2D0A4E',
          lineHeight: 1.25, marginBottom: 16, fontFamily: 'Inter, sans-serif',
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
              onAnswer={handleAnswer}
              answer={pendingAnswer}
              theme={theme}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* CTA — only appears after selection */}
      <AnimatePresence>
        {pendingAnswer && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            style={{ padding: '12px 20px 24px', background: theme.bg, flexShrink: 0 }}
          >
            <button
              onClick={handleContinue}
              style={{
                width: '100%', border: 'none', borderRadius: 14, padding: 16,
                fontSize: 15, fontWeight: 900, color: '#fff',
                background: 'linear-gradient(135deg, #E8547A, #9333EA)',
                boxShadow: '0 4px 18px rgba(147,51,234,0.35)',
                cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              }}
            >
              {state.wizardStep === steps.length - 1 ? 'Let\'s begin ✦' : 'Continue'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
