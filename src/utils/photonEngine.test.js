import { describe, it, expect, vi, beforeEach } from 'vitest';
import { photonAutocomplete } from './photonEngine';

beforeEach(() => { vi.restoreAllMocks(); });

describe('photonAutocomplete', () => {
  it('returns empty array for empty query', async () => {
    const result = await photonAutocomplete('', []);
    expect(result).toEqual([]);
  });

  it('normalizes Photon response to POI shape', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        features: [{
          properties: {
            osm_id: 123,
            name: 'Test Cafe',
            street: 'Main St',
            housenumber: '1',
            osm_key: 'amenity',
            osm_value: 'cafe',
          },
          geometry: { coordinates: [2.3522, 48.8566] },
        }],
      }),
    }));

    const result = await photonAutocomplete('cafe', ['amenity=cafe']);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'osm_123',
      name: 'Test Cafe',
      coords: { lat: 48.8566, lng: 2.3522 },
      category: 'cafe',
    });
    expect(result[0].osmTags).toBeDefined();
  });

  it('falls back to Nominatim when Photon returns empty features', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ features: [] }) })  // Photon
      .mockResolvedValueOnce({                                                      // Nominatim
        ok: true,
        json: async () => ([{
          place_id: 999,
          display_name: 'Berlin, Germany',
          lat: '52.52',
          lon: '13.405',
          type: 'city',
          address: {},
        }]),
      })
    );

    const result = await photonAutocomplete('Berlin', []);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('osm_999');
    expect(result[0].name).toBe('Berlin');
  });

  it('falls back to Nominatim when Photon fetch throws', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({ ok: true, json: async () => ([]) })
    );
    const result = await photonAutocomplete('Paris', []);
    expect(Array.isArray(result)).toBe(true);
  });

  it('deduplicates results by id', async () => {
    // Two filterMask entries returning same POI
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        features: [{
          properties: { osm_id: 42, name: 'Pharmacy', osm_key: 'amenity', osm_value: 'pharmacy' },
          geometry: { coordinates: [2.0, 48.0] },
        }],
      }),
    }));

    const result = await photonAutocomplete('pharm', ['amenity=pharmacy', 'amenity=hospital']);
    const ids = result.map(r => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
