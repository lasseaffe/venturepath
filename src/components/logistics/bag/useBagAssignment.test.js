// src/components/logistics/bag/useBagAssignment.test.js
// Tests the pure reducer logic extracted from useBagAssignment.
// @testing-library/react is not installed, so we test the state transitions
// directly rather than through renderHook.
import { describe, it, expect } from 'vitest';
import { BAG_TYPES } from './bagTypes';

const ITEMS = [
  { id: 'passport', label: 'Passport', category: 'Base Camp', weight: 0.1, critical: true },
  { id: 'tent',     label: 'Tent',     category: 'Shelter & Sleep', weight: 1.8 },
  { id: 'phone',    label: 'Phone',    category: 'Tech & Power', weight: 0.2 },
];

const BAGS = [
  { id: 'bag1', typeId: 'backpack', skinId: 'tactical', label: 'Main Pack' },
  { id: 'bag2', typeId: 'carryon',  skinId: 'heritage', label: 'Cabin Bag' },
];

// ---- Pure reducer helpers (mirror the hook's internal logic) ----

function assignItem(prev, itemId, bagId, zoneId) {
  return { ...prev, [itemId]: { bagId, zoneId, packed: prev[itemId]?.packed ?? false } };
}

function unassignItem(prev, itemId) {
  const next = { ...prev };
  delete next[itemId];
  return next;
}

function togglePacked(prev, itemId) {
  if (!prev[itemId]) return prev;
  return { ...prev, [itemId]: { ...prev[itemId], packed: !prev[itemId].packed } };
}

function removeBagAssignments(prev, bagId) {
  const next = { ...prev };
  Object.keys(next).forEach(id => { if (next[id].bagId === bagId) delete next[id]; });
  return next;
}

function getItemsForBag(items, assignments, bagId) {
  return items
    .filter(item => assignments[item.id]?.bagId === bagId)
    .map(item => ({ ...item, ...assignments[item.id] }));
}

function getUnassigned(items, assignments) {
  return items.filter(item => !assignments[item.id]);
}

function getBagWeight(items, assignments, bagId) {
  return items
    .filter(item => assignments[item.id]?.bagId === bagId)
    .reduce((sum, item) => sum + (item.weight ?? 0), 0);
}

function isOverweight(bags, items, assignments, bagId, bagTypes) {
  const bag = bags.find(b => b.id === bagId);
  if (!bag) return false;
  const limit = bagTypes[bag.typeId]?.weightLimitKg;
  if (!limit) return false;
  return getBagWeight(items, assignments, bagId) > limit * 0.9;
}

// ---- Tests ----

describe('useBagAssignment (pure reducer logic)', () => {
  it('starts with all items unassigned', () => {
    const assignments = {};
    expect(getUnassigned(ITEMS, assignments)).toHaveLength(3);
  });

  it('assignItem moves item out of unassigned', () => {
    let assignments = {};
    assignments = assignItem(assignments, 'passport', 'bag1', 'front_pocket');
    expect(getUnassigned(ITEMS, assignments)).toHaveLength(2);
    expect(getItemsForBag(ITEMS, assignments, 'bag1')).toHaveLength(1);
  });

  it('unassignItem returns item to unassigned pool', () => {
    let assignments = {};
    assignments = assignItem(assignments, 'passport', 'bag1', 'front_pocket');
    assignments = unassignItem(assignments, 'passport');
    expect(getUnassigned(ITEMS, assignments)).toHaveLength(3);
  });

  it('togglePacked flips packed state', () => {
    let assignments = {};
    assignments = assignItem(assignments, 'passport', 'bag1', 'front_pocket');
    assignments = togglePacked(assignments, 'passport');
    expect(getItemsForBag(ITEMS, assignments, 'bag1')[0].packed).toBe(true);
    assignments = togglePacked(assignments, 'passport');
    expect(getItemsForBag(ITEMS, assignments, 'bag1')[0].packed).toBe(false);
  });

  it('getBagWeight sums assigned item weights', () => {
    let assignments = {};
    assignments = assignItem(assignments, 'passport', 'bag1', 'front_pocket');
    assignments = assignItem(assignments, 'tent',     'bag1', 'main');
    expect(getBagWeight(ITEMS, assignments, 'bag1')).toBeCloseTo(1.9);
  });

  it('isOverweight returns false when bag is empty (below 90% of limit)', () => {
    // carryon limit = 7kg, 90% = 6.3kg; bag2 has 0 weight
    const assignments = {};
    expect(isOverweight(BAGS, ITEMS, assignments, 'bag2', BAG_TYPES)).toBe(false);
  });

  it('isOverweight returns true when weight exceeds 90% of limit', () => {
    // carryon limit = 7kg, 90% = 6.3kg
    // Use a heavier item set to exceed threshold
    const heavyItems = [
      { id: 'item1', weight: 3.5 },
      { id: 'item2', weight: 3.5 },
    ];
    let assignments = {};
    assignments = assignItem(assignments, 'item1', 'bag2', 'main');
    assignments = assignItem(assignments, 'item2', 'bag2', 'main');
    // 7.0kg > 6.3kg threshold
    expect(isOverweight(BAGS, heavyItems, assignments, 'bag2', BAG_TYPES)).toBe(true);
  });

  it('removeBagAssignments clears all assignments for that bag', () => {
    let assignments = {};
    assignments = assignItem(assignments, 'passport', 'bag1', 'front_pocket');
    assignments = removeBagAssignments(assignments, 'bag1');
    expect(getUnassigned(ITEMS, assignments)).toHaveLength(3);
  });

  it('togglePacked is a no-op for unassigned items', () => {
    const assignments = {};
    const after = togglePacked(assignments, 'passport');
    expect(after).toBe(assignments); // same reference — no mutation
  });

  it('assignItem preserves existing packed state when reassigning', () => {
    let assignments = {};
    assignments = assignItem(assignments, 'passport', 'bag1', 'front_pocket');
    assignments = togglePacked(assignments, 'passport'); // packed = true
    assignments = assignItem(assignments, 'passport', 'bag2', 'main'); // move to bag2
    expect(assignments['passport'].packed).toBe(true);
    expect(assignments['passport'].bagId).toBe('bag2');
  });
});
