// src/components/layout/StickyNav.jsx
const SECTIONS = [
  { id: 'section-overview',   label: 'Overview' },
  { id: 'section-itinerary',  label: 'Itinerary' },
  { id: 'section-logistics',  label: 'Logistics' },
  { id: 'section-stays',      label: 'Stays' },
  { id: 'section-transport',  label: 'Transport' },
  { id: 'section-vault',      label: 'Vault' },
];

export default function StickyNav({ activeSection }) {
  function scrollTo(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <nav
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
        display: 'flex',
        gap: 4,
        padding: '0 16px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface)',
        overflowX: 'auto',
        flexShrink: 0,
      }}
    >
      {SECTIONS.map(s => {
        const isActive = activeSection === s.id;
        return (
          <button
            key={s.id}
            onClick={() => scrollTo(s.id)}
            aria-label={`Scroll to ${s.label}`}
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
              marginBottom: isActive ? -2 : 0,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'color 0.15s, border-color 0.15s',
            }}
          >
            {s.label.toUpperCase()}
          </button>
        );
      })}
    </nav>
  );
}
