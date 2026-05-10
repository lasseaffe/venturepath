import { describe, it, expect } from 'vitest';
import { filterOtmResults } from './foursquareEngine';

describe('filterOtmResults', () => {
  it('removes results whose kinds include monuments_and_memorials', () => {
    const input = [
      { id: 'a', name: 'Stolperstein dedicated to Max', kinds: 'historic,monuments_and_memorials,burial_places,interesting_places' },
      { id: 'b', name: 'Dominikanerkloster', kinds: 'religion,monasteries,interesting_places' },
    ];
    const out = filterOtmResults(input);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('b');
  });

  it('removes results whose kinds include other_burial_places', () => {
    const input = [
      { id: 'a', name: 'Grave marker', kinds: 'other_burial_places,interesting_places' },
      { id: 'b', name: 'Eiffel Tower',  kinds: 'architecture,interesting_places' },
    ];
    const out = filterOtmResults(input);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('b');
  });

  it('passes through results with no blocked kinds', () => {
    const input = [
      { id: 'a', name: 'Park', kinds: 'natural,interesting_places' },
      { id: 'b', name: 'Café', kinds: 'foods' },
    ];
    expect(filterOtmResults(input)).toHaveLength(2);
  });

  it('returns empty array for empty input', () => {
    expect(filterOtmResults([])).toEqual([]);
  });

  it('removes results whose kinds include only burial_places (parent kind without child kind)', () => {
    const input = [
      { id: 'a', name: 'Grave plot', kinds: 'burial_places,interesting_places' },
      { id: 'b', name: 'Museum',     kinds: 'cultural,museums,interesting_places' },
    ];
    const out = filterOtmResults(input);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('b');
  });
});
