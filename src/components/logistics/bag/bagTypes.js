// src/components/logistics/bag/bagTypes.js

// Zone IDs used across all bag types
export const ZONE = {
  // backpack
  TOP_LID:      'top_lid',
  MAIN:         'main',
  FRONT_POCKET: 'front_pocket',
  HIP_BELT:     'hip_belt',
  SIDE_POCKET:  'side_pocket',
  // handbag
  INNER_POCKET: 'inner_pocket',
  OUTER_POCKET: 'outer_pocket',
  // duffel
  END_POCKET:   'end_pocket',
  TOP_ZIP:      'top_zip',
  // suitcase
  MAIN_SHELL:   'main_shell',
  LID_MESH:     'lid_mesh',
  SIDE_HANDLE:  'side_handle',
  // carryon
  FRONT_ZIP:    'front_zip',
  LAPTOP:       'laptop_sleeve',
  // daypack (reuses MAIN + FRONT_ZIP)
};

// Category → default zone, per bag type
const BACKPACK_DEFAULTS = {
  'Shelter & Sleep': ZONE.MAIN,
  'Food & Water':    ZONE.MAIN,
  'Clothing':        ZONE.MAIN,
  'Medical':         ZONE.TOP_LID,
  'Navigation':      ZONE.TOP_LID,
  'Base Camp':       ZONE.FRONT_POCKET,
  'Tech & Power':    ZONE.HIP_BELT,
};
const HANDBAG_DEFAULTS = {
  'Base Camp': ZONE.OUTER_POCKET,
  'Tech & Power': ZONE.INNER_POCKET,
};
const DUFFEL_DEFAULTS  = { 'Clothing': ZONE.MAIN, 'Shelter & Sleep': ZONE.MAIN };
const SUITCASE_DEFAULTS = { 'Clothing': ZONE.MAIN_SHELL, 'Shelter & Sleep': ZONE.MAIN_SHELL };
const CARRYON_DEFAULTS  = { 'Tech & Power': ZONE.LAPTOP, 'Base Camp': ZONE.FRONT_ZIP };
const DAYPACK_DEFAULTS  = { 'Base Camp': ZONE.FRONT_ZIP };

function defaultZone(categoryDefaults, fallback) {
  return (category) => categoryDefaults[category] ?? fallback;
}

export const BAG_TYPES = {
  backpack: {
    id: 'backpack',
    label: 'Backpack',
    emoji: '🎒',
    weightLimitKg: 20,
    weightLimitNote: null,
    defaultZoneForCategory: defaultZone(BACKPACK_DEFAULTS, ZONE.MAIN),
    zones: {
      [ZONE.TOP_LID]:      { label: 'Top Lid',      capacity: 4 },
      [ZONE.MAIN]:         { label: 'Main',          capacity: 12 },
      [ZONE.FRONT_POCKET]: { label: 'Front Pocket',  capacity: 4 },
      [ZONE.HIP_BELT]:     { label: 'Hip Belt',      capacity: 2 },
      [ZONE.SIDE_POCKET]:  { label: 'Side Pocket',   capacity: 2 },
    },
    hitAreas: {
      [ZONE.TOP_LID]:      { x: 25,  y: 52,  w: 190, h: 62  },
      [ZONE.MAIN]:         { x: 22,  y: 114, w: 196, h: 106 },
      [ZONE.FRONT_POCKET]: { x: 50,  y: 128, w: 140, h: 102 },
      [ZONE.HIP_BELT]:     { x: 8,   y: 264, w: 224, h: 34  },
      [ZONE.SIDE_POCKET]:  { x: 192, y: 86,  w: 34,  h: 112 },
    },
    badgePos: {
      [ZONE.TOP_LID]:      { x: 204, y: 62  },
      [ZONE.MAIN]:         { x: 204, y: 124 },
      [ZONE.FRONT_POCKET]: { x: 179, y: 137 },
      [ZONE.HIP_BELT]:     { x: 222, y: 273 },
      [ZONE.SIDE_POCKET]:  { x: 218, y: 96  },
    },
    geometry: {
      body:    { w: 1.02, h: 1.45, d: 0.66, radius: 0.06 },
      lid:     { w: 0.94, h: 0.24, d: 0.62, position: [0, 0.845, 0] },
      pockets: [
        { w: 0.74, h: 0.72, d: 0.17, position: [0, -0.06, 0.415], label: 'front_pocket' },
        { w: 1.34, h: 0.20, d: 0.42, position: [0, -0.825, 0],    label: 'hip_belt'     },
        { w: 0.19, h: 0.56, d: 0.24, position: [0.605, 0.15, 0],  label: 'side_pocket'  },
      ],
      handles: [
        { type: 'bar',   position: [0, 0.84, 0] },
        { type: 'strap', position: [-0.28, 0.5, -0.3] },
        { type: 'strap', position: [ 0.28, 0.5, -0.3] },
      ],
    },
  },

  handbag: {
    id: 'handbag',
    label: 'Handbag',
    emoji: '👜',
    weightLimitKg: 5,
    weightLimitNote: null,
    defaultZoneForCategory: defaultZone(HANDBAG_DEFAULTS, ZONE.MAIN),
    zones: {
      [ZONE.MAIN]:         { label: 'Main',         capacity: 8 },
      [ZONE.INNER_POCKET]: { label: 'Inner Pocket', capacity: 3 },
      [ZONE.OUTER_POCKET]: { label: 'Outer Pocket', capacity: 2 },
    },
    hitAreas: {
      [ZONE.MAIN]:         { x: 38,  y: 95,  w: 164, h: 130 },
      [ZONE.INNER_POCKET]: { x: 55,  y: 225, w: 130, h: 30  },
      [ZONE.OUTER_POCKET]: { x: 75,  y: 255, w: 90,  h: 28  },
    },
    badgePos: {
      [ZONE.MAIN]:         { x: 192, y: 105 },
      [ZONE.INNER_POCKET]: { x: 178, y: 233 },
      [ZONE.OUTER_POCKET]: { x: 158, y: 264 },
    },
    geometry: {
      body:    { w: 1.30, h: 0.85, d: 0.28, radius: 0.06 },
      lid:     null,
      pockets: [
        { w: 1.10, h: 0.28, d: 0.10, position: [0, -0.565, 0.14], label: 'outer_pocket' },
      ],
      handles: [
        { type: 'arc', position: [-0.28, 0.58, 0] },
        { type: 'arc', position: [ 0.28, 0.58, 0] },
      ],
    },
  },

  duffel: {
    id: 'duffel',
    label: 'Duffel Bag',
    emoji: '🏋️',
    weightLimitKg: 30,
    weightLimitNote: null,
    defaultZoneForCategory: defaultZone(DUFFEL_DEFAULTS, ZONE.MAIN),
    zones: {
      [ZONE.MAIN]:       { label: 'Main Barrel', capacity: 16 },
      [ZONE.END_POCKET]: { label: 'End Pocket',  capacity: 4  },
      [ZONE.TOP_ZIP]:    { label: 'Top Zip',     capacity: 4  },
    },
    hitAreas: {
      [ZONE.MAIN]:       { x: 30,  y: 110, w: 180, h: 110 },
      [ZONE.END_POCKET]: { x: 8,   y: 120, w: 38,  h: 90  },
      [ZONE.TOP_ZIP]:    { x: 55,  y: 55,  w: 130, h: 55  },
    },
    badgePos: {
      [ZONE.MAIN]:       { x: 200, y: 120 },
      [ZONE.END_POCKET]: { x: 40,  y: 130 },
      [ZONE.TOP_ZIP]:    { x: 178, y: 65  },
    },
    geometry: {
      body:    { w: 1.90, h: 0.80, d: 0.80, radius: 0.38 },
      lid:     null,
      pockets: [
        { w: 0.38, h: 0.68, d: 0.68, position: [-1.14, 0, 0],    label: 'end_pocket' },
        { w: 1.30, h: 0.22, d: 0.30, position: [0, 0.51, 0.26],  label: 'top_zip'    },
      ],
      handles: [
        { type: 'bar',   position: [0, 0.51, 0] },
        { type: 'strap', position: [0, 0.51, -0.4] },
      ],
    },
  },

  suitcase: {
    id: 'suitcase',
    label: 'Suitcase',
    emoji: '🧳',
    weightLimitKg: 23,
    weightLimitNote: 'Standard checked luggage limit',
    defaultZoneForCategory: defaultZone(SUITCASE_DEFAULTS, ZONE.MAIN_SHELL),
    zones: {
      [ZONE.MAIN_SHELL]:  { label: 'Main Shell',   capacity: 20 },
      [ZONE.LID_MESH]:    { label: 'Lid Mesh',     capacity: 6  },
      [ZONE.SIDE_HANDLE]: { label: 'Handle Pouch', capacity: 2  },
    },
    hitAreas: {
      [ZONE.MAIN_SHELL]:  { x: 35,  y: 145, w: 170, h: 120 },
      [ZONE.LID_MESH]:    { x: 35,  y: 40,  w: 170, h: 105 },
      [ZONE.SIDE_HANDLE]: { x: 85,  y: 2,   w: 70,  h: 38  },
    },
    badgePos: {
      [ZONE.MAIN_SHELL]:  { x: 196, y: 155 },
      [ZONE.LID_MESH]:    { x: 196, y: 50  },
      [ZONE.SIDE_HANDLE]: { x: 148, y: 10  },
    },
    geometry: {
      body:    { w: 0.95, h: 1.35, d: 0.44, radius: 0.05 },
      lid:     { w: 0.93, h: 0.66, d: 0.22, position: [0, 0.345, -0.11] },
      pockets: [
        { w: 0.75, h: 0.55, d: 0.04, position: [0, 0.345, 0.12], label: 'lid_mesh' },
      ],
      handles: [
        { type: 'telescoping', position: [0, 0.78, -0.22] },
        { type: 'wheel',       position: [-0.34, -0.72, 0.18] },
        { type: 'wheel',       position: [ 0.34, -0.72, 0.18] },
      ],
    },
  },

  carryon: {
    id: 'carryon',
    label: 'Carry-On',
    emoji: '✈️',
    weightLimitKg: 7,
    weightLimitNote: 'Typical airline cabin limit',
    defaultZoneForCategory: defaultZone(CARRYON_DEFAULTS, ZONE.MAIN),
    zones: {
      [ZONE.MAIN]:      { label: 'Main',          capacity: 10 },
      [ZONE.FRONT_ZIP]: { label: 'Front Zip',     capacity: 4  },
      [ZONE.LAPTOP]:    { label: 'Laptop Sleeve', capacity: 2  },
    },
    // front_zip and laptop_sleeve must remain after main in this object so they
    // render on top in SVG z-order (Object.entries preserves insertion order).
    hitAreas: {
      [ZONE.MAIN]:      { x: 48,  y: 50,  w: 144, h: 160 },
      [ZONE.FRONT_ZIP]: { x: 92,  y: 50,  w: 56,  h: 160 },
      [ZONE.LAPTOP]:    { x: 48,  y: 210, w: 144, h: 58  },
    },
    badgePos: {
      [ZONE.MAIN]:      { x: 182, y: 60  },
      [ZONE.FRONT_ZIP]: { x: 142, y: 60  },
      [ZONE.LAPTOP]:    { x: 182, y: 220 },
    },
    geometry: {
      body:    { w: 0.60, h: 1.20, d: 0.34, radius: 0.05 },
      lid:     null,
      pockets: [
        { w: 0.25, h: 1.00, d: 0.08, position: [0.18, 0.01, 0.21],  label: 'front_zip' },
        { w: 0.52, h: 0.30, d: 0.04, position: [0, -0.54, 0.17],    label: 'laptop_sleeve' },
      ],
      handles: [
        { type: 'telescoping', position: [0, 0.66, -0.17] },
        { type: 'wheel',       position: [-0.22, -0.65, 0.14] },
        { type: 'wheel',       position: [ 0.22, -0.65, 0.14] },
      ],
    },
  },

  daypack: {
    id: 'daypack',
    label: 'Daypack',
    emoji: '🗜️',
    weightLimitKg: 5,
    weightLimitNote: null,
    defaultZoneForCategory: defaultZone(DAYPACK_DEFAULTS, ZONE.MAIN),
    zones: {
      [ZONE.MAIN]:      { label: 'Main',      capacity: 6 },
      [ZONE.FRONT_ZIP]: { label: 'Front Zip', capacity: 3 },
    },
    hitAreas: {
      [ZONE.MAIN]:      { x: 55, y: 65,  w: 130, h: 140 },
      [ZONE.FRONT_ZIP]: { x: 72, y: 205, w: 96,  h: 42  },
    },
    badgePos: {
      [ZONE.MAIN]:      { x: 176, y: 75  },
      [ZONE.FRONT_ZIP]: { x: 162, y: 215 },
    },
    geometry: {
      body:    { w: 0.64, h: 0.86, d: 0.32, radius: 0.10 },
      lid:     null,
      pockets: [
        { w: 0.50, h: 0.30, d: 0.10, position: [0, -0.48, 0.21], label: 'front_zip' },
      ],
      handles: [
        { type: 'strap', position: [-0.14, 0.38, -0.16] },
        { type: 'strap', position: [ 0.14, 0.38, -0.16] },
      ],
    },
  },
};

export const BAG_TYPE_IDS = Object.keys(BAG_TYPES);
