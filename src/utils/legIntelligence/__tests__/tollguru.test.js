import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchTolls } from '../adapters/tollguru';

describe('tollguru adapter', () => {
  beforeEach(() => vi.stubEnv('VITE_TOLLGURU_KEY', 'test-key'));
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

  it('returns empty result when key missing', async () => {
    vi.stubEnv('VITE_TOLLGURU_KEY', '');
    const r = await fetchTolls({ lat: 48.1, lng: 11.6 }, { lat: 47.8, lng: 13.0 });
    expect(r).toEqual({ totalEst: 0, currency: 'EUR', byCountry: [], gantries: [], available: false });
  });

  it('parses gantry list into waypoint-ready records', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({
        route: {
          tolls: [
            { name: 'A8 Gantry', tagCost: 11.5, currency: 'EUR', country: 'AT',
              lat: 48.15, lng: 11.65, distance: 8000 },
          ],
          summary: { hasTolls: true },
        },
      }),
    })));
    const r = await fetchTolls({ lat: 48.1, lng: 11.6 }, { lat: 47.8, lng: 13.0 });
    expect(r.available).toBe(true);
    expect(r.totalEst).toBe(11.5);
    expect(r.currency).toBe('EUR');
    expect(r.gantries).toHaveLength(1);
    expect(r.gantries[0]).toMatchObject({
      name: 'A8 Gantry', coords: [48.15, 11.65], kmFromStart: 8, estCost: 11.5, country: 'AT',
    });
  });
});
