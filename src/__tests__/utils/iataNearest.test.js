import { describe, it, expect } from 'vitest';
import { nearestAirport, nearestAirports } from '../../utils/iataNearest.js';

describe('iataNearest', () => {
  it('finds FRA closest to Frankfurt centre', () => {
    const a = nearestAirport({ lat: 50.1109, lng: 8.6821 });
    expect(a.iata).toBe('FRA');
  });

  it('returns N candidates sorted by distance', () => {
    const list = nearestAirports({ lat: 46.5, lng: 11.3 }, 3);
    expect(list).toHaveLength(3);
    for (let i = 1; i < list.length; i++) {
      expect(list[i].distanceKm).toBeGreaterThanOrEqual(list[i - 1].distanceKm);
    }
  });
});
