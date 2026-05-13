import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAdminLog } from '../useAdminLog';

describe('useAdminLog', () => {
  it('starts with empty lines and running=false', () => {
    const { result } = renderHook(() => useAdminLog());
    expect(result.current.lines).toEqual([]);
    expect(result.current.running).toBe(false);
  });

  it('push appends a line with type, message, and ts', () => {
    const { result } = renderHook(() => useAdminLog());
    act(() => result.current.push('done', 'all good'));
    expect(result.current.lines).toHaveLength(1);
    expect(result.current.lines[0].type).toBe('done');
    expect(result.current.lines[0].message).toBe('all good');
    expect(result.current.lines[0].ts).toMatch(/^\d{4}-/);
  });

  it('clear empties all lines', () => {
    const { result } = renderHook(() => useAdminLog());
    act(() => { result.current.push('done', 'a'); result.current.push('error', 'b'); });
    act(() => result.current.clear());
    expect(result.current.lines).toEqual([]);
  });

  it('setRunning toggles running state', () => {
    const { result } = renderHook(() => useAdminLog());
    act(() => result.current.setRunning(true));
    expect(result.current.running).toBe(true);
    act(() => result.current.setRunning(false));
    expect(result.current.running).toBe(false);
  });
});
