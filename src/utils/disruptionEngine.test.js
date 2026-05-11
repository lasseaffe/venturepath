import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchAlerts, checkCascade } from './disruptionEngine';

// ── fetchAlerts ──────────────────────────────────────────────────────────────
describe('fetchAlerts', () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it('returns null when leg has no selectedOption', async () => {
    const leg = { id: 'l1', selectedOption: null };
    expect(await fetchAlerts(leg)).toBeNull();
  });

  it('returns null when trip has no delay at the origin stop', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({
        stopovers: [
          { stop: { id: '8000157' }, departureDelay: 0 },
        ],
        line: { name: 'ICE 603', product: 'nationalExpress' },
      }),
    });
    const leg = {
      id: 'l1',
      stopFromId: '8000157',
      selectedOption: { tripId: 'trip-abc' },
    };
    expect(await fetchAlerts(leg)).toBeNull();
  });

  it('returns a medium disruption for a 35-minute delay', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({
        stopovers: [
          { stop: { id: '8000157' }, departureDelay: 2100 }, // 35 min in seconds
        ],
        line: { name: 'ICE 603', product: 'nationalExpress' },
      }),
    });
    const leg = {
      id: 'l1',
      stopFromId: '8000157',
      selectedOption: { tripId: 'trip-abc' },
    };
    const result = await fetchAlerts(leg);
    expect(result).toMatchObject({
      severity:     'medium',
      delayMinutes: 35,
      source:       'db-rt',
    });
  });

  it('returns null on network failure', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('timeout'));
    const leg = { id: 'l1', stopFromId: '8000157', selectedOption: { tripId: 'trip-abc' } };
    expect(await fetchAlerts(leg)).toBeNull();
  });
});

// ── checkCascade ─────────────────────────────────────────────────────────────
describe('checkCascade', () => {
  it('returns empty when fewer than 2 confirmed legs', () => {
    const legs = [
      { id: 'l1', selectedOption: { departure: '2026-05-11T10:00:00Z', arrival: '2026-05-11T12:00:00Z' }, disruption: null },
    ];
    expect(checkCascade(legs)).toEqual([]);
  });

  it('returns empty when no disruptions', () => {
    const legs = [
      { id: 'l1', selectedOption: { departure: '2026-05-11T10:00:00Z', arrival: '2026-05-11T12:00:00Z' }, disruption: null },
      { id: 'l2', selectedOption: { departure: '2026-05-11T13:00:00Z', arrival: '2026-05-11T15:00:00Z' }, disruption: null },
    ];
    expect(checkCascade(legs)).toEqual([]);
  });

  it('flags amber when remaining buffer is 1–29 minutes', () => {
    // buffer = 12:20 - 12:00 = 20m; delay = 15m; remaining = 5m → amber
    const legs = [
      { id: 'l1', selectedOption: { departure: '2026-05-11T10:00:00Z', arrival: '2026-05-11T12:00:00Z' }, disruption: { delayMinutes: 15 } },
      { id: 'l2', selectedOption: { departure: '2026-05-11T12:20:00Z', arrival: '2026-05-11T14:00:00Z' }, disruption: null },
    ];
    const results = checkCascade(legs);
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ legId: 'l2', upstreamLegId: 'l1', severity: 'amber', remainingMinutes: 5 });
  });

  it('flags red when connection is missed (remaining < 0)', () => {
    // buffer = 12:30 - 12:00 = 30m; delay = 45m; remaining = -15m → red
    const legs = [
      { id: 'l1', selectedOption: { departure: '2026-05-11T10:00:00Z', arrival: '2026-05-11T12:00:00Z' }, disruption: { delayMinutes: 45 } },
      { id: 'l2', selectedOption: { departure: '2026-05-11T12:30:00Z', arrival: '2026-05-11T14:00:00Z' }, disruption: null },
    ];
    const results = checkCascade(legs);
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ severity: 'red', remainingMinutes: -15 });
  });

  it('propagates cascade: l2 delay endangers l3', () => {
    // l1→l2: buffer 60m, delay 70m → red (remaining -10m)
    // l2→l3: original buffer 30m; l2 now effectively 10m late → remaining 20m → amber
    const legs = [
      { id: 'l1', selectedOption: { departure: '2026-05-11T08:00:00Z', arrival: '2026-05-11T10:00:00Z' }, disruption: { delayMinutes: 70 } },
      { id: 'l2', selectedOption: { departure: '2026-05-11T11:00:00Z', arrival: '2026-05-11T13:00:00Z' }, disruption: null },
      { id: 'l3', selectedOption: { departure: '2026-05-11T13:30:00Z', arrival: '2026-05-11T15:00:00Z' }, disruption: null },
    ];
    const results = checkCascade(legs);
    // l1→l2: buffer=60m, delay=70m, remaining=-10m → red
    // l2→l3: l2 effective arrival = 13:00 + 10m propagated = 13:10, buffer to l3 departure 13:30 = 20m → amber
    expect(results.some(r => r.legId === 'l2' && r.severity === 'red')).toBe(true);
    expect(results.some(r => r.legId === 'l3' && r.severity === 'amber')).toBe(true);
  });
});
