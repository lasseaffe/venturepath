// src/components/onboarding/__tests__/useOnboardingState.test.js
import { renderHook, act } from '@testing-library/react'
import { useOnboardingState } from '../useOnboardingState'

const KEY = 'vp-onboarding-test'

beforeEach(() => localStorage.clear())

test('starts in wizard mode at step 0', () => {
  const { result } = renderHook(() => useOnboardingState(KEY))
  expect(result.current.state.mode).toBe('wizard')
  expect(result.current.state.wizardStep).toBe(0)
})

test('advanceWizard increments step and records answer', () => {
  const { result } = renderHook(() => useOnboardingState(KEY))
  act(() => result.current.advanceWizard({ terrain: 'mountain' }))
  expect(result.current.state.wizardStep).toBe(1)
  expect(result.current.state.wizardAnswers.terrain).toBe('mountain')
})

test('startTour switches mode to tour', () => {
  const { result } = renderHook(() => useOnboardingState(KEY))
  act(() => result.current.startTour())
  expect(result.current.state.mode).toBe('tour')
  expect(result.current.state.tourStep).toBe(0)
})

test('advanceTour increments tourStep', () => {
  const { result } = renderHook(() => useOnboardingState(KEY))
  act(() => result.current.startTour())
  act(() => result.current.advanceTour('map-intro'))
  expect(result.current.state.tourStep).toBe(1)
  expect(result.current.state.completedActions).toContain('map-intro')
})

test('dismissBeacon adds key to dismissedBeacons', () => {
  const { result } = renderHook(() => useOnboardingState(KEY))
  act(() => result.current.dismissBeacon('venture-vault'))
  expect(result.current.state.dismissedBeacons).toContain('venture-vault')
})

test('reset restores wizard mode at step 0', () => {
  const { result } = renderHook(() => useOnboardingState(KEY))
  act(() => result.current.startTour())
  act(() => result.current.reset())
  expect(result.current.state.mode).toBe('wizard')
  expect(result.current.state.wizardStep).toBe(0)
})

test('persists and rehydrates from localStorage', () => {
  const { result, rerender } = renderHook(() => useOnboardingState(KEY))
  act(() => result.current.startTour())
  rerender()
  expect(result.current.state.mode).toBe('tour')
})
