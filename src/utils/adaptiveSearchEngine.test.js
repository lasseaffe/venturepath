import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock all engines before importing orchestrator
vi.mock('./photonEngine', () => ({
  photonAutocomplete: vi.fn().mockResolvedValue([]),
}));
vi.mock('./overpassEngine', () => ({
  overpassRadius: vi.fn().mockResolvedValue([]),
}));
vi.mock('./searchRanker', () => ({
  rankResults: vi.fn((pois) => pois.map(p => ({ ...p, _score: 0.5 }))),
}));
vi.mock('./geocodeEngine', () => ({
  geocodeLocation: vi.fn().mockResolvedValue({ lat: 48.8566, lng: 2.3522 }),
}));
vi.mock('./otmEngine', () => ({
  otmRadius: vi.fn().mockResolvedValue([]),
}));

import { getInspireResults, getAutocompleteResults, tripTypeFromClimate } from './adaptiveSearchEngine';
import { overpassRadius } from './overpassEngine';
import { photonAutocomplete } from './photonEngine';
import { rankResults } from './searchRanker';

const mockStrategy = {
  inspireQuery: { filters: ['amenity=cafe'] },
  filterMask: ['amenity=cafe'],
  resultActions: ['Save POI'],
};

const mockContext = { currentLegCoords: null, tripType: 'leisure', userRole: 'MEMBER' };

beforeEach(() => { vi.clearAllMocks(); });

describe('getInspireResults', () => {
  it('calls overpassRadius with strategy filters', async () => {
    await getInspireResults(mockStrategy, 'Paris', mockContext);
    expect(overpassRadius).toHaveBeenCalledWith(
      48.8566, 2.3522,
      ['amenity=cafe'],
      'Paris',
      5000,
    );
  });

  it('passes results through rankResults', async () => {
    overpassRadius.mockResolvedValueOnce([{ id: 'p1', name: 'A', coords: { lat: 0, lng: 0 }, osmTags: {}, category: 'cafe', address: '' }]);
    await getInspireResults(mockStrategy, 'Paris', mockContext);
    expect(rankResults).toHaveBeenCalled();
  });

  it('returns max 8 results', async () => {
    const many = Array.from({ length: 20 }, (_, i) => ({
      id: `p${i}`, name: `POI ${i}`, coords: { lat: 0, lng: 0 }, osmTags: {}, category: 'cafe', address: '', _score: 0.5,
    }));
    overpassRadius.mockResolvedValueOnce(many);
    rankResults.mockImplementationOnce(pois => pois);
    const result = await getInspireResults(mockStrategy, 'Paris', mockContext);
    expect(result.length).toBeLessThanOrEqual(8);
  });
});

describe('getAutocompleteResults', () => {
  it('calls photonAutocomplete with query and filterMask', async () => {
    await getAutocompleteResults('cafe', mockStrategy, mockContext);
    expect(photonAutocomplete).toHaveBeenCalledWith('cafe', ['amenity=cafe']);
  });

  it('returns max 10 results', async () => {
    const many = Array.from({ length: 15 }, (_, i) => ({
      id: `p${i}`, name: `POI ${i}`, coords: { lat: 0, lng: 0 }, osmTags: {}, category: 'cafe', address: '', _score: 0.5,
    }));
    photonAutocomplete.mockResolvedValueOnce(many);
    rankResults.mockImplementationOnce(pois => pois);
    const result = await getAutocompleteResults('cafe', mockStrategy, mockContext);
    expect(result.length).toBeLessThanOrEqual(10);
  });
});

describe('tripTypeFromClimate', () => {
  it('maps alpine → alpine', () => expect(tripTypeFromClimate('alpine')).toBe('alpine'));
  it('maps temperate → leisure', () => expect(tripTypeFromClimate('temperate')).toBe('leisure'));
  it('maps tropical → leisure', () => expect(tripTypeFromClimate('tropical')).toBe('leisure'));
  it('maps arid → tactical', () => expect(tripTypeFromClimate('arid')).toBe('tactical'));
  it('maps unknown → city', () => expect(tripTypeFromClimate('tundra')).toBe('city'));
});
