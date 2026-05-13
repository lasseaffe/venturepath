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

  it('builds a generateExpedition-compatible bundle and returns description/legs/days', async () => {
    generateExpedition.mockResolvedValue({
      description: 'A pilgrimage on foot.',
      legs: [{ from: 'Sarria', to: 'Santiago', mode: 'foot', durationH: 25, distanceKm: 115, status: 'confirmed' }],
      days: 5,
      name: 'unused',
      distance_km: 999,
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
      waypoints: [
        { name: 'Sarria' },
        { name: 'Portomarín' },
        { name: 'O Pino' },
        { name: 'Santiago' },
      ],
    };

    const draft = await draftFromGpx(routeJson, gpxStats);

    expect(generateExpedition).toHaveBeenCalledOnce();
    const bundleArg = generateExpedition.mock.calls[0][0];
    expect(bundleArg.city).toBe('Sarria → Santiago de Compostela');
    expect(bundleArg.climate).toBe('temperate');
    expect(bundleArg.imageUrl).toBeNull();
    expect(bundleArg.pois).toEqual([
      { name: 'Sarria' },
      { name: 'Portomarín' },
      { name: 'O Pino' },
      { name: 'Santiago' },
    ]);
    expect(bundleArg.description).toContain('Camino de Santiago');
    expect(bundleArg.description).toContain('historical');
    expect(bundleArg.description).toContain('115km');
    expect(bundleArg.description).toContain('Moderate');
    expect(bundleArg.description).toContain('Squad 1-6');
    expect(bundleArg.description).toContain('pilgrimage');

    expect(draft).toEqual({
      description: 'A pilgrimage on foot.',
      legs: [{ from: 'Sarria', to: 'Santiago', mode: 'foot', durationH: 25, distanceKm: 115, status: 'confirmed' }],
      days: 5,
    });
  });

  it('caps pois at 5 entries', async () => {
    generateExpedition.mockResolvedValue({ description: '', legs: [], days: 1 });
    const wp = Array.from({ length: 12 }, (_, i) => ({ name: `wp-${i}` }));
    await draftFromGpx(
      { slug: 's', name: 'n', destination: 'd', theme_category: 'historical', tags: [], climate: 'temperate', difficulty: 'Easy', squad_min: 1, squad_max: 2 },
      { distanceKm: 10, elevationGain: 0, waypoints: wp }
    );
    expect(generateExpedition.mock.calls[0][0].pois).toHaveLength(5);
  });

  it('filters out waypoints with null/empty name', async () => {
    generateExpedition.mockResolvedValue({ description: '', legs: [], days: 1 });
    const wp = [{ name: 'A' }, { name: null }, { name: '' }, { name: 'B' }];
    await draftFromGpx(
      { slug: 's', name: 'n', destination: 'd', theme_category: 'historical', tags: [], climate: 'temperate', difficulty: 'Easy', squad_min: 1, squad_max: 2 },
      { distanceKm: 10, elevationGain: 0, waypoints: wp }
    );
    expect(generateExpedition.mock.calls[0][0].pois).toEqual([{ name: 'A' }, { name: 'B' }]);
  });

  it('falls back to destination when no named waypoints exist', async () => {
    generateExpedition.mockResolvedValue({ description: '', legs: [], days: 1 });
    await draftFromGpx(
      { slug: 's', name: 'n', destination: 'Final City', theme_category: 'historical', tags: [], climate: 'temperate', difficulty: 'Easy', squad_min: 1, squad_max: 2 },
      { distanceKm: 10, elevationGain: 0, waypoints: [] }
    );
    expect(generateExpedition.mock.calls[0][0].pois).toEqual([{ name: 'Final City' }]);
  });
});
