import { describe, it, expect, vi, beforeEach } from 'vitest';
import { hydrateFootLeg } from '../engines/footEngine.js';

vi.mock('../adapters/openElevation.js', () => ({
  fetchElevationProfile: vi.fn().mockResolvedValue({
    points: [{ lat: 48, lng: 11, elevM: 500 }, { lat: 48.1, lng: 11.1, elevM: 600 }],
    gainM: 100, lossM: 0, maxElevM: 600, minElevM: 500,
  })
}));

vi.mock('../adapters/overpassTrail.js', () => ({
  fetchWaterAndResupply: vi.fn().mockResolvedValue({
    water: [{ name: 'Spring', coords: [48.05, 11.05], subtype: 'spring' }],
    resupply: [{ name: 'SPAR', coords: [48.02, 11.02], subtype: 'supermarket' }],
  })
}));

describe('hydrateFootLeg', () => {
  it('returns null legMeta when leg has no coords', async () => {
    const result = await hydrateFootLeg({ id: 1, mode: 'foot' });
    expect(result.legMeta).toBeNull();
    expect(result.waypoints).toEqual([]);
  });

  it('returns legMeta with elevationProfile', async () => {
    const result = await hydrateFootLeg({ id: 1, mode: 'foot', coords: [[48, 11], [48.1, 11.1]] });
    expect(result.legMeta.elevationProfile.gainM).toBe(100);
    expect(result.legMeta.elevationProfile.maxElevM).toBe(600);
  });

  it('creates water waypoints from OSM results', async () => {
    const result = await hydrateFootLeg({ id: 1, mode: 'foot', coords: [[48, 11], [48.1, 11.1]] });
    const water = result.waypoints.filter(w => w.category === 'water');
    expect(water).toHaveLength(1);
    expect(water[0].name).toBe('Spring');
    expect(water[0].source).toBe('auto');
  });

  it('creates resupply waypoints from OSM results', async () => {
    const result = await hydrateFootLeg({ id: 1, mode: 'foot', coords: [[48, 11], [48.1, 11.1]] });
    const resupply = result.waypoints.filter(w => w.category === 'resupply');
    expect(resupply).toHaveLength(1);
    expect(resupply[0].name).toBe('SPAR');
  });

  it('stores lastHydratedAt in legMeta', async () => {
    const result = await hydrateFootLeg({ id: 1, mode: 'foot', coords: [[48, 11], [48.1, 11.1]] });
    expect(result.legMeta.lastHydratedAt).toBeTruthy();
  });

  it('includes gpxFileId as null when not yet set', async () => {
    const result = await hydrateFootLeg({ id: 1, mode: 'foot', coords: [[48, 11], [48.1, 11.1]] });
    expect(result.legMeta.gpxFileId).toBeNull();
  });
});
