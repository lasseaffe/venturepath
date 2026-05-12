const PLAN_TABS = [
  { id: 'OVERVIEW',         label: 'Overview' },
  { id: 'ITINERARY',        label: 'Itinerary' },
  { id: 'LOGISTICS',        label: 'Logistics' },
  { id: 'STAYS',            label: 'Stays' },
  { id: 'PUBLIC TRANSPORT', label: 'Transport' },
  { id: 'VAULT',            label: 'Vault' },
];

export default function PlanSubNav({ activeTab, onTabChange }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 4,
        padding: '0 16px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface)',
        overflowX: 'auto',
        flexShrink: 0,
      }}
    >
      {PLAN_TABS.map(t => {
        const isActive = activeTab === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onTabChange(t.id)}
            style={{
              padding: '10px 12px',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              letterSpacing: '0.08em',
              fontWeight: isActive ? 700 : 400,
              color: isActive ? '#E67E22' : 'var(--text-secondary)',
              background: 'none',
              border: 'none',
              borderBottom: isActive ? '2px solid #E67E22' : '2px solid transparent',
              marginBottom: -1,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'color 0.15s',
            }}
          >
            {t.label.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
