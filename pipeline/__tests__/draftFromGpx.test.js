import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../generateExpedition.js', () => ({
  generateExpedition: vi.fn(),
}));

import { generateExpedition } from '../generateExpedition.js';
import { draftFromGpx } from '../lib/draftFromGpx.js';

describe('draftFromGpx', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('assembles bundle with GPX-derived facts and route metadata', async () => {
    generateExpedition.mockResolvedValue({
      description: 'A pilgrimage on foot.',
      legs: [{ from: 'Sarria', to: 'Santiago', mode: 'foot', durationH: 25, distanceKm: 115, status: 'confirmed' }],
      days: 5,
    });

    const routeJson = {
      slug: 'camino-de-santiago',
      name: 'Camino de Santiago',
      destination: 'Sarria → Santiago de Compostela',
      theme_category: 'historical',
      tags: ['pilgrimage'],
      climate: 'temperate',
      difficulty: 'Moderate',
      squad_min: 1,
      squad_max: 6,
    };
    const gpxStats = {
      distanceKm: 115,
      elevationGain: 1200,
      waypoints: [{ name: 'Sarria' }, { name: 'Portomarín' }, { name: 'O Pino' }, { name: 'Santiago' }],
    };

    const draft = await draftFromGpx(routeJson, gpxStats);

    expect(generateExpedition).toHaveBeenCalledOnce();
    const bundleArg = generateExpedition.mock.calls[0][0];
    expect(bundleArg).toMatchObject({
      name: 'Camino de Santiago',
      destination: 'Sarria → Santiago de Compostela',
      theme_category: 'historical',
      tags: ['pilgrimage'],
      climate: 'temperate',
      difficulty: 'Moderate',
      squad_min: 1,
      squad_max: 6,
      distance_km: 115,
      elevation_gain: 1200,
    });
    expect(bundleArg.waypoint_names).toEqual(['Sarria', 'Portomarín', 'O Pino', 'Santiago']);
    expect(draft).toEqual({
      description: 'A pilgrimage on foot.',
      legs: [{ from: 'Sarria', to: 'Santiago', mode: 'foot', durationH: 25, distanceKm: 115, status: 'confirmed' }],
      days: 5,
    });
  });

  it('caps waypoint_names at 8 entries', async () => {
    generateExpedition.mockResolvedValue({ description: '', legs: [], days: 1 });
    const wp = Array.from({ length: 12 }, (_, i) => ({ name: `wp-${i}` }));
    await draftFromGpx(
      { slug: 's', name: 'n', destination: 'd', theme_category: 'historical', tags: [], climate: 'temperate', difficulty: 'Easy', squad_min: 1, squad_max: 2 },
      { distanceKm: 10, elevationGain: 0, waypoints: wp }
    );
    expect(generateExpedition.mock.calls[0][0].waypoint_names).toHaveLength(8);
  });

  it('filters out waypoints with null/empty name', async () => {
    generateExpedition.mockResolvedValue({ description: '', legs: [], days: 1 });
    const wp = [{ name: 'A' }, { name: null }, { name: '' }, { name: 'B' }];
    await draftFromGpx(
      { slug: 's', name: 'n', destination: 'd', theme_category: 'historical', tags: [], climate: 'temperate', difficulty: 'Easy', squad_min: 1, squad_max: 2 },
      { distanceKm: 10, elevationGain: 0, waypoints: wp }
    );
    expect(generateExpedition.mock.calls[0][0].waypoint_names).toEqual(['A', 'B']);
  });
});
