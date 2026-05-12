// src/components/layout/TopBar.jsx
export default function TopBar({ onBackToDashboard, onOpenProfile, onOpenSettings }) {
  return (
    <header
      style={{
        height: 48,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        background: '#0E1012',
        borderBottom: '1px solid var(--border)',
        zIndex: 50,
      }}
    >
      {/* Logo */}
      <button
        onClick={onBackToDashboard}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
        }}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M10 2L18 7V13L10 18L2 13V7L10 2Z" stroke="#E67E22" strokeWidth="1.5" fill="none" />
          <path d="M10 5L15 8V12L10 15L5 12V8L10 5Z" fill="rgba(230,126,34,0.15)" stroke="#E67E22" strokeWidth="1" />
        </svg>
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.85)',
            fontWeight: 700,
          }}
        >
          VenturePath
        </span>
      </button>

      {/* Right actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Premium pill */}
        <button
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 12px',
            borderRadius: 20,
            border: '1px solid #E67E22',
            background: 'none',
            cursor: 'pointer',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            letterSpacing: '0.08em',
            color: '#E67E22',
            fontWeight: 700,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 1L7.5 4.5H11L8.5 6.5L9.5 10L6 8L2.5 10L3.5 6.5L1 4.5H4.5L6 1Z"
              stroke="#E67E22" strokeWidth="1" fill="rgba(230,126,34,0.15)" />
          </svg>
          Premium
        </button>

        {/* Profile */}
        <TopBarBtn onClick={onOpenProfile} title="Architect Profile">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
            <circle cx="8" cy="5" r="3" />
            <path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" strokeLinecap="round" />
          </svg>
        </TopBarBtn>

        {/* Settings */}
        <TopBarBtn onClick={onOpenSettings} title="Settings">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
            <circle cx="8" cy="8" r="2.5" />
            <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.1 3.1l1.4 1.4M11.5 11.5l1.4 1.4M3.1 12.9l1.4-1.4M11.5 4.5l1.4-1.4" strokeLinecap="round" />
          </svg>
        </TopBarBtn>

        {/* Notifications */}
        <div style={{ position: 'relative' }}>
          <TopBarBtn title="Notifications">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
              <path d="M8 1a5 5 0 0 1 5 5v3l1.5 2H1.5L3 9V6a5 5 0 0 1 5-5Z" strokeLinecap="round" />
              <path d="M6.5 13a1.5 1.5 0 0 0 3 0" strokeLinecap="round" />
            </svg>
          </TopBarBtn>
          {/* Red dot badge */}
          <div style={{
            position: 'absolute',
            top: 4,
            right: 4,
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: '#E74C3C',
            border: '1px solid #0E1012',
            pointerEvents: 'none',
          }} />
        </div>
      </div>
    </header>
  );
}

function TopBarBtn({ onClick, title, children }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 32,
        height: 32,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 6,
        border: 'none',
        background: 'none',
        cursor: 'pointer',
        color: 'rgba(255,255,255,0.55)',
        transition: 'background 0.15s, color 0.15s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
        e.currentTarget.style.color = '#fff';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'none';
        e.currentTarget.style.color = 'rgba(255,255,255,0.55)';
      }}
    >
      {children}
    </button>
  );
}
