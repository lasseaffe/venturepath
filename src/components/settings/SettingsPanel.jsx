import { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import ElementReportsClient from './ElementReportsClient';
import { useOnboardingState } from '../onboarding/useOnboardingState';

const TABS = [
  { id: 'DISPLAY',  label: 'Display' },
  { id: 'REPORTS',  label: 'Reports' },
];

export default function SettingsPanel({ open, onClose, onLaunchWizard, onOpenMoodboard }) {
  const [activeTab, setActiveTab] = useState('DISPLAY');
  const { theme, setTheme } = useTheme();
  const { reset: resetOnboarding } = useOnboardingState('vp-onboarding');
  const isTactical = theme === 'tactical';

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 60,
          background: 'rgba(0,0,0,0.65)',
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: 'fixed', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 61,
          width: 520, maxWidth: '95vw', maxHeight: '85vh',
          background: '#0E1012',
          border: '1px solid #1e2328',
          borderRadius: 10,
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: '1px solid #1e2328', background: '#0c0e10' }}
        >
          <div>
            <div className="text-[9px] font-mono tracking-[0.2em] text-[#E67E22] uppercase">
              VenturePath
            </div>
            <div className="text-[13px] font-mono font-bold text-white tracking-wider mt-0.5">
              Settings
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded border border-[#2a2f36] text-[var(--text-muted)] hover:text-white hover:border-[#3a3f46] transition-colors text-sm"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div
          className="flex shrink-0 px-5 gap-3"
          style={{ borderBottom: '1px solid #1e2328' }}
        >
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="text-[9px] font-mono tracking-widest uppercase py-2.5 border-b-2 transition-colors"
              style={{
                borderBottomColor: activeTab === tab.id ? '#E67E22' : 'transparent',
                color: activeTab === tab.id ? '#E67E22' : '#4b5563',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === 'DISPLAY' && (
            <div className="flex flex-col gap-4">
              <div className="text-[9px] font-mono tracking-[0.15em] text-[var(--text-muted)] uppercase mb-1">
                Theme
              </div>

              {/* Tactical toggle */}
              <div
                className="flex items-center justify-between p-4 rounded"
                style={{ background: '#111316', border: '1px solid #1e2328' }}
              >
                <div>
                  <div className="text-[11px] font-mono font-bold text-white">
                    Tactical Mode
                  </div>
                  <div className="text-[9px] font-mono text-[var(--text-muted)] mt-0.5">
                    Amber-on-black emergency aesthetic
                  </div>
                </div>
                <button
                  onClick={() => setTheme(t => t === 'tactical' ? 'default' : 'tactical')}
                  className="text-[9px] font-mono px-3 py-1.5 rounded border tracking-widest uppercase transition-colors"
                  style={{
                    background: isTactical ? 'rgba(242,169,0,0.15)' : 'rgba(230,126,34,0.1)',
                    borderColor: isTactical ? 'rgba(242,169,0,0.4)' : 'rgba(230,126,34,0.3)',
                    color: isTactical ? '#F2A900' : '#E67E22',
                  }}
                >
                  {isTactical ? '⊕ Active — Exit' : '⊕ Activate'}
                </button>
              </div>

              {/* Moodboard — living design spec */}
              <div
                className="flex items-center justify-between p-4 rounded"
                style={{ background: '#111316', border: '1px solid #1e2328' }}
              >
                <div>
                  <div className="text-[11px] font-mono font-bold text-white">
                    Design Moodboard
                  </div>
                  <div className="text-[9px] font-mono text-[var(--text-muted)] mt-0.5">
                    Modern Nomad system · tokens, type, components, voice
                  </div>
                </div>
                <button
                  onClick={() => onOpenMoodboard?.()}
                  className="text-[9px] font-mono px-3 py-1.5 rounded border tracking-widest uppercase transition-colors"
                  style={{
                    background: 'rgba(230,126,34,0.1)',
                    borderColor: 'rgba(230,126,34,0.3)',
                    color: '#E67E22',
                  }}
                >
                  ⊕ Open →
                </button>
              </div>

              {/* Wizard launcher */}
              <div
                className="flex items-center justify-between p-4 rounded"
                style={{ background: '#111316', border: '1px solid #1e2328' }}
              >
                <div>
                  <div className="text-[11px] font-mono font-bold text-white">
                    New Expedition Wizard
                  </div>
                  <div className="text-[9px] font-mono text-[var(--text-muted)] mt-0.5">
                    Architect a new expedition step-by-step
                  </div>
                </div>
                <button
                  onClick={() => onLaunchWizard?.()}
                  className="text-[9px] font-mono px-3 py-1.5 rounded border tracking-widest uppercase transition-colors"
                  style={{
                    background: 'rgba(230,126,34,0.1)',
                    borderColor: 'rgba(230,126,34,0.3)',
                    color: '#E67E22',
                  }}
                >
                  ⊕ Launch →
                </button>
              </div>

              {/* Restart Tour */}
              <div style={{ borderTop: '1px solid #2a3a22', marginTop: 16, paddingTop: 16 }}>
                <button
                  onClick={resetOnboarding}
                  style={{
                    padding: '10px 20px',
                    background: 'transparent',
                    border: '1px solid #E67E22',
                    color: '#E67E22',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: '"JetBrains Mono", monospace',
                    letterSpacing: 1,
                    transition: 'all 0.12s steps(3, end)',
                  }}
                  onMouseEnter={e => { e.target.style.background = '#E67E22'; e.target.style.color = '#0C0F0A' }}
                  onMouseLeave={e => { e.target.style.background = 'transparent'; e.target.style.color = '#E67E22' }}
                >
                  [RESTART TOUR]
                </button>
                <p style={{ fontSize: 10, color: '#8FAF80', marginTop: 6, fontFamily: '"JetBrains Mono", monospace' }}>
                  Re-run the expedition onboarding protocol
                </p>
              </div>
            </div>
          )}

          {activeTab === 'REPORTS' && <ElementReportsClient />}
        </div>
      </div>
    </>
  );
}
