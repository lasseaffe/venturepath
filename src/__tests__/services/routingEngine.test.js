import { describe, it, expect, vi, beforeEach } from 'vitest';
import { routeBetween, _resetCache } from '../../services/routingEngine.js';

const brouterGeoJson = {
  type: 'FeatureCollection',
  features: [{
    geometry: {
      type: 'LineString',
      coordinates: [[5.0, 52.0, 10], [5.05, 52.05, 12], [5.1, 52.1, 14]],
    },
  }],
};

describe('routingEngine', () => {
  beforeEach(() => {
    _resetCache();
    globalThis.fetch = vi.fn();
  });

  it('routes foot profile via BRouter and returns points + segment', async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => brouterGeoJson,
    });
    const res = await routeBetween({
      from: { lat: 52.0, lng: 5.0 },
      to:   { lat: 52.1, lng: 5.1 },
      profile: 'foot',
    });
    expect(res.engine).toBe('brouter');
    expect(res.points).toHaveLength(3);
    expect(res.points[0]).toMatchObject({ lat: 52.0, lng: 5.0, ele: 10 });
    expect(res.segment.profile).toBe('foot');
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('caches identical requests', async () => {
    globalThis.fetch.mockResolvedValueOnce({ ok: true, json: async () => brouterGeoJson });
    const args = { from: { lat: 1, lng: 1 }, to: { lat: 2, lng: 2 }, profile: 'foot' };
    await routeBetween(args);
    await routeBetween(args);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('falls back to manual straight line when fetch fails', async () => {
    globalThis.fetch.mockRejectedValueOnce(new Error('network'));
    const res = await routeBetween({
      from: { lat: 0, lng: 0 },
      to:   { lat: 0, lng: 1 },
      profile: 'foot',
    });
    expect(res.engine).toBe('manual');
    expect(res.points).toHaveLength(2);
    expect(res.points[0]).toMatchObject({ lat: 0, lng: 0 });
  });
});
