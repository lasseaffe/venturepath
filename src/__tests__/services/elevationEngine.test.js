import { describe, it, expect, vi, beforeEach } from 'vitest';
import { hydrateElevations, _resetEleCache } from '../../services/elevationEngine.js';

beforeEach(() => {
  _resetEleCache();
  globalThis.fetch = vi.fn();
});

describe('elevationEngine', () => {
  it('hydrates missing elevations from Open-Elevation', async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [{ elevation: 100 }, { elevation: 200 }] }),
    });
    const points = [
      { lat: 50, lng: 10, ele: null },
      { lat: 51, lng: 11, ele: null },
    ];
    const result = await hydrateElevations(points);
    expect(result).toEqual([100, 200]);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('returns existing elevations and only queries missing', async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [{ elevation: 300 }] }),
    });
    const points = [
      { lat: 50, lng: 10, ele: 99 },
      { lat: 51, lng: 11, ele: null },
    ];
    const result = await hydrateElevations(points);
    expect(result).toEqual([99, 300]);
  });

  it('returns nulls when fetch fails (does not throw)', async () => {
    globalThis.fetch.mockRejectedValueOnce(new Error('down'));
    const result = await hydrateElevations([{ lat: 0, lng: 0, ele: null }]);
    expect(result).toEqual([null]);
  });
});
