// src/components/logistics/PackingHudScreen.jsx
import { useState, useMemo, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion'; // eslint-disable-line no-unused-vars
import { generatePackingList } from '../../utils/packingLogic';
import { BAG_TYPES } from './bag/bagTypes';
import { DragProvider } from './bag/DragContext';
import useBagAssignment from './bag/useBagAssignment';
import BagHud from './BagHud';
import BagShelf from './bag/BagShelf';
import AddBagModal from './bag/AddBagModal';
import PackingChecklist from './PackingChecklist';
import { useTripStore } from '../../store/useTripStore';

export default function PackingHudScreen({
  climate = 'temperate',
  days = 7,
  hasChildren = false,
  poiTags = [],
  gatherings = [],
}) {
  const { trip } = useTripStore();
  const destination = trip?.destination ?? '';
  const [bags, setBags]                   = useState([]);
  const [activeBagId, setActiveBagId]     = useState(null);
  const [showAddModal, setShowAddModal]   = useState(false);
  const [flyTokens, setFlyTokens]         = useState([]);
  const [highlightedZone, setHighlightedZone] = useState(null);
  const [hoveredZone, setHoveredZone]     = useState(null);

  const bagRef = useRef(null);

  const { items } = useMemo(
    () => generatePackingList({ climate, days, hasChildren, poiTags }),
    [climate, days, hasChildren, poiTags],
  );

  const {
    itemAssignments,
    assignItem,
    removeBagAssignments,
    togglePacked,
    getItemsForBag,
    getUnassigned,
    getBagWeight,
    isOverweight,
  } = useBagAssignment(items, bags, BAG_TYPES);

  const activeBag     = bags.find(b => b.id === activeBagId) ?? null;
  const activeBagType = activeBag ? BAG_TYPES[activeBag.typeId] : null;

  // Items grouped by zone for the active bag — drives Bag2D zone badge counts
  const zoneMap = useMemo(() => {
    if (!activeBagId) return {};
    return getItemsForBag(activeBagId).reduce((acc, item) => {
      const z = item.zoneId;
      if (!acc[z]) acc[z] = [];
      acc[z].push(item);
      return acc;
    }, {});
  }, [activeBagId, getItemsForBag]);

  // Flat packed map for the active bag — drives Bag2D packed indicators
  const packedForActiveBag = useMemo(() => {
    if (!activeBagId) return {};
    return getItemsForBag(activeBagId).reduce((acc, item) => {
      acc[item.id] = item.packed ?? false;
      return acc;
    }, {});
  }, [activeBagId, getItemsForBag]);

  const handleAddBag = useCallback((bag) => {
    setBags(prev => [...prev, bag]);
    setActiveBagId(bag.id);
  }, []);

  const handleRemoveBag = useCallback((bagId) => {
    removeBagAssignments(bagId);
    setBags(prev => {
      const remaining = prev.filter(b => b.id !== bagId);
      setActiveBagId(cur => (cur === bagId ? (remaining[0]?.id ?? null) : cur));
      return remaining;
    });
  }, [removeBagAssignments]);

  // Called by DragProvider when an item is dropped onto a bag thumbnail or zone
  const handleItemDrop = useCallback((itemId, targetBagId) => {
    const targetBag = bags.find(b => b.id === targetBagId);
    const targetBagType = targetBag ? BAG_TYPES[targetBag.typeId] : null;
    if (!targetBagType) return;
    const item = items.find(i => i.id === itemId);
    const zoneId = targetBagType.defaultZoneForCategory(item?.category ?? '');
    assignItem(itemId, targetBagId, zoneId);
  }, [bags, items, assignItem]);

  const handleTogglePacked = useCallback((itemId, sourceRect) => {
    togglePacked(itemId);
    // Fly-token animation fires when packing (not unpacking)
    const bagRect = bagRef.current?.getBoundingClientRect();
    if (bagRect && sourceRect && !itemAssignments[itemId]?.packed) {
      const token = {
        id: `${itemId}-${Date.now()}`,
        startX: sourceRect.left + sourceRect.width / 2,
        startY: sourceRect.top  + sourceRect.height / 2,
        endX:   bagRect.left + bagRect.width / 2,
        endY:   bagRect.top  + bagRect.height / 2,
      };
      setFlyTokens(prev => [...prev, token]);
      setTimeout(() => setFlyTokens(prev => prev.filter(t => t.id !== token.id)), 600);
    }
  }, [togglePacked, itemAssignments]);

  const totalPacked = Object.values(itemAssignments).filter(a => a.packed).length;
  const totalWeight = bags.reduce((sum, b) => sum + getBagWeight(b.id), 0);

  return (
    <DragProvider onItemDrop={handleItemDrop}>
      <div className="tactical-panel p-5 flex flex-col gap-4">

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <h2 className="label-tag">Packing Manifest</h2>
          <span style={{ color: '#D9C5B2', fontSize: 9, fontFamily: 'JetBrains Mono, monospace' }}>
            TOTAL <span style={{ color: '#E67E22', fontWeight: 700 }}>{totalWeight.toFixed(1)} kg</span>
          </span>
          <span style={{ color: '#D9C5B2', fontSize: 9, fontFamily: 'JetBrains Mono, monospace' }}>
            STOWED <span style={{ color: '#E67E22', fontWeight: 700 }}>{totalPacked}/{items.length}</span>
          </span>
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              marginLeft: 'auto', background: 'none',
              border: '1px solid #E67E22', color: '#E67E22',
              fontSize: 8, fontFamily: 'JetBrains Mono, monospace',
              padding: '3px 10px', borderRadius: 3, cursor: 'pointer',
            }}
          >+ ADD BAG</button>
        </div>

        {/* Gathering gear sync notice */}
        {gatherings.length > 0 && (
          <div style={{
            padding: '8px 10px',
            background: 'rgba(230,126,34,0.06)',
            border: '1px solid rgba(230,126,34,0.3)',
            display: 'flex', alignItems: 'center', gap: 8,
            fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#E67E22',
          }}>
            <span>◈ {gatherings.length} Gathering{gatherings.length !== 1 ? 's' : ''} bound to this expedition — open each one's gear list to coordinate squad provisions</span>
          </div>
        )}

        {/* Empty state */}
        {bags.length === 0 && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: 12, padding: '60px 0',
            border: '1px dashed #2a2f33', borderRadius: 6,
          }}>
            <span style={{ fontSize: 36 }}>🎒</span>
            <div style={{ color: '#D9C5B2', fontFamily: 'JetBrains Mono, monospace', fontSize: 10 }}>
              No bags added to this expedition
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              style={{
                background: '#E67E22', border: 'none', color: '#0E1012',
                fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fontWeight: 700,
                padding: '6px 16px', borderRadius: 4, cursor: 'pointer',
              }}
            >ADD YOUR FIRST BAG</button>
          </div>
        )}

        {/* Bag shelf */}
        {bags.length > 0 && (
          <BagShelf
            bags={bags}
            activeBagId={activeBagId}
            getBagWeight={getBagWeight}
            isOverweight={isOverweight}
            onSelect={setActiveBagId}
            onAdd={() => setShowAddModal(true)}
          />
        )}

        {/* Expanded bag view */}
        {activeBag && activeBagType && (
          <div style={{ display: 'flex', minHeight: 480 }}>
            <div
              ref={bagRef}
              style={{ width: '40%', minHeight: 480, borderRight: '1px solid #1c2124', paddingRight: 14 }}
            >
              <BagHud
                bag={activeBag}
                bagType={activeBagType}
                zoneMap={zoneMap}
                packed={packedForActiveBag}
                destination={destination}
                onZoneClick={(zone) => {
                  setHighlightedZone(zone);
                  setTimeout(() => setHighlightedZone(null), 1500);
                }}
                onZoneHover={setHoveredZone}
                onRemove={() => handleRemoveBag(activeBag.id)}
              />
            </div>
            <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', paddingLeft: 14 }}>
              <PackingChecklist
                items={getItemsForBag(activeBagId)}
                unassignedItems={getUnassigned()}
                packed={packedForActiveBag}
                onToggle={handleTogglePacked}
                highlightedZone={highlightedZone}
                hoveredZone={hoveredZone}
                overweightBag={isOverweight(activeBagId)}
                activeBagType={activeBagType}
                activeBagLabel={activeBag.label || activeBagType.label}
                zoneMap={zoneMap}
              />
            </div>
          </div>
        )}

        {/* Fly-in token animation — preserved from original */}
        <AnimatePresence>
          {flyTokens.map(token => (
            <motion.div
              key={token.id}
              initial={{ x: token.startX, y: token.startY, opacity: 1, scale: 1 }}
              animate={{ x: token.endX,   y: token.endY,   opacity: 0, scale: 0.3 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.55, ease: 'easeIn' }}
              style={{
                position: 'fixed', width: 8, height: 8,
                borderRadius: '50%', background: '#E67E22',
                pointerEvents: 'none', zIndex: 999,
              }}
            />
          ))}
        </AnimatePresence>

        {showAddModal && (
          <AddBagModal onAdd={handleAddBag} onClose={() => setShowAddModal(false)} />
        )}
      </div>
    </DragProvider>
  );
}
