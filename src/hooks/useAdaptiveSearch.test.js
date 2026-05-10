import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';

vi.mock('../utils/adaptiveSearchEngine', () => ({
  getInspireResults: vi.fn().mockResolvedValue([]),
  getAutocompleteResults: vi.fn().mockResolvedValue([]),
  tripTypeFromClimate: vi.fn().mockReturnValue('leisure'),
}));
vi.mock('../utils/geocodeEngine', () => ({
  geocodeLocation: vi.fn().mockResolvedValue({ lat: 48.8566, lng: 2.3522 }),
}));
vi.mock('../utils/mapillaryEngine', () => ({
  fetchStreetImage: vi.fn().mockResolvedValue(null),
}));
vi.mock('../store/useTripStore', () => ({
  useTripStore: () => ({
    trip: { destination: 'Paris', climate: 'temperate' },
    legs: [{ id: 1, status: 'pending', coords: { lat: 48.86, lng: 2.35 } }],
    userRole: 'LEADER',
  }),
}));

import { getInspireResults, getAutocompleteResults } from '../utils/adaptiveSearchEngine';

const mockStrategy = {
  inspireQuery: { filters: ['amenity=cafe'] },
  filterMask: ['amenity=cafe'],
  resultActions: ['Save POI'],
  placeholder: 'Find stops…',
};

function wrapper({ children }) {
  return children;
}

import { useAdaptiveSearch } from '../hooks/useAdaptiveSearch';

describe('useAdaptiveSearch', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('starts with empty query, results, and inspireResults', () => {
    const { result } = renderHook(() => useAdaptiveSearch(mockStrategy, 'Paris', 'LEADER', 'temperate'), { wrapper });
    expect(result.current.query).toBe('');
    expect(result.current.results).toEqual([]);
    expect(result.current.inspireResults).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('calls getInspireResults on handleFocus when query is empty', async () => {
    const { result } = renderHook(() => useAdaptiveSearch(mockStrategy, 'Paris', 'LEADER', 'temperate'), { wrapper });
    await act(async () => { result.current.handleFocus(); });
    expect(getInspireResults).toHaveBeenCalledWith(mockStrategy, 'Paris', expect.any(Object));
  });

  it('does not call getInspireResults on handleFocus when query is non-empty', async () => {
    const { result } = renderHook(() => useAdaptiveSearch(mockStrategy, 'Paris', 'LEADER', 'temperate'), { wrapper });
    await act(async () => { result.current.setQuery('cafe'); });
    vi.clearAllMocks();
    await act(async () => { result.current.handleFocus(); });
    expect(getInspireResults).not.toHaveBeenCalled();
  });

  it('clears results and inspireResults on handleBlur', async () => {
    getInspireResults.mockResolvedValueOnce([{ id: 'p1', name: 'A', coords: { lat: 0, lng: 0 }, osmTags: {}, category: 'cafe', address: '' }]);
    const { result } = renderHook(() => useAdaptiveSearch(mockStrategy, 'Paris', 'LEADER', 'temperate'), { wrapper });
    await act(async () => { result.current.handleFocus(); });
    expect(result.current.inspireResults.length).toBeGreaterThanOrEqual(0);
    act(() => { result.current.handleBlur(); });
    // handleBlur clears state asynchronously via setTimeout, wait for it
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 250)); });
    expect(result.current.results).toEqual([]);
    expect(result.current.inspireResults).toEqual([]);
  });

  it('openDetail sets detailPoi and detailActions', () => {
    const { result } = renderHook(() => useAdaptiveSearch(mockStrategy, 'Paris', 'LEADER', 'temperate'), { wrapper });
    const poi = { id: 'p1', name: 'Cafe', coords: { lat: 0, lng: 0 }, osmTags: {}, category: 'cafe', address: '' };
    act(() => { result.current.openDetail(poi, ['Save POI']); });
    expect(result.current.detailPoi).toEqual(poi);
    expect(result.current.detailActions).toEqual(['Save POI']);
  });

  it('closeDetail clears detailPoi', () => {
    const { result } = renderHook(() => useAdaptiveSearch(mockStrategy, 'Paris', 'LEADER', 'temperate'), { wrapper });
    const poi = { id: 'p1', name: 'Cafe', coords: { lat: 0, lng: 0 }, osmTags: {}, category: 'cafe', address: '' };
    act(() => { result.current.openDetail(poi, []); });
    act(() => { result.current.closeDetail(); });
    expect(result.current.detailPoi).toBeNull();
  });
});
