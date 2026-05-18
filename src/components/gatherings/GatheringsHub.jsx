import { useState } from 'react';
import GatheringCard from './GatheringCard.jsx';
import GatheringDetail from './GatheringDetail.jsx';
import CreateGatheringForm from './CreateGatheringForm.jsx';

const S = {
  root: { fontFamily: 'JetBrains Mono, monospace' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' },
  title: { color: '#fff', fontFamily: 'Playfair Display, serif', fontSize: '1.4rem', fontWeight: 700 },
  btn: { padding: '0.6rem 1.2rem', background: '#E67E22', border: 'none', color: '#fff', fontSize: '0.7rem', letterSpacing: '0.1em', cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 },
  filterRow: { display: 'flex', gap: '0.5rem', marginBottom: '1rem' },
  filterTab: (active) => ({ padding: '0.4rem 0.8rem', background: active ? '#E67E2233' : 'transparent', border: `1px solid ${active ? '#E67E22' : '#333'}`, color: active ? '#E67E22' : '#888', fontSize: '0.65rem', letterSpacing: '0.1em', cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace' }),
  empty: { padding: '2.5rem', textAlign: 'center', border: '1px dashed #2a2a2a' },
  emptyTitle: { color: '#D9C5B2', fontSize: '0.9rem', marginBottom: '0.5rem' },
  emptySub: { color: '#666', fontSize: '0.75rem', lineHeight: 1.5, marginBottom: '1.25rem' },
  modal: { position: 'fixed', inset: 0, background: '#000c', zIndex: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' },
  modalInner: { background: '#0E1012', width: '100%', maxWidth: 540, maxHeight: '85vh', overflowY: 'auto', padding: '1.5rem', border: '1px solid #333', fontFamily: 'JetBrains Mono, monospace' },
};

export default function GatheringsHub({ items = [], loading, tripId = null, onCreate, onReload }) {
  const [filter, setFilter]   = useState('upcoming');
  const [creating, setCreating] = useState(false);
  const [detailId, setDetailId] = useState(null);

  const now = Date.now();
  const filtered = filter === 'upcoming'
    ? items.filter(g => g.status !== 'cancelled' && g.status !== 'completed' && (!g.starts_at || new Date(g.starts_at).getTime() >= now))
    : items;

  function handleCreated(g) {
    setCreating(false);
    onReload?.();
    setDetailId(g.id);
    onCreate?.(g);
  }

  return (
    <div style={S.root}>
      <div style={S.header}>
        <div style={S.title}>Gatherings</div>
        <button style={S.btn} onClick={() => setCreating(true)}>+ CONVENE</button>
      </div>

      <div style={S.filterRow}>
        <button style={S.filterTab(filter === 'upcoming')} onClick={() => setFilter('upcoming')}>UPCOMING</button>
        <button style={S.filterTab(filter === 'all')} onClick={() => setFilter('all')}>ALL</button>
      </div>

      {loading && <div style={{ color: '#888', fontSize: '0.75rem', padding: '1rem 0' }}>▢▢▢ LOADING...</div>}

      {!loading && filtered.length === 0 && (
        <div style={S.empty}>
          <div style={S.emptyTitle}>No Gatherings yet</div>
          <div style={S.emptySub}>
            Light one up — pick a Campfire, Stargaze, or Trail Crew template.<br />
            Your squad will thank you.
          </div>
          <button style={S.btn} onClick={() => setCreating(true)}>LIGHT ONE UP</button>
        </div>
      )}

      {filtered.map(g => (
        <GatheringCard key={g.id} gathering={g} onClick={() => setDetailId(g.id)} />
      ))}

      {/* Create modal */}
      {creating && (
        <div style={S.modal} onClick={e => e.target === e.currentTarget && setCreating(false)}>
          <div style={S.modalInner} onClick={e => e.stopPropagation()}>
            <div style={{ color: '#888', fontSize: '0.65rem', letterSpacing: '0.15em', marginBottom: '1.25rem' }}>
              // CONVENE A GATHERING
            </div>
            <CreateGatheringForm
              tripId={tripId}
              onCreated={handleCreated}
              onCancel={() => setCreating(false)}
            />
          </div>
        </div>
      )}

      {/* Detail modal */}
      {detailId && (
        <GatheringDetail
          gatheringId={detailId}
          onClose={() => { setDetailId(null); onReload?.(); }}
          onDeleted={() => { setDetailId(null); onReload?.(); }}
          onChartered={() => onReload?.()}
        />
      )}
    </div>
  );
}
