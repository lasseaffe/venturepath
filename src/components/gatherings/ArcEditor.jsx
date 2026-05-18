import { useState, useEffect, useCallback } from 'react';
import { listArcBlocks, createArcBlock, updateArcBlock, deleteArcBlock, reorderArcBlocks } from '../../lib/gatherings/api.js';

const S = {
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '0.6rem 0', borderBottom: '1px solid #1a1a1a' },
  ord: { color: '#555', fontSize: '0.65rem', width: 24, flexShrink: 0 },
  content: { flex: 1 },
  title: { color: '#D9C5B2', fontSize: '0.85rem' },
  meta: { color: '#666', fontSize: '0.65rem', marginTop: '0.15rem' },
  actions: { display: 'flex', gap: '0.3rem', flexShrink: 0, marginLeft: '0.5rem' },
  iconBtn: { background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '0.75rem', padding: '0.15rem' },
  input: { width: '100%', background: '#1a1a1a', border: '1px solid #333', color: '#fff', padding: '0.5rem', fontSize: '0.8rem', fontFamily: 'JetBrains Mono, monospace', boxSizing: 'border-box', marginBottom: '0.4rem' },
  select: { width: '100%', background: '#1a1a1a', border: '1px solid #333', color: '#fff', padding: '0.5rem', fontSize: '0.8rem', fontFamily: 'JetBrains Mono, monospace', boxSizing: 'border-box', marginBottom: '0.4rem' },
  numInput: { width: 80, background: '#1a1a1a', border: '1px solid #333', color: '#fff', padding: '0.5rem', fontSize: '0.8rem', fontFamily: 'JetBrains Mono, monospace', boxSizing: 'border-box' },
  btn: (color = '#E67E22') => ({ padding: '0.4rem 0.8rem', background: color, border: 'none', color: '#fff', fontSize: '0.65rem', letterSpacing: '0.08em', cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }),
  ghost: { padding: '0.4rem 0.8rem', background: 'transparent', border: '1px solid #444', color: '#D9C5B2', fontSize: '0.65rem', cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace' },
  addForm: { background: '#111', border: '1px solid #222', padding: '0.75rem', marginTop: '1rem' },
  editForm: { background: '#0d0d0d', border: '1px solid #2a2a2a', padding: '0.75rem', marginTop: '0.25rem' },
};

export default function ArcEditor({ gatheringId, isConvener, roles = [], onSaved }) {
  const [blocks, setBlocks] = useState([]);
  const [editing, setEditing] = useState(null); // block id being edited
  const [adding, setAdding]   = useState(false);
  const [form, setForm] = useState({ title: '', note: '', duration_min: '', role_id: '' });

  const reload = useCallback(async () => {
    const data = await listArcBlocks(gatheringId);
    setBlocks(data);
  }, [gatheringId]);

  useEffect(() => { reload(); }, [reload]);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function add() {
    if (!form.title.trim()) return;
    const nextOrd = blocks.length;
    await createArcBlock(gatheringId, {
      ord: nextOrd, title: form.title, note: form.note || null,
      duration_min: parseInt(form.duration_min) || null,
      role_id: form.role_id || null,
    });
    setForm({ title: '', note: '', duration_min: '', role_id: '' });
    setAdding(false); reload(); onSaved?.();
  }

  async function save(id) {
    await updateArcBlock(id, {
      title: form.title, note: form.note || null,
      duration_min: parseInt(form.duration_min) || null,
      role_id: form.role_id || null,
    });
    setEditing(null); reload(); onSaved?.();
  }

  async function del(id) {
    await deleteArcBlock(id);
    reload();
  }

  async function move(idx, dir) {
    const reordered = [...blocks];
    const swap = idx + dir;
    if (swap < 0 || swap >= reordered.length) return;
    [reordered[idx], reordered[swap]] = [reordered[swap], reordered[idx]];
    const updates = reordered.map((b, i) => ({ id: b.id, ord: i }));
    setBlocks(reordered.map((b, i) => ({ ...b, ord: i })));
    await reorderArcBlocks(updates);
  }

  function startEdit(b) {
    setEditing(b.id);
    setForm({ title: b.title, note: b.note ?? '', duration_min: b.duration_min ?? '', role_id: b.role_id ?? '' });
  }

  return (
    <div style={{ fontFamily: 'JetBrains Mono, monospace' }}>
      {blocks.length === 0 && !adding && (
        <div style={{ color: '#555', fontSize: '0.75rem', padding: '1rem 0' }}>
          No arc blocks yet — add the moments that make this Gathering
        </div>
      )}

      {blocks.map((b, idx) => (
        <div key={b.id}>
          <div style={S.row}>
            <div style={S.ord}>{idx + 1}</div>
            <div style={S.content}>
              <div style={S.title}>{b.title}</div>
              <div style={S.meta}>
                {b.duration_min && `${b.duration_min} min`}
                {b.duration_min && b.role_id && ' · '}
                {b.role_id && roles.find(r => r.id === b.role_id)?.label}
              </div>
            </div>
            {isConvener && (
              <div style={S.actions}>
                <button style={S.iconBtn} onClick={() => move(idx, -1)} disabled={idx === 0}>▲</button>
                <button style={S.iconBtn} onClick={() => move(idx, 1)} disabled={idx === blocks.length - 1}>▼</button>
                <button style={S.iconBtn} onClick={() => startEdit(b)}>✎</button>
                <button style={S.iconBtn} onClick={() => del(b.id)}>✕</button>
              </div>
            )}
          </div>

          {editing === b.id && (
            <div style={S.editForm}>
              <input style={S.input} value={form.title} onChange={e => set('title', e.target.value)} placeholder="Title" />
              <input style={S.input} value={form.note} onChange={e => set('note', e.target.value)} placeholder="Note (optional)" />
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.4rem' }}>
                <input style={S.numInput} type="number" value={form.duration_min} onChange={e => set('duration_min', e.target.value)} placeholder="min" />
                <select style={{ ...S.select, marginBottom: 0 }} value={form.role_id} onChange={e => set('role_id', e.target.value)}>
                  <option value="">No role</option>
                  {roles.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button style={S.btn()} onClick={() => save(b.id)}>SAVE</button>
                <button style={S.ghost} onClick={() => setEditing(null)}>CANCEL</button>
              </div>
            </div>
          )}
        </div>
      ))}

      {isConvener && (
        <>
          {!adding && (
            <button style={{ ...S.btn(), marginTop: '0.75rem' }} onClick={() => setAdding(true)}>+ ADD MOMENT</button>
          )}
          {adding && (
            <div style={S.addForm}>
              <input style={S.input} value={form.title} onChange={e => set('title', e.target.value)} placeholder="Moment title" />
              <input style={S.input} value={form.note} onChange={e => set('note', e.target.value)} placeholder="Note (optional)" />
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.4rem' }}>
                <input style={S.numInput} type="number" value={form.duration_min} onChange={e => set('duration_min', e.target.value)} placeholder="min" />
                <select style={{ ...S.select, marginBottom: 0 }} value={form.role_id} onChange={e => set('role_id', e.target.value)}>
                  <option value="">No role</option>
                  {roles.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button style={S.btn()} onClick={add}>ADD</button>
                <button style={S.ghost} onClick={() => setAdding(false)}>CANCEL</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
