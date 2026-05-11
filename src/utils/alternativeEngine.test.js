import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { findAlternatives } from './alternativeEngine';

const ROME2RIO_RESPONSE = {
  routes: [
    {
      name: 'Train',
      kind: 'train',
      duration: 141,
      distance: 289,
      segments: [{ kind: 'train', name: 'ICE 603', duration: 141 }],
      indicativePrice: { price: 89, currency: 'EUR' },
    },
    {
      name: 'Bus',
      kind: 'bus',
      duration: 300,
      distance: 295,
      segments: [{ kind: 'bus', name: 'FlixBus', duration: 300 }],
      indicativePrice: { price: 19, currency: 'EUR' },
    },
  ],
};

describe('findAlternatives', () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it('returns normalized alternatives from Rome2rio on success', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      json: async () => ROME2RIO_RESPONSE,
    });
    const alts = await findAlternatives(
      { lat: 53.553, lng: 10.007 },
      { lat: 52.525, lng: 13.369 },
      '2026-05-11T10:00:00Z'
    );
    expect(alts).toHaveLength(2);
    expect(alts[0]).toMatchObject({ label: 'Train', source: 'rome2rio', price: 89 });
  });

  it('falls back to DB-Rest journeys on Rome2rio 429', async () => {
    const DB_RESPONSE = {
      journeys: [
        {
          legs: [
            {
              origin:      { id: '8000157', name: 'Hamburg Hbf' },
              destination: { id: '8011160', name: 'Berlin Hbf'  },
              departure:   '2026-05-11T14:00:00+02:00',
              arrival:     '2026-05-11T16:21:00+02:00',
              line: { name: 'ICE 603', product: 'nationalExpress' },
              tripId: 'trip-abc',
            },
          ],
          price: null,
        },
      ],
    };
    global.fetch = vi.fn()
      // Rome2rio → 429
      .mockResolvedValueOnce({ status: 429, json: async () => ({}) })
      // stops/nearby for fromCoords
      .mockResolvedValueOnce({ json: async () => [{ id: '8000157', name: 'Hamburg Hbf' }] })
      // stops/nearby for toCoords
      .mockResolvedValueOnce({ json: async () => [{ id: '8011160', name: 'Berlin Hbf' }] })
      // journeys
      .mockResolvedValueOnce({ json: async () => DB_RESPONSE });

    const alts = await findAlternatives(
      { lat: 53.553, lng: 10.007 },
      { lat: 52.525, lng: 13.369 },
      '2026-05-11T10:00:00Z'
    );
    expect(alts).toHaveLength(1);
    expect(alts[0].source).toBe('db-rest');
  });

  it('returns empty array when both sources fail', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network'));
    const alts = await findAlternatives({ lat: 0, lng: 0 }, { lat: 1, lng: 1 }, '2026-05-11T10:00:00Z');
    expect(alts).toEqual([]);
  });
});
