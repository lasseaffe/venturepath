// src/components/logistics/bag/BagShelf.jsx
import { useDroppable } from '@dnd-kit/core';
import { BAG_TYPES } from './bagTypes';
import { useDragCtx } from './DragContext';

function BagThumbnail({ bag, isActive, weight, isOverweight, onSelect }) {
  const { setNodeRef, isOver } = useDroppable({ id: bag.id });
  const { mobileSelected, handleMobileDrop } = useDragCtx();
  const bagType = BAG_TYPES[bag.typeId] ?? BAG_TYPES.backpack;

  const borderColor = isOverweight  ? '#F2A900'
    : isActive                      ? '#E67E22'
    : isOver                        ? '#E67E2280'
    : '#2a2f33';

  const handleClick = () => {
    if (mobileSelected) {
      handleMobileDrop(bag.id);
    } else {
      onSelect(bag.id);
    }
  };

  return (
    <div
      ref={setNodeRef}
      onClick={handleClick}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
        cursor: 'pointer',
        transform: isActive ? 'scale(1.08)' : 'scale(1)',
        transition: 'transform 0.15s',
      }}
    >
      <div style={{
        width: isActive ? 64 : 52,
        height: isActive ? 82 : 66,
        background: '#141a1e',
        border: `${isActive ? 2 : 1}px solid ${borderColor}`,
        borderRadius: 6,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: isActive ? 26 : 20,
        position: 'relative',
        transition: 'all 0.15s',
      }}>
        {bagType.emoji}
        <div style={{
          position: 'absolute', top: 3, right: 3,
          background: isOverweight ? '#F2A900' : '#2a2f33',
          color: isOverweight ? '#0A0A0A' : '#D9C5B2',
          fontSize: 6, fontWeight: 700,
          fontFamily: 'JetBrains Mono, monospace',
          borderRadius: 2, padding: '1px 3px',
        }}>
          {isOverweight ? `⚠ ${(weight ?? 0).toFixed(1)}kg` : `${(weight ?? 0).toFixed(1)}kg`}
        </div>
      </div>
      <div style={{
        color: isOverweight ? '#F2A900' : isActive ? '#E67E22' : '#D9C5B2',
        fontSize: 7,
        fontFamily: 'JetBrains Mono, monospace',
        fontWeight: 700,
      }}>
        {bag.label || bagType.label}
      </div>
    </div>
  );
}

export default function BagShelf({ bags, activeBagId, getBagWeight, isOverweight, onSelect, onAdd }) {
  const { mobileSelected, clearMobileSelection } = useDragCtx();

  return (
    <div style={{
      display: 'flex', gap: 8,
      padding: '10px 14px',
      borderBottom: '1px solid #1c2124',
      overflowX: 'auto',
      alignItems: 'flex-end',
    }}>
      {bags.map(bag => (
        <BagThumbnail
          key={bag.id}
          bag={bag}
          isActive={bag.id === activeBagId}
          weight={getBagWeight(bag.id)}
          isOverweight={isOverweight(bag.id)}
          onSelect={onSelect}
        />
      ))}

      {/* Add bag slot */}
      <div
        onClick={() => { clearMobileSelection(); onAdd(); }}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
          cursor: 'pointer', opacity: mobileSelected ? 0.3 : 0.5,
        }}
      >
        <div style={{
          width: 52, height: 66,
          background: '#141a1e',
          border: '1px dashed #2a2f33',
          borderRadius: 6,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#444', fontSize: 22,
        }}>+</div>
        <div style={{
          color: '#444', fontSize: 7,
          fontFamily: 'JetBrains Mono, monospace',
        }}>ADD BAG</div>
      </div>
    </div>
  );
}
