import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/supabase/client', () => ({ createClient: () => ({}) }));

vi.mock('./enrichmentCache', async (importOriginal) => {
  return importOriginal();
});

import { _isFresh, _buildRecord } from './enrichmentCache';

describe('_isFresh', () => {
  it('returns true when fetched_at is within 30 days', () => {
    const record = { fetched_at: new Date().toISOString(), qid: 'Q1', description: 'test', instance_of: 'place', image_url: null };
    expect(_isFresh(record)).toBe(true);
  });

  it('returns false when fetched_at is older than 30 days', () => {
    const old = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
    const record = { fetched_at: old, qid: 'Q1', description: 'test', instance_of: 'place', image_url: null };
    expect(_isFresh(record)).toBe(false);
  });
});

describe('_buildRecord', () => {
  it('produces a record with poi_id and fetched_at', () => {
    const enrichment = { qid: 'Q99', description: 'A place', instance_of: 'museum', image_url: null };
    const record = _buildRecord('osm_123', enrichment);
    expect(record.poi_id).toBe('osm_123');
    expect(record.wikidata_qid).toBe('Q99');
    expect(record.fetched_at).toBeTruthy();
  });
});
