// src/config/holyflex.onboarding.config.tsx
import { PurposeStep } from '../components/onboarding/steps/PurposeStep'
import { LearningStyleStep } from '../components/onboarding/steps/LearningStyleStep'
import { DailyTimeStep } from '../components/onboarding/steps/DailyTimeStep'
import type { OnboardingConfig } from '../components/onboarding/onboarding.types'

export const hfOnboardingConfig: OnboardingConfig = {
  theme: {
    motion: 'snappy',
    accent: '#9333EA',
    bg: '#FDF4FF',
    surface: '#F5F0FF',
    text: '#1a1a2e',
    textMuted: '#6B5D7A',
    storageKey: 'hf-onboarding',
    colors: { rose: '#E8547A', purple: '#9333EA', gold: '#EAB308', blue: '#38BDF8' },
  },

  wizard: {
    steps: [
      { id: 'purpose',        component: PurposeStep,       title: 'What brings you here?' },
      { id: 'learning-style', component: LearningStyleStep, title: 'How do you learn best?' },
      { id: 'daily-time',     component: DailyTimeStep,     title: 'Daily time to study?' },
    ],
  },

  tour: {
    waypoints: [
      // 1 — DEMO: Come Follow Me
      {
        id: 'cfm-intro',
        type: 'demo',
        target: '[data-tour="cfm"]',
        title: "Come Follow Me — this week's lesson",
        body: 'Chapters are preloaded. Your reading progress shows as a ring that fills as you study.',
        position: 'bottom',
      },
      // 2 — DO: First note
      {
        id: 'add-note',
        type: 'do',
        target: '[data-tour="cfm"]',
        title: 'Tap a verse to add your first note',
        body: 'Tap any highlighted verse. A note editor appears — type anything to save it.',
        position: 'bottom',
        completeOn: 'note-saved',
        celebrationText: 'First note saved ✦',
      },
      // 3 — CELEBRATE: Notes saved forever
      {
        id: 'note-saved-celebrate',
        type: 'celebrate',
        target: '[data-tour="cfm"]',
        title: 'Your notes are saved forever',
        body: 'Every verse you annotate builds your personal scripture library.',
        position: 'top',
      },
      // 4 — DEMO: Talk Generator
      {
        id: 'talk-gen-intro',
        type: 'demo',
        target: '[data-tour="talk-gen"]',
        title: 'Write a sacrament talk in minutes',
        body: 'Our AI outline builder reads your topic and generates a structured, scripture-backed talk.',
        position: 'bottom',
      },
      // 5 — DO: Pick a topic
      {
        id: 'pick-topic',
        type: 'do',
        target: '[data-tour="talk-gen"]',
        title: 'Pick a topic for a talk',
        body: 'Tap a topic card below. Watch your outline build in real time.',
        position: 'bottom',
        completeOn: 'topic-selected',
        celebrationText: 'Talk outline ready! 🎤',
      },
      // 6 — DEMO: AI companion intro
      {
        id: 'ai-companion-intro',
        type: 'demo',
        target: '[data-tour="ai-companion"]',
        title: 'Your AI study companion',
        body: 'Ask anything about scripture, talks, or your faith journey. The chatbot remembers your preferences.',
        position: 'top',
      },
      // 7 — DO: Ask the AI a question
      {
        id: 'ask-ai',
        type: 'do',
        target: '[data-tour="ai-companion"]',
        title: 'Ask a scripture question',
        body: 'Open the chatbot and type any question about this week\'s lesson. Watch it answer in real time.',
        position: 'top',
        completeOn: 'ai-question-asked',
        celebrationText: 'Great question! 🌟',
      },
      // 8 — DEMO: Mission prep
      {
        id: 'mission-prep',
        type: 'demo',
        target: '[data-tour="ai-companion"]',
        title: 'Your AI study companion',
        body: 'Ask anything about scripture or your faith journey. Daily insights are personalised from your preferences.',
        position: 'top',
      },
      // 9 — DEMO: Learning Roadmap
      {
        id: 'learning-roadmap',
        type: 'demo',
        target: '[data-tour="roadmap"]',
        title: 'Your personalised learning roadmap',
        body: 'A visual path built from your answers — shows upcoming lessons, milestones, and suggested topics.',
        position: 'bottom',
      },
      // 10 — DEMO: Streak
      {
        id: 'streak-intro',
        type: 'demo',
        target: '[data-tour="streak"]',
        title: 'Daily streak — study every day',
        body: 'A streak flame tracks consecutive days of study. Your first session starts today.',
        position: 'top',
      },
      // 11 — CELEBRATE: Done
      {
        id: 'done',
        type: 'celebrate',
        target: '[data-tour="streak"]',
        title: 'Your spiritual toolkit is ready ✦',
        body: '1 note saved · 1 talk outline · AI companion activated · streak started',
        position: 'top',
      },
    ],
  },

  beacons: [
    { id: 'mission-prep', target: '[data-beacon="mission-prep"]', label: 'Mission Prep Tools',    key: 'beacon-mission-prep' },
    { id: 'streak',       target: '[data-beacon="streak"]',       label: 'Start Your Streak',     key: 'beacon-streak' },
    { id: 'ai-insights',  target: '[data-beacon="ai-insights"]',  label: 'Ask Your AI Companion', key: 'beacon-ai-insights' },
  ],
}

export default hfOnboardingConfig
