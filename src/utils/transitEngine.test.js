import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resolveStop, searchConnections } from './transitEngine';

const NEARBY_RESPONSE = [
  { id: '8000157', name: 'Hamburg Hbf', location: { latitude: 53.553, longitude: 10.007 } },
];

const JOURNEYS_RESPONSE = {
  journeys: [
    {
      legs: [
        {
          origin:      { id: '8000157', name: 'Hamburg Hbf' },
          destination: { id: '8011160', name: 'Berlin Hbf'  },
          departure:   '2026-05-11T14:00:00+02:00',
          arrival:     '2026-05-11T16:21:00+02:00',
          line: { name: 'ICE 603', product: 'nationalExpress' },
          tripId: 'trip-abc-123',
        },
      ],
      price: { amount: 89.9, currency: 'EUR' },
    },
  ],
};

describe('resolveStop', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({ json: async () => NEARBY_RESPONSE });
  });
  afterEach(() => { vi.restoreAllMocks(); });

  it('returns the nearest stop with id and name', async () => {
    const stop = await resolveStop(53.553, 10.007);
    expect(stop).toMatchObject({ id: '8000157', name: 'Hamburg Hbf' });
  });

  it('returns null when no stops found nearby', async () => {
    global.fetch = vi.fn().mockResolvedValue({ json: async () => [] });
    const stop = await resolveStop(0, 0);
    expect(stop).toBeNull();
  });
});

describe('searchConnections', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({ json: async () => JOURNEYS_RESPONSE });
  });
  afterEach(() => { vi.restoreAllMocks(); });

  it('returns normalized connections with required fields', async () => {
    const conns = await searchConnections('8000157', '8011160', '2026-05-11T12:00:00Z', 'train');
    expect(conns).toHaveLength(1);
    expect(conns[0]).toMatchObject({
      carrier:   'ICE 603',
      departure: '2026-05-11T14:00:00+02:00',
      arrival:   '2026-05-11T16:21:00+02:00',
      realtime:  true,
      tripId:    'trip-abc-123',
    });
  });

  it('returns empty array on network failure', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network'));
    const conns = await searchConnections('8000157', '8011160', '2026-05-11T12:00:00Z', 'train');
    expect(conns).toEqual([]);
  });
});
