import { describe, it, expect } from 'vitest';
import { POI_CATEGORIES, CATEGORY_IDS, categoryById, classifyPoi } from './poiCategories';
import { haversineKm } from './bearingEngine';

describe('POI_CATEGORIES', () => {
  it('has 8 categories', () => {
    expect(POI_CATEGORIES).toHaveLength(8);
  });

  it('every category has required fields', () => {
    for (const cat of POI_CATEGORIES) {
      expect(cat).toHaveProperty('id');
      expect(cat).toHaveProperty('label');
      expect(cat).toHaveProperty('icon');
      expect(cat).toHaveProperty('color');
      expect(cat).toHaveProperty('osmTags');
    }
  });
});

describe('CATEGORY_IDS', () => {
  it('contains all 8 IDs', () => {
    expect(CATEGORY_IDS).toHaveLength(8);
    expect(CATEGORY_IDS).toContain('water');
    expect(CATEGORY_IDS).toContain('food');
    expect(CATEGORY_IDS).toContain('medical');
  });
});

describe('categoryById', () => {
  it('returns the correct category', () => {
    expect(categoryById('water')?.label).toBe('Water');
  });

  it('returns null for unknown id', () => {
    expect(categoryById('unknown')).toBeNull();
  });
});

describe('classifyPoi', () => {
  it('classifies by OTM kind', () => {
    const poi = { kinds: 'foods', osmTags: {} };
    expect(classifyPoi(poi)).toBe('food');
  });

  it('classifies by OSM amenity string', () => {
    const poi = { kinds: '', osmTags: { amenity: 'pharmacy' } };
    expect(classifyPoi(poi)).toBe('medical');
  });

  it('classifies by OSM amenity array match', () => {
    const poi = { kinds: '', osmTags: { amenity: 'cafe' } };
    expect(classifyPoi(poi)).toBe('food');
  });

  it('classifies historic by wildcard tag', () => {
    const poi = { kinds: '', osmTags: { historic: 'castle' } };
    expect(classifyPoi(poi)).toBe('historic');
  });

  it('returns null when no match', () => {
    const poi = { kinds: '', osmTags: { natural: 'peak' } };
    expect(classifyPoi(poi)).toBeNull();
  });
});

describe('haversineKm', () => {
  it('returns ~0 for identical points', () => {
    expect(haversineKm({ lat: 48.86, lng: 2.35 }, { lat: 48.86, lng: 2.35 })).toBeCloseTo(0, 3);
  });

  it('returns ~111km for 1 degree latitude difference', () => {
    expect(haversineKm({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBeCloseTo(111.2, 0);
  });
});
