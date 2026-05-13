import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { TripStoreProvider, useTripStore } from '../useTripStore';

function renderStore() {
  return renderHook(() => useTripStore(), { wrapper: TripStoreProvider });
}

describe('vault slice', () => {
  it('starts with empty vault', () => {
    const { result } = renderStore();
    expect(result.current.vault).toEqual([]);
  });

  it('addVaultFile adds a file entry', () => {
    const { result } = renderStore();
    act(() => result.current.addVaultFile({ name: 'trail.gpx', data: 'base64abc', mimeType: 'application/gpx+xml' }));
    expect(result.current.vault).toHaveLength(1);
    expect(result.current.vault[0].name).toBe('trail.gpx');
  });

  it('addVaultFile auto-assigns id', () => {
    const { result } = renderStore();
    act(() => result.current.addVaultFile({ name: 'trail.gpx', data: 'x', mimeType: 'application/gpx+xml' }));
    expect(result.current.vault[0].id).toBeTruthy();
  });

  it('addVaultFile stores uploadedAt timestamp', () => {
    const { result } = renderStore();
    const before = Date.now();
    act(() => result.current.addVaultFile({ name: 'x.gpx', data: 'y', mimeType: 'application/gpx+xml' }));
    const ts = new Date(result.current.vault[0].uploadedAt).getTime();
    expect(ts).toBeGreaterThanOrEqual(before);
  });

  it('addVaultFile allows multiple files', () => {
    const { result } = renderStore();
    act(() => {
      result.current.addVaultFile({ name: 'a.gpx', data: 'a', mimeType: 'application/gpx+xml' });
      result.current.addVaultFile({ name: 'b.gpx', data: 'b', mimeType: 'application/gpx+xml' });
    });
    expect(result.current.vault).toHaveLength(2);
  });
});
