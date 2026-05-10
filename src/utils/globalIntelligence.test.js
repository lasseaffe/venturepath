import { describe, it, expect, vi, beforeEach } from 'vitest';
import { globalSearch } from './globalIntelligence';

beforeEach(() => vi.restoreAllMocks());

vi.mock('./overpassEngine', () => ({
  overpassRadius: vi.fn().mockResolvedValue([
    { id: 'osm_1', name: 'Pharmacy', coords: { lat: 48.86, lng: 2.35 }, osmTags: { amenity: 'pharmacy' }, category: 'pharmacy' },
  ]),
}));

vi.mock('./otmEngine', () => ({
  otmRadius: vi.fn().mockResolvedValue([
    { id: 'otm_a', name: 'Museum', coords: { lat: 48.87, lng: 2.36 }, osmTags: {}, type: 'museum', rating: 3 },
  ]),
}));

vi.mock('./waymarkedEngine', () => ({
  waymarkedRoutes: vi.fn().mockResolvedValue([
    { id: '101', name: 'Alpine Trail', type: 'hiking', distance_km: 12, ascent_m: 800, geometry: [], difficulty: 'demanding' },
  ]),
}));

describe('globalSearch', () => {
  it('returns pois array from merged sources', async () => {
    const result = await globalSearch({
      query: 'water',
      coords: { lat: 48.86, lng: 2.35 },
      section: 'tactical',
      missionType: 'alpine',
      userRole: 'MEDIC',
    });
    expect(result.pois.length).toBeGreaterThan(0);
    expect(result.routes).toEqual([]);
  });

  it('returns routes when includeRoutes is true', async () => {
    const result = await globalSearch({
      query: 'hiking',
      coords: { lat: 48.86, lng: 2.35 },
      section: 'discovery',
      missionType: 'alpine',
      userRole: 'LEADER',
      includeRoutes: true,
    });
    expect(result.routes).toHaveLength(1);
    expect(result.routes[0].name).toBe('Alpine Trail');
  });

  it('deduplicates POIs within 50m of each other — OTM wins', async () => {
    const { overpassRadius } = await import('./overpassEngine');
    const { otmRadius } = await import('./otmEngine');

    overpassRadius.mockResolvedValueOnce([
      { id: 'osm_dup', name: 'OSM Museum', coords: { lat: 48.8700, lng: 2.3600 }, osmTags: { tourism: 'museum' }, category: 'museum' },
    ]);
    otmRadius.mockResolvedValueOnce([
      { id: 'otm_dup', name: 'OTM Museum', coords: { lat: 48.8701, lng: 2.3601 }, osmTags: {}, type: 'museum', rating: 4 },
    ]);

    const result = await globalSearch({
      query: 'museum', coords: { lat: 48.87, lng: 2.36 }, section: 'discovery',
    });
    const museums = result.pois.filter(p => p.name.includes('Museum'));
    expect(museums).toHaveLength(1);
    expect(museums[0].id).toBe('otm_dup');
  });

  it('returns pois even when one source fails', async () => {
    const { overpassRadius } = await import('./overpassEngine');
    overpassRadius.mockRejectedValueOnce(new Error('Overpass down'));

    const result = await globalSearch({
      query: 'museum', coords: { lat: 48.86, lng: 2.35 }, section: 'discovery',
    });
    expect(result.pois.length).toBeGreaterThan(0);
  });
});
