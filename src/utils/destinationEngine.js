// Destination engine stub — returns curated destination data

// Mock POIs per destination for AR Ghost Tours
export const DESTINATION_POIS = {
  patagonia: [
    {
      id: 'poi_p1', name: 'Mirador Las Torres', coords: { lat: -50.9423, lng: -72.8998 },
      historicalNote: 'The Torres del Paine granite towers formed 12 million years ago when magma intruded between sedimentary layers. The Aonikenk (Tehuelche) people considered this valley sacred.',
      trendingSnippet: '🔥 Trending: Sunrise shots here earned 2.3M likes last week on Instagram.',
      icon: '🗿',
    },
    {
      id: 'poi_p2', name: 'Grey Glacier', coords: { lat: -51.0, lng: -73.2 },
      historicalNote: 'Grey Glacier is part of the Southern Patagonian Ice Field — the third largest freshwater reserve on Earth. It has retreated 4km since 1996.',
      trendingSnippet: '🎥 TikTok trend: Kayaking past icebergs here went viral with 4.1M views.',
      icon: '🧊',
    },
    {
      id: 'poi_p3', name: 'Valle del Francés', coords: { lat: -50.97, lng: -73.01 },
      historicalNote: 'Patagonian explorers first mapped this valley in 1879. Its hanging glaciers and vertical walls reach 2,500m.',
      trendingSnippet: '📸 Most photographed valley in South America this season.',
      icon: '⛰',
    },
  ],
  svalbard: [
    {
      id: 'poi_s1', name: 'Svalbard Global Seed Vault', coords: { lat: 78.2366, lng: 15.4906 },
      historicalNote: 'Opened in 2008, the vault stores 1.3 million seed varieties from around the world — humanity\'s backup for global food diversity.',
      trendingSnippet: '🌍 Featured in 12 viral documentaries this month.',
      icon: '🌱',
    },
    {
      id: 'poi_s2', name: 'Longyearbyen Arctic Cathedral', coords: { lat: 78.2232, lng: 15.6469 },
      historicalNote: 'Built in 1921 as a mining company community hall, converted to a church in 1956. Survived Soviet bombing in WWII.',
      trendingSnippet: '✨ Aurora photos from this spot trending globally.',
      icon: '⛪',
    },
  ],
};

const DESTINATIONS = [
  {
    id: 'patagonia',
    name: 'Patagonia, Chile',
    climate: 'temperate',
    difficulty: 'Advanced',
    bestSeason: 'Nov–Mar',
    tags: ['trekking', 'glacier', 'remote'],
    coords: { lat: -51.6, lng: -72.7 },
    description: 'Wind-scoured peaks and electric-blue glaciers at the end of the earth.',
  },
  {
    id: 'svalbard',
    name: 'Svalbard, Norway',
    climate: 'arctic',
    difficulty: 'Expert',
    bestSeason: 'Feb–Apr',
    tags: ['polar', 'wildlife', 'northern-lights'],
    coords: { lat: 78.2, lng: 15.6 },
    description: 'Polar bear territory. Midnight sun. Ice fields stretching to the horizon.',
  },
  {
    id: 'namib',
    name: 'Namib Desert, Namibia',
    climate: 'desert',
    difficulty: 'Intermediate',
    bestSeason: 'May–Sep',
    tags: ['desert', 'dunes', 'solitude'],
    coords: { lat: -24.0, lng: 15.5 },
    description: 'World\'s oldest desert — red dunes, dead vlei, and star-filled skies.',
  },
  {
    id: 'amazon',
    name: 'Amazon Basin, Brazil',
    climate: 'tropical',
    difficulty: 'Advanced',
    bestSeason: 'Jun–Nov',
    tags: ['jungle', 'wildlife', 'river'],
    coords: { lat: -3.5, lng: -62.2 },
    description: 'Primordial rainforest. More species per km² than anywhere on Earth.',
  },
  {
    id: 'karakorum',
    name: 'Karakoram Highway, Pakistan',
    climate: 'temperate',
    difficulty: 'Extreme',
    bestSeason: 'Jun–Sep',
    tags: ['mountain', 'overland', 'culture'],
    coords: { lat: 36.8, lng: 74.8 },
    description: 'The highest paved road on Earth. Eight-thousanders on both sides.',
  },
];

/**
 * Fetch all destinations (stub).
 * @returns {Promise<Array>}
 */
export async function fetchDestinations() {
  await new Promise(r => setTimeout(r, 300));
  return DESTINATIONS;
}

/**
 * Find destination by ID.
 * @param {string} id
 * @returns {Promise<object|null>}
 */
export async function fetchDestination(id) {
  await new Promise(r => setTimeout(r, 200));
  return DESTINATIONS.find(d => d.id === id) ?? null;
}

/**
 * Filter destinations by tags/climate.
 * @param {{ tags?: string[], climate?: string }} filters
 * @returns {Array}
 */
export function filterDestinations(filters = {}) {
  return DESTINATIONS.filter(d => {
    if (filters.climate && d.climate !== filters.climate) return false;
    if (filters.tags?.length) {
      return filters.tags.some(t => d.tags.includes(t));
    }
    return true;
  });
}
