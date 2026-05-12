import { renderHook, act } from '@testing-library/react';
import { TripStoreProvider, useTripStore } from '../useTripStore';

const wrapper = ({ children }) => <TripStoreProvider>{children}</TripStoreProvider>;

beforeEach(() => {
  localStorage.clear();
});

describe('useTripStore — waypoints', () => {
  it('legs default to an empty waypoints array', () => {
    const { result } = renderHook(() => useTripStore(), { wrapper });
    expect(result.current.legs[0].waypoints).toEqual([]);
  });

  it('addWaypoint appends a waypoint with generated id', () => {
    const { result } = renderHook(() => useTripStore(), { wrapper });
    const legId = result.current.legs[0].id;
    act(() => {
      result.current.addWaypoint(legId, {
        category: 'fuel', name: 'Shell A8',
        coords: [48.1, 11.6], kmFromStart: 42,
        source: 'auto', status: 'planned',
      });
    });
    const wps = result.current.legs.find(l => l.id === legId).waypoints;
    expect(wps).toHaveLength(1);
    expect(wps[0].id).toBeTruthy();
    expect(wps[0].name).toBe('Shell A8');
    expect(wps[0].legId).toBe(legId);
  });
});
