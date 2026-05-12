import { useTheme } from '../../context/ThemeContext';

const THEMES = ['default', 'day', 'tactical'];
const THEME_ICONS = { default: '🌙', day: '☀️', tactical: '⊕' };

export default function Sidebar({
  onOpenProfile,
  onBackToDashboard,
  onOpenChat,
  onOpenInspire,
  onOpenTactical,
  onOpenSettings,
}) {
  const { theme, setTheme } = useTheme();

  function cycleTheme() {
    const next = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];
    setTheme(next);
  }

  return (
    <aside
      style={{
        width: 48,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        background: 'var(--nav-bg)',
        borderRight: '1px solid var(--border)',
        paddingTop: 8,
        paddingBottom: 8,
      }}
    >
      {/* Back to dashboard */}
      {onBackToDashboard && (
        <IconBtn onClick={onBackToDashboard} title="Home" label="←" />
      )}

      <div style={{ flex: 1 }} />

      {/* Secondary actions */}
      {onOpenInspire && (
        <IconBtn onClick={onOpenInspire} title="Inspire" label="✦" />
      )}
      {onOpenChat && (
        <IconBtn onClick={onOpenChat} title="Squad Chat" label="💬" />
      )}
      <IconBtn onClick={onOpenProfile} title="Profile" label="👤" />
      <IconBtn onClick={cycleTheme} title={`Theme: ${theme}`} label={THEME_ICONS[theme] ?? '🌙'} />
      <IconBtn onClick={onOpenSettings} title="Settings" label="⚙" />
      {onOpenTactical && (
        <IconBtn
          onClick={onOpenTactical}
          title="Tactical HUD"
          label="⊛"
          style={{ color: '#E67E22' }}
        />
      )}
    </aside>
  );
}

function IconBtn({ onClick, title, label, style }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 36,
        height: 36,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 4,
        border: 'none',
        background: 'none',
        cursor: 'pointer',
        fontSize: 15,
        color: 'rgba(255,255,255,0.55)',
        margin: '2px 0',
        transition: 'background 0.15s, color 0.15s',
        ...style,
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
    >
      {label}
    </button>
  );
}
