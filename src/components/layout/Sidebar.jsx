import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import { useLabels } from '../../hooks/useLabels';

const NAV_ITEMS = [
  { id: 'OVERVIEW',  icon: '🗺',  label: 'Overview' },
  { id: 'ITINERARY', icon: '📅',  label: 'Itinerary' },
  { id: 'FLIGHTS',   icon: '✈',   label: 'Flights' },
  { id: 'STAYS',     icon: '🏨',  label: 'Stays' },
  { id: 'LOGISTICS', icon: '🎒',  label: 'Logistics' },
  { id: 'DISCOVERY', icon: '🔍',  label: 'Discover' },
  { id: 'VAULT',     icon: '📂',  label: 'Saved trips' },
];

export default function Sidebar({
  activeTab,
  onTabChange,
  onOpenProfile,
  onBackToDashboard,
  onOpenChat,
  onOpenInspire,
  onOpenTactical,
}) {
  const [collapsed, setCollapsed] = useState(false);
  const { theme, setTheme } = useTheme();
  const labels = useLabels();
  const isTactical = theme === 'tactical';

  return (
    <motion.aside
      animate={{ width: collapsed ? 48 : 220 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="shrink-0 flex flex-col border-r overflow-hidden"
      style={{ background: 'var(--nav-bg)', borderColor: 'var(--border)', color: 'var(--nav-text)' }}
    >
      {/* Brand header */}
      <div className="flex items-center gap-3 px-3 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.15)' }}>
        <button
          onClick={() => setCollapsed(c => !c)}
          className="w-8 h-8 flex items-center justify-center rounded shrink-0 hover:bg-white/10 transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isTactical
            ? <span style={{ display: 'block', width: 14, height: 14, border: '1px solid currentColor', transform: 'rotate(45deg)' }} />
            : <span className="text-sm font-bold" style={{ color: 'var(--nav-text)' }}>VP</span>
          }
        </button>
        {!collapsed && (
          <span
            className={`font-semibold text-sm truncate ${isTactical ? 'font-mono tracking-widest uppercase' : ''}`}
            style={{ color: 'var(--nav-text)' }}
          >
            VenturePath
          </span>
        )}
      </div>

      {/* Back to home */}
      {onBackToDashboard && (
        <button
          onClick={onBackToDashboard}
          className="flex items-center gap-3 px-3 py-2 hover:bg-white/10 transition-colors text-left"
          style={{ color: 'rgba(255,255,255,0.6)' }}
        >
          <span className="w-8 h-8 flex items-center justify-center shrink-0 text-sm">←</span>
          {!collapsed && <span className="text-xs truncate">Home</span>}
        </button>
      )}

      {/* Nav items */}
      <nav className="flex-1 py-2">
        {NAV_ITEMS.map(item => {
          const isActive = activeTab === item.id;
          const label = item.id === 'VAULT' ? labels.saved : item.label;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 transition-colors relative text-left"
              style={{
                background: isActive ? 'rgba(255,255,255,0.12)' : 'transparent',
                color: isActive ? 'var(--nav-text)' : 'rgba(255,255,255,0.65)',
              }}
            >
              {isActive && (
                <span
                  className="absolute left-0 top-1 bottom-1 w-0.5 rounded-r"
                  style={{ background: 'var(--nav-text)' }}
                />
              )}
              <span className="w-8 h-8 flex items-center justify-center shrink-0 text-base">
                {item.icon}
              </span>
              {!collapsed && (
                <span className={`text-sm truncate ${isTactical ? 'font-mono text-xs tracking-wider uppercase' : 'font-medium'}`}>
                  {label}
                </span>
              )}
            </button>
          );
        })}

      </nav>

      {/* Bottom actions */}
      <div className="border-t py-2" style={{ borderColor: 'rgba(255,255,255,0.15)' }}>
        {/* Squad Chat */}
        {onOpenChat && (
          <button
            onClick={onOpenChat}
            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/10 transition-colors text-left"
            style={{ color: 'rgba(255,255,255,0.65)' }}
          >
            <span className="w-8 h-8 flex items-center justify-center shrink-0 text-base">💬</span>
            {!collapsed && (
              <span className={`text-sm truncate ${isTactical ? 'font-mono text-xs tracking-wider uppercase' : 'font-medium'}`}>
                Squad Chat
              </span>
            )}
          </button>
        )}

        {/* Profile */}
        <button
          onClick={onOpenProfile}
          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/10 transition-colors text-left"
          style={{ color: 'rgba(255,255,255,0.65)' }}
        >
          <span className="w-8 h-8 flex items-center justify-center shrink-0 text-base">👤</span>
          {!collapsed && (
            <span className={`text-sm truncate ${isTactical ? 'font-mono text-xs tracking-wider uppercase' : 'font-medium'}`}>
              {labels.profile}
            </span>
          )}
        </button>

        {/* Theme toggle */}
        <button
          onClick={() => setTheme(t => t === 'tactical' ? 'default' : 'tactical')}
          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/10 transition-colors text-left"
          style={{ color: 'rgba(255,255,255,0.5)' }}
          title={isTactical ? 'Switch to default theme' : 'Switch to tactical mode'}
        >
          <span className="w-8 h-8 flex items-center justify-center shrink-0 text-base">⚙</span>
          {!collapsed && (
            <span className={`text-xs truncate ${isTactical ? 'font-mono tracking-wider uppercase' : ''}`}>
              {isTactical ? 'Exit Tactical' : 'Settings'}
            </span>
          )}
        </button>

        {/* Tactical HUD */}
        {onOpenTactical && (
          <button
            onClick={onOpenTactical}
            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/10 transition-colors text-left"
            style={{ color: 'rgba(255,255,255,0.4)' }}
            title="Open Tactical HUD"
          >
            <span className="w-8 h-8 flex items-center justify-center shrink-0 text-base">⊕</span>
            {!collapsed && (
              <span className={`text-xs truncate ${isTactical ? 'font-mono tracking-wider uppercase' : ''}`}>
                Tactical HUD
              </span>
            )}
          </button>
        )}
      </div>
    </motion.aside>
  );
}
