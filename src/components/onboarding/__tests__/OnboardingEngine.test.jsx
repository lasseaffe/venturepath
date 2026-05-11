// src/components/onboarding/__tests__/OnboardingEngine.test.jsx
import { render, screen } from '@testing-library/react'
import { OnboardingEngine } from '../OnboardingEngine'

const MockStep = ({ onAnswer }) => (
  <button onClick={() => onAnswer('mountain')}>Mountain</button>
)

const mockConfig = {
  theme: { motion: 'terminal', accent: '#E67E22', bg: '#0C0F0A', surface: '#111A0E', text: '#E8F5E0', textMuted: '#8FAF80', storageKey: 'vp-onboarding-eng-test' },
  wizard: { steps: [{ id: 'terrain', component: MockStep, title: '> What terrain do you plan?' }] },
  tour: { waypoints: [] },
  beacons: [],
}

beforeEach(() => localStorage.removeItem('vp-onboarding-eng-test'))

test('renders wizard for new users', () => {
  render(<OnboardingEngine config={mockConfig} />)
  expect(screen.getByText('> What terrain do you plan?')).toBeInTheDocument()
})

test('renders nothing when onboarding is done', () => {
  localStorage.setItem('vp-onboarding-eng-test', JSON.stringify({ mode: 'done' }))
  const { container } = render(<OnboardingEngine config={mockConfig} />)
  expect(container.firstChild).toBeNull()
})
