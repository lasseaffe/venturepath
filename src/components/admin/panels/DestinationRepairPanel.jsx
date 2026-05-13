import { useState } from 'react';
import { adminSupabase } from '../../../lib/adminSupabase';
import AdminLog from '../shared/AdminLog';
import { useAdminLog } from '../shared/useAdminLog';

async function fetchWikidataDescription(qid) {
  const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${qid}&format=json&props=descriptions&languages=en&origin=*`;
  const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
  if (!res.ok) return null;
  const json = await res.json();
  return json.entities?.[qid]?.descriptions?.en?.value ?? null;
}

export default function DestinationRepairPanel() {
  const [limit, setLimit] = useState(100);
  const [dryRun, setDryRun] = useState(true);
  const { lines, running, setRunning, push, clear } = useAdminLog();

  async function runRepair() {
    clear();
    setRunning(true);
    push('start', `Fetching up to ${limit} poi_enrichment rows with null description…`);

    const { data, error } = await adminSupabase
      .from('poi_enrichment')
      .select('poi_id, wikidata_qid, description')
      .is('description', null)
      .not('wikidata_qid', 'is', null)
      .limit(limit);

    if (error) {
      push('error', `DB error: ${error.message}`);
      setRunning(false);
      return;
    }

    push('start', `Found ${data.length} rows to repair. Dry run: ${dryRun}`);
    let fixed = 0, skipped = 0, errCount = 0;

    for (const row of data) {
      try {
        const desc = await fetchWikidataDescription(row.wikidata_qid);
        if (!desc) {
          skipped++;
          push('item', `· ${row.poi_id} — no English description on Wikidata`);
          continue;
        }
        if (!dryRun) {
          await adminSupabase
            .from('poi_enrichment')
            .update({ description: desc })
            .eq('poi_id', row.poi_id);
        }
        fixed++;
        push('done', `${dryRun ? '[DRY] ' : ''}✓ ${row.poi_id} — "${desc.slice(0, 60)}…"`);
      } catch (e) {
        errCount++;
        push('error', `✗ ${row.poi_id} — ${e.message}`);
      }
    }

    push('done', `Complete — Fixed: ${fixed} | Skipped: ${skipped} | Errors: ${errCount}`);
    setRunning(false);
  }

  return (
    <div>
      <h2 style={{ color: '#fff', fontSize: 18, marginBottom: 8, marginTop: 0 }}>Destination Repair</h2>
      <p style={{ color: '#D9C5B2', fontSize: 13, marginBottom: 24 }}>
        Re-fetches null <code>description</code> fields in <code>poi_enrichment</code> from Wikidata
        using the stored <code>wikidata_qid</code>.
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        <label style={{ color: '#D9C5B2', fontSize: 13 }}>
          Limit&nbsp;
          <input
            type="number" value={limit} min={1} max={1000}
            onChange={e => setLimit(Number(e.target.value))}
            style={inputStyle}
          />
        </label>
        <label style={{ color: '#D9C5B2', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
          <input type="checkbox" checked={dryRun} onChange={e => setDryRun(e.target.checked)} />
          Dry run (no writes)
        </label>
        <button onClick={runRepair} disabled={running} style={running ? btnDisabled : btnActive}>
          {running ? 'Running…' : dryRun ? 'Scan Only' : 'Scan & Fix'}
        </button>
      </div>

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
