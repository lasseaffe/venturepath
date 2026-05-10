import { describe, it, expect, vi, beforeEach } from 'vitest';

// Capture the put/get store
let _stored = null;

vi.mock('./vpIntelligenceDB', () => ({
  openVpDB: vi.fn(() => Promise.resolve({
    transaction: (_storeName, _mode) => ({
      objectStore: () => ({
        get: (_key) => {
          const req = { result: _stored };
          setTimeout(() => req.onsuccess?.({ target: req }), 0);
          return req;
        },
        put: (record) => {
          _stored = record;
          const req = {};
          setTimeout(() => req.onsuccess?.(), 0);
          return req;
        },
      }),
    }),
  })),
  _resetDbCache: vi.fn(),
}));

vi.mock('./poiCategories', () => ({
  CATEGORY_IDS: ['water', 'food', 'shelter'],
}));

import { loadLayers, saveLayers } from './categoryLayerStore';

beforeEach(() => {
  _stored = null;
});

describe('loadLayers', () => {
  it('returns all categories active and empty presets when no record exists', async () => {
    const result = await loadLayers();
    expect(result.activeLayers).toEqual(['water', 'food', 'shelter']);
    expect(result.presets).toEqual([]);
  });
});

describe('saveLayers + loadLayers round-trip', () => {
  it('stores and retrieves active layers and presets', async () => {
    const presets = [{ id: 'p1', name: 'Test', activeLayers: ['water'], createdAt: 1 }];
    await saveLayers(['water', 'food'], presets);
    const result = await loadLayers();
    expect(result.activeLayers).toEqual(['water', 'food']);
    expect(result.presets).toHaveLength(1);
    expect(result.presets[0].name).toBe('Test');
  });
});
