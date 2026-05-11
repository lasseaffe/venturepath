// src/config/venturepath.onboarding.config.jsx
import { TerrainStep } from '../components/onboarding/steps/TerrainStep'
import { SquadSizeStep } from '../components/onboarding/steps/SquadSizeStep'
import { PlanningStyleStep } from '../components/onboarding/steps/PlanningStyleStep'

const vpConfig = {
  theme: {
    motion: 'terminal',
    accent: '#E67E22',
    bg: '#0C0F0A',
    surface: '#111A0E',
    text: '#E8F5E0',
    textMuted: '#8FAF80',
    storageKey: 'vp-onboarding',
  },

  wizard: {
    steps: [
      { id: 'terrain',        component: TerrainStep,       title: '> What terrain do you plan?' },
      { id: 'squad-size',     component: SquadSizeStep,     title: "> Who's joining you?" },
      { id: 'planning-style', component: PlanningStyleStep, title: '> Planning style?' },
    ],
  },

  tour: {
    waypoints: [
      // Screen 4 — DEMO: World map
      {
        id: 'map-intro',
        type: 'demo',
        target: '[data-tour="world-map"]',
        title: 'Your world map loads',
        body: 'The globe animates to your region. Your next expedition awaits a destination.',
        position: 'bottom',
      },
      // Screen 5 — DO: Set destination
      {
        id: 'set-destination',
        type: 'do',
        target: '[data-tour="world-map"]',
        title: 'Type your destination',
        body: 'Search for any city, region, or landmark. The map flies to it and drops a marker.',
        position: 'bottom',
        completeOn: 'destination-set',
        celebrationText: 'Destination locked',
      },
      // Screen 6 — DO: Set dates
      {
        id: 'dates-pick',
        type: 'do',
        target: '[data-tour="world-map"]',
        title: 'Set your expedition dates',
        body: 'Pick a date range. The itinerary grid fills with day columns automatically.',
        position: 'bottom',
        completeOn: 'dates-set',
        celebrationText: 'Dates confirmed',
      },
      // Screen 7 — DEMO: Itinerary Grid
      {
        id: 'itinerary-intro',
        type: 'demo',
        target: '[data-tour="itinerary"]',
        title: 'The Itinerary Grid',
        body: 'Each column is one day of your expedition. Drag stops between time slots to reorder.',
        position: 'right',
      },
      // Screen 8 — DO: Add first stop
      {
        id: 'add-stop',
        type: 'do',
        target: '[data-tour="itinerary"]',
        title: 'Add your first stop to Day 1',
        body: 'Type a place name and time, e.g. "Eiffel Tower, 10am". Watch it appear in the grid.',
        position: 'right',
        completeOn: 'stop-added',
        celebrationText: 'Stop added to your itinerary',
      },
      // Screen 9 — DO: Drag stop
      {
        id: 'drag-stop',
        type: 'do',
        target: '[data-tour="itinerary"]',
        title: 'Drag it to the afternoon slot',
        body: 'Grab the stop card and drag it to a later slot. Your itinerary adapts in real time.',
        position: 'right',
        completeOn: 'stop-dragged',
        celebrationText: 'Itinerary reordered',
      },
      // Screen 10 — DEMO: Squad
      {
        id: 'squad-intro',
        type: 'demo',
        target: '[data-tour="squad"]',
        title: 'Squad Manifest',
        body: "Each Pioneer has a role and weight allocation. The manifest tracks everyone's gear load.",
        position: 'left',
      },
      // Screen 11 — DEMO: Squad manifest detail
      {
        id: 'add-member',
        type: 'demo',
        target: '[data-tour="squad"]',
        title: 'Squad weight board',
        body: 'Each Pioneer\'s weight load is tracked live. Add squad members from the trip wizard to see their bar fill up.',
        position: 'left',
      },
      // Screen 12 — DEMO: Ledger Workbench
      {
        id: 'ledger-intro',
        type: 'demo',
        target: '[data-tour="ledger"]',
        title: 'Ledger Workbench — squad voting',
        body: 'Nominate activities. Squad members approve or veto. "Vetoed by Squad" badge ends debate.',
        position: 'top',
      },
      // Screen 13 — DO: Vote
      {
        id: 'vote-action',
        type: 'do',
        target: '[data-tour="ledger"]',
        title: 'Vote on this activity',
        body: 'Tap Approve or Veto on the nominated activity. The veto animation plays on rejection.',
        position: 'top',
        completeOn: 'vote-cast',
        celebrationText: 'Vote recorded',
      },
      // Screen 14 — DEMO: Packing
      {
        id: 'packing-intro',
        type: 'demo',
        target: '[data-tour="packing"]',
        title: 'Packing Manifest',
        body: 'Climate-based gear suggestions. 3D bag view fills as items are checked. Weight is tracked per Pioneer.',
        position: 'top',
      },
      // Screen 15 — DO: Check gear
      {
        id: 'check-gear',
        type: 'do',
        target: '[data-tour="packing"]',
        title: 'Check off your first gear item',
        body: 'Tick the checkbox next to any item. Watch the 3D bag fill and the weight bar update.',
        position: 'top',
        completeOn: 'gear-checked',
        celebrationText: 'Gear loaded',
      },
      // Screen 16 — DEMO: VentureVault
      {
        id: 'venture-vault',
        type: 'demo',
        target: '[data-tour="vault"]',
        title: 'VentureVault — Pro-Paths',
        body: 'Browse community expeditions. Clone any Pro-Path in 3 taps. Architects earn from every clone.',
        position: 'bottom',
      },
      // Screen 17 — DEMO: Tactical Mode
      {
        id: 'tactical-mode',
        type: 'demo',
        target: '[data-tour="tactical"]',
        title: 'Tactical Mode — offline SOS',
        body: 'Amber takeover. Full cached itinerary, emergency contacts, SOS generator — zero signal needed.',
        position: 'top',
      },
      // Screen 18 — Done
      {
        id: 'done',
        type: 'celebrate',
        target: '[data-tour="tactical"]',
        title: 'EXPEDITION PROTOCOL INITIALIZED',
        body: 'Destination set · itinerary built · squad assembled · gear loaded · ARCHITECT, STAND BY.',
        position: 'top',
      },
    ],
  },

  beacons: [
    { id: 'venture-vault', target: '[data-beacon="venture-vault"]', label: 'Browse Pro-Paths',     key: 'beacon-vault' },
    { id: 'tactical-mode', target: '[data-beacon="tactical-mode"]', label: 'Enable Tactical Mode', key: 'beacon-tactical' },
    { id: 'ar-tours',      target: '[data-beacon="ar-tours"]',      label: 'Try AR Ghost Tours',   key: 'beacon-ar' },
    { id: '3d-bag',        target: '[data-beacon="3d-bag"]',        label: 'View Your 3D Bag',     key: 'beacon-3d-bag' },
  ],
}

export default vpConfig
