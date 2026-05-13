import { describe, it, expect, vi, beforeEach } from 'vitest';
import { upsertRoute } from '../lib/upsertRoute.js';

function makeMockSupabase(scenario = 'happy') {
  const calls = { upsert: [], delete: [], insert: [], select: [] };

  const fromHandlers = {
    pro_paths: {
      upsert: vi.fn((row, opts) => {
        calls.upsert.push({ row, opts });
        return {
          select: () => ({
            single: async () => {
              if (scenario === 'upsert_fail') return { data: null, error: { message: 'boom' } };
              return { data: { id: 'fake-uuid', slug: row.slug }, error: null };
            },
          }),
        };
      }),
    },
    pro_path_waypoints: {
      delete: vi.fn(() => {
        calls.delete.push(true);
        return {
          eq: async () => ({ error: null }),
        };
      }),
      insert: vi.fn(async (rows) => {
        calls.insert.push(rows);
        return { error: null };
      }),
    },
  };

  const supabase = {
    from: (table) => fromHandlers[table],
  };
  return { supabase, calls, fromHandlers };
}

describe('upsertRoute', () => {
  beforeEach(() => vi.clearAllMocks());

  it('upserts pro_paths by slug, then deletes + inserts waypoints', async () => {
    const { supabase, calls } = makeMockSupabase();
    const result = await upsertRoute({
      supabase,
      row: { slug: 'camino', name: 'Camino', theme_category: 'historical' },
      waypoints: [
        { ord: 0, lat: 42.7, lon: -7.4, name: 'Sarria' },
        { ord: 1, lat: 42.8, lon: -8.5, name: 'Santiago' },
      ],
    });

    expect(result).toEqual({ id: 'fake-uuid', slug: 'camino' });
    expect(calls.upsert).toHaveLength(1);
    expect(calls.upsert[0].row.slug).toBe('camino');
    expect(calls.delete).toHaveLength(1);
    expect(calls.insert).toHaveLength(1);
    expect(calls.insert[0]).toHaveLength(2);
    expect(calls.insert[0][0]).toMatchObject({ path_id: 'fake-uuid', ord: 0, name: 'Sarria' });
  });

  it('passes onConflict: slug to the upsert call', async () => {
    const { supabase, calls } = makeMockSupabase();
    await upsertRoute({
      supabase,
      row: { slug: 'x', name: 'X' },
      waypoints: [],
    });
    expect(calls.upsert[0].opts).toEqual({ onConflict: 'slug' });
  });

  it('skips the waypoints delete+insert when waypoints array is empty', async () => {
    const { supabase, calls } = makeMockSupabase();
    await upsertRoute({
      supabase,
      row: { slug: 'x', name: 'X' },
      waypoints: [],
    });
    expect(calls.delete).toHaveLength(0);
    expect(calls.insert).toHaveLength(0);
  });

  it('throws when pro_paths upsert errors', async () => {
    const { supabase } = makeMockSupabase('upsert_fail');
    await expect(
      upsertRoute({ supabase, row: { slug: 'x' }, waypoints: [] })
    ).rejects.toThrow(/boom/);
  });
});
