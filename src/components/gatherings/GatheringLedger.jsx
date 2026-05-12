// VenturePath · Phase 3 · Ledger — vote on Gathering proposals
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  listProposals, createProposal, castVote, resolveProposal, deleteProposal,
  subscribeToProposals, updateGathering,
} from '../../lib/gatherings/api';

const FIELD_LABELS = {
  time:     'TIME',
  location: 'LOCATION',
  menu:     'MENU',
  gear:     'GEAR',
  custom:   'OTHER',
};

const S = {
  wrap: { fontFamily: "'JetBrains Mono', monospace" },
  label: {
    fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.35)', display: 'block', marginBottom: 6,
  },
  input: {
    width: '100%', background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.12)',
    color: '#fff', fontFamily: "'JetBrains Mono', monospace",
    fontSize: 12, padding: '8px 10px', outline: 'none', boxSizing: 'border-box',
  },
  card: (status) => ({
    border: `1px solid ${
      status === 'adopted'  ? 'rgba(74,222,128,0.4)' :
      status === 'rejected' ? 'rgba(239,68,68,0.4)' :
                              'rgba(255,255,255,0.12)'
    }`,
    background: 'rgba(255,255,255,0.03)',
    padding: '12px 14px', marginBottom: 8,
  }),
  btnSmall: (color) => ({
    background: color + '22', color, border: `1px solid ${color}55`,
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase',
    padding: '4px 8px', cursor: 'pointer',
  }),
  newCard: {
    border: '1px dashed rgba(230,126,34,0.4)',
    padding: '12px 14px', marginBottom: 12,
    background: 'rgba(230,126,34,0.04)',
  },
};

function summarize(field, value) {
  if (!value) return '—';
  if (field === 'time') {
    try { return new Date(value).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch { return String(value); }
  }
  if (field === 'location') return typeof value === 'object' ? (value.label ?? JSON.stringify(value)) : String(value);
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
}

function VoteRow({ proposal, myVote, onVote, onAdopt, onReject, onDelete, isConvener, isMine }) {
  const votes = proposal.votes ?? {};
  const ups   = Object.values(votes).filter(v => v === 'up').length;
  const downs = Object.values(votes).filter(v => v === 'down').length;

  return (
    <div style={S.card(proposal.status)}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.12em', marginBottom: 4 }}>
            {FIELD_LABELS[proposal.field]} · proposed by @{proposal.proposer?.handle ?? '…'}
            {proposal.status !== 'open' && (
              <span style={{ marginLeft: 8, color: proposal.status === 'adopted' ? '#4ade80' : '#ef4444' }}>
                · {proposal.status.toUpperCase()}
              </span>
            )}
          </div>
          <div style={{ fontSize: 13, color: '#fff', marginBottom: 8 }}>
            {summarize(proposal.field, proposal.proposed_value)}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {proposal.status === 'open' && (
              <>
                <button
                  onClick={() => onVote(myVote === 'up' ? 'clear' : 'up')}
                  style={S.btnSmall(myVote === 'up' ? '#4ade80' : 'rgba(255,255,255,0.5)')}
                >
                  ▲ {ups}
                </button>
                <button
                  onClick={() => onVote(myVote === 'down' ? 'clear' : 'down')}
                  style={S.btnSmall(myVote === 'down' ? '#ef4444' : 'rgba(255,255,255,0.5)')}
                >
                  ▼ {downs}
                </button>
              </>
            )}
            {isConvener && proposal.status === 'open' && (
              <>
                <button onClick={onAdopt}  style={S.btnSmall('#4ade80')}>ADOPT</button>
                <button onClick={onReject} style={S.btnSmall('#ef4444')}>REJECT</button>
              </>
            )}
            {(isMine || isConvener) && (
              <button onClick={onDelete} style={S.btnSmall('rgba(255,255,255,0.3)')}>DELETE</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GatheringLedger({ gatheringId, conveyorId, gathering, onAdopted }) {
  const { architect } = useAuth();
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [field, setField]         = useState('time');
  const [valueText, setValueText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState(null);

  const isConvener = conveyorId === architect?.id;

  const reload = useCallback(async () => {
    setLoading(true);
    const { data } = await listProposals(gatheringId);
    setProposals(data ?? []);
    setLoading(false);
  }, [gatheringId]);

  useEffect(() => { reload(); }, [reload]);

  // Realtime
  useEffect(() => {
    const channel = subscribeToProposals(gatheringId, { onChange: reload });
    return () => channel.unsubscribe();
  }, [gatheringId, reload]);

  async function handleCreate(e) {
    e.preventDefault();
    if (!valueText.trim() || !architect?.id) return;
    setError(null);
    setSubmitting(true);

    let proposedValue;
    try {
      if (field === 'time') {
        const d = new Date(valueText);
        if (isNaN(d.getTime())) throw new Error('Invalid date');
        proposedValue = d.toISOString();
      } else if (field === 'location') {
        proposedValue = { label: valueText.trim() };
      } else {
        proposedValue = valueText.trim();
      }
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
      return;
    }

    const { error: err } = await createProposal(gatheringId, architect.id, field, proposedValue);
    setSubmitting(false);
    if (err) { setError(err.message); return; }
    setValueText('');
    reload();
  }

  async function handleVote(proposalId, vote) {
    await castVote(proposalId, vote);
    reload();
  }

  async function handleAdopt(proposal) {
    await resolveProposal(proposal.id, 'adopted');
    // Apply adopted value to the parent Gathering
    if (proposal.field === 'time') {
      await updateGathering(gatheringId, { starts_at: proposal.proposed_value });
    } else if (proposal.field === 'location') {
      const v = proposal.proposed_value;
      const label = typeof v === 'object' ? v.label : v;
      await updateGathering(gatheringId, { location_label: label });
    }
    onAdopted?.();
    reload();
  }

  async function handleReject(proposalId) {
    await resolveProposal(proposalId, 'rejected');
    reload();
  }

  async function handleDelete(proposalId) {
    await deleteProposal(proposalId);
    reload();
  }

  const open    = proposals.filter(p => p.status === 'open');
  const resolved = proposals.filter(p => p.status !== 'open');

  return (
    <div style={S.wrap}>
      {/* New proposal form */}
      {architect && (
        <form onSubmit={handleCreate} style={S.newCard}>
          <div style={{ fontSize: 9, color: '#E67E22', letterSpacing: '0.14em', marginBottom: 8, fontWeight: 700 }}>
            ▣ NEW PROPOSAL
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            {Object.entries(FIELD_LABELS).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setField(k)}
                style={{
                  ...S.btnSmall(field === k ? '#E67E22' : 'rgba(255,255,255,0.4)'),
                  background: field === k ? 'rgba(230,126,34,0.2)' : 'transparent',
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <input
            style={S.input}
            type={field === 'time' ? 'datetime-local' : 'text'}
            value={valueText}
            onChange={e => setValueText(e.target.value)}
            placeholder={
              field === 'time'     ? 'When?' :
              field === 'location' ? 'Where?' :
              field === 'menu'     ? 'What to cook?' :
              field === 'gear'     ? 'What gear?' :
                                     'Your proposal'
            }
          />
          {error && <div style={{ fontSize: 10, color: '#ef4444', marginTop: 6 }}>{error}</div>}
          <div style={{ marginTop: 8 }}>
            <button type="submit" style={{ ...S.btnSmall('#E67E22'), padding: '6px 14px' }} disabled={submitting}>
              {submitting ? '…' : 'PROPOSE'}
            </button>
          </div>
        </form>
      )}

      {/* Open proposals */}
      {loading ? (
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', textAlign: 'center', padding: 16 }}>
          ▢▢▢ LOADING LEDGER
        </div>
      ) : open.length === 0 ? (
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', padding: '8px 0' }}>
          No open proposals. The squad is in agreement.
        </div>
      ) : (
        open.map(p => (
          <VoteRow
            key={p.id}
            proposal={p}
            myVote={p.votes?.[architect?.id] ?? null}
            onVote={(v) => handleVote(p.id, v)}
            onAdopt={() => handleAdopt(p)}
            onReject={() => handleReject(p.id)}
            onDelete={() => handleDelete(p.id)}
            isConvener={isConvener}
            isMine={p.proposed_by === architect?.id}
          />
        ))
      )}

      {/* Resolved (collapsed) */}
      {resolved.length > 0 && (
        <details style={{ marginTop: 12 }}>
          <summary style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.12em', cursor: 'pointer', padding: '4px 0' }}>
            ▾ {resolved.length} RESOLVED
          </summary>
          <div style={{ marginTop: 8 }}>
            {resolved.map(p => (
              <VoteRow
                key={p.id}
                proposal={p}
                myVote={p.votes?.[architect?.id] ?? null}
                onVote={() => {}}
                onAdopt={() => {}}
                onReject={() => {}}
                onDelete={() => handleDelete(p.id)}
                isConvener={isConvener}
                isMine={p.proposed_by === architect?.id}
              />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
