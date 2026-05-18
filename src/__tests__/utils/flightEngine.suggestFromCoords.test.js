import { describe, it, expect } from 'vitest';
import { suggestFromCoords } from '../../utils/flightEngine.js';

describe('flightEngine.suggestFromCoords', () => {
  it('returns the nearest airport with distance', () => {
    const r = suggestFromCoords({ lat: 50.1109, lng: 8.6821 });
    expect(r.iata).toBe('FRA');
    expect(r.distanceKm).toBeGreaterThanOrEqual(0);
    expect(r.distanceKm).toBeLessThan(30);
  });

  it('returns null for invalid coords', () => {
    expect(suggestFromCoords({ lat: NaN, lng: 0 })).toBeNull();
  });
});
