import { describe, it, expect } from 'vitest';
import { deriveClimateFromTrack, buildCostEntryForTrack } from '../../services/trackEmitters.js';

const highAltTrack = {
  id: 'ht1', name: 'Himalaya Trek', profile: 'foot',
  points: [{ lat: 27.9, lng: 86.9, ele: 3400 }, { lat: 27.95, lng: 86.95, ele: 5200 }],
  stats: { distanceKm: 12, maxEleM: 5200, minEleM: 3400 },
};

const lowlandTrack = {
  id: 'lt1', name: 'City Cycle', profile: 'cycling',
  points: [{ lat: 52.5, lng: 13.4, ele: 50 }, { lat: 52.51, lng: 13.41, ele: 60 }],
  stats: { distanceKm: 8, maxEleM: 60, minEleM: 50 },
};

describe('deriveClimateFromTrack', () => {
  it('returns arctic for very high altitude', () => {
    const r = deriveClimateFromTrack(highAltTrack);
    expect(r.climateBand).toBe('arctic');
    expect(r.maxAltM).toBe(5200);
    expect(r.expectedLowTempC).toBeLessThan(-10);
  });

  it('returns temperate for low elevation city track', () => {
    const r = deriveClimateFromTrack(lowlandTrack);
    expect(r.climateBand).toBe('temperate');
    expect(r.expectedLowTempC).toBeGreaterThan(5);
  });

  it('returns null for empty track', () => {
    expect(deriveClimateFromTrack({ points: [], stats: {} })).toBeNull();
  });
});

describe('buildCostEntryForTrack', () => {
  it('returns null for foot profile (zero cost)', () => {
    expect(buildCostEntryForTrack(highAltTrack)).toBeNull();
  });

  it('builds a nomination entry for cycling', () => {
    const entry = buildCostEntryForTrack(lowlandTrack);
    expect(entry).not.toBeNull();
    expect(entry.name).toContain('City Cycle');
    expect(entry.amount).toBeCloseTo(8 * 0.05, 2);
    expect(entry.type).toBe('Transport');
    expect(entry.votes).toEqual({});
    expect(entry.status).toBe('nominated');
  });
});
