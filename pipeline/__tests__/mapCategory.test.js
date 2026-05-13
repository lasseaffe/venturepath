import { describe, it, expect } from 'vitest';
import { mapCategory } from '../lib/mapCategory.js';

describe('mapCategory', () => {
  it.each([
    ['Water',          'water'],
    ['water',          'water'],
    ['Drinking Water', 'water'],
    ['Spring',         'water'],
    ['Viewpoint',      'view'],
    ['Scenic View',    'view'],
    ['Vista',          'view'],
    ['Permit',         'permit'],
    ['Permit Office',  'permit'],
    ['Transfer',       'transfer'],
    ['Resupply',       'resupply'],
    ['Shop',           'shop'],
    ['Food',           'food'],
    ['Fuel',           'fuel'],
    ['Border',         'border'],
    ['Toilet',         'toilet'],
  ])('maps %s -> %s', (input, expected) => {
    expect(mapCategory(input)).toBe(expected);
  });

  it('returns null for GPX <sym> values that are not in the VP taxonomy', () => {
    // These look like reasonable GPX <sym> values but the VP taxonomy does
    // not have categories for them yet. Spec 5 may add them later.
    expect(mapCategory('Trailhead')).toBeNull();
    expect(mapCategory('Summit')).toBeNull();
    expect(mapCategory('Peak')).toBeNull();
    expect(mapCategory('Town')).toBeNull();
    expect(mapCategory('Village')).toBeNull();
    expect(mapCategory('City')).toBeNull();
    expect(mapCategory('Shelter')).toBeNull();
    expect(mapCategory('Hut')).toBeNull();
    expect(mapCategory('Refuge')).toBeNull();
    expect(mapCategory('Camp')).toBeNull();
  });

  it('returns null for null input', () => {
    expect(mapCategory(null)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(mapCategory('')).toBeNull();
  });

  it('returns null for completely unknown values', () => {
    expect(mapCategory('Spaceship')).toBeNull();
    expect(mapCategory('Dragon')).toBeNull();
  });
});
