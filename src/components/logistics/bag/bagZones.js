// src/components/logistics/bag/bagZones.js

// Zone IDs shared across all views
export const ZONES = {
  MAIN: 'main',
  TOP_LID: 'top_lid',
  HIP_BELT: 'hip_belt',
  SIDE_POCKET: 'side_pocket',
  FRONT_POCKET: 'front_pocket',
};

// Hover animation type per zone, keyed by luggage type.
// 'draw-h'     — stroke-dashoffset trace left→right (zones with rendered horizontal zippers)
// 'draw-v'     — stroke-dashoffset trace top→bottom (zones with rendered vertical zippers)
// 'expand'     — clip-path wipe from zone midline outward (no physical hardware)
// 'split-flap' — two halves translate apart from center seam (hinged lids / clamshells)
//
// Rule: no two adjacent zones should share the same type.
// When adding a new luggage SVG, add its animation entry here.
export const ZONE_ANIMATIONS = {
  backpack: {
    top_lid:      'split-flap', // leather flap physically lifts from center
    main:         'expand',     // large body, no zipper hardware — fabric release
    front_pocket: 'draw-h',     // zipper rail rendered at y=150
    side_pocket:  'draw-v',     // vertical zipper at x=208
    hip_belt:     'expand',     // thin band — belt-buckle release wipe
  },
  // Future entries (uncomment and fill zipper coords when SVGs are built):
  // duffel:   { main: 'split-flap', end_pocket: 'draw-h', top_zip: 'draw-h' },
  // suitcase: { main_left: 'split-flap', main_right: 'split-flap', lid_mesh: 'expand', side_handle: 'draw-v' },
  // carry_on: { main: 'split-flap', front_zip: 'draw-h', laptop_sleeve: 'expand' },
};

// Literal zones: item category → zone ID
const CATEGORY_TO_LITERAL = {
  'Shelter & Sleep': ZONES.MAIN,
  'Food & Water':    ZONES.MAIN,
  'Clothing':        ZONES.MAIN,
  'Medical':         ZONES.TOP_LID,
  'Navigation':      ZONES.TOP_LID,
  'Base Camp':       ZONES.FRONT_POCKET,
  'Tech & Power':    ZONES.HIP_BELT,
};

function priorityZone(item) {
  if (item.critical) return ZONES.TOP_LID;
  if (item.weight >= 1.0) return ZONES.MAIN;
  if (item.weight < 0.2)  return ZONES.FRONT_POCKET;
  return ZONES.HIP_BELT;
}

export function resolveZone(item, mode) {
  if (mode === 'literal')  return CATEGORY_TO_LITERAL[item.category] ?? ZONES.MAIN;
  if (mode === 'category') return item.category;
  if (mode === 'priority') return priorityZone(item);
  return ZONES.MAIN;
}

export function buildZoneMap(items, mode) {
  return items.reduce((acc, item) => {
    const z = resolveZone(item, mode);
    if (!acc[z]) acc[z] = [];
    acc[z].push(item);
    return acc;
  }, {});
}
