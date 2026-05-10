// Backpack skin definitions — applied to both 2D SVG overlay and 3D procedural mesh
export const SKINS = {
  tactical: {
    id: 'tactical',
    label: 'Tactical Ember',
    chipColor: '#1a1e20',
    chipBorder: '#E67E22',
    // 3D material
    bodyColor: '#1c2124',
    strapColor: '#111416',
    buckleColor: '#E67E22',
    roughness: 0.85,
    metalness: 0.05,
    // 2D SVG
    bagFill: '#141a1e',
    zoneStroke: '#E67E22',
    zoneFill: '#1e2328',
    labelColor: '#D9C5B2',
  },
  heritage: {
    id: 'heritage',
    label: 'Heritage Canvas',
    chipColor: '#2a3d1c',
    chipBorder: '#c8a040',
    bodyColor: '#2a3d1c',
    strapColor: '#5c3018',
    buckleColor: '#c8a040',
    roughness: 0.94,
    metalness: 0.0,
    bagFill: '#1e2e14',
    zoneStroke: '#c8a040',
    zoneFill: '#1a2810',
    labelColor: '#d9c5a0',
  },
  desert: {
    id: 'desert',
    label: 'Desert Expedition',
    chipColor: '#8a6830',
    chipBorder: '#d4a843',
    bodyColor: '#8a6830',
    strapColor: '#6b4220',
    buckleColor: '#d4a843',
    roughness: 0.88,
    metalness: 0.02,
    bagFill: '#5c4420',
    zoneStroke: '#d4a843',
    zoneFill: '#3e2e12',
    labelColor: '#f0e0b8',
  },
};

export const SKIN_IDS = ['tactical', 'heritage', 'desert'];
