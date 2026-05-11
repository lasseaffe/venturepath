// src/components/onboarding/__tests__/ActionGate.test.tsx
import { render } from '@testing-library/react'
import { ActionGate } from '../ActionGate'

test('calls onComplete when matching event is dispatched', () => {
  const onComplete = vi.fn()
  render(<ActionGate completeOn="note-saved" onComplete={onComplete} />)
  window.dispatchEvent(new CustomEvent('onboarding:action', { detail: { id: 'note-saved' } }))
  expect(onComplete).toHaveBeenCalledTimes(1)
})

test('does not call onComplete for non-matching event id', () => {
  const onComplete = vi.fn()
  render(<ActionGate completeOn="note-saved" onComplete={onComplete} />)
  window.dispatchEvent(new CustomEvent('onboarding:action', { detail: { id: 'other-event' } }))
  expect(onComplete).not.toHaveBeenCalled()
})

test('does not fire when inactive', () => {
  const onComplete = vi.fn()
  render(<ActionGate completeOn="note-saved" onComplete={onComplete} active={false} />)
  window.dispatchEvent(new CustomEvent('onboarding:action', { detail: { id: 'note-saved' } }))
  expect(onComplete).not.toHaveBeenCalled()
})

test('fires only once even if event dispatched multiple times', () => {
  const onComplete = vi.fn()
  render(<ActionGate completeOn="relative-added" onComplete={onComplete} />)
  window.dispatchEvent(new CustomEvent('onboarding:action', { detail: { id: 'relative-added' } }))
  window.dispatchEvent(new CustomEvent('onboarding:action', { detail: { id: 'relative-added' } }))
  expect(onComplete).toHaveBeenCalledTimes(1)
})
