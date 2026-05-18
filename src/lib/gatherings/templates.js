export const TEMPLATES = {
  campfire: {
    id: 'campfire',
    label: 'Campfire',
    icon: 'Flame',
    vibePrompt: 'Gather the squad around the fire',
    accent: '#E67E22',
    banner: null,
    defaultRoles: [
      { label: 'Firekeeper', description: 'Tends the flame all night', claimable: true, max_claims: 1 },
      { label: 'Storyteller', description: 'Leads the campfire tales', claimable: true, max_claims: 2 },
      { label: 'Cook', description: 'Manages food & drinks', claimable: true, max_claims: 2 },
    ],
    defaultArc: [
      { ord: 0, title: 'Arrive & set up camp', duration_min: 30 },
      { ord: 1, title: 'Fire lighting ceremony', duration_min: 15 },
      { ord: 2, title: 'Dinner around the fire', duration_min: 60 },
      { ord: 3, title: 'Stories & stargazing', duration_min: 90 },
    ],
    defaultGear: [
      { item: 'Firewood bundle', qty: 3, category: 'Camp', weight_kg: 5 },
      { item: 'Fire starter', qty: 1, category: 'Camp', weight_kg: 0.1 },
      { item: 'Camp chairs', qty: 6, category: 'Camp', weight_kg: 1.5 },
    ],
  },
  summit_push: {
    id: 'summit_push',
    label: 'Summit Push',
    icon: 'Mountain',
    vibePrompt: 'Alpine start, summit by noon',
    accent: '#4A90D9',
    banner: null,
    defaultRoles: [
      { label: 'Trail Lead', description: 'Sets the pace and route', claimable: true, max_claims: 1 },
      { label: 'Sweep', description: 'Last Architect on trail — nobody left behind', claimable: true, max_claims: 1 },
      { label: 'Navigator', description: 'Owns map & GPS', claimable: true, max_claims: 1 },
    ],
    defaultArc: [
      { ord: 0, title: 'Alpine start — headlamps on', duration_min: 15 },
      { ord: 1, title: 'Trailhead → treeline', duration_min: 120 },
      { ord: 2, title: 'Treeline → summit ridge', duration_min: 90 },
      { ord: 3, title: 'Summit celebration', duration_min: 20 },
      { ord: 4, title: 'Descent', duration_min: 150 },
    ],
    defaultGear: [
      { item: 'Crampons', qty: 1, category: 'Technical', weight_kg: 0.9 },
      { item: 'Ice axe', qty: 1, category: 'Technical', weight_kg: 0.7 },
      { item: 'Emergency bivvy', qty: 1, category: 'Safety', weight_kg: 0.2 },
    ],
  },
  basecamp_dinner: {
    id: 'basecamp_dinner',
    label: 'Basecamp Dinner',
    icon: 'UtensilsCrossed',
    vibePrompt: 'Hot meal after hard miles',
    accent: '#C0392B',
    banner: null,
    defaultRoles: [
      { label: 'Head Cook', description: 'Owns the stove and menu', claimable: true, max_claims: 1 },
      { label: 'Sous Chef', description: 'Prep and cleanup', claimable: true, max_claims: 2 },
      { label: 'Hydration Lead', description: 'Water filtration and hot drinks', claimable: true, max_claims: 1 },
    ],
    defaultArc: [
      { ord: 0, title: 'Water collection & filter', duration_min: 20 },
      { ord: 1, title: 'Stove setup & prep', duration_min: 30 },
      { ord: 2, title: 'Dinner service', duration_min: 45 },
      { ord: 3, title: 'Debrief & plan tomorrow', duration_min: 30 },
    ],
    defaultGear: [
      { item: 'Camp stove', qty: 2, category: 'Cook', weight_kg: 0.4 },
      { item: 'Fuel canister', qty: 4, category: 'Cook', weight_kg: 0.35 },
      { item: 'Group cook pot', qty: 1, category: 'Cook', weight_kg: 0.5 },
    ],
  },
  stargaze: {
    id: 'stargaze',
    label: 'Stargaze',
    icon: 'Star',
    vibePrompt: 'Dark sky, no phones — just the cosmos',
    accent: '#6C3483',
    banner: null,
    defaultRoles: [
      { label: 'Astronomer', description: 'Runs the telescope and star tour', claimable: true, max_claims: 1 },
      { label: 'Photographer', description: 'Long-exposure astrophotography', claimable: true, max_claims: 2 },
    ],
    defaultArc: [
      { ord: 0, title: 'Drive to dark sky site', duration_min: 45 },
      { ord: 1, title: 'Eyes adapt — no white lights', duration_min: 20 },
      { ord: 2, title: 'Constellation tour', duration_min: 60 },
      { ord: 3, title: 'Astrophotography window', duration_min: 120 },
    ],
    defaultGear: [
      { item: 'Telescope', qty: 1, category: 'Optics', weight_kg: 4 },
      { item: 'Red headlamps', qty: 6, category: 'Light', weight_kg: 0.1 },
      { item: 'Blankets', qty: 6, category: 'Comfort', weight_kg: 1.5 },
    ],
  },
  trail_crew: {
    id: 'trail_crew',
    label: 'Trail Crew',
    icon: 'Shovel',
    vibePrompt: 'Sweat equity — leave it better than you found it',
    accent: '#27AE60',
    banner: null,
    defaultRoles: [
      { label: 'Crew Lead', description: 'Assigns work zones and safety', claimable: true, max_claims: 1 },
      { label: 'Tools Wrangler', description: 'Manages tool inventory', claimable: true, max_claims: 1 },
    ],
    defaultArc: [
      { ord: 0, title: 'Safety briefing', duration_min: 15 },
      { ord: 1, title: 'Morning work shift', duration_min: 180 },
      { ord: 2, title: 'Lunch break', duration_min: 45 },
      { ord: 3, title: 'Afternoon shift', duration_min: 120 },
    ],
    defaultGear: [
      { item: 'Loppers', qty: 4, category: 'Tools', weight_kg: 0.8 },
      { item: 'Pulaskis', qty: 2, category: 'Tools', weight_kg: 2 },
      { item: 'Work gloves', qty: 8, category: 'PPE', weight_kg: 0.2 },
    ],
  },
  ritual_sendoff: {
    id: 'ritual_sendoff',
    label: 'Ritual Sendoff',
    icon: 'Compass',
    vibePrompt: 'The expedition begins tonight',
    accent: '#E67E22',
    banner: null,
    defaultRoles: [
      { label: 'Convener', description: 'Opens and closes the ritual', claimable: false, max_claims: 1 },
      { label: 'Gear Inspector', description: 'Final kit check for each Pioneer', claimable: true, max_claims: 2 },
    ],
    defaultArc: [
      { ord: 0, title: 'Final gear inspection', duration_min: 45 },
      { ord: 1, title: 'Route briefing', duration_min: 20 },
      { ord: 2, title: 'Intentions circle', duration_min: 15 },
      { ord: 3, title: 'Departure', duration_min: 5 },
    ],
    defaultGear: [],
  },
  custom: {
    id: 'custom',
    label: 'Custom',
    icon: 'Pencil',
    vibePrompt: 'Your Gathering, your rules',
    accent: '#E67E22',
    banner: null,
    defaultRoles: [],
    defaultArc: [],
    defaultGear: [],
  },
};

export const getTemplate = (id) => TEMPLATES[id] ?? TEMPLATES.custom;

export const resolveBanner = (g) => g.banner_url || null;
export const resolveAccent = (g) => g.accent_color || getTemplate(g.template_id).accent || '#E67E22';
export const resolveIcon   = (g) => g.icon || getTemplate(g.template_id).icon || 'Flame';
