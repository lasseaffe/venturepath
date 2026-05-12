import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchElevationProfile } from '../adapters/openElevation.js';

describe('fetchElevationProfile', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('returns empty profile for polyline with fewer than 2 points', async () => {
    const result = await fetchElevationProfile([[48.0, 11.0]]);
    expect(result).toEqual({ points: [], gainM: 0, lossM: 0, maxElevM: 0, minElevM: 0 });
  });

  it('calls open-elevation API and parses results', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          { latitude: 48.0, longitude: 11.0, elevation: 500 },
          { latitude: 48.1, longitude: 11.1, elevation: 600 },
          { latitude: 48.2, longitude: 11.2, elevation: 550 },
        ]
      })
    }));
    const result = await fetchElevationProfile([[48.0, 11.0], [48.1, 11.1], [48.2, 11.2]]);
    expect(result.points).toHaveLength(3);
    expect(result.gainM).toBe(100);
    expect(result.lossM).toBe(50);
    expect(result.maxElevM).toBe(600);
    expect(result.minElevM).toBe(500);
  });

  it('returns empty profile on fetch failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('net')));
    const result = await fetchElevationProfile([[48.0, 11.0], [48.1, 11.1]]);
    expect(result).toEqual({ points: [], gainM: 0, lossM: 0, maxElevM: 0, minElevM: 0 });
  });

  it('samples at most 100 points to stay under API limit', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: Array.from({ length: 100 }, (_, i) => ({ latitude: i, longitude: i, elevation: i * 10 })) })
    }));
    const longPolyline = Array.from({ length: 300 }, (_, i) => [i * 0.01, i * 0.01]);
    await fetchElevationProfile(longPolyline);
    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1].body);
    expect(body.locations.length).toBeLessThanOrEqual(100);
  });
});
