import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchFuelAndRest } from '../adapters/overpass';

describe('overpass adapter', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({
        elements: [
          { type: 'node', id: 1, lat: 48.1, lon: 11.6, tags: { amenity: 'fuel', name: 'Shell A8', brand: 'Shell' } },
          { type: 'node', id: 2, lat: 48.2, lon: 11.7, tags: { highway: 'services', name: 'Rastplatz Nord' } },
          { type: 'node', id: 3, lat: 48.3, lon: 11.8, tags: { amenity: 'charging_station', name: 'Ionity Holz' } },
        ],
      }),
    })));
  });
  afterEach(() => vi.unstubAllGlobals());

  it('returns separated fuel, charge, and rest arrays', async () => {
    const r = await fetchFuelAndRest([[48.0, 11.5], [48.5, 12.0]]);
    expect(r.fuel).toHaveLength(1);
    expect(r.fuel[0].name).toBe('Shell A8');
    expect(r.fuel[0].subtype).toBe('shell');
    expect(r.charge).toHaveLength(1);
    expect(r.charge[0].name).toBe('Ionity Holz');
    expect(r.rest).toHaveLength(1);
    expect(r.rest[0].name).toBe('Rastplatz Nord');
  });

  it('returns empty buckets when polyline is missing or fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false })));
    const r = await fetchFuelAndRest([[48.0, 11.5], [48.5, 12.0]]);
    expect(r).toEqual({ fuel: [], charge: [], rest: [] });
  });
});
