// src/components/logistics/bag/useBagAssignment.test.js
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useBagAssignment from './useBagAssignment';
import { BAG_TYPES } from './bagTypes';

const ITEMS = [
  { id: 'passport', label: 'Passport', category: 'Base Camp',      weight: 0.1, critical: true },
  { id: 'tent',     label: 'Tent',     category: 'Shelter & Sleep', weight: 1.8 },
  { id: 'phone',    label: 'Phone',    category: 'Tech & Power',    weight: 0.2 },
];

const BAGS = [
  { id: 'bag1', typeId: 'backpack', skinId: 'tactical', label: 'Main Pack' },
  { id: 'bag2', typeId: 'carryon',  skinId: 'heritage', label: 'Cabin Bag' },
];

describe('useBagAssignment', () => {
  it('starts with all items unassigned', () => {
    const { result } = renderHook(() => useBagAssignment(ITEMS, BAGS, BAG_TYPES));
    expect(result.current.getUnassigned()).toHaveLength(3);
  });

  it('assignItem moves item out of unassigned', () => {
    const { result } = renderHook(() => useBagAssignment(ITEMS, BAGS, BAG_TYPES));
    act(() => { result.current.assignItem('passport', 'bag1', 'front_pocket'); });
    expect(result.current.getUnassigned()).toHaveLength(2);
    expect(result.current.getItemsForBag('bag1')).toHaveLength(1);
  });

  it('unassignItem returns item to unassigned pool', () => {
    const { result } = renderHook(() => useBagAssignment(ITEMS, BAGS, BAG_TYPES));
    act(() => { result.current.assignItem('passport', 'bag1', 'front_pocket'); });
    act(() => { result.current.unassignItem('passport'); });
    expect(result.current.getUnassigned()).toHaveLength(3);
  });

  it('togglePacked flips packed state', () => {
    const { result } = renderHook(() => useBagAssignment(ITEMS, BAGS, BAG_TYPES));
    act(() => { result.current.assignItem('passport', 'bag1', 'front_pocket'); });
    act(() => { result.current.togglePacked('passport'); });
    expect(result.current.getItemsForBag('bag1')[0].packed).toBe(true);
    act(() => { result.current.togglePacked('passport'); });
    expect(result.current.getItemsForBag('bag1')[0].packed).toBe(false);
  });

  it('togglePacked is a no-op for unassigned items', () => {
    const { result } = renderHook(() => useBagAssignment(ITEMS, BAGS, BAG_TYPES));
    const before = result.current.itemAssignments;
    act(() => { result.current.togglePacked('passport'); });
    expect(result.current.itemAssignments).toBe(before);
  });

  it('getBagWeight sums assigned item weights', () => {
    const { result } = renderHook(() => useBagAssignment(ITEMS, BAGS, BAG_TYPES));
    act(() => { result.current.assignItem('passport', 'bag1', 'front_pocket'); });
    act(() => { result.current.assignItem('tent',     'bag1', 'main'); });
    expect(result.current.getBagWeight('bag1')).toBeCloseTo(1.9);
  });

  it('isOverweight returns false when under 90% of limit', () => {
    const { result } = renderHook(() => useBagAssignment(ITEMS, BAGS, BAG_TYPES));
    // bag2 = carryon, limit 7kg, 90% = 6.3kg. No items assigned → 0kg.
    expect(result.current.isOverweight('bag2')).toBe(false);
  });

  it('isOverweight returns true when exceeding 90% of limit', () => {
    // carryon limit = 7kg, threshold = 6.3kg
    // Assign tent (1.8kg) + phone (0.2kg) to bag2 = 2.0kg (under threshold)
    // Use 5 heavy items to exceed: create local items array
    const heavyItems = [
      { id: 'i1', label: 'A', category: 'Clothing', weight: 2.5 },
      { id: 'i2', label: 'B', category: 'Clothing', weight: 2.5 },
      { id: 'i3', label: 'C', category: 'Clothing', weight: 2.5 },
    ];
    const { result } = renderHook(() => useBagAssignment(heavyItems, BAGS, BAG_TYPES));
    act(() => { result.current.assignItem('i1', 'bag2', 'main'); });
    act(() => { result.current.assignItem('i2', 'bag2', 'main'); });
    act(() => { result.current.assignItem('i3', 'bag2', 'main'); });
    // 7.5kg > 6.3kg threshold
    expect(result.current.isOverweight('bag2')).toBe(true);
  });

  it('assignItem preserves packed state on reassignment', () => {
    const { result } = renderHook(() => useBagAssignment(ITEMS, BAGS, BAG_TYPES));
    act(() => { result.current.assignItem('passport', 'bag1', 'front_pocket'); });
    act(() => { result.current.togglePacked('passport'); });
    // Reassign to bag2 — packed should stay true
    act(() => { result.current.assignItem('passport', 'bag2', 'main'); });
    expect(result.current.getItemsForBag('bag2')[0].packed).toBe(true);
  });

  it('removeBagAssignments clears all assignments for that bag', () => {
    const { result } = renderHook(() => useBagAssignment(ITEMS, BAGS, BAG_TYPES));
    act(() => { result.current.assignItem('passport', 'bag1', 'front_pocket'); });
    act(() => { result.current.assignItem('tent',     'bag1', 'main'); });
    act(() => { result.current.removeBagAssignments('bag1'); });
    expect(result.current.getUnassigned()).toHaveLength(3);
  });
});
