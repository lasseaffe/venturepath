export const SEARCH_STRATEGIES = {
  ITINERARY: {
    placeholder: 'Find stops, viewpoints…',
    inspireQuery: { filters: ['tourism=viewpoint', 'historic=monument', 'leisure=nature_reserve'] },
    filterMask: ['tourism=viewpoint', 'historic=*', 'leisure=nature_reserve'],
    resultActions: ['Add to Leg', 'Save POI'],
  },
  LOGISTICS: {
    placeholder: 'Find gear shops, grocery…',
    inspireQuery: { filters: ['shop=supermarket', 'shop=outdoor', 'shop=hardware'] },
    filterMask: ['shop=supermarket', 'shop=outdoor', 'shop=hardware'],
    resultActions: ['Add Supply Stop', 'Save POI'],
  },
  DISCOVERY: {
    _tab: 'DISCOVERY',
    placeholder: 'Explore hidden gems…',
    inspireQuery: { filters: ['tourism=attraction', 'tourism=museum', 'historic=*'] },
    filterMask: ['tourism=attraction', 'tourism=museum'],
    resultActions: ['Save to Collection', 'Share'],
  },
  TACTICAL_HUD: {
    placeholder: 'Find water, medical…',
    inspireQuery: { filters: ['amenity=drinking_water', 'amenity=toilets', 'amenity=hospital'] },
    filterMask: ['amenity=drinking_water', 'amenity=toilets', 'amenity=hospital'],
    resultActions: ['Mark Safe Point', 'SOS Anchor'],
  },
  BUDGET: {
    placeholder: 'Find ATMs, banks…',
    inspireQuery: { filters: ['amenity=atm', 'amenity=bank', 'amenity=bureau_de_change'] },
    filterMask: ['amenity=atm', 'amenity=bank'],
    resultActions: ['Log Expense Stop'],
  },
  STRATEGY: {
    placeholder: 'Search destinations, airports…',
    inspireQuery: { filters: ['aeroway=aerodrome', 'office=government'] },
    filterMask: ['aeroway=aerodrome'],
    resultActions: ['Add to Mission'],
  },
  DEFAULT: {
    placeholder: 'Search…',
    inspireQuery: { filters: [] },
    filterMask: [],
    resultActions: ['Save POI'],
  },
};
