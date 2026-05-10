import { describe, it, expect } from 'vitest';
import { buildInsights } from './architectEngine.js';

describe('buildInsights', () => {
  it('returns weight insight when a member is over limit', () => {
    const insights = buildInsights('SQUAD_WEIGHT_CHANGED', { memberId: 'medic', newKg: 22, overLimit: true }, {});
    expect(insights).toHaveLength(1);
    expect(insights[0].id).toBe('weight_overload_medic');
    expect(insights[0].message).toContain('medic');
    expect(insights[0].targetTab).toBe('LOGISTICS');
  });

  it('returns no weight insight when under limit', () => {
    const insights = buildInsights('SQUAD_WEIGHT_CHANGED', { memberId: 'medic', newKg: 18, overLimit: false }, {});
    expect(insights).toHaveLength(0);
  });

  it('returns budget insight when threshold exceeded', () => {
    const insights = buildInsights('BUDGET_THRESHOLD', { category: 'Accommodation', spent: 920, limit: 1000 }, {});
    expect(insights[0].message).toContain('92%');
    expect(insights[0].targetTab).toBe('LOGISTICS');
  });

  it('returns hike insight when summit stop added', () => {
    const insights = buildInsights('STOP_ADDED', { stop: { type: 'summit', name: 'Summit Push' }, legIndex: 2 }, { manifest: ['first_aid'] });
    expect(insights.some(i => i.id.startsWith('hike_water'))).toBe(true);
  });

  it('returns hazard insight for HIGH_WINDS', () => {
    const insights = buildInsights('HAZARD_UPDATED', { hazards: [{ id: 'HIGH_WINDS', label: 'High winds — 60 km/h', severity: 'red', affectedGearTags: ['hardshell'], affectedStopTypes: ['summit'] }] }, {});
    expect(insights.some(i => i.message.includes('High winds'))).toBe(true);
  });
});
