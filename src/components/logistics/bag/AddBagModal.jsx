// src/components/logistics/bag/AddBagModal.jsx
import { useState, useEffect } from 'react';
import { nanoid } from 'nanoid';
import { BAG_TYPES, BAG_TYPE_IDS } from './bagTypes';

export default function AddBagModal({ onAdd, onClose }) {
  const [selectedTypeId, setSelectedTypeId] = useState(null);
  const [label, setLabel] = useState('');

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleConfirm = () => {
    if (!selectedTypeId) return;
    const bagType = BAG_TYPES[selectedTypeId];
    onAdd({
      id: nanoid(8),
      typeId: selectedTypeId,
      skinId: 'tactical',
      label: label.trim() || bagType.label,
    });
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: '#000000cc',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 100,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#0E1012', border: '1px solid #2a2f33', borderRadius: 8,
          padding: 24, width: 480, maxWidth: '90vw',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{
          fontFamily: 'JetBrains Mono, monospace', color: '#D9C5B2',
          fontSize: 10, letterSpacing: 2, marginBottom: 16,
        }}>
          SELECT BAG TYPE
        </div>

        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
          gap: 8, marginBottom: 16,
        }}>
          {BAG_TYPE_IDS.map(typeId => {
            const bt = BAG_TYPES[typeId];
            const isSelected = selectedTypeId === typeId;
            return (
              <div
                key={typeId}
                onClick={() => { setSelectedTypeId(typeId); setLabel(bt.label); }}
                style={{
                  background: isSelected ? '#1c2124' : '#141a1e',
                  border: `1px solid ${isSelected ? '#E67E22' : '#2a2f33'}`,
                  borderRadius: 6, padding: '10px 8px',
                  cursor: 'pointer', textAlign: 'center',
                  transition: 'border-color 0.15s',
                }}
              >
                <div style={{ fontSize: 24, marginBottom: 4 }}>{bt.emoji}</div>
                <div style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  color: isSelected ? '#E67E22' : '#D9C5B2',
                  fontSize: 8, fontWeight: 700,
                }}>
                  {bt.label.toUpperCase()}
                </div>
                <div style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  color: '#666', fontSize: 7, marginTop: 2,
                }}>
                  {Object.keys(bt.zones).length} zones · {bt.weightLimitKg}kg limit
                </div>
              </div>
            );
          })}
        </div>

        {selectedTypeId && (
          <div style={{ marginBottom: 16 }}>
            <div style={{
              fontFamily: 'JetBrains Mono, monospace', color: '#666',
              fontSize: 8, marginBottom: 6, letterSpacing: 1,
            }}>
              BAG NAME (OPTIONAL)
            </div>
            <input
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder={BAG_TYPES[selectedTypeId]?.label}
              style={{
                width: '100%', background: '#141a1e',
                border: '1px solid #2a2f33', borderRadius: 4,
                color: '#D9C5B2', fontFamily: 'JetBrains Mono, monospace',
                fontSize: 11, padding: '6px 10px',
                outline: 'none', boxSizing: 'border-box',
              }}
              onKeyDown={e => { if (e.key === 'Enter') handleConfirm(); }}
            />
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: '1px solid #2a2f33', color: '#666',
              fontFamily: 'JetBrains Mono, monospace', fontSize: 9,
              padding: '6px 14px', borderRadius: 4, cursor: 'pointer',
            }}
          >
            CANCEL
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedTypeId}
            style={{
              background: selectedTypeId ? '#E67E22' : '#2a2f33',
              border: 'none',
              color: selectedTypeId ? '#0E1012' : '#444',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 9, fontWeight: 700,
              padding: '6px 14px', borderRadius: 4,
              cursor: selectedTypeId ? 'pointer' : 'default',
            }}
          >
            ADD BAG
          </button>
        </div>
      </div>
    </div>
  );
}
