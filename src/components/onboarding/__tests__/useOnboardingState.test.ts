// src/components/onboarding/__tests__/useOnboardingState.test.ts
import { renderHook, act } from '@testing-library/react'
import { useOnboardingState } from '../useOnboardingState'

const KEY = 'hf-onboarding'

beforeEach(() => localStorage.clear())

test('starts in wizard mode at step 0', () => {
  const { result } = renderHook(() => useOnboardingState(KEY))
  expect(result.current.state.mode).toBe('wizard')
  expect(result.current.state.wizardStep).toBe(0)
})

test('advanceWizard increments step', () => {
  const { result } = renderHook(() => useOnboardingState(KEY))
  act(() => result.current.advanceWizard({ purpose: 'scripture' }))
  expect(result.current.state.wizardStep).toBe(1)
  expect(result.current.state.wizardAnswers.purpose).toBe('scripture')
})

test('startTour switches mode to tour', () => {
  const { result } = renderHook(() => useOnboardingState(KEY))
  act(() => result.current.startTour())
  expect(result.current.state.mode).toBe('tour')
})

test('advanceTour increments tourStep', () => {
  const { result } = renderHook(() => useOnboardingState(KEY))
  act(() => result.current.startTour())
  act(() => result.current.advanceTour('cfm-intro'))
  expect(result.current.state.tourStep).toBe(1)
})

test('dismissBeacon adds to dismissedBeacons', () => {
  const { result } = renderHook(() => useOnboardingState(KEY))
  act(() => result.current.dismissBeacon('mission-prep'))
  expect(result.current.state.dismissedBeacons).toContain('mission-prep')
})

test('reset restores initial state', () => {
  const { result } = renderHook(() => useOnboardingState(KEY))
  act(() => result.current.startTour())
  act(() => result.current.reset())
  expect(result.current.state.mode).toBe('wizard')
})

test('persists state across remounts', () => {
  const { result, rerender } = renderHook(() => useOnboardingState(KEY))
  act(() => result.current.startTour())
  rerender()
  expect(result.current.state.mode).toBe('tour')
})
