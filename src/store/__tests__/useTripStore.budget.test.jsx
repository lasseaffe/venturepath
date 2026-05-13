import { renderHook, act } from '@testing-library/react';
import { TripStoreProvider, useTripStore } from '../useTripStore';

beforeEach(() => localStorage.clear());

const wrapper = ({ children }) => <TripStoreProvider>{children}</TripStoreProvider>;

function addLegWithWaypoint(result) {
  act(() => {
    result.current.addLeg({ id: 99, from: 'A', to: 'B', mode: 'car', durationH: 2, distanceKm: 100, status: 'pending' });
  });
  act(() => {
    result.current.addWaypoint(99, {
      id: 'wp-toll-1',
      category: 'toll',
      name: 'A9 Gantry',
      kmFromStart: 30,
      estCost: 12.5,
      status: 'planned',
      source: 'auto',
      coords: [48.0, 11.5],
    });
  });
}

describe('budget auto-line-items', () => {
  it('adds a budget item when waypoint is confirmed with a cost', () => {
    const { result } = renderHook(() => useTripStore(), { wrapper });
    addLegWithWaypoint(result);
    act(() => {
      result.current.updateWaypoint(99, 'wp-toll-1', { status: 'confirmed' });
    });
    const item = result.current.budget.items.find(i => i.id === 'wp-toll-1');
    expect(item).toBeTruthy();
    expect(item.amount).toBe(12.5);
    expect(item.legId).toBe(99);
    expect(item.category).toBe('toll');
  });

  it('does NOT add duplicate budget item on second confirm', () => {
    const { result } = renderHook(() => useTripStore(), { wrapper });
    addLegWithWaypoint(result);
    act(() => {
      result.current.updateWaypoint(99, 'wp-toll-1', { status: 'confirmed' });
    });
    act(() => {
      result.current.updateWaypoint(99, 'wp-toll-1', { status: 'confirmed' });
    });
    const count = result.current.budget.items.filter(i => i.id === 'wp-toll-1').length;
    expect(count).toBe(1);
  });

  it('does NOT add budget item when estCost is 0', () => {
    const { result } = renderHook(() => useTripStore(), { wrapper });
    act(() => {
      result.current.addLeg({ id: 98, from: 'A', to: 'B', mode: 'foot', durationH: 3, distanceKm: 10, status: 'pending' });
    });
    act(() => {
      result.current.addWaypoint(98, {
        id: 'wp-rest-1',
        category: 'rest',
        name: 'Rest Area',
        kmFromStart: 10,
        estCost: 0,
        status: 'planned',
        source: 'auto',
      });
    });
    act(() => {
      result.current.updateWaypoint(98, 'wp-rest-1', { status: 'confirmed' });
    });
    const item = result.current.budget.items.find(i => i.id === 'wp-rest-1');
    expect(item).toBeUndefined();
  });

  it('does NOT add budget item when status is not confirmed', () => {
    const { result } = renderHook(() => useTripStore(), { wrapper });
    addLegWithWaypoint(result);
    act(() => {
      result.current.updateWaypoint(99, 'wp-toll-1', { status: 'skipped' });
    });
    expect(result.current.budget.items.find(i => i.id === 'wp-toll-1')).toBeUndefined();
  });

  it('budget total reflects the confirmed waypoint cost', () => {
    const { result } = renderHook(() => useTripStore(), { wrapper });
    addLegWithWaypoint(result);
    const initialTotal = result.current.budget.total;
    act(() => {
      result.current.updateWaypoint(99, 'wp-toll-1', { status: 'confirmed' });
    });
    expect(result.current.budget.total).toBe(initialTotal + 12.5);
  });
});
