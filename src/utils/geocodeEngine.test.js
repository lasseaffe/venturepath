import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { filterByAllowedClass, searchStations, searchBusStops, searchTramStops } from './geocodeEngine';

// ── existing tests ──────────────────────────────────────────────────────────
describe('filterByAllowedClass', () => {
  it('keeps results whose class is in the allowlist', () => {
    const input = [
      { id: 1, name: 'Landungsbrücken', class: 'railway' },
      { id: 2, name: 'Café Central',    class: 'amenity' },
      { id: 3, name: 'Altona',          class: 'place'   },
    ];
    expect(filterByAllowedClass(input)).toHaveLength(3);
  });

  it('removes results whose class is not in the allowlist', () => {
    const input = [
      { id: 1, name: 'Stolperstein dedicated to Max', class: 'historic' },
      { id: 2, name: 'Boundary marker',               class: 'man_made' },
      { id: 3, name: 'Landungsbrücken',                class: 'railway'  },
    ];
    const out = filterByAllowedClass(input);
    expect(out).toHaveLength(1);
    expect(out[0].name).toBe('Landungsbrücken');
  });

  it('keeps results with no class field (unknown = pass through)', () => {
    const input = [{ id: 1, name: 'Mystery Place' }];
    expect(filterByAllowedClass(input)).toHaveLength(1);
  });

  it('returns empty array for empty input', () => {
    expect(filterByAllowedClass([])).toEqual([]);
  });
});

// ── deduplication ────────────────────────────────────────────────────────────
describe('searchStations deduplication', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => [
        { place_id: 1, display_name: 'Hamburg Hauptbahnhof, Nordsteg, St. Georg, Hamburg', lat: '53.5530', lon: '10.0069', class: 'railway', type: 'station' },
        { place_id: 2, display_name: 'Hamburg Central Station, Nordsteg, St. Georg, Hamburg', lat: '53.5530', lon: '10.0069', class: 'railway', type: 'station' },
        { place_id: 3, display_name: 'Hamburg-Altona, Altona-Nord, Hamburg', lat: '53.5503', lon: '9.9346', class: 'railway', type: 'station' },
      ],
    });
  });

  afterEach(() => { vi.restoreAllMocks(); });

  it('removes the EN/DE duplicate at the same coordinate', async () => {
    const results = await searchStations('hamburg', 5);
    expect(results).toHaveLength(2);
    expect(results[0].name).toBe('Hamburg Hauptbahnhof');
    expect(results[1].name).toBe('Hamburg-Altona');
  });
});

// ── bus stop search ──────────────────────────────────────────────────────────
describe('searchBusStops', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => [
        { place_id: 10, display_name: 'Rathausmarkt, Hamburg', lat: '53.5503', lon: '9.9946', class: 'highway', type: 'bus_stop' },
        { place_id: 11, display_name: 'Jungfernstieg, Hamburg', lat: '53.5535', lon: '9.9926', class: 'highway', type: 'bus_stop' },
      ],
    });
  });

  afterEach(() => { vi.restoreAllMocks(); });

  it('returns bus stops with transportType bus', async () => {
    const results = await searchBusStops('rathausmarkt', 5);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].transportType).toBe('bus');
  });
});

// ── tram stop search ─────────────────────────────────────────────────────────
describe('searchTramStops', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => [
        { place_id: 20, display_name: 'Rathaus, Freiburg', lat: '47.9959', lon: '7.8508', class: 'railway', type: 'tram_stop' },
      ],
    });
  });

  afterEach(() => { vi.restoreAllMocks(); });

  it('returns tram stops with transportType tram', async () => {
    const results = await searchTramStops('rathaus', 5);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].transportType).toBe('tram');
  });
});
