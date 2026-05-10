import { haversineKm } from './routeEngine';

const VIBE_BOOSTS = {
  alpine:   [{ shop: 'outdoor' }, { sport: 'climbing' }, { natural: 'peak' }],
  leisure:  [{ amenity: 'cafe' }, { tourism: 'attraction' }, { leisure: 'park' }],
  tactical: [{ shop: 'hardware' }, { amenity: 'hospital' }, { amenity: 'drinking_water' }],
  city:     [{ amenity: 'restaurant' }, { tourism: 'museum' }, { _wildcard: 'shop' }],
};

const ROLE_BOOSTS = {
  MEDIC:        [{ amenity: 'pharmacy' }, { amenity: 'hospital' }],
  NAVIGATOR:    [{ amenity: 'fuel' }, { highway: 'motorway_junction' }],
  QUARTERMASTER:[{ shop: 'supermarket' }, { shop: 'outdoor' }],
  LEADER:       [{ tourism: 'viewpoint' }, { tourism: 'attraction' }],
};

const SECTION_BOOSTS = {
  tactical:  [
    { tags: { amenity: 'pharmacy' },       bonus: 0.5 },
    { tags: { amenity: 'drinking_water' }, bonus: 0.4 },
    { tags: { amenity: 'shelter' },        bonus: 0.3 },
  ],
  logistics: [
    { tags: { shop: 'outdoor' },      bonus: 0.4 },
    { tags: { shop: 'supermarket' },  bonus: 0.3 },
    { tags: { shop: 'hardware' },     bonus: 0.3 },
  ],
  discovery: [
    { tags: { tourism: 'attraction' },       bonus: 0.5 },
    { tags: { tourism: 'viewpoint' },        bonus: 0.4 },
    { tags: { leisure: 'nature_reserve' },   bonus: 0.3 },
  ],
  planner: [],
};

function tagMatches(osmTags, boostList) {
  return boostList.some(rule => {
    if (rule._wildcard) return osmTags[rule._wildcard] !== undefined;
    const [key, val] = Object.entries(rule)[0];
    return osmTags[key] === val;
  });
}

function sectionBonus(osmTags, section) {
  const boosts = SECTION_BOOSTS[section] ?? [];
  for (const { tags, bonus } of boosts) {
    const [key, val] = Object.entries(tags)[0];
    if (osmTags[key] === val) return bonus;
  }
  return 0;
}

function rDist(poi, currentLegCoords, maxDistKm) {
  if (!currentLegCoords) return 0.5;
  if (maxDistKm === 0) return 1.0;
  const d = haversineKm(poi.coords, currentLegCoords);
  return Math.max(0, 1 - d / maxDistKm);
}

export function rankResults(pois, context = {}) {
  if (!pois.length) return [];
  const {
    currentLegCoords = null,
    tripType = '',
    userRole = 'MEMBER',
    section = 'planner',
  } = context;

  const vibeList = VIBE_BOOSTS[tripType] ?? [];
  const roleList = ROLE_BOOSTS[userRole] ?? [];

  let maxDistKm = 0;
  if (currentLegCoords) {
    for (const poi of pois) {
      const d = haversineKm(poi.coords, currentLegCoords);
      if (d > maxDistKm) maxDistKm = d;
    }
  }

  return [...pois]
    .map(poi => {
      const tags = poi.osmTags ?? {};
      const dist  = rDist(poi, currentLegCoords, maxDistKm) * 0.3;
      const vibe  = (vibeList.length && tagMatches(tags, vibeList) ? 1.0 : 0.0) * 0.4;
      const role  = (roleList.length && tagMatches(tags, roleList) ? 1.0 : 0.0) * 0.3;
      const sec   = sectionBonus(tags, section);
      return { ...poi, _score: dist + vibe + role + sec };
    })
    .sort((a, b) => b._score - a._score);
}
