import { describe, it, expect } from 'vitest';
import {
  parseGpx,
  parseGraphHopperRoute,
  calculateStagesByDistance,
  calculateStagesByStays,
} from '../engines/cycleEngine';

describe('cycleEngine', () => {
  describe('parseGpx', () => {
    it('extracts coordinates and calculates distance from GPX string', () => {
      const gpxString = `<?xml version="1.0"?>
        <gpx version="1.1">
          <trk>
            <trkseg>
              <trkpt lat="43.7693" lon="11.2557"><ele>100</ele></trkpt>
              <trkpt lat="43.7694" lon="11.2558"><ele>105</ele></trkpt>
            </trkseg>
          </trk>
        </gpx>`;
      const result = parseGpx(gpxString);
      expect(result.coords).toHaveLength(2);
      expect(result.coords[0]).toEqual([43.7693, 11.2557]);
      expect(result.distanceKm).toBeGreaterThan(0);
    });
  });

  describe('parseGraphHopperRoute', () => {
    it('extracts coordinates and distance from GraphHopper response', () => {
      const ghResponse = {
        paths: [
          {
            distance: 65000, // meters
            points: {
              coordinates: [
                [11.2557, 43.7693],
                [11.3456, 43.8123],
              ],
            },
          },
        ],
      };
      const result = parseGraphHopperRoute(ghResponse);
      expect(result.coords).toHaveLength(2);
      expect(result.distanceKm).toBeCloseTo(65, 0);
    });
  });

  describe('cycleEngine — stage calculation', () => {
    const mockCoords = [
      [43.7693, 11.2557],
      [43.7700, 11.2560],
      [43.7710, 11.2570],
      [43.7720, 11.2580],
    ];

    describe('calculateStagesByDistance', () => {
      it('creates stages based on km/day target', () => {
        const stages = calculateStagesByDistance(mockCoords, 10, 5, [], []);
        expect(stages.length).toBeGreaterThan(0);
        expect(stages[0]).toHaveProperty('id');
        expect(stages[0]).toHaveProperty('label');
        expect(stages[0]).toHaveProperty('distanceKm');
      });

      it('labels stages with stay names if available', () => {
        const stays = [{ id: 'stay-1', name: 'Hotel Roma', lat: 43.7710, lon: 11.2570 }];
        const stages = calculateStagesByDistance(mockCoords, 10, 5, [], stays);
        expect(stages[0].plannedStop || stages[1]?.plannedStop).toBeDefined();
      });
    });

    describe('calculateStagesByStays', () => {
      it('creates stages ending at each stay', () => {
        const stays = [
          { id: 'stay-1', name: 'Hotel 1', lat: 43.7700, lon: 11.2560 },
          { id: 'stay-2', name: 'Hotel 2', lat: 43.7720, lon: 11.2580 },
        ];
        const stages = calculateStagesByStays(mockCoords, stays, 10, []);
        expect(stages.length).toBeGreaterThanOrEqual(1);
        expect(stages[0].plannedStop).toBeDefined();
      });
    });
  });
});
