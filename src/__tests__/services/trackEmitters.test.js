import { describe, it, expect } from 'vitest';
import { tracksToLegPatch, nearestAirportToTrack } from '../../services/trackEmitters.js';

const track = {
  id: 't1',
  name: 'Sintra Loop',
  profile: 'cycling',
  points: [
    { lat: 38.8, lng: -9.4, ele: 100 },
    { lat: 38.81, lng: -9.41, ele: 120 },
    { lat: 38.82, lng: -9.42, ele: 140 },
  ],
  waypoints: [
    { id: 'w1', name: 'Refuel', idx: 1, category: 'food' },
  ],
  stats: { distanceKm: 5.2, durationH: 0.4, ascentM: 40, descentM: 0, maxEleM: 140, minEleM: 100, difficulty: 'easy' },
};

describe('trackEmitters', () => {
  it('tracksToLegPatch emits a leg with start/end + waypoints', () => {
    const patch = tracksToLegPatch(track);
    expect(patch.from).toBe('Sintra Loop · start');
    expect(patch.to).toBe('Sintra Loop · end');
    expect(patch.mode).toBe('cycling');
    expect(patch.distanceKm).toBe(5);
    expect(patch.coords).toEqual([38.82, -9.42]);
    expect(patch.waypoints).toHaveLength(1);
    expect(patch.waypoints[0].name).toBe('Refuel');
    expect(patch.waypoints[0].coords).toEqual([38.81, -9.41]);
  });

  it('nearestAirportToTrack uses the track start point', () => {
    const airport = nearestAirportToTrack(track);
    expect(airport).toBeTruthy();
    expect(airport.iata).toMatch(/^[A-Z]{3}$/);
    // CAT (Cascais) is the nearest airport to Sintra (38.8, -9.4); LIS (Lisbon) is ~23km away
    expect(airport.iata).toBe('CAT');
  });

  it('returns null for an empty track', () => {
    expect(nearestAirportToTrack({ points: [] })).toBeNull();
    expect(tracksToLegPatch({ points: [], waypoints: [], stats: {} })).toBeNull();
  });
});
