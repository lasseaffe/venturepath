// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchElevations, CACHE_KEY_PREFIX } from './elevationService';

beforeEach(() => sessionStorage.clear());

describe('fetchElevations', () => {
  it('returns elevations for each coord', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: [{ elevation: 120 }, { elevation: 250 }] }),
    });
    const result = await fetchElevations([{ lat: 38.7, lng: -9.1 }, { lat: 38.8, lng: -9.2 }]);
    expect(result).toEqual([120, 250]);
  });

  it('uses sessionStorage cache on second call', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: [{ elevation: 100 }] }),
    });
    const coords = [{ lat: 1.0, lng: 2.0 }];
    await fetchElevations(coords);
    await fetchElevations(coords);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('splits requests into batches of 512', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: Array(512).fill({ elevation: 0 }) }),
    });
    const coords = Array(600).fill({ lat: 0, lng: 0 });
    await fetchElevations(coords);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
