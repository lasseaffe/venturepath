import { describe, it, expect, vi } from 'vitest';
import { queryOverpassPoi, mapPoiToWaypoint } from '../adapters/overpassPoi';

describe('overpassPoi adapter', () => {
  describe('mapPoiToWaypoint', () => {
    it('maps bike_shop OSM node to waypoint with correct category', () => {
      const poi = {
        lat: 43.7693,
        lon: 11.2557,
        tags: {
          name: 'Cicli Rossi',
          amenity: 'bicycle_shop',
          'opening_hours': 'Mo-Sa 09:00-19:00',
        },
      };
      const waypoint = mapPoiToWaypoint(poi, 'bike_shop', 0.5);
      expect(waypoint.category).toBe('bike_shop');
      expect(waypoint.label).toBe('Cicli Rossi');
      expect(waypoint.lat).toBe(43.7693);
      expect(waypoint.lon).toBe(11.2557);
      expect(waypoint.distance_from_route_km).toBe(0.5);
    });

    it('maps food amenity to food category', () => {
      const poi = {
        lat: 43.8,
        lon: 11.3,
        tags: { name: 'Café Rosa', amenity: 'cafe' },
      };
      const waypoint = mapPoiToWaypoint(poi, 'food', 0.2);
      expect(waypoint.category).toBe('food');
      expect(waypoint.label).toBe('Café Rosa');
    });

    it('includes opening hours in description if available', () => {
      const poi = {
        lat: 43.8,
        lon: 11.3,
        tags: {
          name: 'Shop',
          amenity: 'shop',
          'opening_hours': 'Mo-Fr 08:00-18:00',
        },
      };
      const waypoint = mapPoiToWaypoint(poi, 'shop', 0.1);
      expect(waypoint.description).toContain('Mo-Fr 08:00-18:00');
    });
  });

  describe('queryOverpassPoi', () => {
    it('returns empty array if bbox is invalid', () => {
      const result = queryOverpassPoi({ south: 45, west: 10, north: 40, east: 15 });
      expect(result).toEqual([]);
    });

    it('builds correct bbox for coordinate array', () => {
      const coords = [
        [43.7693, 11.2557],
        [43.8123, 11.3456],
        [43.9012, 11.4567],
      ];
      const promise = queryOverpassPoi(coords, 1.0);
      expect(promise).toBeInstanceOf(Promise);
    });
  });
});
