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
    <div className="h-full p-5 flex flex-col gap-2">
      <div className="label-tag mb-4">The Path</div>

      <div className="relative flex-1">
        {/* vertical rail */}
        <div className="absolute left-[14px] top-0 bottom-0 w-px bg-[#1e2328]" />

        <div className="space-y-8 relative">
          {active.map(ms => {
            const done    = ms.status === 'complete';
            const current = ms.status === 'active';
            return (
              <div key={ms.id} className="flex gap-4 items-start">
                <div
                  className={`w-7 h-7 shrink-0 flex items-center justify-center rounded-full border text-[11px] z-10 transition-all ${
                    done    ? 'bg-[#E67E22] border-[#E67E22] text-[#0E1012]'
                  : current ? 'bg-[#0E1012] border-[#E67E22] text-[#E67E22] scale-110 shadow-[0_0_12px_rgba(230,126,34,0.4)]'
                  :           'bg-[#0E1012] border-[#2a2f36] text-slate-600'
                  }`}
                >
                  {ICON[ms.type] ?? '●'}
                </div>
                <div className={`transition-opacity ${ms.status === 'pending' ? 'opacity-35' : 'opacity-100'}`}>
                  {ms.time && (
                    <div className="text-[10px] font-mono text-[#E67E22] tracking-widest">{ms.time}</div>
                  )}
                  <div className={`text-sm font-mono mt-0.5 ${current ? 'text-white' : 'text-slate-400'}`}>
                    {ms.label}
                  </div>
                  {current && (
                    <div className="text-[9px] font-mono text-slate-600 tracking-widest mt-1 animate-pulse">
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
      <div className="mt-4 pt-4 border-t border-[#1e2328]">
        <div className="flex justify-between text-[9px] font-mono text-slate-600 mb-1.5 tracking-widest">
          <span>EXPEDITION PROGRESS</span>
          <span className="text-[#E67E22]">{pct}%</span>
        </div>
        <div className="h-1 bg-[#1e2328] rounded-full overflow-hidden">
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
