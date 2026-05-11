// src/components/onboarding/__tests__/OnboardingEngine.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { OnboardingEngine } from '../OnboardingEngine'
import type { OnboardingConfig, WizardStepProps } from '../onboarding.types'

const KEY = 'test-hf-onboarding'

const MockStep = ({ onAnswer }: WizardStepProps) => (
  <button onClick={() => onAnswer('test')}>Pick me</button>
)

const mockConfig: OnboardingConfig = {
  theme: {
    motion: 'snappy',
    accent: '#9333EA',
    bg: '#FDF4FF',
    surface: '#fff',
    text: '#2D0A4E',
    textMuted: '#6B21A8',
    storageKey: KEY,
    colors: { rose: '#E8547A', purple: '#9333EA', gold: '#EAB308', blue: '#38BDF8' },
  },
  wizard: {
    steps: [{ id: 'purpose', component: MockStep, title: 'What brings you here?' }],
  },
  tour: { waypoints: [] },
  beacons: [],
}

beforeEach(() => localStorage.removeItem(KEY))

test('renders wizard for new users', () => {
  render(<OnboardingEngine config={mockConfig} />)
  expect(screen.getByText('What brings you here?')).toBeTruthy()
})

test('renders nothing once onboarding is done', () => {
  localStorage.setItem(KEY, JSON.stringify({ mode: 'done' }))
  const { container } = render(<OnboardingEngine config={mockConfig} />)
  expect(container.firstChild).toBeNull()
})

test('skip transitions onboarding to done mode', () => {
  const { container } = render(<OnboardingEngine config={mockConfig} />)
  fireEvent.click(screen.getByText('Skip'))
  expect(container.firstChild).toBeNull()
  const stored = JSON.parse(localStorage.getItem(KEY) ?? '{}')
  expect(stored.mode).toBe('done')
})
