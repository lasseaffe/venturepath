/**
 * StickyNav — section-aware navigation bar for TripPlanner infinite-scroll layout.
 * Highlights the active section as the user scrolls.
 */
const SECTIONS = [
  { id: 'section-overview',   label: 'OVERVIEW' },
  { id: 'section-itinerary',  label: 'ITINERARY' },
  { id: 'section-logistics',  label: 'LOGISTICS' },
  { id: 'section-stays',      label: 'STAYS' },
  { id: 'section-transport',  label: 'TRANSPORT' },
  { id: 'section-vault',      label: 'VAULT' },
];

export default function StickyNav({ activeSection }) {
  function scrollTo(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <nav
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
        display: 'flex',
        gap: 0,
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        overflowX: 'auto',
        scrollbarWidth: 'none',
      }}
    >
      {SECTIONS.map(({ id, label }) => {
        const active = activeSection === id;
        return (
          <button
            key={id}
            onClick={() => scrollTo(id)}
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.6rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              padding: '10px 18px',
              border: 'none',
              borderBottom: active ? '2px solid #E67E22' : '2px solid transparent',
              background: 'transparent',
              color: active ? '#E67E22' : 'var(--text-muted)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'color 0.15s ease, border-color 0.15s ease',
              flexShrink: 0,
            }}
          >
            {label}
          </button>
        );
      })}
    </nav>
  );
}
