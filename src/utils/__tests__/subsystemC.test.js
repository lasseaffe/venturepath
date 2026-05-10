/**
 * Subsystem C — comprehensive test suite
 * Covers: poiCategories, categoryLayerStore, useCategoryLayers hook
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─────────────────────────────────────────────────────────────────────────────
// 1. poiCategories.js
// ─────────────────────────────────────────────────────────────────────────────
import {
  POI_CATEGORIES,
  CATEGORY_IDS,
  categoryById,
  classifyPoi,
} from '../poiCategories';

describe('poiCategories — POI_CATEGORIES', () => {
  it('has 8 categories', () => {
    expect(POI_CATEGORIES).toHaveLength(8);
  });

  it('every category has id, label, icon, color, osmTags', () => {
    for (const cat of POI_CATEGORIES) {
      expect(cat).toHaveProperty('id');
      expect(cat).toHaveProperty('label');
      expect(cat).toHaveProperty('icon');
      expect(cat).toHaveProperty('color');
      expect(cat).toHaveProperty('osmTags');
    }
  });

  it('CATEGORY_IDS matches POI_CATEGORIES ids', () => {
    expect(CATEGORY_IDS).toEqual(POI_CATEGORIES.map(c => c.id));
  });

  it('CATEGORY_IDS has 8 entries', () => {
    expect(CATEGORY_IDS).toHaveLength(8);
  });
});

describe('poiCategories — categoryById', () => {
  it('returns correct category for "water"', () => {
    expect(categoryById('water').label).toBe('Water');
  });

  it('returns correct category for "food"', () => {
    expect(categoryById('food').label).toBe('Food');
  });

  it('returns correct category for "historic"', () => {
    expect(categoryById('historic').label).toBe('Historic');
  });

  it('returns null for unknown id', () => {
    expect(categoryById('unknown')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(categoryById('')).toBeNull();
  });
});

describe('poiCategories — classifyPoi', () => {
  it('classifies by otmKind "foods"', () => {
    expect(classifyPoi({ kinds: 'foods,restaurants', osmTags: {} })).toBe('food');
  });

  it('classifies by otmKind "cultural"', () => {
    expect(classifyPoi({ kinds: 'cultural,museums', osmTags: {} })).toBe('attraction');
  });

  it('classifies by otmKind "natural"', () => {
    expect(classifyPoi({ kinds: 'natural,parks', osmTags: {} })).toBe('nature');
  });

  it('classifies by otmKind "historic"', () => {
    expect(classifyPoi({ kinds: 'historic,ruins', osmTags: {} })).toBe('historic');
  });

  it('classifies by osmTags amenity=drinking_water', () => {
    expect(classifyPoi({ osmTags: { amenity: 'drinking_water' } })).toBe('water');
  });

  it('classifies by osmTags amenity=cafe (array match)', () => {
    expect(classifyPoi({ osmTags: { amenity: 'cafe' } })).toBe('food');
  });

  it('classifies by osmTags amenity=restaurant (array match)', () => {
    expect(classifyPoi({ osmTags: { amenity: 'restaurant' } })).toBe('food');
  });

  it('classifies by osmTags amenity=fast_food (array match)', () => {
    expect(classifyPoi({ osmTags: { amenity: 'fast_food' } })).toBe('food');
  });

  it('classifies by osmTags amenity=pharmacy', () => {
    expect(classifyPoi({ osmTags: { amenity: 'pharmacy' } })).toBe('medical');
  });

  it('classifies by osmTags amenity=shelter', () => {
    expect(classifyPoi({ osmTags: { amenity: 'shelter' } })).toBe('shelter');
  });

  it('classifies by osmTags shop=outdoor', () => {
    expect(classifyPoi({ osmTags: { shop: 'outdoor' } })).toBe('gear');
  });

  it('classifies by osmTags tourism=attraction', () => {
    expect(classifyPoi({ osmTags: { tourism: 'attraction' } })).toBe('attraction');
  });

  it('classifies by osmTags leisure=nature_reserve', () => {
    expect(classifyPoi({ osmTags: { leisure: 'nature_reserve' } })).toBe('nature');
  });

  it('classifies by wildcard historic=* for any historic value', () => {
    expect(classifyPoi({ osmTags: { historic: 'castle' } })).toBe('historic');
    expect(classifyPoi({ osmTags: { historic: 'monument' } })).toBe('historic');
    expect(classifyPoi({ osmTags: { historic: 'ruins' } })).toBe('historic');
  });

  it('returns null for unknown osmTags', () => {
    expect(classifyPoi({ osmTags: { amenity: 'bank' } })).toBeNull();
  });

  it('returns null for completely unknown poi', () => {
    expect(classifyPoi({ osmTags: { natural: 'peak' } })).toBeNull();
  });

  it('otmKind match takes priority over osmTags', () => {
    // kinds='foods' → 'food', but osmTags says historic → food wins (otmKind checked first)
    expect(classifyPoi({ kinds: 'foods', osmTags: { historic: 'castle' } })).toBe('food');
  });

  it('handles missing osmTags gracefully', () => {
    expect(classifyPoi({ kinds: '' })).toBeNull();
  });

  it('handles empty poi object', () => {
    expect(classifyPoi({})).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. categoryLayerStore.js  (IDB mocked via vi.mock)
// ─────────────────────────────────────────────────────────────────────────────

// We mock vpIntelligenceDB so tests don't need a real IDB environment.
// The mock stores data in a module-level variable that is reset per test.
let _idbRecord = null;

vi.mock('../vpIntelligenceDB', () => ({
  openVpDB: vi.fn(() =>
    Promise.resolve({
      transaction: (_storeName, _mode) => ({
        objectStore: () => ({
          get: (_key) => {
            const req = { result: _idbRecord };
            setTimeout(() => req.onsuccess?.({ target: req }), 0);
            return req;
          },
          put: (record) => {
            _idbRecord = record;
            const req = {};
            setTimeout(() => req.onsuccess?.(), 0);
            return req;
          },
        }),
      }),
    })
  ),
  _resetDbCache: vi.fn(),
}));

import { loadLayers, saveLayers } from '../categoryLayerStore';

describe('categoryLayerStore — loadLayers', () => {
  beforeEach(() => {
    _idbRecord = null;
  });

  it('returns default activeLayers (all 8 IDs) when no record exists', async () => {
    const { activeLayers } = await loadLayers();
    expect(activeLayers).toEqual(CATEGORY_IDS);
  });

  it('returns empty presets when no record exists', async () => {
    const { presets } = await loadLayers();
    expect(presets).toEqual([]);
  });

  it('returns stored activeLayers after saveLayers', async () => {
    await saveLayers(['water', 'food'], []);
    const { activeLayers } = await loadLayers();
    expect(activeLayers).toEqual(['water', 'food']);
  });

  it('round-trips activeLayers and presets correctly', async () => {
    const layers = ['water', 'food'];
    const presets = [{ id: 'p1', name: 'Test', activeLayers: ['water'], createdAt: 1234 }];
    await saveLayers(layers, presets);
    const result = await loadLayers();
    expect(result.activeLayers).toEqual(layers);
    expect(result.presets).toHaveLength(1);
    expect(result.presets[0].name).toBe('Test');
    expect(result.presets[0].id).toBe('p1');
  });

  it('round-trips multiple presets', async () => {
    const presets = [
      { id: 'p1', name: 'Preset A', activeLayers: ['water'], createdAt: 1 },
      { id: 'p2', name: 'Preset B', activeLayers: ['food', 'medical'], createdAt: 2 },
    ];
    await saveLayers(['water', 'food', 'medical'], presets);
    const result = await loadLayers();
    expect(result.presets).toHaveLength(2);
    expect(result.presets[1].name).toBe('Preset B');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. useCategoryLayers.js  (uses the same IDB mock above)
// ─────────────────────────────────────────────────────────────────────────────
import { renderHook, act } from '@testing-library/react';
import { useCategoryLayers } from '../useCategoryLayers';

describe('useCategoryLayers hook', () => {
  beforeEach(() => {
    _idbRecord = null;
  });

  async function waitForLoad(result) {
    await act(async () => {
      await new Promise(r => setTimeout(r, 50));
    });
    return result;
  }

  it('starts with all 8 categories active', async () => {
    const { result } = renderHook(() => useCategoryLayers());
    await waitForLoad(result);
    expect(result.current.activeLayers.size).toBe(8);
  });

  it('starts with empty presets', async () => {
    const { result } = renderHook(() => useCategoryLayers());
    await waitForLoad(result);
    expect(result.current.presets).toHaveLength(0);
  });

  it('toggle removes a category', async () => {
    const { result } = renderHook(() => useCategoryLayers());
    await waitForLoad(result);
    act(() => result.current.toggle('water'));
    expect(result.current.activeLayers.has('water')).toBe(false);
  });

  it('toggle re-adds a category', async () => {
    const { result } = renderHook(() => useCategoryLayers());
    await waitForLoad(result);
    act(() => result.current.toggle('water'));
    act(() => result.current.toggle('water'));
    expect(result.current.activeLayers.has('water')).toBe(true);
  });

  it('toggle does not affect other categories', async () => {
    const { result } = renderHook(() => useCategoryLayers());
    await waitForLoad(result);
    act(() => result.current.toggle('water'));
    expect(result.current.activeLayers.has('food')).toBe(true);
    expect(result.current.activeLayers.has('medical')).toBe(true);
  });

  it('isActive returns false after toggling off', async () => {
    const { result } = renderHook(() => useCategoryLayers());
    await waitForLoad(result);
    act(() => result.current.toggle('food'));
    expect(result.current.isActive('food')).toBe(false);
  });

  it('isActive returns true for active category', async () => {
    const { result } = renderHook(() => useCategoryLayers());
    await waitForLoad(result);
    expect(result.current.isActive('water')).toBe(true);
  });

  it('savePreset creates a named preset with current layers', async () => {
    const { result } = renderHook(() => useCategoryLayers());
    await waitForLoad(result);
    act(() => result.current.toggle('water'));
    act(() => result.current.savePreset('No Water'));
    expect(result.current.presets).toHaveLength(1);
    expect(result.current.presets[0].name).toBe('No Water');
    expect(result.current.presets[0].activeLayers).not.toContain('water');
  });

  it('savePreset stores a preset with id and createdAt', async () => {
    const { result } = renderHook(() => useCategoryLayers());
    await waitForLoad(result);
    act(() => result.current.savePreset('Quick Test'));
    const preset = result.current.presets[0];
    expect(preset).toHaveProperty('id');
    expect(preset).toHaveProperty('createdAt');
    expect(typeof preset.id).toBe('string');
    expect(typeof preset.createdAt).toBe('number');
  });

  it('savePreset ignores blank names', async () => {
    const { result } = renderHook(() => useCategoryLayers());
    await waitForLoad(result);
    act(() => result.current.savePreset('   '));
    expect(result.current.presets).toHaveLength(0);
  });

  it('savePreset ignores undefined name', async () => {
    const { result } = renderHook(() => useCategoryLayers());
    await waitForLoad(result);
    act(() => result.current.savePreset(undefined));
    expect(result.current.presets).toHaveLength(0);
  });

  it('can save multiple presets', async () => {
    const { result } = renderHook(() => useCategoryLayers());
    await waitForLoad(result);
    act(() => result.current.savePreset('First'));
    act(() => result.current.savePreset('Second'));
    expect(result.current.presets).toHaveLength(2);
  });

  it('loadPreset restores activeLayers from preset', async () => {
    const { result } = renderHook(() => useCategoryLayers());
    await waitForLoad(result);
    act(() => result.current.toggle('water'));
    act(() => result.current.savePreset('No Water'));
    act(() => result.current.toggle('water')); // re-enable water
    expect(result.current.activeLayers.has('water')).toBe(true);
    act(() => result.current.loadPreset(result.current.presets[0].id));
    expect(result.current.activeLayers.has('water')).toBe(false);
  });

  it('loadPreset with unknown id is a no-op', async () => {
    const { result } = renderHook(() => useCategoryLayers());
    await waitForLoad(result);
    const sizeBefore = result.current.activeLayers.size;
    act(() => result.current.loadPreset('nonexistent-id'));
    expect(result.current.activeLayers.size).toBe(sizeBefore);
  });

  it('deletePreset removes the preset', async () => {
    const { result } = renderHook(() => useCategoryLayers());
    await waitForLoad(result);
    act(() => result.current.savePreset('ToDelete'));
    expect(result.current.presets).toHaveLength(1);
    act(() => result.current.deletePreset(result.current.presets[0].id));
    expect(result.current.presets).toHaveLength(0);
  });

  it('deletePreset only removes the target preset', async () => {
    const { result } = renderHook(() => useCategoryLayers());
    await waitForLoad(result);
    act(() => result.current.savePreset('Keep'));
    act(() => result.current.savePreset('Remove'));
    const removeId = result.current.presets[1].id;
    act(() => result.current.deletePreset(removeId));
    expect(result.current.presets).toHaveLength(1);
    expect(result.current.presets[0].name).toBe('Keep');
  });

  it('deletePreset with unknown id is a no-op', async () => {
    const { result } = renderHook(() => useCategoryLayers());
    await waitForLoad(result);
    act(() => result.current.savePreset('Stable'));
    act(() => result.current.deletePreset('no-such-id'));
    expect(result.current.presets).toHaveLength(1);
  });
});
