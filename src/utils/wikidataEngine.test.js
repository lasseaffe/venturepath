import { describe, it, expect, vi, beforeEach } from 'vitest';
import { wikidataFetch } from './wikidataEngine';

beforeEach(() => vi.restoreAllMocks());

const mockSearch = (qid) => ({
  ok: true,
  json: async () => ({
    search: qid ? [{ id: qid, label: 'Test Place', description: 'A test place' }] : [],
  }),
});

const mockEntity = (qid) => ({
  ok: true,
  json: async () => ({
    entities: {
      [qid]: {
        id: qid,
        descriptions: { en: { value: '14th-century Gothic cathedral' } },
        claims: {
          P31: [{ mainsnak: { datavalue: { value: { id: 'Q2977' } } } }],
          P18: [{ mainsnak: { datavalue: { value: 'Prague_Cathedral.jpg' } } }],
        },
        labels: { en: { value: 'St. Vitus Cathedral' } },
      },
    },
  }),
});

const mockLabel = {
  ok: true,
  json: async () => ({
    entities: { Q2977: { labels: { en: { value: 'cathedral' } } } },
  }),
};

describe('wikidataFetch', () => {
  it('returns null when search finds no results', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(mockSearch(null)));
    const result = await wikidataFetch('Nonexistent Place', { lat: 0, lng: 0 });
    expect(result).toBeNull();
  });

  it('returns enrichment shape on successful lookup', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(mockSearch('Q12345'))
      .mockResolvedValueOnce(mockEntity('Q12345'))
      .mockResolvedValueOnce(mockLabel),
    );
    const result = await wikidataFetch('St. Vitus Cathedral', { lat: 50.09, lng: 14.4 });
    expect(result).toMatchObject({
      qid: 'Q12345',
      description: '14th-century Gothic cathedral',
      instance_of: 'cathedral',
    });
    expect(result.image_url).toContain('Prague_Cathedral.jpg');
  });

  it('returns null on fetch error — never throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new Error('network')));
    await expect(wikidataFetch('Any', { lat: 0, lng: 0 })).resolves.toBeNull();
  });
});
