import { describe, it, expect } from 'vitest';
import { simulateDelay } from './simulatorEngine';

const BASE_LEGS = [
  { id: 1, startISO: '2026-11-12T08:00:00Z', endISO: '2026-11-12T10:00:00Z' },
  { id: 2, startISO: '2026-11-12T12:00:00Z', endISO: '2026-11-12T14:00:00Z' },
  { id: 3, startISO: '2026-11-12T16:00:00Z', endISO: '2026-11-12T18:00:00Z' },
];

describe('simulateDelay', () => {
  it('marks downstream leg MISSED when buffer goes negative', () => {
    const results = simulateDelay(BASE_LEGS, 1, 5);
    const leg2 = results.find(r => r.leg_id === 2);
    expect(leg2.status).toBe('MISSED');
    expect(leg2.buffer_hours).toBeLessThan(0);
  });

  it('marks downstream leg TIGHT when buffer is 0–2h', () => {
    const results = simulateDelay(BASE_LEGS, 1, 1.5);
    const leg2 = results.find(r => r.leg_id === 2);
    expect(leg2.status).toBe('TIGHT');
    expect(leg2.buffer_hours).toBeGreaterThanOrEqual(0);
    expect(leg2.buffer_hours).toBeLessThanOrEqual(2);
  });

  it('marks downstream leg SAFE when buffer exceeds 2h', () => {
    const results = simulateDelay(BASE_LEGS, 1, 0);
    const leg2 = results.find(r => r.leg_id === 2);
    expect(leg2.status).toBe('SAFE');
    expect(leg2.buffer_hours).toBeGreaterThanOrEqual(2);
  });

  it('does not include the trigger leg itself in results', () => {
    const results = simulateDelay(BASE_LEGS, 1, 3);
    expect(results.find(r => r.leg_id === 1)).toBeUndefined();
  });

  it('cascades delay through multiple downstream legs', () => {
    const results = simulateDelay(BASE_LEGS, 1, 5);
    expect(results.length).toBe(2);
    expect(results[0].leg_id).toBe(2);
    expect(results[1].leg_id).toBe(3);
  });

  it('returns empty array when triggerLegId is not found', () => {
    const results = simulateDelay(BASE_LEGS, 999, 5);
    expect(results).toEqual([]);
  });
});
