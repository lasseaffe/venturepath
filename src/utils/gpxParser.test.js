// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { parseGpx, matchGpxToPhotos } from './gpxParser';

const SAMPLE_GPX = `<?xml version="1.0"?>
<gpx version="1.1" xmlns="http://www.topografix.com/GPX/1/1" xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1">
  <trk><trkseg>
    <trkpt lat="38.7" lon="-9.1">
      <ele>120</ele>
      <time>2026-11-12T10:00:00Z</time>
      <extensions><gpxtpx:TrackPointExtension>
        <gpxtpx:hr>142</gpxtpx:hr>
      </gpxtpx:TrackPointExtension></extensions>
    </trkpt>
    <trkpt lat="38.8" lon="-9.2">
      <ele>200</ele>
      <time>2026-11-12T10:30:00Z</time>
    </trkpt>
  </trkseg></trk>
</gpx>`;

describe('parseGpx', () => {
  it('returns array of track points', () => {
    const points = parseGpx(SAMPLE_GPX);
    expect(points).toHaveLength(2);
  });

  it('extracts lat and lng', () => {
    const [p] = parseGpx(SAMPLE_GPX);
    expect(p.lat).toBeCloseTo(38.7);
    expect(p.lng).toBeCloseTo(-9.1);
  });

  it('extracts elevation', () => {
    const [p] = parseGpx(SAMPLE_GPX);
    expect(p.alt).toBe(120);
  });

  it('extracts timestamp as ISO string', () => {
    const [p] = parseGpx(SAMPLE_GPX);
    expect(p.timestamp).toBe('2026-11-12T10:00:00Z');
  });

  it('extracts heart rate when present', () => {
    const [p] = parseGpx(SAMPLE_GPX);
    expect(p.hr).toBe(142);
  });

  it('sets hr to null when not present', () => {
    const points = parseGpx(SAMPLE_GPX);
    expect(points[1].hr).toBeNull();
  });
});

describe('matchGpxToPhotos', () => {
  it('matches photos to track points within maxGapMs', () => {
    const trackPoints = parseGpx(SAMPLE_GPX);
    const photos = [
      { id: 'photo1', timestamp: '2026-11-12T10:00:15Z' },
      { id: 'photo2', timestamp: '2026-11-12T10:35:00Z' },
    ];

    const matched = matchGpxToPhotos(trackPoints, photos, 5 * 60 * 1000);
    expect(matched[0]).toHaveProperty('altitude', 120);
    expect(matched[0]).toHaveProperty('heart_rate', 142);
  });

  it('skips photo if no track point within maxGapMs', () => {
    const trackPoints = parseGpx(SAMPLE_GPX);
    const photos = [
      { id: 'photo1', timestamp: '2026-11-12T11:00:00Z' },
    ];

    const matched = matchGpxToPhotos(trackPoints, photos, 5 * 60 * 1000);
    expect(matched[0]).not.toHaveProperty('altitude');
  });
});
