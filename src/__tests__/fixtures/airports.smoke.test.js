import { describe, it, expect } from 'vitest';
import airports from '../../data/airports.iata.json';

describe('airports.iata.json', () => {
  it('has at least 5000 entries', () => {
    expect(airports.length).toBeGreaterThan(5000);
  });

  it('every entry has iata, lat, lng', () => {
    for (const a of airports) {
      expect(a.iata).toMatch(/^[A-Z]{3}$/);
      expect(Number.isFinite(a.lat)).toBe(true);
      expect(Number.isFinite(a.lng)).toBe(true);
    }
  });

  it('contains FRA (Frankfurt) — sanity check', () => {
    expect(airports.find(a => a.iata === 'FRA')).toBeTruthy();
  });
});
