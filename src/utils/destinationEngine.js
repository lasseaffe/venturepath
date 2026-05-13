// Destination engine stub — returns curated destination data

// Mock POIs per destination for AR Ghost Tours
export const DESTINATION_POIS = {
  hamburg: [
    {
      id: 'poi_hh1', name: 'Elbphilharmonie', coords: { lat: 53.5413, lng: 9.9842 },
      historicalNote: 'Built on a 1963 cocoa warehouse, the Elbphilharmonie opened in 2017 after a 16-year construction saga. Its wave-shaped roof holds 2,100 concert seats and a free public plaza 37 metres above the Elbe.',
      trendingSnippet: '🎶 Instagram: Plaza sunset shots have generated 8.4M posts this year.',
      icon: '🎶',
    },
    {
      id: 'poi_hh2', name: 'Speicherstadt Warehouse District', coords: { lat: 53.5435, lng: 9.9947 },
      historicalNote: 'Built between 1885 and 1927 on oak piles in the Elbe, Speicherstadt was the world\'s largest warehouse complex. UNESCO World Heritage since 2015, it now houses museums, design studios, and carpet traders.',
      trendingSnippet: '📸 TikTok: Red-brick canal reflections dominate Hamburg travel content — 3.1M views this month.',
      icon: '🏛',
    },
    {
      id: 'poi_hh3', name: 'Miniatur Wunderland', coords: { lat: 53.5436, lng: 9.9930 },
      historicalNote: 'Opened in 2001 with 800m of track, Wunderland now spans 1,545m across 16 sections representing Europe, America, and Scandinavia. The model Hamburg airport simulates day and night cycles every 15 minutes.',
      trendingSnippet: '🚂 Reddit: Voted #1 indoor attraction in Germany four years running.',
      icon: '🚂',
    },
  ],
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

// Normalize a hero entry — accepts legacy string or new object shape { url, source, credit, tags }.
export function normalizeHero(entry) {
  if (typeof entry === 'string') {
    return { url: entry, source: 'pexels', credit: '', tags: [] };
  }
  return entry;
}

// Curated high-resolution hero images per destination (Pexels/Unsplash CDN — no auth required).
// Hamburg uses the typed object shape; all others remain legacy strings and are coerced by normalizeHero.
// Use scripts/fetch-destination-photos.js to generate candidates for new destinations.
export const DESTINATION_HEROES = {
  lille: [
    'https://images.pexels.com/photos/5370571/pexels-photo-5370571.jpeg?auto=compress&cs=tinysrgb&w=2560',
    'https://images.pexels.com/photos/7599735/pexels-photo-7599735.jpeg?auto=compress&cs=tinysrgb&w=2560',
    'https://images.pexels.com/photos/4388164/pexels-photo-4388164.jpeg?auto=compress&cs=tinysrgb&w=2560',
    'https://images.pexels.com/photos/2082103/pexels-photo-2082103.jpeg?auto=compress&cs=tinysrgb&w=2560',
    'https://images.pexels.com/photos/161901/paris-france-city-architecture-161901.jpeg?auto=compress&cs=tinysrgb&w=2560',
  ],
  hamburg: [
    { url: 'https://images.pexels.com/photos/4144197/pexels-photo-4144197.jpeg?auto=compress&cs=tinysrgb&w=2560', source: 'pexels', credit: 'Nick Kwan', tags: ['speicherstadt', 'canal', 'warehouse', 'red brick'] },
    { url: 'https://images.pexels.com/photos/1769408/pexels-photo-1769408.jpeg?auto=compress&cs=tinysrgb&w=2560', source: 'pexels', credit: 'Nextvoyage', tags: ['elbphilharmonie', 'harbor', 'hafencity', 'elbe'] },
    { url: 'https://images.pexels.com/photos/3566208/pexels-photo-3566208.jpeg?auto=compress&cs=tinysrgb&w=2560', source: 'pexels', credit: 'Vladyslav Dukhin', tags: ['landungsbruecken', 'harbor', 'docks', 'elbe'] },
    { url: 'https://images.pexels.com/photos/1437489/pexels-photo-1437489.jpeg?auto=compress&cs=tinysrgb&w=2560', source: 'pexels', credit: 'Nextvoyage', tags: ['alster', 'lake', 'city hall', 'rathaus'] },
    { url: 'https://images.pexels.com/photos/2846217/pexels-photo-2846217.jpeg?auto=compress&cs=tinysrgb&w=2560', source: 'pexels', credit: 'Dmitriy Ganin', tags: ['hamburger dom', 'city', 'aerial'] },
    { url: 'https://images.pexels.com/photos/4502967/pexels-photo-4502967.jpeg?auto=compress&cs=tinysrgb&w=2560', source: 'pexels', credit: 'Alexandr Podvalny', tags: ['hafencity', 'modern', 'architecture'] },
    { url: 'https://images.pexels.com/photos/2574681/pexels-photo-2574681.jpeg?auto=compress&cs=tinysrgb&w=2560', source: 'pexels', credit: 'Nextvoyage', tags: ['speicherstadt', 'night', 'reflections', 'canal'] },
    { url: 'https://images.pexels.com/photos/3566182/pexels-photo-3566182.jpeg?auto=compress&cs=tinysrgb&w=2560', source: 'pexels', credit: 'Vladyslav Dukhin', tags: ['speicherstadt', 'canal', 'bridge'] },
  ],
  patagonia: [
    'https://images.pexels.com/photos/1761279/pexels-photo-1761279.jpeg?auto=compress&cs=tinysrgb&w=2560',
    'https://images.pexels.com/photos/3225517/pexels-photo-3225517.jpeg?auto=compress&cs=tinysrgb&w=2560',
    'https://images.pexels.com/photos/4916640/pexels-photo-4916640.jpeg?auto=compress&cs=tinysrgb&w=2560',
    'https://images.pexels.com/photos/2088205/pexels-photo-2088205.jpeg?auto=compress&cs=tinysrgb&w=2560',
    'https://images.pexels.com/photos/1770809/pexels-photo-1770809.jpeg?auto=compress&cs=tinysrgb&w=2560',
  ],
  svalbard: [
    'https://images.pexels.com/photos/1559821/pexels-photo-1559821.jpeg?auto=compress&cs=tinysrgb&w=2560',
    'https://images.pexels.com/photos/1612351/pexels-photo-1612351.jpeg?auto=compress&cs=tinysrgb&w=2560',
    'https://images.pexels.com/photos/3023211/pexels-photo-3023211.jpeg?auto=compress&cs=tinysrgb&w=2560',
    'https://images.pexels.com/photos/54202/pexels-photo-54202.jpeg?auto=compress&cs=tinysrgb&w=2560',
    'https://images.pexels.com/photos/1685718/pexels-photo-1685718.jpeg?auto=compress&cs=tinysrgb&w=2560',
  ],
  namib: [
    'https://images.pexels.com/photos/1029604/pexels-photo-1029604.jpeg?auto=compress&cs=tinysrgb&w=2560',
    'https://images.pexels.com/photos/3369526/pexels-photo-3369526.jpeg?auto=compress&cs=tinysrgb&w=2560',
    'https://images.pexels.com/photos/3408744/pexels-photo-3408744.jpeg?auto=compress&cs=tinysrgb&w=2560',
    'https://images.pexels.com/photos/259412/pexels-photo-259412.jpeg?auto=compress&cs=tinysrgb&w=2560',
    'https://images.pexels.com/photos/3389783/pexels-photo-3389783.jpeg?auto=compress&cs=tinysrgb&w=2560',
  ],
  amazon: [
    'https://images.pexels.com/photos/975771/pexels-photo-975771.jpeg?auto=compress&cs=tinysrgb&w=2560',
    'https://images.pexels.com/photos/3408744/pexels-photo-3408744.jpeg?auto=compress&cs=tinysrgb&w=2560',
    'https://images.pexels.com/photos/2739664/pexels-photo-2739664.jpeg?auto=compress&cs=tinysrgb&w=2560',
    'https://images.pexels.com/photos/147411/italy-mountains-dawn-daylight-147411.jpeg?auto=compress&cs=tinysrgb&w=2560',
    'https://images.pexels.com/photos/1659438/pexels-photo-1659438.jpeg?auto=compress&cs=tinysrgb&w=2560',
  ],
  karakorum: [
    'https://images.pexels.com/photos/3617500/pexels-photo-3617500.jpeg?auto=compress&cs=tinysrgb&w=2560',
    'https://images.pexels.com/photos/1612351/pexels-photo-1612351.jpeg?auto=compress&cs=tinysrgb&w=2560',
    'https://images.pexels.com/photos/2335126/pexels-photo-2335126.jpeg?auto=compress&cs=tinysrgb&w=2560',
    'https://images.pexels.com/photos/3408354/pexels-photo-3408354.jpeg?auto=compress&cs=tinysrgb&w=2560',
    'https://images.pexels.com/photos/3617500/pexels-photo-3617500.jpeg?auto=compress&cs=tinysrgb&w=2560',
  ],
  default: [
    'https://images.pexels.com/photos/1285625/pexels-photo-1285625.jpeg?auto=compress&cs=tinysrgb&w=2560',
    'https://images.pexels.com/photos/3278215/pexels-photo-3278215.jpeg?auto=compress&cs=tinysrgb&w=2560',
    'https://images.pexels.com/photos/1603650/pexels-photo-1603650.jpeg?auto=compress&cs=tinysrgb&w=2560',
    'https://images.pexels.com/photos/2356045/pexels-photo-2356045.jpeg?auto=compress&cs=tinysrgb&w=2560',
    'https://images.pexels.com/photos/1591373/pexels-photo-1591373.jpeg?auto=compress&cs=tinysrgb&w=2560',
  ],
};

/**
 * Returns the best hero image URL for a destination.
 * Normalises the city name to match DESTINATION_HEROES keys.
 * Falls back to 'default' if no specific set is found.
 */
export function getDestinationHeroUrl(destination) {
  if (!destination) return DESTINATION_HEROES.default[0];
  const key = destination.split(',')[0].trim().toLowerCase().replace(/[^a-z]/g, '');
  const candidates = DESTINATION_HEROES[key] ?? DESTINATION_HEROES.default;
  return candidates[0];
}

export const DESTINATION_CENTERS = {
  hamburg:   [53.5511, 9.9937],
  lille:     [50.6292, 3.0573],
  patagonia: [-50.97, -73.0],
  svalbard:  [78.22, 15.64],
  namib:     [-24.0, 15.5],
  amazon:    [-3.5, -62.2],
  karakorum: [36.8, 74.8],
  default:   [20.0, 0.0],
};

export function normalizeDestinationKey(destination) {
  if (!destination) return 'default';
  const key = destination.split(',')[0].trim().toLowerCase().replace(/[^a-z]/g, '');
  return key in DESTINATION_CENTERS ? key : 'default';
}

export const DESTINATION_DAYS = {
  hamburg: [
    { id: 'd-hh-1', label: 'Day 1 — Harbor & Elbphilharmonie', image: null, blocks: [] },
    { id: 'd-hh-2', label: 'Day 2 — Speicherstadt & HafenCity', image: null, blocks: [] },
    { id: 'd-hh-3', label: 'Day 3 — Altona & Schanzenviertel',  image: null, blocks: [] },
    { id: 'd-hh-4', label: 'Day 4 — Blankenese Day Trip',        image: null, blocks: [] },
    { id: 'd-hh-5', label: 'Day 5 — Museums Quarter',            image: null, blocks: [] },
  ],
  lille: [
    { id: 'd-lil-1', label: 'Day 1 — Vieux-Lille Old Town',     image: null, blocks: [] },
    { id: 'd-lil-2', label: 'Day 2 — Wazemmes Market',          image: null, blocks: [] },
    { id: 'd-lil-3', label: 'Day 3 — Citadel & Parks',          image: null, blocks: [] },
    { id: 'd-lil-4', label: 'Day 4 — Day Trip to Arras/Roubaix',image: null, blocks: [] },
  ],
  patagonia: [
    { id: 'd-pat-1', label: 'Day 1 — Gateway City Layover',     image: null, blocks: [] },
    { id: 'd-pat-2', label: 'Day 2 — Transfer & Trailhead',     image: null, blocks: [] },
    { id: 'd-pat-3', label: 'Day 3 — Scout Day',                image: null, blocks: [] },
    { id: 'd-pat-4', label: 'Day 4 — Summit Push',              image: null, blocks: [] },
    { id: 'd-pat-5', label: 'Day 5 — Rest & Resupply',          image: null, blocks: [] },
  ],
  svalbard: [
    { id: 'd-sval-1', label: 'Day 1 — Longyearbyen Arrival',   image: null, blocks: [] },
    { id: 'd-sval-2', label: 'Day 2 — Seed Vault & Glacier',   image: null, blocks: [] },
    { id: 'd-sval-3', label: 'Day 3 — Snowmobile Expedition',  image: null, blocks: [] },
    { id: 'd-sval-4', label: 'Day 4 — Aurora Observation',     image: null, blocks: [] },
  ],
  namib: [
    { id: 'd-nam-1', label: 'Day 1 — Swakopmund Base',         image: null, blocks: [] },
    { id: 'd-nam-2', label: 'Day 2 — Sossusvlei Dunes',        image: null, blocks: [] },
    { id: 'd-nam-3', label: 'Day 3 — Deadvlei & Pan Walk',     image: null, blocks: [] },
    { id: 'd-nam-4', label: 'Day 4 — NamibRand Reserve',       image: null, blocks: [] },
  ],
  amazon: [
    { id: 'd-amz-1', label: 'Day 1 — Manaus Gateway',          image: null, blocks: [] },
    { id: 'd-amz-2', label: 'Day 2 — River Lodge Transfer',    image: null, blocks: [] },
    { id: 'd-amz-3', label: 'Day 3 — Canopy Walk & Wildlife',  image: null, blocks: [] },
    { id: 'd-amz-4', label: 'Day 4 — Night Safari',            image: null, blocks: [] },
  ],
  karakorum: [
    { id: 'd-kk-1', label: 'Day 1 — Islamabad Briefing',       image: null, blocks: [] },
    { id: 'd-kk-2', label: 'Day 2 — Gilgit Arrival',           image: null, blocks: [] },
    { id: 'd-kk-3', label: 'Day 3 — Hunza Valley',             image: null, blocks: [] },
    { id: 'd-kk-4', label: 'Day 4 — Khunjerab Pass',           image: null, blocks: [] },
  ],
  default: [
    { id: 'd-def-1', label: 'Day 1', image: null, blocks: [] },
    { id: 'd-def-2', label: 'Day 2', image: null, blocks: [] },
    { id: 'd-def-3', label: 'Day 3', image: null, blocks: [] },
  ],
};

export function getDestinationDays(destination) {
  const key = normalizeDestinationKey(destination);
  return (DESTINATION_DAYS[key] ?? DESTINATION_DAYS.default).map(d => ({ ...d, blocks: [] }));
}

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
