import { describe, it, expect } from 'vitest';
import { exportTrackToGpx } from '../../utils/gpxExporter.v2.js';
import { parseGpxToTracks } from '../../utils/gpxParser.v2.js';

const sampleTrack = {
  id: 'a',
  name: 'Test Compose',
  profile: 'foot',
  points: [
    { lat: 46.5, lng: 11.3, ele: 1200, time: null },
    { lat: 46.51, lng: 11.31, ele: 1250, time: null },
  ],
  segments: [{ fromIdx: 0, toIdx: 1, profile: 'foot', surface: null, routerEngine: 'brouter' }],
  waypoints: [{ id: 'w', name: 'Camp', idx: 0, category: 'camp', note: 'water source' }],
  stats: { distanceKm: 1, durationH: 0.2, ascentM: 50, descentM: 0, maxEleM: 1250, minEleM: 1200, difficulty: 'easy' },
};

describe('gpxExporter.v2', () => {
  it('emits a valid GPX 1.1 document with trkpt + ele', () => {
    const xml = exportTrackToGpx(sampleTrack);
    expect(xml).toContain('<gpx version="1.1"');
    expect(xml).toContain('<trkpt lat="46.5" lon="11.3"');
    expect(xml).toContain('<ele>1200</ele>');
    expect(xml).toContain('<name>Test Compose</name>');
    expect(xml).toContain('<wpt');
    expect(xml).toContain('<name>Camp</name>');
  });

  it('round-trips through parser without losing points or elevation', () => {
    const xml = exportTrackToGpx(sampleTrack);
    const parsed = parseGpxToTracks(xml);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].points).toHaveLength(2);
    expect(parsed[0].points[0].ele).toBe(1200);
  });
});
