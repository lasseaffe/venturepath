import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchWaterAndResupply } from '../adapters/overpassTrail.js';

describe('fetchWaterAndResupply', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('returns empty buckets for polyline with fewer than 2 points', async () => {
    const result = await fetchWaterAndResupply([[48.0, 11.0]]);
    expect(result).toEqual({ water: [], resupply: [] });
  });

  it('classifies drinking_water nodes as water', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        elements: [{ id: 1, lat: 48.0, lon: 11.0, tags: { amenity: 'drinking_water' } }]
      })
    }));
    const result = await fetchWaterAndResupply([[48.0, 11.0], [48.1, 11.1]]);
    expect(result.water).toHaveLength(1);
    expect(result.water[0].coords).toEqual([48.0, 11.0]);
  });

  it('classifies supermarket nodes as resupply', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        elements: [{ id: 2, lat: 48.1, lon: 11.1, tags: { shop: 'supermarket', name: 'SPAR' } }]
      })
    }));
    const result = await fetchWaterAndResupply([[48.0, 11.0], [48.1, 11.1]]);
    expect(result.resupply).toHaveLength(1);
    expect(result.resupply[0].name).toBe('SPAR');
  });

  it('returns empty buckets on fetch failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('net')));
    const result = await fetchWaterAndResupply([[48.0, 11.0], [48.1, 11.1]]);
    expect(result).toEqual({ water: [], resupply: [] });
  });
});
