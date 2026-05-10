import { describe, it, expect } from 'vitest';
import { rankResults } from './searchRanker';

const makePoi = (overrides) => ({
  id: 'osm_1',
  name: 'Test POI',
  address: '',
  coords: { lat: 48.8566, lng: 2.3522 },
  osmTags: {},
  category: 'place',
  ...overrides,
});

describe('rankResults', () => {
  it('returns empty array for empty input', () => {
    expect(rankResults([], {})).toEqual([]);
  });

  it('attaches _score to each POI', () => {
    const pois = [makePoi()];
    const result = rankResults(pois, {});
    expect(result[0]).toHaveProperty('_score');
    expect(typeof result[0]._score).toBe('number');
  });

  it('does not mutate original array', () => {
    const pois = [makePoi()];
    rankResults(pois, {});
    expect(pois[0]._score).toBeUndefined();
  });

  it('ranks closer POI higher when both have same vibe/role', () => {
    const near = makePoi({ id: 'osm_near', coords: { lat: 48.857, lng: 2.353 } });
    const far  = makePoi({ id: 'osm_far',  coords: { lat: 51.5074, lng: -0.1278 } });
    const context = { currentLegCoords: { lat: 48.8566, lng: 2.3522 }, tripType: 'city', userRole: 'MEMBER' };
    const result = rankResults([far, near], context);
    expect(result[0].id).toBe('osm_near');
  });

  it('boosts cafe for leisure tripType', () => {
    const cafe  = makePoi({ id: 'cafe',  osmTags: { amenity: 'cafe' } });
    const other = makePoi({ id: 'other', osmTags: { amenity: 'fuel' } });
    const context = { currentLegCoords: null, tripType: 'leisure', userRole: 'MEMBER' };
    const result = rankResults([other, cafe], context);
    expect(result[0].id).toBe('cafe');
  });

  it('boosts pharmacy for MEDIC role', () => {
    const pharmacy = makePoi({ id: 'pharm', osmTags: { amenity: 'pharmacy' } });
    const cafe     = makePoi({ id: 'cafe',  osmTags: { amenity: 'cafe' } });
    const context = { currentLegCoords: null, tripType: 'city', userRole: 'MEDIC' };
    const result = rankResults([cafe, pharmacy], context);
    expect(result[0].id).toBe('pharm');
  });

  it('uses neutral R_dist (0.5) when currentLegCoords is null', () => {
    const poi = makePoi();
    const result = rankResults([poi], { currentLegCoords: null, tripType: 'city', userRole: 'MEMBER' });
    // With neutral dist (0.5 × 0.3 = 0.15) and no vibe/role match → score = 0.15
    expect(result[0]._score).toBeCloseTo(0.15, 2);
  });

  it('shop wildcard matches any shop= tag for city tripType', () => {
    const shop = makePoi({ id: 'shop', osmTags: { shop: 'bakery' } });
    const context = { currentLegCoords: null, tripType: 'city', userRole: 'MEMBER' };
    const result = rankResults([shop], context);
    // city vibe match (0.4) + neutral dist (0.15) = 0.55
    expect(result[0]._score).toBeCloseTo(0.55, 2);
  });
});
