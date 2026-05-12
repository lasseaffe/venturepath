// VenturePath — Living Moodboard Configuration
// EDITORIAL CONTENT ONLY. Mechanical tokens (hex, font-family) are read live
// from CSS via lib/readCssVar.js. Update this file when design *intent* changes.

export const moodboard = {
  identity: {
    name: 'VenturePath',
    tagline: 'Architect expeditions, not trips — Modern Nomad design system',
    philosophy:
      'Modern Nomad. A premium dark-first expedition planner with three theme registers (Modern Nomad / Warm Sandstone Day / Tactical HUD). Architects compose Expeditions; Pioneers travel them; Squads vote in the Ledger Workbench. The product vocabulary IS the brand — it cannot be simplified to generic travel-app terms.',
    pillars: [
      'Three registers: Modern Nomad dark / Warm Sandstone day / Tactical Amber emergency.',
      'Expedition vocabulary is the brand — Architect, Pioneer, Squad, Ledger, Vault.',
      'JetBrains Mono carries data precision. Playfair carries editorial weight. Inter carries the rest.',
      'Sharp corners by default — editorial precision. Day mode softens to 4px.',
    ],
  },

  // VenturePath canon vocabulary — VP-1 in APPLE_COMPLIANCE.md. This is the
  // anti-spam shield. Generic synonyms cause Apple 4.3 rejection.
  vocabulary: [
    { use: 'Architect', avoid: 'user / creator / author' },
    { use: 'Pioneer', avoid: 'traveler / adventurer' },
    { use: 'Expedition', avoid: 'trip / journey' },
    { use: 'Leg', avoid: 'segment / stop' },
    { use: 'Ledger Workbench', avoid: 'voting / decisions' },
    { use: 'VentureVault', avoid: 'marketplace / templates / community' },
    { use: 'Pro-Path', avoid: 'template / plan / itinerary' },
    { use: 'Squad', avoid: 'group / friends / team' },
    { use: 'Tactical Mode', avoid: 'offline mode / low-power mode' },
    { use: 'Launch Sequence', avoid: 'onboarding / setup / checklist' },
    { use: 'Basecamp', avoid: 'home / starting point' },
  ],

  colors: [
    { cssVar: '--bg', name: 'Background', usage: 'Page ground — theme-dependent', group: 'semantic' },
    { cssVar: '--surface', name: 'Surface', usage: 'Secondary surfaces, panels', group: 'semantic' },
    { cssVar: '--surface-raised', name: 'Raised', usage: 'Raised cards, modals', group: 'semantic' },
    { cssVar: '--border', name: 'Border', usage: 'Default border', group: 'semantic' },
    { cssVar: '--nav-bg', name: 'Nav BG', usage: 'Sidebar / nav background', group: 'semantic' },
    { cssVar: '--nav-text', name: 'Nav Text', usage: 'Sidebar / nav text color', group: 'semantic' },
    { cssVar: '--accent', name: 'Ember Accent', usage: 'Primary accent — CTAs, highlights', group: 'semantic' },
    { cssVar: '--cta', name: 'CTA', usage: 'Call-to-action background', group: 'semantic' },
    { cssVar: '--text-primary', name: 'Text Primary', usage: 'Body copy', group: 'semantic' },
    { cssVar: '--text-secondary', name: 'Text Secondary', usage: 'Subheads, captions', group: 'semantic' },
    { cssVar: '--text-muted', name: 'Text Muted', usage: 'Faint, disabled', group: 'semantic' },
    { cssVar: '--sandstone', name: 'Sandstone', usage: 'Warm trail surface, accent ground', group: 'semantic' },
    { cssVar: '--status-ok', name: 'Status OK', usage: 'Confirmation, on-track', group: 'semantic' },
    { cssVar: '--status-warn', name: 'Status Warn', usage: 'Caution, weather alert', group: 'semantic' },
    { cssVar: '--status-alert', name: 'Status Alert', usage: 'Critical, abort', group: 'semantic' },
  ],

  // Brand constants — read from Tailwind config rather than CSS vars
  brandHex: [
    { name: 'Midnight', hex: '#0E1012', usage: 'Tactical / Modern Nomad bg' },
    { name: 'Ember', hex: '#E67E22', usage: 'Primary accent across themes' },
    { name: 'Golden Hour', hex: '#F2C94C', usage: 'Notification pulse — pulse-gold keyframe' },
    { name: 'Sandstone', hex: '#D9C5B2', usage: 'Trail surface, Day-mode accents' },
    { name: 'Tactical Amber', hex: '#F2A900', usage: 'Tactical Mode HUD highlight' },
  ],

  fonts: [
    { family: '"Playfair Display", serif', role: 'Editorial / Headings', specimen: 'Architect your Expedition' },
    { family: 'Inter, ui-sans-serif, system-ui, sans-serif', role: 'Body / UI', specimen: 'A Pioneer plots their first Leg' },
    { family: '"JetBrains Mono", "Fira Code", ui-monospace, monospace', role: 'Data / Tactical', specimen: 'LAT -54.8019  LON -68.3030  ALT 56m' },
  ],

  spacing: {
    scale: [0, 2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64],
    radii: [
      { name: 'Sharp (default)', value: '0px', note: 'Modern Nomad default — editorial precision' },
      { name: 'Soft', value: '4px', note: 'Day mode / Tactical cards' },
      { name: 'Pill', value: '9999px', note: 'Status pills, filter chips' },
    ],
  },

  modes: [
    { name: 'Modern Nomad (default)', cssTrigger: '[data-theme="default"]', intent: 'Midnight near-black ground · Ember accent · Sandstone editorial flourish.' },
    { name: 'Warm Sandstone (day)', cssTrigger: '[data-theme="day"]', intent: 'Warm light sandstone · copper ember nav · readable contrast for outdoor sun.' },
    { name: 'Tactical HUD', cssTrigger: '[data-theme="tactical"]', intent: 'Pure Midnight · Tactical Amber highlight · monospace status. Used for emergency / offline.' },
  ],

  voice: {
    pillars: [
      'Architects, not users. Pioneers, not travelers. Expeditions, not trips.',
      'Tactical when stakes are real; editorial when context allows.',
      'JetBrains Mono carries every data point — coordinates, altitudes, costs.',
    ],
    do: [
      'Architect your Expedition',
      'Vote in the Ledger Workbench',
      'Activate Tactical Mode',
      "What's the Squad's next Leg?",
    ],
    dont: [
      'Create your trip',
      'Group voting',
      'Offline mode',
      'Where are you traveling next?',
    ],
  },

  doDont: [
    {
      topic: 'Headings',
      wrong: { label: 'Generic sans heading', html: '<h3 style="font-family:sans-serif;font-weight:700;font-size:22px">My Trip</h3>' },
      right: { label: 'Playfair editorial', html: '<h3 style="font-family:Playfair Display,serif;font-size:24px;font-weight:600;color:#F2EDE8">Patagonia Expedition</h3>' },
    },
    {
      topic: 'Data display',
      wrong: { label: 'Plain inline numbers', html: '<p style="font-family:sans-serif">Latitude -54.8 and longitude -68.3</p>' },
      right: { label: 'Mono tactical readout', html: '<p style="font-family:JetBrains Mono,monospace;font-size:13px;color:#E67E22;letter-spacing:1px">LAT -54.8019  LON -68.3030</p>' },
    },
    {
      topic: 'CTA in tactical mode',
      wrong: { label: 'Soft pill', html: '<button style="background:#888;color:#fff;border-radius:24px;padding:12px 24px;font-weight:600">Send help</button>' },
      right: { label: 'Tactical amber HUD button', html: '<button style="background:transparent;color:#F2A900;border:1px solid #F2A900;border-radius:4px;padding:10px 18px;font-family:JetBrains Mono,monospace;letter-spacing:2px;text-transform:uppercase;font-size:11px">⊕ SOS Beacon</button>' },
    },
  ],

  icons: [
    { name: '⚙', usage: 'Settings' },
    { name: '✦', usage: 'Inspire / suggestion' },
    { name: '💬', usage: 'Squad chat' },
    { name: '👤', usage: 'Architect profile' },
    { name: '⊕', usage: 'Tactical activate' },
    { name: '🌙', usage: 'Theme cycle — default' },
    { name: '☀', usage: 'Theme cycle — day' },
    { name: '⊛', usage: 'Tactical HUD entry' },
  ],
  iconLibrary: 'lucide-react + emoji glyph fallbacks',
  iconNote: 'VP uses emoji glyphs for sidebar rail (small footprint, no extra deps for tactical accuracy). lucide-react is reserved for inline content icons.',

  motion: {
    intent:
      'Motion is sparse and tactical. Notification pulses with Golden Hour. Hover transitions use step-easing (3 steps) for a HUD feel. Ken Burns drift on hero imagery. Reduced motion respected.',
    namedAnimations: [
      { name: 'pulse-gold', duration: '~2s', note: 'Notification badge pulse — Golden Hour rgba(242,201,76,0.4)' },
      { name: 'ken-burns', duration: '20s', note: 'Hero imagery slow zoom — scale 1 → 1.06 → 1' },
      { name: 'shake', duration: '0.4s', note: 'Vetoed-by-Squad rejection — horizontal shake' },
    ],
    easings: [
      { name: 'Tactical step', value: 'steps(3, end)', note: 'HUD transitions — 3-frame snap' },
    ],
    reducedMotion: 'Respect prefers-reduced-motion in all custom animations.',
  },
};
