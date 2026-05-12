const TABS = [
  {
    id: 'DISCOVER',
    label: 'DISCOVER',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M16.9 16.9l2.1 2.1M4.9 19.1l2.1-2.1M16.9 7.1l2.1-2.1" />
      </svg>
    ),
  },
  {
    id: 'PLAN',
    label: 'PLAN',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="3" width="8" height="8" rx="1" />
        <rect x="13" y="3" width="8" height="8" rx="1" />
        <rect x="3" y="13" width="8" height="8" rx="1" />
        <rect x="13" y="13" width="8" height="8" rx="1" />
      </svg>
    ),
  },
  {
    id: 'RECORD',
    label: 'RECORD',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 3" />
      </svg>
    ),
  },
];

export default function BottomNav({ activeBottomTab, onTabSelect }) {
  return (
    <nav
      style={{
        background: '#0E1012',
        borderTop: '2px solid #1a1f24',
        display: 'flex',
        height: 56,
        flexShrink: 0,
      }}
    >
      {TABS.map(t => {
        const isActive = activeBottomTab === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onTabSelect(t.id)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              color: isActive ? '#E67E22' : '#484440',
              borderTop: isActive ? '2px solid #E67E22' : '2px solid transparent',
              marginTop: -2,
              background: 'none',
              border: 'none',
              borderTop: isActive ? '2px solid #E67E22' : '2px solid transparent',
              cursor: 'pointer',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 8,
              letterSpacing: '0.1em',
              fontWeight: isActive ? 700 : 400,
              transition: 'color 0.15s',
            }}
          >
            {t.icon}
            {t.label}
          </button>
        );
      })}
    </nav>
  );
}
