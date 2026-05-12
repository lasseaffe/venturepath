import { useState } from 'react';

const SAMPLE_LEGS = [
  {
    id: 1,
    title: 'Gateway City Layover',
    days: 2,
    location: 'Punta Arenas, Chile',
    objectives: ['Collect permits', 'Final gear check', 'Weather briefing'],
    hazards: ['High winds', 'Sudden weather change'],
    notes: 'Book the airport transfer in advance. Limited ATMs near terminal.',
    checklistItems: ['Permit copies x3', 'Emergency contacts filed', 'Sat phone charged'],
  },
  {
    id: 2,
    title: 'Trailhead to Camp 1',
    days: 3,
    location: 'Torres del Paine Circuit',
    objectives: ['Reach Refugio Chileno', 'Acclimatize', 'Scout Mirador Las Torres'],
    hazards: ['River crossings (knee-deep)', 'Exposure above treeline'],
    notes: 'Start early — afternoon winds can exceed 100 km/h on exposed ridgelines.',
    checklistItems: ['Trekking poles locked', 'Rain cover on pack', 'Water filter primed'],
  },
  {
    id: 3,
    title: 'Summit Push Window',
    days: 1,
    location: 'Base Camp Alpha → Summit',
    objectives: ['Summit bid on weather window', 'Photography op at golden hour'],
    hazards: ['Altitude (2,800m)', 'Crevasse field', 'Rapid weather deterioration'],
    notes: 'Turn-around time: 13:00 absolute. No exceptions.',
    checklistItems: ['Crampons fitted', 'Ice axe accessible', 'Emergency bivvy packed'],
  },
];

export default function LegGuide({ legs = SAMPLE_LEGS }) {
  const [activeLeg, setActiveLeg] = useState(legs[0]?.id);
  const [checkedItems, setCheckedItems] = useState({});

  const leg = legs.find(l => l.id === activeLeg);

  const toggleCheck = (legId, item) => {
    const key = `${legId}:${item}`;
    setCheckedItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="tactical-panel overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-[#2a2f36] overflow-x-auto">
        {legs.map(l => (
          <button
            key={l.id}
            onClick={() => setActiveLeg(l.id)}
            className={`shrink-0 px-4 py-3 text-xs font-mono tracking-wide transition-colors border-b-2 ${
              activeLeg === l.id
                ? 'border-[#E67E22] text-[#E67E22]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            LEG {l.id}
          </button>
        ))}
      </div>

      {leg && (
        <div className="p-5 space-y-5">
          {/* Header */}
          <div>
            <h3 className="text-white font-bold text-lg">{leg.title}</h3>
            <div className="flex gap-4 mt-1 text-xs text-[var(--text-secondary)] font-mono">
              <span>📍 {leg.location}</span>
              <span>⏱ {leg.days}d</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Objectives */}
            <Section title="Mission Objectives">
              <ul className="space-y-1">
                {leg.objectives.map((o, i) => (
                  <li key={i} className="flex gap-2 items-start text-sm text-[var(--text-secondary)]">
                    <span className="text-[#E67E22] mt-0.5">▸</span>
                    {o}
                  </li>
                ))}
              </ul>
            </Section>

            {/* Hazards */}
            <Section title="Known Hazards">
              <ul className="space-y-1">
                {leg.hazards.map((h, i) => (
                  <li key={i} className="flex gap-2 items-start text-sm text-red-400">
                    <span className="mt-0.5">⚠</span>
                    {h}
                  </li>
                ))}
              </ul>
            </Section>
          </div>

          {/* Notes */}
          <Section title="Field Notes">
            <p className="text-sm text-[var(--text-secondary)] italic">{leg.notes}</p>
          </Section>

          {/* Pre-departure checklist */}
          <Section title="Pre-Departure Checklist">
            <div className="space-y-2">
              {leg.checklistItems.map((item) => {
                const key = `${leg.id}:${item}`;
                const checked = !!checkedItems[key];
                return (
                  <label
                    key={item}
                    className="flex items-center gap-3 cursor-pointer group"
                  >
                    <div
                      onClick={() => toggleCheck(leg.id, item)}
                      className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                        checked
                          ? 'bg-[#E67E22] border-[#E67E22]'
                          : 'border-[#4a5568] group-hover:border-[#E67E22]'
                      }`}
                    >
                      {checked && <span className="text-white text-[10px]">✓</span>}
                    </div>
                    <span className={`text-sm transition-colors ${checked ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-secondary)]'}`}>
                      {item}
                    </span>
                  </label>
                );
              })}
            </div>
          </Section>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="space-y-2">
      <div className="label-tag">{title}</div>
      {children}
    </div>
  );
}
