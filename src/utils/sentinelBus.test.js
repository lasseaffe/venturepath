import { describe, it, expect, vi, beforeEach } from 'vitest';
import sentinelBus from './sentinelBus.js';

beforeEach(() => sentinelBus._reset());

describe('sentinelBus', () => {
  it('calls handler when event is emitted', () => {
    const handler = vi.fn();
    sentinelBus.on('HAZARD_UPDATED', handler);
    sentinelBus.emit('HAZARD_UPDATED', { hazards: [] });
    expect(handler).toHaveBeenCalledWith({ hazards: [] });
  });

  it('does not call handler after unsubscribe', () => {
    const handler = vi.fn();
    const unsub = sentinelBus.on('HAZARD_UPDATED', handler);
    unsub();
    sentinelBus.emit('HAZARD_UPDATED', { hazards: [] });
    expect(handler).not.toHaveBeenCalled();
  });

  it('supports multiple handlers for the same event', () => {
    const a = vi.fn();
    const b = vi.fn();
    sentinelBus.on('STOP_ADDED', a);
    sentinelBus.on('STOP_ADDED', b);
    sentinelBus.emit('STOP_ADDED', { stop: {}, legIndex: 0 });
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });

  it('does not call handler registered for different event', () => {
    const handler = vi.fn();
    sentinelBus.on('HAZARD_UPDATED', handler);
    sentinelBus.emit('STOP_ADDED', { stop: {}, legIndex: 0 });
    expect(handler).not.toHaveBeenCalled();
  });
});
