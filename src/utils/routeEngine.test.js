import { describe, it, expect, vi, beforeEach } from 'vitest';
import { haversineKm, filterModes, parseOrsResponse } from './routeEngine';

describe('haversineKm', () => {
  it('returns ~5570 km between London and New York', () => {
    const km = haversineKm({ lat: 51.5074, lng: -0.1278 }, { lat: 40.7128, lng: -74.006 });
    expect(km).toBeGreaterThan(5500);
    expect(km).toBeLessThan(5700);
  });

  it('returns ~0 for identical coords', () => {
    const km = haversineKm({ lat: 48.8566, lng: 2.3522 }, { lat: 48.8566, lng: 2.3522 });
    expect(km).toBeCloseTo(0, 1);
  });
});

describe('filterModes', () => {
  it('excludes flight when distance < 1 km', () => {
    const modes = filterModes(0.5);
    expect(modes).not.toContain('flight');
  });

  it('includes flight when distance > 1 km', () => {
    const modes = filterModes(200);
    expect(modes).toContain('flight');
  });

  it('excludes foot and cycling when distance > 500 km', () => {
    const modes = filterModes(600);
    expect(modes).not.toContain('foot');
    expect(modes).not.toContain('cycling');
  });

  it('includes all modes for medium distance (50 km)', () => {
    const modes = filterModes(50);
    expect(modes).toContain('car');
    expect(modes).toContain('foot');
    expect(modes).toContain('cycling');
    expect(modes).toContain('flight');
  });
});

describe('parseOrsResponse', () => {
  it('extracts duration and distance from ORS summary', () => {
    const orsJson = {
      routes: [{ summary: { distance: 450000, duration: 18000 } }]
    };
    const result = parseOrsResponse(orsJson, 'car');
    expect(result.mode).toBe('car');
    expect(result.distanceKm).toBeCloseTo(450, 0);
    expect(result.durationH).toBeCloseTo(5, 0);
  });

  it('returns null values when ORS response is malformed', () => {
    const result = parseOrsResponse({}, 'car');
    expect(result.durationH).toBeNull();
    expect(result.distanceKm).toBeNull();
  });
});
