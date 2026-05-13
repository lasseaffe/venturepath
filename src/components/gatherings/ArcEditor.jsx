// VenturePath · Phase 3 · Arc editor — agenda blocks (Convener only)
// Reorder via up/down arrows (no dnd-kit dependency added).
import { useCallback, useEffect, useState } from 'react';
import {
  listArcBlocks, createArcBlock, updateArcBlock,
  deleteArcBlock, reorderArcBlocks,
} from '../../lib/gatherings/api';

const S = {
  label: {
    fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.35)', display: 'block', marginBottom: 6,
  },
  input: {
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)',
    color: '#fff', fontFamily: "'JetBrains Mono', monospace",
    fontSize: 12, padding: '8px 10px', outline: 'none', boxSizing: 'border-box',
  },
  block: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '8px 10px', marginBottom: 4,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
  },
  ordBtn: {
    background: 'none', border: '1px solid rgba(255,255,255,0.1)',
    color: 'rgba(255,255,255,0.5)',
    width: 22, height: 22, cursor: 'pointer',
    fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
  },
  btnSmall: (color) => ({
    background: color + '22', color, border: `1px solid ${color}55`,
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase',
    padding: '4px 8px', cursor: 'pointer',
  }),
  newCard: {
    border: '1px dashed rgba(230,126,34,0.4)',
    padding: '12px',
    background: 'rgba(230,126,34,0.04)',
    marginBottom: 12,
  },
};

export default function ArcEditor({ gatheringId, isConvener, roles = [], onChanged }) {
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState(null);
  const [newTitle, setNewTitle] = useState('');
  const [newDuration, setNewDuration] = useState('');
  const [newRoleId, setNewRoleId] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    const { data } = await listArcBlocks(gatheringId);
    setBlocks(data ?? []);
    setLoading(false);
  }, [gatheringId]);

  useEffect(() => { reload(); }, [reload]);

  async function handleAdd(e) {
    e.preventDefault();
    if (!newTitle.trim() || !isConvener) return;
    const ord = blocks.length > 0 ? Math.max(...blocks.map(b => b.ord)) + 1 : 0;
    await createArcBlock(gatheringId, {
      ord,
      title: newTitle.trim(),
      duration_min: newDuration ? parseInt(newDuration, 10) : null,
      role_id: newRoleId || null,
    });
    setNewTitle('');
    setNewDuration('');
    setNewRoleId('');
    await reload();
    onChanged?.();
  }

  function startEdit(block) {
    setEditingId(block.id);
    setEditDraft({
      title:        block.title,
      note:         block.note ?? '',
      duration_min: block.duration_min ?? '',
      role_id:      block.role_id ?? '',
    });
  }

  async function saveEdit() {
    if (!editDraft) return;
    await updateArcBlock(editingId, {
      title:        editDraft.title.trim(),
      note:         editDraft.note.trim() || null,
      duration_min: editDraft.duration_min ? parseInt(editDraft.duration_min, 10) : null,
      role_id:      editDraft.role_id || null,
    });
    setEditingId(null);
    setEditDraft(null);
    await reload();
    onChanged?.();
  }

  async function handleDelete(blockId) {
    await deleteArcBlock(blockId);
    await reload();
    onChanged?.();
  }

  async function move(idx, dir) {
    const target = idx + dir;
    if (target < 0 || target >= blocks.length) return;
    const swapped = [...blocks];
    [swapped[idx], swapped[target]] = [swapped[target], swapped[idx]];
    // Reassign ord values
    const updates = swapped.map((b, i) => ({ id: b.id, ord: i }));
    setBlocks(swapped.map((b, i) => ({ ...b, ord: i })));
    await reorderArcBlocks(updates);
    onChanged?.();
  }

  if (loading) {
    return <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', textAlign: 'center', padding: 16 }}>▢▢▢ LOADING ARC</div>;
  }

  return (
    <div style={{ fontFamily: "'JetBrains Mono', monospace" }}>
      {isConvener && (
        <form onSubmit={handleAdd} style={S.newCard}>
          <div style={{ fontSize: 9, color: '#E67E22', letterSpacing: '0.14em', marginBottom: 8, fontWeight: 700 }}>
            ▣ ADD ARC BLOCK
          </div>
          <input
            style={{ ...S.input, marginBottom: 6, width: '100%' }}
            value={newTitle} onChange={e => setNewTitle(e.target.value)}
            placeholder="Block title (e.g. Stories & reflection)"
          />
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              style={{ ...S.input, width: 100 }}
              value={newDuration} onChange={e => setNewDuration(e.target.value)}
              placeholder="Minutes"
              type="number" min={1} max={1440}
            />
            {roles.length > 0 && (
              <select
                style={{ ...S.input, flex: 1, colorScheme: 'dark' }}
                value={newRoleId} onChange={e => setNewRoleId(e.target.value)}
              >
                <option value="">— No role —</option>
                {roles.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
            )}
            <button type="submit" style={S.btnSmall('#E67E22')}>+ ADD</button>
          </div>
        </form>
      )}

      {blocks.length === 0 ? (
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', padding: '8px 0' }}>
          {isConvener ? 'No Arc blocks yet. Add your first above.' : 'No agenda set.'}
        </div>
      ) : (
        blocks.map((block, idx) => {
          const role = roles.find(r => r.id === block.role_id);
          const isEditing = editingId === block.id;
          return (
            <div key={block.id} style={S.block}>
              {isConvener && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <button type="button" style={S.ordBtn} onClick={() => move(idx, -1)} disabled={idx === 0}>▲</button>
                  <button type="button" style={S.ordBtn} onClick={() => move(idx, 1)} disabled={idx === blocks.length - 1}>▼</button>
                </div>
              )}
              <div style={{ fontSize: 9, color: '#E67E22', fontWeight: 700, minWidth: 22 }}>{idx + 1}.</div>

              {isEditing ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <input
                    style={{ ...S.input, width: '100%' }}
                    value={editDraft.title}
                    onChange={e => setEditDraft({ ...editDraft, title: e.target.value })}
                  />
                  <input
                    style={{ ...S.input, width: '100%' }}
                    value={editDraft.note}
                    onChange={e => setEditDraft({ ...editDraft, note: e.target.value })}
                    placeholder="Note (optional)"
                  />
                  <div style={{ display: 'flex', gap: 4 }}>
                    <input
                      style={{ ...S.input, width: 80 }}
                      value={editDraft.duration_min}
                      onChange={e => setEditDraft({ ...editDraft, duration_min: e.target.value })}
                      type="number" min={1} placeholder="Mins"
                    />
                    {roles.length > 0 && (
                      <select
                        style={{ ...S.input, flex: 1, colorScheme: 'dark' }}
                        value={editDraft.role_id}
                        onChange={e => setEditDraft({ ...editDraft, role_id: e.target.value })}
                      >
                        <option value="">— No role —</option>
                        {roles.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                      </select>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: '#fff' }}>{block.title}</div>
                  {block.note && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{block.note}</div>}
                  {role && (
                    <div style={{ fontSize: 9, color: '#F2C94C', marginTop: 2 }}>
                      ◈ {role.label}
                    </div>
                  )}
                </div>
              )}

              {block.duration_min && !isEditing && (
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>{block.duration_min}m</div>
              )}

              {isConvener && (
                isEditing ? (
                  <>
                    <button type="button" onClick={saveEdit} style={S.btnSmall('#4ade80')}>SAVE</button>
                    <button type="button" onClick={() => { setEditingId(null); setEditDraft(null); }} style={S.btnSmall('rgba(255,255,255,0.4)')}>✕</button>
                  </>
                ) : (
                  <>
                    <button type="button" onClick={() => startEdit(block)} style={S.btnSmall('#E67E22')}>EDIT</button>
                    <button type="button" onClick={() => handleDelete(block.id)} style={{ background: 'none', border: 'none', color: 'rgba(239,68,68,0.5)', cursor: 'pointer', fontSize: 12 }}>✕</button>
                  </>
                )
              )}
            </div>
          );
        })
      )}

      {!isConvener && (
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 8, fontStyle: 'italic' }}>
          Only the Convener can modify the Arc.
        </div>
      )}
    </div>
  );
}
