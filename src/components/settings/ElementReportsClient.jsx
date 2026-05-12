import { useState, useEffect, useMemo } from 'react';

const ISSUE_LABEL = {
  wrong_location: '🗺 Wrong location',
  bad_poi:        '📍 Bad POI',
  wrong_language: '🌐 Wrong language',
  missing_image:  '🖼 Missing image',
  missing_pois:   '➕ Missing POIs',
  other:          '💬 Other',
};

function issueLabel(type) {
  return ISSUE_LABEL[type] ?? type ?? 'Unknown';
}

function FixPanel({ report, onResolved }) {
  const [open, setOpen]   = useState(false);
  const [busy, setBusy]   = useState(false);
  const [msg, setMsg]     = useState(null);
  const [nameVal, setNameVal] = useState('');
  const [noteVal, setNoteVal] = useState('');

  if (report.resolved_at) {
    return (
      <span
        className="text-[9px] font-mono px-2 py-0.5 rounded tracking-widest uppercase"
        style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.25)' }}
      >
        ✓ Resolved
      </span>
    );
  }

  async function send(action, payload = undefined) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/admin/element-fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId: report.id,
          cityId:   report.city_id,
          poiId:    report.poi_id ?? null,
          action,
          payload,
        }),
      });
      if (!res.ok) throw new Error('Server error');
      setMsg('Done');
      onResolved(report.id);
    } catch {
      setMsg('Failed');
    } finally {
      setBusy(false);
    }
  }

  const isPoiReport = !!report.poi_id;

  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        className="text-[9px] font-mono px-2 py-1 rounded tracking-widest uppercase transition-colors"
        style={{
          background: 'rgba(230,126,34,0.1)',
          color: '#E67E22',
          border: '1px solid rgba(230,126,34,0.3)',
        }}
      >
        {open ? 'Cancel' : 'Fix'}
      </button>

      {open && (
        <div
          className="mt-2 p-3 rounded flex flex-col gap-2"
          style={{ background: '#0c0e10', border: '1px solid #1e2328' }}
        >
          {/* Mark resolved — always available */}
          <button
            onClick={() => send('mark_resolved')}
            disabled={busy}
            className="w-full text-left text-[9px] font-mono px-2 py-1.5 rounded border transition-colors tracking-widest uppercase"
            style={{ borderColor: '#1e2328', color: 'var(--text-muted)' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#E67E22'; e.currentTarget.style.borderColor = 'rgba(230,126,34,0.4)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#6b7280'; e.currentTarget.style.borderColor = '#1e2328'; }}
          >
            ✓ Mark resolved (no data change)
          </button>

          {/* Remove POI — only for poi reports */}
          {isPoiReport && (
            <button
              onClick={() => send('remove_poi')}
              disabled={busy}
              className="w-full text-left text-[9px] font-mono px-2 py-1.5 rounded border transition-colors tracking-widest uppercase"
              style={{ borderColor: '#1e2328', color: 'var(--text-muted)' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#6b7280'; e.currentTarget.style.borderColor = '#1e2328'; }}
            >
              🗑 Remove this POI from inspire data
            </button>
          )}

          {/* Add/edit note on POI */}
          {isPoiReport && (
            <div className="flex flex-col gap-1">
              <textarea
                value={noteVal}
                onChange={e => setNoteVal(e.target.value)}
                placeholder="Add or update note on this POI…"
                rows={2}
                style={{
                  width: '100%', background: '#111316', border: '1px solid #1e2328',
                  borderRadius: 4, color: 'var(--text-secondary)', fontSize: 9, fontFamily: 'monospace',
                  padding: '6px 8px', resize: 'none', outline: 'none', boxSizing: 'border-box',
                }}
              />
              <button
                onClick={() => send('add_note', noteVal)}
                disabled={busy || !noteVal.trim()}
                className="text-[9px] font-mono px-2 py-1 rounded tracking-widest uppercase transition-colors self-start"
                style={{ background: 'rgba(230,126,34,0.1)', color: '#E67E22', border: '1px solid rgba(230,126,34,0.3)' }}
              >
                Save note
              </button>
            </div>
          )}

          {/* Fix city name */}
          <div className="flex gap-1.5 items-center">
            <input
              value={nameVal}
              onChange={e => setNameVal(e.target.value)}
              placeholder="Correct city name…"
              style={{
                flex: 1, background: '#111316', border: '1px solid #1e2328',
                borderRadius: 4, color: 'var(--text-secondary)', fontSize: 9, fontFamily: 'monospace',
                padding: '5px 8px', outline: 'none',
              }}
            />
            <button
              onClick={() => send('fix_city_name', nameVal)}
              disabled={busy || !nameVal.trim()}
              className="text-[9px] font-mono px-2 py-1 rounded tracking-widest uppercase transition-colors shrink-0"
              style={{ background: 'rgba(230,126,34,0.1)', color: '#E67E22', border: '1px solid rgba(230,126,34,0.3)' }}
            >
              Fix name
            </button>
          </div>

          {msg && (
            <p
              className="text-[9px] font-mono tracking-widest"
              style={{ color: msg === 'Failed' ? '#ef4444' : '#22c55e' }}
            >
              {msg === 'Done' ? '✓ Applied' : '✖ Failed'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function ElementReportsClient() {
  const [reports, setReports]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [unresolvedOnly, setUnresolvedOnly] = useState(false);
  const [resolvedIds, setResolvedIds] = useState(new Set());

  useEffect(() => {
    fetch('/api/element-reports')
      .then(r => r.json())
      .then(data => { setReports(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  function handleResolved(id) {
    setResolvedIds(prev => new Set([...prev, id]));
  }

  const issueTypes = useMemo(() => {
    const types = new Set(reports.map(r => r.issue_type ?? 'other'));
    return ['all', ...Array.from(types)];
  }, [reports]);

  const filtered = useMemo(() => {
    let list = filterType === 'all' ? reports : reports.filter(r => (r.issue_type ?? 'other') === filterType);
    if (unresolvedOnly) list = list.filter(r => !r.resolved_at && !resolvedIds.has(r.id));
    return list;
  }, [reports, filterType, unresolvedOnly, resolvedIds]);

  // Group by city
  const grouped = useMemo(() => {
    const map = {};
    for (const r of filtered) {
      const key = r.city_id || 'unknown';
      (map[key] ??= { cityName: r.city_name || r.city_id, items: [] }).items.push(r);
    }
    return Object.values(map);
  }, [filtered]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="text-[9px] font-mono text-[var(--text-muted)] tracking-widest animate-pulse">
          LOADING REPORTS…
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[9px] font-mono tracking-[0.2em] text-[#E67E22] uppercase">
            Element Reports
          </div>
          <div className="text-[11px] font-mono text-white mt-0.5">
            {reports.length} total
          </div>
        </div>
        <button
          onClick={() => setUnresolvedOnly(v => !v)}
          className="text-[8px] font-mono px-2 py-1 rounded border tracking-widest uppercase transition-colors"
          style={{
            background: unresolvedOnly ? 'rgba(230,126,34,0.1)' : 'transparent',
            borderColor: unresolvedOnly ? 'rgba(230,126,34,0.5)' : '#1e2328',
            color: unresolvedOnly ? '#E67E22' : '#4b5563',
          }}
        >
          Unresolved only
        </button>
      </div>

      {/* Filter pills */}
      <div className="flex gap-1.5 flex-wrap">
        {issueTypes.map(type => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className="text-[8px] font-mono px-2 py-1 rounded border tracking-widest uppercase transition-colors"
            style={{
              background: filterType === type ? 'rgba(230,126,34,0.1)' : 'transparent',
              borderColor: filterType === type ? 'rgba(230,126,34,0.5)' : '#1e2328',
              color: filterType === type ? '#E67E22' : '#4b5563',
            }}
          >
            {type === 'all' ? `All (${reports.length})` : `${issueLabel(type)} (${reports.filter(r => (r.issue_type ?? 'other') === type).length})`}
          </button>
        ))}
      </div>

      {/* Empty */}
      {grouped.length === 0 && (
        <div
          className="flex flex-col items-center justify-center py-12 rounded gap-2"
          style={{ border: '1px dashed #1e2328' }}
        >
          <div className="text-lg opacity-20">✦</div>
          <div className="text-[9px] font-mono text-[var(--text-muted)] tracking-widest">NO REPORTS FOUND</div>
        </div>
      )}

      {/* Grouped by city */}
      {grouped.map(({ cityName, items }) => (
        <section key={cityName}>
          <div className="flex items-center gap-2 mb-2">
            <div
              className="text-[8px] font-mono tracking-widest uppercase"
              style={{ color: '#E67E22' }}
            >
              {cityName}
            </div>
            <div
              className="text-[8px] font-mono px-1.5 py-0.5 rounded tracking-widest"
              style={{ background: 'rgba(230,126,34,0.1)', color: '#E67E22' }}
            >
              {items.length}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            {items.map(r => {
              const isResolved = !!r.resolved_at || resolvedIds.has(r.id);
              return (
                <div
                  key={r.id}
                  className="p-3 rounded"
                  style={{
                    background: '#111316',
                    border: `1px solid ${isResolved ? 'rgba(34,197,94,0.15)' : '#1e2328'}`,
                    opacity: isResolved ? 0.6 : 1,
                  }}
                >
                  {/* Row header */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="text-[10px] font-mono font-bold text-white">
                        {r.poi_id
                          ? r.poi_id.replace(/^[^-]+-/, '')
                          : r.city_name}
                      </div>
                      <div
                        className="text-[8px] font-mono mt-0.5 tracking-widest uppercase"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {r.poi_id ? 'poi' : 'city-level'} · {issueLabel(r.issue_type)}
                      </div>
                    </div>
                    <time
                      className="text-[8px] font-mono shrink-0"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {new Date(r.timestamp).toLocaleDateString()}
                    </time>
                  </div>

                  {/* Detail text */}
                  {r.detail && (
                    <p
                      className="text-[9px] font-mono leading-relaxed mb-2"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {r.detail}
                    </p>
                  )}

                  {/* Fix panel */}
                  <FixPanel
                    report={{ ...r, resolved_at: resolvedIds.has(r.id) ? new Date().toISOString() : r.resolved_at ?? null }}
                    onResolved={handleResolved}
                  />
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
