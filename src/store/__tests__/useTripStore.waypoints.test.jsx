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

  it('updateWaypoint patches a waypoint in place', () => {
    const { result } = renderHook(() => useTripStore(), { wrapper });
    const legId = result.current.legs[0].id;
    act(() => result.current.addWaypoint(legId, {
      category: 'fuel', name: 'Shell A8', coords: [48.1, 11.6], kmFromStart: 42,
    }));
    const wpId = result.current.legs.find(l => l.id === legId).waypoints[0].id;
    act(() => result.current.updateWaypoint(legId, wpId, { status: 'confirmed', estCost: 62 }));
    const wp = result.current.legs.find(l => l.id === legId).waypoints[0];
    expect(wp.status).toBe('confirmed');
    expect(wp.estCost).toBe(62);
    expect(wp.name).toBe('Shell A8');     // unchanged
  });

  it('removeWaypoint drops the waypoint', () => {
    const { result } = renderHook(() => useTripStore(), { wrapper });
    const legId = result.current.legs[0].id;
    act(() => result.current.addWaypoint(legId, {
      category: 'fuel', name: 'Shell A8', coords: [48.1, 11.6], kmFromStart: 42,
    }));
    const wpId = result.current.legs.find(l => l.id === legId).waypoints[0].id;
    act(() => result.current.removeWaypoint(legId, wpId));
    expect(result.current.legs.find(l => l.id === legId).waypoints).toHaveLength(0);
  });

  it('setLegMeta stores the mode-specific intelligence blob', () => {
    const { result } = renderHook(() => useTripStore(), { wrapper });
    const legId = result.current.legs[0].id;
    const meta = {
      tolls: { totalEst: 11.5, currency: 'EUR', byCountry: [{ cc: 'AT', amount: 11.5 }] },
      routeVariants: [],
      lastHydratedAt: '2026-05-12T10:00:00Z',
    };
    act(() => result.current.setLegMeta(legId, meta));
    expect(result.current.legs.find(l => l.id === legId).legMeta).toEqual(meta);
  });

  it('replaceLegRoute swaps polyline, waypoints, duration, and distance atomically', () => {
    const { result } = renderHook(() => useTripStore(), { wrapper });
    const legId = result.current.legs[0].id;
    // seed an existing waypoint that should be replaced
    act(() => result.current.addWaypoint(legId, {
      category: 'fuel', name: 'old', coords: [0,0], kmFromStart: 1,
    }));
    const newRoute = {
      polyline: [[48.1, 11.6], [48.2, 11.7]],
      waypoints: [
        { category: 'toll', name: 'A8 gantry', coords: [48.15, 11.65], kmFromStart: 8, estCost: 11.5, source: 'auto' },
      ],
      durationH: 1.7,
      distanceKm: 145,
    };
    act(() => result.current.replaceLegRoute(legId, newRoute));
    const leg = result.current.legs.find(l => l.id === legId);
    expect(leg.coords).toEqual(newRoute.polyline);
    expect(leg.durationH).toBe(1.7);
    expect(leg.distanceKm).toBe(145);
    expect(leg.waypoints).toHaveLength(1);
    expect(leg.waypoints[0].name).toBe('A8 gantry');
    expect(leg.waypoints[0].id).toBeTruthy();
    expect(leg.waypoints[0].legId).toBe(legId);
  });
});
