import { describe, it, expect, vi, beforeEach } from 'vitest';
import { waymarkedRoutes, fetchRouteGeometry, _bboxFromCenter } from './waymarkedEngine';

beforeEach(() => vi.restoreAllMocks());

const mockRouteList = {
  ok: true,
  json: async () => ({
    results: [
      { id: 101, name: 'Alpine Trail', difficulty: 'demanding', length: 12400, ascent: 850 },
      { id: 102, name: 'Valley Loop',  difficulty: 'easy',      length: 5200,  ascent: 120 },
    ],
  }),
};

const GPX_SAMPLE = `<?xml version="1.0"?>
<gpx><trk><trkseg>
  <trkpt lat="47.1" lon="11.2"><ele>900</ele></trkpt>
  <trkpt lat="47.2" lon="11.3"><ele>1100</ele></trkpt>
</trkseg></trk></gpx>`;

const mockGpx = { ok: true, text: async () => GPX_SAMPLE };

describe('_bboxFromCenter', () => {
  it('returns a bbox object with four numeric fields', () => {
    const bbox = _bboxFromCenter(47.5, 11.0, 10000);
    expect(bbox).toHaveProperty('minLat');
    expect(bbox).toHaveProperty('maxLat');
    expect(bbox).toHaveProperty('minLng');
    expect(bbox).toHaveProperty('maxLng');
    expect(bbox.minLat).toBeLessThan(bbox.maxLat);
  });
});

describe('waymarkedRoutes', () => {
  it('returns normalized route array', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(mockRouteList));
    const routes = await waymarkedRoutes(47.5, 11.0, 'hiking', 10000);
    expect(routes).toHaveLength(2);
    expect(routes[0]).toMatchObject({
      id: '101',
      name: 'Alpine Trail',
      difficulty: 'demanding',
      distance_km: 12.4,
      ascent_m: 850,
      geometry: [],
      type: 'hiking',
    });
  });

  it('returns empty array on fetch error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new Error('network')));
    const routes = await waymarkedRoutes(47.5, 11.0);
    expect(routes).toEqual([]);
  });
});

describe('fetchRouteGeometry', () => {
  it('returns parsed LatLng array from GPX', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(mockGpx));
    const geom = await fetchRouteGeometry('101', 'hiking');
    expect(geom).toHaveLength(2);
    expect(geom[0]).toMatchObject({ lat: 47.1, lng: 11.2 });
  });

  it('returns empty array on error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new Error('fail')));
    const geom = await fetchRouteGeometry('999', 'hiking');
    expect(geom).toEqual([]);
  });
});
