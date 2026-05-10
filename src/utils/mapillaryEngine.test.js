import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchStreetImage } from './mapillaryEngine';

beforeEach(() => { vi.restoreAllMocks(); });

describe('fetchStreetImage', () => {
  it('returns thumb_256_url when image found', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [{ id: 'img1', thumb_256_url: 'https://example.com/img.jpg' }] }),
    }));

    const result = await fetchStreetImage(48.8566, 2.3522);
    expect(result).toBe('https://example.com/img.jpg');
  });

  it('returns null when no images found within radius', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    }));

    const result = await fetchStreetImage(0, 0);
    expect(result).toBeNull();
  });

  it('returns null on network failure without throwing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new Error('network')));
    const result = await fetchStreetImage(48.8566, 2.3522);
    expect(result).toBeNull();
  });

  it('returns null when token is missing', async () => {
    const original = import.meta.env.VITE_MAPILLARY_TOKEN;
    import.meta.env.VITE_MAPILLARY_TOKEN = '';
    const result = await fetchStreetImage(48.8566, 2.3522);
    import.meta.env.VITE_MAPILLARY_TOKEN = original;
    expect(result).toBeNull();
  });

  it('returns null on non-ok HTTP response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({ ok: false, json: async () => ({}) }));
    const result = await fetchStreetImage(48.8566, 2.3522);
    expect(result).toBeNull();
  });
});
