import { describe, it, expect } from 'vitest';
import { computeBearing, deriveBearing } from './bearingEngine';

describe('computeBearing', () => {
  it('returns 0 for due north', () => {
    const from = { lat: 0, lng: 0 };
    const to   = { lat: 1, lng: 0 };
    expect(computeBearing(from, to)).toBeCloseTo(0, 0);
  });

  it('returns 90 for due east', () => {
    const from = { lat: 0, lng: 0 };
    const to   = { lat: 0, lng: 1 };
    expect(computeBearing(from, to)).toBeCloseTo(90, 0);
  });

  it('returns 180 for due south', () => {
    const from = { lat: 1, lng: 0 };
    const to   = { lat: 0, lng: 0 };
    expect(computeBearing(from, to)).toBeCloseTo(180, 0);
  });

  it('returns 270 for due west', () => {
    const from = { lat: 0, lng: 1 };
    const to   = { lat: 0, lng: 0 };
    expect(computeBearing(from, to)).toBeCloseTo(270, 0);
  });
});

describe('deriveBearing', () => {
  it('returns photo.bearing when present', () => {
    const photo = { bearing: 135, timestamp: '2026-01-01T10:00:00Z', coords: [0, 0] };
    expect(deriveBearing(photo, [])).toBe(135);
  });

  it('derives bearing from bracketing breadcrumbs when no photo.bearing', () => {
    const photo = { timestamp: '2026-01-01T10:30:00Z', coords: [0, 0] };
    const breadcrumbs = [
      { timestamp: '2026-01-01T10:00:00Z', lat: 0, lng: 0 },
      { timestamp: '2026-01-01T11:00:00Z', lat: 1, lng: 0 },
    ];
    const bearing = deriveBearing(photo, breadcrumbs);
    expect(bearing).toBeCloseTo(0, 0); // heading north
  });

  it('returns 0 when no bearing and no breadcrumbs', () => {
    const photo = { timestamp: '2026-01-01T10:00:00Z', coords: [0, 0] };
    expect(deriveBearing(photo, [])).toBe(0);
  });

  it('returns 0 when timestamp is outside all breadcrumb brackets', () => {
    const photo = { timestamp: '2026-01-01T07:00:00Z', coords: [0, 0] }; // before all breadcrumbs
    const breadcrumbs = [
      { timestamp: '2026-01-01T10:00:00Z', lat: 0, lng: 0 },
      { timestamp: '2026-01-01T11:00:00Z', lat: 1, lng: 0 },
    ];
    expect(deriveBearing(photo, breadcrumbs)).toBe(0);
  });

  it('uses binary search correctly with multiple breadcrumb points', () => {
    const photo = { timestamp: '2026-01-01T12:30:00Z', coords: [0, 0] };
    const breadcrumbs = [
      { timestamp: '2026-01-01T10:00:00Z', lat: 0,   lng: 0 },
      { timestamp: '2026-01-01T11:00:00Z', lat: 0.5, lng: 0 },
      { timestamp: '2026-01-01T12:00:00Z', lat: 0,   lng: 0 },
      { timestamp: '2026-01-01T13:00:00Z', lat: 1,   lng: 0 }, // bracket: index 2→3, heading north
      { timestamp: '2026-01-01T14:00:00Z', lat: 2,   lng: 0 },
    ];
    const bearing = deriveBearing(photo, breadcrumbs);
    expect(bearing).toBeCloseTo(0, 0); // heading north between index 2 and 3
  });
});
