// src/utils/what3words.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { convertToW3W } from './what3words.js';

const MOCK_W3W_RESPONSE = {
  words: 'lock.spout.radar',
  country: 'GB',
  nearestPlace: 'Bayswater, London',
  map: 'https://w3w.co/lock.spout.radar',
};

describe('convertToW3W', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns words and country on success', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_W3W_RESPONSE,
    });

    const result = await convertToW3W(51.5074, -0.1278, 'test-key');
    expect(result).toEqual({
      words: 'lock.spout.radar',
      country: 'GB',
      nearestPlace: 'Bayswater, London',
      mapUrl: 'https://w3w.co/lock.spout.radar',
    });
  });

  it('builds the correct API URL', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_W3W_RESPONSE,
    });

    await convertToW3W(51.5074, -0.1278, 'test-key');
    const calledUrl = fetch.mock.calls[0][0];
    expect(calledUrl).toContain('51.5074,-0.1278');
    expect(calledUrl).toContain('key=test-key');
    expect(calledUrl).toContain('convert-to-3wa');
  });

  it('throws with a descriptive message when the API returns a non-ok status', async () => {
    fetch.mockResolvedValueOnce({ ok: false, status: 401 });
    await expect(convertToW3W(0, 0, 'bad-key')).rejects.toThrow('what3words API error: 401');
  });

  it('re-throws network errors from fetch', async () => {
    fetch.mockRejectedValueOnce(new Error('NetworkError when attempting to fetch resource'));
    await expect(convertToW3W(0, 0, 'key')).rejects.toThrow('NetworkError');
  });
});
