const TimelinePath = ({ milestones = [] }) => {
  const active = milestones.length > 0 ? milestones : [
    { id: 1, time: '08:00', label: 'Departure',          type: 'start',    status: 'complete' },
    { id: 2, time: '11:30', label: 'Mountain Pass',       type: 'waypoint', status: 'active'   },
    { id: 3, time: '13:00', label: 'Local Flavor Stop',   type: 'food',     status: 'pending'  },
    { id: 4, time: '17:45', label: 'Basecamp Alpha',      type: 'end',      status: 'pending'  },
  ];

  const ICON = { start: '⛺', waypoint: '◆', food: '🍽', end: '🏁' };

  const pct = Math.round(
    (active.filter(m => m.status === 'complete').length / active.length) * 100
  );

  return (
    <div className="w-full px-3 py-2 flex flex-col gap-1">
      <div className="label-tag mb-1">The Path</div>

      <div className="relative">
        {/* vertical rail */}
        <div className="absolute left-[10px] top-0 bottom-0 w-px bg-[#1e2328]" />

        <div className="space-y-1.5 relative">
          {active.map(ms => {
            const done    = ms.status === 'complete';
            const current = ms.status === 'active';
            return (
              <div key={ms.id} className="flex gap-2.5 items-start">
                <div
                  className={`w-5 h-5 shrink-0 flex items-center justify-center rounded-full border text-[9px] z-10 transition-all ${
                    done    ? 'bg-[#E67E22] border-[#E67E22] text-[#0E1012]'
                  : current ? 'bg-[#0E1012] border-[#E67E22] text-[#E67E22] shadow-[0_0_8px_rgba(230,126,34,0.4)]'
                  :           'bg-[#0E1012] border-[#2a2f36] text-[var(--text-muted)]'
                  }`}
                >
                  {ICON[ms.type] ?? '●'}
                </div>
                <div className={`transition-opacity leading-tight ${ms.status === 'pending' ? 'opacity-35' : 'opacity-100'}`}>
                  {ms.time && (
                    <div className="text-[9px] font-mono text-[#E67E22] tracking-widest">{ms.time}</div>
                  )}
                  <div className={`text-[11px] font-mono ${current ? 'text-white' : 'text-[var(--text-secondary)]'}`}>
                    {ms.label}
                  </div>
                  {current && (
                    <div className="text-[8px] font-mono text-[var(--text-muted)] tracking-widest animate-pulse">
                      CURRENT LEG
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-2 pt-2 border-t border-[#1e2328]">
        <div className="flex justify-between text-[9px] font-mono text-[var(--text-muted)] mb-1 tracking-widest">
          <span>EXPEDITION PROGRESS</span>
          <span className="text-[#E67E22]">{pct}%</span>
        </div>
        <div className="h-0.5 bg-[#1e2328] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#E67E22] rounded-full transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default TimelinePath;
