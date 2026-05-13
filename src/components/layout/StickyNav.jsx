/**
 * StickyNav — 5-step journey stepper for TripPlanner.
 * Shows completion state (done/active/empty) for each planning step.
 * Replaces the old 7-section infinite-scroll jump nav.
 */

const STEPS = [
  { id: 'transport',     label: 'Transport'      },
  { id: 'accommodation', label: 'Accommodation'  },
  { id: 'discovery',     label: 'Discovery'      },
  { id: 'gatherings',    label: 'Gatherings'     },
  { id: 'itinerary',     label: 'Itinerary'      },
  { id: 'logistics',     label: 'Logistics'      },
];

function StepMarker({ state }) {
  const base = {
    width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 10, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
    border: '1.5px solid currentColor',
    transition: 'background 0.2s, border-color 0.2s',
  };

  if (state === 'done') {
    return (
      <div style={{ ...base, background: '#2ecc71', borderColor: '#2ecc71', color: '#000' }}>
        ✓
      </div>
    );
  }
  if (state === 'active') {
    return (
      <div style={{ ...base, background: 'rgba(230,126,34,0.15)', borderColor: '#E67E22', color: '#E67E22' }}>
        ●
      </div>
    );
  }
  return <div style={{ ...base, borderColor: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.2)' }} />;
}

export default function StickyNav({ activeTab, onTabChange, completion = {} }) {
  return (
    <nav
      style={{
        position: 'sticky', top: 0, zIndex: 20,
        display: 'flex', background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        overflowX: 'auto', scrollbarWidth: 'none',
      }}
    >
      {STEPS.map(({ id, label }) => {
        const isActive = activeTab === id;
        const isDone = !isActive && completion[id];
        const state = isActive ? 'active' : isDone ? 'done' : 'empty';

        return (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              flex: 1, justifyContent: 'center',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase',
              padding: '10px 12px',
              border: 'none',
              borderBottom: isActive ? '2px solid #E67E22' : '2px solid transparent',
              background: 'transparent',
              color: isActive ? '#E67E22' : isDone ? '#2ecc71' : 'var(--text-muted)',
              cursor: 'pointer', whiteSpace: 'nowrap',
              transition: 'color 0.15s, border-color 0.15s',
              flexShrink: 0,
            }}
          >
            <StepMarker state={state} />
            {label}
          </button>
        );
      })}
    </nav>
  );
}
