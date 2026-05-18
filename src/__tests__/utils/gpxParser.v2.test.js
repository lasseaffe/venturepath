import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseGpxToTracks } from '../../utils/gpxParser.v2.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
function load(name) {
  return readFileSync(resolve(__dirname, '..', 'fixtures', 'gpx', name), 'utf8');
}

describe('gpxParser.v2', () => {
  it('parses a hiking GPX with elevation and one waypoint', () => {
    const tracks = parseGpxToTracks(load('hike.gpx'));
    expect(tracks).toHaveLength(1);
    expect(tracks[0].name).toBe('Approach');
    expect(tracks[0].profile).toBe('foot');
    expect(tracks[0].points).toHaveLength(3);
    expect(tracks[0].points[0]).toMatchObject({ lat: 46.5, lng: 11.3, ele: 1200 });
    expect(tracks[0].waypoints).toHaveLength(1);
    expect(tracks[0].waypoints[0].name).toBe('Refugio');
  });

  it('maps cycling type to cycling profile', () => {
    const tracks = parseGpxToTracks(load('cycle.gpx'));
    expect(tracks[0].profile).toBe('cycling');
    expect(tracks[0].points).toHaveLength(2);
  });

  it('returns one Track per <trk> in a multi-track GPX', () => {
    const tracks = parseGpxToTracks(load('multi-trk.gpx'));
    expect(tracks).toHaveLength(2);
    expect(tracks[0].name).toBe('A');
    expect(tracks[1].name).toBe('B');
  });
});
