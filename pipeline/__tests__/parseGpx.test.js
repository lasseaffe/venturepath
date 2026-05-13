import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { parseGpx } from '../lib/parseGpx.js';

const FIXTURE = resolve(__dirname, 'fixtures/sample.gpx');

describe('parseGpx', () => {
  it('returns 3 waypoints with name/lat/lon/ele/sym', () => {
    const r = parseGpx(FIXTURE);
    expect(r.waypoints).toHaveLength(3);
    expect(r.waypoints[0]).toMatchObject({
      name: 'Santiago de Compostela',
      lat: 42.8782,
      lon: -8.5448,
      ele: 260,
      sym: 'City',
    });
    expect(r.waypoints[2].sym).toBe('Trailhead');
  });

  it('computes a positive distance from the trkseg in km', () => {
    const r = parseGpx(FIXTURE);
    expect(r.distanceKm).toBeGreaterThan(50);
    expect(r.distanceKm).toBeLessThan(200);
  });

  it('computes elevation gain only (positive deltas)', () => {
    // Fixture trkseg goes 650 → 620 → 340 → 260 (all descents). Gain should be 0.
    const r = parseGpx(FIXTURE);
    expect(r.elevationGain).toBe(0);
  });

  it('reports trackpoint count', () => {
    const r = parseGpx(FIXTURE);
    expect(r.trackpointCount).toBe(4);
  });
});
