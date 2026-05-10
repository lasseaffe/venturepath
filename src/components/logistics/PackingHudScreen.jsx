// src/components/logistics/PackingHudScreen.jsx
import { useState, useMemo, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { generatePackingList } from '../../utils/packingLogic';
import BagHud from './BagHud';
import PackingChecklist from './PackingChecklist';

export default function PackingHudScreen({
  climate = 'temperate',
  days = 7,
  hasChildren = false,
  poiTags = [],
}) {
  const [packed, setPacked]       = useState({});
  const [viewMode, setViewMode]   = useState('2d');
  const [zoneMode, setZoneMode]   = useState('literal');
  const [flyTokens, setFlyTokens] = useState([]);

  const bagRef = useRef(null);

  const { items } = useMemo(
    () => generatePackingList({ climate, days, hasChildren, poiTags }),
    [climate, days, hasChildren, poiTags]
  );

  const handleToggle = useCallback((itemId, sourceRect) => {
    setPacked(prev => {
      const isNowPacked = !prev[itemId];

      if (isNowPacked) {
        const bagRect = bagRef.current?.getBoundingClientRect();
        if (bagRect) {
          const token = {
            id: `${itemId}-${Date.now()}`,
            startX: sourceRect.left - bagRect.left + sourceRect.width / 2,
            startY: sourceRect.top  - bagRect.top  + sourceRect.height / 2,
            endX: bagRect.width / 2,
            endY: bagRect.height / 2,
          };
          setFlyTokens(prev => [...prev, token]);
          setTimeout(() => {
            setFlyTokens(prev => prev.filter(t => t.id !== token.id));
          }, 600);
        }
      }

      return { ...prev, [itemId]: isNowPacked };
    });
  }, []);

  return (
    <div className="tactical-panel p-5 h-full flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="label-tag">Packing Manifest</h2>
        <span className="text-[10px] font-mono text-slate-500">
          {Object.values(packed).filter(Boolean).length}/{items.length} stowed
        </span>
      </div>

      <div className="flex gap-6 flex-1 min-h-0">
        <div ref={bagRef} className="relative w-2/5 shrink-0">
          <BagHud
            items={items}
            packed={packed}
            viewMode={viewMode}
            zoneMode={zoneMode}
            onViewMode={setViewMode}
            onZoneMode={setZoneMode}
          />

          <AnimatePresence>
            {flyTokens.map(token => (
              <motion.div
                key={token.id}
                className="absolute w-3 h-3 rounded-full bg-[#E67E22] pointer-events-none z-50"
                initial={{ x: token.startX, y: token.startY, opacity: 1, scale: 1 }}
                animate={{ x: token.endX, y: token.endY, opacity: 0, scale: 0.3 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: 'easeInOut' }}
              />
            ))}
          </AnimatePresence>
        </div>

        <div className="flex-1 min-w-0 overflow-hidden">
          <PackingChecklist
            items={items}
            packed={packed}
            onToggle={handleToggle}
          />
        </div>
      </div>
    </div>
  );
}
