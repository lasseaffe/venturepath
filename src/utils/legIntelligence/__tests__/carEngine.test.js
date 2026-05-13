import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { hydrateCarLeg } from '../engines/carEngine';

vi.mock('../adapters/tollguru', () => ({
  fetchTolls: vi.fn(async () => ({
    totalEst: 11.5, currency: 'EUR',
    byCountry: [{ cc: 'AT', amount: 11.5, currency: 'EUR' }],
    gantries: [{ name: 'A8 Gantry', coords: [48.15, 11.65], kmFromStart: 8, estCost: 11.5, country: 'AT', currency: 'EUR' }],
    available: true,
  })),
}));
vi.mock('../adapters/overpass', () => ({
  fetchFuelAndRest: vi.fn(async () => ({
    fuel: [{ name: 'Shell A8', coords: [48.13, 11.62], subtype: 'shell' }],
    charge: [],
    rest: [{ name: 'Rastplatz Nord', coords: [48.18, 11.66] }],
  })),
}));
vi.mock('../../routeEngine', () => ({
  fetchRouteVariant: vi.fn(async (_f, _t, variant) => ({
    variant,
    durationH: variant === 'toll-free' ? 2.4 : 1.7,
    distanceKm: variant === 'toll-free' ? 162 : 145,
    geometry: 'enc-' + variant,
  })),
}));

describe('carEngine.hydrateCarLeg', () => {
  const leg = {
    id: 100, mode: 'car',
    fromCoords: [48.1, 11.6], toCoords: [47.8, 13.0],
  };

  it('returns legMeta.car with all three route variants and toll summary', async () => {
    const { legMeta } = await hydrateCarLeg(leg);
    expect(legMeta.routeVariants).toHaveLength(3);
    const variants = legMeta.routeVariants.map(v => v.variant);
    expect(variants).toEqual(['fastest', 'toll-free', 'scenic']);
    expect(legMeta.tolls.totalEst).toBe(11.5);
    expect(legMeta.lastHydratedAt).toBeTruthy();
  });

  it('returns auto-waypoints for tolls and one of each fuel/rest', async () => {
    const { waypoints } = await hydrateCarLeg(leg);
    const cats = waypoints.map(w => w.category);
    expect(cats).toContain('toll');
    expect(cats).toContain('fuel');
    expect(cats).toContain('rest');
    waypoints.forEach(w => expect(w.source).toBe('auto'));
  });
});
