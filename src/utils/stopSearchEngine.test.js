import { describe, it, expect } from 'vitest';
import { rankByProximity } from './stopSearchEngine';

const paris = { lat: 48.8566, lng: 2.3522 };

describe('rankByProximity', () => {
  it('sorts results closest to reference coord first', () => {
    const results = [
      { id: '1', name: 'London', coords: { lat: 51.5074, lng: -0.1278 } },  // ~341 km
      { id: '2', name: 'Lyon',   coords: { lat: 45.75, lng: 4.85 } },        // ~393 km
      { id: '3', name: 'Reims',  coords: { lat: 49.2583, lng: 4.0317 } },    // ~136 km
    ];
    const ranked = rankByProximity(results, paris);
    expect(ranked[0].name).toBe('Reims');
    expect(ranked[1].name).toBe('London');
  });

  it('passes through results without coords unchanged in relative order', () => {
    const results = [
      { id: '1', name: 'A', coords: null },
      { id: '2', name: 'B', coords: null },
    ];
    const ranked = rankByProximity(results, paris);
    expect(ranked.map(r => r.name)).toEqual(['A', 'B']);
  });

  it('returns original array when refCoords is null', () => {
    const results = [{ id: '1', name: 'X', coords: { lat: 0, lng: 0 } }];
    expect(rankByProximity(results, null)).toEqual(results);
  });
});
