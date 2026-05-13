function gatheringToMilestone(g) {
  const now = Date.now();
  const start = new Date(g.starts_at).getTime();
  const diff = start - now;
  const status = diff < 0 ? 'complete' : diff < 3_600_000 ? 'active' : 'pending';
  const time = new Date(g.starts_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  return {
    id: `g-${g.id}`,
    time,
    label: g.title,
    type: 'gathering',
    status,
    gathering: g,
    _sortTs: start,
  };
}

function milestoneTs(ms) {
  if (ms._sortTs) return ms._sortTs;
  if (!ms.time) return Infinity;
  const parts = ms.time.split(':');
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), +parts[0], +parts[1]).getTime();
}

const TimelinePath = ({ milestones = [], gatherings = [] }) => {
  const defaultMilestones = [
    { id: 1, time: '08:00', label: 'Departure',          type: 'start',    status: 'complete' },
    { id: 2, time: '11:30', label: 'Mountain Pass',       type: 'waypoint', status: 'active'   },
    { id: 3, time: '13:00', label: 'Local Flavor Stop',   type: 'food',     status: 'pending'  },
    { id: 4, time: '17:45', label: 'Basecamp Alpha',      type: 'end',      status: 'pending'  },
  ];

  const baseMilestones = milestones.length > 0 ? milestones : defaultMilestones;
  const gMilestones = gatherings.map(gatheringToMilestone);

  const active = [...baseMilestones, ...gMilestones].sort((a, b) => milestoneTs(a) - milestoneTs(b));

  const ICON = { start: '⛺', waypoint: '◆', food: '🍽', end: '🏁', gathering: '◈' };

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
                    ms.type === 'gathering'
                      ? done    ? 'bg-[#E67E22] border-[#E67E22] text-[#0E1012]'
                        : current ? 'bg-[#0E1012] border-[#E67E22] text-[#E67E22] shadow-[0_0_8px_rgba(230,126,34,0.6)]'
                        :           'bg-[#0E1012] border-[#E67E22]/40 text-[#E67E22]/60'
                      : done    ? 'bg-[#E67E22] border-[#E67E22] text-[#0E1012]'
                        : current ? 'bg-[#0E1012] border-[#E67E22] text-[#E67E22] shadow-[0_0_8px_rgba(230,126,34,0.4)]'
                        :           'bg-[#0E1012] border-[#2a2f36] text-[var(--text-muted)]'
                  }`}
                >
                  {ICON[ms.type] ?? '●'}
                </div>
                <div className={`transition-opacity leading-tight ${ms.status === 'pending' ? 'opacity-35' : 'opacity-100'}`}>
                  {ms.time && (
                    <div className="text-[9px] font-mono tracking-widest" style={{ color: ms.type === 'gathering' ? '#E67E22' : '#E67E22' }}>{ms.time}</div>
                  )}
                  <div className={`text-[11px] font-mono ${current ? 'text-white' : 'text-[var(--text-secondary)]'}`}>
                    {ms.label}
                  </div>
                  {ms.type === 'gathering' && (
                    <div className="text-[8px] font-mono tracking-widest" style={{ color: 'rgba(230,126,34,0.7)' }}>
                      GATHERING
                    </div>
                  )}
                  {current && ms.type !== 'gathering' && (
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
