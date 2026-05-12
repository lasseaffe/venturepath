import { describe, it, expect, vi } from 'vitest';
import { scoreSegment, calculateBikeSuitability } from '../adapters/overpassBike';

describe('overpassBike adapter', () => {
  describe('scoreSegment', () => {
    it('scores motorway as 0.1', () => {
      const segment = {
        roadClass: 'motorway',
        surface: 'asphalt',
        hasCycleway: false
      };
      expect(scoreSegment(segment)).toBe(0.1);
    });

    it('scores residential as 0.9', () => {
      const segment = {
        roadClass: 'residential',
        surface: 'asphalt',
        hasCycleway: false
      };
      expect(scoreSegment(segment)).toBe(0.9);
    });

    it('adds 0.2 bonus for bicycle=yes', () => {
      const segment = {
        roadClass: 'secondary',
        surface: 'asphalt',
        hasBicycleLane: true,
        hasCycleway: false
      };
      const score = scoreSegment(segment);
      expect(score).toBeGreaterThan(0.7);
    });

    it('adds 0.3 bonus for dedicated cycleway', () => {
      const segment = {
        roadClass: 'primary',
        surface: 'asphalt',
        hasCycleway: true
      };
      const score = scoreSegment(segment);
      expect(score).toBeGreaterThan(0.4);
    });
  });

  describe('calculateBikeSuitability', () => {
    it('returns overall score as weighted average of segments', () => {
      const segments = [
        { distanceKm: 50, roadClass: 'secondary', surface: 'asphalt', hasCycleway: false },
        { distanceKm: 50, roadClass: 'primary', surface: 'asphalt', hasCycleway: false }
      ];
      const result = calculateBikeSuitability(segments);
      expect(result.overallScore).toBeCloseTo(0.55, 1);
      expect(result.segments).toHaveLength(2);
      expect(result.segments[0]).toHaveProperty('score');
      expect(result.segments[0]).toHaveProperty('trafficLevel');
    });

    it('sets trafficLevel based on roadClass', () => {
      const segments = [
        { distanceKm: 10, roadClass: 'residential', surface: 'asphalt', hasCycleway: false }
      ];
      const result = calculateBikeSuitability(segments);
      expect(result.segments[0].trafficLevel).toBe('low');
    });
  });
});
