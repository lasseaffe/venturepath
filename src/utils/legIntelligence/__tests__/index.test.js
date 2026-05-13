import { describe, it, expect, vi } from 'vitest';

vi.mock('../engines/carEngine.js', () => ({
  hydrateCarLeg: vi.fn().mockResolvedValue({ legMeta: { tolls: {} }, waypoints: [{ id: 'w1' }] }),
}));

import { hydrateLeg } from '../index.js';

describe('hydrateLeg', () => {
  it('routes car leg to carEngine', async () => {
    const result = await hydrateLeg({ mode: 'car', fromCoords: [48.8, 2.3], toCoords: [51.5, 0.1] });
    expect(result.legMeta).toBeTruthy();
    expect(result.waypoints).toHaveLength(1);
  });

  it('returns null legMeta for unsupported mode', async () => {
    const result = await hydrateLeg({ mode: 'flight' });
    expect(result).toEqual({ legMeta: null, waypoints: [] });
  });

  it('returns null legMeta for undefined leg', async () => {
    const result = await hydrateLeg(undefined);
    expect(result).toEqual({ legMeta: null, waypoints: [] });
  });
});
