import { describe, it, expect } from 'vitest';
import { bearing, cardinalLabel, haversineKm } from './compassEngine';

describe('bearing', () => {
  it('returns ~0 for due north', () => {
    const b = bearing({ lat: 0, lng: 0 }, { lat: 1, lng: 0 });
    expect(b).toBeCloseTo(0, 0);
  });

  it('returns ~180 for due south', () => {
    const b = bearing({ lat: 1, lng: 0 }, { lat: 0, lng: 0 });
    expect(b).toBeCloseTo(180, 0);
  });

  it('returns ~90 for due east', () => {
    const b = bearing({ lat: 0, lng: 0 }, { lat: 0, lng: 1 });
    expect(b).toBeCloseTo(90, 0);
  });
});

describe('cardinalLabel', () => {
  it('returns N for 0', () => expect(cardinalLabel(0)).toBe('N'));
  it('returns N for 359', () => expect(cardinalLabel(359)).toBe('N'));
  it('returns NNW for 348', () => expect(cardinalLabel(348)).toBe('NNW'));
  it('returns NE for 45', () => expect(cardinalLabel(45)).toBe('NE'));
  it('returns S for 180', () => expect(cardinalLabel(180)).toBe('S'));
  it('returns W for 270', () => expect(cardinalLabel(270)).toBe('W'));
});

describe('haversineKm', () => {
  it('returns ~0 for same point', () => {
    expect(haversineKm({ lat: 48.8, lng: 2.3 }, { lat: 48.8, lng: 2.3 })).toBe(0);
  });

  it('returns reasonable distance between Paris and London', () => {
    const km = haversineKm({ lat: 48.85, lng: 2.35 }, { lat: 51.5, lng: -0.12 });
    expect(km).toBeGreaterThan(300);
    expect(km).toBeLessThan(400);
  });
});
