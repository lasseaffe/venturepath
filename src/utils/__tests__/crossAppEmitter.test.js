import { describe, it, expect, vi, beforeEach } from 'vitest';
import { emitCrossApp } from '../crossAppEmitter.js';

describe('emitCrossApp', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('calls fetch with the given url and JSON body', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
    await emitCrossApp('http://localhost:3000/api/streak/tick', { action_id: 'leg_confirmed' });
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/streak/tick',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ action_id: 'leg_confirmed' }),
      })
    );
  });

  it('does not throw on network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));
    await expect(emitCrossApp('http://localhost:3000/api/streak/tick', {})).resolves.toBeUndefined();
  });

  it('does not throw on non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    await expect(emitCrossApp('http://localhost:3000/api/streak/tick', {})).resolves.toBeUndefined();
  });

  it('returns undefined always (fire and forget)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
    const result = await emitCrossApp('http://localhost:3000/test', { x: 1 });
    expect(result).toBeUndefined();
  });
});
