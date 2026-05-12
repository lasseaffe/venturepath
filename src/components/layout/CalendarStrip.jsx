export function CalendarStrip({ trip, dayLoops, stays, selectedDate, onSelectDate }) {
  // Build array of ISO dates covering the trip
  const dates = [];
  if (trip.startDate && trip.endDate) {
    const start = new Date(trip.startDate);
    const end   = new Date(trip.endDate);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().slice(0, 10));
    }
  }

  function isHomebaseNight(iso) {
    return stays.some(s => s.isHomebase && s.checkin <= iso && iso < s.checkout);
  }

  function stopCount(iso) {
    return dayLoops.find(dl => dl.date === iso)?.stopIds.length ?? 0;
  }

  // Detect city block boundaries (Stay changes)
  function hasDividerBefore(iso) {
    const idx = dates.indexOf(iso);
    if (idx <= 0) return false;
    const prev = dates[idx - 1];
    const prevStay = stays.find(s => s.checkin <= prev && prev < s.checkout);
    const curStay  = stays.find(s => s.checkin <= iso  && iso  < s.checkout);
    return prevStay?.id !== curStay?.id;
  }

  const chipBase = {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    minWidth: 38, padding: '5px 4px', borderRadius: 2, cursor: 'pointer',
    border: '1px solid transparent', gap: 1, flexShrink: 0,
    fontFamily: 'var(--font-mono)',
    background: 'transparent',
  };

  return (
    <div style={{
      background: 'var(--surface)',
      borderBottom: '1px solid rgba(242,237,232,0.07)',
      padding: '8px 14px',
      display: 'flex',
      gap: 6,
      alignItems: 'center',
      overflowX: 'auto',
    }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.52rem', color: 'var(--text-muted)', letterSpacing: '0.15em', textTransform: 'uppercase', marginRight: 4, whiteSpace: 'nowrap' }}>
        Expedition →
      </span>

      {/* ALL chip */}
      <button
        onClick={() => onSelectDate(null)}
        style={{
          ...chipBase,
          background: !selectedDate ? 'rgba(230,126,34,0.12)' : 'var(--surface-raised)',
          borderColor: !selectedDate ? 'var(--accent)' : 'rgba(242,237,232,0.12)',
          color: !selectedDate ? 'var(--accent)' : 'var(--text-secondary)',
        }}
      >
        <span style={{ fontSize: '0.55rem', fontWeight: 700 }}>ALL</span>
        <span style={{ fontSize: '0.6rem' }}>⊞</span>
      </button>

      {dates.map(iso => {
        const d      = new Date(iso + 'T00:00:00');
        const dd     = d.getDate();
        const wd     = d.toLocaleDateString('en-US', { weekday: 'short' });
        const hb     = isHomebaseNight(iso);
        const count  = stopCount(iso);
        const active = selectedDate === iso;

        return (
          <div key={iso} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {hasDividerBefore(iso) && (
              <div style={{ width: 1, height: 30, background: 'rgba(242,237,232,0.07)', flexShrink: 0 }} />
            )}
            <button
              onClick={() => onSelectDate(iso)}
              style={{
                ...chipBase,
                background: active ? 'rgba(230,126,34,0.12)' : hb ? 'rgba(92,154,106,0.06)' : 'transparent',
                borderColor: active ? 'var(--accent)' : hb ? 'rgba(92,154,106,0.3)' : 'transparent',
              }}
            >
              <span style={{ fontSize: '0.48rem', color: active ? 'var(--accent)' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{wd}</span>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: active ? 'var(--accent)' : 'var(--text-primary)' }}>{dd}</span>
              {hb && !active && <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--status-ok)' }} />}
              {count > 0 && (
                <span style={{ fontSize: '0.45rem', color: 'var(--accent)', opacity: active ? 1 : 0.7 }}>
                  {count} {count === 1 ? 'stop' : 'stops'}
                </span>
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}
