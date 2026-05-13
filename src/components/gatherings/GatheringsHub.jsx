// VenturePath · Phase 2 · Gatherings hub — list/upcoming switcher
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import GatheringCard from './GatheringCard';
import GatheringDetail from './GatheringDetail';
import CreateGatheringForm from './CreateGatheringForm';

const VIEW_OPTIONS = [
  { id: 'upcoming', label: 'UPCOMING' },
  { id: 'all',      label: 'ALL' },
];

function EmptyState({ onConvene }) {
  return (
    <div style={{
      padding: '48px 24px', textAlign: 'center',
      fontFamily: "'JetBrains Mono', monospace",
    }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>◈</div>
      <div style={{ fontSize: 13, color: '#fff', fontWeight: 700, marginBottom: 6, letterSpacing: '0.06em' }}>
        NO GATHERINGS YET
      </div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 20, lineHeight: 1.6 }}>
        Light one up — pick a Campfire, Stargaze, or Trail Crew template.
      </div>
      <button
        onClick={onConvene}
        style={{
          background: '#E67E22', color: '#000',
          border: 'none', fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11, letterSpacing: '0.14em', fontWeight: 700,
          padding: '12px 24px', cursor: 'pointer', textTransform: 'uppercase',
        }}
      >
        ▣ CONVENE FIRST GATHERING
      </button>
    </div>
  );
}

export default function GatheringsHub({ items = [], loading, onCreate, onReload, tripId }) {
  const { status } = useAuth();

  const [view, setView]               = useState('upcoming');
  const [createOpen, setCreateOpen]   = useState(false);
  const [detailId, setDetailId]       = useState(null);

  const now = Date.now();
  const filtered = view === 'upcoming'
    ? items.filter(g => {
        const t = new Date(g.starts_at).getTime();
        return g.status !== 'cancelled' && g.status !== 'completed' && t >= now - 3_600_000;
      })
    : items;

  async function handleCreate(input) {
    const result = await onCreate(input);
    if (!result?.error) {
      setCreateOpen(false);
      onReload?.();
    }
    return result;
  }

  if (status === 'anonymous') {
    return (
      <div style={{ padding: '32px 20px', fontFamily: "'JetBrains Mono', monospace", textAlign: 'center' }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 12 }}>
          Sign in as an Architect to view and convene Gatherings.
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'JetBrains Mono', monospace" }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', gap: 0 }}>
          {VIEW_OPTIONS.map(opt => (
            <button
              key={opt.id}
              onClick={() => setView(opt.id)}
              style={{
                background: 'none', border: 'none',
                borderBottom: view === opt.id ? '2px solid #E67E22' : '2px solid transparent',
                color: view === opt.id ? '#E67E22' : 'rgba(255,255,255,0.35)',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase',
                padding: '6px 12px', cursor: 'pointer',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setCreateOpen(true)}
          style={{
            background: '#E67E22', color: '#000',
            border: 'none', fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9, letterSpacing: '0.12em', fontWeight: 700,
            padding: '6px 14px', cursor: 'pointer', textTransform: 'uppercase',
          }}
        >
          + CONVENE
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ padding: '32px 20px', textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em' }}>
          ▢▢▢ LOADING GATHERINGS
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState onConvene={() => setCreateOpen(true)} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '12px 20px' }}>
          {filtered.map(g => (
            <GatheringCard
              key={g.id}
              gathering={g}
              onClick={() => setDetailId(g.id)}
            />
          ))}
        </div>
      )}

      {/* Create modal */}
      {createOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9100, background: 'rgba(14,16,18,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ width: '100%', maxWidth: 520 }}>
            <CreateGatheringForm
              tripId={tripId}
              onCreate={handleCreate}
              onCancel={() => setCreateOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Detail modal */}
      {detailId && (
        <GatheringDetail
          gatheringId={detailId}
          onClose={() => setDetailId(null)}
          onDeleted={() => { setDetailId(null); onReload?.(); }}
        />
      )}
    </div>
  );
}
