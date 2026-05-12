import { useState } from 'react';
import { adminSupabase } from '../../../lib/adminSupabase';
import AdminLog from '../shared/AdminLog';
import { useAdminLog } from '../shared/useAdminLog';

export default function ImageAuditPanel() {
  const [limit, setLimit] = useState(500);
  const [autoClear, setAutoClear] = useState(false);
  const [summary, setSummary] = useState(null);
  const { lines, running, setRunning, push, clear } = useAdminLog();

  async function runAudit() {
    clear();
    setRunning(true);
    setSummary(null);
    push('start', `Fetching up to ${limit} image URLs from poi_enrichment…`);

    const { data, error } = await adminSupabase
      .from('poi_enrichment')
      .select('poi_id, image_url')
      .not('image_url', 'is', null)
      .limit(limit);

    if (error) {
      push('error', `DB error: ${error.message}`);
      setRunning(false);
      return;
    }

    push('start', `Checking ${data.length} URLs…`);
    let ok = 0, broken = 0, timeout = 0;

    for (const row of data) {
      try {
        const res = await fetch(row.image_url, {
          method: 'HEAD',
          signal: AbortSignal.timeout(5000),
        });
        if (res.ok) {
          ok++;
          push('done', `✓ ${row.poi_id}`);
        } else {
          broken++;
          push('error', `✗ ${row.poi_id} — HTTP ${res.status}`);
          if (autoClear) {
            await adminSupabase
              .from('poi_enrichment')
              .update({ image_url: null })
              .eq('poi_id', row.poi_id);
          }
        }
      } catch {
        timeout++;
        push('error', `⏱ ${row.poi_id} — timeout or network error`);
      }
    }

    setSummary({ ok, broken, timeout });
    push('done', `Complete — OK: ${ok} | Broken: ${broken} | Timeout: ${timeout}`);
    setRunning(false);
  }

  return (
    <div>
      <h2 style={{ color: '#fff', fontSize: 18, marginBottom: 8, marginTop: 0 }}>Image Audit</h2>
      <p style={{ color: '#D9C5B2', fontSize: 13, marginBottom: 24 }}>
        HEAD-checks all <code>image_url</code> entries in <code>poi_enrichment</code>.
        Optionally nulls broken URLs.
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        <label style={{ color: '#D9C5B2', fontSize: 13 }}>
          Limit&nbsp;
          <input
            type="number" value={limit} min={1} max={2000}
            onChange={e => setLimit(Number(e.target.value))}
            style={inputStyle}
          />
        </label>
        <label style={{ color: '#D9C5B2', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
          <input type="checkbox" checked={autoClear} onChange={e => setAutoClear(e.target.checked)} />
          Auto-clear broken URLs
        </label>
        <button onClick={runAudit} disabled={running} style={running ? btnDisabled : btnActive}>
          {running ? 'Running…' : 'Run Audit'}
        </button>
      </div>

      {summary && (
        <div style={{ display: 'flex', gap: 24, marginBottom: 16, fontFamily: '"JetBrains Mono", monospace', fontSize: 13 }}>
          <span style={{ color: '#E67E22' }}>OK: {summary.ok}</span>
          <span style={{ color: '#E74C3C' }}>Broken: {summary.broken}</span>
          <span style={{ color: '#D9C5B2' }}>Timeout: {summary.timeout}</span>
        </div>
      )}

      <AdminLog lines={lines} />
    </div>
  );
}

const inputStyle = {
  width: 80, background: '#1C2025', border: '1px solid #2A3035',
  borderRadius: 4, padding: '4px 8px', color: '#fff',
  fontFamily: '"JetBrains Mono", monospace', fontSize: 13,
};
const btnActive = {
  background: '#E67E22', border: 'none', borderRadius: 4,
  padding: '8px 20px', color: '#fff',
  fontFamily: '"JetBrains Mono", monospace', fontSize: 13, cursor: 'pointer',
};
const btnDisabled = { ...btnActive, background: '#555', cursor: 'default' };
