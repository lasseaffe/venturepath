// src/components/onboarding/__tests__/ActionGate.test.jsx
import { render } from '@testing-library/react'
import { ActionGate } from '../ActionGate'

test('calls onComplete when matching event is dispatched', () => {
  const onComplete = vi.fn()
  render(<ActionGate completeOn="destination-set" onComplete={onComplete} />)
  window.dispatchEvent(new CustomEvent('onboarding:action', { detail: { id: 'destination-set' } }))
  expect(onComplete).toHaveBeenCalledTimes(1)
})

test('ignores events with wrong id', () => {
  const onComplete = vi.fn()
  render(<ActionGate completeOn="destination-set" onComplete={onComplete} />)
  window.dispatchEvent(new CustomEvent('onboarding:action', { detail: { id: 'stop-added' } }))
  expect(onComplete).not.toHaveBeenCalled()
})

test('fires only once even for duplicate events', () => {
  const onComplete = vi.fn()
  render(<ActionGate completeOn="vote-cast" onComplete={onComplete} />)
  window.dispatchEvent(new CustomEvent('onboarding:action', { detail: { id: 'vote-cast' } }))
  window.dispatchEvent(new CustomEvent('onboarding:action', { detail: { id: 'vote-cast' } }))
  expect(onComplete).toHaveBeenCalledTimes(1)
})
