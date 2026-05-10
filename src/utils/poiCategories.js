export const POI_CATEGORIES = [
  { id: 'water',      label: 'Water',       icon: '💧', color: '#60A5FA', osmTags: { amenity: 'drinking_water' },                    otmKind: null       },
  { id: 'food',       label: 'Food',        icon: '🍽', color: '#E67E22', osmTags: { amenity: ['restaurant', 'cafe', 'fast_food'] }, otmKind: 'foods'    },
  { id: 'shelter',    label: 'Shelter',     icon: '⛺', color: '#D9C5B2', osmTags: { amenity: 'shelter' },                           otmKind: null       },
  { id: 'medical',    label: 'Medical',     icon: '⚕', color: '#EF4444', osmTags: { amenity: 'pharmacy' },                          otmKind: null       },
  { id: 'gear',       label: 'Gear',        icon: '🎒', color: '#A78BFA', osmTags: { shop: 'outdoor' },                              otmKind: null       },
  { id: 'attraction', label: 'Attractions', icon: '📍', color: '#F59E0B', osmTags: { tourism: 'attraction' },                        otmKind: 'cultural' },
  { id: 'nature',     label: 'Nature',      icon: '🌲', color: '#22C55E', osmTags: { leisure: 'nature_reserve' },                    otmKind: 'natural'  },
  { id: 'historic',   label: 'Historic',    icon: '🏛', color: '#8B5CF6', osmTags: { historic: '*' },                               otmKind: 'historic' },
];

export const CATEGORY_IDS = POI_CATEGORIES.map(c => c.id);

export function categoryById(id) {
  return POI_CATEGORIES.find(c => c.id === id) ?? null;
}

export function classifyPoi(poi) {
  for (const cat of POI_CATEGORIES) {
    if (cat.otmKind && poi.kinds?.includes(cat.otmKind)) return cat.id;
  }
  const tags = poi.osmTags ?? {};
  for (const cat of POI_CATEGORIES) {
    for (const [key, val] of Object.entries(cat.osmTags)) {
      if (key in tags) {
        if (val === '*') return cat.id;
        const vals = Array.isArray(val) ? val : [val];
        if (vals.includes(tags[key])) return cat.id;
      }
    }
  }
  return null;
}
