import { describe, it, expect } from 'vitest';
import { filterByAllowedClass } from './geocodeEngine';

describe('filterByAllowedClass', () => {
  it('keeps results whose class is in the allowlist', () => {
    const input = [
      { id: 1, name: 'Landungsbrücken', class: 'railway' },
      { id: 2, name: 'Café Central',    class: 'amenity' },
      { id: 3, name: 'Altona',          class: 'place' },
    ];
    expect(filterByAllowedClass(input)).toHaveLength(3);
  });

  it('removes results whose class is not in the allowlist', () => {
    const input = [
      { id: 1, name: 'Stolperstein dedicated to Max', class: 'historic' },
      { id: 2, name: 'Boundary marker',               class: 'man_made' },
      { id: 3, name: 'Landungsbrücken',                class: 'railway' },
    ];
    const out = filterByAllowedClass(input);
    expect(out).toHaveLength(1);
    expect(out[0].name).toBe('Landungsbrücken');
  });

  it('keeps results with no class field (unknown = pass through)', () => {
    const input = [{ id: 1, name: 'Mystery Place' }];
    expect(filterByAllowedClass(input)).toHaveLength(1);
  });

  it('returns empty array for empty input', () => {
    expect(filterByAllowedClass([])).toEqual([]);
  });
});
