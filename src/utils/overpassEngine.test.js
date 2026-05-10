import { describe, it, expect, vi, beforeEach } from 'vitest';
import { overpassRadius, _cacheKey } from './overpassEngine';

beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

const mockOverpassResponse = (nodes) => ({
  ok: true,
  json: async () => ({ elements: nodes }),
});

const sampleNode = {
  id: 99,
  lat: 48.86,
  lon: 2.35,
  tags: { amenity: 'toilets', name: 'Public WC' },
};

describe('overpassRadius', () => {
  it('returns empty array for empty filters', async () => {
    const result = await overpassRadius(48.8566, 2.3522, []);
    expect(result).toEqual([]);
  });

  it('normalizes OSM node to POI shape', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(mockOverpassResponse([sampleNode])));

    const result = await overpassRadius(48.8566, 2.3522, ['amenity=toilets']);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'osm_99',
      name: 'Public WC',
      coords: { lat: 48.86, lng: 2.35 },
      category: 'toilets',
    });
    expect(result[0].osmTags).toMatchObject({ amenity: 'toilets' });
  });

  it('writes result to localStorage cache', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(mockOverpassResponse([sampleNode])));

    await overpassRadius(48.8566, 2.3522, ['amenity=toilets'], 'Paris');
    const key = _cacheKey('Paris', ['amenity=toilets']);
    const cached = JSON.parse(localStorage.getItem(key));
    expect(cached).toHaveProperty('results');
    expect(cached).toHaveProperty('cachedAt');
    expect(Array.isArray(cached.results)).toBe(true);
  });

  it('returns cached result without fetching when cache is fresh', async () => {
    vi.stubGlobal('fetch', vi.fn());
    const key = _cacheKey('Paris', ['amenity=toilets']);
    localStorage.setItem(key, JSON.stringify({ results: [{ id: 'cached_1', name: 'Cached', coords: { lat: 0, lng: 0 }, osmTags: {}, category: 'place', address: '' }], cachedAt: Date.now() }));

    await overpassRadius(48.8566, 2.3522, ['amenity=toilets'], 'Paris');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('re-fetches when cache is older than 24h', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(mockOverpassResponse([])));
    const key = _cacheKey('Paris', ['amenity=toilets']);
    const staleTime = Date.now() - (25 * 60 * 60 * 1000);
    localStorage.setItem(key, JSON.stringify({ results: [], cachedAt: staleTime }));

    await overpassRadius(48.8566, 2.3522, ['amenity=toilets'], 'Paris');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('returns empty array on timeout without throwing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new DOMException('timeout', 'AbortError')));
    const result = await overpassRadius(48.8566, 2.3522, ['amenity=hospital']);
    expect(result).toEqual([]);
  });

  it('uses node name fallback to category when name tag absent', async () => {
    const unnamed = { id: 7, lat: 1.0, lon: 1.0, tags: { amenity: 'drinking_water' } };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(mockOverpassResponse([unnamed])));
    const result = await overpassRadius(1.0, 1.0, ['amenity=drinking_water']);
    expect(result[0].name).toBe('drinking_water');
  });
});

describe('_cacheKey', () => {
  it('sorts filters for stable key', () => {
    expect(_cacheKey('Paris', ['b=2', 'a=1'])).toBe(_cacheKey('Paris', ['a=1', 'b=2']));
  });
});
