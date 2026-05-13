// VenturePath · Phase 2 · Gathering template definitions
// Each template seeds default Arc blocks, Roles, and Gear when a Gathering is created.

export const TEMPLATES = [
  {
    id: 'campfire',
    label: 'Campfire',
    icon: '🔥',
    accentColor: '#E67E22',
    vibePrompt: 'Embers, stories, and a slow circle.',
    defaultDurationMin: 180,
    defaultArc: [
      { ord: 0, title: 'Gather & settle', duration_min: 20 },
      { ord: 1, title: 'Fire lit — circle forms', duration_min: 10 },
      { ord: 2, title: 'Stories & reflection', duration_min: 90 },
      { ord: 3, title: 'Late snacks & wind-down', duration_min: 60 },
    ],
    defaultRoles: [
      { label: 'Firekeeper', description: 'Lights and maintains the fire', claimable: true, max_claims: 1 },
      { label: 'Storyteller', description: 'Opens the circle with a story', claimable: true, max_claims: 2 },
      { label: 'Provisions Lead', description: 'Brings food and manages supplies', claimable: true, max_claims: 1 },
    ],
    defaultGear: [
      { item: 'Firewood', qty: 1, category: 'Fire', source: 'manual' },
      { item: 'Firestarter / matches', qty: 1, category: 'Fire', source: 'manual' },
      { item: 'Camp chairs', qty: 4, category: 'Seating', source: 'manual' },
      { item: 'Headlamps', qty: 4, category: 'Light', source: 'manual' },
    ],
  },
  {
    id: 'summit_push',
    label: 'Summit Push',
    icon: '⛰',
    accentColor: '#F2C94C',
    vibePrompt: 'Pre-dawn start. Zero margin. All Pioneers commit.',
    defaultDurationMin: 480,
    defaultArc: [
      { ord: 0, title: 'Pre-dawn assembly & gear check', duration_min: 30 },
      { ord: 1, title: 'Trail approach', duration_min: 120 },
      { ord: 2, title: 'Technical section', duration_min: 180 },
      { ord: 3, title: 'Summit & rest', duration_min: 60 },
      { ord: 4, title: 'Descent', duration_min: 90 },
    ],
    defaultRoles: [
      { label: 'Trail Lead', description: 'Sets pace and route decisions', claimable: true, max_claims: 1 },
      { label: 'Sweep', description: 'Last on trail, ensures no one is left behind', claimable: true, max_claims: 1 },
      { label: 'Medic', description: 'First aid kit carrier and emergency contact', claimable: true, max_claims: 1 },
      { label: 'Navigator', description: 'Map / GPX primary', claimable: true, max_claims: 1 },
    ],
    defaultGear: [
      { item: '10 Essentials kit', qty: 1, category: 'Safety', source: 'manual' },
      { item: 'Topo map + compass', qty: 1, category: 'Navigation', source: 'manual' },
      { item: 'Summit snacks', qty: 1, category: 'Food', source: 'manual' },
      { item: 'Emergency bivy', qty: 1, category: 'Shelter', source: 'manual' },
    ],
  },
  {
    id: 'basecamp_dinner',
    label: 'Basecamp Dinner',
    icon: '🍲',
    accentColor: '#D9C5B2',
    vibePrompt: 'The night before the push. Carb-load and calm minds.',
    defaultDurationMin: 150,
    defaultArc: [
      { ord: 0, title: 'Arrive & unpack', duration_min: 20 },
      { ord: 1, title: 'Cooking prep', duration_min: 30 },
      { ord: 2, title: 'Dinner & debrief', duration_min: 60 },
      { ord: 3, title: 'Gear check for tomorrow', duration_min: 40 },
    ],
    defaultRoles: [
      { label: 'Head Cook', description: 'Owns the menu and fire', claimable: true, max_claims: 1 },
      { label: 'Sous Chef', description: 'Prep and plating support', claimable: true, max_claims: 2 },
      { label: 'Dishwasher', description: 'Leave no trace cleanup', claimable: true, max_claims: 1 },
    ],
    defaultGear: [
      { item: 'Camp stove + fuel', qty: 1, category: 'Cooking', source: 'manual' },
      { item: 'Cookset', qty: 1, category: 'Cooking', source: 'manual' },
      { item: 'Food supplies', qty: 1, category: 'Food', source: 'manual' },
      { item: 'Water filter', qty: 1, category: 'Water', source: 'manual' },
    ],
  },
  {
    id: 'stargaze',
    label: 'Stargaze',
    icon: '✦',
    accentColor: '#A78BFA',
    vibePrompt: 'Dark sky, silence, and the infinite overhead.',
    defaultDurationMin: 240,
    defaultArc: [
      { ord: 0, title: 'Assemble & dark-adapt (no phone lights)', duration_min: 20 },
      { ord: 1, title: 'Guided sky tour', duration_min: 60 },
      { ord: 2, title: 'Free observation', duration_min: 120 },
      { ord: 3, title: 'Wrap & warm-up', duration_min: 40 },
    ],
    defaultRoles: [
      { label: 'Sky Guide', description: 'Narrates constellations and deep sky objects', claimable: true, max_claims: 1 },
      { label: 'Equipment Lead', description: 'Telescope / binoculars setup', claimable: true, max_claims: 1 },
      { label: 'Hot Drinks Provider', description: 'Keeps everyone warm', claimable: true, max_claims: 1 },
    ],
    defaultGear: [
      { item: 'Red-light headlamps', qty: 4, category: 'Light', source: 'manual' },
      { item: 'Blankets / sleeping pads', qty: 4, category: 'Comfort', source: 'manual' },
      { item: 'Star chart or app', qty: 1, category: 'Navigation', source: 'manual' },
    ],
  },
  {
    id: 'trail_crew',
    label: 'Trail Crew',
    icon: '⛏',
    accentColor: '#64dc82',
    vibePrompt: 'Volunteer work day. Sweat now, summit later.',
    defaultDurationMin: 300,
    defaultArc: [
      { ord: 0, title: 'Safety briefing & tool check', duration_min: 20 },
      { ord: 1, title: 'Work session A', duration_min: 120 },
      { ord: 2, title: 'Lunch break', duration_min: 30 },
      { ord: 3, title: 'Work session B', duration_min: 120 },
      { ord: 4, title: 'Tool clean & debrief', duration_min: 10 },
    ],
    defaultRoles: [
      { label: 'Crew Lead', description: 'Coordinates tasks and safety', claimable: true, max_claims: 1 },
      { label: 'Tool Manager', description: 'Issue, track, and collect tools', claimable: true, max_claims: 1 },
      { label: 'Safety Officer', description: 'Monitors hazards and first aid', claimable: true, max_claims: 1 },
    ],
    defaultGear: [
      { item: 'Work gloves', qty: 4, category: 'PPE', source: 'manual' },
      { item: 'Loppers / hand saws', qty: 2, category: 'Tools', source: 'manual' },
      { item: 'McLeod / rake', qty: 2, category: 'Tools', source: 'manual' },
      { item: 'First aid kit', qty: 1, category: 'Safety', source: 'manual' },
    ],
  },
  {
    id: 'ritual_sendoff',
    label: 'Ritual Sendoff',
    icon: '✶',
    accentColor: '#F2A900',
    vibePrompt: 'The night before departure. Intentions set, squad unified.',
    defaultDurationMin: 90,
    defaultArc: [
      { ord: 0, title: 'Circle opens', duration_min: 10 },
      { ord: 1, title: 'Expedition intentions', duration_min: 30 },
      { ord: 2, title: 'Gear & logistics final check', duration_min: 30 },
      { ord: 3, title: 'Sendoff toast', duration_min: 20 },
    ],
    defaultRoles: [
      { label: 'Circle Opener', description: 'Sets the tone for the Gathering', claimable: true, max_claims: 1 },
      { label: 'Logistics Lead', description: 'Final packing and transport coordinator', claimable: true, max_claims: 1 },
    ],
    defaultGear: [],
  },
  {
    id: 'custom',
    label: 'Custom',
    icon: '◇',
    accentColor: '#E67E22',
    vibePrompt: 'Your Gathering, your rules.',
    defaultDurationMin: 120,
    defaultArc: [],
    defaultRoles: [],
    defaultGear: [],
  },
];

export function getTemplate(id) {
  return TEMPLATES.find(t => t.id === id) ?? TEMPLATES.find(t => t.id === 'custom');
}

export function resolveBanner(gathering) {
  if (gathering?.banner_url) return gathering.banner_url;
  return null;
}

export function resolveAccent(gathering) {
  if (gathering?.accent_color) return gathering.accent_color;
  return getTemplate(gathering?.template_id)?.accentColor ?? '#E67E22';
}

export function resolveIcon(gathering) {
  if (gathering?.icon) return gathering.icon;
  return getTemplate(gathering?.template_id)?.icon ?? '◇';
}
