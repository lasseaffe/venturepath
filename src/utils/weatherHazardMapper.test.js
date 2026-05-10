import { describe, it, expect } from 'vitest';
import { mapOwmToHazards } from './weatherHazardMapper.js';

describe('mapOwmToHazards', () => {
  it('returns HIGH_WINDS hazard when wind speed exceeds 50 km/h', () => {
    const owm = { wind: { speed: 25 }, rain: {}, clouds: { all: 20 } }; // 25 m/s = 90 km/h
    const hazards = mapOwmToHazards(owm);
    const wind = hazards.find(h => h.id === 'HIGH_WINDS');
    expect(wind).toBeDefined();
    expect(wind.severity).toBe('red');
    expect(wind.affectedGearTags).toContain('hardshell');
  });

  it('returns HEAVY_RAIN hazard when 1h rain exceeds 10mm', () => {
    const owm = { wind: { speed: 5 }, rain: { '1h': 12 }, clouds: { all: 90 } };
    const hazards = mapOwmToHazards(owm);
    const rain = hazards.find(h => h.id === 'HEAVY_RAIN');
    expect(rain).toBeDefined();
    expect(rain.severity).toBe('amber');
    expect(rain.affectedStopTypes).toContain('summit');
  });

  it('returns empty array when conditions are benign', () => {
    const owm = { wind: { speed: 3 }, rain: {}, clouds: { all: 10 } };
    const hazards = mapOwmToHazards(owm);
    expect(hazards).toHaveLength(0);
  });

  it('returns EXTREME_HEAT when temp exceeds 38°C', () => {
    const owm = { wind: { speed: 2 }, rain: {}, clouds: { all: 5 }, main: { temp: 315 } }; // Kelvin
    const hazards = mapOwmToHazards(owm);
    const heat = hazards.find(h => h.id === 'EXTREME_HEAT');
    expect(heat).toBeDefined();
    expect(heat.affectedGearTags).toContain('sun_protection');
  });
});
