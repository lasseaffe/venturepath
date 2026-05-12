import { useState } from 'react';
import { adminSupabase } from '../../../lib/adminSupabase';
import AdminLog from '../shared/AdminLog';
import { useAdminLog } from '../shared/useAdminLog';
import { similarity } from '../../../utils/levenshtein';

export default function DuplicateDetectorPanel() {
  const [threshold, setThreshold] = useState(85);
  const [pairs, setPairs] = useState([]);
  const [scanned, setScanned] = useState(null);
  const { lines, running, setRunning, push, clear } = useAdminLog();

  async function runScan() {
    clear();
    setPairs([]);
    setScanned(null);
    setRunning(true);
    push('start', 'Fetching all pro_paths titles…');

    const { data, error } = await adminSupabase
      .from('pro_paths')
      .select('id, name, destination');

    if (error) {
      push('error', `DB error: ${error.message}`);
      setRunning(false);
      return;
    }

    push('start', `Comparing ${data.length} records at ${threshold}% threshold…`);
    const found = [];

    for (let i = 0; i < data.length; i++) {
      for (let j = i + 1; j < data.length; j++) {
        const titleA = data[i].name || data[i].destination || '';
        const titleB = data[j].name || data[j].destination || '';
        const score = similarity(titleA, titleB);
        if (score >= threshold) {
          found.push({ a: data[i], b: data[j], score, labelA: titleA, labelB: titleB });
        }
      }
    }

    found.sort((x, y) => y.score - x.score);
    setScanned(data.length);
    setPairs(found);
    push('done', `Scanned ${data.length} records — found ${found.length} potential duplicate pair(s)`);
    setRunning(false);
  }

  async function deleteRow(id, label) {
    const { error } = await adminSupabase.from('pro_paths').delete().eq('id', id);
    if (error) {
      push('error', `Delete failed for "${label}": ${error.message}`);
    } else {
      push('done', `Deleted "${label}"`);
      setPairs(prev => prev.filter(p => p.a.id !== id && p.b.id !== id));
    }
  }

  const scoreColor = s => s >= 95 ? '#E74C3C' : s >= 90 ? '#E67E22' : '#D9C5B2';

  return (
    <div>
      <h2 style={{ color: '#fff', fontSize: 18, marginBottom: 8, marginTop: 0 }}>Duplicate Detector</h2>
      <p style={{ color: '#D9C5B2', fontSize: 13, marginBottom: 24 }}>
        Finds <code>pro_paths</code> records with near-identical names using Levenshtein similarity.
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        <label style={{ color: '#D9C5B2', fontSize: 13 }}>
          Similarity threshold:&nbsp;
          <strong style={{ color: '#E67E22' }}>{threshold}%</strong>
          &nbsp;
          <input
            type="range" min={70} max={100} value={threshold}
            onChange={e => setThreshold(Number(e.target.value))}
            style={{ verticalAlign: 'middle' }}
          />
        </label>
        <button onClick={runScan} disabled={running} style={running ? btnDisabled : btnActive}>
          {running ? 'Scanning…' : 'Scan'}
        </button>
      </div>

      {scanned !== null && (
        <p style={{ color: '#D9C5B2', fontSize: 13, marginBottom: 16, fontFamily: '"JetBrains Mono", monospace' }}>
          Scanned {scanned} records — {pairs.length} potential duplicate pair(s)
        </p>
      )}

      {pairs.length > 0 && (
        <div style={{ marginBottom: 24, maxHeight: 400, overflowY: 'auto' }}>
          {pairs.map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #1C2025', flexWrap: 'wrap' }}>
              <span style={{ color: scoreColor(p.score), fontFamily: '"JetBrains Mono", monospace', fontSize: 12, minWidth: 48 }}>
                {p.score}%
              </span>
              <span style={{ color: '#D9C5B2', fontSize: 13, flex: 1, minWidth: 160 }}>{p.labelA}</span>
              <button onClick={() => deleteRow(p.a.id, p.labelA)} style={btnDelete}>Delete A</button>
              <span style={{ color: '#4A5568', fontSize: 13, flex: 1, minWidth: 160 }}>{p.labelB}</span>
              <button onClick={() => deleteRow(p.b.id, p.labelB)} style={btnDelete}>Delete B</button>
            </div>
          ))}
        </div>
      )}

      <AdminLog lines={lines} />
    </div>
  );
}

const btnActive = {
  background: '#E67E22', border: 'none', borderRadius: 4,
  padding: '8px 20px', color: '#fff',
  fontFamily: '"JetBrains Mono", monospace', fontSize: 13, cursor: 'pointer',
};
const btnDisabled = { ...btnActive, background: '#555', cursor: 'default' };
const btnDelete = {
  background: 'transparent', border: '1px solid #E74C3C', borderRadius: 4,
  padding: '4px 10px', color: '#E74C3C',
  fontFamily: '"JetBrains Mono", monospace', fontSize: 11, cursor: 'pointer',
};
