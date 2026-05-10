// Vibe Check Engine — destination-aware social trend scraper

// ── Destination profiles ────────────────────────────────────────────────────

const PROFILES = {
  patagonia: {
    keywords: ['patagonia', 'torres del paine', 'punta arenas', 'el chalten', 'ushuaia'],
    vibes: [
      { tag: 'Torres Sunrise',   score: 98, source: 'Instagram', emoji: '🌄' },
      { tag: 'Glacier Kayaking', score: 91, source: 'TikTok',    emoji: '🧊' },
      { tag: 'Condor Spotting',  score: 84, source: 'Reddit',    emoji: '🦅' },
      { tag: 'W-Trek Day Hike',  score: 79, source: 'Instagram', emoji: '⛰' },
      { tag: 'Mate & Empanadas', score: 72, source: 'TikTok',    emoji: '🫖' },
      { tag: 'Stargazing Pampa', score: 68, source: 'Instagram', emoji: '🌌' },
      { tag: 'Refugio Dining',   score: 61, source: 'Google',    emoji: '🍽' },
      { tag: 'Waterfall Plunge', score: 55, source: 'TikTok',    emoji: '💧' },
    ],
  },
  arctic: {
    keywords: ['svalbard', 'norway', 'iceland', 'greenland', 'alaska', 'tromsø', 'tromso', 'fairbanks', 'lapland', 'finland', 'reykjavik'],
    vibes: [
      { tag: 'Northern Lights',  score: 97, source: 'Instagram', emoji: '🌌' },
      { tag: 'Polar Bear Safari',score: 93, source: 'TikTok',    emoji: '🐻‍❄️' },
      { tag: 'Ice Cave Explore', score: 87, source: 'Instagram', emoji: '🧊' },
      { tag: 'Dog Sledding',     score: 81, source: 'TikTok',    emoji: '🛷' },
      { tag: 'Midnight Sun',     score: 76, source: 'Instagram', emoji: '☀️' },
      { tag: 'Arctic Camping',   score: 69, source: 'Reddit',    emoji: '⛺' },
      { tag: 'Snowmobile Ride',  score: 63, source: 'TikTok',    emoji: '🏔' },
      { tag: 'Fjord Boat Tour',  score: 58, source: 'Google',    emoji: '⛵' },
    ],
  },
  'city-europe': {
    keywords: ['paris', 'france', 'london', 'rome', 'italy', 'amsterdam', 'berlin', 'germany', 'barcelona', 'spain', 'lisbon', 'portugal', 'vienna', 'austria', 'prague', 'budapest', 'europe'],
    vibes: [
      { tag: 'Museum Hopping',   score: 95, source: 'Instagram', emoji: '🏛' },
      { tag: 'Café Culture',     score: 90, source: 'TikTok',    emoji: '☕' },
      { tag: 'Street Food Tour', score: 85, source: 'TikTok',    emoji: '🥐' },
      { tag: 'Rooftop Views',    score: 80, source: 'Instagram', emoji: '🌆' },
      { tag: 'Day Trip by Rail', score: 74, source: 'Reddit',    emoji: '🚂' },
      { tag: 'Night Market',     score: 68, source: 'TikTok',    emoji: '🏮' },
      { tag: 'Wine Tasting',     score: 62, source: 'Google',    emoji: '🍷' },
      { tag: 'Hidden Courtyard', score: 55, source: 'Instagram', emoji: '🏰' },
    ],
  },
  'city-asia': {
    keywords: ['tokyo', 'japan', 'kyoto', 'osaka', 'bangkok', 'thailand', 'singapore', 'hong kong', 'seoul', 'korea', 'taipei', 'taiwan', 'shanghai', 'beijing', 'china'],
    vibes: [
      { tag: 'Temple Dawn Visit',score: 96, source: 'Instagram', emoji: '⛩' },
      { tag: 'Night Market Binge',score: 91, source: 'TikTok',   emoji: '🍜' },
      { tag: 'Bullet Train Hop', score: 85, source: 'Reddit',    emoji: '🚅' },
      { tag: 'Matcha Ceremony',  score: 79, source: 'Instagram', emoji: '🍵' },
      { tag: 'Karaoke Night',    score: 73, source: 'TikTok',    emoji: '🎤' },
      { tag: 'Hidden Alley Eats',score: 67, source: 'Reddit',    emoji: '🥟' },
      { tag: 'Rooftop Skyline',  score: 61, source: 'Instagram', emoji: '🌃' },
      { tag: 'Onsen Soak',       score: 55, source: 'Google',    emoji: '♨️' },
    ],
  },
  beach: {
    keywords: ['bali', 'maldives', 'phuket', 'cancun', 'hawaii', 'fiji', 'caribbean', 'ibiza', 'mykonos', 'santorini', 'greece', 'costa rica', 'tulum', 'bahamas', 'seychelles'],
    vibes: [
      { tag: 'Sunrise Surf',     score: 97, source: 'Instagram', emoji: '🏄' },
      { tag: 'Snorkel Reef',     score: 92, source: 'TikTok',    emoji: '🐠' },
      { tag: 'Beach Club Dine',  score: 86, source: 'Instagram', emoji: '🍹' },
      { tag: 'Cliff Jump',       score: 80, source: 'TikTok',    emoji: '🤿' },
      { tag: 'Sunset Yoga',      score: 74, source: 'Instagram', emoji: '🧘' },
      { tag: 'Kayak Lagoon',     score: 68, source: 'Reddit',    emoji: '🚣' },
      { tag: 'Night Fishing',    score: 61, source: 'TikTok',    emoji: '🎣' },
      { tag: 'Hidden Beach Cove',score: 55, source: 'Google',    emoji: '🏖' },
    ],
  },
  desert: {
    keywords: ['sahara', 'morocco', 'marrakech', 'dubai', 'abu dhabi', 'oman', 'jordan', 'petra', 'wadi rum', 'namibia', 'arizona', 'utah', 'monument valley', 'atacama', 'gobi'],
    vibes: [
      { tag: 'Dune Sunrise',     score: 96, source: 'Instagram', emoji: '🌅' },
      { tag: 'Camel Trek',       score: 91, source: 'TikTok',    emoji: '🐪' },
      { tag: 'Stargazing Desert',score: 87, source: 'Instagram', emoji: '🌌' },
      { tag: 'Ancient Ruins',    score: 82, source: 'Reddit',    emoji: '🏺' },
      { tag: 'Spice Market',     score: 75, source: 'TikTok',    emoji: '🌶' },
      { tag: 'Bedouin Camp',     score: 68, source: 'Google',    emoji: '⛺' },
      { tag: 'Oasis Swim',       score: 61, source: 'Instagram', emoji: '💧' },
      { tag: '4x4 Dune Bash',    score: 55, source: 'TikTok',    emoji: '🚙' },
    ],
  },
  mountain: {
    keywords: ['alps', 'switzerland', 'chamonix', 'zermatt', 'nepal', 'himalayas', 'everest', 'kilimanjaro', 'rockies', 'colorado', 'dolomites', 'banff', 'whistler', 'queenstown'],
    vibes: [
      { tag: 'Alpine Summit',    score: 97, source: 'Instagram', emoji: '⛰' },
      { tag: 'Via Ferrata',      score: 90, source: 'TikTok',    emoji: '🧗' },
      { tag: 'Glacier Trek',     score: 84, source: 'Reddit',    emoji: '🧊' },
      { tag: 'Mountain Hut Dine',score: 78, source: 'Google',    emoji: '🍽' },
      { tag: 'Paraglide Valley', score: 72, source: 'Instagram', emoji: '🪂' },
      { tag: 'Wildflower Walk',  score: 65, source: 'Instagram', emoji: '🌸' },
      { tag: 'Summit Sunrise',   score: 60, source: 'TikTok',    emoji: '🌄' },
      { tag: 'Cable Car Ride',   score: 54, source: 'Google',    emoji: '🚡' },
    ],
  },
  'city-us': {
    keywords: ['new york', 'los angeles', 'chicago', 'miami', 'san francisco', 'las vegas', 'new orleans', 'nashville', 'portland', 'seattle', 'austin', 'boston', 'usa', 'united states'],
    vibes: [
      { tag: 'Food Hall Crawl',  score: 94, source: 'TikTok',    emoji: '🍔' },
      { tag: 'Rooftop Brunch',   score: 89, source: 'Instagram', emoji: '🥂' },
      { tag: 'Thrift Store Haul',score: 83, source: 'TikTok',    emoji: '🧥' },
      { tag: 'Live Music Night', score: 78, source: 'Reddit',    emoji: '🎸' },
      { tag: 'Street Art Walk',  score: 72, source: 'Instagram', emoji: '🎨' },
      { tag: 'Speakeasy Bar',    score: 66, source: 'Google',    emoji: '🥃' },
      { tag: 'Farmers Market',   score: 60, source: 'Instagram', emoji: '🥬' },
      { tag: 'Skyline at Dusk',  score: 54, source: 'TikTok',    emoji: '🌆' },
    ],
  },
  safari: {
    keywords: ['kenya', 'tanzania', 'serengeti', 'masai mara', 'kruger', 'south africa', 'botswana', 'zambia', 'zimbabwe', 'uganda', 'rwanda', 'safari'],
    vibes: [
      { tag: 'Big Five Game Drive',score: 98, source: 'Instagram', emoji: '🦁' },
      { tag: 'Sunrise Bush Walk', score: 92, source: 'TikTok',    emoji: '🌅' },
      { tag: 'Gorilla Trekking',  score: 86, source: 'Reddit',    emoji: '🦍' },
      { tag: 'Hot Air Balloon',   score: 80, source: 'Instagram', emoji: '🎈' },
      { tag: 'Bush Camp Dinner',  score: 74, source: 'Google',    emoji: '🍖' },
      { tag: 'Sundowner Drinks',  score: 68, source: 'Instagram', emoji: '🌇' },
      { tag: 'Night Drive',       score: 62, source: 'TikTok',    emoji: '🔦' },
      { tag: 'Maasai Village',    score: 55, source: 'Reddit',    emoji: '🏘' },
    ],
  },
  default: {
    keywords: [],
    vibes: [
      { tag: 'Sunrise Hikes',    score: 94, source: 'Instagram', emoji: '🌄' },
      { tag: 'Local Street Food',score: 88, source: 'TikTok',    emoji: '🍜' },
      { tag: 'Hidden Waterfalls',score: 83, source: 'Reddit',    emoji: '💧' },
      { tag: 'Rooftop Bars',     score: 76, source: 'TikTok',    emoji: '🍹' },
      { tag: 'Stargazing Spots', score: 71, source: 'Instagram', emoji: '🌌' },
      { tag: 'Night Markets',    score: 65, source: 'TikTok',    emoji: '🏮' },
      { tag: 'Thermal Pools',    score: 60, source: 'Instagram', emoji: '♨️' },
      { tag: 'Scenic Viewpoints',score: 55, source: 'Google',    emoji: '🏔' },
    ],
  },
};

// ── Activity templates ───────────────────────────────────────────────────────

const VIBE_TO_ACTIVITY = {
  // Patagonia
  'Torres Sunrise':    { time: '05:30', title: 'Sunrise hike to Mirador Las Torres',  category: 'activity', icon: '🌄', duration: 180 },
  'Glacier Kayaking':  { time: '09:00', title: 'Grey Glacier kayak tour',             category: 'activity', icon: '🧊', duration: 240 },
  'Condor Spotting':   { time: '14:00', title: 'Condor viewpoint lookout',            category: 'activity', icon: '🦅', duration: 90  },
  'W-Trek Day Hike':   { time: '07:00', title: 'W-Trek segment — Valle del Francés',  category: 'activity', icon: '⛰', duration: 300 },
  'Mate & Empanadas':  { time: '12:30', title: 'Local lunch — mate & empanadas',      category: 'food',     icon: '🫖', duration: 60  },
  'Stargazing Pampa':  { time: '22:00', title: 'Pampa stargazing session',            category: 'activity', icon: '🌌', duration: 120 },
  'Refugio Dining':    { time: '19:00', title: 'Dinner at Refugio Chileno',           category: 'food',     icon: '🍽', duration: 90  },
  'Waterfall Plunge':  { time: '11:00', title: 'Hidden waterfall swim',               category: 'activity', icon: '💧', duration: 120 },
  // Arctic
  'Northern Lights':   { time: '22:30', title: 'Aurora borealis chase',               category: 'activity', icon: '🌌', duration: 150 },
  'Polar Bear Safari': { time: '08:00', title: 'Guided polar bear safari',            category: 'activity', icon: '🐻‍❄️', duration: 360 },
  'Ice Cave Explore':  { time: '10:00', title: 'Ice cave exploration tour',           category: 'activity', icon: '🧊', duration: 180 },
  'Dog Sledding':      { time: '09:00', title: 'Husky dog sledding experience',       category: 'activity', icon: '🛷', duration: 240 },
  'Midnight Sun':      { time: '23:00', title: 'Midnight sun coastal walk',           category: 'activity', icon: '☀️', duration: 90  },
  'Arctic Camping':    { time: '18:00', title: 'Wild arctic overnight camp',          category: 'activity', icon: '⛺', duration: 720 },
  'Snowmobile Ride':   { time: '10:30', title: 'Cross-country snowmobile tour',       category: 'activity', icon: '🏔', duration: 180 },
  'Fjord Boat Tour':   { time: '11:00', title: 'Scenic fjord boat tour',              category: 'activity', icon: '⛵', duration: 240 },
  // City Europe
  'Museum Hopping':    { time: '10:00', title: 'Morning museum circuit',              category: 'culture',  icon: '🏛', duration: 180 },
  'Café Culture':      { time: '09:00', title: 'Neighbourhood café breakfast crawl',  category: 'food',     icon: '☕', duration: 90  },
  'Street Food Tour':  { time: '18:30', title: 'Evening street food tour',            category: 'food',     icon: '🥐', duration: 120 },
  'Rooftop Views':     { time: '19:30', title: 'Rooftop terrace sundowner',           category: 'activity', icon: '🌆', duration: 90  },
  'Day Trip by Rail':  { time: '08:00', title: 'Rail day trip to nearby town',        category: 'activity', icon: '🚂', duration: 480 },
  'Wine Tasting':      { time: '16:00', title: 'Cellar wine tasting session',         category: 'food',     icon: '🍷', duration: 120 },
  'Hidden Courtyard':  { time: '14:00', title: 'Off-the-map courtyard & garden walk', category: 'activity', icon: '🏰', duration: 90  },
  // City Asia
  'Temple Dawn Visit': { time: '05:45', title: 'Dawn temple visit & meditation',      category: 'culture',  icon: '⛩', duration: 120 },
  'Night Market Binge':{ time: '19:00', title: 'Night market food marathon',          category: 'food',     icon: '🍜', duration: 150 },
  'Bullet Train Hop':  { time: '08:30', title: 'High-speed rail to next city',        category: 'activity', icon: '🚅', duration: 120 },
  'Matcha Ceremony':   { time: '14:00', title: 'Traditional matcha tea ceremony',     category: 'culture',  icon: '🍵', duration: 90  },
  'Karaoke Night':     { time: '21:00', title: 'Private room karaoke night',          category: 'activity', icon: '🎤', duration: 180 },
  'Hidden Alley Eats': { time: '12:00', title: 'Secret alley restaurant hunt',        category: 'food',     icon: '🥟', duration: 90  },
  'Onsen Soak':        { time: '20:00', title: 'Traditional onsen bath house',        category: 'activity', icon: '♨️', duration: 120 },
  // Beach
  'Sunrise Surf':      { time: '06:00', title: 'Sunrise surf lesson',                 category: 'activity', icon: '🏄', duration: 120 },
  'Snorkel Reef':      { time: '09:30', title: 'Guided reef snorkel tour',            category: 'activity', icon: '🐠', duration: 180 },
  'Beach Club Dine':   { time: '13:00', title: 'Beachfront seafood lunch',            category: 'food',     icon: '🍹', duration: 120 },
  'Cliff Jump':        { time: '11:00', title: 'Sea cliff jumping spot',              category: 'activity', icon: '🤿', duration: 90  },
  'Sunset Yoga':       { time: '17:30', title: 'Sunset beach yoga session',           category: 'activity', icon: '🧘', duration: 60  },
  'Kayak Lagoon':      { time: '08:00', title: 'Lagoon kayak exploration',            category: 'activity', icon: '🚣', duration: 120 },
  'Night Fishing':     { time: '20:00', title: 'Local boat night fishing trip',       category: 'activity', icon: '🎣', duration: 180 },
  'Hidden Beach Cove': { time: '10:00', title: 'Secret cove boat trip',               category: 'activity', icon: '🏖', duration: 150 },
  // Desert
  'Dune Sunrise':      { time: '05:00', title: 'Dune climb for desert sunrise',       category: 'activity', icon: '🌅', duration: 120 },
  'Camel Trek':        { time: '09:00', title: 'Camel caravan trek through dunes',    category: 'activity', icon: '🐪', duration: 240 },
  'Stargazing Desert': { time: '21:00', title: 'Dark-sky desert stargazing',          category: 'activity', icon: '🌌', duration: 150 },
  'Ancient Ruins':     { time: '08:00', title: 'Sunrise tour of ancient ruins',       category: 'culture',  icon: '🏺', duration: 180 },
  'Spice Market':      { time: '10:00', title: 'Morning spice souk walk',             category: 'food',     icon: '🌶', duration: 90  },
  'Bedouin Camp':      { time: '18:00', title: 'Overnight Bedouin camp stay',         category: 'activity', icon: '⛺', duration: 720 },
  'Oasis Swim':        { time: '14:00', title: 'Hidden oasis swimming hole',          category: 'activity', icon: '💧', duration: 90  },
  '4x4 Dune Bash':     { time: '16:00', title: '4x4 dune bashing at sunset',          category: 'activity', icon: '🚙', duration: 120 },
  // Mountain
  'Alpine Summit':     { time: '04:30', title: 'Pre-dawn alpine summit push',         category: 'activity', icon: '⛰', duration: 480 },
  'Via Ferrata':       { time: '08:00', title: 'Via ferrata climbing route',          category: 'activity', icon: '🧗', duration: 300 },
  'Glacier Trek':      { time: '07:00', title: 'Guided glacier walking tour',         category: 'activity', icon: '🧊', duration: 240 },
  'Mountain Hut Dine': { time: '19:00', title: 'Alpine hut multi-course dinner',      category: 'food',     icon: '🍽', duration: 120 },
  'Paraglide Valley':  { time: '11:00', title: 'Tandem paraglide over valley',        category: 'activity', icon: '🪂', duration: 90  },
  'Wildflower Walk':   { time: '09:00', title: 'Wildflower meadow trail',             category: 'activity', icon: '🌸', duration: 180 },
  'Summit Sunrise':    { time: '05:00', title: 'Hike to summit for sunrise',          category: 'activity', icon: '🌄', duration: 300 },
  'Cable Car Ride':    { time: '10:00', title: 'Scenic cable car to peak station',    category: 'activity', icon: '🚡', duration: 60  },
  // US Cities
  'Food Hall Crawl':   { time: '12:00', title: 'City food hall lunch crawl',          category: 'food',     icon: '🍔', duration: 120 },
  'Rooftop Brunch':    { time: '11:00', title: 'Rooftop brunch & skyline views',      category: 'food',     icon: '🥂', duration: 90  },
  'Thrift Store Haul': { time: '14:00', title: 'Vintage & thrift store hunting',      category: 'activity', icon: '🧥', duration: 120 },
  'Live Music Night':  { time: '20:00', title: 'Live music venue night',              category: 'activity', icon: '🎸', duration: 180 },
  'Street Art Walk':   { time: '10:00', title: 'Street art neighbourhood walk',       category: 'culture',  icon: '🎨', duration: 120 },
  'Speakeasy Bar':     { time: '21:30', title: 'Hidden speakeasy cocktail bar',       category: 'activity', icon: '🥃', duration: 150 },
  'Farmers Market':    { time: '09:00', title: 'Weekend farmers market visit',        category: 'activity', icon: '🥬', duration: 90  },
  'Skyline at Dusk':   { time: '19:00', title: 'Observation deck at dusk',            category: 'activity', icon: '🌆', duration: 60  },
  // Safari
  'Big Five Game Drive':{ time: '05:30', title: 'Big Five dawn game drive',           category: 'activity', icon: '🦁', duration: 240 },
  'Sunrise Bush Walk': { time: '06:00', title: 'Guided bush walk at sunrise',         category: 'activity', icon: '🌅', duration: 180 },
  'Gorilla Trekking':  { time: '07:00', title: 'Mountain gorilla trek permit',        category: 'activity', icon: '🦍', duration: 360 },
  'Hot Air Balloon':   { time: '05:00', title: 'Hot air balloon over savanna',        category: 'activity', icon: '🎈', duration: 180 },
  'Bush Camp Dinner':  { time: '19:30', title: 'Bush dinner under the stars',         category: 'food',     icon: '🍖', duration: 120 },
  'Sundowner Drinks':  { time: '17:30', title: 'Safari sundowner cocktails',          category: 'food',     icon: '🌇', duration: 90  },
  'Night Drive':       { time: '19:00', title: 'Nocturnal wildlife night drive',      category: 'activity', icon: '🔦', duration: 120 },
  'Maasai Village':    { time: '14:00', title: 'Maasai village cultural visit',       category: 'culture',  icon: '🏘', duration: 120 },
  // Generic fallbacks
  'Sunrise Hikes':     { time: '05:30', title: 'Sunrise summit hike',                 category: 'activity', icon: '🌄', duration: 180 },
  'Local Street Food': { time: '18:30', title: 'Street food evening tour',            category: 'food',     icon: '🍜', duration: 120 },
  'Hidden Waterfalls': { time: '11:00', title: 'Hidden waterfall trek',               category: 'activity', icon: '💧', duration: 180 },
  'Rooftop Bars':      { time: '20:00', title: 'Rooftop bar crawl',                   category: 'food',     icon: '🍹', duration: 180 },
  'Stargazing Spots':  { time: '21:30', title: 'Stargazing at viewpoint',             category: 'activity', icon: '🌌', duration: 120 },
  'Night Markets':     { time: '19:00', title: 'Night market exploration',            category: 'activity', icon: '🏮', duration: 150 },
  'Thermal Pools':     { time: '10:00', title: 'Geothermal pool soak',                category: 'activity', icon: '♨️', duration: 90  },
  'Scenic Viewpoints': { time: '09:00', title: 'Scenic viewpoint hike',               category: 'activity', icon: '🏔', duration: 120 },
  'Night Market':      { time: '19:00', title: 'Night market exploration',            category: 'activity', icon: '🏮', duration: 150 },
  'Rooftop Skyline':   { time: '19:30', title: 'Rooftop city skyline views',          category: 'activity', icon: '🌃', duration: 90  },
};

// ── Destination resolver ─────────────────────────────────────────────────────

/**
 * Map a free-text destination string to the best vibe profile.
 * Checks each profile's keyword list; picks the first match.
 * Falls back to 'default' if nothing matches.
 */
function resolveProfile(destination = '') {
  const normalized = destination.toLowerCase();
  for (const [profileKey, profile] of Object.entries(PROFILES)) {
    if (profileKey === 'default') continue;
    if (profile.keywords.some(kw => normalized.includes(kw))) {
      return profile;
    }
  }
  return PROFILES.default;
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetch trending vibes for a destination.
 * @param {string} destination - free-text destination (e.g. "Torres del Paine, Chile")
 * @returns {Promise<Array<{ tag, score, source, emoji }>>}
 */
export async function fetchVibes(destination = '') {
  await new Promise(r => setTimeout(r, 700)); // simulate scrape latency
  return resolveProfile(destination).vibes;
}

/**
 * Convert selected vibes into activity blocks for the Kanban.
 * @param {Array} vibes
 * @param {number} count
 * @returns {Array}
 */
export function vibesToActivities(vibes, count = 5) {
  return vibes
    .slice(0, count)
    .map((vibe, i) => {
      const template = VIBE_TO_ACTIVITY[vibe.tag];
      if (template) return { ...template, id: `vibe_${Date.now()}_${i}` };
      return {
        id: `vibe_${Date.now()}_${i}`,
        time: '10:00',
        title: vibe.tag,
        category: 'activity',
        icon: vibe.emoji,
        duration: 120,
      };
    });
}
