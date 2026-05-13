import { renderHook, act } from '@testing-library/react';
import { TripStoreProvider, useTripStore } from '../useTripStore';

beforeEach(() => localStorage.clear());
const wrapper = ({ children }) => <TripStoreProvider>{children}</TripStoreProvider>;

describe('camping store actions', () => {
  it('ADD_STAY defaults kind to hotel', () => {
    const { result } = renderHook(() => useTripStore(), { wrapper });
    act(() => { result.current.addStay({ name: 'Sheraton' }); });
    expect(result.current.stays.at(-1).kind).toBe('hotel');
  });

  it('ADD_STAY preserves explicit kind', () => {
    const { result } = renderHook(() => useTripStore(), { wrapper });
    act(() => { result.current.addStay({ name: 'Wild camp', kind: 'wild' }); });
    expect(result.current.stays.at(-1).kind).toBe('wild');
  });

  it('setCampMeta sets campMeta on the stay', () => {
    const { result } = renderHook(() => useTripStore(), { wrapper });
    act(() => { result.current.addStay({ id: 'stay-c1', name: 'Campsite', kind: 'camp' }); });
    act(() => { result.current.setCampMeta('stay-c1', { bearCountry: true, siteType: 'tent' }); });
    const stay = result.current.stays.find(s => s.id === 'stay-c1');
    expect(stay.campMeta.bearCountry).toBe(true);
    expect(stay.campMeta.siteType).toBe('tent');
  });

  it('updateCampMeta patches campMeta fields without overwriting others', () => {
    const { result } = renderHook(() => useTripStore(), { wrapper });
    act(() => { result.current.addStay({ id: 'stay-c2', name: 'Wild Pitch', kind: 'wild' }); });
    act(() => { result.current.setCampMeta('stay-c2', { bearCountry: true, siteType: 'bivy' }); });
    act(() => { result.current.updateCampMeta('stay-c2', { siteType: 'hammock' }); });
    const stay = result.current.stays.find(s => s.id === 'stay-c2');
    expect(stay.campMeta.bearCountry).toBe(true);
    expect(stay.campMeta.siteType).toBe('hammock');
  });

  it('updateCampMeta works even with no prior campMeta', () => {
    const { result } = renderHook(() => useTripStore(), { wrapper });
    act(() => { result.current.addStay({ id: 'stay-c3', name: 'Shelter', kind: 'shelter' }); });
    act(() => { result.current.updateCampMeta('stay-c3', { sanitation: 'pack-out' }); });
    const stay = result.current.stays.find(s => s.id === 'stay-c3');
    expect(stay.campMeta.sanitation).toBe('pack-out');
  });
});
