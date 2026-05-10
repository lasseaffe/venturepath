import { createContext, useContext, useState, useCallback } from 'react';
import { DndContext, PointerSensor, TouchSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core';

const Ctx = createContext(null);

export function useDragCtx() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useDragCtx must be used inside DragProvider');
  return ctx;
}

export function DragProvider({ children, onItemDrop }) {
  // Mobile tap-select: null | itemId
  const [mobileSelected, setMobileSelected] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 250, tolerance: 5 } }),
  );

  const handleDragEnd = useCallback(({ active, over }) => {
    if (over && active.id !== over.id) {
      // over.id is a bagId (drop targets are rendered with their bag id)
      onItemDrop(active.id, over.id);
    }
  }, [onItemDrop]);

  // Mobile: tap item → select; tap bag thumbnail → drop
  const handleMobileTap = useCallback((itemId) => {
    setMobileSelected(prev => prev === itemId ? null : itemId);
  }, []);

  const handleMobileDrop = useCallback((bagId) => {
    if (!mobileSelected) return;
    onItemDrop(mobileSelected, bagId);
    setMobileSelected(null);
  }, [mobileSelected, onItemDrop]);

  const clearMobileSelection = useCallback(() => setMobileSelected(null), []);

  return (
    <Ctx.Provider value={{ mobileSelected, handleMobileTap, handleMobileDrop, clearMobileSelection }}>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        {children}
      </DndContext>
    </Ctx.Provider>
  );
}
