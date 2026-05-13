import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../crossAppEmitter.js', () => ({
  emitCrossApp: vi.fn().mockResolvedValue(undefined),
}));

import { emitCrossApp } from '../crossAppEmitter.js';
import { emitLegConfirmed, emitCampPitched, emitExpeditionLogged } from '../streakEmitter.js';

const HF_STREAK_URL = 'http://localhost:3000/api/streak/tick';

describe('streakEmitter', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('emitLegConfirmed calls HF streak tick with leg_confirmed', async () => {
    await emitLegConfirmed({ legId: 3 });
    expect(emitCrossApp).toHaveBeenCalledWith(HF_STREAK_URL, expect.objectContaining({ action_id: 'leg_confirmed' }));
  });

  it('emitCampPitched calls HF streak tick with camp_pitched', async () => {
    await emitCampPitched({ stayId: 'abc' });
    expect(emitCrossApp).toHaveBeenCalledWith(HF_STREAK_URL, expect.objectContaining({ action_id: 'camp_pitched' }));
  });

  it('emitExpeditionLogged calls HF streak tick with expedition_logged', async () => {
    await emitExpeditionLogged({ tripName: 'Patagonia' });
    expect(emitCrossApp).toHaveBeenCalledWith(HF_STREAK_URL, expect.objectContaining({ action_id: 'expedition_logged' }));
  });

  it('emitLegConfirmed includes legId in payload', async () => {
    await emitLegConfirmed({ legId: 42 });
    const payload = emitCrossApp.mock.calls[0][1];
    expect(payload.metadata?.legId).toBe(42);
  });

  it('emitCampPitched includes stayId in payload', async () => {
    await emitCampPitched({ stayId: 'xyz' });
    const payload = emitCrossApp.mock.calls[0][1];
    expect(payload.metadata?.stayId).toBe('xyz');
  });
});
