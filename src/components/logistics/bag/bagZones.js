// src/components/logistics/bag/bagZones.js

// Zone IDs shared across all views
export const ZONES = {
  MAIN: 'main',
  TOP_LID: 'top_lid',
  HIP_BELT: 'hip_belt',
  SIDE_POCKET: 'side_pocket',
  FRONT_POCKET: 'front_pocket',
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
