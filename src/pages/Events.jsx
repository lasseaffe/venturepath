// VenturePath · Phase 2 · Architect Gatherings — standalone /events route
import { useAuth } from '../context/AuthContext';
import { useGatherings } from '../lib/gatherings/useGatherings';
import GatheringsHub from '../components/gatherings/GatheringsHub';
import Auth from './Auth';

export default function Events({ onClose }) {
  const { status } = useAuth();
  const { items, loading, create, reload } = useGatherings();

  if (status === 'loading') {
    return (
      <div style={{
        minHeight: '100vh', background: '#0E1012',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'JetBrains Mono', monospace",
        color: 'rgba(255,255,255,0.4)', fontSize: 11, letterSpacing: '0.12em',
      }}>
        ▢▢▢ INITIALISING
      </div>
    );
  }

  if (status === 'anonymous') {
    return <Auth onAuthenticated={() => {}} onCancel={onClose} />;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0E1012', color: '#fff' }}>
      {/* Header */}
      <div style={{
        padding: '20px 20px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        fontFamily: "'JetBrains Mono', monospace",
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: 9, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.25)', marginBottom: 4 }}>
            VENTUREPATH ·
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '0.06em' }}>
            ARCHITECT GATHERINGS
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 3 }}>
            Convene the squad — campfires, summits, stargazes & more
          </div>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 11, cursor: 'pointer', letterSpacing: '0.1em', fontFamily: "'JetBrains Mono', monospace" }}
        >
          ← BACK
        </button>
      </div>

      <GatheringsHub
        items={items}
        loading={loading}
        onCreate={create}
        onReload={reload}
      />
    </div>
  );
}
