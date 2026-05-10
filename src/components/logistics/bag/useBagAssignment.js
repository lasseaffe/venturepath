// src/components/logistics/bag/useBagAssignment.js
import { useState, useCallback } from 'react';

// itemAssignments shape: { [itemId]: { bagId, zoneId, packed } }
// items with no entry are "unassigned"

export default function useBagAssignment(items, bags) {
  const [itemAssignments, setItemAssignments] = useState({});

  const assignItem = useCallback((itemId, bagId, zoneId) => {
    setItemAssignments(prev => ({
      ...prev,
      [itemId]: { bagId, zoneId, packed: prev[itemId]?.packed ?? false },
    }));
  }, []);

  const unassignItem = useCallback((itemId) => {
    setItemAssignments(prev => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
  }, []);

  const togglePacked = useCallback((itemId) => {
    setItemAssignments(prev => {
      if (!prev[itemId]) return prev;
      return { ...prev, [itemId]: { ...prev[itemId], packed: !prev[itemId].packed } };
    });
  }, []);

  const removeBagAssignments = useCallback((bagId) => {
    setItemAssignments(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(id => {
        if (next[id].bagId === bagId) delete next[id];
      });
      return next;
    });
  }, []);

  const getItemsForBag = useCallback((bagId) => {
    return items
      .filter(item => itemAssignments[item.id]?.bagId === bagId)
      .map(item => ({ ...item, ...itemAssignments[item.id] }));
  }, [items, itemAssignments]);

  const getUnassigned = useCallback(() => {
    return items.filter(item => !itemAssignments[item.id]);
  }, [items, itemAssignments]);

  const getBagWeight = useCallback((bagId) => {
    return items
      .filter(item => itemAssignments[item.id]?.bagId === bagId)
      .reduce((sum, item) => sum + (item.weight ?? 0), 0);
  }, [items, itemAssignments]);

  const isOverweight = useCallback((bagId, bagTypes) => {
    const bag = bags.find(b => b.id === bagId);
    if (!bag) return false;
    const limit = bagTypes[bag.typeId]?.weightLimitKg;
    if (!limit) return false;
    return getBagWeight(bagId) > limit * 0.9;
  }, [bags, getBagWeight]);

  return {
    itemAssignments,
    assignItem,
    unassignItem,
    togglePacked,
    removeBagAssignments,
    getItemsForBag,
    getUnassigned,
    getBagWeight,
    isOverweight,
  };
}
