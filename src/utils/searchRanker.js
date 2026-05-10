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

function tagMatches(osmTags, boostList) {
  return boostList.some(rule => {
    if (rule._wildcard) return osmTags[rule._wildcard] !== undefined;
    const [key, val] = Object.entries(rule)[0];
    return osmTags[key] === val;
  });
}

function rDist(poi, currentLegCoords, maxDistKm) {
  if (!currentLegCoords) return 0.5;
  if (maxDistKm === 0) return 1.0;
  const d = haversineKm(poi.coords, currentLegCoords);
  return Math.max(0, 1 - d / maxDistKm);
}

export function rankResults(pois, context = {}) {
  if (!pois.length) return [];
  const { currentLegCoords = null, tripType = '', userRole = 'MEMBER' } = context;

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
      return { ...poi, _score: dist + vibe + role };
    })
    .sort((a, b) => b._score - a._score);
}
