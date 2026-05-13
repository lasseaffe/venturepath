import { describe, it, expect, vi } from 'vitest';
import {
  parseCyclingLeg,
  parseGpx,
  parseGraphHopperRoute,
  addElevationData,
} from '../engines/cycleEngine';

// Mock fetch for Overpass and Elevation APIs
global.fetch = vi.fn();

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

  describe('parseCyclingLeg', () => {
    it('returns leg object with enriched metadata', async () => {
      const gpxContent = `<?xml version="1.0"?>
        <gpx version="1.1">
          <trk>
            <trkseg>
              <trkpt lat="43.7693" lon="11.2557"><ele>100</ele></trkpt>
              <trkpt lat="43.7694" lon="11.2558"><ele>105</ele></trkpt>
              <trkpt lat="43.7695" lon="11.2559"><ele>110</ele></trkpt>
            </trkseg>
          </trk>
        </gpx>`;
      const gpxFile = new File([gpxContent], 'route.gpx', { type: 'text/xml' });

      // Mock the enrichment functions
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ elements: [] }), // No POI
      });

      const leg = await parseCyclingLeg({
        gpxFile,
        from: 'Firenze',
        to: 'Roma',
        routeSource: 'uploaded',
      });

      expect(leg.mode).toBe('cycle');
      expect(leg.from).toBe('Firenze');
      expect(leg.to).toBe('Roma');
      expect(leg.legMeta.cycle).toBeDefined();
      expect(leg.legMeta.cycle.routeSource).toBe('uploaded');
    });
  });
});
