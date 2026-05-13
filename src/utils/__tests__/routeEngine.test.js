import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchRouteVariant } from '../routeEngine';

describe('fetchRouteVariant', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({
        routes: [{ summary: { duration: 5400, distance: 145000 }, geometry: 'enc' }],
      }),
    })));
    vi.stubEnv('VITE_ORS_API_KEY', 'test-key');
  });
  afterEach(() => vi.unstubAllGlobals());

  it('sends avoid_features: ["tollways"] for toll-free variant', async () => {
    await fetchRouteVariant({ lat: 48.1, lng: 11.6 }, { lat: 47.8, lng: 13.0 }, 'toll-free');
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.options).toEqual({ avoid_features: ['tollways'] });
  });

  it('omits avoid_features for fastest variant', async () => {
    await fetchRouteVariant({ lat: 48.1, lng: 11.6 }, { lat: 47.8, lng: 13.0 }, 'fastest');
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.options).toBeUndefined();
  });

  it('returns { variant, durationH, distanceKm } shape', async () => {
    const r = await fetchRouteVariant({ lat: 48.1, lng: 11.6 }, { lat: 47.8, lng: 13.0 }, 'fastest');
    expect(r).toEqual({ variant: 'fastest', durationH: 1.5, distanceKm: 145, geometry: 'enc' });
  });
});
