// Vibe Check Engine — mock social trend scraper per destination

const DESTINATION_VIBES = {
  default: [
    { tag: 'Sunrise Hikes',    score: 94, source: 'Instagram', emoji: '🌄' },
    { tag: 'Local Street Food',score: 88, source: 'TikTok',    emoji: '🍜' },
    { tag: 'Hidden Waterfalls',score: 83, source: 'Reddit',    emoji: '💧' },
    { tag: 'Rooftop Bars',     score: 76, source: 'TikTok',    emoji: '🍹' },
    { tag: 'Stargazing Spots', score: 71, source: 'Instagram', emoji: '🌌' },
    { tag: 'Night Markets',    score: 65, source: 'TikTok',    emoji: '🏮' },
    { tag: 'Thermal Pools',    score: 60, source: 'Instagram', emoji: '♨️' },
    { tag: 'Scenic Viewpoints',score: 55, source: 'Google',    emoji: '🏔' },
  ],
  patagonia: [
    { tag: 'Torres Sunrise',   score: 98, source: 'Instagram', emoji: '🌄' },
    { tag: 'Glacier Kayaking', score: 91, source: 'TikTok',    emoji: '🧊' },
    { tag: 'Condor Spotting',  score: 84, source: 'Reddit',    emoji: '🦅' },
    { tag: 'W-Trek Day Hike',  score: 79, source: 'Instagram', emoji: '⛰' },
    { tag: 'Mate & Empanadas', score: 72, source: 'TikTok',    emoji: '🫖' },
    { tag: 'Stargazing Pampa', score: 68, source: 'Instagram', emoji: '🌌' },
    { tag: 'Refugio Dining',   score: 61, source: 'Google',    emoji: '🍽' },
    { tag: 'Waterfall Plunge', score: 55, source: 'TikTok',    emoji: '💧' },
  ],
  svalbard: [
    { tag: 'Northern Lights',  score: 97, source: 'Instagram', emoji: '🌌' },
    { tag: 'Polar Bear Safari',score: 93, source: 'TikTok',    emoji: '🐻‍❄️' },
    { tag: 'Ice Cave Explore', score: 87, source: 'Instagram', emoji: '🧊' },
    { tag: 'Dog Sledding',     score: 81, source: 'TikTok',    emoji: '🛷' },
    { tag: 'Midnight Sun',     score: 76, source: 'Instagram', emoji: '☀️' },
    { tag: 'Arctic Camping',   score: 69, source: 'Reddit',    emoji: '⛺' },
    { tag: 'Snowmobile Ride',  score: 63, source: 'TikTok',    emoji: '🏔' },
    { tag: 'Fjord Boat Tour',  score: 58, source: 'Google',    emoji: '⛵' },
  ],
};

/**
 * Fetch trending vibes for a destination.
 * @param {string} destinationId
 * @returns {Promise<Array<{ tag, score, source, emoji }>>}
 */
export async function fetchVibes(destinationId = 'default') {
  await new Promise(r => setTimeout(r, 700)); // simulate scrape latency
  const key = destinationId.toLowerCase().replace(/[^a-z]/g, '');
  return DESTINATION_VIBES[key] ?? DESTINATION_VIBES.default;
}

// Maps vibe tags to activity blocks
const VIBE_TO_ACTIVITY = {
  'Torres Sunrise':   { time: '05:30', title: 'Sunrise hike to Mirador Las Torres', category: 'activity', icon: '🌄', duration: 180 },
  'Glacier Kayaking': { time: '09:00', title: 'Grey Glacier kayak tour',             category: 'activity', icon: '🧊', duration: 240 },
  'Condor Spotting':  { time: '14:00', title: 'Condor viewpoint lookout',            category: 'activity', icon: '🦅', duration: 90  },
  'W-Trek Day Hike':  { time: '07:00', title: 'W-Trek segment — Valle del Francés', category: 'activity', icon: '⛰', duration: 300 },
  'Mate & Empanadas': { time: '12:30', title: 'Local lunch — mate & empanadas',      category: 'food',     icon: '🫖', duration: 60  },
  'Stargazing Pampa': { time: '22:00', title: 'Pampa stargazing session',            category: 'activity', icon: '🌌', duration: 120 },
  'Refugio Dining':   { time: '19:00', title: 'Dinner at Refugio Chileno',           category: 'food',     icon: '🍽', duration: 90  },
  'Waterfall Plunge': { time: '11:00', title: 'Hidden waterfall swim',               category: 'activity', icon: '💧', duration: 120 },
  'Northern Lights':  { time: '22:30', title: 'Aurora borealis chase',               category: 'activity', icon: '🌌', duration: 150 },
  'Polar Bear Safari':{ time: '08:00', title: 'Guided polar bear safari',            category: 'activity', icon: '🐻‍❄️', duration: 360 },
  'Ice Cave Explore': { time: '10:00', title: 'Ice cave exploration tour',           category: 'activity', icon: '🧊', duration: 180 },
  'Dog Sledding':     { time: '09:00', title: 'Husky dog sledding experience',       category: 'activity', icon: '🛷', duration: 240 },
  'Sunrise Hikes':    { time: '05:30', title: 'Sunrise summit hike',                 category: 'activity', icon: '🌄', duration: 180 },
  'Local Street Food':{ time: '18:30', title: 'Street food evening tour',            category: 'food',     icon: '🍜', duration: 120 },
  'Hidden Waterfalls':{ time: '11:00', title: 'Hidden waterfall trek',               category: 'activity', icon: '💧', duration: 180 },
  'Rooftop Bars':     { time: '20:00', title: 'Rooftop bar crawl',                   category: 'food',     icon: '🍹', duration: 180 },
  'Stargazing Spots': { time: '21:30', title: 'Stargazing at viewpoint',             category: 'activity', icon: '🌌', duration: 120 },
  'Night Markets':    { time: '19:00', title: 'Night market exploration',            category: 'activity', icon: '🏮', duration: 150 },
};

/**
 * Convert top vibes into activity blocks for the Kanban.
 * @param {Array} vibes
 * @param {number} count - how many to generate
 * @returns {Array<ActivityBlock>}
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
