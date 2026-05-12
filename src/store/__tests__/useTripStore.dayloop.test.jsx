import { renderHook, act } from '@testing-library/react';
import { TripStoreProvider, useTripStore } from '../useTripStore';

const wrapper = ({ children }) => <TripStoreProvider>{children}</TripStoreProvider>;

describe('DayLoop store actions', () => {
  it('addDayLoop creates a day loop with correct shape', () => {
    const { result } = renderHook(() => useTripStore(), { wrapper });
    act(() => {
      result.current.addDayLoop({
        date: '2026-05-16',
        homebaseStayId: 'stay-1',
        planningMode: 'semi',
      });
    });
    expect(result.current.dayLoops).toHaveLength(1);
    const loop = result.current.dayLoops[0];
    expect(loop.date).toBe('2026-05-16');
    expect(loop.homebaseStayId).toBe('stay-1');
    expect(loop.stopIds).toEqual([]);
    expect(loop.autoLegIds).toEqual([]);
    expect(loop.id).toBeTruthy();
  });

  it('addStopToDayLoop appends stopId in order', () => {
    const { result } = renderHook(() => useTripStore(), { wrapper });
    act(() => {
      result.current.addDayLoop({ date: '2026-05-16', homebaseStayId: 'stay-1' });
    });
    const loopId = result.current.dayLoops[0].id;
    act(() => {
      result.current.addStopToDayLoop(loopId, { id: 'poi-1', name: 'Kunsthalle', coords: [53.56, 9.99], category: 'museum' });
    });
    expect(result.current.dayLoops[0].stopIds).toEqual(['poi-1']);
    expect(result.current.pois.find(p => p.id === 'poi-1')).toBeTruthy();
  });

  it('setAutoLegs replaces only homebase-engine legs for that dayLoop', () => {
    const { result } = renderHook(() => useTripStore(), { wrapper });
    act(() => {
      result.current.addDayLoop({ date: '2026-05-16', homebaseStayId: 'stay-1' });
    });
    const loopId = result.current.dayLoops[0].id;
    const newLegs = [
      { id: 'leg-a1', from: 'Hotel', to: 'Museum', mode: 'foot', source: 'homebase-engine', dayLoopId: loopId },
    ];
    act(() => {
      result.current.setAutoLegs(loopId, newLegs);
    });
    expect(result.current.dayLoops[0].autoLegIds).toEqual(['leg-a1']);
    expect(result.current.legs.find(l => l.id === 'leg-a1')).toBeTruthy();
  });

  it('trip.planningMode defaults to semi', () => {
    const { result } = renderHook(() => useTripStore(), { wrapper });
    expect(result.current.trip.planningMode).toBe('semi');
  });

  it('setTripPlanningMode updates trip.planningMode', () => {
    const { result } = renderHook(() => useTripStore(), { wrapper });
    act(() => { result.current.setTripPlanningMode('full'); });
    expect(result.current.trip.planningMode).toBe('full');
  });
});
