import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { listProposals, createProposal, castVote, resolveProposal, deleteProposal, subscribeToProposals, updateGathering } from '../../lib/gatherings/api.js';

const FIELD_OPTS = [
  { value: 'time',     label: 'TIME' },
  { value: 'location', label: 'LOCATION' },
  { value: 'menu',     label: 'MENU' },
  { value: 'gear',     label: 'GEAR' },
  { value: 'custom',   label: 'CUSTOM' },
];

const S = {
  sectionTitle: { color: '#888', fontSize: '0.6rem', letterSpacing: '0.15em', marginBottom: '0.75rem', marginTop: '1.25rem' },
  card: (status) => ({ background: '#111', border: `1px solid ${status === 'adopted' ? '#27AE6033' : status === 'rejected' ? '#e74c3c33' : '#222'}`, padding: '0.75rem', marginBottom: '0.5rem' }),
  field: { color: '#E67E22', fontSize: '0.6rem', letterSpacing: '0.1em', marginBottom: '0.25rem' },
  value: { color: '#D9C5B2', fontSize: '0.85rem', marginBottom: '0.5rem', lineHeight: 1.4 },
  proposer: { color: '#666', fontSize: '0.65rem', marginBottom: '0.5rem' },
  voteRow: { display: 'flex', gap: '0.5rem', alignItems: 'center' },
  voteBtn: (active, color) => ({ padding: '0.25rem 0.6rem', background: active ? color : 'transparent', border: `1px solid ${active ? color : '#444'}`, color: active ? '#fff' : '#888', fontSize: '0.65rem', cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace' }),
  voteCount: { color: '#888', fontSize: '0.65rem', marginLeft: '0.25rem' },
  resolveRow: { display: 'flex', gap: '0.5rem', marginTop: '0.5rem' },
  btn: (color = '#E67E22', sm = false) => ({ padding: sm ? '0.3rem 0.7rem' : '0.6rem 1.2rem', background: color, border: 'none', color: '#fff', fontSize: sm ? '0.6rem' : '0.7rem', letterSpacing: '0.08em', cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }),
  ghost: (sm = false) => ({ padding: sm ? '0.3rem 0.7rem' : '0.6rem 1.2rem', background: 'transparent', border: '1px solid #444', color: '#D9C5B2', fontSize: sm ? '0.6rem' : '0.7rem', cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace' }),
  input: { width: '100%', background: '#1a1a1a', border: '1px solid #333', color: '#fff', padding: '0.6rem', fontSize: '0.8rem', fontFamily: 'JetBrains Mono, monospace', boxSizing: 'border-box', marginBottom: '0.5rem' },
  select: { width: '100%', background: '#1a1a1a', border: '1px solid #333', color: '#fff', padding: '0.6rem', fontSize: '0.8rem', fontFamily: 'JetBrains Mono, monospace', boxSizing: 'border-box', marginBottom: '0.5rem' },
};

export default function GatheringLedger({ gatheringId, conveyorId, isConvener, onApplied }) {
  const { profile } = useAuth();
  const [proposals, setProposals] = useState([]);
  const [field, setField]   = useState('time');
  const [value, setValue]   = useState('');
  const [busy, setBusy]     = useState(false);

  const reload = useCallback(async () => {
    const data = await listProposals(gatheringId);
    setProposals(data);
  }, [gatheringId]);

  useEffect(() => { reload(); }, [reload]);

  useEffect(() => {
    const ch = subscribeToProposals(gatheringId, reload);
    return () => ch.unsubscribe();
  }, [gatheringId, reload]);

  async function submit(e) {
    e.preventDefault(); if (!value.trim()) return;
    setBusy(true);
    await createProposal(gatheringId, field, { text: value.trim() });
    setValue(''); setBusy(false); reload();
  }

  async function vote(id, v) {
    await castVote(id, v); reload();
  }

  async function adopt(p) {
    await resolveProposal(p.id, 'adopted');
    // apply the value back to the gathering if relevant field
    if (p.field === 'time' && p.proposed_value?.text) {
      const parsed = new Date(p.proposed_value.text);
      if (!isNaN(parsed)) await updateGathering(gatheringId, { starts_at: parsed.toISOString() });
    }
    if (p.field === 'location' && p.proposed_value?.text) {
      await updateGathering(gatheringId, { location_label: p.proposed_value.text });
    }
    reload(); onApplied?.();
  }

  async function reject(id) {
    await resolveProposal(id, 'rejected'); reload();
  }

  const open     = proposals.filter(p => p.status === 'open');
  const resolved = proposals.filter(p => p.status !== 'open');

  return (
    <div style={{ fontFamily: 'JetBrains Mono, monospace' }}>
      {/* New proposal */}
      <div style={S.sectionTitle}>PROPOSE A CHANGE</div>
      <form onSubmit={submit}>
        <select style={S.select} value={field} onChange={e => setField(e.target.value)}>
          {FIELD_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <input style={S.input} value={value} onChange={e => setValue(e.target.value)} placeholder={`Proposed ${field}...`} />
        <button style={S.btn('#E67E22', true)} type="submit" disabled={busy}>PROPOSE</button>
      </form>

      {/* Open proposals */}
      <div style={S.sectionTitle}>OPEN PROPOSALS ({open.length})</div>
      {open.length === 0 && <div style={{ color: '#555', fontSize: '0.75rem' }}>No open proposals — the squad is aligned</div>}
      {open.map(p => {
        const votes   = p.votes ?? {};
        const ups     = Object.values(votes).filter(v => v === 'up').length;
        const downs   = Object.values(votes).filter(v => v === 'down').length;
        const myVote  = votes[profile?.id] ?? null;
        return (
          <div key={p.id} style={S.card('open')}>
            <div style={S.field}>{p.field.toUpperCase()}</div>
            <div style={S.value}>{p.proposed_value?.text}</div>
            <div style={S.proposer}>Proposed by @{p.proposer?.handle ?? '—'}</div>
            <div style={S.voteRow}>
              <button style={S.voteBtn(myVote === 'up', '#27AE60')} onClick={() => vote(p.id, myVote === 'up' ? 'clear' : 'up')}>▲</button>
              <span style={S.voteCount}>{ups}</span>
              <button style={S.voteBtn(myVote === 'down', '#e74c3c')} onClick={() => vote(p.id, myVote === 'down' ? 'clear' : 'down')}>▼</button>
              <span style={S.voteCount}>{downs}</span>
            </div>
            {isConvener && (
              <div style={S.resolveRow}>
                <button style={S.btn('#27AE60', true)} onClick={() => adopt(p)}>ADOPT</button>
                <button style={S.ghost(true)} onClick={() => reject(p.id)}>REJECT</button>
                <button style={S.ghost(true)} onClick={() => deleteProposal(p.id).then(reload)}>✕</button>
              </div>
            )}
          </div>
        );
      })}

      {/* Resolved */}
      {resolved.length > 0 && (
        <details style={{ marginTop: '1rem' }}>
          <summary style={{ color: '#666', fontSize: '0.65rem', cursor: 'pointer', letterSpacing: '0.1em' }}>
            RESOLVED PROPOSALS ({resolved.length})
          </summary>
          {resolved.map(p => (
            <div key={p.id} style={{ ...S.card(p.status), marginTop: '0.5rem' }}>
              <div style={S.field}>{p.field.toUpperCase()} — {p.status.toUpperCase()}</div>
              <div style={S.value}>{p.proposed_value?.text}</div>
            </div>
          ))}
        </details>
      )}
    </div>
  );
}
