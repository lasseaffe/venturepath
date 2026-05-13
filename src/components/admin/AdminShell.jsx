import { useState } from 'react';
import DestinationRepairPanel from './panels/DestinationRepairPanel';
import ImageAuditPanel from './panels/ImageAuditPanel';
import DuplicateDetectorPanel from './panels/DuplicateDetectorPanel';
import PackingNormalizationPanel from './panels/PackingNormalizationPanel';

const PANELS = [
  { id: 'destination', icon: '📍', label: 'Destination Repair',    Component: DestinationRepairPanel },
  { id: 'images',      icon: '🖼',  label: 'Image Audit',           Component: ImageAuditPanel },
  { id: 'duplicates',  icon: '🔁',  label: 'Duplicate Detector',    Component: DuplicateDetectorPanel },
  { id: 'packing',     icon: '🎒',  label: 'Packing Normalization', Component: PackingNormalizationPanel },
];

export default function AdminShell() {
  const [active, setActive] = useState('destination');
  const { Component: ActivePanel } = PANELS.find(p => p.id === active) ?? PANELS[0];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0E1012', fontFamily: 'Inter, sans-serif' }}>
      <aside style={{ width: 220, flexShrink: 0, background: '#0A0D0F', borderRight: '1px solid #1C2025', padding: '24px 0' }}>
        <div style={{ padding: '0 20px 24px', borderBottom: '1px solid #1C2025' }}>
          <div style={{ color: '#E67E22', fontFamily: '"JetBrains Mono", monospace', fontSize: 11, fontWeight: 700, letterSpacing: 2 }}>
            BASECAMP CONTROL
          </div>
          <div style={{ color: '#4A5568', fontSize: 11, marginTop: 4 }}>
            Pipeline control · Data repair
          </div>
        </div>
        <nav style={{ marginTop: 16 }}>
          {PANELS.map(p => (
            <button
              key={p.id}
              onClick={() => setActive(p.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                width: '100%', padding: '10px 20px',
                background: 'none', border: 'none',
                borderLeft: active === p.id ? '3px solid #E67E22' : '3px solid transparent',
                color: active === p.id ? '#fff' : '#D9C5B2',
                fontFamily: 'Inter, sans-serif', fontSize: 13,
                cursor: 'pointer', textAlign: 'left',
              }}
            >
              <span>{p.icon}</span>
              <span>{p.label}</span>
            </button>
          ))}
        </nav>
      </aside>
      <main style={{ flex: 1, padding: 32, overflowY: 'auto' }}>
        <ActivePanel />
      </main>
    </div>
  );
}
