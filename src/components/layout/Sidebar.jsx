// src/components/layout/Sidebar.jsx
import { useTheme } from '../../context/ThemeContext';

const THEMES = ['default', 'day', 'tactical'];
const THEME_LABELS = { default: 'Dark', day: 'Day', tactical: 'Tactical' };
const THEME_ICONS = {
  default: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
      <path d="M13 9A6 6 0 0 1 6 2a7 7 0 1 0 7 7Z" strokeLinecap="round" />
    </svg>
  ),
  day: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
      <circle cx="8" cy="8" r="3" />
      <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.1 3.1l1.4 1.4M11.5 11.5l1.4 1.4M3.1 12.9l1.4-1.4M11.5 4.5l1.4-1.4" strokeLinecap="round" />
    </svg>
  ),
  tactical: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
      <circle cx="8" cy="8" r="6" />
      <circle cx="8" cy="8" r="2" />
      <path d="M8 2v2M8 12v2M2 8h2M12 8h2" strokeLinecap="round" />
    </svg>
  ),
};

const NAV_ITEMS = [
  {
    label: 'Dashboard',
    prop: 'onBackToDashboard',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
        <rect x="1" y="1" width="6" height="6" rx="1" />
        <rect x="9" y="1" width="6" height="6" rx="1" />
        <rect x="1" y="9" width="6" height="6" rx="1" />
        <rect x="9" y="9" width="6" height="6" rx="1" />
      </svg>
    ),
  },
  {
    label: 'My Expeditions',
    prop: 'onOpenExpeditions',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
        <path d="M8 1L15 5v6L8 15 1 11V5L8 1Z" strokeLinejoin="round" />
        <path d="M8 5l4 2.5v3L8 13 4 10.5v-3L8 5Z" fill="rgba(230,126,34,0.15)" />
      </svg>
    ),
  },
  {
    label: 'VentureVault',
    prop: 'onOpenVault',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
        <path d="M8 1L15 4.5v7L8 15 1 11.5v-7L8 1Z" />
        <path d="M8 5l4 2v4l-4 2-4-2V7l4-2Z" fill="rgba(230,126,34,0.1)" />
      </svg>
    ),
  },
  {
    label: 'Inspire',
    prop: 'onOpenInspire',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
        <path d="M8 1l1.8 4.4L14 6.2l-3.3 3 .9 4.8L8 11.6l-3.6 2.4.9-4.8-3.3-3 4.2-.8L8 1Z" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label: 'Architect',
    prop: 'onOpenProfile',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
        <circle cx="8" cy="5" r="3" />
        <path d="M2 15c0-3.3 2.7-6 6-6s6 2.7 6 6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: 'Tactical',
    prop: 'onOpenTactical',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
        <circle cx="8" cy="8" r="6" />
        <circle cx="8" cy="8" r="2" fill="rgba(242,169,0,0.2)" stroke="#F2A900" />
        <path d="M8 2v2M8 12v2M2 8h2M12 8h2" stroke="#F2A900" strokeLinecap="round" />
      </svg>
    ),
    activeColor: '#F2A900',
  },
  {
    label: 'Settings',
    prop: 'onOpenSettings',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
        <circle cx="8" cy="8" r="2.5" />
        <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.1 3.1l1.4 1.4M11.5 11.5l1.4 1.4M3.1 12.9l1.4-1.4M11.5 4.5l1.4-1.4" strokeLinecap="round" />
      </svg>
    ),
  },
];

export default function Sidebar({
  activeItem,
  onBackToDashboard,
  onOpenExpeditions,
  onOpenVault,
  onOpenInspire,
  onOpenProfile,
  onOpenTactical,
  onOpenSettings,
}) {
  const { theme, setTheme } = useTheme();

  const callbacks = {
    onBackToDashboard,
    onOpenExpeditions,
    onOpenVault,
    onOpenInspire,
    onOpenProfile,
    onOpenTactical,
    onOpenSettings,
  };

  function cycleTheme() {
    const currentIdx = Math.max(0, THEMES.indexOf(theme));
    const next = THEMES[(currentIdx + 1) % THEMES.length];
    setTheme(next);
  }

  return (
    <aside
      style={{
        width: 200,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--nav-bg)',
        borderRight: '1px solid var(--border)',
        padding: '8px 0',
      }}
    >
      {NAV_ITEMS.map(item => {
        const isActive = activeItem === item.prop;
        const cb = callbacks[item.prop];
        return (
          <NavItem
            key={item.prop}
            icon={item.icon}
            label={item.label}
            isActive={isActive}
            activeColor={item.activeColor}
            onClick={cb}
          />
        );
      })}

      {/* Spacer pushes theme to bottom */}
      <div style={{ flex: 1 }} />

      {/* Theme cycler */}
      <NavItem
        icon={THEME_ICONS[theme]}
        label={THEME_LABELS[theme]}
        isActive={false}
        onClick={cycleTheme}
      />
    </aside>
  );
}

function NavItem({ icon, label, isActive, activeColor = '#E67E22', onClick }) {
  return (
    <button
      onClick={() => onClick?.()}
      aria-label={label}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        width: '100%',
        height: 40,
        padding: '0 14px',
        background: isActive ? 'rgba(230,126,34,0.08)' : 'none',
        border: 'none',
        borderLeft: isActive ? `2px solid ${activeColor}` : '2px solid transparent',
        cursor: 'pointer',
        color: isActive ? activeColor : 'rgba(255,255,255,0.45)',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11,
        letterSpacing: '0.06em',
        textAlign: 'left',
        transition: 'background 0.15s, color 0.15s, border-color 0.15s',
        outline: 'none',
      }}
      onMouseEnter={e => {
        if (!isActive) {
          e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
          e.currentTarget.style.color = '#fff';
        }
      }}
      onMouseLeave={e => {
        if (!isActive) {
          e.currentTarget.style.background = 'none';
          e.currentTarget.style.color = 'rgba(255,255,255,0.45)';
        }
      }}
      onFocus={e => { e.currentTarget.style.boxShadow = '0 0 0 2px rgba(230,126,34,0.5)'; }}
      onBlur={e => { e.currentTarget.style.boxShadow = 'none'; }}
    >
      <span style={{ flexShrink: 0, display: 'flex' }}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}
