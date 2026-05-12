// Packing logic engine — derives gear list from trip profile
export const CATEGORIES = {
  BASE: 'Base Camp',
  NAVIGATION: 'Navigation',
  SHELTER: 'Shelter & Sleep',
  SUSTENANCE: 'Food & Water',
  MEDICAL: 'Medical',
  CLOTHING: 'Clothing',
  TECH: 'Tech & Power',
};

export const BASE_ITEMS = [
  { id: 'passport', label: 'Passport / ID', category: CATEGORIES.BASE, weight: 0.1, critical: true },
  { id: 'cash', label: 'Emergency Cash', category: CATEGORIES.BASE, weight: 0.05, critical: true },
  { id: 'map', label: 'Offline Maps (downloaded)', category: CATEGORIES.NAVIGATION, weight: 0.0, critical: true },
  { id: 'compass', label: 'Compass', category: CATEGORIES.NAVIGATION, weight: 0.08 },
  { id: 'headlamp', label: 'Headlamp + Spare Batteries', category: CATEGORIES.NAVIGATION, weight: 0.15 },
  { id: 'shelter', label: 'Tent / Bivvy', category: CATEGORIES.SHELTER, weight: 1.8 },
  { id: 'sleeping_bag', label: 'Sleeping Bag', category: CATEGORIES.SHELTER, weight: 1.2 },
  { id: 'water_filter', label: 'Water Filter', category: CATEGORIES.SUSTENANCE, weight: 0.09, critical: true },
  { id: 'first_aid', label: 'First Aid Kit', category: CATEGORIES.MEDICAL, weight: 0.4, critical: true },
  { id: 'powerbank', label: 'Power Bank (20,000mAh)', category: CATEGORIES.TECH, weight: 0.45 },
  { id: 'sat_comm', label: 'Satellite Communicator', category: CATEGORIES.TECH, weight: 0.18 },
];

const CLIMATE_EXTRAS = {
  arctic: [
    { id: 'down_jacket', label: 'Down Jacket (-20°C rated)', category: CATEGORIES.CLOTHING, weight: 0.8 },
    { id: 'balaclava', label: 'Balaclava', category: CATEGORIES.CLOTHING, weight: 0.06 },
    { id: 'hand_warmers', label: 'Hand Warmers (x10)', category: CATEGORIES.BASE, weight: 0.3 },
  ],
  tropical: [
    { id: 'mosquito_net', label: 'Mosquito Net', category: CATEGORIES.SHELTER, weight: 0.25 },
    { id: 'deet', label: 'DEET Repellent', category: CATEGORIES.MEDICAL, weight: 0.15 },
    { id: 'water_purification', label: 'Water Purification Tabs', category: CATEGORIES.SUSTENANCE, weight: 0.05 },
  ],
  desert: [
    { id: 'sun_protection', label: 'Full-coverage Sun Hat', category: CATEGORIES.CLOTHING, weight: 0.12 },
    { id: 'electrolytes', label: 'Electrolyte Sachets (x20)', category: CATEGORIES.SUSTENANCE, weight: 0.2 },
    { id: 'extra_water', label: '4L Water Capacity (extra)', category: CATEGORIES.SUSTENANCE, weight: 4.0 },
  ],
  temperate: [],
};

// POI-tag-based extra items
const POI_TAG_EXTRAS = {
  Hiking: [
    { id: 'trekking_poles', label: 'Trekking Poles', category: CATEGORIES.NAVIGATION, weight: 0.5 },
    { id: 'gaiters', label: 'Gaiters', category: CATEGORIES.CLOTHING, weight: 0.3 },
    { id: 'blister_kit', label: 'Blister Kit', category: CATEGORIES.MEDICAL, weight: 0.05 },
  ],
  Dinner: [
    { id: 'smart_casual', label: 'Smart Casual Outfit', category: CATEGORIES.CLOTHING, weight: 0.6 },
    { id: 'dress_shoes', label: 'Dress Shoes', category: CATEGORIES.CLOTHING, weight: 0.9 },
  ],
  Swimming: [
    { id: 'swimwear', label: 'Swimwear', category: CATEGORIES.CLOTHING, weight: 0.2 },
    { id: 'towel', label: 'Quick-Dry Towel', category: CATEGORIES.SHELTER, weight: 0.3 },
    { id: 'sunscreen', label: 'Reef-Safe Sunscreen', category: CATEGORIES.MEDICAL, weight: 0.2 },
  ],
  Camping: [
    { id: 'camp_chair', label: 'Folding Camp Chair', category: CATEGORIES.SHELTER, weight: 0.9 },
    { id: 'firestarter', label: 'Firestarter Kit', category: CATEGORIES.BASE, weight: 0.1 },
    { id: 'camp_cook', label: 'Camp Cooking Set', category: CATEGORIES.SUSTENANCE, weight: 0.7 },
  ],
  Photography: [
    { id: 'camera', label: 'Camera + Lenses', category: CATEGORIES.TECH, weight: 1.5 },
    { id: 'tripod', label: 'Mini Tripod', category: CATEGORIES.TECH, weight: 0.35 },
  ],
  Cultural: [
    { id: 'phrasebook', label: 'Offline Phrasebook', category: CATEGORIES.NAVIGATION, weight: 0.0 },
    { id: 'modest_wear', label: 'Modest Cover-up', category: CATEGORIES.CLOTHING, weight: 0.3 },
  ],
};

/**
 * Generate a packing list from trip parameters.
 * @param {{ climate: string, days: number, hasChildren: boolean, poiTags?: string[] }} profile
 * @returns {{ items: Array, totalWeight: number }}
 */
export function generatePackingList(profile = {}) {
  const { climate = 'temperate', days = 7, hasChildren = false, poiTags = [] } = profile;

  let items = [...BASE_ITEMS];
  const extras = CLIMATE_EXTRAS[climate] ?? [];
  items = [...items, ...extras];

  // Scale consumables by trip length
  if (days > 7) {
    items.push({ id: 'extra_food', label: `Extra Rations (${days - 7} days)`, category: CATEGORIES.SUSTENANCE, weight: (days - 7) * 0.6 });
  }

  if (hasChildren) {
    items.push({ id: 'kids_kit', label: 'Children\'s First Aid Supplement', category: CATEGORIES.MEDICAL, weight: 0.3, critical: true });
  }

  // POI-tag extras (deduplicate by id)
  const existingIds = new Set(items.map(i => i.id));
  for (const tag of poiTags) {
    const extras = POI_TAG_EXTRAS[tag] ?? [];
    for (const extra of extras) {
      if (!existingIds.has(extra.id)) {
        items.push(extra);
        existingIds.add(extra.id);
      }
    }
  }

  const totalWeight = items.reduce((sum, i) => sum + (i.weight ?? 0), 0);
  return { items, totalWeight: Math.round(totalWeight * 100) / 100 };
}

/**
 * Group items by category.
 * @param {Array} items
 * @returns {Record<string, Array>}
 */
export function groupByCategory(items) {
  return items.reduce((acc, item) => {
    const key = item.category;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
}
